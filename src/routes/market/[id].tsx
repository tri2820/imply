import { useParams } from "@solidjs/router";
import { BsInfoCircle } from "solid-icons/bs";
import { createEffect, For, onCleanup, onMount, Show } from "solid-js";
import { db } from "~/client/database";
import {
  market,
  optionId,
  profile,
  setHistoryOptionSubscription,
  setMarketSubscription,
  setOptionId,
} from "~/client/utils";
import BuySellComp from "~/components/BuySellComp";
import MarketImage from "~/components/MarketImage";
import MarketSocialComp from "~/components/MarketSocialComp";
import MarketChart from "~/components/MartketChart";
import OptionImage from "~/components/OptionImage";
import { dateF_dmy, dateF_h, prob, probToPercent } from "~/shared/utils";

export default function MarketPage() {
  const params = useParams();

  onMount(async () => {
    const unsub = db.subscribeQuery(
      {
        markets: {
          $: {
            where: {
              id: params.id,
            },
          },
          options: {
            shares: {},
          },
        },
      },
      (resp) => {
        console.log("market sub resp", resp);
        setMarketSubscription(resp);
      }
    );

    onCleanup(() => {
      unsub();
    });
  });

  createEffect(() => {
    const optionIds = market()?.options.map((o) => o.id);
    if (!optionIds || optionIds.length == 0) return;

    const unsub = db.subscribeQuery(
      {
        history__options: {
          $: {
            limit: 1000,
            order: {
              serverCreatedAt: "desc",
            },
            where: {
              option_id: {
                $in: optionIds,
              },
            },
          },
        },
      },
      (resp) => {
        console.log("share history sub resp", resp);
        setHistoryOptionSubscription(resp);
      }
    );

    onCleanup(() => {
      unsub();
    });
  });

  return (
    <Show when={market()}>
      {(m) => (
        <main class="max-w-6xl mx-auto">
          <div class=" flex flex-col  lg:flex-row lg:items-start items-stretch lg:space-x-2">
            <div class="flex-1 overflow-hidden">
              <div class="flex items-center space-x-8  px-4 py-4">
                <MarketImage src={m().image} />
                <h1 class="text-3xl font-bold">{m().name}</h1>
              </div>

              <MarketChart />

              <MarketSocialComp marketId={params.id} />

              <div class="flex items-start space-x-2 py-2 text-sm text-neutral-500 px-4 ">
                <BsInfoCircle class="w-3 h-3 mt-1" />
                <div>
                  <div>
                    AI will resolve this market at: {dateF_dmy(m().resolve_at)}
                  </div>
                  <div>
                    Stop trading at: {dateF_dmy(m().stop_trading_at)} (
                    {dateF_h(m().stop_trading_at)})
                  </div>
                </div>
              </div>

              <div class="px-4 py-2 space-y-2">
                <div>
                  <div class="text-xl font-bold">Description</div>
                  <div>{m().description}</div>
                </div>
                <div>
                  <div class="text-xl font-bold">Rule</div>
                  <div>{m().rule}</div>
                </div>
              </div>

              <Show when={m().options.length > 1}>
                <div class="max-h-72 overflow-y-auto no-scrollbar py-4 lg:px-4 ">
                  <For each={m().options}>
                    {(o) => (
                      <div
                        data-selected={o.id == optionId()}
                        class="flex items-center space-x-8 hover:bg-white/5 data-[selected=true]:bg-white/5 transition-all p-2 cursor-pointer"
                        onClick={() => setOptionId(o.id)}
                      >
                        <OptionImage />
                        <div class="font-bold w-1/3 overflow-x-hidden line-clamp-1">
                          {o.name}
                        </div>
                        <div>{probToPercent(prob(o))}</div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class="flex-none py-4">
              <BuySellComp market={m()} />
            </div>
          </div>
        </main>
      )}
    </Show>
  );
}
