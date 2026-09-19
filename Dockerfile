# FROM node:24-bookworm-slim AS build
# WORKDIR /app
# COPY . .
# ENV CI=true
# ENV NODE_ENV=production
# ENV DATABASE_URL=postgresql://admin:admin@10.149.67.28:5432/app_db
# RUN corepack enable 
# # RUN npm install --frozen-lockfile
# COPY package.json package-lock.json ./
# RUN  npm ci --include=dev --no-audit --no-fund
# COPY . .
# RUN npm run typecheck
# RUN npm run build
# EXPOSE 3000
# FROM node:24-bookworm-slim AS runtime
# WORKDIR /app
# COPY --from=build /app/.next ./.next
# COPY --from=build /app/public ./public
# COPY --from=build /app/next.config.* ./
# COPY --from=build /app/prisma ./prisma
# ENV NODE_ENV=production
# CMD ["npm", "run", "start"]
# syntax=docker/dockerfile:1.6
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev --no-audit --no-fund

COPY . .
RUN npm run typecheck
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.* ./
COPY --from=build /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "run", "start"]