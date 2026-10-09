import { describe, expect, it } from "vitest";
import { game, ofType, rejected, step, timer } from "./helpers/game.js";
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

describe("Blackmailer y cárcel (wiki: Blackmailer.md:221, 395)", () => {
  // p1 Jailor encarcela de día a p3; p2 es el Blackmailer; llega la noche.
  const jailedNight = () => {
    let s = game(["jailor", "blackmailer", "investigator", "godfather"], { phase: "discussion", dayNumber: 2 });
    s = step(s, { type: "day.action", actorId: "p1", ability: "jail", targetId: "p3" }).state;
    return step({ ...s, phase: "voting" }, timer()).state;
  };
  const blackmailJailed = () => step(jailedNight(), { type: "night.action", actorId: "p2", ability: "blackmail", targetId: "p3", secondTargetId: null }).state;

  it("no silencia a un encarcelado, y él lo sabe con el aviso de la wiki", () => {
    const { events } = step(blackmailJailed(), timer());
    expect(ofType(events, "player.blackmailed")).toHaveLength(0);
    expect(notices(events)).toContainEqual(["p3", "blackmail_jailed"]);
  });

  it("el Blackmailer sabe que su visita falló", () => {
    const { events } = step(blackmailJailed(), timer());
    expect(notices(events)).toContainEqual(["p2", "target_jailed"]);
  });

  it("sin cárcel, el silencio sí se aplica y no hay aviso de cárcel", () => {
    const s = game(["blackmailer", "investigator", "godfather"], { phase: "night", dayNumber: 2 });
    const { events } = step(step(s, { type: "night.action", actorId: "p1", ability: "blackmail", targetId: "p2", secondTargetId: null }).state, timer());
    expect(ofType(events, "player.blackmailed").map((e) => e.payload.targetId)).toEqual(["p2"]);
    expect(notices(events).some(([, n]) => n === "blackmail_jailed")).toBe(false);
  });
});

