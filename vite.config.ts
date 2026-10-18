import { defineConfig } from 'vite';

// Container/preview contract (GREENFIELD §10.1): port 3000 on 0.0.0.0, all
// forwarded preview hosts allowed. The app is static + dependency-free at
// runtime, so no dev-server proxy is required.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
  },
});
