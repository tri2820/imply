import { marked } from "marked";
import { BsChevronDown, BsChevronUp, BsTerminal } from "solid-icons/bs";
import { createSignal, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { listBlocks } from "~/client/utils";
import IconComp from "./IconComp";

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

function ToolBlockBody_CreateMarket(props: { block: ToolBlock }) {
  return (
    <div class="py-2 flex items-stretch max-h-60">
      <div class="flex-none mx-2 w-[2px] bg-neutral-800"></div>
      <div class="pl-2 pr-4 overflow-auto">
        {JSON.stringify(props.block.content.arguments)}
      </div>
    </div>
  );
}

function ToolBlockComp(props: { block: ToolBlock }) {
  const [show, setShow] = createSignal(true);
  // const bodies = {
  //   'create_market': ToolBlockBody_CreateMarket,
  //   ''
  // }

  return (
    <div class="max-w-96 rounded-l my-1">
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
        <Dynamic component={ToolBlockBody_CreateMarket} block={props.block} />
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
