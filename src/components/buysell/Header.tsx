import { Accessor, Show } from "solid-js";
import OptionImage from "../OptionImage";
import MarketImage from "../MarketImage";

export default function Header(
  props: BuySellProps & {
    o: Accessor<{
      color: string;
      name: string;
    }>;
  }
) {
  return (
    <div class="flex items-start space-x-4">
      <Show
        when={props.market.options.length > 1}
        fallback={<MarketImage src={props.market.image} size="sm" />}
      >
        <OptionImage />
      </Show>
      <div>
        <div>{props.market.name}</div>
        <div class="flex items-center space-x-2">
          <div
            class="w-2 h-2 rounded-full flex-none"
            style={{ background: props.o().color }}
          />
          <div class="font-bold">
            {props.market.options.length == 1 ? "Yes" : props.o().name}
          </div>
        </div>
      </div>
    </div>
  );
}
