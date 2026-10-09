import { describe, expect, it } from "vitest";
import { checkStalemate, STALEMATE_WINNERS } from "../src/rules/stalemate.js";
import { ROLE_HANDLERS } from "../src/roles/registry.js";
import type { PlayerState, TrapState } from "../src/types/state.js";
import { game, ofType, step, timer } from "./helpers/game.js";

/** Jugador con su rol del registro (facción y habilidades reales). */
const player = (id: string, roleKey: string, extra: Partial<PlayerState> = {}): PlayerState => {
  const h = ROLE_HANDLERS.get(roleKey)!;
  const usesLeft: Record<string, number> = {};
  for (const a of [...h.nightAbilities, ...h.dayAbilities]) if (a.usesLimit !== null) usesLeft[a.key] = a.usesLimit;
  return { id, seat: 1, nick: id, roleKey, faction: h.faction, status: "alive", connected: true, deathReason: null, usesLeft, flags: {}, ...extra };
};

/** Dos vivos y, opcionalmente, trampas. */
const duel = (a: PlayerState, b: PlayerState, traps: Record<string, TrapState> = {}) => ({ players: [a, b], traps });

describe("detector de empate: celdas de la tabla (docs/wiki/Victory_ToS.md:393-1030)", () => {
  // Cada fila de STALEMATE_WINNERS es una celda con texto en la tabla; ver rules/stalemate.ts para las líneas.
  // Las celdas de la tabla son sin ejecuciones para el Jailor (Victory_ToS.md:1030): se prueba con 0 ejecuciones.
  const withoutExecutions = (roleKey: string) => player("px", roleKey, roleKey === "jailor" ? { usesLeft: { execute: 0 } } : {});
  it.each(STALEMATE_WINNERS)("%s contra %s: gana %s", (roleA, roleB, winner) => {
    expect(checkStalemate(duel({ ...withoutExecutions(roleA), id: "p1" }, { ...withoutExecutions(roleB), id: "p2" }))).toBe(winner);
    // La celda es simétrica: el orden de los jugadores no cambia el resultado.
    expect(checkStalemate(duel({ ...withoutExecutions(roleB), id: "p1" }, { ...withoutExecutions(roleA), id: "p2" }))).toBe(winner);
  });

  it("cualquier miembro de la Mafia gana 1 contra 1 frente a Tavern Keeper, aunque no esté en la tabla (Victory_ToS.md:39)", () => {
    expect(checkStalemate(duel(player("p1", "framer"), player("p2", "tavern_keeper")))).toBe("mafia");
    expect(checkStalemate(duel(player("p1", "tavern_keeper"), player("p2", "ambusher")))).toBe("mafia");
  });

  it("cualquier miembro de la Mafia gana frente a un Jailor sin ejecuciones (Victory_ToS.md:39, 1030)", () => {
    const jailor = player("p2", "jailor", { usesLeft: { execute: 0 } });
    expect(checkStalemate(duel(player("p1", "bootlegger"), jailor))).toBe("mafia");
  });

  it("un miembro de la Mafia frente a un Transporter no está en la tabla: la partida sigue (Victory_ToS.md:33)", () => {
    expect(checkStalemate(duel(player("p1", "framer"), player("p2", "transporter")))).toBeNull();
  });

  it("Godfather contra Veteran: celda vacía, la partida sigue (Victory_ToS.md:538-544)", () => {
    expect(checkStalemate(duel(player("p1", "godfather"), player("p2", "veteran")))).toBeNull();
  });

  it("Transporter contra Tavern Keeper y contra Jailor: celdas vacías, la partida sigue (Victory_ToS.md:640-668, 672-704)", () => {
    expect(checkStalemate(duel(player("p1", "transporter"), player("p2", "tavern_keeper")))).toBeNull();
    expect(checkStalemate(duel(player("p1", "transporter"), player("p2", "jailor")))).toBeNull();
  });

  it("Tavern Keeper contra Jailor: celda vacía, la partida sigue (Victory_ToS.md:672-704)", () => {
    expect(checkStalemate(duel(player("p1", "tavern_keeper"), player("p2", "jailor")))).toBeNull();
  });

  it("fuera de MVP no hay decisión: Serial Killer contra Transporter no se resuelve aquí (SKIPPED, no está en el registro MVP)", () => {
    const sk: PlayerState = { ...player("p1", "transporter"), roleKey: "serial_killer", faction: "neutral" };
    expect(checkStalemate(duel(sk, player("p2", "transporter")))).toBeNull();
  });
});

