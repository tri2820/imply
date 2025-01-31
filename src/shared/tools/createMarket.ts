import { z } from "zod";
import { makeTool, ToolName } from ".";
import { createOption, triggerAddHistoryOption } from "../utils";
import { createAdminDb } from "~/server/utils";
import { id } from "@instantdb/admin";

const schema = z.object({
    name: z.string().describe('Has to be an extremely specific and clear question (e.g., "Will Bitcoin hit $200k by 2023?").'),
    description: z.string(),
    rule: z.string().describe('Should be clear and unambiguous. Mention specific data source for market resolution.'),
    type: z.enum(["binary", "multiple"]),

    // Binary market fields
    probability_yes: z.number().min(0).max(1).optional(),

    // Multiple market fields
    allow_multiple_correct: z.boolean().optional(),
    options: z
        .array(
            z.object({
                name: z.string(),
                probability_yes: z.number().min(0).max(1),
            })
        )
        .optional(),
});

export type CreateMarketToolProps = z.infer<typeof schema>;
export type CreateMarketToolResult = ExtractDoneType<typeof createMarket>;

async function* createMarket({
    name,
    type,
    probability_yes,
    options,
    allow_multiple_correct,
    description,
    rule,
}: CreateMarketToolProps) {
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

    const transactions: Parameters<typeof db.transact>[0] = [
        ...marketOptions.flatMap((o) => o.transactions),
        db.tx.markets[market_id]
            .update({
                name,
                description,
                image: "",
                allow_multiple_correct,
                created_at: new Date().toISOString(),
                resolve_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                stop_trading_at: new Date(Date.now() + (3 - 1) * 24 * 60 * 60 * 1000).toISOString(),
                rule,
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

  The 'type' field determines the market structure:
  - 'binary' requires 'probability_yes'. Important: try to estimate it accurately.
  - 'multiple' requires 'options' with at least one entry.
  
  The 'allow_multiple_correct' field determines how options are treated:
  - **false**: Only one option can be true (e.g., "Who will win the tournament?").
  - **true**: Multiple options can be correct (e.g., "Will Bitcoin hit $200k?" for different months).
  `,
});
