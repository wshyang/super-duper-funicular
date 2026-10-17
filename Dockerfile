# syntax=docker/dockerfile:1.7
# Production image: build the static bundle, serve it from a pinned nginx.
FROM node:22.12.0-alpine3.20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:1.27.2-alpine3.20 AS runtime
ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R 1001:1001 /usr/share/nginx/html /var/cache/nginx /var/run \
    && sed -i 's#^user  *nginx;##' /etc/nginx/nginx.conf
EXPOSE 3000
USER 1001:1001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://0.0.0.0:3000/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
