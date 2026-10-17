import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The preview runs behind the sandbox proxy, so the dev server must accept that
// forwarded host name. Only the sandbox domain and localhost are allowed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: [".e2b.app", "localhost"],
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    allowedHosts: [".e2b.app", "localhost"],
  },
});