describe("Bodyguard: chaleco antibalas (wiki: Bodyguard.md:240-250, 444)", () => {
  it("el chaleco detiene un ataque Basic, sin contraataque, y el Bodyguard recibe el aviso", () => {
    const { events, state } = resolve(game(["bodyguard", "godfather", "investigator"]), [night("p1", "vest", null), night("p2", "kill", "p1")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(state.players.find((p) => p.id === "p2")?.status).toBe("alive");
    expect(notices(events)).toContainEqual(["p1", "vest_saved"]);
  });

  it("el chaleco se usa una sola vez por partida", () => {
    const first = resolve(game(["bodyguard", "godfather", "investigator"]), [night("p1", "vest", null)]);
    expect(rejected({ ...first.state, phase: "night", dayNumber: 3 }, { type: "night.action", actorId: "p1", ability: "vest", targetId: null, secondTargetId: null })).toMatch(/usos/);
  });

  it("el chaleco sigue al Bodyguard si lo transportan", () => {
    // p2 transporta a p1 con p3; el Godfather ataca a p3, que ahora está en la casa de p1, y el chaleco de p1 lo para.
    const { events } = resolve(game(["bodyguard", "transporter", "investigator", "godfather"]), [night("p1", "vest", null), night("p2", "transport", "p1", "p3"), night("p4", "kill", "p3")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(notices(events)).toContainEqual(["p1", "vest_saved"]);
  });
});

describe("Veteran: la alerta bloquea a un atacante Basic (wiki: Veteran.md:486)", () => {
  it("el Veteran en alerta que detiene a un atacante Basic recibe el aviso de la wiki", () => {
    const { events } = resolve(game(["veteran", "godfather", "investigator"]), [night("p1", "alert", null), night("p2", "kill", "p1")]);
    expect(notices(events)).toContainEqual(["p1", "alert_blocked"]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p2"]);
  });

  it("si la curación detiene el ataque, el Veteran no recibe el aviso de alerta", () => {
    const { events } = resolve(game(["veteran", "godfather", "doctor"]), [night("p1", "alert", null), night("p2", "kill", "p1"), night("p3", "heal", "p1")]);
    expect(notices(events).some(([, n]) => n === "alert_blocked")).toBe(false);
  });

  it("el Veteran sin alerta no recibe el aviso", () => {
    const { events } = resolve(game(["veteran", "godfather", "investigator"]), [night("p2", "kill", "p1")]);
    expect(notices(events).some(([, n]) => n === "alert_blocked")).toBe(false);
  });
});

describe("Vigilante: mensajes de la culpa (wiki: Vigilante.md:362, 370)", () => {
  it("el Vigilante que mata a un Town recibe 'guardar la pistola' esa noche", () => {
    const { events } = resolve(game(["vigilante", "godfather", "investigator", "sheriff"], { dayNumber: 2 }), [night("p1", "shoot", "p3")]);
    expect(notices(events)).toContainEqual(["p1", "vigilante_put_away_gun"]);
  });

  it("el Vigilante que dispara y no mata no recibe ese aviso", () => {
    const { events } = resolve(game(["vigilante", "godfather", "doctor", "investigator"], { dayNumber: 2 }), [night("p1", "shoot", "p4"), night("p3", "heal", "p4")]);
    expect(notices(events).some(([, n]) => n === "vigilante_put_away_gun")).toBe(false);
  });

  it("la noche siguiente, el Vigilante se quita la vida por culpa y lo sabe", () => {
    const first = resolve(game(["vigilante", "godfather", "investigator", "sheriff"], { dayNumber: 2 }), [night("p1", "shoot", "p3")]);
    const second = step({ ...first.state, phase: "night", dayNumber: 3 }, timer());
    expect(notices(second.events)).toEqual([["p1", "vigilante_guilt_suicide"]]);
    expect(ofType(second.events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p1", "guilt"]]);
  });
});

describe("Janitor: el rol del limpiado (wiki: Janitor.md:214)", () => {
  it("el Janitor sabe al amanecer el rol real de su objetivo si muere esa noche, en privado", () => {
    const { events } = resolve(game(["janitor", "godfather", "investigator"]), [night("p1", "clean", "p3"), night("p2", "kill", "p3")]);
    expect(ofType(events, "clean.revealed").map((e) => e.payload)).toEqual([{ janitorId: "p1", playerId: "p3", roleKey: "investigator", will: null }]);
    const reveal = events.find((e) => e.type === "clean.revealed")!;
    expect(reveal.visibility).toBe("private");
    expect(reveal.audiencePlayerId).toBe("p1");
  });

  it("el Janitor lee el testamento original de quien limpió, y el resto no lo ve (wiki: Janitor.md:222-228)", () => {
    const s0 = game(["janitor", "godfather", "investigator"]);
    s0.wills = { p3: "Sospecho de P2." };
    const { events } = resolve(s0, [night("p1", "clean", "p3"), night("p2", "kill", "p3")]);
    const reveal = events.find((e) => e.type === "clean.revealed")!;
    expect(reveal.payload).toMatchObject({ janitorId: "p1", will: "Sospecho de P2." });
    expect(reveal.visibility).toBe("private");
    expect(ofType(events, "player.killed").find((e) => e.payload.playerId === "p3")?.payload.will).toBeNull();
  });

  it("si el limpiado no muere esa noche, no hay aviso de rol", () => {
    const { events } = resolve(game(["janitor", "investigator", "godfather"]), [night("p1", "clean", "p2")]);
    expect(ofType(events, "clean.revealed")).toHaveLength(0);
  });
});

describe("Doctor: el curado recibe el aviso (wiki: Doctor.md:225, 253)", () => {
  it("el objetivo atacado y curado recibe 'alguien te curó'", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator"]), [night("p1", "kill", "p3"), night("p2", "heal", "p3")]);
    // El Doctor que curó recibe su aviso de atacado (Doctor.md:223).
    expect(notices(events)).toEqual([["p3", "healed"], ["p2", "target_attacked"]]);
  });

  it("sin curación no hay aviso de curado", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator"]), [night("p1", "kill", "p3")]);
    expect(notices(events).some(([, n]) => n === "healed")).toBe(false);
  });

  it("el Doctor que cura con éxito a un atacado recibe su aviso, una sola vez", () => {
    const { events } = resolve(game(["godfather", "doctor", "vigilante", "investigator"], { dayNumber: 2 }), [night("p1", "kill", "p4"), night("p2", "heal", "p4"), night("p3", "shoot", "p4")]);
    expect(notices(events).filter(([, n]) => n === "target_attacked")).toEqual([["p2", "target_attacked"]]);
    // Un aviso de curado por ataque (Doctor.md:253, 255): dos ataques, dos avisos al objetivo.
    expect(notices(events).filter(([, n]) => n === "healed")).toEqual([["p4", "healed"], ["p4", "healed"]]);
  });

  it("sin ataque no hay aviso de atacado, aunque el Doctor cure a alguien", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator"]), [night("p2", "heal", "p3")]);
    expect(notices(events).some(([, n]) => n === "target_attacked")).toBe(false);
  });

  it("un ataque letal que el Doctor no evita no le avisa", () => {
    const { events } = resolve(game(["godfather", "doctor", "investigator", "sheriff"]), [night("p1", "kill", "p3"), night("p2", "heal", "p4")]);
    expect(notices(events).some(([, n]) => n === "target_attacked")).toBe(false);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p3"]);
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

describe("Veteran: avisos de disparo (wiki: Veteran.md:478, 482)", () => {
  const sent = (events: ReturnType<typeof step>["events"]) => ofType(events, "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);

  it("el visitante muerto por la alerta recibe \"You were shot by the Veteran you visited!\" y el Veteran \"You shot someone who visited you last night!\"", () => {
    const { events } = resolve(game(["veteran", "investigator", "godfather"]), [night("p1", "alert", null), night("p2", "investigate", "p1")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p2", "veteran"]]);
    expect(sent(events)).toEqual(expect.arrayContaining([["p2", "veteran_shot_you"], ["p1", "veteran_shot_visitor"]]));
  });

  it("sin visitantes no hay aviso de disparo", () => {
    const { events } = resolve(game(["veteran", "investigator", "godfather"]), [night("p1", "alert", null)]);
    expect(sent(events).filter(([, n]) => n === "veteran_shot_you" || n === "veteran_shot_visitor")).toEqual([]);
  });
});
