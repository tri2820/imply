import { onCleanup, onMount, Show } from "solid-js";
import { setProfileSubscription, userChatted } from "~/client/utils";
import AIComp from "../components/AIComp";
import Markets from "../components/Markets";
import { db } from "~/client/database";

export default function Home() {
  function subscribeProfile(profile_id: string) {
    return db.subscribeQuery(
      {
        profiles: {
          $: {
            where: {
              id: profile_id,
            },
          },
          holdings: {
            share: {
              // get the type
            },
          },
        },
      },
      (resp) => {
        console.log("profile sub resp", resp);
        setProfileSubscription(resp);
      }
    );
  }

  onMount(async () => {
    let unsub: Function;
    onCleanup(() => {
      unsub?.();
    });

    try {
      const resp = await fetch("/api/profiles/jwt", {
        method: "GET",
      });
      console.log("profile_jwt resp", resp);
      if (!resp.ok) throw new Error("fetch profile_jwt failed");
      const json: JWTResult = await resp.json();
      console.log("profile", json);
      unsub = subscribeProfile(json.profile_id);
    } catch (e) {
      console.error("error fetch profiles key", e);
    }
  });

  return (
    <div
      class="
     flex-1 flex flex-col items-stretch lg:items-center 
     
    "
      data-chatted={userChatted()}
    >
      {/* <div class="bg-neutral-800">
        <Show when={!userChatted()}>
          <InfiniteScroll />
        </Show>
      </div> */}

      <div
        class="px-4 data-[chatted=false]:py-8 w-full data-[chatted=true]:flex-1 flex flex-col "
        data-chatted={userChatted()}
      >
        <Show when={!userChatted()}>
          <div class="h-[calc(20vh)]" />
        </Show>
        <AIComp />
      </div>

      <Show when={!userChatted()}>
        <Markets />
      </Show>
    </div>
  );
}
