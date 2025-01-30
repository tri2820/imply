export type Root = {
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
    description: string;
    age: string;
    page_age: string;
    meta_url: {
      scheme: string;
      netloc: string;
      hostname: string;
      favicon: string;
      path: string;
    };
    thumbnail: {
      src: string;
    };
    extra_snippets: Array<string>;
  }>;
};
