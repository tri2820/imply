import { z } from "zod";
import { mkToolFactory } from "../utils";
import { ToolName } from ".";

const schema = z.object({
    query: z.string(),
})

function factory(factoryProps: FactoryProps) {
    return async ({ query }: SearchNewsToolProps) => {
        return ["there is no news about this topic"]
    }
}

export type SearchNewsToolProps = z.infer<typeof schema>
export type SearchNewsToolResult = Awaited<ReturnType<ReturnType<typeof factory>>>;
export const searchNewsFactory = mkToolFactory({
    name: ToolName.searchNews,
    description: `Search news using Brave API.`,
    schema,
    factory
});