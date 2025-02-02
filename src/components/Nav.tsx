import { useLocation } from "@solidjs/router";
import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { bigLogoEl, profile } from "~/client/utils";
import ProfileImage from "./ProfileImage";
import { BsDiscord } from "solid-icons/bs";
import IconComp from "./IconComp";

export default function Nav() {
  const [showLogo, setShowLogo] = createSignal(false);
  const location = useLocation();
  const active = (path: string) =>
    path == location.pathname
      ? "border-white"
      : "border-transparent hover:border-white";

  createEffect(() => {
    const targetElement = bigLogoEl();
    if (!targetElement) return;

    // Define the callback function for the observer
    const observerCallback = (entries: any) => {
      entries.forEach((entry: any) => {
        if (entry.isIntersecting) {
          setShowLogo(false);
        } else {
          setShowLogo(true);
        }
      });
    };

    // Create an observer instance
    const observerOptions = {
      root: null, // Use the viewport as the container
      rootMargin: "0px", // Margin around the root
      threshold: 0.1, // Trigger when 10% of the element is visible
    };

    const observer = new IntersectionObserver(
      observerCallback,
      observerOptions
    );

    // Observe the target element
    observer.observe(targetElement);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  return (
    <div class=" sticky top-0 z-50 w-full ">
      <nav class="flex-none bg-neutral-900 border-b border-neutral-800">
        <div class="flex items-center space-x-2 px-4 py-1 h-14">
          {/* <ul class=" flex items-center py-4 px-2 text-white flex-1 ">
          <li class={`border-b-2 ${active("/")} mx-1.5 sm:mx-6`}>
            <a href="/">Predict</a>
          </li>
          <li class={`border-b-2 ${active("/markets")} mx-1.5 sm:mx-6`}>
            <a href="/markets">Markets</a>
          </li>
        </ul> */}

          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/";
            }}
          >
            <a href="/#" class="flex items-center space-x-2  transition-all">
              <img src="/name.svg" class="h-8" />
            </a>
          </button>
          <div class="flex-1" />

          <Show when={profile()}>
            {(p) => (
              <div
                onClick={() => {
                  window.location.href = `/profile/${p().id}`;
                }}
                class="flex-none flex items-center py-1 rounded px-2 space-x-4 text-white hover:bg-white/5 cursor-pointer border-transparent hover:border-neutral-800 border"
              >
                <div class="text-right">
                  <div class="text-sm">{p().name}</div>
                  <div class="  text-neutral-500 text-xs">
                    ${p().usd.toFixed(2)}
                  </div>
                </div>

                <ProfileImage />
              </div>
            )}
          </Show>

          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://discord.gg/yJt8WQNFeJ"
            class="text-neutral-500 hover:text-white transition-all"
          >
            <BsDiscord class="w-4 h-4" />
          </a>
        </div>
      </nav>
      {/* <div class="flex flex-col items-center bg-neutral-800">
        <div class="flex items-center ">
          <For
            each={[
              {
                id: "sport",
                name: "Sport",
              },
              {
                id: "politics",
                name: "Politics",
              },
              {
                id: "entertainment",
                name: "Entertainment",
              },
              {
                id: "technology",
                name: "Technology",
              },
              {
                id: "crypto",
                name: "Crypto",
              },
              {
                id: "economy",
                name: "Economy",
              },
            ]}
          >
            {(category) => (
              <a
                href={`/categories/${category.id}`}
                class="px-2 py-1 text-neutral-400 hover:text-white transition-all"
              >
                {category.name}
              </a>
            )}
          </For>
        </div>
      </div> */}
    </div>
  );
}
