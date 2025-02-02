import { z } from "zod";
import { makeTool, ToolName } from ".";
import { getEnv } from "~/server/utils";

const schema = z.object({
    query: z.string(),
});

export type SearchNewsToolProps = z.infer<typeof schema>;
export type SearchNewsToolDone = ExtractType<'done', typeof searchNews>;

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
        console.error("response error", response);
        throw new Error("Failed to fetch news");
    }

    return response;
}

async function* searchNews({ query }: SearchNewsToolProps) {
    let n = 3;
    let response: Response | undefined = undefined;
    while (n--) {
        try {
            response = await fetchNews(query);
            if (response.ok) {
                break;
            }

        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            console.error(e);
        }
    }

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

export const searchNewsTool = makeTool({
    name: ToolName.searchNews,
    zodObj: schema,
    function: searchNews,
});
