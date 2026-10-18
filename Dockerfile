# Contextualised from wshyang/greenfield initial-templates/Dockerfile
# (generic guesser) per GREENFIELD §10.1: this app is a Vite static bundle,
# so the runtime serves dist/ through `vite preview` on 0.0.0.0:3000.
# hadolint-aware: pinned base + distro release, numeric USER, HEALTHCHECK.
FROM node:22.22.3-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22.22.3-bookworm-slim AS runtime
ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER 1001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "preview"]
