import { useParams } from "@solidjs/router";
import { BsInfoCircle } from "solid-icons/bs";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
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
import OptionItem from "~/components/OptionItem";
import Options from "~/components/Options";
import { Color, dateF_dmy, dateF_h, prob, probToPercent } from "~/shared/utils";

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

  const [pickedOptionId, setPickedOptionId] = createSignal<string>();
  function optionClicked() {}

  return (
    <Show when={market()}>
      {(m) => (
        <main class="max-w-6xl mx-auto ">
          <div class="flex-1 overflow-hidden space-y-4 py-8">
            <div class="flex items-center space-x-6  px-4 ">
              <MarketImage src={m().image} />
              <h1 class="text-3xl font-bold">{m().name}</h1>
            </div>

            {/* <MarketChart /> */}

            <div class="px-4 space-y-1">
              <Options m={m()} />
            </div>

            <div class="px-4">
              <MarketSocialComp marketId={params.id} />
            </div>

            <div class="px-4 space-y-2">
              <div class="space-y-2">
                <div class="text-xl font-bold">Description</div>
                <div class="text-neutral-400">{m().description}</div>
              </div>
              <div class="space-y-2">
                <div class="text-xl font-bold">Rule</div>
                <div class="text-neutral-400">{m().rule}</div>
              </div>
            </div>
          </div>
        </main>
      )}
    </Show>
  );
}
