import { createSignal, onMount, Show } from "solid-js";

export default function MaybeImage(props: {
  src: string;
  alt?: string;
  class: string;
}) {
  const [loaded, setLoaded] = createSignal(false);
  onMount(() => {
    const img = new Image();
    img.src = props.src;
    img.onload = () => setLoaded(true);
  });
  return (
    <Show
      when={loaded()}
      fallback={<div class={props.class + " bg-neutral-800 animate-pulse "} />}
    >
      <img src={props.src} alt={props.alt} class={props.class} />
    </Show>
  );
}
