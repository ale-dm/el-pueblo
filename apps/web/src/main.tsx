import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App.js";

// Con una versión nueva de la app, el service worker toma la página y esta se recarga una vez para usar el código nuevo.
// Solo si ya había un service worker al cargar: en la primera visita no hace falta recargar.
if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
