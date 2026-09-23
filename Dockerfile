FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run typecheck
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm  npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/ ./

EXPOSE 3000
CMD ["npm", "run", "start"]
