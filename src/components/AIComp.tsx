import { id } from "@instantdb/core";

import { BsArrowUpShort, BsStopFill } from "solid-icons/bs";
import { createSignal, For, onMount, Show } from "solid-js";
import {
  abortController,
  blocks,
  blocksToList,
  listBlocks,
  profile,
  scrollToEnd,
  setAbortController,
  setBigLogoEl,
  setBlocks,
  userChatted,
} from "~/client/utils";

import { accept } from "~/client/accept";
import { db } from "~/client/database";
import BlockComp from "./BlockComp";
import IconComp from "./IconComp";
import Spinner from "./Spinner";
import { generateBlocks, readNDJSON } from "~/shared/utils";

export default function AIComp() {
  const [text, setText] = createSignal("");

  async function submit() {
    const ac = abortController();
    if (ac) {
      ac.abort();
    }

    const t = text().trim();
    if (!t) return;

    scrollToEnd();
    setText("");

    const userBlock: Block = {
      agent_step: undefined,
      id: id(),
      role: "user",
      content: t,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Log the user's message
    db.transact([
      db.tx.blocks[userBlock.id].update(userBlock).link({
        profile: profile()?.id,
      }),
    ]);

    const blocks_1 = {
      ...blocks(),
      [userBlock.id]: userBlock,
    };
    setBlocks(blocks_1);

    const onlyAssistantOrUser = blocksToList(blocks_1).filter(
      (b) => b.role == "user" || b.role == "assistant"
    );

    let history = [];
    let remainingLength = 1000;

    for (let i = onlyAssistantOrUser.length - 1; i >= 0; i--) {
      const { content } = onlyAssistantOrUser[i];

      if (content.length > remainingLength) {
        // Add only the part of the content that fits
        history.push({
          ...onlyAssistantOrUser[i],
          content: content.slice(0, remainingLength),
        });
        break;
      }

      // Add the full content if it fits
      history.push(onlyAssistantOrUser[i]);
      remainingLength -= content.length;
    }

    history = history.toReversed();

    const controller = new AbortController();
    const { signal } = controller;
    signal.addEventListener("abort", () => {
      console.log("aborted!");
    });
    setAbortController(controller);

    const resp = await fetch("/api/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ blocks: history } as APICompleteBody),
      signal,
    });

    if (!resp.body) return;
    const g = readNDJSON(resp.body);

    for await (const value of g) {
      const y = value as any as ChatStreamYield;
      accept(y);
    }

    setAbortController(undefined);
  }

  // onMount(() => {
  //   setBlocks(generateBlocks());
  // });

  return (
    <div class="flex-1 w-full flex flex-col items-stretch ">
      <main class="flex-1  flex flex-col mx-auto lg:max-w-3xl w-full relative">
        <div class="flex-1  flex flex-col z-10">
          <Show
            when={userChatted()}
            fallback={
              <div class="flex-1 flex items-end pb-8" ref={setBigLogoEl}>
                <div class="flex items-center justify-center">
                  <div class="space-y-4">
                    <div class="flex items-center space-x-4">
                      <IconComp size="lg" />
                      <h1 class="font-bold text-4xl md:text-5xl font-lexend leading-none ">
                        Predict Anything
                      </h1>
                    </div>

                    <div>
                      <span class="avoidwrap">
                        We will tell how accurate your prediction is.
                      </span>{" "}
                      <span class="avoidwrap">
                        If no data is available, a prediction market will be
                        created to gather insights from the crowd.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <div class="py-4 px-2">
              <For each={listBlocks()}>
                {(b) => <BlockComp blockId={b.id} />}
              </For>
              <Show when={abortController()}>
                <Spinner size="sm" />
              </Show>
            </div>
          </Show>
        </div>

        <div class=" sticky bottom-0 py-4 z-20">
          <div class="flex items-start border-2 bg-neutral-800 border-neutral-800 hover rounded-3xl focus-within:border-neutral-500">
            <textarea
              value={text()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              onInput={(e) => setText(e.currentTarget.value)}
              class="flex-1 px-4 py-3 resize-none bg-transparent h-24 outline-none placeholder:text-neutral-500 z-50"
              placeholder="My prediction is..."
            />

            <Show
              when={abortController()}
              fallback={
                <button
                  onClick={submit}
                  class="p-1 bg-white rounded-full text-black mr-2 mt-2 hover:opacity-50"
                >
                  <BsArrowUpShort class="w-8 h-8" />
                </button>
              }
            >
              {(ac) => (
                <button
                  disabled={ac() ? true : false}
                  onClick={() => {
                    // https://github.com/solidjs/solid-start/issues/1753
                    // ac().abort();
                    // setAbortController(undefined);
                  }}
                  class="p-1 bg-white rounded-full text-black mr-2 mt-2 hover:opacity-50"
                >
                  {/* <BsStopFill class="w-8 h-8" /> */}
                  <Spinner size="sm" />
                </button>
              )}
            </Show>
          </div>
        </div>
      </main>
    </div>
  );
}
