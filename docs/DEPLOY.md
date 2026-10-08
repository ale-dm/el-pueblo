# Despliegue en el NAS

Hardware: Intel Core i3-13100 (4 núcleos, 8 hilos), x86-64. Sobra para el servidor de Node y PostgreSQL con 10–15 jugadores.
Gestión: Docker con Portainer. El stack se despliega desde el repositorio, en la rama `main`.

## Servicios

| Servicio | Imagen | Expuesto | Notas |
|---|---|---|---|
| `npm` (Nginx Proxy Manager) | imagen oficial de NPM | Puertos 80 y 443 | Único punto de entrada. HTTPS con Let's Encrypt |
| `server` | build de `apps/server` | Solo a la red interna de Docker | Fastify + Socket.IO + API. Sirve la PWA estática |
| `postgres` | imagen oficial de PostgreSQL, versión mayor fijada | No publicado | Solo accesible desde `server` |

`postgres` y `server` nunca publican puertos al host. Solo NPM habla con el exterior.

## Red y acceso

1. **Router:** reenviar los puertos 80 y 443 hacia la IP del NAS.
2. **DNS:** un dominio con registro A hacia la IP pública. Si la IP es dinámica, un servicio de DDNS.
3. **NPM:** un host proxy para el dominio, apuntando a `server:3000`, con **Websockets Support** activado (Socket.IO lo necesita) y certificado Let's Encrypt con forzar HTTPS.
4. **Panel de NPM y Portainer:** solo accesibles desde la red local, nunca desde internet.

**Alternativa:** Cloudflare Tunnel evita abrir puertos en el router y oculta la IP de casa. Lo dejo anotado; la decisión actual es NPM.

## Requisitos de la PWA

- HTTPS obligatorio: sin él no hay service worker, ni instalación, ni notificaciones push.
- Las notificaciones push de iOS requieren la PWA instalada en la pantalla de inicio (iOS 16.4 o superior).

## Operación 24/7

- Todos los contenedores con `restart: unless-stopped`.
- En la BIOS del NAS: encendido automático tras corte de corriente.
- SAI (UPS) recomendado: un corte sin aviso corta una partida en curso.
- Comprobación de salud: `GET /health` del servidor, vigilado por un monitor externo de uptime, si quieres aviso cuando caiga.

## Copias de seguridad

- `pg_dump` cada noche a una carpeta del NAS, con retención de 14 días.
- Restauración probada al menos una vez antes de la primera partida con amigos.
- Copia del volumen de PostgreSQL y de la configuración de NPM en un disco distinto, si el NAS tiene RAID o un segundo disco.

## Seguridad

- Ningún secreto en git: claves de Gemini, `DATABASE_URL` y claves VAPID van como variables del stack en Portainer.
- Actualizaciones de imágenes periódicas: Portainer → stack → actualizar.
- Rate limit en el servidor para creación de salas y chat (ya previsto en el GDD).
- Contraseñas fuertes en NPM y Portainer, con 2FA si lo soportan.

## Pendiente de decidir

- Dominio y proveedor de DDNS, si la IP es dinámica.
- Si el panel de NPM se gestiona desde VPN o solo desde la red local.
