# Contextualized from wshyang/greenfield initial-templates/Dockerfile.
FROM node:22.22.0-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev --omit=optional
FROM node:22.22.0-alpine
WORKDIR /app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node_modules/.bin/serve", "dist", "-l", "tcp://0.0.0.0:3000"]
