// vite.config.js
import { defineConfig } from "vite";
import { version } from "./package.json";

export default defineConfig({
    define: {
        __APP_VERSION__: JSON.stringify(version),
        __BUILD_DATE__: JSON.stringify(new Date().toISOString().split("T")[0]), // YYYY-MM-DD
    },
});
