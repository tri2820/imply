import { init } from "@instantdb/core";
import schema from "../../instant.schema";


// Initialize the database
// ---------
export const db = init({
  appId: import.meta.env.VITE_INSTANTDB_APP_ID,
  schema,
  devtool: false,
});
