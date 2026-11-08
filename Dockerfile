# Nam's Nuxt Room: built and served by Node. Multi-arch base images, so it builds on the Orange Pi (arm64) as well.

# --- build: install everything and produce .output
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- run: only the self-contained server output, no node_modules needed
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
