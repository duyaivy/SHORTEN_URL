# Base stage with pnpm setup
FROM node:23.11.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /app

# Build stage - Install dependencies, generate Prisma, and build NestJS
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
RUN pnpm run build

# Final stage (dùng cùng slim base image để đồng bộ hệ điều hành glibc/musl)
FROM node:23.11.1-slim AS runner
WORKDIR /app

# Ensure node user has permissions
RUN mkdir -p /app && chown -R node:node /app
USER node

# Copy toàn bộ node_modules chuẩn và dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/main.js"]
