// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true as unknown as string[],
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true as unknown as string[],
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "src/**/*.test.ts"],
  },
});
