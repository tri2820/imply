import OpenAI from "openai";
import { ChatCompletionChunk, ChatCompletionMessageToolCall, ChatModel } from "openai/resources/index.mjs";
import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { parallelMerge } from 'streaming-iterables';

import { Stream } from "openai/streaming.mjs";

import { tools } from "~/shared/tools";
import { ToolName } from "~/shared/tools/utils";
import { getRandomKaomoji } from "~/shared/utils";
import { getEnv } from "./utils";
import { getRequestEvent } from "solid-js/web";

function createClient() {
    const apiKey = getEnv("OPENAI_API_KEY");
    const baseURL = getEnv("OPENAI_BASE_URL");
    const client = new OpenAI({
        apiKey,
        baseURL,
    });
    return client
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


function check_if_reasoning_done(reasoning_record: ReasoningRecord): HighLevelMessage | undefined {
    if (reasoning_record.created_at) return {
        doing: {
            reasoning: {
                done: {
                    content: reasoning_record.content,
                    created_at: reasoning_record.created_at,
                    id: reasoning_record.id,
                    updated_at: new Date().toISOString()
                }
            }
        }
    }
}


async function getCompletionWithTools(messages: ChatCompletionMessageParam[], content_only: boolean) {
    const event = getRequestEvent();

    // Use OpenAI to structure the tool call output
    const client = createClient()
    const model: ChatModel = getEnv("OPENAI_MODEL") ?? 'openai/gpt-4o-mini'
    const completion = await client.chat.completions.
        // @ts-ignore
        create({
            model,
            messages: [
                content_only ? systemMessage().content : systemMessage().tools,
                ...messages
            ],
            tools: content_only ? undefined : tools.map((t) => t.definition),
            stream: true,

        });

    event?.request.signal.addEventListener('abort', () => {
        console.log('getCompletionWithTools abort')
        completion.controller.abort()
    })

    return completion
}

async function getReasoningCompletion(messages: ChatCompletionMessageParam[]) {
    const event = getRequestEvent();

    // Use DeepSeek to reasoning and chat with user
    const client = createClient()
    const model: ChatModel = getEnv("REASONING_MODEL") ?? 'deepseek/deepseek-r1:free'
    const completion = await client.chat.completions.

        // @ts-ignore
        create({
            model,
            messages: [
                systemMessage().reasoning,
                ...messages
            ],
            // tools: tools.map((t) => t.definition),
            stream: true,
            include_reasoning: true
        });


    event?.request.signal.addEventListener('abort', () => {
        console.log('getReasoningCompletion abort')
        completion.controller.abort()
    })
    return completion
}


// Take in a stream of chunks
// combine them into higher level updates
export async function* parseOpenAIChunk(
    chunks: Stream<ChatCompletionChunk>
): AsyncGenerator<HighLevelMessage> {
    const this_id = new Date().toISOString();
    const reasoning_record: ReasoningRecord = {
        id: `${this_id}/reasoning`,
        content: ''
    }

    const content_record: ContentRecord = {
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
        console.log("chunk", JSON.stringify(chunk));

        const delta: ChatCompletionChunk.Choice.Delta & { reasoning?: string } = chunk.choices[0].delta;


        if (delta.tool_calls) {
            // FAST CHECK
            const r = check_if_reasoning_done(reasoning_record); if (r) yield r;
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
                        name: tool_call.function.name! as ToolName,
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
            const r = check_if_reasoning_done(reasoning_record); if (r) yield r;
            yield* check_if_tools_done(tool_records, prev_tool_ids, [])


            if (content_record.created_at) {
                yield {
                    doing: {
                        content: {
                            delta: {
                                created_at: content_record.created_at,
                                id: content_record.id,
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
                                id: content_record.id,
                                created_at,
                                text: delta.content
                            }
                        }
                    }
                }
            }

            content_record.content += delta.content;
        }

        if (delta.reasoning) {
            // FAST CHECK
            const m = check_if_content_done(content_record); if (m) yield m;
            yield* check_if_tools_done(tool_records, prev_tool_ids, [])

            if (reasoning_record.created_at) {
                yield {
                    doing: {
                        reasoning: {
                            delta: {
                                created_at: reasoning_record.created_at,
                                id: reasoning_record.id,
                                text: delta.reasoning,
                                updated_at: new Date().toISOString()
                            }
                        }
                    }
                }
            } else {
                const created_at = new Date().toISOString()
                reasoning_record.content = delta.reasoning;
                reasoning_record.created_at = created_at
                yield {
                    doing: {
                        reasoning: {
                            started: {
                                id: reasoning_record.id,
                                created_at,
                                text: delta.reasoning
                            }
                        }
                    }
                }
            }

            reasoning_record.content += delta.reasoning;
        }
    }


    const r = check_if_reasoning_done(reasoning_record); if (r) yield r;
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
    const foundToolCall = maybeToolCall_i >= 0 && isToolCall(messages[maybeToolCall_i]);

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
    const above_end_i = foundToolCall ? maybeToolCall_i : messages.length;
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

export const systemMessage = (): { [key: string]: ChatCompletionMessageParam } => ({
    reasoning: {
        role: "system",
        content: `You are the native PLANNING AI of Imply.app
        Your response will be forward to the TOOLING AI instead directly to the user. Give details step by step instruction. TOOLING AI's response will then be forward back to you.
        Example flow: PLANNING AI -> asks search news -> TOOLING AI calls search news -> search news result -> PLANNING AI -> asks searchImage for thumbnails and createMarket -> PLANNING AI ...

        Imply.app is a prediction market platform for everyone (no topic is off-limits!). 
        The app uses play money (still called USD).
        
        Current time: ${new Date().toISOString()}
        Your job is to work together with the TOOLING AI to estimate probabilities & help create prediction markets.
        Do not be creative! Research properly!
        
        

        Tools you can ask TOOLING AI to use: ${tools.map(t => t.definition)}. 
    `,
    },
    tools: {
        role: "system",
        content: `You are the native TOOLING AI of Imply.app—a prediction market platform for everyone (no topic is off-limits!). The app uses play money (still called USD).
    
        Your job is to work together with PLANNING AI to:
        1. Estimate probabilities: Guess how accurate predictions are.
        2. Help create prediction markets.

        Current time: ${new Date().toISOString()}.
        `,
    },
    content: {
        role: "system",
        content: `You are the native AI of Imply.app—a prediction market platform for everyone (no topic is off-limits!). The app uses play money (still called USD).
    
        Your job is to work together with PLANNING AI to:
        1. Estimate probabilities: Guess how accurate predictions are (e.g., "That's quite improbable! I give it 22% probability. (￣～￣;)").
        2. Help create prediction markets.
    
        Current time: ${new Date().toISOString()}
        Use bold text and kaomojis! ${getRandomKaomoji().join(" ")}
        DO NOT OUTPUT LINKS IN YOUR RESPONSE.`,
    },
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

    let messages = history;
    // Only tools in the same "inference" can share memory
    // To share memory accross inferences we need to store memStorage to something persistent 
    // like an in-memory database like Redis or a real database (Postgres, InstantDB)
    const extraArgs: ExtraArgs = {
        memStorage: {}
    }

    // Safe guard
    let MAX_ITER = 5;
    let tool_called: ToolName[] = []
    try {
        while (MAX_ITER--) {
            messages = prepare(messages);
            // console.log('prepared messages', JSON.stringify(messages));
            const tool_calls: NonNullable<NonNullable<Update['tool']>['done']>[] = []
            let tool_args = false;
            let reasoning_text = ''
            const just_need_announce = tool_called.includes(ToolName.createMarket)

            // STEP 0: Planning with Reasoning Model
            // Do nothing reasoning if just created market, just announce to user
            if (just_need_announce) {
                console.log('createMarket tool called');
            } else {
                console.log('reasoning...');
                for await (const update of parseOpenAIChunk(
                    await getReasoningCompletion(messages)
                )) {
                    if (update.doing) {

                        yield {
                            ...update.doing,
                            agent_step: 'reasoning_and_foward'
                        }

                        if (update.doing.reasoning?.done) {
                            reasoning_text = update.doing.reasoning.done.content
                        }

                        if (update.doing.content?.done) {
                            const msg: ChatCompletionMessageParam = {
                                role: "assistant",
                                content: `<think>
                ${reasoning_text}
                </think>
                ${update.doing.content.done.content}`
                            }
                            messages.push(msg)
                        }
                    }
                }
            }

            tool_called = []


            // STEP 1: Build arguments for tool calls or generate content
            const chunks = await getCompletionWithTools(messages, just_need_announce)

            for await (const update of parseOpenAIChunk(chunks)) {
                if (update.doing) {
                    yield {
                        ...update.doing,
                        agent_step: 'tool_call_and_content'
                    }

                    if (update.doing.tool?.done) {
                        console.log('update tool done', update.doing.tool.done);
                        tool_calls.push(update.doing.tool.done)
                        tool_args = true
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
                    tool_args = update.done.tool_called
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
            // STEP 2: Actually execute the tool logic
            if (tool_args) {
                const generators = tool_calls.map((async function* f(tool_call) {
                    const toolLogic = tools.find(t => t.definition.function.name === tool_call.name)?.function;
                    if (!toolLogic) {
                        throw new Error(`Tool ${tool_call.name} not found`);
                    }
                    tool_called.push(tool_call.name)

                    const toolG = toolLogic(tool_call.arguments, extraArgs);

                    for await (const tool_yield of toolG) {
                        yield { id: tool_call.id, ...tool_yield, name: tool_call.name } as ToolYieldWithId
                    }
                }))

                const g = parallelMerge(...generators)
                console.log('waiting for tool calls...');
                for await (const tool_yield of g) {
                    console.log('add to memStorage', tool_yield.id, `${JSON.stringify(tool_yield).slice(0, 40)}...`);
                    extraArgs.memStorage[tool_yield.id] = [...(extraArgs.memStorage[tool_yield.id] ?? []), tool_yield]

                    yield {
                        tool_yield,
                        agent_step: 'tool_call_and_content'
                    }

                    // AI only see done messages
                    if (tool_yield.done) {
                        messages.push({
                            role: 'tool',
                            content: JSON.stringify(tool_yield.done),
                            tool_call_id: tool_yield.id
                        })
                    }
                }

                continue
            }

            break;
        }

        console.log(">> ALL DONE");
    } catch (e) {
        console.error(e);
    }
}
