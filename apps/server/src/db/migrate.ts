// Arranque del servidor: aplica migraciones pendientes y siembra el catálogo si cambió.
// Se ejecuta desde el entrypoint del contenedor, con el directorio de trabajo en la raíz del repo (/app).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { seedCatalog } from "./seed.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "apps/server/drizzle" });
const { seeded, skipped } = await seedCatalog(db, { catalogDir: "data/catalog", wikiDir: "data/wiki" });
console.log(`[migrate] catálogo: sembrado ${seeded.join(", ") || "-"}; sin cambios ${skipped.join(", ") || "-"}`);

await client.end();
