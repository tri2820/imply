


import { RunnableToolFunctionWithParse } from "openai/lib/RunnableFunction.mjs";
import { z } from "zod";
import { buyShare, calculateAttributes, sellShare } from "./shared/utils";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { InstaQLEntity, InstaQLSubscriptionState, PageInfoResponse } from "@instantdb/core";
import { Cursor } from "@instantdb/core/dist/module/queryTypes";
import { LineSeriesPartialOptions, UTCTimestamp } from "lightweight-charts";
import { AppSchema } from "../instant.schema";

/// <reference types="@solidjs/start/env" />

export { };

declare global {


    // API types
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
    type MarketResponse_Market = MarketResponse["data"]["markets"][number];
    type Ext_Option = ReturnType<typeof calculateAttributes>[number]["options"][number];

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

    type MarketResponse = {
        data: {
            markets: (Market & {
                options: (Option & { shares: Share[] })[];
            })[];
        };
        pageInfo: PageInfoResponse<{
            markets: {
                options: {};
                $: {
                    order: {
                        serverCreatedAt: "desc";
                    };
                    after?: Cursor | undefined;
                    first: number;
                };
            };
        }>;
    };

    // Profile related types
    type ProfileResponse = {
        data: {
            profiles: (Profile & {
                holdings: (Holding & {
                    share: Share & {
                        option: Option & {
                            market: Market;
                        };
                    };
                })[];
            })[];
        };
    };

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
        forward: ChatCompletionMessageParam;
        delta: string;
        tool: {
            call_id: string;
            name: string;
        } & OneOf<{
            started: {
                arguments: unknown;
            };

            done: {
                result: unknown;
            };
        }>;
    }>;

    type ChatTaskProps = {
        send: (msg: ChatTaskMessage) => void;
        body: APICompleteBody;
    };

    // Tool related types
    type ToolCalls = {
        [key: string]: {
            name: string;
            arguments: string;
            created_at: string;
        };
    };

    type Tool = RunnableToolFunctionWithParse<any>;
    type ToolFunction<T extends z.ZodType<any, any, any>> = (
        args: z.infer<T>
    ) => any;

    type ToolFactoryProps = ChatTaskProps;

    // Utility types
    type Refine<T, K extends keyof T, V> = Omit<T, K> & { [P in K]: V };

    type OneOf<T> = {
        [K in keyof T]: {
            [P in keyof T]?: P extends K ? T[P] : never;
        } & { [P in Exclude<keyof T, K>]?: undefined };
    }[keyof T];

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
    type Option = InstaQLEntity<AppSchema, "options">;
    type Market = InstaQLEntity<AppSchema, "markets">;
    type HistoryOption = InstaQLEntity<AppSchema, "history__options">;
    type Conversation = InstaQLEntity<AppSchema, "conversations">;

    // Block types
    type BaseBlock = InstaQLEntity<AppSchema, "blocks"> & {
        content: unknown;
    };

    type ToolBlock = Refine<
        BaseBlock & {
            role: "tool";
        },
        "content",
        {
            name: string;
            arguments: unknown;
            result?: unknown;
        }
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

    type Block = ToolBlock | AssistantBlock | UserBlock;
    type Role = Block["role"];

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

    type SharedState = {
        needSplit: boolean;
        assistantBlock: AssistantBlock;
    };
}