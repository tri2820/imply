import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
    server: {
        preset: 'bun',
        rollupConfig: {
            external: ["jose", "@instantdb/core", "@instantdb/admin"],
        }
    }
});
