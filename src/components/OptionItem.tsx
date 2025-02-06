import { FaSolidChevronRight, FaSolidMinus, FaSolidPlus } from "solid-icons/fa";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import { lottie } from "~/client/lottie";
import { Color, colorClasses, probToPercent } from "~/shared/utils";
import Gem from "./Gem";
import { BsPlusLg } from "solid-icons/bs";

export default function OptionItem(props: {
  id: string;
  label: string;
  prob?: number;
  color: Color;
  pickedOptionId: string | undefined;
  onClick?: (id: string) => void;
}) {
  const pickedSomething = () => props.pickedOptionId !== undefined;
  const picked = () => props.id === props.pickedOptionId;
  const colorClass = () => colorClasses.background[props.color];
  const p = () =>
    (props.prob ?? 0) +
    (picked()
      ? // A noticable difference
        0.007
      : 0);
  const [particleRef, setParticleRef] = createSignal<HTMLDivElement>();

  createEffect(() => {
    const container = particleRef();

    if (!container) return;
    lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: "/animation/particle.json",
    });
  });
  const [timeOutNotHovered, setTimeOutNotHovered] =
    createSignal<ReturnType<typeof setTimeout>>();
  const [hovered, setHovered] = createSignal(false);
  const [numGem, setNumGem] = createSignal(20);
  return (
    <div
      class="flex items-center"
      onMouseMove={() => {
        const maybeT = timeOutNotHovered();
        clearTimeout(maybeT);
        setHovered(true);
      }}
      onMouseEnter={() => {
        const maybeT = timeOutNotHovered();
        clearTimeout(maybeT);
        setHovered(true);
      }}
      onMouseLeave={() => {
        const t = setTimeout(() => {
          setHovered(false);
        }, 1000);
        setTimeOutNotHovered(t);
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div class="relative flex-1 ">
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setHovered(true);
            props.onClick?.(props.id);
          }}
          class="group relative p-2 flex items-center space-x-2 border rounded-full overflow-hidden border-neutral-800 bg-white/5 flex-1 cursor-pointer h-12 select-none"
        >
          <div
            data-checked={picked()}
            class={
              "absolute top-0 left-0 h-full  transition-all " + colorClass()
            }
            style={{
              width: probToPercent(p()),
            }}
          />

          <div class="flex items-center space-x-2 flex-1 z-10 text-sm">
            <div class="flex-1 line-clamp-1 font-black font-nunito">
              {props.label}
            </div>
          </div>

          <Show when={!picked()}>
            <div
              class="absolute group-hover:visible invisible transition-all z-50 "
              style={{
                left: `calc(${probToPercent(p())} + 4px)`,
              }}
            >
              <FaSolidChevronRight
                class="w-4 h-4 
            bouncing-element"
              />
            </div>
          </Show>
        </div>

        <div class="absolute right-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <Show when={picked()}>
            <div class="text-sm text-white font-black font-nunito">VOTED</div>
          </Show>
        </div>
      </div>

      <Show when={picked()}>
        <div
          data-hovered={hovered()}
          class="flex items-center space-x-1 data-[hovered=true]:pl-2 relative"
        >
          <div
            ref={setParticleRef}
            class="absolute top-1/2 left-1/2 w-[400px] h-[400px] -translate-x-[160px] pointer-events-none  -translate-y-1/2"
          />
          <button
            onClick={() => {
              setNumGem(Math.max(numGem() - 20, 20));
            }}
            data-hovered={hovered()}
            class="rounded-full data-[hovered=true]:p-2 hover:bg-neutral-800 w-[0px] data-[hovered=true]:w-auto overflow-hidden transition-all"
          >
            <FaSolidMinus class="w-4 h-4 " />
          </button>
          <button
            onClick={() => {
              setNumGem(numGem() + 20);
            }}
            data-hovered={hovered()}
            class="rounded-full data-[hovered=true]:p-2 hover:bg-neutral-800 w-[0px] data-[hovered=true]:w-auto overflow-hidden transition-all"
          >
            <FaSolidPlus class="w-4 h-4 " />
          </button>
          <div class="font-extrabold">{numGem()}</div>
          <Gem />
        </div>
      </Show>
    </div>
  );
}
