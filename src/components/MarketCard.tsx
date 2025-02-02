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

          <div class="pt-2 ">
            <MarketSocialComp marketId={props.marketId} />
          </div>
        </div>
      )}
    </Show>
  );
}
