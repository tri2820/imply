import { BuySellProps, HoldingSubscription, YesOrNo } from "~/utils";
import BuyComp from "./BuyComp";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { optionId, profile, setOptionId, setType } from "~/client/utils";
import SellComp from "./SellComp";
import { useSearchParams } from "@solidjs/router";
import { db } from "~/client/database";

export default function BuySellComp(props: BuySellProps) {
  const option = () => props.market.options.find((o) => o.id == optionId());
  const [mode, setMode] = createSignal<"buy" | "sell">("buy");
  const [holdingSubscription, setHoldingSubscription] =
    createSignal<HoldingSubscription>();
  const numShares = () => {
    const s = holdingSubscription();

    if (!s || !s.data) return {};
    let result: { [type: string]: number } = {};
    s.data.holdings.forEach((h) => {
      const type = h.share?.type;
      if (!type) return;
      result[type] = h.amount;
    });

    return result;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  onMount(() => {
    if (searchParams.optionId) {
      setOptionId(searchParams.optionId as string);
      return;
    }

    const firstOption = props.market.options.at(0);
    if (firstOption) {
      setOptionId(firstOption.id);
      return;
    }

    setOptionId();
  });

  onMount(() => {
    if (searchParams.shareId) {
      const share = option()?.shares.find((s) => s.id == searchParams.shareId);
      if (share) {
        if (["yes", "no"].includes(share.type)) {
          setType(share.type as YesOrNo);
        }
      }
      return;
    }
  });

  createEffect(() => {
    const p = profile();
    const o = option();
    if (!p || !o) return;
    const shareIds = o.shares.map((s) => s.id);

    const unsub = db.subscribeQuery(
      {
        holdings: {
          $: {
            where: {
              "profile.id": p.id,
              "share.id": {
                $in: shareIds,
              },
            },
          },
          share: {},
        },
      },
      (resp) => {
        console.log("resp holdings for this option", resp);
        setHoldingSubscription(resp);
      }
    );
    onCleanup(() => {
      unsub();
    });
  });

  return (
    <div class="w-full lg:w-96">
      <Show
        when={mode() == "buy"}
        fallback={
          <div class="animate-fade-in">
            <SellComp market={props.market} />
          </div>
        }
      >
        <div class="animate-fade-in">
          <BuyComp market={props.market} />
        </div>
      </Show>

      <div class="text-xs text-center px-8 text-neutral-400 mt-4">
        You are having {(numShares().yes || 0).toFixed(2)} Yes shares and{" "}
        {(numShares().no || 0).toFixed(2)} No shares.
        <br />
        Click{" "}
        <button
          onClick={() => setMode((m) => (m == "buy" ? "sell" : "buy"))}
          class="underline decoration-dashed hover:decoration-solid"
        >
          here
        </button>{" "}
        to {mode() == "buy" ? "sell" : "buy"}.
      </div>
    </div>
  );
}
