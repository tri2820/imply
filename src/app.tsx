import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { onCleanup, onMount, Suspense } from "solid-js";

import "./app.css";

// Supports weights 100-900
import "@fontsource-variable/lexend";
import "@fontsource/poppins/100.css";
import "@fontsource/poppins/200.css";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/poppins/900.css";

// Supports weights 200-900
import "@fontsource-variable/nunito";

import Nav from "./components/Nav";
import { db } from "./client/database";
import { setProfileSubscription } from "./client/utils";
import posthog from "posthog-js";

export default function App() {
  onMount(() => {
    if (!window.env.POSTHOG_TOKEN) return;
    console.log("connecting to posthog", window.env.POSTHOG_TOKEN);
    posthog.init(window.env.POSTHOG_TOKEN, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only", // or 'always' to create profiles for anonymous users as well
    });
  });

  function subscribeProfile(profile_id: string) {
    console.log("subscribeProfile", profile_id);
    return db.subscribeQuery(
      {
        profiles: {
          $: {
            where: {
              id: profile_id,
            },
          },
          holdings: {
            share: {
              // get the type
            },
          },
        },
      },
      (resp) => {
        console.log("profile sub resp", resp);
        setProfileSubscription(resp);
      }
    );
  }

  onMount(async () => {
    let unsub: Function;
    onCleanup(() => {
      unsub?.();
    });

    try {
      const resp = await fetch("/api/profiles/jwt", {
        method: "GET",
      });
      console.log("profile_jwt resp", resp);
      if (!resp.ok) throw new Error("fetch profile_jwt failed");
      const json: JWTResult = await resp.json();
      console.log("profile", json);
      unsub = subscribeProfile(json.profile_id);
    } catch (e) {
      console.error("error fetch profiles key", e);
    }
  });

  return (
    <Router
      root={(props) => (
        <div class="min-h-screen flex flex-col">
          <div class="grain" />
          <Nav />
          <Suspense>{props.children}</Suspense>
        </div>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
