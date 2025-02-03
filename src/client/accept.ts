
import { ToolName } from "~/shared/tools/utils";
import { db } from "./database";
import { blocks, setBlocks } from "./utils";
import { seededUUIDv4 } from "~/shared/utils";

async function accept_content(content: NonNullable<ChatStreamYield['content']>, agent_step: AgentStep) {
  let assistantBlock: AssistantBlock | undefined = undefined;
  if (content.started) {
    assistantBlock = {
      agent_step,
      id: content.started.id,
      role: "assistant",
      content: content.started.text,
      // created_at: content.started.created_at,
      // updated_at: content.started.created_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  if (content.delta) {
    assistantBlock = blocks()[content.delta.id] as AssistantBlock;
    assistantBlock.content += content.delta.text;
    // assistantBlock.updated_at = content.delta.updated_at;
    assistantBlock.updated_at = new Date().toISOString()
  }

  if (content.done) {
    assistantBlock = blocks()[content.done.id] as AssistantBlock;
    assistantBlock.updated_at = new Date().toISOString()
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


async function accept_reasoning(reasoning: NonNullable<ChatStreamYield['reasoning']>, agent_step: AgentStep) {
  let reasoningBlock: ReasoningBlock | undefined = undefined;
  if (reasoning.started) {
    reasoningBlock = {
      agent_step,
      id: reasoning.started.id,
      role: "reasoning",
      content: reasoning.started.text,
      // created_at: content.started.created_at,
      // updated_at: content.started.created_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  if (reasoning.delta) {
    reasoningBlock = blocks()[reasoning.delta.id] as ReasoningBlock;
    reasoningBlock.content += reasoning.delta.text;
    // assistantBlock.updated_at = content.delta.updated_at;
    reasoningBlock.updated_at = new Date().toISOString()
  }

  if (reasoning.done) {
    reasoningBlock = blocks()[reasoning.done.id] as ReasoningBlock;
    reasoningBlock.updated_at = new Date().toISOString()
    const instantdb_id = seededUUIDv4(reasoningBlock.id);
    db.transact([db.tx.blocks[instantdb_id].update(reasoningBlock)]);
  }

  if (reasoningBlock) {
    setBlocks((blocks) => {
      return {
        ...blocks,
        [reasoningBlock.id]: {
          ...reasoningBlock
        },
      };
    });
  }
}



export async function accept_tool(tool: NonNullable<ChatStreamYield['tool']>, agent_step: AgentStep) {
  let toolBlock: ToolBlock | undefined = undefined;

  if (tool.started) {
    toolBlock = {
      agent_step,
      role: 'tool',
      id: tool.started.id,
      content: {
        doings: [],
        arguments_partial_str: '',
        name: tool.started.name as ToolName,
      },
      // created_at: tool.started.created_at,
      // updated_at: tool.started.created_at
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }


  if (tool.delta) {
    toolBlock = blocks()[tool.delta.id] as ToolBlock;
    toolBlock.content.arguments_partial_str += tool.delta.arguments_delta;
    // toolBlock.updated_at = tool.delta.updated_at;
    toolBlock.updated_at = new Date().toISOString()
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

export async function accept_tool_yield(tool: ToolYieldWithId, agent_step: AgentStep) {
  console.log('accept_tool_yield tool is toolYield', tool)
  let toolBlock: ToolBlock | undefined;
  if (tool.done) {
    toolBlock = blocks()[tool.id] as ToolBlock
    toolBlock.content.result = tool.done;
    const instantdb_id = seededUUIDv4(toolBlock.id);
    db.transact([db.tx.blocks[instantdb_id].update(toolBlock)]);
  } else if (tool.doing) {
    console.log('tool.doing', tool.doing)
    toolBlock = blocks()[tool.id] as ToolBlock
    toolBlock.content.doings = [...toolBlock.content.doings, tool.doing];
  }

  console.log('accept_tool_yield toolBlock', toolBlock)
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
  console.log('y', y.agent_step)
  if (y.reasoning) {
    accept_reasoning(y.reasoning, y.agent_step)
  }

  if (y.content) {
    accept_content(y.content, y.agent_step)
  }

  if (y.tool) {
    accept_tool(y.tool, y.agent_step)
  }

  if (y.tool_yield) {
    accept_tool_yield(y.tool_yield, y.agent_step)
  }
}