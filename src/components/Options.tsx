import { Accessor, createSignal, For, Show } from "solid-js";
import OptionItem from "./OptionItem";
import { calcAttributes, Color, noProb, prob } from "~/shared/utils";

export default function Options(props: {
  m: ReturnType<typeof calcAttributes>;
}) {
  const [pickedOptionId, setPickedOptionId] = createSignal<
    string | undefined
  >();

  function optionClicked(optionId?: string, shareId?: string) {
    setPickedOptionId(optionId);
  }

  const [showFull, setShowFull] = createSignal(false);

  return (
    <Show
      when={props.m.options.length > 1}
      fallback={
        <Show when={props.m.options.at(0)}>
          {(o) => {
            return (
              <>
                <div class="space-y-1">
                  <OptionItem
                    pickedOptionId={pickedOptionId()}
                    color={Color.Blue500}
                    label={"Yes"}
                    id={"yes"}
                    prob={o().yesProb}
                    onClick={optionClicked}
                  />
                  <OptionItem
                    pickedOptionId={pickedOptionId()}
                    color={Color.Red500}
                    label={"No"}
                    id={"no"}
                    prob={noProb(o().yesProb)}
                    onClick={optionClicked}
                  />
                </div>
              </>
            );
          }}
        </Show>
      }
    >
      <div class="space-y-1">
        <For each={props.m.options.slice(0, showFull() ? undefined : 3)}>
          {(o, i) => (
            <div>
              <OptionItem
                pickedOptionId={pickedOptionId()}
                color={o.color as Color}
                label={o.name}
                id={o.id}
                prob={prob(o)}
                onClick={optionClicked}
              />
            </div>
          )}
        </For>
      </div>

      <Show when={props.m.options.length > 3 && !showFull()}>
        {
          <button
            onClick={() => setShowFull(true)}
            class="text-sm text-neutral-400 mt-2 hover:text-white "
          >
            and {props.m.options.length - 3} others
          </button>
        }
      </Show>
    </Show>
  );
}
