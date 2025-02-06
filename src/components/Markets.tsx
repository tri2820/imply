import { TbLoader } from "solid-icons/tb";
import { createEffect, For, onMount, Show } from "solid-js";
import {
  loadMarkets,
  loadMarketsState,
  markets,
  marketsHasNextPage,
  profile,
} from "~/client/utils";
import Spinner from "./Spinner";
import MarketCard from "./MarketCard";

export default function Markets() {
  onMount(async () => {
    loadMarkets();
  });

  return (
    <div class="p-4 w-full space-y-8 max-w-2xl mx-auto">
      <div class="space-y-2">
        <For each={markets()}>{(m) => <MarketCard marketId={m.id} />}</For>
      </div>

      <div class="flex flex-col items-center ">
        <Show when={marketsHasNextPage()}>
          <button
            class="bg-white/5 rounded-lg py-2 px-4 border border-neutral-800 hover:bg-white/10 transition-all"
            onClick={() => {
              loadMarkets();
            }}
          >
            Load More
          </button>
        </Show>

        <Show when={loadMarketsState() == "loading"}>
          <div class="mt-2">
            <Spinner />
          </div>
        </Show>
      </div>
    </div>
  );
}
