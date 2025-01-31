import { id } from "@instantdb/core";
import { db } from "./database";
import { blocks, setBlocks } from "./utils";
import { ToolName } from "~/shared/tools";


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
  if (tool.arguments_delta) {
    state.needSplit = true;

    let toolBlock = blocks()[tool.call_id] as ToolBlock | undefined;
    if (!toolBlock) {
      toolBlock = {
        id: tool.call_id,
        content: {
          name: tool.arguments_delta.name as ToolName,
          arguments_partial_str: '',
        },
        role: "tool",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.transact([db.tx.blocks[toolBlock.id].update(toolBlock)]);
    }

    toolBlock.content.arguments_partial_str += tool.arguments_delta.delta;

    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: toolBlock,
      };
    });
  }


  if (tool.started) {
    console.log("toolMessage", tool);
    let toolBlock = blocks()[tool.call_id] as ToolBlock;
    toolBlock.content.arguments = tool.started.arguments;
    db.transact([db.tx.blocks[toolBlock.id].update(toolBlock)]);
    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: toolBlock,
      };
    });
  }

  if (tool.done) {
    console.log("toolMessage", tool);
    let toolBlock = blocks()[tool.call_id] as ToolBlock
    toolBlock.content.result = tool.done.result;

    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: toolBlock,
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
    // console.log('forward', json.forward)
  }

  if (json.tool) {
    await accept_tool(state, json.tool);
  }
}