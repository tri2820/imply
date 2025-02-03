import { z } from "zod";
import { getEnv } from "~/server/utils";
import { id } from "@instantdb/admin";
import { makeTool, ToolName } from "./utils";
import { retry_if_fail } from "../utils";

const schema = z.object({
    query: z.string(),
});

export type SearchImagesToolArgs = z.infer<typeof schema>;
export type SearchImagesToolDone = ExtractType<'done', typeof searchImages>;
export type SearchImagesToolDoing = ExtractType<'doing', typeof searchImages>;

export async function fetchImages(query: string) {
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

async function* searchImages({ query }: SearchImagesToolArgs) {

    let response: Response | undefined = undefined;

    response = await retry_if_fail(() => { return fetchImages(query) });
    if (!response || !response.ok) {
        throw new Error("Failed to fetch images");
    }

    const data = await response.json() as BraveSearchImagesRoot;
    const confidenceScore = {
        high: 1,
        medium: 0.5,
        low: 0,
    };

    const dataBindId = {
        ...data,
        results: data.results
            .toSorted((a, b) => confidenceScore[a.confidence] - confidenceScore[b.confidence])
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

export const searchImagesTool = makeTool({
    name: ToolName.searchImages,
    zodObj: schema,
    function: searchImages,
});
