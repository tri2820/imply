import { id } from "@instantdb/core";
import { db } from "./database";
import { setBlocks } from "./utils";


async function accept_delta(state: SharedState, delta: NonNullable<ChatTaskMessage["delta"]>) {
  if (state.needSplit) {
    state.needSplit = false;

    // Sometimes the assistant block is empty because the assitant call tool first
    if (state.assistantBlock.content) {
      await db.transact([
        db.tx.blocks[state.assistantBlock.id].update(state.assistantBlock),
      ]);
    }

    // Create a new assistant block
    state.assistantBlock = {
      id: id(),
      role: "assistant",
      content: "",
      created_at: new Date(Date.now()).toISOString(),
      updated_at: new Date(Date.now()).toISOString(),
    };

    setBlocks((prev) => {
      return {
        ...prev,
        [state.assistantBlock.id]: state.assistantBlock,
      };
    });
  }

  state.assistantBlock.content += delta;
  state.assistantBlock.updated_at = new Date().toISOString();
  setBlocks((blocks) => {
    return {
      ...blocks,
      [state.assistantBlock.id]: {
        ...state.assistantBlock,
      },
    };
  });
}

export async function accept_tool(state: SharedState, tool: NonNullable<ChatTaskMessage["tool"]>) {
  console.log("toolMessage", tool);
  if (tool.started) {
    state.needSplit = true;

    // Tool block
    const toolBlock: ToolBlock = {
      id: tool.call_id,
      content: {
        name: tool.name,
        arguments: tool.started.arguments,
      },
      role: "tool",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.transact([db.tx.blocks[toolBlock.id].update(toolBlock)]);

    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: toolBlock,
      };
    });
  }

  if (tool.done) {
    const done = tool.done;
    setBlocks((blocks) => {

      const block = blocks[tool.call_id];
      if (!block || block.role !== "tool") {
        return blocks;
      }

      return {
        ...blocks,
        [block.id]: {
          ...block,
          content: {
            ...block.content,
            result: done.result,
          }
        },
      };
    });
  }
}

export async function accept(state: SharedState, json: ChatTaskMessage) {
  if (json.delta) {
    await accept_delta(state, json.delta);
  }

  if (json.forward) {
    // Do nothing for now
  }

  if (json.tool) {
    await accept_tool(state, json.tool);
  }
}