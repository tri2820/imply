import { createEffect, createSignal, For, onMount, Show } from "solid-js";

import {
  BiRegularDownvote,
  BiRegularUpvote,
  BiSolidDownvote,
  BiSolidUpvote,
} from "solid-icons/bi";
import { db } from "~/client/database";
import { api_vote, markets, profile } from "~/client/utils";
import {
  calcAttributes,
  Color,
  dateF,
  dateF_dmy,
  noProb,
  numF,
  prob,
} from "~/shared/utils";
import CheckBoxItem from "./CheckboxItem";
import MarketImage from "./MarketImage";
import OptionItem from "./OptionItem";
import MarketSocialComp from "./MarketSocialComp";
import Options from "./Options";

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
  const [pickedOptionId, setPickedOptionId] = createSignal<
    string | undefined
  >();
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

  const optionClicked = (optionId?: string, shareId?: string) => {
    setPickedOptionId(optionId);
    // const url = new URL(`/market/${props.marketId}`, window.location.origin);
    // if (optionId) url.searchParams.set("optionId", optionId);
    // if (shareId) url.searchParams.set("shareId", shareId);
    // // Push the new state to the browser history
    // window.history.pushState({}, "", url.toString());
    // window.location.href = url.toString();
  };

  return (
    <Show when={market()}>
      {(m) => (
        <div>
          <a href={`/market/${m().id}`}>
            <div>
              <div class="h-full p-4  rounded-2xl bg-neutral-900 no-scrollbar space-y-2 flex flex-col parent cursor-pointer">
                <div class="flex items-center space-x-3 flex-none">
                  <MarketImage src={m().image} size="sm" />
                  <div class="text-xl font-nunito font-black text-white">
                    {m().name}
                  </div>
                </div>

                <div class=" flex-1 ">
                  <div class="mt-1 mb-4 max-h-40 overflow-hidden relative">
                    <div
                      class="absolute bottom-0 w-full h-10 togetherWithParent
                bg-gradient-to-t 
                from-neutral-900 via-neutral-900/80
                
                left-0"
                    />
                    <div class="text-neutral-300">{m().description}</div>
                  </div>

                  <div class="ignoreHover">
                    <Options m={m()} />
                  </div>
                </div>

                <div
                  class="ignoreHover "
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                >
                  <MarketSocialComp marketId={props.marketId} />
                </div>
              </div>
            </div>
          </a>
        </div>
      )}
    </Show>
  );
}
