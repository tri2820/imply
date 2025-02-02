import { ChatCompletionTool } from "openai/resources/index.mjs"
import { z } from "zod"
import zodToJsonSchema from "zod-to-json-schema"

export enum ToolName {
    createMarket = "createMarket",
    searchNews = "searchNews",
    searchImage = "searchImage",
    // searchWeather = "searchWeather",
}

export function makeTool<T extends z.ZodObject<any, any>>(props: {
    name: string,
    zodObj: T,
    description?: string,
    function: (args: z.infer<T>, extraArgs: ExtraArgs) => AsyncGenerator<ToolYield>
}): {
    definition: ChatCompletionTool
    function: (args: any, extraArgs: ExtraArgs) => AsyncGenerator<ToolYield>
} {
    const parameters = zodToJsonSchema(props.zodObj)
    return {
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