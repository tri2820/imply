import { id } from "@instantdb/admin";
import { z } from "zod";
import { mkToolFactory } from "../shared/utils";
import { createAdminDb, triggerAddHistoryOption } from "./utils";
import { createOption } from "~/client/utils";

export const get_weather = mkToolFactory({
  name: "get_weather",
  description: "Get the weather for a location",
  schema: z.object({
    location: z.enum([
      "philadelphia",
      "new-york",
      "san-francisco",
      "los-angeles",
    ]),
  }),
  factory() {
    return (chatTaskProps) => {
      return {
        monday: "rainy",
        tuesday: "sunny",
      };
    }
  },
});

export const create_market = mkToolFactory({
  name: "create_market",
  description: `Create a prediction market. 
  The 'type' field determines the market structure:
  - 'binary' requires 'probability_yes' (0-1). Important: try to estimate it accurately.
  - 'multiple' requires 'options' with at least one entry.
  - 'allow_multiple_correct' (for 'multiple') determines how options are treated:
  - **false**: Only one option can be true (e.g., "Who will win the tournament?").
  - **true**: Multiple options can be correct (e.g., "Will Bitcoin hit $200k?" for different months).
  
  Be careful with the 'rule' field, it should be clear and unambiguous. Mention specific data source for market resolution.
  `,
  schema: z.object({
    name: z.string(),
    description: z.string(),
    rule: z.string(),
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
  }),
  factory(factoryProps) {
    return async ({
      name,
      type,
      probability_yes,
      options,
      allow_multiple_correct,
      description,
      rule,
    }) => {
      console.log(">> create_market", {
        name,
        type,
        probability_yes,
        options,
        allow_multiple_correct,
        description,
        rule,
      });
      const db = createAdminDb();
      const market_id = id();

      let marketOptions: ReturnType<typeof createOption>[] | undefined =
        undefined;

      if (type === "multiple") {
        if (!options || options.length === 0) {
          throw new Error(
            "Multiple-option markets must include at least one 'option'."
          );
        }

        marketOptions = options.map((o) =>
          createOption(db, o.name, o.probability_yes)
        );
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
            resolve_at: new Date(
              Date.now() + 3 * 24 * 60 * 60 * 1000
            ).toISOString(),
            stop_trading_at: new Date(
              Date.now() + (3 - 1) * 24 * 60 * 60 * 1000
            ).toISOString(),
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

      return { wait_user_approval: true };
    }

  }
});

export const search_news = mkToolFactory({
  name: "search_news",
  description: `Search news using Brave API.`,
  schema: z.object({
    query: z.string(),
  }),
  factory(factoryProps) {
    return async ({ query }) => {
      return ["there is no news about this topic"]
    }
  },
});
