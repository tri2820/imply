import { jwtVerify as jose_jwtVerify, SignJWT } from "jose";
import { getRequestEvent } from "solid-js/web";

import OpenAI from "openai";

import { init } from "@instantdb/admin";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  getCookie as vinxi_getCookie,
  setCookie as vinxi_setCookie,
} from "vinxi/http";
import schema from "~/../instant.schema";

import { create_market, search_news } from "./tools";

export function getEnv(key: string) {
  const event = getRequestEvent();
  return event?.nativeEvent.context.cloudflare?.env[key] ?? process.env[key];
}

export function createAdminDb() {
  const INSTANT_APP_ADMIN_TOKEN = getEnv("INSTANT_APP_ADMIN_TOKEN");
  const db = init({
    appId: import.meta.env.VITE_INSTANTDB_APP_ID,
    adminToken: INSTANT_APP_ADMIN_TOKEN,
    schema,
  });
  return db;
}

export function createOpenAI() {
  const apiKey = getEnv("OPENAI_API_KEY");

  const client = new OpenAI({
    apiKey,
  });

  return client;
}

export function getCookie(key: string) {
  const event = getRequestEvent();
  if (!event) throw new Error("No event!");
  const value = vinxi_getCookie(event.nativeEvent, key);
  return value;
}

export function setCookie(key: string, value: string, options?: any) {
  const event = getRequestEvent();
  if (!event) throw new Error("No event!");
  vinxi_setCookie(event.nativeEvent, key, value, {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    ...options,
  });
}

export async function verifyJWT(profile_jwt: string) {
  const JWT_SECRET_KEY = getEnv("JWT_SECRET_KEY");
  const secret = new TextEncoder().encode(JWT_SECRET_KEY);

  const { payload } = await jose_jwtVerify(profile_jwt, secret);
  return payload;
}

export async function sign(jwtObject: SignJWT) {
  const JWT_SECRET_KEY = getEnv("JWT_SECRET_KEY");
  const secret = new TextEncoder().encode(JWT_SECRET_KEY);
  return jwtObject.sign(secret);
}
export async function chatTask(props: ChatTaskProps) {
  const history: ChatCompletionMessageParam[] = props.body.blocks.map((b) => {
    return {
      role: b.role,
      content: b.content,
    } as any;
  });

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are the native AI of Imply.app. This is a prediction market platform for everyone. Very scientific with broad application. The app uses play money (still called USD) and not real money. AI is employed to help traders.
      
      Your job is to:
      - give strong opinions on the prediction. 
      - search for relevant markets on the platform 
      - create create new markets if non is available and you want to gather data. Prediction markets have to be specific & with binary outcome.

        Do not sound AI, do not yap.
        Current time is ${new Date().toISOString()}.
      `,
    },
    ...history,
  ];

  console.log("messages", messages);
  const client = createOpenAI();

  try {
    const runner = client.beta.chat.completions
      .runTools({
        stream: true,
        model: "gpt-4o",
        messages,
        // tools: [add, get_weather],
        // create_market_factory(send)
        tools: [
          create_market,
          search_news
        ].map(factory => factory(props)),
      })
      .on("content.delta", (e) => {
        props.send({
          delta: e.delta,
        });
      })
      .on("tool_calls.function.arguments.delta", (e) => { })
      .on("tool_calls.function.arguments.done", (e) => {
        console.log('tool done', e)
      })
      // .on("chunk", (chunk) => {
      //   controller.enqueue({
      //     chunk
      //   });
      // })
      .on("message", (message) => {
        props.send({
          forward: message,
        });
      });

    const finalContent = await runner.finalContent();
    console.log(">>", finalContent);
  } catch (e) {
    console.error(e);
  }
}


export async function triggerAddHistoryOption(option_id: string) {
  const event = getRequestEvent();
  if (!event) throw new Error("No event!");
  const origin = new URL(event.request.url).origin
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

