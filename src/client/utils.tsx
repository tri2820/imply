import { id } from "@instantdb/core";
import { db } from "./database";
import {
  Block,
  calculateAttributes,
  colors,
  hash,
  HistoryOptionSubscription,
  interpolate,
  MarketResponse,
  MarketSubscription,
  ProfileSubscription,
  Series,
  YesOrNo,
} from "../utils";
import { createSignal } from "solid-js";
import {
  LastPriceAnimationMode,
  LineType,
  UTCTimestamp,
} from "lightweight-charts";
import { getRequestEvent } from "solid-js/web";

export function createOption() {
  const yes_share_id = id();
  const no_share_id = id();
  const option_id = id();
  // let yesReserve = Math.round(800 + Math.random() * 300);
  // let noReserve = Math.round(800 + Math.random() * 300);
  // const totalReserve = yesReserve * noReserve;
  // const targetTotalReserve = 1000000;
  // const scale = Math.sqrt(targetTotalReserve / totalReserve);
  // yesReserve *= scale;
  // noReserve *= scale;
  const yesReserve = 1000;
  const noReserve = 1000;

  return {
    option_id,
    transactions: [
      db.tx.shares[yes_share_id].update({
        type: "yes",
        reserve: yesReserve,
      }),
      db.tx.shares[no_share_id].update({
        type: "no",
        reserve: noReserve,
      }),

      db.tx.options[option_id]
        .update({
          name: `o_${Math.random().toString(36).substring(7)}`,
          color: colors[hash(option_id) % colors.length],
          image: "",
        })
        .link({
          shares: [yes_share_id, no_share_id],
        }),
    ],
  };
}

