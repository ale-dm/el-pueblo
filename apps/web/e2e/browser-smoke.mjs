import { createRequire } from "node:module";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const BASE_URL = process.env.E2E_URL ?? "http://localhost:3100/";
const shots = process.env.E2E_OUT ?? "/tmp";

const browser = await chromium.launch({ headless: true, executablePath: "/opt/pw-browsers/chromium" }).catch(async (e) => {
  console.log("launch alt:", String(e).slice(0, 120));
  return chromium.launch({ headless: true });
});
const pages = [];
for (let i = 0; i < 10; i++) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  pages.push(await context.newPage());
}
const host = pages[0];
await host.goto(BASE_URL);
await host.fill("#nick", "Ana");
await host.getByRole("button", { name: "Crear sala" }).click();
await host.getByText("Compártelo con tus amigos").waitFor({ timeout: 15000 });
const code = (await host.locator("h1").first().innerText()).trim();
console.log("código de sala:", code);

for (let i = 1; i < 10; i++) {
  await pages[i].goto(BASE_URL);
  await pages[i].fill("#nick", `Jugador${i + 1}`);
  await pages[i].fill("#code", code);
  await pages[i].getByRole("button", { name: "Unirme" }).click();
}
await host.getByRole("button", { name: "Repartir roles y empezar" }).waitFor({ timeout: 15000 });
await host.screenshot({ path: `${shots}/lobby-host.png` });
await host.getByRole("button", { name: "Repartir roles y empezar" }).click();

for (const p of pages) await p.getByText("Primer día").waitFor({ timeout: 15000 });
const roles = [];
for (const p of pages) {
  const title = await p.locator("h2").first().innerText();
  roles.push(title);
}
console.log("roles vistos por cada jugador:", roles.join(" | "));
console.log("ningún jugador ve 'Sin rol aún':", roles.every((r) => r !== "Sin rol aún"));
await host.screenshot({ path: `${shots}/game-host.png`, fullPage: true });

await pages[1].locator("textarea, input[placeholder='Escribe…']").first().fill("¡hola pueblo!");
await pages[1].getByRole("button", { name: "Enviar" }).click();
await pages[0].getByText("¡hola pueblo!").waitFor({ timeout: 10000 });
console.log("el chat público llega al anfitrión: sí");

console.log("esperando 16 s al temporizador real de la primera fase…");
await host.getByText("Discusión").waitFor({ timeout: 25000 });
console.log("fase tras el temporizador: Discusión");
await pages[2].screenshot({ path: `${shots}/game-player.png`, fullPage: true });

await browser.close();
process.exit(0);
