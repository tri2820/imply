import { createSignal, For, onMount, Show } from "solid-js";

import {
  BiRegularDownvote,
  BiRegularUpvote,
  BiSolidDownvote,
  BiSolidUpvote,
} from "solid-icons/bi";
import { db } from "~/client/database";
import { api_vote, markets } from "~/client/utils";
import { calcAttributes, Color, noProb, prob } from "~/shared/utils";
import CheckBoxItem from "./CheckboxItem";
import MarketImage from "./MarketImage";
import OptionItem from "./OptionItem";

export default function MarketCard(props: {
  marketId?: string;
  queryAgain?: boolean;
}) {
  const [vote, setVote] = createSignal<"upvote" | "downvote" | "neutral">(
    "neutral"
  );
  const [marketResponse, setMarketResponse] = createSignal<MarketResponse>();
  const m = () => {
    const m = marketResponse()?.data.markets.at(0);
    if (!m) return;
    return calcAttributes(m);
  };
  const m0 = () => markets().find((m) => m?.id == props.marketId);

  const market = () => m() ?? m0();

  onMount(async () => {
    if (!props.queryAgain || !props.marketId) return;
    const resp = await db.queryOnce({
      markets: {
        options: {
          shares: {},
        },
        $: {
          where: {
            id: props.marketId,
          },
        },
      },
    });
    setMarketResponse(resp);
  });

  const redirectToMarket = (optionId?: string, shareId?: string) => {
    const url = new URL(`/market/${props.marketId}`, window.location.origin);
    if (optionId) url.searchParams.set("optionId", optionId);
    if (shareId) url.searchParams.set("shareId", shareId);
    // Push the new state to the browser history
    window.history.pushState({}, "", url.toString());
    window.location.href = url.toString();
  };

  return (
    <Show when={market()}>
      {(m) => (
        <div class="border border-neutral-800 p-4 rounded bg-neutral-900 no-scrollbar space-y-2 flex flex-col">
          <div class="flex items-center space-x-3">
            <MarketImage size="sm" />
            <a href={`/market/${props.marketId}`} class="font-bold">
              {m().name}
            </a>
          </div>

          <Show
            when={m().options.length > 1}
            fallback={
              <Show when={m().options.at(0)}>
                {(o) => {
                  return (
                    <>
                      <div class=" flex-1 space-y-1">
                        <CheckBoxItem
                          label="Yes"
                          prob={o().yesProb}
                          id="yes"
                          hideCheckBox
                          onChange={() => {
                            const yesShare = o().shares.find(
                              (s) => s.type == "yes"
                            );
                            redirectToMarket(o().id, yesShare?.id);
                          }}
                        />
                        <CheckBoxItem
                          label="No"
                          prob={noProb(o().yesProb)}
                          id="no"
                          hideCheckBox
                          onChange={() => {
                            const noShare = o().shares.find(
                              (s) => s.type == "no"
                            );
                            redirectToMarket(o().id, noShare?.id);
                          }}
                        />
                      </div>
                      {/* <div class="flex flex-col items-stretch">
                        <button
                          onClick={() => {
                            redirectToMarket();
                          }}
                          class="bg-[#360ccc]/80 hover:bg-[#360ccc] px-4 py-2 rounded"
                        >
                          Predict
                        </button>
                      </div> */}
                    </>
                  );
                }}
              </Show>
            }
          >
            <div class="space-y-1">
              <For each={m().options.slice(0, 3)}>
                {(o, i) => (
                  <div>
                    <OptionItem
                      color={o.color as Color}
                      label={o.name}
                      id={o.id}
                      prob={prob(o)}
                      onClick={redirectToMarket}
                    />
                  </div>
                )}
              </For>
            </div>

            <Show when={m().options.length > 3}>
              {
                <div class="text-sm text-neutral-400">
                  and {m().options.length - 3} more
                </div>
              }
            </Show>
          </Show>

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
                <div class="text-sm">{m().num_upvotes ?? 0}</div>
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
                <div class="text-sm">{m().num_downvotes ?? 0}</div>
                <Show
                  when={vote() == "downvote"}
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
