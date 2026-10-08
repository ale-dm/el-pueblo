# Servidor de El Pueblo. Ejecuta TypeScript con tsx: no hay paso de compilación.
# Node 22 como el bot; pnpm workspaces, por eso se copia todo el monorepo.
FROM node:22-bookworm-slim

WORKDIR /app
RUN corepack enable

# Manifiestos primero para aprovechar la caché de capas
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/engine/package.json packages/engine/
RUN pnpm install --frozen-lockfile

COPY . .
# La PWA se compila en la imagen: el servidor la sirve en el mismo origen (WEB_DIST).
RUN pnpm --filter @el-pueblo/web build \
    && chmod +x deploy/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

# Aplica migraciones, siembra el catálogo y arranca el servidor
CMD ["deploy/docker-entrypoint.sh"]
