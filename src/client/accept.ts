import { ToolName } from "~/shared/tools";
import { db } from "./database";
import { blocks, setBlocks } from "./utils";
import { seededUUIDv4 } from "~/shared/utils";


async function accept_content(content: NonNullable<ChatStreamYield['content']>) {
  let assistantBlock: AssistantBlock | undefined = undefined;
  if (content.started) {
    assistantBlock = {
      id: content.started.id,
      role: "assistant",
      content: content.started.text,
      created_at: content.started.created_at,
      updated_at: content.started.created_at,
    }
  }

  if (content.delta) {
    assistantBlock = blocks()[content.delta.id] as AssistantBlock;
    assistantBlock.content += content.delta.text;
    assistantBlock.updated_at = content.delta.updated_at;
  }

  if (content.done) {
    assistantBlock = blocks()[content.done.id] as AssistantBlock;
    const instantdb_id = seededUUIDv4(assistantBlock.id);
    db.transact([db.tx.blocks[instantdb_id].update(assistantBlock)]);
  }

  if (assistantBlock) {
    setBlocks((blocks) => {
      return {
        ...blocks,
        [assistantBlock.id]: {
          ...assistantBlock
        },
      };
    });
  }
}

export async function accept_tool(tool: NonNullable<ChatStreamYield['tool']>) {
  let toolBlock: ToolBlock | undefined = undefined;

  if (tool.started) {
    toolBlock = {
      role: 'tool',
      id: tool.started.id,
      content: {
        arguments_partial_str: '',
        name: tool.started.name as ToolName,
      },
      created_at: tool.started.created_at,
      updated_at: tool.started.created_at
    }
  }


  if (tool.delta) {
    toolBlock = blocks()[tool.delta.id] as ToolBlock;
    toolBlock.content.arguments_partial_str += tool.delta.arguments_delta;
    toolBlock.updated_at = tool.delta.updated_at;
  }


  if (tool.done) {
    toolBlock = blocks()[tool.done.id] as ToolBlock
    toolBlock.content.arguments = tool.done.arguments;
    const instantdb_id = seededUUIDv4(toolBlock.id);
    db.transact([db.tx.blocks[instantdb_id].update(toolBlock)]);
  }

  if (toolBlock) {
    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: {
          ...toolBlock
        },
      };
    });
  }

}

export async function accept_tool_result(tool: NonNullable<ChatStreamYield['tool_result']>) {
  let toolBlock: ToolBlock | undefined;
  if (tool.doing) {
    // toolBlock = blocks()[tool.id] as ToolBlock
    // Nothing for now
  }

  if (tool.done) {
    toolBlock = blocks()[tool.id] as ToolBlock
    toolBlock.content.result = tool.done;
    const instantdb_id = seededUUIDv4(toolBlock.id);
    db.transact([db.tx.blocks[instantdb_id].update(toolBlock)]);
  }

  if (toolBlock) {
    setBlocks((blocks) => {
      return {
        ...blocks,
        [toolBlock.id]: {
          ...toolBlock
        },
      };
    });
  }
}

export async function accept(y: ChatStreamYield) {
  if (y.content) {
    accept_content(y.content)
  }

  if (y.tool) {
    accept_tool(y.tool)
  }

  if (y.tool_result) {
    accept_tool_result(y.tool_result)
  }
}