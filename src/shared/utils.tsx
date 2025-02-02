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
import { Stream } from "openai/streaming.mjs";
import { ChatCompletionChunk } from "openai/resources/index.mjs";
import { ChatCompletionMessageParam } from "openai/src/resources/index.js";
import { ToolCall } from "openai/src/resources/beta/threads/runs/steps.js";

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
        doings: [],
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

export function zodParseJSON<T>(schema: ZodSchema<T>) {
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
    const f = mkToolFactoryProps.factory({
      body: unboundedFactoryProps.body,
      send: (msg) => {
        // TODO:
        // const tool_call_id = ...unboundedFactoryProps.toolBindings;
        // chatTaskProps.send({})
        // CANNOT?
      },
    });

    const fWrapper = (args: any) => {
      try {
        const result = f(args);
        // TODO: filter result (remove content that we don't want AI to see, but want to show in the UI)
        // Send back result here
        // CANNOT?
        return result;
      } catch (e) {
        console.error(e);
        return undefined;
      }
    };

    const tool: Tool = {
      type: "function",
      function: {
        name: mkToolFactoryProps.name,
        function: fWrapper,
        description: mkToolFactoryProps.description,
        parse: zodParseJSON(mkToolFactoryProps.schema),
        parameters: zodToJsonSchema(mkToolFactoryProps.schema) as JSONSchema,
      },
    };
    return tool;
  };
}

async function* t() {
  yield "a";
}

export function streamNDJSON(gen: AsyncGenerator) {
  // Use the async generator function to create a stream of JSON
  const transform = stringifyMultiJsonStream();
  const byteTransformer = new TransformStream<string, Uint8Array>({
    transform(chunk, c) {
      const encodedChunk = new TextEncoder().encode(chunk);
      c.enqueue(encodedChunk);
    },
  });

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of gen) {
        controller.enqueue(chunk);
      }
      controller.close();
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
  let yesReserve = Math.ceil(Math.pow((K * (1 - yes_prob)) / yes_prob, 0.5));
  if (yesReserve < 1) yesReserve = 1;
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

