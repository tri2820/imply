import { id } from "@instantdb/admin";
import type { APIEvent } from "@solidjs/start/server";

import { createAdminDb } from "~/server/utils";
import { yesProb } from "~/shared/utils";

export async function POST(event: APIEvent) {
  const option_id = event.params.id;
  const db = createAdminDb();

  console.log("new history record for option", option_id);

  const resp = await db.query({
    options: {
      $: {
        where: {
          id: option_id,
        },
      },
      shares: {},
    },
  });

  const option = resp.options.at(0);

  if (!option) {
    return new Response(null, {
      status: 404,
    });
  }

  const yP = yesProb(option.shares);

  if (!yP) {
    return new Response(null, {
      status: 500,
    });
  }

  await db.transact([
    db.tx.history__options[id()].update({
      option_id: option_id,
      created_at: new Date().toISOString(),
      yesProb: yP,
    }),
  ]);

  console.log("created history record for option", option_id);

  return new Response(null, {
    status: 200,
  });
}
