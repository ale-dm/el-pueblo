// Service worker de la PWA (estrategia injectManifest): precaché del build, navegación a la SPA y avisos Web Push.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

// Tipos mínimos del ámbito de service worker (sin mezclar la librería "webworker" con el DOM).
interface SwScope {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  registration: { showNotification(title: string, options: Record<string, unknown>): Promise<void> };
  clients: {
    claim(): Promise<unknown>;
    matchAll(options: { type: "window" }): Promise<Array<{ focus(): Promise<unknown> }>>;
    openWindow(url: string): Promise<unknown>;
  };
  skipWaiting(): void;
  addEventListener(type: string, listener: (event: any) => void): void;
}
const sw = self as unknown as SwScope;

cleanupOutdatedCaches();
// El plugin inyecta el manifiesto de precaché en esta línea exacta (self.__WB_MANIFEST) durante el build.
// @ts-expect-error inyectado en build
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/socket\.io/] }));
sw.skipWaiting();
// Al activarse, toma las pestañas abiertas: así la página ve la versión nueva sin esperar a una segunda visita.
sw.addEventListener("activate", (event) => {
  event.waitUntil(sw.clients.claim());
});

// Aviso de fase. El texto llega ya genérico desde el servidor: aquí solo se muestra.
sw.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as { title?: string; body?: string; url?: string };
  event.waitUntil(
    sw.registration.showNotification(data.title ?? "El Pueblo", {
      body: data.body ?? "Hay novedades en el pueblo.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "el-pueblo-fase",
      data: { url: data.url ?? "/" },
    }),
  );
});

sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: "window" }).then((windows) => {
      const first = windows[0];
      return first ? first.focus() : sw.clients.openWindow((event.notification.data?.url as string) ?? "/");
    }),
  );
});
