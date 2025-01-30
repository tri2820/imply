import { InstantAdminDatabase } from "@instantdb/admin";
import { id, InstantCoreDatabase } from "@instantdb/core";
import { formatDistance } from "date-fns";
import {
  parseJsonStream,
  streamToIterable,
  stringifyMultiJsonStream,
} from "json-stream-es";
import { LineType, UTCTimestamp } from "lightweight-charts";

import { JSONSchema } from "openai/lib/jsonschema.mjs";
import { z, ZodSchema, ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AppSchema } from "../../instant.schema";
import { getRequestEvent } from "solid-js/web";
import { ToolName } from "./tools";

export const MIN_USD_AMOUNT = 10;
export const MIN_SHARE_AMOUNT = 1;

// Enum types
export enum Color {
  LightPurple = "#987ef7",
  Pink = "#ee0878",
  Blue = "#00aaff",
  Yellow = "#ffaa00",
  Green = "#00ffaa",
  Purple = "#aa00ff",
}
export const colors = Object.values(Color);
export const colorClasses = {
  background: {
    [Color.LightPurple]: `bg-[#987ef7]/20 group-hover:bg-[#987ef7]/40 data-[checked=true]:bg-[#987ef7]/40`,
    [Color.Blue]: `bg-blue-500/20 group-hover:bg-blue-500/40 data-[checked=true]:bg-blue-500/40`,
    [Color.Pink]: `bg-pink-500/20 group-hover:bg-pink-500/40 data-[checked=true]:bg-pink-500/40`,
    [Color.Green]: `bg-green-500/20 group-hover:bg-green-500/40 data-[checked=true]:bg-green-500/40`,
    [Color.Yellow]: `bg-yellow-500/20 group-hover:bg-yellow-500/40 data-[checked=true]:bg-yellow-500/40`,
    [Color.Purple]: `bg-purple-500/20 group-hover:bg-purple-500/40 data-[checked=true]:bg-purple-500/40`,
  },
};

export function generateChartData(n: number = 2) {
  // Generate some random data for the chart
  const listSeries: Series[] = [];
  for (let i = 0; i < n; i++) {
    const series: Series = {
      id: i.toString(),
      title: `Option ${i}`,
      data: Array.from({ length: 4 }, (_, i) => {
        return {
          time: (1529899200 + i) as UTCTimestamp,
          value: 1 + Math.random() * 10,
        };
      }),
      options: {
        color: colors[i % colors.length],
        lineType: LineType.WithSteps,
        lineWidth: 2, // Adjust line width if needed
      },
    };
    listSeries.push(series);
  }

  // Normalize the data such that at any time, the sum of all series is 1
  const dataLength = listSeries[0].data.length;
  for (let i = 0; i < dataLength; i++) {
    const sum = listSeries.reduce(
      (acc, series) => acc + series.data[i].value,
      0
    );
    listSeries.forEach((series) => {
      series.data[i].value /= sum;
    });
  }
  return listSeries;
}

export function lastItemToPercent(series: Series, precision: number = 2) {
  const last = series.data.at(series.data.length - 1);
  if (!last) return "N/A%";
  return (last.value * 100).toFixed(precision) + "%";
}

export function lastItemToUSD(series: Series, precision: number = 2) {
  const last = series.data.at(series.data.length - 1);
  if (!last) return "$N/A";
  return "$" + last.value.toFixed(precision);
}
export function generateBlocks(): Blocks {
  return {
    "90eb360d-1904-4314-81df-c4888c85b097": {
      id: "90eb360d-1904-4314-81df-c4888c85b097",
      role: "user",
      content: "hello",
      created_at: "2025-01-26T12:25:35.120Z",
      updated_at: "2025-01-26T12:25:35.120Z",
    },
    "896f8a9c-50cc-46b1-8866-4b12309f7664": {
      id: "896f8a9c-50cc-46b1-8866-4b12309f7664",
      role: "assistant",
      content:
        "That's a bold prediction, as it's quite early to firmly forecast political outcomes for 2028. Many variables come into play, such as political climates, candidates from other parties, and unforeseen events.\n\nLet's create a market to gather opinions and predictions about the 2028 Presidential Election with a focus on Trump's potential candidacy. Stay tuned! The market \"Will Trump win the 2028 U.S. Presidential Election?\" is now created. You can participate to express your prediction and see what others think. Let's see how public sentiment and insights play out over time!",
      created_at: "2025-01-26T12:25:39.547Z",
      updated_at: "2025-01-26T12:25:39.547Z",
    },
    "2643e820-b1a4-423e-86ea-d5c9884caef4": {
      id: "2643e820-b1a4-423e-86ea-d5c9884caef4",
      content: {
        arguments_partial_str: "",
        name: ToolName.createMarket,
        arguments: {
          name: "Will Trump win the 2028 U.S. Presidential Election?",
          details: {
            description:
              "Predict whether Donald Trump will win the 2028 U.S. Presidential Election. Consider factors like his political influence, opposing candidates, and public opinion.",
            options: ["Yes", "No"],
            closing_date: new Date("2028-11-01"),
          },
        },
      },
      role: "tool",
      created_at: "2025-01-26T12:25:37.983Z",
      updated_at: "2025-01-26T12:25:37.983Z",
    },
  };
}

