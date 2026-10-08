import { describe, expect, it } from "vitest";
import { ConcurrencyError } from "../../src/application/errors.js";
import { InMemoryEventLog } from "../../src/adapters/outbound/memory/stores.js";
import type { GameEventEnvelope } from "@el-pueblo/engine";

const ev = (seq: number): GameEventEnvelope => ({
  seq, type: "phase.started", payload: { phase: "discussion", dayNumber: 1 }, visibility: "public", audiencePlayerId: null,
});

describe("InMemoryEventLog", () => {
  it("añade eventos cuando el último seq coincide", async () => {
    const log = new InMemoryEventLog();
    await log.append("m", 0, [ev(1), ev(2)]);
    expect(await log.lastSeq("m")).toBe(2);
  });

  it("rechaza la escritura si otro escritor avanzó la secuencia (control optimista)", async () => {
    const log = new InMemoryEventLog();
    await log.append("m", 0, [ev(1)]);
    await expect(log.append("m", 0, [ev(2)])).rejects.toBeInstanceOf(ConcurrencyError);
    expect(await log.read("m")).toHaveLength(1);
  });
});
