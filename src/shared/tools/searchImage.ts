import { z } from "zod";
import { makeTool, ToolName } from ".";
import { getEnv } from "~/server/utils";
import { id } from "@instantdb/admin";

const schema = z.object({
    query: z.string(),
});

export type SearchImageToolProps = z.infer<typeof schema>;
export type SearchImageToolDone = ExtractType<'done', typeof searchImage>;
export type SearchImageToolDoing = ExtractType<'doing', typeof searchImage>;

async function fetchImages(query: string) {
    const response = await fetch(
        `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(
            query
        )}&count=20&search_lang=en&safesearch=strict&spellcheck=1`,
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
        throw new Error("Failed to fetch images");
    }

    return response;
}

async function* searchImage({ query }: SearchImageToolProps) {
    let n = 3;
    let response: Response | undefined = undefined;
    while (n--) {
        try {
            response = await fetchImages(query);
            if (response.ok) {
                break;
            }

        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            console.error(e);
        }
    }

    if (!response || !response.ok) {
        throw new Error("Failed to fetch images");
    }

    const data = await response.json() as BraveSearchImageRoot;
    const confidenceScore = {
        high: 1,
        medium: 0.5,
        low: 0,
    };
    const images = data.results
        .toSorted((a, b) => confidenceScore[b.confidence] - confidenceScore[a.confidence])
        .map((r) => ({
            title: r.title,
            host: new URL(r.url).host,
        }));

    yield {
        doing: {
            data
        }
    }

    yield {
        done: images,
    }
}

export const searchImageTool = makeTool({
    name: ToolName.searchImage,
    zodObj: schema,
    function: searchImage,
});
