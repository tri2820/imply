import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletionMessageToolCall, ChatModel } from "openai/resources/index.mjs";
import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { parallelMerge } from 'streaming-iterables';
import { searchImageTool } from "~/shared/tools/searchImage";
import { searchNewsTool } from "~/shared/tools/searchNews";

import { Stream } from "openai/streaming.mjs";
import { createMarketTool } from "~/shared/tools/createMarket";
import { getRandomKaomoji } from "~/shared/utils";
import { getEnv } from "./utils";

export function createOpenAI() {
    const apiKey = getEnv("OPENAI_API_KEY");
    const baseURL = getEnv("OPENAI_BASE_URL");
    const client = new OpenAI({
        apiKey,
        baseURL,
    });

    return client;
}

function check_if_tools_done(
    tool_records: { [id: string]: ToolRecord },
    prev: string[],
    now: string[]
): HighLevelMessage[] {
    const done_ids = prev.filter(id => !now.includes(id))

    return done_ids.map(id => {
        const record = tool_records[id];
        return {
            doing: {
                tool: {
                    done: {
                        id,
                        name: record.name,
                        arguments: JSON.parse(record.arguments_str),
                        created_at: record.created_at,
                        updated_at: new Date().toISOString()
                    }
                }
            }
        }
    })
}

function check_if_content_done(content_record: ContentRecord): HighLevelMessage | undefined {
    if (content_record.created_at) return {
        doing: {
            content: {
                done: {
                    content: content_record.content,
                    created_at: content_record.created_at,
                    id: content_record.id,
                    updated_at: new Date().toISOString()
                }
            }
        }
    }
}

// Take in a stream of chunks
// combine them into higher level updates
export async function* parseOpenAIChunk(
    chunks: Stream<ChatCompletionChunk>
): AsyncGenerator<HighLevelMessage> {
    const this_id = new Date().toISOString();

    const content_record: {
        content: string;
        created_at?: string;
        id: string;
    } = {
        id: `${this_id}/content`,
        content: ''
    }
    const tool_records:
        { [id: string]: ToolRecord }
        = {
    }

    // Gemini sends empty tool_call.id, so we cannot use tool_call.id to identity the call. Use a timestamp + index instead. 
    const to_id = (tool_call: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta.ToolCall) => `${this_id}/${tool_call.index}`

    // FAST SIGNALING
    // Detects when a tool call is done and yield immediately
    let prev_tool_ids: string[] = []


    let tool_called = false;
    for await (const chunk of chunks) {
        // console.log("chunk", JSON.stringify(chunk));

        const delta = chunk.choices[0].delta;
        if (delta.tool_calls) {
            // FAST CHECK
            const m = check_if_content_done(content_record); if (m) yield m;
            const now_tool_ids = delta.tool_calls.map(to_id)
            yield* check_if_tools_done(tool_records, prev_tool_ids, now_tool_ids)
            prev_tool_ids = now_tool_ids


            for (const tool_call of delta.tool_calls) {
                tool_called = true
                if (!tool_call.function) throw new Error('No function name what')

                // Update inner map
                const id = to_id(tool_call)
                let prev = tool_records[id];
                let now: ToolRecord;
                if (!prev) {
                    now = {
                        name: tool_call.function.name!,
                        arguments_str: tool_call.function.arguments ?? '',
                        created_at: new Date().toISOString()
                    }

                    yield {
                        doing: {
                            tool: {
                                started: {
                                    id,
                                    created_at: now.created_at,
                                    name: now.name
                                }
                            }
                        }
                    }
                } else {
                    now = {
                        ...prev,
                        arguments_str: prev.arguments_str + tool_call.function.arguments!,
                        created_at: new Date().toISOString()
                    }

                    yield {
                        doing: {
                            tool: {
                                delta: {
                                    id,
                                    created_at: now.created_at,
                                    name: now.name,
                                    arguments_delta: tool_call.function.arguments ?? '',
                                    updated_at: new Date().toISOString()
                                }
                            }
                        }
                    }
                }


                tool_records[id] = now
            }
        }

        if (delta.content) {
            // FAST CHECK
            yield* check_if_tools_done(tool_records, prev_tool_ids, [])

            if (content_record.created_at) {
                yield {
                    doing: {
                        content: {
                            delta: {
                                created_at: content_record.created_at,
                                id: `${this_id}/content`,
                                text: delta.content,
                                updated_at: new Date().toISOString()
                            }
                        }
                    }
                }
            } else {
                const created_at = new Date().toISOString()
                content_record.content = delta.content;
                content_record.created_at = created_at
                yield {
                    doing: {
                        content: {
                            started: {
                                created_at,
                                id: `${this_id}/content`,
                                text: delta.content
                            }
                        }
                    }
                }
            }

            content_record.content += delta.content;
        }
    }


    const m = check_if_content_done(content_record); if (m) yield m;
    yield* check_if_tools_done(tool_records, prev_tool_ids, [])
    yield {
        done: {
            tool_called
        }
    }
}

