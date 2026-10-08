# Servidor de El Pueblo. BORRADOR: no se puede construir hasta que exista apps/server/package.json (M2).
# Node 22 como el bot; pnpm workspaces, por eso se copia todo el monorepo.
FROM node:22-bookworm-slim

WORKDIR /app
RUN corepack enable

# Manifiestos primero para aprovechar la caché de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/engine/package.json packages/engine/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @el-pueblo/server build \
    && chmod +x deploy/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

# Aplica migraciones y arranca el servidor
CMD ["deploy/docker-entrypoint.sh"]
