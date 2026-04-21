import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const API_TARGET =
    env.VITE_API_PROXY_TARGET || "https://poker-blind-timer.fly.dev";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/malettes": { target: API_TARGET, changeOrigin: true, secure: true },
        "/structures": { target: API_TARGET, changeOrigin: true, secure: true },
        "/health": { target: API_TARGET, changeOrigin: true, secure: true },
      },
    },
  };
});
