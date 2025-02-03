import { id } from "@instantdb/admin";
import { z } from "zod";
import { createAdminDb } from "~/server/utils";;
import { createOption, notEmpty, retry_if_fail, triggerAddHistoryOption } from "../utils";
import { makeTool, ToolName } from "./utils";
import { fetchImages } from "./searchImages";

const schema = z.object({
    name: z.string(),
    description: z.string(),
    rule: z.string(),
    type: z.enum(["binary", "multiple"]),
    thumbnail_query: z.string(),
    resolve_at: z.date(),
    // Binary market fields
    probability_yes: z.number().optional(),

    // Multiple market fields
    allow_multiple_correct: z.boolean().optional(),
    options: z
        .array(
            z.object({
                name: z.string(),
                probability_yes: z.number(),
            })
        )
        .optional(),
});

export type CreateMarketToolArgs = z.infer<typeof schema>;
export type CreateMarketToolDone = ExtractType<'done', typeof createMarket>;

async function* createMarket({
    name,
    type,
    probability_yes,
    options,
    allow_multiple_correct,
    description,
    rule,
    resolve_at,
    thumbnail_query
}: CreateMarketToolArgs, extraArgs: ExtraArgs) {
    const db = createAdminDb();
    const market_id = id();

    let marketOptions: ReturnType<typeof createOption>[] | undefined = undefined;

    if (type === "multiple") {
        if (!options || options.length === 0) {
            throw new Error("Multiple-option markets must include at least one 'option'.");
        }

        marketOptions = options.map((o) => createOption(db, o.name, o.probability_yes));
    }

    if (type == "binary") {
        if (probability_yes === undefined) {
            throw new Error("Binary market must include 'probability_yes'");
        }
        marketOptions = [createOption(db, "o_only", probability_yes)];
    }

    if (!marketOptions || marketOptions.length === 0) {
        throw new Error("No marketOptions");
    }

    let n = 5;
    let response: Response | undefined = undefined;
    while (n--) {
        try {
            response = await fetchImages(thumbnail_query);
            if (response.ok) {
                break;
            }

        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.floor(Math.random() * 1000)));
        }
    }

    if (!response || !response.ok) {
        throw new Error("Failed to fetch news");
    }

    let image_response: Response | undefined = undefined;

    image_response = await retry_if_fail(() => { return fetchImages(thumbnail_query) });
    if (!image_response || !image_response.ok) {
        throw new Error("Failed to fetch images");
    }

    const data = await image_response.json() as BraveSearchImagesRoot;
    const img_result = data.results[Math.floor(Math.random() * 3)];

    console.log('img_result', img_result)
    const res_at = new Date(resolve_at).toISOString();
    const stop_trading_at = new Date(new Date(resolve_at).getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const transactions: Parameters<typeof db.transact>[0] = [
        ...marketOptions.flatMap((o) => o.transactions),
        db.tx.markets[market_id]
            .update({
                name,
                description,
                image: img_result.thumbnail.src,
                allow_multiple_correct,
                created_at: new Date().toISOString(),
                resolve_at: res_at,
                stop_trading_at,
                rule,
                num_votes: 0,
            })
            .link({
                options: marketOptions.map((o) => o.option_id),
            }),
    ];

    try {
        await db.transact(transactions);
        const ps = marketOptions.map((o) => triggerAddHistoryOption(o.option_id));
        await Promise.all(ps);
    } catch (e) {
        console.error("error", e);
    }

    yield {
        done: { market_id },
    }
}


export const createMarketTool = makeTool({
    name: ToolName.createMarket,
    zodObj: schema,
    function: createMarket,
    description: `Create a prediction market. 
    Important:
    - Probability must be in range [0, 1].

    The 'type' field determines the market structure:
    - 'binary' requires 'probability_yes'. Important: try to estimate it accurately.
    - 'multiple' requires 'options' with at least one entry.
    
    The 'allow_multiple_correct' field determines how options are treated:
    - **false**: Only one option can be true (e.g., "Who will win the tournament?").
    - **true**: Multiple options can be correct (e.g., "Will Bitcoin hit $200k?" for different months).

    - name: Extremely specific question (e.g., "Will Bitcoin hit $200k by 2023?").
    - rules: Clear and unambiguous. Mention specific data source for market resolution.`,
});