function hashStringToSeed(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0; // Simple rolling hash
    }
    return hash >>> 0; // Ensure positive 32-bit integer
}

function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function seededUUIDv4(seedString: string) {
    const seed = hashStringToSeed(seedString); // Convert string to seed
    const rand = mulberry32(seed);

    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (rand() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export const prepare = (messages: ChatCompletionMessageParam[]) => {
    const isToolCall = (m: ChatCompletionMessageParam) => m.role == 'assistant' && m.tool_calls && m.tool_calls.length > 0
    const isToolResult = (m: ChatCompletionMessageParam) => m.role == 'tool'
    let maybeToolCall_i = messages.length - 1;
    while (maybeToolCall_i >= 0 && isToolResult(messages[maybeToolCall_i])) { maybeToolCall_i-- }
    const foundToolCall = isToolCall(messages[maybeToolCall_i]);

    let budget = 14000;
    const prepared_belows: ChatCompletionMessageParam[] = []
    if (foundToolCall) {
        let belowBudget = 10000;

        for (let i = maybeToolCall_i + 1; i < messages.length; i++) {
            const prepared_tool_result = { ...messages[i] };
            if (!isToolResult(prepared_tool_result)) throw new Error('Impossible!')
            // Hack: try divide the budget among the tool results
            const max_each = Math.ceil(belowBudget / (messages.length - i));
            const saved = Math.max(prepared_tool_result.content.length - max_each, 0)
            prepared_tool_result.content = prepared_tool_result.content.slice(0, max_each);
            belowBudget += saved - max_each;
            prepared_belows.push(prepared_tool_result)
        }

        budget -= belowBudget;
    }

    const prepared_aboves: ChatCompletionMessageParam[] = []
    let keep_assistant_content_short = 200;
    const above_end_i = maybeToolCall_i + (foundToolCall ? 1 : 0);
    for (let i = 0; i < above_end_i; i++) {
        const prepared_m = { ...messages[i] }
        if (prepared_m.role === 'assistant') {
            // Hack: Do not keep track of assistant old calls
            if (prepared_m.tool_calls) continue
            if (prepared_m.content) {
                prepared_m.content = prepared_m.content.slice(0, Math.max(budget, keep_assistant_content_short));
                budget -= prepared_m.content.length;
            }

            prepared_aboves.push(prepared_m)
            if (budget == 0) break;
        }

        if (prepared_m.role === 'user') {
            prepared_m.content = prepared_m.content.slice(0, budget);

            prepared_aboves.push(prepared_m)
            if (budget == 0) break;
        }
    }

    return [
        ...prepared_aboves,
        // Raw tool call message
        ...(foundToolCall ? [messages[maybeToolCall_i]] : []),
        ...prepared_belows,
    ]
};

export const systemMessage = (): ChatCompletionMessageParam => ({
    role: "system",
    content: `You are the native AI of Imply.app—a prediction market platform for everyone (no topic is off-limits!). The app uses play money (still called USD).
Your job:
1. Assist research: Be creative! Narrow the scope automatically—never ask users to be more specific.
2. Estimate probabilities: Guess how accurate predictions are (e.g., "That's quite improbable! I give it 22% probability. (￣～￣;)").
3. Help create prediction markets.

Current time: ${new Date().toISOString()}
Use bold text and kaomojis! ${getRandomKaomoji().join(" ")}
If input is vague, give concrete examples (e.g., specify an exact date for events).`,
});

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
    // Safe guard
    let MAX_ITER = 5;
    try {
        while (MAX_ITER--) {
            messages = prepare(messages);
            console.log('prepared messages', JSON.stringify(messages));
            const tool_calls: NonNullable<NonNullable<Update['tool']>['done']>[] = []
            const model: ChatModel = getEnv("OPENAI_MODEL") ?? 'gpt-4o-mini';
            console.log('fetching completion...', model);
            const completion = await client.chat.completions.create({
                model,
                messages: [
                    systemMessage(),
                    ...messages
                ],
                tools: tools.map((t) => t.definition),
                stream: true,
                // GEMENI does not support parallel_tool_calls
                // parallel_tool_calls: true
            });

            let tool_called = false

            for await (const update of parseOpenAIChunk(completion)) {

                if (update.doing) {
                    yield update.doing

                    if (update.doing.tool?.done) {
                        console.log('update tool done', update.doing.tool.done);
                        tool_calls.push(update.doing.tool.done)
                        tool_called = true
                    }

                    if (update.doing.content?.done) {
                        const msg: ChatCompletionMessageParam = {
                            role: "assistant",
                            content: update.doing.content.done.content
                        }
                        messages.push(msg)
                    }
                }

                if (update.done) {
                    tool_called = update.done.tool_called
                }
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
            if (tool_called) {
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
                console.log('waiting for tool calls...');
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
            break;
        }

        console.log(">> ALL DONE");
    } catch (e) {
        console.error(e);
    }
}
