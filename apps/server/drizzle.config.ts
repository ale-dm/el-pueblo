import { defineConfig } from "drizzle-kit";
export default defineConfig({ dialect: "postgresql", schema: "./src/adapters/outbound/postgres/schema.ts", out: "./drizzle" });
