import { describe, expect, it } from "vitest";
import { InMemoryEventLog } from "../../src/adapters/outbound/memory/stores.js";

/**
 * Regresión: el almacén en memoria aplica la misma restricción que la BD (lo privado tiene destinatario). Antes lo
 * aceptaba y el fallo solo aparecía en producción.
 */
describe("almacén de eventos: lo privado tiene destinatario", () => {
  it("rechaza un evento privado sin destinatario, como la base de datos", async () => {
    const log = new InMemoryEventLog();
    const event = { seq: 1, type: "effect.cleared", payload: { targetId: "p1", flag: "framed" }, visibility: "private", audiencePlayerId: null } as never;
    await expect(log.append("m1", 0, [event])).rejects.toThrow(/Evento privado sin destinatario: effect.cleared/);
  });
});
