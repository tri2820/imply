import { z } from "zod";
import { getEnv } from "~/server/utils";
import { makeTool, ToolName } from "./utils";
import { retry_if_fail } from "../utils";

const schema = z.object({
    query: z.string(),
});

export type SearchWebToolArgs = z.infer<typeof schema>;
export type SearchWebToolDone = ExtractType<'done', typeof searchWeb>;

async function fetchNews(query: string) {
    const response = await fetch(
        `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(
            query
        )}&count=5&search_lang=en&spellcheck=1`,
        {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": getEnv("BRAVE_SEARCH_API_KEY"),
            },
        }
    );

    if (!response.ok) {
        console.error("response error, retry");
        throw new Error("Failed to fetch news");
    }

    return response;
}


async function* searchWeb({ query }: SearchWebToolArgs) {

    let response: Response | undefined = undefined;
    response = await retry_if_fail(() => { return fetchNews(query) });
    if (!response || !response.ok) {
        throw new Error("Failed to fetch news");
    }

    const data = await response.json() as BraveSearchNewsRoot;
    const sites = data.results
        .map((r) => ({
            title: r.title,
            host: new URL(r.url).host,
            content: r.extra_snippets ? r.extra_snippets.join("\n") : undefined,
        }))
        .filter((s) => s.content);

    yield {
        done: sites,
    }
}

export const searchWebTool = makeTool({
    name: ToolName.searchWeb,
    zodObj: schema,
    function: searchWeb,
});