export const calcAttributes = (
  market: MarketResponse["data"]["markets"][number]
) => {
  const market1 = {
    ...market,
    options: market.options.map((o) => {
      return {
        ...o,
        // In the context of this market
        independent: market.allow_multiple_correct,
        yesProb: yesProb(o.shares),
      };
    }),
  };

  const totalYesProb = market1.options.reduce((acc, o) => {
    return acc + (o.yesProb ?? 0);
  }, 0);

  return {
    ...market1,
    options: market1.options
      .map((o) => {
        return {
          ...o,
          normalizedYesProb: o.yesProb ? o.yesProb / totalYesProb : undefined,
        };
      })
      .toSorted((a, b) => {
        return (b.normalizedYesProb ?? -1) - (a.normalizedYesProb ?? -1);
      }),
  };
};

export function yesProb(shares: Share[]) {
  const total = shares.reduce((acc, s) => acc + s.reserve, 0);
  if (total == 0) return undefined;

  // More reserve leftover means people don't like it.
  // 5 yes, 20 no -> yes is more likely than no
  // probability of yes = 20 / (20 + 5) = 80%
  // probability of no = 5 / (20 + 5) = 20%
  const no_share = shares.find((s) => s.type == "no");
  if (!no_share) return undefined;
  return no_share.reserve / total;
}

export function normalize(nums: (number | undefined)[]) {
  const total = nums.filter(notEmpty).reduce((acc, n) => acc + n, 0);
  return nums.map((n) => (n ? n / total : undefined));
}

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined;
}

export function probToPercent(prob: number | undefined) {
  if (prob === undefined) return "N/A%";
  return (prob * 100).toFixed(2) + "%";
}

export function buyShare(
  shares: Share[],
  shareId: string,
  usdAmount: number = MIN_USD_AMOUNT
) {
  if (shares.length > 2) {
    throw new Error("This method only works for 2 shares (Yes and No)");
  }

  const share = shares.find((s) => s.id == shareId);
  if (!share) return;

  const theOtherShare = shares.find((s) => s.id != shareId);
  if (!theOtherShare) return;

  // Assume created equally
  const dShareIn = usdAmount * 1;
  const dOtherIn = usdAmount * 1;

  const K = share.reserve * theOtherShare.reserve;
  const shareOut_f =
    share.reserve + dShareIn - K / (theOtherShare.reserve + dOtherIn);

  const shareOut = Number(shareOut_f.toFixed(2));

  if (share.reserve + dShareIn <= shareOut) return undefined;
  const shareReserve_after = share.reserve + dShareIn - shareOut;

  const otherShareReserve_after = theOtherShare.reserve + dOtherIn;

  return {
    type: "buy",
    shareOut,
    shareReserve_after,
    otherShareReserve_after,
    avgPrice: usdAmount / shareOut,
  };
}

export function sellShare(
  shares: Share[],
  shareId: string,
  shareAmount: number = MIN_SHARE_AMOUNT
) {
  if (shares.length > 2) {
    throw new Error("This method only works for 2 shares (Yes and No)");
  }

  const share = shares.find((s) => s.id == shareId);
  if (!share) return;

  const theOtherShare = shares.find((s) => s.id != shareId);
  if (!theOtherShare) return;

  const total_share = share.reserve + theOtherShare.reserve + shareAmount;
  const usdOut_f =
    (total_share -
      Math.pow(
        Math.pow(total_share, 2) - 4 * shareAmount * theOtherShare.reserve,
        0.5
      )) /
    2;
  const usdOut = Number(usdOut_f.toFixed(2));

  // // Important: dollar out = difference in other reserve
  const shareReserve_after = share.reserve - usdOut + shareAmount;
  const otherShareReserve_after = theOtherShare.reserve - usdOut;

  if (otherShareReserve_after < 0) return undefined;
  const avgPrice = usdOut / shareAmount;

  return {
    type: "sell",
    usdOut,
    shareReserve_after,
    otherShareReserve_after,
    avgPrice,
  };
}

