import { z } from "zod";
import { getEnv } from "~/server/utils";
import { id } from "@instantdb/admin";
import { makeTool, ToolName } from "./utils";

const schema = z.object({
    query: z.string(),
});

export type SearchImageToolArgs = z.infer<typeof schema>;
export type SearchImageToolDone = ExtractType<'done', typeof searchImage>;
export type SearchImageToolDoing = ExtractType<'doing', typeof searchImage>;

async function fetchImages(query: string) {
    const response = await fetch(
        `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(
            query
        )}&count=6&search_lang=en&safesearch=strict&spellcheck=1`,
        {
            headers: {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": getEnv("BRAVE_SEARCH_API_KEY"),
            },
        }
    );

    if (!response.ok) {
        console.warn("response error, retry");
        throw new Error("Failed to fetch images");
    }

    return response;
}

async function* searchImage({ query }: SearchImageToolArgs) {
    let n = 10;
    let response: Response | undefined = undefined;
    while (n--) {
        try {
            response = await fetchImages(query);
            if (response.ok) {
                break;
            }

        } catch (e) {
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.floor(Math.random() * 1000)));
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

    const dataBindId = {
        ...data,
        results: data.results
            .toSorted((a, b) => confidenceScore[b.confidence] - confidenceScore[a.confidence])
            .map((r) => ({
                ...r,
                image_uuid: id(),
            }))
    }

    // only extract a small surface to give the AI (save token)
    const images = dataBindId.results
        .map((r) => ({
            image_uuid: r.image_uuid,
            title: r.title,
            host: new URL(r.url).host,
        }));

    yield {
        doing: {
            data: dataBindId
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
