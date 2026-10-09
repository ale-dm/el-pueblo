import { describe, expect, it } from "vitest";
import { applyAll, game, ofType, rejected, step, timer, types } from "./helpers/game.js";
import { apply } from "../src/core/apply.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Envía las acciones y cierra la noche. Devuelve los eventos de la resolución. */
function resolve(state: ReturnType<typeof game>, actions: Array<ReturnType<typeof night>>) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  return step(s, timer());
}

describe("noche: protecciones y ataques", () => {
  it("el Doctor salva a su objetivo del ataque de la Mafia", () => {
    const s = game(["godfather", "doctor", "investigator"]);
    const { events } = resolve(s, [night("p1", "kill", "p3"), night("p2", "heal", "p3")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(ofType(events, "attack.prevented")[0]?.payload).toEqual({ victimId: "p3", protectorId: "p2" });
  });

  it("sin Doctor, el objetivo de la Mafia muere con causa mafia", () => {
    const s = game(["godfather", "doctor", "investigator"]);
    const { events } = resolve(s, [night("p1", "kill", "p3")]);
    expect(ofType(events, "player.killed")[0]?.payload).toMatchObject({ playerId: "p3", cause: "mafia", roleKey: "investigator" });
  });

  it("el Godfather da la orden: prevalece su objetivo sobre el del Mafioso", () => {
    const s = game(["godfather", "mafioso", "investigator", "sheriff"]);
    const { events } = resolve(s, [night("p2", "kill", "p4"), night("p1", "kill", "p3")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p3"]);
  });

  it("el Mafioso mata a su objetivo si no hay Godfather que dé orden", () => {
    const s = game(["mafioso", "investigator", "sheriff"]);
    const { events } = resolve(s, [night("p1", "kill", "p3")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p3"]);
  });

  it("el Bootlegger bloquea al Doctor y su protección no cuenta", () => {
    const s = game(["godfather", "bootlegger", "doctor", "investigator"]);
    const { events } = resolve(s, [
      night("p1", "kill", "p4"),
      night("p2", "distract", "p3"),
      night("p3", "heal", "p4"),
    ]);
    expect(ofType(events, "night.action.blocked")[0]?.payload).toEqual({ actorId: "p3", ability: "heal" });
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p4"]);
  });

  it("el Tavern Keeper no puede ser bloqueado: su acción sigue activa", () => {
    const s = game(["bootlegger", "tavern_keeper", "investigator"]);
    const { events } = resolve(s, [night("p1", "distract", "p2"), night("p2", "distract", "p3")]);
    expect(ofType(events, "night.action.blocked")).toEqual([]);
    expect(ofType(events, "night.action.submitted")).toHaveLength(0);
  });

  it("el Transporter cambia los objetivos: el ataque cae en el otro jugador", () => {
    const s = game(["godfather", "transporter", "doctor", "investigator", "sheriff"]);
    const { events } = resolve(s, [
      night("p1", "kill", "p4"),
      night("p2", "transport", "p4", "p5"),
      night("p3", "heal", "p4"),
    ]);
    // El transporte redirige todas las acciones: la Mafia y el Doctor pasan a p5. Se protegen mutuamente.
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(ofType(events, "attack.prevented")[0]?.payload.victimId).toBe("p5");
  });

  it("el Bodyguard: el atacante y el guardaespaldas mueren, el protegido sobrevive", () => {
    const s = game(["godfather", "bodyguard", "investigator"]);
    const { events, state } = resolve(s, [night("p1", "kill", "p3"), night("p2", "protect", "p3")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([
      ["p1", "bodyguard"],
      ["p2", "bodyguard"],
    ]);
    expect(state.players.find((p) => p.id === "p3")?.status).toBe("alive");
  });

  it("el Vigilante que dispara a un Town muere por culpa", () => {
    const s = game(["vigilante", "investigator", "godfather"]);
    const { events } = resolve(s, [night("p1", "shoot", "p2")]);
    const deaths = ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause]);
    expect(deaths).toEqual([
      ["p2", "shot"],
      ["p1", "guilt"],
    ]);
  });

  it("el Vigilante que dispara a la Mafia sobrevive", () => {
    const s = game(["vigilante", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "shoot", "p2")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p2"]);
  });

  it("el Veteran en alerta mata a quien le visita", () => {
    const s = game(["veteran", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "alert", null), night("p2", "kill", "p1")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([
      ["p2", "veteran"],
    ]);
  });

  it("el Crusader protege a su objetivo y mata al Godfather que lo visita", () => {
    const s = game(["crusader", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "protect", "p3"), night("p2", "kill", "p3")]);
    expect(ofType(events, "attack.prevented")).toHaveLength(1);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p2", "crusade"]]);
  });
});

describe("noche: investigaciones", () => {
  it("el Sheriff ve sospechoso a un Mafioso y a un Godfather inocente", () => {
    const s = game(["mafioso", "godfather", "sheriff"]);
    const { events } = resolve(s, [night("p3", "interrogate", "p1")]);
    const results = ofType(events, "investigation.result").map((e) => [e.payload.investigatorId, e.payload.result]);
    expect(results).toContainEqual(["p3", "suspicious"]);
    const godfatherCheck = game(["godfather", "sheriff"]);
    const r = resolve(godfatherCheck, [night("p2", "interrogate", "p1")]);
    expect(ofType(r.events, "investigation.result")[0]?.payload.result).toBe("innocent");
  });

  it("el Framer hace sospechoso a un Town para el Sheriff", () => {
    const s = game(["framer", "sheriff", "investigator"]);
    const { events } = resolve(s, [night("p1", "frame", "p3"), night("p2", "interrogate", "p3")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("suspicious");
    expect(ofType(events, "effect.applied")[0]?.payload).toEqual({ actorId: "p1", targetId: "p3", flag: "framed" });
  });

  it("el Lookout ve a quién visita su objetivo", () => {
    const s = game(["lookout", "sheriff", "godfather"]);
    const { events } = resolve(s, [night("p1", "watch", "p3"), night("p2", "interrogate", "p3"), night("p3", "kill", "p1")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("P2");
  });

  it("el Tracker ve a qué casas va su objetivo", () => {
    const s = game(["tracker", "sheriff", "investigator"]);
    const { events } = resolve(s, [night("p1", "track", "p2"), night("p2", "interrogate", "p3")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("P3");
  });

  it("el Consigliere ve el rol exacto", () => {
    const s = game(["godfather", "consigliere", "sheriff"]);
    const { events } = resolve(s, [night("p2", "check", "p3")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("Sheriff");
  });
});

describe("noche: jailor y trampero", () => {
  it("el Jailor encarcela de día y ejecuta de noche", () => {
    // Día 2: en la noche 1 el Jailor no puede ejecutar (ver jailor.test.ts).
    let s = game(["jailor", "investigator", "godfather"], { phase: "discussion", dayNumber: 2 });
    s = step(s, { type: "day.action", actorId: "p1", ability: "jail", targetId: "p2" }).state;
    expect(s.players.find((p) => p.id === "p2")?.flags.jailed).toBe(true);
    s = step(s, timer()).state; // voting
    s = step(s, timer()).state; // night
    s = step(s, night("p1", "execute", "p2")).state;
    const closed = step(s, timer());
    expect(ofType(closed.events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([
      ["p2", "execute"],
    ]);
  });

  it("no se puede ejecutar a quien no está encarcelado", () => {
    const s = game(["jailor", "investigator"], { phase: "night", dayNumber: 2 });
    expect(rejected(s, night("p1", "execute", "p2"))).toMatch(/encarcelado/);
  });

  it("la trampa se activa la noche siguiente sobre quien visite a su objetivo", () => {
    let s = game(["trapper", "investigator", "sheriff", "godfather"]);
    s = resolve(s, [night("p1", "trap", "p2")]).state; // noche 1, termina en discusión del día 2
    expect(s.traps["p1"]).toEqual({ targetId: "p2", readyDay: 2 });
    s = step(s, timer()).state; // discusión → votación
    s = step(s, timer()).state; // votación → noche 2
    const { events } = resolve(s, [night("p3", "interrogate", "p2")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p3", "trap"]]);
  });

  it("la trampa colocada esta noche no se activa esta noche", () => {
    const s = game(["trapper", "sheriff"]);
    const { events } = resolve(s, [night("p1", "trap", "p2"), night("p2", "interrogate", "p1")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
  });
});

describe("noche: victoria y muertos", () => {
  it("la Mafia gana cuando no queda ningún Town vivo", () => {
    const s = game(["godfather", "investigator"]);
    const { events, state } = resolve(s, [night("p1", "kill", "p2")]);
    expect(types(events).at(-1)).toBe("game.ended");
    expect(ofType(events, "game.ended")[0]?.payload.winner).toBe("mafia");
    expect(state.phase).toBe("ended");
  });

  it("un jugador muerto no puede actuar de noche", () => {
    const s = game(["godfather", "investigator"]);
    const dead = applyAll(s, [{ seq: 1, type: "player.killed", payload: { playerId: "p1", cause: "x", roleKey: null, will: null }, visibility: "public", audiencePlayerId: null }]);
    expect(apply(dead, { seq: 2, type: "phase.started", payload: { phase: "night", dayNumber: 1 }, visibility: "public", audiencePlayerId: null }).phase).toBe("night");
  });
});
