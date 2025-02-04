import { init } from "@instantdb/core";
import schema, { AppSchema } from "../../instant.schema";

// Initialize the database
// ---------
// @ts-ignore
let db: ReturnType<typeof init<AppSchema>> = undefined;
if (typeof window !== "undefined") {
  if (!window.env.INSTANTDB_APP_ID) throw new Error("INSTANTDB_APP_ID not set");
  db = init({
    appId: window.env.INSTANTDB_APP_ID,
    schema,
    devtool: false,
  });
}

export { db };
