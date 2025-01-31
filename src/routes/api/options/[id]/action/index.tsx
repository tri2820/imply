import { id } from "@instantdb/admin";
import type { APIEvent } from "@solidjs/start/server";
import { createAdminDb, getCookie, verifyJWT } from "~/server/utils";
import { buyShare, sellShare, triggerAddHistoryOption } from "~/shared/utils";

export async function POST(event: APIEvent) {
  const optionId = event.params.id;
  const body = await event.request.json();
  const action = body as BuySellAction;
  const profile_jwt = getCookie("profile_jwt");
  if (!profile_jwt)
    return new Response(null, { status: 401 /* Unauthorized */ });
  const payload = await verifyJWT(profile_jwt);
  if (!payload || !payload.profile_id || typeof payload.profile_id !== "string")
    return new Response(null, { status: 401 /* Unauthorized */ });

  if (!action || !action.type || !action.amount || !action.shareId)
    return new Response(null, { status: 400 /* BadRequest */ });

  const db = createAdminDb();

  const resp = await db.query({
    options: {
      $: {
        where: {
          id: optionId,
        },
      },
      shares: {},
    },
    holdings: {
      $: {
        where: {
          "profile.id": payload.profile_id,
          "share.id": body.shareId,
        },
      },
    },
    profiles: {
      $: {
        where: {
          id: payload.profile_id,
        },
      },
    },
  });

  const profile = resp.profiles?.at(0);
  const option = resp.options?.at(0);

  if (!profile || !option)
    return new Response(null, {
      status: 404,
    });

  const share = option.shares.find((s) => s.id == body.shareId);
  const otherShare = option.shares.find((s) => s.id != body.shareId);
  if (!share || !otherShare) {
    return new Response(null, {
      status: 404,
    });
  }

  let holding: Holding;
  const respHolding = resp.holdings.at(0);
  if (!respHolding) {
    // Useful for testing
    console.log("creating zero holding...");
    const holding_id = id();
    let update = {
      amount: 0,
      updated_at: new Date().toISOString(),
    };
    await db.transact([
      db.tx.holdings[holding_id].update(update).link({
        profile: profile.id,
        share: body.shareId,
      }),
    ]);

    // Avoid another query
    holding = {
      id: holding_id,
      ...update,
    };
  } else {
    holding = respHolding;
  }

  let action_result: ShareActionResult | undefined;
  if (action.type == "buy") {
    if (action.amount > profile.usd) {
      return new Response(null, {
        status: 400,
      });
    }

    action_result = buyShare(option.shares, share.id, action.amount);
    if (!action_result)
      return new Response(null, {
        status: 400,
      });
    console.log("update balance, holding and share reserves...");
    await db.transact([
      db.tx.profiles[profile.id].update({
        // balance
        usd: profile.usd - action.amount,
      }),
      // holding
      db.tx.holdings[holding.id].update({
        amount: holding.amount + action_result.shareOut,
        updated_at: new Date().toISOString(),
      }),
      // share reserves
      db.tx.shares[share.id].update({
        reserve: action_result.shareReserve_after,
      }),
      db.tx.shares[otherShare.id].update({
        reserve: action_result.otherShareReserve_after,
      }),
    ]);

    console.log("updated, bought!", {
      profile_id: profile.id,
      holding_id: holding.id,
      share_id: share.id,
      other_share_id: otherShare.id,
    });
  }

  if (action.type == "sell") {
    if (action.amount > holding.amount) {
      return new Response(null, {
        status: 400,
      });
    }

    action_result = sellShare(option.shares, share.id, action.amount);

    if (!action_result)
      return new Response(null, {
        status: 400,
      });

    console.log("update balance, holding and share reserves");
    await db.transact([
      db.tx.profiles[profile.id].update({
        // balance
        usd: profile.usd + action_result.usdOut,
      }),
      // holding
      db.tx.holdings[holding.id].update({
        amount: holding.amount - action.amount,
        updated_at: new Date().toISOString(),
      }),
      // share reserves
      db.tx.shares[share.id].update({
        reserve: action_result.shareReserve_after,
      }),
      db.tx.shares[otherShare.id].update({
        reserve: action_result.otherShareReserve_after,
      }),
    ]);

    console.log("updated, sold!", {
      profile_id: profile.id,
      holding_id: holding.id,
      share_id: share.id,
      other_share_id: otherShare.id,
    });
  }

  if (!action_result) return new Response(null, { status: 400 });

  // trigger api history__options
  await triggerAddHistoryOption(option.id);

  return new Response(JSON.stringify(action_result), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}
