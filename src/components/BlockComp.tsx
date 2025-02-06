import { marked } from "marked";
import { BsTerminal } from "solid-icons/bs";
import { For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { blockShow, listBlocks, setBlockShow } from "~/client/utils";
import IconComp from "./IconComp";

import {
  CreateMarketToolArgs,
  CreateMarketToolDone,
} from "~/shared/tools/createMarket";
import {
  SearchImagesToolArgs,
  SearchImagesToolDoing,
  SearchImagesToolDone,
} from "~/shared/tools/searchImages";
import { SearchWebToolArgs, SearchWebToolDone } from "~/shared/tools/searchWeb";
import { ToolName } from "~/shared/tools/utils";
import MarketCard from "./MarketCard";
import MarketImage from "./MarketImage";
import { FaSolidChevronDown, FaSolidChevronUp } from "solid-icons/fa";

function AssistantBlockComp(props: { block: AssistantBlock }) {
  let ref!: HTMLDivElement;

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

function AssistantReasoningForwardBlockComp(props: { block: AssistantBlock }) {
  let ref!: HTMLDivElement;

  // TODO: sanitize
  const html = () => marked.parse(props.block.content) as string;

  return (
    <div ref={ref} class="overflow-x-auto my-1 rounded-2xl p-4 bg-neutral-900">
      <button
        onClick={() =>
          setBlockShow((p) => ({
            ...p,
            [props.block.id]: !p[props.block.id],
          }))
        }
        class="flex items-center space-x-2"
      >
        <div class="font-semibold">PLANNING</div>
        <div class="flex-none">
          <Show
            when={blockShow()[props.block.id] ?? true}
            fallback={<FaSolidChevronUp />}
          >
            <FaSolidChevronDown />
          </Show>
        </div>
      </button>

      <Show when={blockShow()[props.block.id] ?? true}>
        <div
          class="prose prose-invert prose-neutral max-w-none mt-2"
          innerHTML={html()}
        />
      </Show>
    </div>
  );
}

function ReasoningBlockComp(props: { block: ReasoningBlock }) {
  let ref!: HTMLDivElement;

  return (
    <div ref={ref} class="overflow-x-auto my-2 p-4 rounded-2xl bg-neutral-900">
      <button
        onClick={() =>
          setBlockShow((p) => ({
            ...p,
            [props.block.id]: !p[props.block.id],
          }))
        }
        class="flex items-center space-x-2"
      >
        <div class="font-semibold">THINKING</div>
        <div class="flex-none">
          <Show
            when={blockShow()[props.block.id] ?? true}
            fallback={<FaSolidChevronUp />}
          >
            <FaSolidChevronDown />
          </Show>
        </div>
      </button>

      <Show when={blockShow()[props.block.id] ?? true}>
        <div class="mt-2 ">{props.block.content}</div>
      </Show>
    </div>
  );
}

function UserBlockComp(props: { block: UserBlock }) {
  return (
    <div class="flex  w-full my-1 ">
      <div class="flex-1" />
      <div class="py-2 bg-neutral-800 px-4 rounded-3xl max-w-80">
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

function ToolBlockBody_ResultError(props: { block: ToolBlock }) {
  return (
    <div class="">
      <div class="py-2 flex items-stretch">
        <div class="flex-none mx-2 w-[2px] bg-neutral-800"></div>
        <div class="flex-1">{JSON.stringify(props.block.content.result)}</div>
      </div>
    </div>
  );
}

function ToolBlockBody_createMarket(props: {
  block: ToolBlock<CreateMarketToolArgs, CreateMarketToolDone>;
}) {
  return (
    <Show
      when={props.block.content.result}
      fallback={<ToolBlockBody_ArgumentsString block={props.block} />}
    >
      {(result) => (
        <div class="mt-2">
          <Show
            when={result().market_id}
            fallback={<ToolBlockBody_ResultError block={props.block} />}
          >
            {(market_id) => <MarketCard marketId={market_id()} queryAgain />}
          </Show>
        </div>
      )}
    </Show>
  );
}

function ToolBlockBody_searchWeb(props: {
  block: ToolBlock<SearchWebToolArgs, SearchWebToolDone>;
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
                        <img src={favicon(site.host)} class="w-4 h-4" />
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

function ToolBlockBody_searchImages(props: {
  block: ToolBlock<
    SearchImagesToolArgs,
    SearchImagesToolDone,
    SearchImagesToolDoing
  >;
}) {
  const data = () => props.block.content.doings.at(0)?.data;
  return (
    <Show
      when={props.block.content.result}
      fallback={<ToolBlockBody_ArgumentsString block={props.block} />}
    >
      <div class="flex items-stretch">
        <div class="flex-none mx-2 w-[2px] bg-neutral-800" />
        <div class="mt-2 flex-1">
          <div class="text-sm text-neutral-400">
            Searched for "{props.block.content.arguments?.query}"
          </div>

          <Show when={data()}>
            {(d) => (
              <div class="py-2 flex flex-wrap gap-2">
                <For each={d().results.slice(0, 16)}>
                  {(r) => (
                    <div class=" rounded overflow-hidden ">
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        <MarketImage src={r.thumbnail.src} />
                      </a>
                    </div>
                  )}
                </For>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}

function ToolBlockComp(props: { block: ToolBlock }) {
  const body = {
    [ToolName.createMarket as string]: ToolBlockBody_createMarket,
    [ToolName.searchWeb as string]: ToolBlockBody_searchWeb,
    [ToolName.searchImages as string]: ToolBlockBody_searchImages,
  }[props.block.content.name];

  const doing = () => props.block.content.result === undefined;
  return (
    <div data-doing={doing()} class="my-1 data-[doing=true]:animate-pulse">
      <button
        onClick={() => {
          setBlockShow((p) => ({
            ...p,
            [props.block.id]: !p[props.block.id],
          }));
        }}
        class="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 flex items-center space-x-2"
      >
        <div class="flex-none">
          <BsTerminal class="w-4 h-4" />
        </div>
        <div class="flex-1 line-clamp-1 break-all">
          {props.block.content.name}
        </div>
        <div class="flex-none">
          <Show
            when={blockShow()[props.block.id] ?? true}
            fallback={<FaSolidChevronUp />}
          >
            <FaSolidChevronDown />
          </Show>
        </div>
      </button>
      <Show when={blockShow()[props.block.id] ?? true}>
        <Dynamic component={body} block={props.block} />
        {/* <div>{JSON.stringify(props.block)}</div> */}
      </Show>
    </div>
  );
}

function AssistantLabel() {
  return (
    <div class="flex items-center space-x-2 my-1">
      <IconComp size="lg" />
      <img src="/name.svg" class="h-6" />
    </div>
  );
}

function sectionType(role: Block["role"]) {
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

  const assistantComponents: any = {
    reasoning_and_foward: AssistantReasoningForwardBlockComp,
    tool_call_and_content: AssistantBlockComp,
  };

  const components = {
    assistant: (props: { block: AssistantBlock }) => (
      <Show when={props.block.agent_step}>
        {(step) => (
          <Dynamic
            component={assistantComponents[step()]}
            block={props.block}
          />
        )}
      </Show>
    ),

    user: UserBlockComp,
    tool: ToolBlockComp,
    reasoning: ReasoningBlockComp,
  };

  const label = <AssistantLabel />;

  return (
    <Show when={block()}>
      {(b) => (
        <div data-end={b().isEndSecion} class="data-[end=true]:mb-4">
          <Show when={b().isStartSecion && sectionType(b().role) == 0}>
            {label}
          </Show>

          <Dynamic component={components[b().role]} block={b() as any} />
        </div>
      )}
    </Show>
  );
}
