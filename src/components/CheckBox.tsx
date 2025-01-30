import { BsCheck } from "solid-icons/bs";
import { Show } from "solid-js";

export default function CheckBox<T>(props: {
  signal?: T;
  value?: T;
  onChange?: (value?: T) => void;
  checked?: boolean;
}) {
  const checked = () => props.checked ?? props.value == props.signal;

  return (
    <div
      onClick={(e) => {
        props.onChange?.(props.value);
      }}
      class="cursor-pointer relative border border-neutral-800 rounded p-1 w-6 h-6 group-hover:border-neutral-500 transition-all hover:bg-white/10"
    >
      <Show when={checked()}>
        <BsCheck class="text-white w-6 h-6 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      </Show>
      <input type="checkbox" class="checkbox-no-style" checked={checked()} />
    </div>
  );
}
