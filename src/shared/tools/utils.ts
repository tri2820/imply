import { ChatCompletionTool } from "openai/resources/index.mjs"
import { z } from "zod"
import zodToJsonSchema from "zod-to-json-schema"

export enum ToolName {
    createMarket = "createMarket",
    searchWeb = "searchWeb",
    searchImages = "searchImages",
}

export function makeTool<N extends ToolName, T extends z.ZodObject<any, any>, K>(props: {
    name: N,
    zodObj: T,
    description?: string,
    function: (args: z.infer<T>, extraArgs: ExtraArgs) => K
}): {
    name: N
    definition: ChatCompletionTool
    description?: string
    function: (args: any, extraArgs: ExtraArgs) => K
} {
    const parameters = zodToJsonSchema(props.zodObj)
    return {
        name: props.name,
        description: props.description,
        definition: {
            "type": "function",
            "function": {
                "name": props.name,
                "description": props.description,
                parameters,
            }
        },

        function: props.function
    }
}