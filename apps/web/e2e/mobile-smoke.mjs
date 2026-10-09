import { createRequire } from "node:module";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium, devices } = require("@playwright/test");

// Prueba de móvil: diez jugadores con un perfil de iPhone 13 (390 px de ancho, táctil) contra un servidor en marcha.
// Recorre sala, día, discusión, votación y juicio. En cada pantalla comprueba que no hay desbordamiento horizontal.
const BASE_URL = process.env.E2E_URL ?? "http://localhost:3100/";
const shots = process.env.E2E_OUT ?? "/tmp";
const device = devices["iPhone 13"];

const browser = await chromium.launch({ headless: true, executablePath: "/opt/pw-browsers/chromium" }).catch(async (e) => {
  console.log("launch alt:", String(e).slice(0, 120));
  return chromium.launch({ headless: true });
});
const pages = [];
const errores = [];
for (let i = 0; i < 10; i++) {
  const ctx = await browser.newContext({ ...device });
  // Cuenta los avisos de cambio (match:events) que llegan por el WebSocket de cada jugador.
  await ctx.addInitScript(() => {
    window.__events = 0;
    const Original = window.WebSocket;
    window.WebSocket = class extends Original {
      constructor(...a) { super(...a); this.addEventListener("message", (m) => { if (String(m.data).includes("match:events")) window.__events++; }); }
    };
  });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") errores.push(`jugador ${i + 1}: ${m.text().slice(0, 160)}`); });
  page.on("pageerror", (e) => errores.push(`jugador ${i + 1} (excepción): ${String(e).slice(0, 160)}`));
  pages.push(page);
}
const [host] = pages;

const resultados = [];
const comprobar = (nombre, ok, detalle = "") => {
  resultados.push({ nombre, ok });
  console.log(`${ok ? "OK   " : "FALLO"} ${nombre}${detalle ? ` (${detalle})` : ""}`);
};
/** Fase que muestra la página ahora (la etiqueta del encabezado), para ver si un jugador va por detrás. */
const faseEnPantalla = (page) => page.evaluate(() => {
  const etiquetas = ["Primer día", "Discusión", "Votación", "Defensa", "Juicio", "Últimas palabras", "Noche"];
  const texto = document.body.innerText;
  return etiquetas.find((e) => texto.includes(e)) ?? "ninguna";
});
/** Píxeles que la página se sale por la derecha: 0 si cabe en el ancho del teléfono. */
const desborde = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const sinDesborde = async (nombre) => {
  const valores = await Promise.all(pages.map(desborde));
  comprobar(`sin desbordamiento horizontal: ${nombre}`, Math.max(...valores) === 0, `máximo ${Math.max(...valores)} px`);
};
const nickOf = (i) => (i === 0 ? "Ana" : `Jugador${i + 1}`);

await host.goto(BASE_URL);
await host.fill("#nick", "Ana");
await host.getByRole("button", { name: "Crear sala" }).click();
await host.getByText("Compártelo con tus amigos").waitFor({ timeout: 15000 });
const code = (await host.locator("h1").first().innerText()).trim();
await host.screenshot({ path: `${shots}/movil-sala.png`, fullPage: true });
await sinDesborde("sala del anfitrión");

for (let i = 1; i < 10; i++) {
  await pages[i].goto(BASE_URL);
  await pages[i].fill("#nick", nickOf(i));
  await pages[i].fill("#code", code);
  await pages[i].getByRole("button", { name: "Unirme" }).click();
}
await host.getByRole("button", { name: "Repartir roles y empezar" }).waitFor({ timeout: 15000 });
await host.getByRole("button", { name: "Repartir roles y empezar" }).click();
for (const p of pages) await p.getByText("Primer día").first().waitFor({ timeout: 15000 });
comprobar("los diez jugadores llegan al primer día", true);
// Revelación del rol: un diálogo que tapa la pantalla hasta que el jugador entra al pueblo.
for (const p of pages) {
  const entrar = p.getByRole("button", { name: "Entrar al pueblo" });
  await entrar.click({ timeout: 10000 }).catch(() => {});
}
await sinDesborde("primer día");
await host.screenshot({ path: `${shots}/movil-dia.png`, fullPage: true });

// Discusión: el chat público llega al anfitrión.
await pages[1].getByText("Discusión").first().waitFor({ timeout: 60000 });
await pages[1].locator("textarea, input[placeholder='Escribe…']").first().fill("¡hola pueblo!");
await pages[1].getByRole("button", { name: "Enviar" }).click();
await host.getByText("¡hola pueblo!").waitFor({ timeout: 10000 });
comprobar("el chat público llega al anfitrión", true);
await sinDesborde("discusión");

// Votación: cada jugador toca a un objetivo y confirma. Todos votan a Jugador2 salvo Jugador2, que vota a Ana.
await pages[0].getByText("Votación").first().waitFor({ timeout: 120000 });
for (let i = 0; i < 10; i++) {
  const objetivo = i === 1 ? "Ana" : "Jugador2";
  await pages[i].getByRole("button", { name: objetivo, exact: true }).click();
  await pages[i].getByRole("button", { name: /^Votar a / }).click();
  await pages[i].getByText("Tu voto:").first().waitFor({ timeout: 10000 });
}
comprobar("los diez votos se registran en el móvil", true);
await sinDesborde("votación");
await pages[0].screenshot({ path: `${shots}/movil-votacion.png`, fullPage: true });

// Juicio: el acusado (Jugador2) no vota; los demás condenan.
// La defensa dura 20 s y el juicio otros 20 s: el botón aparece en esa ventana (el texto "Defensa" también sale en la tarjeta del rol).
const juicios = await Promise.all(pages.map(async (p, i) => {
  if (i === 1) return true;
  const culpable = p.getByRole("button", { name: "Culpable", exact: true });
  try {
    await culpable.waitFor({ timeout: 90000 });
    await culpable.click();
    return true;
  } catch {
    const titulo = await p.locator("h2").first().innerText().catch(() => "(sin título)");
    const avisos = await p.evaluate(() => window.__events);
    console.log(`  jugador ${i + 1}: sin botón Culpable · avisos recibidos ${avisos} · título "${titulo}"`);
    return false;
  }
}));
comprobar("el juicio: los nueve jurados ven y pulsan Culpable", juicios.every(Boolean));
await sinDesborde("juicio");
await pages[2].screenshot({ path: `${shots}/movil-juicio.png`, fullPage: true });

await pages[0].getByText("Noche").first().waitFor({ timeout: 120000 });
await sinDesborde("noche");
await pages[0].screenshot({ path: `${shots}/movil-noche.png`, fullPage: true });
comprobar("la partida llega a la noche tras el juicio", true);

await browser.close();
const fallos = resultados.filter((r) => !r.ok).length;
console.log(`errores de consola: ${errores.length}`);
for (const e of errores.slice(0, 8)) console.log(`  ${e}`);
console.log(`\n${resultados.length - fallos}/${resultados.length} comprobaciones correctas`);
process.exit(fallos === 0 ? 0 : 1);
