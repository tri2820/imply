import type { APIEvent } from "@solidjs/start/server";
import { chat } from "~/server/chat-utils";

import { streamNDJSON } from "~/shared/utils";

export async function POST(event: APIEvent) {
  const body = (await event.request.json()) as APICompleteBody;

  const stream = streamNDJSON(chat(body));


  // Return the response with the transformed stream
  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}
