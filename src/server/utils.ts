import { jwtVerify as jose_jwtVerify, SignJWT } from "jose";
import { getRequestEvent } from "solid-js/web";

import OpenAI from "openai";

import { id, init } from "@instantdb/admin";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import {
  getCookie as vinxi_getCookie,
  setCookie as vinxi_setCookie,
} from "vinxi/http";
import schema from "~/../instant.schema";
import { createMarketFactory } from "~/shared/tools/createMarketFactory";
import { searchNewsFactory } from "~/shared/tools/searchNewsFactory";

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
      content: `You are the native AI of Imply.app. This is a prediction market platform for everyone. The app uses play money (still called USD).
      
      Your job is to:
      - research topics intensively and come up with hypotheses.
      - give strong opinions on the prediction. 
      - create new markets to gather data if none is available. 

        Current time is ${new Date().toISOString()}.
        Do not yap. Be concise.
        If the input is too vague, give concrete examples on how to make the topic specific (e.g. X will happen on this exact date D).`,
    },
    ...history,
  ];

  console.log("messages", messages);
  const client = createOpenAI();

  try {
    const toolBindings: ToolBindings = {}
    const runner = client.beta.chat.completions
      .runTools({
        stream: true,
        model: "gpt-4o",
        messages,
        tools: [
          createMarketFactory,
          searchNewsFactory,
        ].map(factory => factory({
          ...props,
          toolBindings
        })),
      })
      .on("content.delta", (e) => {
        props.send({
          delta: e.delta,
        });
      })
      .on("tool_calls.function.arguments.delta", (e) => {
        let toolBinding = toolBindings[e.index.toString()];
        if (toolBinding === undefined) {
          toolBinding = {
            id: id()
          }
          toolBindings[e.index.toString()] = toolBinding
        }

        props.send({
          tool: {
            call_id: toolBinding.id,
            arguments_delta: {
              delta: e.arguments_delta,
              name: e.name,
            },
          },
        });
      })
      .on("message", (message) => {
        if (message.role === 'assistant') {
          if (message.tool_calls) {
            for (const [index, tool] of message.tool_calls.entries()) {
              const toolBinding = toolBindings[index.toString()];
              if (toolBinding === undefined) {
                throw new Error('toolBinding is undefined')
              }
              toolBinding.openai_call_id = tool.id;

              props.send({
                tool: {
                  call_id: toolBinding.id,
                  started: {
                    arguments: JSON.parse(tool.function.arguments)
                  }
                },
              });

            }
          }
        }

        if (message.role === "tool") {
          const index = Object.keys(toolBindings).find((i) => toolBindings[i].openai_call_id === message.tool_call_id);
          if (index === undefined) {
            throw new Error('id is undefined')
          }
          props.send({
            tool: {
              call_id: toolBindings[index].id,
              done: {
                result: JSON.parse(message.content as string),
              },
            },
          });
          delete toolBindings[index];
        }

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


