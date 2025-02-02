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
  const [dbvote, setDBVote] = createSignal<1 | 0 | -1>(0);
  const [vote, setVote] = createSignal<1 | 0 | -1>(0);

  const num_votes = () => {
    const n = market()?.num_votes ?? 0;
    const diff = dbvote() - vote();
    return numF(n - diff);
  };

  // We need to check if the user has liked this post before or not
  createEffect(async () => {
    const p = profile();
    if (!p) return;
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

    setMarketResponse(resp);
    const vote = resp.data.markets.at(0)?.votes.at(0);
    // At the start, theey are all the same
    if (vote) {
      setDBVote(vote.isUpvote ? 1 : -1);
      setVote(vote.isUpvote ? 1 : -1);
    } else {
      setDBVote(0);
      setVote(0);
    }
  });

  return (
    <Show when={market()}>
      {(m) => (
        <div class="flex items-center space-x-1">
          <div class="flex-1" />
          <div class="bg-neutral-800 flex items-center flex-none rounded-full">
            <button
              onClick={() => {
                console.log("vote", vote());
                if (vote() == 1) {
                  setVote(0);
                  api_vote(m().id, {
                    type: "remove",
                  });
                  return;
                }

                setVote(1);
                api_vote(m().id, {
                  type: "upvote",
                });
              }}
            >
              <div
                data-active={vote() == 1}
                class="text-neutral-600 active:text-orange-800 hover:bg-orange-400/20 px-2 py-2 hover:text-white rounded-full data-[active=true]:text-orange-400"
              >
                <Show
                  when={vote() == 1}
                  fallback={<BiRegularUpvote class="w-5 h-5 " />}
                >
                  <BiSolidUpvote class="w-5 h-5 " />
                </Show>
              </div>
            </button>

            <div class="w-6 text-center ">
              <div class="text-sm font-bold">{num_votes()}</div>
            </div>

            <button
              onClick={() => {
                if (vote() == -1) {
                  setVote(0);
                  api_vote(m().id, {
                    type: "remove",
                  });
                  return;
                }

                setVote(-1);
                api_vote(m().id, {
                  type: "downvote",
                });
              }}
            >
              <div
                data-active={vote() == -1}
                class="text-neutral-600 active:text-indigo-800 hover:bg-indigo-400/20 px-2 py-2 hover:text-white rounded-full data-[active=true]:text-indigo-400"
              >
                <Show
                  when={vote() == -1}
                  fallback={<BiRegularDownvote class="w-5 h-5 " />}
                >
                  <BiSolidDownvote class="w-5 h-5 " />
                </Show>
              </div>
            </button>
          </div>
        </div>
      )}
    </Show>
  );
}
