import type { APIEvent } from "@solidjs/start/server";
import { stringifyMultiJsonStream } from "json-stream-es";
import { chatTask } from "~/server/utils";
import { streamNDJSON } from "~/shared/utils";

export async function POST(event: APIEvent) {
  const body = (await event.request.json()) as APICompleteBody;
  const stream = streamNDJSON(async (controller) => {
    await chatTask({
      body,
      send: (msg) => controller.enqueue(msg),
    });

    controller.close();
  });
  // Return the response with the transformed stream
  return new Response(stream, {
    headers: {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
    },
  });
}
