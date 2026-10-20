FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
WORKDIR /app

FROM base AS development-dependencies-env
COPY . /app
RUN pnpm install --frozen-lockfile

FROM base AS production-dependencies-env
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build-env
COPY . /app/
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
RUN pnpm run build

# Ops image: migrations + seed/invite scripts (tsx + full source).
# Prefer Compose: docker compose run --rm ops pnpm run db:migrate
FROM development-dependencies-env AS ops
CMD ["pnpm", "run", "db:migrate"]

# Slim runtime image for the React Router server (default build target).
FROM base AS app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
COPY --from=build-env /app/build /app/build
CMD ["pnpm", "run", "start"]
