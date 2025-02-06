import { createEffect, createSignal, onMount, Show } from "solid-js";
import lottie from "lottie-web";
import { BiRegularHeart, BiSolidHeart } from "solid-icons/bi";
import { db } from "~/client/database";
import { api_vote, profile } from "~/client/utils";
import { dateF_dmy, numF } from "~/shared/utils";
import { BsInfoCircle } from "solid-icons/bs";

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
    <div class="min-h-10">
      <Show when={market()}>
        {(m) => (
          <div class="flex items-center space-x-1">
            <button
              onClick={() => {
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
              class="bg-neutral-800 flex items-center flex-none rounded-full px-4 hover:bg-neutral-700 transition-all group"
            >
              <div class="text-center ">
                <div class="text-sm font-bold">{num_votes()}</div>
              </div>

              <div>
                <div class="text-neutral-600 pl-2 py-2 group-hover:text-white ">
                  <Show
                    when={vote() == 1}
                    fallback={<BiRegularHeart class="w-5 h-5 " />}
                  >
                    <BiSolidHeart class="w-5 h-5 text-red-500" />
                  </Show>
                </div>
              </div>
            </button>
            <div class="flex-1" />
            <div class="flex items-start space-x-2 py-2 text-sm text-neutral-500">
              <BsInfoCircle class="w-3 h-3 mt-1" />
              <div>
                <div>Gem collect at {dateF_dmy(m().resolve_at)}</div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
