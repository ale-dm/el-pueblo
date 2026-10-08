import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: { globPatterns: ["**/*.{js,css,html,svg,woff2}"] },
      includeAssets: ["icon.svg"],
      manifest: {
        name: "El Pueblo",
        short_name: "El Pueblo",
        description: "Mafia social con narrador: crea una sala y juega con tus amigos.",
        theme_color: "#1b1d4a",
        background_color: "#1b1d4a",
        display: "standalone",
        start_url: "/",
        lang: "es",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { "/socket.io": { target: "http://localhost:3100", ws: true } },
  },
});
