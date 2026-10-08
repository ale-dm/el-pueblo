# Despliegue

Mismo flujo que el bot de Discord: el servidor corre en Docker en el NAS (OpenMediaVault + Portainer), como
stack de Portainer **desde el repositorio de GitHub** (`ale-dm/el-pueblo`, privado). Portainer clona el repo y
construye la imagen él mismo. No hay que copiar código a mano.

**Estado:** los ficheros existen, pero el servidor todavía no (`apps/server` es solo el esquema de BD). El
despliegue no funcionará hasta M2. El `Dockerfile` y el `docker-entrypoint.sh` son borradores.

## Datos en el servidor

```
/compose/el-pueblo/
├── postgres/   datos de PostgreSQL → /var/lib/postgresql/data
├── backups/    copias nocturnas (pg_dump, formato custom) → /backups
└── logs/       logs del servidor → /app/logs
```

La configuración (`.env`) se guarda en el propio stack de Portainer.

## Ficheros

| Fichero | Función |
|---|---|
| `Dockerfile` | Imagen del servidor (Node 22, pnpm workspaces) |
| `deploy/portainer-stack.yml` | Stack: `postgres`, `server` y `backup` |
| `deploy/docker-entrypoint.sh` | Aplica migraciones y arranca el servidor |
| `deploy/backup.sh` | Copia diaria a las 04:30 (Madrid), retención `BACKUP_KEEP` (7 por defecto) |
| `deploy/docker-compose.local.yml` | Probar el stack en local |
| `.dockerignore` | Deja fuera datos, backups, docs y tests |

## Primera vez

1. **Token de GitHub** para que Portainer lea el repo privado: GitHub → Settings → Developer settings →
   Personal access tokens → **Fine-grained tokens** → Generate. Repository access: *Only select repositories* →
   `el-pueblo`. Permissions → Repository → **Contents: Read-only**.
2. **Carpetas:** `mkdir -p /compose/el-pueblo/{postgres,backups,logs}`.
3. **Red `proxy`:** debe existir (la crea el stack de Nginx Proxy Manager). El servidor se publica hacia ella.
4. Portainer → Stacks → **Add stack** → nombre `el-pueblo` → **Repository**:
   - Repository URL: `https://github.com/ale-dm/el-pueblo`
   - Repository reference: `refs/heads/main`
   - Compose path: `deploy/portainer-stack.yml`
   - **Authentication**: usuario `ale-dm` y el token del paso 1.
   - Environment variables → **Load variables from .env file** → subir el `.env` (Portainer lo guarda en `stack.env`).
5. **Deploy the stack**. Comprobar con `docker logs -f elpueblo-server`.

### Variables del `.env`

| Variable | Uso |
|---|---|
| `DATABASE_URL` | PostgreSQL. Obligatoria |
| `PUBLIC_URL` | `https://pueblo.xelements.es`. Origen permitido para Socket.IO |
| `GOOGLE_API_KEY` | Narración con Gemini. Sin ella, se narra con plantillas |
| `GEMINI_MODEL` | Por defecto `gemini-2.5-flash` |
| `NARRATOR_TIMEOUT_MS` | Límite de la llamada a Gemini (8000 por defecto) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Avisos Web Push. Sin ellas, no hay avisos |
| `CHAT_MESSAGES_PER_10S` | Límite de mensajes de chat por jugador (5 por defecto) |

Generar las claves VAPID una vez: `npx web-push generate-vapid-keys`.

### Variables antiguas (tabla de referencia del .env)

| Variable | Uso |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base de datos |
| `GOOGLE_API_KEY`, `GEMINI_MODEL` | Narración |
| `PUBLIC_URL` | `https://pueblo.xelements.es`. Enlaces y CORS |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (M5). `VAPID_SUBJECT` = `mailto:` de contacto |
| `BACKUP_KEEP` | Número de copias nocturnas que se conservan |
| `LOG_LEVEL` | `info` por defecto |

`DATABASE_URL` la monta el propio stack a partir de estas variables. No hace falta ponerla a mano.

## Actualizar

1. En el PC: `pnpm check` y `git push` a `developer`. Para publicar, merge a `main`.
2. Copia de la BD antes de tocar nada:

       docker exec elpueblo-backup sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER -Fc $POSTGRES_DB' > /compose/el-pueblo/backups/manual-$(date +%F-%H%M).dump

3. Portainer → Stacks → `el-pueblo` → **Pull and redeploy**. Reconstruye la imagen (`pull_policy: build`).
   (`docker restart` no sirve: seguiría con la imagen anterior.)
4. `docker logs -f elpueblo-server` y probar en el navegador.

Las migraciones de BD se aplican solas al arrancar, desde `apps/server/drizzle/`.

## Restaurar una copia

    docker stop elpueblo-server
    docker exec -i elpueblo-postgres pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean < /compose/el-pueblo/backups/<fichero>.dump
    docker start elpueblo-server

Probar la restauración una vez antes de la primera partida con amigos.

## Red y acceso público

- Dominio: `xelements.es` (NAS `elements`), gestionado en Cloudflare. Subdominio **`pueblo.xelements.es`**:
  registro DNS `A` hacia la IP pública de casa, con el **proxy de Cloudflare activado** (nube naranja). Así la IP
  de casa no aparece en el DNS y Cloudflare sirve el HTTPS hacia el visitante.
- Certificado de Nginx Proxy Manager con **desafío DNS** (Cloudflare), no HTTP. Con el proxy activado, el desafío
  HTTP de Let's Encrypt no es fiable. Necesitas un token de API de Cloudflare con permiso
  `Zone → DNS → Edit` sobre `xelements.es`, guardado en NPM (SSL Certificates → Let's Encrypt → DNS Challenge →
  Cloudflare). No va a git.
- En Cloudflare, el modo SSL/TLS debe ser **Full (strict)**: el tráfico entre Cloudflare y NPM va cifrado con el
  certificado de Let's Encrypt.
- Socket.IO envía pings periódicos, así que las conexiones WebSocket no se cierran por inactividad detrás del proxy.
  Confirmar en la documentación de Cloudflare que el plan que uses permite WebSockets.
- Nginx Proxy Manager es el único punto de entrada. Host proxy `pueblo.xelements.es` → `elpueblo-server:3000`, con
  **Websockets Support** activado (Socket.IO) y certificado Let's Encrypt con forzar HTTPS.
- `postgres` nunca publica puertos. `server` solo habla con NPM por la red `proxy`.
- Las notificaciones push y la instalación de la PWA necesitan HTTPS.

## Copias de seguridad

- `backup` hace `pg_dump` cada noche a `/compose/el-pueblo/backups` y conserva `BACKUP_KEEP` copias.
- Igual que en el bot, es el mismo disco: conviene copiar esa carpeta a otro sitio.

## Qué hace el contenedor del servidor

- `docker-entrypoint.sh`, bajo `tini`: migraciones → servidor. `docker stop` lo para ordenadamente.
- `restart: unless-stopped`: si el proceso se cae, Docker lo vuelve a levantar.
- Logs en `/compose/el-pueblo/logs`, con rotación.

## Probar en local

    docker compose -f deploy/docker-compose.local.yml up --build

Levanta PostgreSQL en `localhost:5432` y el servidor en `localhost:3000`.
