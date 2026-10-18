# Contextualised multi-stage Dockerfile per GREENFIELD.md §10.1
FROM node:22.12.0-alpine3.20 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22.12.0-alpine3.20 AS runtime

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S -u 1001 -G appgroup appuser && \
    npm install -g serve@14.2.4

COPY --from=builder --chown=1001:1001 /app/dist ./dist
COPY --from=builder --chown=1001:1001 /app/package.json ./package.json

ENV HOST=0.0.0.0
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

USER 1001:1001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["serve", "dist", "-s", "-l", "tcp://0.0.0.0:3000"]
