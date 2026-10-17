import { defineConfig } from "vite";

/**
 * The preview platform proxies the dev server under
 * `https://{port}-{sandbox-id}.e2b.app`, so the server listens on every
 * interface and must accept that forwarded host name.
 */
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