export async function addMockMarket(num_option: number = 5) {
  const market_id = id();

  const options = Array.from({ length: num_option }, (_, i) => createOption());
  const transactions: Parameters<typeof db.transact>[0] = [
    ...options.flatMap((o) => o.transactions),
    db.tx.markets[market_id]
      .update({
        name: "Who will win the next election?",
        description: "Predict the winning candidate of the 2028 election. ",
        image: "",
        // The options are not independent
        // Only one option can win
        // Unlike "Who will attend the inauguration? (Barack Y/N, Trump Y/N, Biden Y/N)"
        allow_multiple_correct: false,
        created_at: new Date().toISOString(),
        resolve_at: new Date(
          Date.now() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
        stop_trading_at: new Date(
          Date.now() + (3 - 1) * 24 * 60 * 60 * 1000
        ).toISOString(),
        rule: `The winner of the market is the candidate that wins the election according to Google News.\nIf a candidate drops out before the election, the option will be resolved as "No".\nIf the result of the election is disputed, the option for all candidatte will be resolved as "No".`,
      })
      .link({
        options: options.map((o) => o.option_id),
      }),
  ];

  await db.transact(transactions);

  // trigger api history__options
  const ps = options.map((o) => triggerAddHistoryOption(o.option_id));
  await Promise.all(ps);
}

export async function triggerAddHistoryOption(option_id: string) {
  const res = await fetch(`/api/history__options/${option_id}`, {
    method: "POST",
  });
  if (!res.ok) {
    console.error(
      "failed to trigger api history__options",
      res.status,
      res.statusText
    );
  }
}

export const [loadMarketsState, setLoadMarketsState] = createSignal<
  "idle" | "loading"
>("idle");
export async function loadMarkets() {
  setLoadMarketsState("loading");
  try {
    console.log("load markets");
    const r = marketResponses().at(-1);
    const lastCursor = r?.pageInfo?.markets?.endCursor;
    const resp = await db.queryOnce({
      markets: {
        options: {
          shares: {},
        },
        $: {
          first: 8,
          ...(lastCursor && { after: lastCursor }),
          order: {
            serverCreatedAt: "desc",
          },
        },
      },
    });

    console.log("resp", resp);
    setMarketResponses((prev) => [...prev, resp]);
  } catch (e) {}
  setLoadMarketsState("idle");
}

// AI page
export type Blocks = { [id: string]: Block };
export const [blocks, setBlocks] = createSignal<Blocks>({});
export const blocksToList = (blocks: Blocks) =>
  Object.values(blocks).toSorted(
    (a, b) =>
      new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
  );
export const listBlocks = () => blocksToList(blocks());

if (typeof window !== "undefined") {
  // @ts-ignore
  window.dev = {
    addMockMarket,
    setBlocks,
    blocks: () => {
      setBlocks((prev) => {
        console.log("blocks", prev);
        return prev;
      });
    },
  };
}

// Markets page
export const [marketResponses, setMarketResponses] = createSignal<
  MarketResponse[]
>([]);
export const markets = () => {
  const ms = marketResponses().flatMap((m) => m.data.markets);
  return calculateAttributes(ms);
};
export const marketsHasNextPage = () => {
  const r = marketResponses().at(-1);
  const hasNextPage = r?.pageInfo?.markets?.hasNextPage;
  return hasNextPage;
};

// Universial
export const [profileSubscription, setProfileSubscription] =
  createSignal<ProfileSubscription>();
export const profile = () => {
  const s = profileSubscription();
  const p = s?.data?.profiles.at(0);
  return p;
};

// BuySelComp

export const [optionId, setOptionId] = createSignal<string>();
export const [type, setType] = createSignal<YesOrNo>("yes");

export const [marketSubscription, setMarketSubscription] =
  createSignal<MarketSubscription>();
export const market = () => {
  const s = marketSubscription();
  const ms = s?.data?.markets ?? [];
  const _ms = calculateAttributes(ms);
  return _ms.at(0);
};
export const [historyOptionSubscription, setHistoryOptionSubscription] =
  createSignal<HistoryOptionSubscription>();

const historyOptions = () =>
  historyOptionSubscription()?.data?.history__options ?? [];

export const chartSeries = () => {
  const m = market();
  if (!m) return [];

  const result: {
    [option_id: string]: Series;
  } = {};

  m.options.forEach((o) => {
    result[o.id] = {
      data: [],
      id: o.id,
      options: {
        color: o.color,
        lineType: LineType.WithSteps,
        lineWidth: 2,
        lastPriceAnimation: LastPriceAnimationMode.Continuous,
      },
      title: o.name,
    };
  });

  historyOptions().forEach((h) => {
    if (!result[h.option_id]) return;
    result[h.option_id].data.push({
      time: Math.floor(new Date(h.created_at).getTime() / 1000) as UTCTimestamp,
      value: h.yesProb,
    });
  });

  return Object.values(result).map((s) => {
    const sorted = s.data.toSorted((a, b) => a.time - b.time);
    return {
      ...s,
      data: sorted,
    };
  });
};

export const [scrolledToBottom, setScrolledToBottom] = createSignal<string>();
export const [abortController, setAbortController] =
  createSignal<AbortController>();

// export const [blocksScrollView, setBlocksScrollView] =
//   createSignal<HTMLDivElement>();

export const userChatted = () => listBlocks().length > 0;
export const [news, setNews] = createSignal<{ title: string }[]>([
  {
    title: "Government announces new tax policies for 2023",
  },
  {
    title: "Tesla announces new model 3",
  },
  {
    title: "Scientists discover new species of cat that can play the piano",
  },
  {
    title: "SpaceX launches new rocket to Mars",
  },
  {
    title: "Apple unveils its latest iPhone model",
  },
  {
    title: "Breakthrough in cancer research offers new hope",
  },
  {
    title: "Global markets react to unexpected interest rate hike",
  },
  {
    title: "Major tech company faces data breach allegations",
  },

  {
    title: "Major tech company faces data breach allegations",
  },

  {
    title: "Major tech company faces data breach allegations",
  },

  {
    title: "Major tech company faces data breach allegations",
  },
]);

export const [bigLogoEl, setBigLogoEl] = createSignal<HTMLElement>();

export const [infiniteScrollHovered, setInfiniteScrollHovered] =
  createSignal(false);

export const scrollToEnd = () => {
  // console.log("scrolling", document.body.scrollHeight);
  window.scrollTo({
    // 80 is random for no reason
    top: document.body.scrollHeight + 80,
    behavior: "smooth",
  });
};
