import type { Component } from 'solid-js';
import { createEffect, createSignal, Show } from 'solid-js';
import { gdeltClient } from './lib/rpc';
import { create } from '@bufbuild/protobuf';
import type { Article } from '@/gen/gdelt/v1/gdelt_pb';
import { SearchArticlesRequestSchema } from '@/gen/gdelt/v1/gdelt_pb';

const App: Component = () => {
  const [articles, setArticles] = createSignal<Article[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const loadArticles = async () => {
      setLoading(true);
      setError(null);
      try {
        const request = create(SearchArticlesRequestSchema, {
          query: 'climate change',
          timespan: '30days',
          startDate: '',
          endDate: '',
          maxRecords: 10,
        });
        const response = await gdeltClient.searchArticles(request);
        setArticles(response.articles);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load articles');
      } finally {
        setLoading(false);
      }
    };
    loadArticles();
  });

  return (
    <div class="max-w-4xl mx-auto p-6">
      <h1 class="text-3xl font-bold mb-6">GDELT Articles</h1>

      <Show when={loading()}>
        <p class="text-gray-500">Loading articles...</p>
      </Show>

      <Show when={error()}>
        <p class="text-red-500">{error()}</p>
      </Show>

      <Show when={articles().length > 0}>
        <ul class="space-y-4">
          {articles().map((article) => (
            <li class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:underline font-medium block mb-2"
              >
                {article.title}
              </a>
              <div class="text-sm text-gray-500 space-x-2">
                <span>{article.domain}</span>
                <span>•</span>
                <span>{article.seendate}</span>
                <span>•</span>
                <span>{article.language}</span>
              </div>
            </li>
          ))}
        </ul>
      </Show>
    </div>
  );
};

export default App;