export const kaomojis = [
  ">.< Upset",
  ">_> Looking",
  "<( ･ｪ-)<} Bow and Arrow",
  "<(;￣ ･￣) Scratching",
  "<(^oo^)> Pig",
  "<コ:彡 Squid",
  "(#^.^#) Embarrassed",
  "(#×_×) Dead",
  "(>^_^)><(^o^<) Hugging",
  "(>_<) Painful",
  "( --)/ ==卍 Ninja Star",
  "( -_-)旦~ Drinking",
  "( ^_^)／ Waving",
  "( `_)?(_' ) Dueling",
  "( `_)乂(_' ) Arm wrestle",
  "( ° ᴗ°)~ð Proposal",
  "( ´-ω･)︻┻┳══━一 Sniper",
  "( ˇ෴ˇ ) Hipster",
  "( ˘ ³˘)♥ Kiss me",
  "( ͡° ͜ʖ ͡°) Smiling",
  "( • ∀•)っθΘʘ Hiding Easter eggs",
  "( •_•)O °Q(•_• ) Playing Ping Pong",
  "( ｀o´)_θ☆ Kicking",
  "( ｀皿´)｡ﾐ/ Hitting",
  "( ￣┏＿┓￣) Mustache",
  "(( ＿ ＿)☆ ≡〇 Header",
  "((((((^_^;) Evading",
  "(((((^_^) Teleporting",
  "(((༼•̫͡•༽))) Ghost",
  "(((☎))) Phone",
  "(* ￣)(￣ *) Kissing",
  "(*@_＊#) Beaten Up",
  "(*^o^)人(^o^*) Buddies",
  "(*°∀°)=3 Infatuated",
  "(*’(OO)’*) Piggy",
  "(*≧m≦*) Enraged",
  "(*▿▿* ƪ) Vampire",
  "(*・)σσ(*゜O゜) Poking",
  "(*・_・)ノ⌒* Throwing Away",
  "(*￣m￣) Dissatisfied",
  "(+.+)(-.-)(_ _) Falling Asleep",
  "(+[__]∙:∙) PlayStation Portable",
  "(- o - ) zzZ ☽ Sleepy",
  "(-_-)# Girl",
  "(-_ゞ Groggy",
  "(-ε- ) Pucker up",
  "(-□-)︵* Blowing a Kiss",
  "(.〜◍`皿′◍〜.) Livid",
  "(//_^) Emo",
  "(/ω･＼) Peering",
  "(:3 っ)っ Walrus",
  "(;-_-)ノ Giving up",
  "(;´ρ`) Yawning",
  "(;´Д`) Giving Up",
  "(;´༎ຶД༎ຶ`) Weeping",
  "(=^_^=) Bunny",
  "(=^ェ^=) Cat",
  "(=^･ｪ･^=) Kitty",
  "(^ _ ^)/~~ Goodbye",
  "(^^)// Applause",
  "(^_^) Laughing",
  "(^o^) Singing",
  "(^‿◕) Winking",
  "(_ _)..ooOO Dreaming",
  "(`_^) Wink",
  "(o^-^o) Pikachu",
  "(o´・Υ・)ﾉ･ Help",
  "(o￣∇￣)=◯)`ν゜)･ Punching",
  "(p_-) Thinking",
  "(ToT) Crying",
  "(V) (°,,,,°) (V) Zoidberg",
  "(z_z~.) Tired",
  "(~_(]=--Z(◡˘) Pie Fight",
  '(¬_¬") Annoyed',
  "(¬_¬ ) Neglected",
  "(¬‿¬) Cunning",
  "(¬､¬) Shifty",
  "(°̥̥̥̥̥̥̥̥ᴗ°̥̥̥̥̥̥̥̥) Happy crying",
  "(´>_●)メ(●_<｀) Sword Fighting",
  "(´~`) Weary",
  "(´∪`*) Friendly",
  "(´╹〽╹`) Worried",
  "(´・ω・)っ由 Gift",
  "(´ー｀)┌ﾌｯ Golf Clap",
  "(´･ω･`) Snubbing",
  "(ò_ó) Furious",
  "(ó ì_í)=óò=(ì_í ò) Bro Pound",
  "(ɔˆ ³(ˆ⌣ˆc) Loving couple",
  "(ɔ˘з˘)ɔ Romantic",
  "(ʘ‿ʘ) Smile",
  "(о＾ω＾о) Giggling",
  "(ू˃̣̣̣̣̣̣︿˂̣̣̣̣̣̣ ू) Sobbing",
  "(ಥ﹏ಥ) Devastated",
  "(ง •̀_•́)ง Feisty",
  "(ง •̀ゝ•́)ง Fighting",
  "(๑´•.̫ • `๑) Blushing",
  "(๑≖ิิ益≖ิ๑) Evil Laugh",
  "(๑╹ڡ╹๑) Tasty",
  "(•͡.•͡) Skeptical",
  "(•ᴥ• )́`́'́`́'́⻍ Porcupine",
  "(‥;) Depressed",
  "(″･ิ_･ิ)っ Wait",
  "(‾ʖ̫‾) Lethargic",
  "(∩｀-´)⊃━☆ﾟ.*･｡ﾟ Wizard",
  "(∩｀-´)⊃━☆ﾟ.*･｡ﾟ Magic Attack",
  "(∿°○°)∿ ︵ ǝʌol Heartbroken",
  "(≧∇≦)/ Joyful",
  "(⊃‿⊂) Anticipation",
  "(⊙_◎) Crazed",
  "(⌒ ͜ʖ⌒)b Attentive",
  "(⓪益⓪) Staring",
  "(─‿‿─) Pleased",
  "(╬☉Д⊙ฺ) Cyborg",
  "(╯3╰) Kiss",
  "(╯_╰) Bummed out",
  "(╯°□°)╯︵ ʞooqǝɔɐɟ Flipping Facebook",
  "(╯°□°)╯︵ ┻━┻ Flipping Table",
  "(╯°□°）╯︵ ┻━┻ Flipping table",
  "(╯˘ -˘ )╯ Praying",
  "(╯ნ_㇁ნ)╯ Defeated",
  "(╯‵Д′)╯ Scary",
  "(▀̿Ĺ̯▀̿ ̿) Deal with it",
  "(▰˘◡˘▰) Satisfied",
  "(○｀д´)ﾉｼ Σ(っﾟДﾟ)っ Chasing",
  "(●´ﾉω`)ｺ Whispering",
  "(●∈∋●) Bird",
  "(◐‿◑) Crazy",
  "(◣_◢) Angry",
  "(☄ฺ◣д◢)☄ฺ Scaring",
  "(★▼▼)o┳*-- Shooting",
  "(☉__☉”) Yikes",
  "(♥_♥) In Love",
  "(✖╭╮✖) Deceased",
  "(。_°)☆ Punched",
  "(。。;)＼(-_-) Comforting",
  "(。･_･)ノ”【】 Painting",
  "(っ^‿^)っ Kirby",
  "(っ˘ڡ˘ς) Yummy",
  "(っ⌒‿⌒)っ Hug",
  "(づ￣ ³￣)づ Smooch",
  "(シ_ _)シ Apology",
  "(＊☉౪ ⊙｡)ﾉ Imbecile",
  "(－‸ლ) Whoops",
  "(／o^)/°⊥＼(^o＼) Volleyball",
  "(／。＼) Frightened",
  "(；^＿^)ッ☆(　゜o゜) Slapping",
  "(；一_一) Ashamed",
  "(＾▽＾) Cheerful",
  "(｡▼皿▼) Darth Vader",
  "(｡♥‿♥｡) Smitten",
  "(｡･ˇдˇ･｡) Pompous",
  "(ﾉ-o-)ﾉ 中 Olympic Hammer Throw",
  "(ﾉ_ _)ﾉ Surrender",
  "(ﾉﾟ0ﾟ)ﾉ~ Yoo-  Hoo",
  "(￣┏∞┓￣) Fu Manchu Man",
  "(￣▼￣) Big Grin",
  "(￣ー￣)//”” Clapping",
  "(￣ー￣（＿　＿（ Nodding",
  "---(o_　_)o Tripping",
  "-_-* Frustrated",
  "-_-; Anime Sweat Drop",
  "-{'''|'''|'''|''']=[] Syringe",
  "-ˆ ω ˆ- Kitten",
  ".∵･(ﾟДﾟ) Scared",
  "/( ＿0＿)￣θ☆≡≡○ Scissor Kick",
  "/|( ;,; )/| Bat",
  "8(>_<)8 Jealous",
  ":(¦) Frog",
  ":-{  -__-: Stinky",
  ":-Þ Teasing",
  ":þ Playful",
  "@( o･ω･)@ Monkey",
  "[ ± _ ± ] Sick",
  "[-_-]~ Ninja",
  "[]゛７(∀゜*） Dialing",
  "[^._.^]ﾉ彡 Nyan Cat",
  "[¬º-°]¬ Zombie",
  "[•.•ิ] Huh",
  "\\(<.<|>.>)// Panicking",
  "m/d(^_^)bm/ Rocking Out",
  "＿(´▽｀)♪＿/ Bathtub",
  "^(#｀∀´)_Ψ Demon",
  "^)_(^ Chubby",
  "^-^ Happy",
  "^;;^ Spider",
  "^^ Blissful",
  "^_^ Overjoyed",
  "^_^/ High Five",
  "^_^; Guilty",
  "^o^ Mog",
  "___ψ(‥ ) Studying",
  "d(^_^)b Listening to Music",
  "d-(^.^)z Thumbs Up",
  "d^_^b DJ",
  "L(´□｀L)   Oh No!",
  "m( ﾟ皿ﾟ)m★━━ Laser",
  "o(>< )o⌒* Mad",
  "O(<>'<>)O Aang",
  "o(^^o)(o^^)o Hopeful",
  "o(^_-)O Boxer",
  "o(^▽^)o Pumped",
  "o(´^｀)o Reluctant",
  "Q('.'Q) Put Em Up",
  "T.T Sad",
  "U=･ x ･=U Rabbit",
  "uwu Happy Anime Face",
  "U＾ェ＾U Puppy",
  "v(^_^)v Victory",
  "V=(° °)=V Crab",
  "V●ᴥ●V Doggy",
  "{{|└(>o< )┘|}} Up In Arms",
  "{♥‿♥} Lovestruck",
  "|̲̅̅●̲̅̅|̲̅̅=̲̅̅|̲̅̅●̲̅̅| Stereo",
  "|д･) Hiding",
  "|∴め ϖ め∴| SpongeBob SquarePants",
  "¤( `⌂´ )/¤ Lifting weights",
  "¥[*.*]¥ Robot",
  "¬.¬ Whatever",
  "¯(°_o)/¯ Confused shrug",
  "¯(°_o)/¯ Confused",
  "¯_(ツ)_/¯ Shrugging",
  "ƪ(˘⌣˘)ʃ Raise the roof",
  "ƪ(˘▽˘ƪ) Worshiping",
  "Ƹ̵̡Ӝ̵̨̄Ʒ Butterfly",
  "ʕ •́؈•̀) Winnie the Pooh",
  "ʕ •ᴥ•ʔ Koala",
  "ʕʔ Bread",
  "ʕु•̫͡•ʔु Bear cub",
  "ʕ•͡ᴥ•ʔ Polar bear",
  "ʘ‿ʘ Eager",
  "˙ ͜ʟ˙ Content",
  "ε-(´・｀) ﾌ Phew",
  "ε=(☉_☉) Accidental farting",
  "ε=ε=ε=┌(๑ʘ∀ʘ)┘ Sprinting",
  "ε=┌( ≧▽)┘ Elated",
  "ε=┌(^-^)┘ Skipping",
  "ε=┏( >_<)┛ Running",
  "ϵ( 'Θ' )϶ Fish",
  "٩◔̯◔۶ Eye Roll With Hands Up",
  "੯ू•́ू ໒꒱⁼³₌₃ Sonic the Hedgehog",
  "੯ू‵ू ໒꒱ Poodle",
  "ಠ_ಠ Disapproval",
  "ಠ_ರೃ Monocle",
  "ಠᴗಠ Scheming",
  "ಥ_ಥ Bawling",
  "๏-) Cyclops",
  "༼ ༎ຶ ෴ ༎ຶ༽ Distraught",
  "༼ つ ◕_◕ ༽つ Take my energy",
  "༼ つ ◕_◕ ༽つ Gimme",
  "༼ঢ_༽ঢ༽ Perplexed",
  "༼ঢ_㇁ঢ༽ Bad hair day",
  "ლ(´ڡ`ლ) Licking",
  "ლ(ಠ益ಠ)ლ Anger",
  "ლ(ಠ益ಠლ) But At What Cost",
  "ᒄ₍⁽ˆ⁰ˆ⁾₎ᒃ♪♬ Frosty the Snowman",
  "ᕕ( ᐛ )ᕗ Celebrating",
  "ᕦ(ò_óˇ)ᕤ Flexing",
  "ᕦ◉▿◉ᕤ Owl",
  "ᕦ❍ᴗ❍ᕤ Muscular Person",
  "ᘛ⁐̤ᕐᐷ Chameleon",
  "ᡊ|◔じ◔|ᡊ Woody Allen",
  "ᶘ ᵒᴥᵒᶅ Seal",
  "‎(>o<)ρミ┳┷┳゜ Table Tennis",
  "†_(ﾟｰﾟ*)β Exorcism",
  "•:_:• Nagato",
  "←～（o ｀▽´ )oΨ Satan",
  "∊ಠ_ಠ∍ Distressed",
  "∊♡_ᴥ_♡∍ Puppy Love",
  "∋(°O°)∈ Blowfish",
  "∋∞(●ﾟvﾟ)∞∈ Pigtails",
  "⊂ •͡˘∠•͡˘ ⊃ Suspicious",
  "⊂((・▽・))⊃ Hug me",
  "⊂(^(工)^)⊃ Teddy bear",
  "⊂(◜ᴥ◝)つ Teddy Bear",
  "⊆☉ᴥ☉⊇ Bear",
  "⊙▂⊙ Shocked",
  "⋟^≏^⋞ Kitty Cat",
  "⎰≀.☮-☮≀⎰ John Lennon",
  "─=≡Σ(([ ⊐•̀⌂•́]⊐ Superhero",
  "┌|°з°|┘ Cutting a rug",
  "└(^o^ )Ｘ( ^o^)┘ Best buddies",
  "└(^o^)┐ Grooving",
  "└@(･ｪ･)@┐ Beefcake",
  "┗( ●-﹏ ｀｡)づ Hurt",
  "┗(･ω･;)┛ How Should I Know",
  "┬─┬ノ( º _ ºノ) Putting Table Back",
  "┬─┬︵/(.□.)╯ Table Flips You",
  "┬┴┬┴┤(･_├┬┴┬┴ Snooper",
  "┳┻┳° Ping Pong table",
  "╹﹏╹ Cold",
  "▼o･_･o▼ Hello",
  "◔̯◔ Rolling Eyes",
  "◖ර◞ʖ◟ර◗ Grandma",
  "◖⎚∠⎚◗ Geek",
  "◖㈠ ω ㈠◗ Panda",
  "◤◡ᴥ◡◥ Dog",
  "◦°˚☺/˚°◦ Playing in the snow",
  "◯０o。(ー。ー)y Smoking",
  "☉ϖ☉ Lobster",
  "♥‿♥ Enamored",
  "♪(●′▽`)ﾉ Good Night",
  "♪┏(・o･)┛♪ Dancing",
  "♪～(￣ε￣；) Whistling",
  "♫.(◠౪◠).♫ Jamming to music",
  "✌(გ_㇁გ)✌ Ringo Starr",
  "✌(◕‿-)✌ Peace",
  "✖‿✖ Dead person",
  "❆❅❉ Snowing",
  "⨌⨀_⨀⨌ Benjamin Franklin",
  "⪿ ↂ ˒̫̮ ↂ ⫀ Elton John",
  "⫷ °⧭° ⫸ Clown",
  "「(°ヘ°) Puzzled",
  "〜〜(／￣▽)／　〜ф Chasing A Butterfly",
  "ヘ（。□°）ヘ Psycho",
  "ヽ( ★ω★)ノ Pumped up",
  "ヽ(´Д｀ヽミノ´Д｀)ノ Frantic",
  "ヽ(⌐■_■)ノ♪♬ Boogie down",
  "ヽ(★ω★)ノ Excited",
  "ヽ(ﾟДﾟ)ﾉ Freak Out",
  "ヽ（´ー｀）┌ Mellow",
  "ヾ(*￣O￣)ツ Yelling",
  "ヾ(｀ε´)ﾉ Booing",
  "㐈⦁ཽし⦁ཽ㐈 Larry David",
  "且_(ﾟ◇ﾟ；)ノﾞ Waiter",
  "꒡ᘦ̲꒡ Sleeping",
  "（ つ Д ｀） Wiping Tears",
  "（*・)｢｣｢｣ Magic Casting",
  "（/｡＼) Shy",
  "（´Д゜）/゜⌒。 Discarding",
  "（　＾）／占~~~ Banksy",
  "（　＾＾）人（＾＾　） Best Buds",
  "（。_°☆＼(- – ) Punch",
  "（。々°） Herp Derp",
  "（・д・）｝ On The Phone",
  "（人’∀’） Precious",
  "（＾～＾） Meh",
  "（＿ε＿） Kiss my butt",
  "（￢з￢）σ Pointing",
  "（￣□￣；） Surprised",
  "（￣へ￣） Discontent",
  "（￣～￣） Unimpressed",
  "／人◕ ‿‿ ◕人＼ Kyubey",
  "＝( ^o^)ノ___ｏ Bowling",
  "＼(-_- ) Thank You",
  "＼(^o)(^0^)(o^)／ Caroling",
  "＼(＾O＾)／ Celebrate",
  "＼(｀0´)／ Fed Up",
  "＼（＾ ＾）／ Glad",
  "＼（～Ｏ～）／ Good Morning",
  "＿φ( °-°)/ Doing Homework",
  "＿φ(°-°=) Doing homework",
  "＿〆(。。) Writing",
  "Ｃ:。ミ Octopus",
  "～゜・_・゜～ Raving",
  "｡◕‿◕｡ Gleeful",
];

export function getRandomKaomoji(count = 6) {
  const shuffled = kaomojis.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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
