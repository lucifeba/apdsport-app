FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tini ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /data && chown -R node:node /app /data
USER node
VOLUME ["/data"]
ENTRYPOINT ["/usr/bin/tini","--"]
CMD ["node","dist/index.js"]
