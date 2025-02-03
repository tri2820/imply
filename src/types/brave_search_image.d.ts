export { }
declare global {
    export type BraveSearchImagesRoot = {
        type: string;
        query: {
            original: string;
            spellcheck_off: boolean;
            show_strict_warning: boolean;
        };
        results: Array<{
            type: string;
            title: string;
            url: string;
            source: string;
            page_fetched: string;
            thumbnail: {
                src: string;
            };
            properties: {
                url: string;
                placeholder: string;
            };
            meta_url: {
                scheme: string;
                netloc: string;
                hostname: string;
                favicon: string;
                path: string;
            };
            confidence: 'high' | 'medium' | 'low';
        }>;
    };
}