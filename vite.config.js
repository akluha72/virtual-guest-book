import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { version } from "./package.json";

export default defineConfig({
    plugins: [basicSsl()],
    server: {
        host: true,
        port: 5173,
        allowedHosts: true,
        https: false,
    },
    define: {
        __APP_VERSION__: JSON.stringify(version),
        __BUILD_DATE__: JSON.stringify(new Date().toISOString().split("T")[0]),
    },
});