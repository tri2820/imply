import { marked } from "marked";
import { BsChevronDown, BsChevronUp, BsTerminal } from "solid-icons/bs";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { listBlocks } from "~/client/utils";
import IconComp from "./IconComp";
import { ToolName } from "~/shared/tools";
import {
  CreateMarketToolProps,
  CreateMarketToolResult,
} from "~/shared/tools/createMarketFactory";
import {
  SearchNewsToolProps,
  SearchNewsToolResult,
} from "~/shared/tools/searchNewsFactory";
import MarketCard from "./MarketCard";

function AssistantBlockComp(props: { block: AssistantBlock }) {
  let ref!: HTMLDivElement;

  // Does not feel right yet
  // onMount(() => {
  //   const isLastBlock = listBlocks().at(-1)?.id === props.block.id;

  //   if (isLastBlock) {
  //     if (scrolledToBottom() === props.block.id) {
  //       scrollToEnd();
  //       return;
  //     }

  //     setScrolledToBottom(props.block.id);
  //   }
  // });

  // TODO: sanitize
  const html = () => marked.parse(props.block.content) as string;

  return (
    <div ref={ref} class="overflow-x-auto my-1">
      <div
        class="prose prose-invert prose-neutral max-w-none"
        innerHTML={html()}
      />
    </div>
  );
}

function UserBlockComp(props: { block: UserBlock }) {
  return (
    <div class="flex  w-full my-1 ">
      <div class="flex-1" />
      <div class="py-2 bg-neutral-800 px-4 rounded-lg max-w-80">
        <div class="text-lg">{props.block.content}</div>
      </div>
    </div>
  );
}

function ToolBlockBody_ArgumentsString(props: { block: ToolBlock }) {
  return (
    <div class="">
      <div class="py-2 flex items-stretch">
        <div class="flex-none mx-2 w-[2px] bg-neutral-800"></div>
        <div class="flex-1">{props.block.content.arguments_partial_str}</div>
      </div>
    </div>
  );
}

function ToolBlockBody_createMarket(props: {
  block: ToolBlock<CreateMarketToolProps, CreateMarketToolResult>;
}) {
  return (
    <Show
      when={props.block.content.result}
      fallback={<ToolBlockBody_ArgumentsString block={props.block} />}
    >
      {(result) => (
        <div class="mt-2">
          <MarketCard marketId={result().market_id} queryAgain />
        </div>
      )}
    </Show>
  );
}

function ToolBlockBody_searchNews(props: {
  block: ToolBlock<SearchNewsToolProps, SearchNewsToolResult>;
}) {
  const favicon = (url: string) =>
    `http://www.google.com/s2/favicons?domain=${url}&sz=128`;
  return (
    <Show
      when={props.block.content.result}
      fallback={<ToolBlockBody_ArgumentsString block={props.block} />}
    >
      <div class="flex items-stretch">
        <div class="flex-none mx-2 w-[2px] bg-neutral-800" />
        <div class="py-2 flex-1">
          <div class="text-sm text-neutral-400">
            Searched for "{props.block.content.arguments?.query}"
          </div>

          <Show when={props.block.content.result}>
            {(result) => (
              <Show
                when={result().length === 0}
                fallback={
                  <div class="flex items-center  mt-2">
                    <For each={result()}>
                      {(site) => (
                        <img src={favicon(site.origin)} class="w-4 h-4" />
                      )}
                    </For>
                  </div>
                }
              >
                <div>No results found.</div>
              </Show>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}

function ToolBlockComp(props: { block: ToolBlock }) {
  const [show, setShow] = createSignal(true);
  const body = {
    [ToolName.createMarket]: ToolBlockBody_createMarket,
    [ToolName.searchNews]: ToolBlockBody_searchNews,
  }[props.block.content.name];

  const doing = () => props.block.content.result === undefined;
  return (
    <div data-doing={doing()} class="my-1 data-[doing=true]:animate-pulse">
      <button
        onClick={() => {
          setShow((p) => !p);
        }}
        class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 flex items-center space-x-2"
      >
        <div class="flex-none">
          <BsTerminal class="w-4 h-4" />
        </div>
        <div class="flex-1 line-clamp-1 break-all">
          {props.block.content.name}
        </div>
        <div class="flex-none">
          <Show when={show()} fallback={<BsChevronUp />}>
            <BsChevronDown />
          </Show>
        </div>
      </button>
      <Show when={show()}>
        <Dynamic component={body} block={props.block} />
      </Show>
    </div>
  );
}

function AssistantLabel() {
  return (
    <div class="flex items-center space-x-2 my-1">
      <IconComp size="xs" />
      <img src="/name.svg" class="h-6" />
    </div>
  );
}

function sectionType(role: Role) {
  if (role == "user") return 1;
  return 0;
}

export default function BlockComp(props: { blockId: string }) {
  const block = (): UIBlock => {
    const l = listBlocks();
    const i = l.findIndex((b) => b.id === props.blockId);
    const previousBlock = l.at(i - 1);
    const nextBlock = l.at(i + 1);
    return {
      ...l[i],
      isStartSecion: previousBlock
        ? sectionType(previousBlock.role) !== sectionType(l[i].role)
        : true,
      isEndSecion: nextBlock
        ? sectionType(nextBlock.role) !== sectionType(l[i].role)
        : true,
    };
  };

  const components = {
    assistant: AssistantBlockComp,
    user: UserBlockComp,
    tool: ToolBlockComp,
  };

  return (
    <Show when={block()}>
      {(b) => (
        <div data-end={b().isEndSecion} class="data-[end=true]:mb-4">
          <Show when={b().isStartSecion && sectionType(b().role) == 0}>
            <AssistantLabel />
          </Show>

          <Dynamic component={components[b().role]} block={b() as any} />
        </div>
      )}
    </Show>
  );
}
