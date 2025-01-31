import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletionMessageToolCall, ChatModel } from "openai/resources/index.mjs";
import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { parallelMerge } from 'streaming-iterables';
import { searchImageTool } from "~/shared/tools/searchImage";
import { searchNewsTool } from "~/shared/tools/searchNews";
import { parseOpenAIChunk, prepare } from "~/shared/utils";
import { getEnv } from "./utils";
import { createMarketTool } from "~/shared/tools/createMarket";

export function createOpenAI() {
    const apiKey = getEnv("OPENAI_API_KEY");
    const baseURL = getEnv("OPENAI_BASE_URL");
    const client = new OpenAI({
        apiKey,
        baseURL,
    });

    return client;
}

export async function* chat(body: APICompleteBody): AsyncGenerator<ChatStreamYield> {
    const history: ChatCompletionMessageParam[] = body.blocks.map((b) => {
        return {
            role: b.role,
            content: b.content,
        } as any;
    });


    if (history.length === 1) {
        history[0] = {
            ...history[0],
            content: `My prediction is: ${history[0].content}`,
        }
    }


    const client = createOpenAI();

    const tools = [
        // searchWeatherTool,
        createMarketTool,
        searchNewsTool,
        searchImageTool,

    ]



    let messages = history;
    let i = 0;
    let MAX_ITER = 5;
    try {
        while (true && MAX_ITER--) {
            messages = prepare(messages);
            const tool_calls: NonNullable<NonNullable<Update['tool']>['done']>[] = []
            const model: ChatModel = getEnv("OPENAI_MODEL") ?? 'gpt-4o-mini';
            console.log('fetching completion...', model);
            const completion = await client.chat.completions.create({
                model,
                messages,
                tools: tools.map((t) => t.definition),
                stream: true,
            });
            let finish_reason: ChatCompletionChunk.Choice['finish_reason'] | undefined = undefined;
            for await (const update of parseOpenAIChunk(completion)) {
                if (update.doing) {
                    yield update.doing

                    if (update.doing.tool?.done) {
                        tool_calls.push(update.doing.tool.done)
                    }

                    if (update.doing.content?.done) {
                        const msg: ChatCompletionMessageParam = {
                            role: "assistant",
                            content: update.doing.content.done.content
                        }
                        messages.push(msg)
                    }
                }

                finish_reason = update.done?.finish_reason
            }

            const tool_calls_fixed = tool_calls.map(t => {
                const c: ChatCompletionMessageToolCall = {
                    id: t.id,
                    type: 'function',
                    function: {
                        arguments: JSON.stringify(t.arguments),
                        name: t.name
                    },
                }
                return c;
            })

            const m: ChatCompletionMessageParam = {
                role: 'assistant',
                tool_calls: tool_calls_fixed
            }

            messages.push(m)

            if (finish_reason == 'tool_calls') {
                console.log(">> needs process tool_calls", messages);
                const generators = tool_calls.map((async function* f(tool_call) {
                    const toolLogic = tools.find(t => t.definition.function.name === tool_call.name)?.function;
                    if (!toolLogic) {
                        throw new Error(`Tool ${tool_call.name} not found`);
                    }
                    const toolG = toolLogic(tool_call.arguments);
                    for await (const tool_yield of toolG) {
                        yield { id: tool_call.id, ...tool_yield }
                    }
                }))

                const g = parallelMerge(...generators)
                for await (const tool_result of g) {
                    yield {
                        tool_result
                    }
                    if (tool_result.done) {
                        messages.push({
                            role: 'tool',
                            content: JSON.stringify(tool_result.done),
                            tool_call_id: tool_result.id
                        })
                    }
                }

                continue;
            }

            console.log(">> done", i++, JSON.stringify(messages));
            break;
        }

        console.log(">> ALL DONE");
    } catch (e) {
        console.error(e);
    }
}
