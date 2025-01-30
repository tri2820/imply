import { Show } from "solid-js";
import { probToPercent } from "~/shared/utils";
import CheckBox from "./CheckBox";

export default function CheckBoxItem(props: {
  label: string;
  price?: number;
  prob: number | undefined;
  id: YesOrNo;
  value?: YesOrNo;
  hideCheckBox?: boolean;
  onChange?: (value: YesOrNo) => void;
}) {
  const checked = () => props.value === props.id;
  const colorClass = () =>
    ({
      yes: `bg-blue-500/20 group-hover:bg-blue-500/40 data-[checked=true]:bg-blue-500/40`,
      no: `bg-red-500/20 group-hover:bg-red-500/40 data-[checked=true]:bg-red-500/40`,
    }[props.id]);

  return (
    <div
      onClick={() => {
        props.onChange?.(props.id);
      }}
      class="group relative p-4 flex items-center space-x-2 border rounded border-neutral-800 bg-white/5 flex-1 cursor-pointer "
    >
      <div
        data-checked={checked()}
        class={"absolute top-0 left-0 h-full  transition " + colorClass()}
        style={{
          width: props.prob ? `${props.prob * 100}%` : 0,
        }}
      />
      <div class="flex items-center space-x-2 flex-1 z-10">
        <div>{props.label}</div>
        <Show
          when={props.price === undefined}
          fallback={
            <div>{props.price ? `$${props.price.toFixed(2)}` : "N/A"}</div>
          }
        >
          <Show when={props.prob !== undefined}>
            <div>{probToPercent(props.prob)}</div>
          </Show>
        </Show>
      </div>

      <Show when={!props.hideCheckBox}>
        <CheckBox checked={checked()} />
      </Show>
    </div>
  );
}
