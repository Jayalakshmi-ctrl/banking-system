import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gateway = env.VITE_DEV_GATEWAY_URL ?? "http://127.0.0.1:8000";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/auth": { target: gateway, changeOrigin: true },
        "/complaints": { target: gateway, changeOrigin: true },
        "/analytics": { target: gateway, changeOrigin: true },
      },
    },
  };
});
