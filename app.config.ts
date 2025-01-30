import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
    server: {
        rollupConfig: {
            external: ["jose", "@instantdb/core", "@instantdb/admin"],
        }
    }
});
