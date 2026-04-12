import { defineConfig, loadEnv } from "vite";
import type { ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const DEFAULT_FLASK_PORT = "5050";

function resolveFlaskProxyTarget(mode: string, cwd: string): string {
  const env = loadEnv(mode, cwd, "");
  let port = (env.FLASK_PORT || DEFAULT_FLASK_PORT).trim();
  if (port === "5000") {
    console.warn(
      "[vite] FLASK_PORT=5000 hits macOS AirPlay (HTTP 403). Using 5050 for /api proxy — set FLASK_PORT=5050 in .env and run Flask on 5050.",
    );
    port = DEFAULT_FLASK_PORT;
  }
  return `http://127.0.0.1:${port}`;
}

function apiProxy(target: string): Record<string, string | ProxyOptions> {
  return {
    "/api": {
      target,
      changeOrigin: true,
      configure(proxy) {
        proxy.on("error", (err) => {
          console.error("[vite proxy /api] upstream error:", err.message);
          console.error("[vite proxy] Is Flask running? Try: npm run server");
        });
        proxy.on("proxyRes", (proxyRes, req) => {
          if (proxyRes.statusCode === 403) {
            console.warn(
              `[vite proxy] ${req.url} -> HTTP 403 from ${target}. Wrong process on that port (e.g. AirPlay on :5000) or auth middleware.`,
            );
          }
        });
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const flaskTarget = resolveFlaskProxyTarget(mode, cwd);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: apiProxy(flaskTarget),
    },
    preview: {
      proxy: apiProxy(flaskTarget),
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
