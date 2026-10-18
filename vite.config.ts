import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

/** Serves filed source plates and committed evidence without duplicating bytes into public/. */
function repoAssets(): Plugin {
  return {
    name: 'repo-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        const mount = url.startsWith('/repo-assets/src-images/')
          ? ['src/images', '/repo-assets/src-images/']
          : url.startsWith('/repo-assets/evidence/')
            ? ['docs/evidence', '/repo-assets/evidence/']
            : null;
        if (!mount) return next();
        const rel = decodeURIComponent(url.slice(mount[1].length));
        const file = path.join(process.cwd(), mount[0], rel);
        if (!file.startsWith(path.join(process.cwd(), mount[0])) || !fs.existsSync(file)) return next();
        const ext = path.extname(file).slice(1);
        const mime = ext === 'png' ? 'image/png' : ext === 'json' ? 'application/json' : 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.end(fs.readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), repoAssets()],
  server: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
});