describe("detector de empate: condiciones (wiki)", () => {
  it("solo se activa con dos vivos (Victory_ToS.md:393)", () => {
    const s = { players: [player("p1", "godfather"), player("p2", "jailor"), player("p3", "investigator", { status: "dead" })], traps: {} };
    expect(checkStalemate({ ...s, players: [...s.players, player("p4", "sheriff")] })).toBeNull();
    expect(checkStalemate({ ...s, players: [player("p1", "godfather"), player("p2", "jailor", { status: "dead" })] })).toBeNull();
  });

  it("dos vivos de la misma facción no son un empate entre facciones opuestas (Victory_ToS.md:393)", () => {
    expect(checkStalemate(duel(player("p1", "godfather"), player("p2", "mafioso")))).toBeNull();
  });

  it("una trampa colocada sobre uno de los dos impide el detector (Victory_ToS.md:395)", () => {
    const traps = { p3: { targetId: "p2", readyDay: 2 } };
    expect(checkStalemate(duel(player("p1", "godfather"), player("p2", "jailor"), traps))).toBeNull();
    // Y lo impide también si está puesta sobre el otro.
    const onOther = { p3: { targetId: "p1", readyDay: 2 } };
    expect(checkStalemate(duel(player("p1", "godfather"), player("p2", "jailor"), onOther))).toBeNull();
  });

  it("una trampa construida y no colocada no impide el detector (Trapper.md:213)", () => {
    const traps = { p3: { targetId: null, readyDay: 2 } };
    expect(checkStalemate(duel(player("p1", "godfather"), player("p2", "jailor", { usesLeft: { execute: 0 } }), traps))).toBe("mafia");
  });

  it("un Jailor con ejecuciones no deja ganar al rival (Victory_ToS.md:1030)", () => {
    const jailor = player("p2", "jailor");
    expect(jailor.usesLeft["execute"]).toBeGreaterThan(0);
    expect(checkStalemate(duel(player("p1", "godfather"), jailor))).toBeNull();
  });

  it("un Jailor sin ejecuciones sí deja ganar a la Mafia (Victory_ToS.md:39, 1030)", () => {
    const jailor = player("p2", "jailor", { usesLeft: { execute: 0 } });
    expect(checkStalemate(duel(player("p1", "mafioso"), jailor))).toBe("mafia");
  });

  it("un Jailor que ya ejecutó a un Town no tiene ejecuciones (Jailor.md, noExecute)", () => {
    const jailor = player("p2", "jailor", { flags: {} });
    expect(checkStalemate(duel(player("p1", "godfather"), jailor))).toBeNull();
    const spent = player("p2", "jailor", { usesLeft: { execute: 2 }, flags: { noExecute: true } });
    expect(checkStalemate(duel(player("p1", "godfather"), spent))).toBe("mafia");
  });
});

describe("detector de empate: la victoria se aplica en la noche (wiki: Victory_ToS.md:9-11)", () => {
  // La noche deja al Godfather (p1) y al Transporter (p2) vivos: la Mafia gana por la tabla (Victory_ToS.md:538).
  // Nota: un Mafioso que se queda solo asciende a Godfather antes de comprobar la victoria (Mafioso.md), así que
  // "Mafioso contra Transporter" no ocurre con el Mafioso como tal en la partida; la celda se prueba arriba.
  const nightKill = (roles: string[], extra: Parameters<typeof game>[1] = {}) => {
    let s = game(roles, { dayNumber: 2, ...extra });
    s = step(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p3", secondTargetId: null }).state;
    return step(s, timer()).events;
  };

  it("Godfather contra Transporter: al amanecer gana la Mafia", () => {
    const events = nightKill(["godfather", "transporter", "investigator"]);
    expect(ofType(events, "game.ended")[0]?.payload).toEqual({ winner: "mafia" });
  });

  it("con un Jailor que aún tiene ejecuciones, el empate no cierra la partida (Victory_ToS.md:1030)", () => {
    const events = nightKill(["godfather", "jailor", "investigator"]);
    expect(ofType(events, "game.ended")).toHaveLength(0);
  });

  it("sin ejecuciones, el mismo empate sí cierra la partida con la victoria de la Mafia", () => {
    let s = game(["godfather", "jailor", "investigator"], { dayNumber: 2 });
    s = { ...s, players: s.players.map((p) => (p.id === "p2" ? { ...p, usesLeft: { execute: 0 } } : p)) };
    s = step(s, { type: "night.action", actorId: "p1", ability: "kill", targetId: "p3", secondTargetId: null }).state;
    const events = step(s, timer()).events;
    expect(ofType(events, "game.ended")[0]?.payload).toEqual({ winner: "mafia" });
  });
});
