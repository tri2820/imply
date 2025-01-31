import { z } from "zod";
import { mkToolFactory } from "../utils";
import { ToolName } from ".";

const schema = z.object({
    query: z.string(),
})

async function fetchNews(query: string) {

    const response = await fetch(`https://api.search.brave.com/res/v1/news/search?q=${query}&count=10&search_lang=en&spellcheck=1`, {
        headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": "BSAG3fUtBNHBMKOd-ylM-rkHzIKvvpo"
        }
    });

    if (!response.ok) {
        console.error('response error', response)
        throw new Error("Failed to fetch news");
    }

    return response;
}

function factory(factoryProps: FactoryProps) {
    return async ({ query }: SearchNewsToolProps) => {

        let n = 3
        let response: Response | undefined = undefined;
        while (n--) {
            try {
                response = await fetchNews(query);
                if (response.ok) {
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (e) {
                console.error(e);
            }
        }

        if (!response || !response.ok) {
            throw new Error("Failed to fetch news");
        }

        const data = await response.json() as BraveSearchNewsRoot;
        const sites = data.results.map(r => {
            return {
                title: r.title,
                origin: new URL(r.url).origin,
                content: r.extra_snippets ? r.extra_snippets.join("\n") : undefined,
            }
        }).filter(s => s.content);

        return sites
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