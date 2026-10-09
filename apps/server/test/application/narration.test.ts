import { describe, expect, it } from "vitest";
import type { GameEventEnvelope } from "@el-pueblo/engine";
import { factsFromEvents } from "../../src/application/narration/facts.js";
import { TemplateNarrator } from "../../src/adapters/outbound/narrator/template.js";
import { GeminiNarrator, type TextModel } from "../../src/adapters/outbound/narrator/gemini.js";
import { createTestApp } from "../helpers/testApp.js";

const nickOf = (id: string) => ({ a: "Ana", b: "Bea", c: "Cy" })[id as "a" | "b" | "c"] ?? "?";
const roleOf = (key: string) => ({ godfather: "Godfather", doctor: "Doctor" })[key] ?? null;

describe("hechos para el narrador", () => {
  it("usa solo eventos públicos: lo privado nunca llega al narrador", () => {
    const events: GameEventEnvelope[] = [
      { seq: 1, type: "investigation.result", payload: { investigatorId: "a", targetId: "b", result: "suspicious" }, visibility: "private", audiencePlayerId: "a" },
      { seq: 2, type: "attack.prevented", payload: { victimId: "b", protectorId: "c" }, visibility: "private", audiencePlayerId: "c" },
      { seq: 3, type: "night.resolved", payload: { dayNumber: 1 }, visibility: "public", audiencePlayerId: null },
    ];
    const facts = factsFromEvents(events, nickOf, roleOf);
    expect(facts).toEqual([{ kind: "night", dayNumber: 1, deaths: [] }]);
  });

  it("una noche con muertes recoge el nombre, la causa y el rol revelado", () => {
    const events: GameEventEnvelope[] = [
      { seq: 1, type: "player.killed", payload: { playerId: "b", cause: "mafia", roleKey: "doctor" }, visibility: "public", audiencePlayerId: null },
      { seq: 2, type: "night.resolved", payload: { dayNumber: 2 }, visibility: "public", audiencePlayerId: null },
    ];
    expect(factsFromEvents(events, nickOf, roleOf)).toEqual([
      { kind: "night", dayNumber: 2, deaths: [{ nick: "Bea", cause: "mafia", role: "Doctor" }] },
    ]);
  });
});

describe("narradores", () => {
  it("la plantilla describe las muertes en español", async () => {
    const out = await new TemplateNarrator().narrate([
      { kind: "night", dayNumber: 1, deaths: [{ nick: "Bea", cause: "mafia", role: "Doctor" }] },
    ]);
    expect(out.source).toBe("template");
    expect(out.text).toContain("Bea amanece muerto");
    expect(out.text).toContain("la Mafia");
    expect(out.text).toContain("Era Doctor");
  });

  it("Gemini: si responde, se usa su texto y se registra el modelo", async () => {
    const model: TextModel = { generate: async () => ({ text: "  La niebla cubre el pueblo.  ", inputTokens: 40, outputTokens: 12 }) };
    const out = await new GeminiNarrator(model, "gemini-test", 1000).narrate([{ kind: "day", dayNumber: 1 }]);
    expect(out).toMatchObject({ text: "La niebla cubre el pueblo.", source: "gemini", model: "gemini-test", inputTokens: 40 });
  });

  it("Gemini: si falla, agota el tiempo o responde vacío, se usan plantillas", async () => {
    const failing: TextModel = { generate: async () => { throw new Error("RESOURCE_EXHAUSTED"); } };
    const logs: string[] = [];
    const out = await new GeminiNarrator(failing, "m", 1000, (l) => logs.push(l)).narrate([{ kind: "day", dayNumber: 3 }]);
    expect(out.source).toBe("template");
    expect(out.text).toContain("Día 3");
    expect(logs[0]).toContain("RESOURCE_EXHAUSTED");

    const empty: TextModel = { generate: async () => ({ text: "   ", inputTokens: null, outputTokens: null }) };
    expect((await new GeminiNarrator(empty, "m", 1000).narrate([{ kind: "day", dayNumber: 1 }])).source).toBe("template");
  });
});

describe("narración durante una partida", () => {
  it("cada noche con muertes se narra y el texto no revela roles vivos", async () => {
    const app = createTestApp();
    const host = await app.services.createRoom({ nick: "P1" });
    const players: Array<{ playerId: string; token: string; matchId: string }> = [host];
    for (let i = 2; i <= 10; i++) players.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
    await app.services.startMatch({ matchId: host.matchId, token: host.token });

    const roster = await app.players.listByMatch(host.matchId);
    const godfather = roster.find((p) => p.roleKey === "godfather")!;
    const godToken = players.find((p) => p.playerId === godfather.id)!.token;
    const victim = roster.find((p) => p.faction === "town")!;
    const tick = () => app.services.advance(host.matchId);

    await tick(); // día 1 → noche 1 (sin votación en el día 1)
    await app.services.submitCommand({
      matchId: host.matchId, token: godToken,
      command: { type: "night.action", actorId: godfather.id, ability: "kill", targetId: victim.id },
    });
    await tick(); // noche 1 resuelta

    await app.services.drainNarrations();
    const stored = await app.narrations.listByMatch(host.matchId);
    const nightText = stored.map((n) => n.text).join(" ");
    expect(nightText).toContain(victim.nick);

    // Ningún texto revela el rol de un jugador que sigue vivo.
    const alive = roster.filter((p) => p.id !== victim.id);
    for (const p of alive) {
      if (!p.roleKey) continue;
      const roleName = p.roleKey;
      expect(nightText.toLowerCase()).not.toContain(roleName);
    }
    expect(app.broadcaster.narrations.length).toBeGreaterThan(0);
  });
});
