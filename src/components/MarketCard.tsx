import { createEffect, createSignal, For, onMount, Show } from "solid-js";

import {
  BiRegularDownvote,
  BiRegularUpvote,
  BiSolidDownvote,
  BiSolidUpvote,
} from "solid-icons/bi";
import { db } from "~/client/database";
import { api_vote, markets, profile } from "~/client/utils";
import { calcAttributes, Color, noProb, numF, prob } from "~/shared/utils";
import CheckBoxItem from "./CheckboxItem";
import MarketImage from "./MarketImage";
import OptionItem from "./OptionItem";
import MarketSocialComp from "./MarketSocialComp";

export default function MarketCard(props: {
  marketId: string;
  queryAgain?: boolean;
}) {
  const [marketResponse, setMarketResponse] = createSignal<MarketResponse>();
  const m = () => {
    const m = marketResponse()?.data.markets.at(0);
    if (!m) return;
    return calcAttributes(m);
  };
  const m0 = () => markets().find((m) => m?.id == props.marketId);

  const market = () => m() ?? m0();

  onMount(async () => {
    if (!props.queryAgain) return;
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
        <a href={`/market/${props.marketId}`}>
          <div class="border border-neutral-800 h-full p-4  rounded group bg-neutral-900 no-scrollbar space-y-2 flex flex-col hover:bg-[#1b1a1a] cursor-pointer">
            <div class="flex items-center space-x-3 flex-none">
              <MarketImage src={m().image} size="sm" />
              <div class="font-bold text-white">{m().name}</div>
            </div>

            <div class=" flex-1 ">
              <div class="mt-1 mb-4 max-h-40 overflow-hidden relative">
                <div
                  class="absolute bottom-0 w-full h-40 
                bg-gradient-to-t 
                from-neutral-900 via-neutral-900/80
                group-hover:from-[#1b1a1a] group-hover:via-[#1b1a1a]/80
                 to-transparent 
                left-0"
                />
                <div class="text-neutral-300">{m().description}</div>
              </div>

              <Show
                when={m().options.length > 1}
                fallback={
                  <Show when={m().options.at(0)}>
                    {(o) => {
                      return (
                        <>
                          <div class="space-y-1">
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
                    <div class="text-sm text-neutral-400 mt-2">
                      and {m().options.length - 3} more
                    </div>
                  }
                </Show>
              </Show>
            </div>

            <div
              class="flex-none min-h-10"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <MarketSocialComp marketId={props.marketId} />
            </div>
          </div>
        </a>
      )}
    </Show>
  );
}