export function noProb(yesProb?: number) {
  if (yesProb === undefined) return undefined;
  return 1 - yesProb;
}

export function prob(o: Ext_Option) {
  return o.independent ? o.yesProb : o.normalizedYesProb;
}
export function dateF(d?: string | Date | number) {
  if (!d) return "N/A";
  return new Date(d).toLocaleString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function dateF_dmy(d?: string | Date | number) {
  if (!d) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

export function dateF_h(date: Date | number | string) {
  return formatDistance(date, new Date(), { addSuffix: true });
}

export function hash(input: string, range: number = 1000): number {
  if (range <= 0) {
    throw new Error("Range must be a positive number.");
  }

  let hash = 0;

  // Compute a simple hash using char codes
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }

  // Ensure the hash is positive and within the specified range
  return Math.abs(hash) % range;
}

// forward-fill
export function interpolate(data: DataPoint[]) {
  const result = [];
  for (let i = 0; i < data.length - 1; i++) {
    const { time: startTime, value: startValue } = data[i];
    const { time: endTime, value: endValue } = data[i + 1];

    // Add the current point
    result.push({ time: startTime, value: startValue });

    // Fill in the missing times with the current value
    for (let t = startTime + 1; t < endTime; t++) {
      result.push({
        time: t,
        value: startValue,
      } as DataPoint);
    }
  }

  // Add the last point
  result.push(data[data.length - 1]);

  return result;
}

export function readNDJSON(body: ReadableStream) {
  const stream = body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseJsonStream(undefined, { multi: true }));
  return streamToIterable(stream);
}

// ----

function zodParseJSON<T>(schema: ZodSchema<T>) {
  return (input: string): T => schema.parse(JSON.parse(input));
}

export function mkToolFactory<
  T extends ZodType<any, any, any>
>(mkToolFactoryProps: {
  name: ToolName;
  schema: T;
  factory: (factoryProps: FactoryProps) => (args: z.infer<T>) => any;
  description: string;
}) {
  return (unboundedFactoryProps: UnboundedFactoryProps) => {
    const tool: Tool = {
      type: "function",
      function: {
        name: mkToolFactoryProps.name,
        function: mkToolFactoryProps.factory({
          body: unboundedFactoryProps.body,
          send: (msg) => {
            // TODO:
            // const tool_call_id = ...unboundedFactoryProps.toolBindings;
            // chatTaskProps.send({})
          },
        }),
        description: mkToolFactoryProps.description,
        parse: zodParseJSON(mkToolFactoryProps.schema),
        parameters: zodToJsonSchema(mkToolFactoryProps.schema) as JSONSchema,
      },
    };
    return tool;
  };
}

export function streamNDJSON(
  task: (controller: ReadableStreamDefaultController) => void
) {
  // Use the async generator function to create a stream of JSON
  const transform = stringifyMultiJsonStream();
  const stream = new ReadableStream({
    async start(controller) {
      task(controller);
    },
  });

  const byteTransformer = new TransformStream<string, Uint8Array>({
    transform(chunk, controller) {
      const encodedChunk = new TextEncoder().encode(chunk);
      controller.enqueue(encodedChunk);
    },
  });

  stream.pipeThrough(transform);
  return transform.readable.pipeThrough(byteTransformer);
}

export function createOption(
  db: InstantAdminDatabase<AppSchema> | InstantCoreDatabase<AppSchema>,
  name: string,
  yes_prob: number,
  image = ""
) {
  const yes_share_id = id();
  const no_share_id = id();
  const option_id = id();

  const K = 1000 * 1000;
  const yesReserve = Math.ceil(Math.pow((K * (1 - yes_prob)) / yes_prob, 0.5));
  const noReserve = Math.ceil(K / yesReserve);
  console.log("debug", yesReserve, noReserve, yesReserve * noReserve);
  if (yesReserve * noReserve < K) {
    throw new Error(
      `Initial reserves is too low, wrong calculation ${yesReserve} * ${noReserve} < ${K}`
    );
  }

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
          name,
          color: colors[hash(option_id) % colors.length],
          image,
        })
        .link({
          shares: [yes_share_id, no_share_id],
        }),
    ],
  };
}

export async function triggerAddHistoryOption(option_id: string) {
  const event = getRequestEvent();
  const origin = event ? new URL(event.request.url).origin : "";
  const res = await fetch(`${origin}/api/history__options/${option_id}`, {
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
