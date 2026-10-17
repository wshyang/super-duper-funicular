# syntax=docker/dockerfile:1

# Production image: build the static bundle, then serve it from a tiny,
# unprivileged nginx-like static server. Pinned base, multi-stage, non-root.

FROM node:22.18.0-alpine3.22 AS build
WORKDIR /app
ENV CI=true
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22.18.0-alpine3.22 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
# A four-line static server with no dependencies: the bundle is all that runs.
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN printf '%s\n' \
  "import { createServer } from 'node:http';" \
  "import { readFile, stat } from 'node:fs/promises';" \
  "import { join, normalize, extname } from 'node:path';" \
  "const root = new URL('./dist/', import.meta.url).pathname;" \
  "const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.map': 'application/json' };" \
  "createServer(async (request, response) => {" \
  "  const url = decodeURIComponent((request.url ?? '/').split('?')[0]);" \
  "  const candidate = normalize(join(root, url === '/' ? 'index.html' : url));" \
  "  if (!candidate.startsWith(root)) { response.writeHead(403).end('forbidden'); return; }" \
  "  try { await stat(candidate); } catch { response.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); return; }" \
  "  const body = await readFile(candidate);" \
  "  response.writeHead(200, { 'content-type': types[extname(candidate)] ?? 'application/octet-stream', 'cache-control': url.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });" \
  "  response.end(body);" \
  "}).listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0');" \
  > server.mjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER 65532:65532
CMD ["node", "server.mjs"]
