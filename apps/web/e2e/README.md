# Prueba de navegador

Juega una partida de 10 jugadores en 10 navegadores contra un servidor en marcha.

    pnpm --filter @el-pueblo/web build
    # servidor con PostgreSQL disponible (DATABASE_URL) en el puerto 3100
    node apps/web/e2e/browser-smoke.mjs

Variables: `E2E_URL` (por defecto http://localhost:3100/) y `E2E_OUT` (carpeta de capturas).
Requiere Chromium: usa el de `/opt/pw-browsers/chromium` si existe.

## Prueba de móvil

Diez navegadores con el perfil de iPhone 13 (390 px, táctil), contra el mismo servidor. Recorre sala, primer día, chat, votación y juicio, y comprueba que ninguna pantalla se sale por la derecha.

    node apps/web/e2e/mobile-smoke.mjs

Mismas variables que la prueba de escritorio. No cubre un teléfono real ni las acciones de noche.
