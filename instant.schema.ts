import { i } from "@instantdb/core";

const _schema = i.schema({
  // This section lets you define entities: think `posts`, `comments`, etc
  // Take a look at the docs to learn more:
  // https://www.instantdb.com/docs/modeling-data#2-attributes
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    shares: i.entity({
      type: i.string(), // Yes or No
      reserve: i.number(),
    }),
    options: i.entity({
      name: i.string(),
      color: i.string(),
      image: i.string(),
    }),
    markets: i.entity({
      name: i.string(),
      description: i.string(),
      image: i.string(),
      allow_multiple_correct: i.boolean(),
      created_at: i.date(),
      resolve_at: i.date(),
      stop_trading_at: i.date(),
      rule: i.string(),

      // social
      // faster (don't have to aggregate)
      // Only indexed and type-checked attrs can be used to order by.
      num_upvotes: i.number().indexed(),
      num_downvotes: i.number(),
    }),
    holdings: i.entity({
      amount: i.number(),
      updated_at: i.date(),
    }),
    profiles: i.entity({
      name: i.string(),
      avatar_src: i.string(),
      usd: i.number(),
    }),
    history__options: i.entity({
      option_id: i.string(),
      created_at: i.date(),
      yesProb: i.number(),
    }),
    conversations: i.entity({
      name: i.string(),
    }),
    blocks: i.entity({
      created_at: i.date(),
      updated_at: i.date(),
      content: i.json(),
      role: i.string(),
    }),

    votes: i.entity({
      isUpvote: i.boolean(),
    })
  },
  // You can define links here.
  // For example, if `posts` should have many `comments`.
  // More in the docs:
  // https://www.instantdb.com/docs/modeling-data#3-links
  links: {
    profile_votes: {
      forward: {
        on: "profiles",
        has: "many",
        label: "votes",
      },
      reverse: {
        on: "votes",
        has: "one",
        label: "profile",
      },
    },
    market_votes: {
      forward: {
        on: "markets",
        has: "many",
        label: "votes",
      },
      reverse: {
        on: "votes",
        has: "one",
        label: "market",
      },
    },
    options_shares: {
      forward: {
        on: "options",
        has: "many",
        label: "shares",
      },
      reverse: {
        on: "shares",
        has: "one",
        label: "option",
      },
    },
    markets_options: {
      forward: {
        on: "markets",
        has: "many",
        label: "options",
      },
      reverse: {
        on: "options",
        has: "one",
        label: "market",
      },
    },
    profiles_holdings: {
      forward: {
        on: "profiles",
        has: "many",
        label: "holdings",
      },
      reverse: {
        on: "holdings",
        has: "one",
        label: "profile",
      },
    },
    holdings_shares: {
      forward: {
        on: "holdings",
        has: "one",
        label: "share",
      },
      reverse: {
        on: "shares",
        has: "many",
        label: "holdings",
      },
    },
  },
  // If you use presence, you can define a room schema here
  // https://www.instantdb.com/docs/presence-and-topics#typesafety
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema { }
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
