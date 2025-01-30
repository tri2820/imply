import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <main class="text-center mx-auto  p-4">
      <h1 class="max-6-xs text-6xl text-white font-thin uppercase my-16">
        Not Found
      </h1>
      <p>
        Oops! Looks like the requested resource took a vacation. Try again
        later!
      </p>
    </main>
  );
}
