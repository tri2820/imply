import { For, onMount } from "solid-js";
import { infiniteScrollHovered, news } from "~/client/utils";
import NewsItem from "./NewsItem";

export default function TranslatingGroup(props: { "aria-hidden"?: boolean }) {
  let ref!: HTMLDivElement;

  onMount(() => {
    const width = ref.getBoundingClientRect().width;
    const SPEED = 10;
    const second = Math.floor(width / SPEED);

    ref.style.animation = `translating ${second}s linear infinite`;
  });

  return (
    <div
      ref={ref}
      data-ihover={infiniteScrollHovered()}
      class="flex items-center group-hover:animate-paused"
    >
      <For each={news()}>
        {(n) => <NewsItem n={n} aria-hidden={props["aria-hidden"]} />}
      </For>
    </div>
  );
}
