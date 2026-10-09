import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Avisos privados de la noche: [a quién, qué aviso]. */
const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

/** Cierra la noche tras las acciones dadas. */
function resolve(state: GameState, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("Vigilante y Veteran: cuántos usos les quedan (wiki: Vigilante, Veteran)", () => {
  it("el Vigilante que dispara ve sus balas restantes, en privado", () => {
    const { events } = resolve(game(["vigilante", "godfather"], { dayNumber: 2 }), [night("p1", "shoot", "p2")]);
    expect(ofType(events, "uses.left").map((e) => e.payload)).toEqual([{ playerId: "p1", ability: "shoot", left: 2 }]);
    const left = events.find((e) => e.type === "uses.left")!;
    expect(left.visibility).toBe("private");
    expect(left.audiencePlayerId).toBe("p1");
  });

  it("el Veteran que se pone en alerta ve sus alertas restantes", () => {
    const { events } = resolve(game(["veteran", "godfather"]), [night("p1", "alert", null)]);
    expect(ofType(events, "uses.left").map((e) => e.payload)).toEqual([{ playerId: "p1", ability: "alert", left: 2 }]);
  });

  it("quien no gasta uso no recibe el aviso", () => {
    const { events } = resolve(game(["vigilante", "godfather"], { dayNumber: 2 }), [night("p2", "kill", "p1")]);
    expect(ofType(events, "uses.left")).toHaveLength(0);
  });
});

describe("Janitor: el rol del limpiado (wiki: Janitor.md:214)", () => {
  it("el Janitor sabe al amanecer el rol real de su objetivo si muere esa noche, en privado", () => {
    const { events } = resolve(game(["janitor", "godfather", "investigator"]), [night("p1", "clean", "p3"), night("p2", "kill", "p3")]);
    expect(ofType(events, "clean.revealed").map((e) => e.payload)).toEqual([{ janitorId: "p1", playerId: "p3", roleKey: "investigator" }]);
    const reveal = events.find((e) => e.type === "clean.revealed")!;
    expect(reveal.visibility).toBe("private");
    expect(reveal.audiencePlayerId).toBe("p1");
  });

  it("si el limpiado no muere esa noche, no hay aviso de rol", () => {
    const { events } = resolve(game(["janitor", "investigator", "godfather"]), [night("p1", "clean", "p2")]);
    expect(ofType(events, "clean.revealed")).toHaveLength(0);
  });
});

describe("Doctor: el curado recibe el aviso (wiki: Doctor.md:225, 253)", () => {
  it("el objetivo atacado y curado recibe 'alguien te curó'", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator"]), [night("p1", "kill", "p3"), night("p2", "heal", "p3")]);
    expect(notices(events)).toEqual([["p3", "healed"]]);
  });

  it("sin curación no hay aviso de curado", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator"]), [night("p1", "kill", "p3")]);
    expect(notices(events).some(([, n]) => n === "healed")).toBe(false);
  });

  it("dos Doctors que curan al mismo objetivo dan un solo aviso", () => {
    const { events } = resolve(game(["godfather", "doctor", "doctor", "investigator"]), [night("p1", "kill", "p4"), night("p2", "heal", "p4"), night("p3", "heal", "p4")]);
    expect(notices(events).filter(([, n]) => n === "healed")).toEqual([["p4", "healed"]]);
  });
});

describe("Jailor: el prisionero sabe la ejecución (wiki: Jailor.md:282, 284)", () => {
  const jailed = () => {
    const s = game(["jailor", "godfather", "investigator"], { dayNumber: 2, jailedBy: { p3: "p1" } });
    s.players[2] = { ...s.players[2]!, flags: { jailed: true } };
    return s;
  };

  it("el prisionero recibe el aviso cuando el Jailor decide ejecutarle", () => {
    const { events } = step(jailed(), night("p1", "execute", "p3"));
    expect(notices(events)).toEqual([["p3", "jailor_execute"]]);
  });

  it("si el Jailor cancela la ejecución, el prisionero recibe que ha cambiado de opinión", () => {
    const s = step(jailed(), night("p1", "execute", "p3")).state;
    const { events } = step(s, { type: "night.action.cancel", actorId: "p1" });
    expect(notices(events)).toEqual([["p3", "jailor_changed_mind"]]);
  });

  it("volver a elegir la misma ejecución no repite el aviso", () => {
    const s = step(jailed(), night("p1", "execute", "p3")).state;
    const { events } = step(s, night("p1", "execute", "p3"));
    expect(notices(events)).toEqual([]);
  });
});

describe("Psíquica: sin visión cuando no hay suficientes jugadores (wiki: Psychic.md:318, 322)", () => {
  it("noche impar con tres vivos: aviso de pueblo pequeño y ninguna visión", () => {
    const { events } = resolve(game(["psychic", "godfather", "investigator"], { dayNumber: 3 }), []);
    expect(notices(events)).toEqual([["p1", "psychic_small"]]);
    expect(ofType(events, "investigation.result").some((e) => e.payload.investigatorId === "p1")).toBe(false);
  });

  it("noche par sin otro Town ni Neutral Benign vivo: aviso de pueblo malvado y ninguna visión", () => {
    const { events } = resolve(game(["psychic", "godfather", "mafioso"], { dayNumber: 2 }), []);
    expect(notices(events)).toEqual([["p1", "psychic_evil"]]);
    expect(ofType(events, "investigation.result").some((e) => e.payload.investigatorId === "p1")).toBe(false);
  });

  it("noche par con otro Town vivo: sigue la visión, sin aviso", () => {
    const { events } = resolve(game(["psychic", "godfather", "investigator"], { dayNumber: 2 }), []);
    expect(notices(events).some(([, n]) => n === "psychic_evil")).toBe(false);
    expect(ofType(events, "investigation.result").some((e) => e.payload.investigatorId === "p1" && e.payload.check === "vision")).toBe(true);
  });

  it("un Neutral Benign vivo cuenta como bueno en noche par", () => {
    const s = game(["psychic", "godfather", "investigator"], { dayNumber: 2 });
    s.players[2] = { ...s.players[2]!, roleKey: "survivor", faction: "neutral" };
    const { events } = resolve(s, []);
    expect(notices(events).some(([, n]) => n === "psychic_evil")).toBe(false);
  });
});
