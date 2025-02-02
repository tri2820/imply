import { createEffect, createSignal, Show } from "solid-js";

import {
  BiRegularDownvote,
  BiRegularUpvote,
  BiSolidDownvote,
  BiSolidUpvote,
} from "solid-icons/bi";
import { db } from "~/client/database";
import { api_vote, profile } from "~/client/utils";
import { numF } from "~/shared/utils";
import { InstantCoreDatabase } from "@instantdb/core";
import { AppSchema } from "../../instant.schema";

export default function MarketSocialComp(props: { marketId: string }) {
  const [marketResponse, setMarketResponse] =
    createSignal<MarketSocialQueryRespose>();
  const market = () => marketResponse()?.data.markets.at(0);
  const [vote, setVote] = createSignal<"upvote" | "downvote" | "neutral">(
    "neutral"
  );
  const [counted, setCounted] = createSignal<"upvote" | "downvote" | "neutral">(
    "neutral"
  );

  const num_downvote = () =>
    numF(
      (market()?.num_downvotes ?? 0) +
        (vote() == "downvote"
          ? counted() == "downvote"
            ? 0
            : 1
          : counted() == "downvote"
          ? -1
          : 0)
    );

  const num_upvote = () =>
    numF(
      (market()?.num_upvotes ?? 0) +
        (vote() == "upvote"
          ? counted() == "upvote"
            ? 0
            : 1
          : counted() == "upvote"
          ? -1
          : 0)
    );

  // We need to check if the user has liked this post before or not
  createEffect(async () => {
    const p = profile();
    if (!p) return;
    console.log("get votes for", p, props.marketId);
    const resp = await db.queryOnce({
      markets: {
        $: {
          where: {
            id: props.marketId,
          },
        },
        votes: {
          $: {
            where: {
              profile: p.id,
            },
          },
        },
      },
    });
    type Resp = typeof resp;

    setMarketResponse(resp);
    console.log("votes", resp);
    const vote = resp.data.markets.at(0)?.votes.at(0);
    setVote(vote ? (vote.isUpvote ? "upvote" : "downvote") : "neutral");
    if (vote) {
      setCounted(vote.isUpvote ? "upvote" : "downvote");
      setVote(vote.isUpvote ? "upvote" : "downvote");
    } else {
      setCounted("neutral");
      setVote("neutral");
    }
  });

  return (
    <Show when={market()}>
      {(m) => (
        <div class="flex items-center space-x-1">
          <div class="flex-1" />
          <button
            onClick={() => {
              console.log("vote", vote());
              if (vote() == "upvote") {
                setVote("neutral");
                api_vote(m().id, {
                  type: "remove",
                });
                return;
              }
              setVote("upvote");
              api_vote(m().id, {
                type: "upvote",
              });
            }}
          >
            <div
              data-active={vote() == "upvote"}
              class="flex space-x-0.5 text-neutral-600 active:text-orange-800 hover:bg-orange-400/20 px-2 py-1 hover:text-white rounded-full data-[active=true]:text-orange-400"
            >
              <div class="text-sm">{num_upvote()}</div>
              <Show
                when={vote() == "upvote"}
                fallback={<BiRegularUpvote class="w-5 h-5 " />}
              >
                <BiSolidUpvote class="w-5 h-5 " />
              </Show>
            </div>
          </button>

          <button
            onClick={() => {
              if (vote() == "downvote") {
                setVote("neutral");
                api_vote(m().id, {
                  type: "remove",
                });
                return;
              }

              setVote("downvote");
              api_vote(m().id, {
                type: "downvote",
              });
            }}
          >
            <div
              data-active={vote() == "downvote"}
              class="flex space-x-0.5 text-neutral-600 active:text-indigo-800 hover:bg-indigo-400/20 px-2 py-1 hover:text-white rounded-full data-[active=true]:text-indigo-400"
            >
              <div class="text-sm">{num_downvote()}</div>
              <Show
                when={vote() == "downvote"}
                fallback={<BiRegularDownvote class="w-5 h-5 " />}
              >
                <BiSolidDownvote class="w-5 h-5 " />
              </Show>
            </div>
          </button>
        </div>
      )}
    </Show>
  );
}
