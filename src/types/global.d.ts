


import { InstaQLEntity, InstaQLSubscriptionState } from "@instantdb/core";
import { Cursor, InstaQLParams } from "@instantdb/core/dist/module/queryTypes";
import { LineSeriesPartialOptions, UTCTimestamp } from "lightweight-charts";
import { ChatCompletionChunk } from "openai/src/resources/index.js";
import { AppSchema } from "~/../instant.schema";
import { db } from "~/client/database";
import { tools } from "~/shared/tools";
import { ToolName } from "~/shared/tools/utils";
import { buyShare, calcAttributes, sellShare } from "~/shared/utils";

/// <reference types="@solidjs/start/env" />

export { };

declare global {
    // Utility types
    type Refine<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

    type OneOf<T> = {
        [K in keyof T]: {
            [P in keyof T]?: P extends K ? T[P] : never;
        } & { [P in Exclude<keyof T, K>]?: undefined };
    }[keyof T];

    type ExtractType<K extends 'doing' | 'done', T extends (...args: any[]) => AsyncGenerator<any, any, any>> =
        T extends (...args: any[]) => AsyncGenerator<infer U, any, any> ? U extends Record<K, infer D> ? D : never : never;

    type DeepNonNullable<T> = T extends Function
        ? T
        : T extends Array<infer U>
        ? Array<DeepNonNullable<NonNullable<U>>>
        : T extends object
        ? { [K in keyof T]-?: DeepNonNullable<NonNullable<T[K]>> }
        : T;

    type InstantDBQueryResponse<T extends InstaQLParams<AppSchema>> = Awaited<ReturnType<typeof db.queryOnce<T>>>;

    // API types
    type UpvoteDownvote = {
        type: 'upvote' | 'downvote' | 'remove'
    }

    type BuySellAction = {
        type: "buy" | "sell";
        amount: number;
        shareId: string;
    };

    type JWTResult = {
        type: "existing" | "new";
        profile_id: string;
    };

    type APICompleteBody = {
        blocks: Block[];
    };

    type YesOrNo = "yes" | "no";



    // Market related types
    type Ext_Option = ReturnType<typeof calcAttributes>["options"][number];

    type BuySellProps = {
        market: {
            options: {
                normalizedYesProb: number | undefined;
                yesProb: number | undefined;
                id: string;
                color: string;
                name: string;
                image: string;
                shares: Share[];
            }[];
            id: string;
            name: string;
            image: string;
            description: string;
        };
    };




    // Now extract the type of the response using ReturnType and Awaited
    type MarketSocialQueryRespose = InstantDBQueryResponse<{
        markets: {
            $: {
                where: {
                    id: string,
                },
            },
            votes: {
                $: {
                    where: {
                        profile: string,
                    },
                },
            },
        },
    }>;



    type MarketResponse = InstantDBQueryResponse<{
        markets: {
            options: {
                shares: {},
            },
            $: {
                first: number,
                after: Cursor,
                order: {
                    num_votes: "desc",
                },
            },
        },
    }>

    // Profile related types
    type ProfileResponse = DeepNonNullable<InstantDBQueryResponse<{
        profiles: {
            $: {
                where: {
                    id: string,
                },
            },
            holdings: {
                share: {
                    option: {
                        market: {},
                    },
                },
            },
        },
    }>>

    // Subscription types
    type ProfileSubscription = InstaQLSubscriptionState<
        AppSchema,
        {
            profiles: {
                $: {
                    where: {
                        id: string;
                    };
                };
                holdings: {
                    share: {};
                };
            };
        }
    >;

    type MarketSubscription = InstaQLSubscriptionState<
        AppSchema,
        {
            markets: {
                $: {
                    where: {
                        id: string;
                    };
                };
                options: {
                    shares: {};

                };
            };
        }
    >;

    type HoldingSubscription = InstaQLSubscriptionState<
        AppSchema,
        {
            holdings: {
                $: {
                    where: {
                        "profile.id": string;
                        "share.id": {
                            $in: string;
                        };
                    };
                };
                share: {};
            };
        }
    >;

    type HistoryOptionSubscription = InstaQLSubscriptionState<
        AppSchema,
        {
            history__options: {
                $: {
                    limit: number;
                    order: {
                        serverCreatedAt: "desc";
                    };
                    where: {
                        option_id: {
                            $in: string[];
                        };
                    };
                };
            };
        }
    >;


    // Chat related types
    type ChatTaskMessage = OneOf<{
        chunk: ChatCompletionChunk
    }>;



    type Status<K> = OneOf<{
        idle: {};
        doing: {};
        done_succ: K;
        done_err: {};
    }>;

    // Action result types
    type ShareActionResult_Buy = ReturnType<typeof buyShare>;
    type ShareActionResult_Sell = ReturnType<typeof sellShare>;
    type ShareActionResult = ShareActionResult_Buy | ShareActionResult_Sell;

    // Entity types
    type Profile = InstaQLEntity<AppSchema, "profiles">;
    type Holding = InstaQLEntity<AppSchema, "holdings">;
    type Share = InstaQLEntity<AppSchema, "shares">;
    type Vote = InstaQLEntity<AppSchema, "votes">;
    type Option = InstaQLEntity<AppSchema, "options">;
    type Market = InstaQLEntity<AppSchema, "markets">;
    type HistoryOption = InstaQLEntity<AppSchema, "history__options">;
    type Conversation = InstaQLEntity<AppSchema, "conversations">;

    type AgentStep = 'reasoning_and_foward' | 'tool_call_and_content'
    // Block types
    type BaseBlock = InstaQLEntity<AppSchema, "blocks"> & {
        content: unknown;
    } & {
        agent_step?: AgentStep,
    }

    type ToolBlock<T = any, K = any, D = any> = Refine<
        BaseBlock & {
            role: "tool";
        },
        "content",
        {
            name: ToolName;
            arguments_partial_str: string;
            arguments?: T;
            result?: K;
            doings: D[]
        }
    >;


    type ReasoningBlock = Refine<
        BaseBlock & {
            role: "reasoning";
        },
        "content",
        string
    >;


    type AssistantBlock = Refine<
        BaseBlock & {
            role: "assistant";
        },
        "content",
        string
    >;

    type UserBlock = Refine<
        BaseBlock & {
            role: "user";
        },
        "content",
        string
    >;

    type Block = ToolBlock | AssistantBlock | UserBlock | ReasoningBlock;

    // UI types
    type UIBlock = Block & {
        isStartSecion: boolean;
        isEndSecion: boolean;
    };

    type Blocks = { [id: string]: Block };
    type DataPoint = { time: UTCTimestamp; value: number };
    type Series = {
        id: string;
        title: string;
        data: DataPoint[];
        options: LineSeriesPartialOptions;
    };

    type ToolYieldWithId = ToolYield & {
        id: string
    }
    type ChatStreamYield = NonNullable<OneOf<{
        tool_yield: ToolYieldWithId
    } & ({
        [K in keyof Update]: Update[K]
    }
        )>>
        & { agent_step: AgentStep }

    type UnwrapAsyncGenerator<T> = T extends AsyncGenerator<infer Y, any, any>
        ? Y
        : never;

    type _ToolYield = (typeof tools)[0];
    type ToolYield<T extends _ToolYield = _ToolYield> = T extends any
        ? { name: T['name'] } & UnwrapAsyncGenerator<ReturnType<T['function']>>
        : never;

    type Update = OneOf<{
        reasoning: OneOf<{
            started: {
                created_at: string,
                id: string
                text: string
            }

            delta: {
                created_at: string,
                updated_at: string,
                id: string
                text: string
            }

            done: {
                created_at: string,
                updated_at: string,
                id: string
                content: string
            }
        }>,

        tool: OneOf<{
            started: {
                created_at: string,
                name: ToolName,
                id: string,
            },
            delta: {
                created_at: string,
                updated_at: string,
                name: ToolName,
                id: string,
                arguments_delta: string
            }
            done: {
                created_at: string,
                updated_at: string,
                name: ToolName,
                id: string
                arguments: unknown
            }
        }>

        content: OneOf<{
            started: {
                created_at: string,
                id: string
                text: string
            }

            delta: {
                created_at: string,
                updated_at: string,
                id: string
                text: string
            }

            done: {
                created_at: string,
                updated_at: string,
                id: string
                content: string
            }
        }>
    }>

    type HighLevelMessage = OneOf<{
        doing: Update,
        done: {
            tool_called: boolean
        }
    }>

    type ToolRecord = {
        name: ToolName;
        created_at: string;
        arguments_str: string;
    }

    type ContentRecord = {
        content: string;
        created_at?: string;
        id: string;
    }


    type ReasoningRecord = {
        content: string;
        created_at?: string;
        id: string;
    }

    type MemStorage = {
        [tool_call_id: string]: ToolYieldWithId[]
    }

    type ExtraArgs = { memStorage: MemStorage }
}
