import { init } from "@instantdb/core";
import schema, { AppSchema } from "../../instant.schema";
import { getEnv } from "~/server/utils";

// Initialize the database
// ---------
// @ts-ignore
let db: ReturnType<typeof init<AppSchema>> = undefined;
if (typeof window !== "undefined") {
  db = init({
    // @ts-ignore
    appId: window.env.INSTANTDB_APP_ID,
    schema,
    devtool: false,
  });
}

export { db };
