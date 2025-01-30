
export { };

declare global {
  type BraveSearchWebRoot = {
    query: {
      original: string;
      show_strict_warning: boolean;
      is_navigational: boolean;
      is_news_breaking: boolean;
      spellcheck_off: boolean;
      country: string;
      bad_results: boolean;
      should_fallback: boolean;
      postal_code: string;
      city: string;
      header_country: string;
      more_results_available: boolean;
      state: string;
    };
    mixed: {
      type: string;
      main: Array<{
        type: string;
        index?: number;
        all: boolean;
      }>;
      top: Array<any>;
      side: Array<any>;
    };
    type: string;
    videos: {
      type: string;
      results: Array<{
        type: string;
        url: string;
        title: string;
        description: string;
        video: {};
        meta_url: {
          scheme: string;
          netloc: string;
          hostname: string;
          favicon: string;
          path: string;
        };
        thumbnail: {
          src: string;
          original: string;
        };
        age?: string;
        page_age?: string;
      }>;
      mutated_by_goggles: boolean;
    };
    web: {
      type: string;
      results: Array<{
        title: string;
        url: string;
        is_source_local: boolean;
        is_source_both: boolean;
        description: string;
        page_age?: string;
        profile: {
          name: string;
          url: string;
          long_name: string;
          img: string;
        };
        language: string;
        family_friendly: boolean;
        type: string;
        subtype: string;
        is_live: boolean;
        meta_url: {
          scheme: string;
          netloc: string;
          hostname: string;
          favicon: string;
          path: string;
        };
        thumbnail?: {
          src: string;
          original: string;
          logo: boolean;
        };
        age?: string;
        extra_snippets?: Array<string>;
        deep_results?: {
          buttons: Array<{
            type: string;
            title: string;
            url: string;
          }>;
        };
      }>;
      family_friendly: boolean;
    };
  };

}