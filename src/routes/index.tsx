import { Show } from "solid-js";
import { userChatted } from "~/client/utils";
import AIComp from "../components/AIComp";
import Markets from "../components/Markets";

export default function Home() {
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
