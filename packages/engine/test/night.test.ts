import { describe, expect, it } from "vitest";
import { applyAll, game, ofType, rejected, step, timer, types } from "./helpers/game.js";
import { apply } from "../src/core/apply.js";

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/** Pasa a la noche siguiente tras resolver la anterior (el estado de prueba no pasa por el día). */
const nextNight = (state: ReturnType<typeof game>, dayNumber: number) => ({ ...state, phase: "night" as const, dayNumber });

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
    expect(ofType(events, "night.action.blocked")[0]?.payload).toEqual({ actorId: "p3", ability: "heal", cause: "roleblock" });
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p4"]);
  });

  it("el Tavern Keeper no puede ser bloqueado: su acción sigue activa", () => {
    const s = game(["bootlegger", "tavern_keeper", "investigator"]);
    const { events } = resolve(s, [night("p1", "distract", "p2"), night("p2", "distract", "p3")]);
    expect(ofType(events, "night.action.blocked")).toEqual([]);
    expect(ofType(events, "night.action.submitted")).toHaveLength(0);
  });

  it("el Tavern Keeper no puede bloquear a un Bootlegger (wiki: Bootlegger)", () => {
    const s = game(["tavern_keeper", "bootlegger", "investigator", "godfather"]);
    const { events } = resolve(s, [night("p1", "distract", "p2"), night("p2", "distract", "p3")]);
    expect(ofType(events, "night.action.blocked")).toEqual([]);
  });

  it("el Tavern Keeper y el Bootlegger no pueden bloquear a un Transporter (wiki: Transporter)", () => {
    const tavern = resolve(game(["tavern_keeper", "transporter", "investigator", "godfather"]), [night("p1", "distract", "p2"), night("p2", "transport", "p3", "p4")]);
    expect(ofType(tavern.events, "night.action.blocked")).toEqual([]);
    const bootlegger = resolve(game(["bootlegger", "transporter", "investigator", "godfather"]), [night("p1", "distract", "p2"), night("p2", "transport", "p3", "p4")]);
    expect(ofType(bootlegger.events, "night.action.blocked")).toEqual([]);
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
      // El Bodyguard que muere protegiendo tiene su propia causa (wiki: Bodyguard.md:450).
      ["p2", "guarding"],
    ]);
    expect(state.players.find((p) => p.id === "p3")?.status).toBe("alive");
  });

  it("el Vigilante no puede disparar la primera noche (wiki: Vigilante)", () => {
    const s = game(["vigilante", "investigator", "godfather"]);
    expect(rejected(s, night("p1", "shoot", "p2"))).toMatch(/primera noche/);
  });

  it("el Vigilante que mata a un Town muere la noche siguiente, aunque tenga Doctor", () => {
    let s = game(["vigilante", "investigator", "doctor", "godfather", "sheriff"], { dayNumber: 2 });
    const first = resolve(s, [night("p1", "shoot", "p2"), night("p3", "heal", "p1")]);
    expect(ofType(first.events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p2", "shot"]]);
    expect(first.state.players[0]!.status).toBe("alive");
    expect(first.state.players[0]!.flags.guilty).toBe(true);
    // Noche siguiente: la culpa es un ataque imparable; el Doctor no lo evita.
    s = { ...first.state, phase: "night", dayNumber: 3 };
    const second = resolve(s, [night("p3", "heal", "p1")]);
    expect(ofType(second.events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p1", "guilt"]]);
  });

  it("si un Doctor evita el disparo, el Vigilante no tiene culpa", () => {
    const s = game(["vigilante", "investigator", "doctor", "godfather", "sheriff"], { dayNumber: 2 });
    const first = resolve(s, [night("p1", "shoot", "p2"), night("p3", "heal", "p2")]);
    expect(ofType(first.events, "player.killed")).toHaveLength(0);
    expect(first.state.players[0]!.flags.guilty).toBeUndefined();
    const second = resolve({ ...first.state, phase: "night", dayNumber: 3 }, []);
    expect(ofType(second.events, "player.killed")).toHaveLength(0);
  });

  it("la culpa del Vigilante es un ataque imparable: un Bodyguard sobre él no muere", () => {
    let s = game(["vigilante", "investigator", "bodyguard", "godfather", "sheriff"], { dayNumber: 2 });
    s = resolve(s, [night("p1", "shoot", "p2")]).state;
    const { events } = resolve({ ...s, phase: "night", dayNumber: 3 }, [night("p3", "protect", "p1")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p1", "guilt"]]);
  });

  it("el Vigilante que dispara a la Mafia sobrevive", () => {
    const s = game(["vigilante", "mafioso", "investigator"], { dayNumber: 2 });
    const { events } = resolve(s, [night("p1", "shoot", "p2")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p2"]);
  });

  it("un disparo Basic no mata al Godfather (Basic Defense, wiki: Godfather)", () => {
    const s = game(["vigilante", "godfather", "investigator"], { dayNumber: 2 });
    const { events } = resolve(s, [night("p1", "shoot", "p2")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(ofType(events, "attack.prevented")).toHaveLength(0);
  });

  it("el Bodyguard no protege de un Veteran en alerta: el visitante protegido muere (wiki: Bodyguard)", () => {
    const s = game(["veteran", "bodyguard", "lookout", "godfather"]);
    const { events, state } = resolve(s, [night("p1", "alert", null), night("p2", "protect", "p3"), night("p3", "watch", "p1")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p3", "veteran"]]);
    expect(state.players[1]!.status).toBe("alive");
  });

  it("el Veteran en alerta mata a quien le visita", () => {
    const s = game(["veteran", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "alert", null), night("p2", "kill", "p1")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([
      ["p2", "veteran"],
    ]);
  });

  it("el Crusader ataca a UN visitante al azar, no a todos (wiki: Crusader)", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = game(["crusader", "investigator", "sheriff", "lookout", "godfather"]);
      let t = step(s, night("p1", "protect", "p2"), seed).state;
      t = step(t, night("p3", "interrogate", "p2"), seed).state;
      t = step(t, night("p4", "watch", "p2"), seed).state;
      const { events } = step(t, timer(), seed);
      const killed = ofType(events, "player.killed").filter((e) => e.payload.cause === "crusade").map((e) => e.payload.playerId);
      expect(killed).toHaveLength(1);
      expect(["p3", "p4"]).toContain(killed[0]);
    }
  });

  it("el Ambusher ataca a UN visitante al azar y nunca a la Mafia (wiki: Ambusher)", () => {
    for (let seed = 1; seed <= 10; seed++) {
      // p2 (Godfather) y p3 (Sheriff) visitan a p4; el Ambusher solo puede alcanzar al Sheriff.
      const s = game(["ambusher", "godfather", "sheriff", "investigator"]);
      let t = step(s, night("p1", "ambush", "p4"), seed).state;
      t = step(t, night("p2", "kill", "p4"), seed).state;
      t = step(t, night("p3", "interrogate", "p4"), seed).state;
      const { events } = step(t, timer(), seed);
      expect(ofType(events, "player.killed").filter((e) => e.payload.cause === "ambush").map((e) => e.payload.playerId), `seed ${seed}`).toEqual(["p3"]);
    }
  });

  it("el Ambusher no puede tender emboscadas a la casa de un miembro de la Mafia", () => {
    const s = game(["ambusher", "godfather", "investigator"]);
    expect(rejected(s, night("p1", "ambush", "p2"))).toMatch(/Mafia/);
  });

  it("el Crusader protege a su objetivo; su ataque Basic no mata al Godfather que lo visita", () => {
    const s = game(["crusader", "godfather", "investigator"]);
    const { events } = resolve(s, [night("p1", "protect", "p3"), night("p2", "kill", "p3")]);
    expect(ofType(events, "attack.prevented")).toHaveLength(1);
    expect(ofType(events, "player.killed")).toHaveLength(0);
  });
});

describe("noche: quién mata a la Mafia (wiki: Mafioso, Godfather)", () => {
  it("con orden del Godfather, el Mafioso ejecuta y es quien visita: el Lookout no ve al Godfather", () => {
    const s = game(["godfather", "mafioso", "lookout", "investigator"]);
    const { events } = resolve(s, [night("p1", "kill", "p4"), night("p2", "kill", "p3"), night("p3", "watch", "p4")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toEqual(["p4"]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("P2");
  });

  it("un Bodyguard en la víctima mata al Mafioso que ejecuta la orden, no al Godfather", () => {
    const s = game(["godfather", "mafioso", "bodyguard", "investigator"]);
    const { events, state } = resolve(s, [night("p1", "kill", "p4"), night("p2", "kill", "p4"), night("p3", "protect", "p4")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([
      ["p2", "bodyguard"],
      ["p3", "guarding"],
    ]);
    expect(state.players.find((p) => p.id === "p1")?.status).toBe("alive");
  });

  it("si el Mafioso está bloqueado, el Godfather mata personalmente", () => {
    const s = game(["godfather", "mafioso", "bootlegger", "investigator"]);
    const { events } = resolve(s, [night("p1", "kill", "p4"), night("p2", "kill", "p3"), night("p3", "distract", "p2")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p4", "mafia"]]);
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

  it("el Lookout identifica a tres visitantes al azar y sabe que hubo más (wiki: Lookout)", () => {
    const s = game(["investigator", "lookout", "sheriff", "doctor", "bodyguard", "tracker", "godfather"]);
    const { events } = resolve(s, [
      night("p2", "watch", "p1"),
      night("p3", "interrogate", "p1"),
      night("p4", "heal", "p1"),
      night("p5", "protect", "p1"),
      night("p6", "track", "p1"),
    ]);
    const [watch] = ofType(events, "investigation.result").filter((e) => e.payload.investigatorId === "p2");
    expect(watch?.payload.more).toBe(true);
    const shown = String(watch?.payload.result).split(", ");
    expect(shown).toHaveLength(3);
    for (const nick of shown) expect(["P3", "P4", "P5", "P6"]).toContain(nick);
  });

  it("el Tracker ve a qué casas va su objetivo", () => {
    const s = game(["tracker", "sheriff", "investigator"]);
    const { events } = resolve(s, [night("p1", "track", "p2"), night("p2", "interrogate", "p3")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("P3");
  });

  it("el Tracker no recibe nada si su objetivo no visita a nadie (wiki: Tracker)", () => {
    const s = game(["tracker", "sheriff", "investigator"]);
    const { events } = resolve(s, [night("p1", "track", "p3")]);
    expect(ofType(events, "investigation.result")).toHaveLength(0);
  });

  it("el Tracker no ve la visita del Godfather mientras su Mafioso ejecuta la orden (wiki: Tracker)", () => {
    const s = game(["tracker", "godfather", "mafioso", "investigator", "sheriff"]);
    const { events } = resolve(s, [night("p1", "track", "p2"), night("p2", "kill", "p4"), night("p3", "kill", "p4")]);
    expect(ofType(events, "investigation.result")).toHaveLength(0);
  });

  it("el Tracker sí ve la visita del Godfather cuando actúa solo", () => {
    const s = game(["tracker", "godfather", "investigator", "sheriff"]);
    const { events } = resolve(s, [night("p1", "track", "p2"), night("p2", "kill", "p3")]);
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

  it("la trampa se construye una noche, se coloca la siguiente y se activa al visitar a su objetivo (wiki: Trapper.md:213, 252)", () => {
    let s = game(["trapper", "investigator", "sheriff", "godfather"]);
    s = resolve(s, []).state; // noche 1: se construye, sin colocar (Trapper.md:213)
    expect(s.traps["p1"]).toEqual({ targetId: null, readyDay: 2 });
    s = step(s, timer()).state; // discusión → votación
    s = step(s, timer()).state; // votación → noche 2
    const placed = resolve(s, [night("p1", "trap", "p2")]); // noche 2: se coloca (Trapper.md:217)
    expect(placed.state.traps["p1"]).toEqual({ targetId: "p2", readyDay: 3 });
    s = step(placed.state, timer()).state; // discusión → votación
    s = step(s, timer()).state; // votación → noche 3
    // Wiki (Keyword_System.md:349): solo daña a un atacante. El Godfather (p4) ataca a p2 y muere por la trampa.
    const { events } = resolve(s, [night("p4", "kill", "p2")]);
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p4", "trap"]]);
  });

  it("no se puede colocar la trampa la noche en que se construye: aún no está lista (wiki: Trapper.md:252)", () => {
    const s = game(["trapper", "sheriff"]);
    expect(rejected(s, night("p1", "trap", "p2"))).toMatch(/construyendo/);
  });

  it("el Trapper solo tiene una trampa a la vez (wiki: Trapper)", () => {
    const s = game(["trapper", "investigator", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } });
    expect(rejected(s, night("p1", "trap", "p2"))).toMatch(/Ya tienes una trampa/);
  });

  it("elegirse a sí mismo desmonta la trampa: no se activa esa noche (wiki: Trapper)", () => {
    const s = game(["trapper", "investigator", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p2", readyDay: 2 } } });
    const { events, state } = resolve(s, [night("p1", "trap", "p1"), night("p3", "interrogate", "p2")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
    expect(ofType(events, "trap.removed").map((e) => e.payload.reason)).toEqual(["dismantled"]);
    // Wiki (Trapper.md:229): se puede reconstruir al instante, para colocar otra la noche siguiente.
    expect(state.traps["p1"]).toEqual({ targetId: null, readyDay: 3 });
  });

  it("una trampa activada es poderosa (mata al Godfather visitante), defiende a su objetivo y se retira", () => {
    const s = game(["trapper", "godfather", "investigator", "sheriff"], { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } });
    const { events, state } = resolve(s, [night("p2", "kill", "p3")]);
    // Wiki (Trapper.md:223): la trampa defiende de un ataque directo; el Godfather muere por la trampa.
    expect(ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause])).toEqual([["p2", "trap"]]);
    expect(ofType(events, "trap.removed").map((e) => e.payload.reason)).toEqual(["triggered"]);
    // Retirada la trampa, se construye otra al final de la noche (Trapper.md:213): queda lista para la noche siguiente.
    expect(state.traps["p1"]).toEqual({ targetId: null, readyDay: 3 });
    expect(rejected({ ...state, phase: "night", dayNumber: 3 }, night("p1", "trap", "p4"))).toBeNull();
  });

  it("la trampa colocada esta noche no se activa esta noche", () => {
    const s = game(["trapper", "sheriff"], { dayNumber: 2, traps: { p1: { targetId: null, readyDay: 2 } } });
    const { events } = resolve(s, [night("p1", "trap", "p2"), night("p2", "interrogate", "p1")]);
    expect(ofType(events, "player.killed")).toHaveLength(0);
  });
});

describe("Trapper: construcción de la trampa (wiki: Trapper.md:159, 213, 215, 227, 229)", () => {
  // Trapper.md:159: "Traps take one day to build." Trapper.md:213: "At Night, you will build a Trap if you do not have one ready to be placed."
  it("bloqueado la noche de construcción no construye: la trampa se hace la noche siguiente (Trapper.md:215)", () => {
    const s = game(["trapper", "tavern_keeper", "investigator", "godfather"]);
    // Noche 1: el Tavern Keeper bloquea al Trapper.
    const night1 = resolve(s, [night("p2", "distract", "p1")]);
    expect(ofType(night1.events, "night.action.blocked").map((e) => e.payload.actorId)).toContain("p1");
    expect(ofType(night1.events, "trap.built")).toHaveLength(0);
    expect(night1.state.traps["p1"]).toBeUndefined();
    // Noche 2: sin bloqueo, la construye; queda lista para colocar la noche 3.
    const night2 = resolve(nextNight(night1.state, 2), []);
    expect(night2.state.traps["p1"]).toEqual({ targetId: null, readyDay: 3 });
  });

  it("con la trampa puesta no se construye otra: solo hay una a la vez (Trapper.md:227)", () => {
    const s = game(["trapper", "investigator", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p2", readyDay: 2 } } });
    const { state, events } = resolve(s, []);
    expect(ofType(events, "trap.built")).toHaveLength(0);
    expect(state.traps["p1"]).toEqual({ targetId: "p2", readyDay: 2 });
  });

  it("una trampa lista no se construye dos veces (no hay dos trampas a la vez, Trapper.md:227)", () => {
    const s = game(["trapper", "investigator", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: null, readyDay: 2 } } });
    const { state, events } = resolve(s, []);
    expect(ofType(events, "trap.built")).toHaveLength(0);
    expect(state.traps["p1"]).toEqual({ targetId: null, readyDay: 2 });
  });

  it("desmontar deja la trampa lista la misma noche, para colocarla la siguiente (Trapper.md:229)", () => {
    const s = game(["trapper", "investigator", "sheriff", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p2", readyDay: 2 } } });
    const { state, events } = resolve(s, [night("p1", "trap", "p1")]);
    expect(ofType(events, "trap.removed").map((e) => e.payload.reason)).toEqual(["dismantled"]);
    expect(ofType(events, "trap.built")).toHaveLength(1);
    expect(state.traps["p1"]).toEqual({ targetId: null, readyDay: 3 });
    // Y la noche siguiente la coloca en otro.
    expect(rejected({ ...state, phase: "night", dayNumber: 3 }, night("p1", "trap", "p4"))).toBeNull();
  });

  it("un Trapper bloqueado no desmonta: la trampa sigue puesta (Trapper.md:229)", () => {
    const s = game(["trapper", "tavern_keeper", "investigator", "godfather"], { dayNumber: 2, traps: { p1: { targetId: "p3", readyDay: 2 } } });
    const { state } = resolve(s, [night("p2", "distract", "p1"), night("p1", "trap", "p1")]);
    expect(state.traps["p1"]).toEqual({ targetId: "p3", readyDay: 2 });
  });
});

describe("noche: Janitor y Retributionist (wiki: Janitor, Retributionist)", () => {
  it("limpiar a un encarcelado no gasta una limpieza", () => {
    const s = game(["janitor", "jailor", "investigator", "godfather"]);
    s.players[2] = { ...s.players[2]!, flags: { jailed: true } };
    s.jailedBy = { p3: "p2" };
    const { state } = resolve(s, [night("p1", "clean", "p3")]);
    expect(state.players[0]!.usesLeft.clean).toBe(3);
  });

  it("limpiar a un libre sí gasta una limpieza", () => {
    const s = game(["janitor", "investigator", "godfather"]);
    const { state } = resolve(s, [night("p1", "clean", "p2")]);
    expect(state.players[0]!.usesLeft.clean).toBe(2);
  });

  it("el Retributionist no puede resucitar a un Town limpiado", () => {
    const s = game(["janitor", "retributionist", "doctor", "godfather", "sheriff", "investigator"]);
    const { state } = resolve(s, [night("p1", "clean", "p3"), night("p4", "kill", "p3")]);
    expect(state.players[2]!.status).toBe("dead");
    expect(state.players[2]!.flags.cleaned).toBe(true);
    const next = { ...state, phase: "night" as const, dayNumber: 2 };
    expect(rejected(next, { type: "night.action", actorId: "p2", ability: "raise", targetId: "p3", secondTargetId: "p5" })).toMatch(/limpiado/);
  });

  it("la limpieza de un vivo caduca: si muere otra noche, el Retributionist sí puede resucitarlo", () => {
    const s = game(["janitor", "retributionist", "doctor", "godfather", "sheriff", "investigator"]);
    const cleanedNight = resolve(s, [night("p1", "clean", "p3")]).state;
    expect(cleanedNight.players[2]!.flags.cleaned).toBeUndefined();
    const killed = resolve({ ...cleanedNight, phase: "night", dayNumber: 2 }, [night("p4", "kill", "p3")]).state;
    expect(killed.players[2]!.status).toBe("dead");
    const next = { ...killed, phase: "night" as const, dayNumber: 3 };
    expect(rejected(next, { type: "night.action", actorId: "p2", ability: "raise", targetId: "p3", secondTargetId: "p5" })).toBeNull();
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

describe("noche: visitas de quien tiene dos objetivos (wiki: Tracker, Lookout, Retributionist)", () => {
  const results = (events: ReturnType<typeof step>["events"], investigatorId: string) =>
    ofType(events, "investigation.result").filter((e) => e.payload.investigatorId === investigatorId).map((e) => e.payload.result);

  it("un Transporter visita a sus dos objetivos: cada Lookout lo ve y el Tracker dice ambos", () => {
    // p1 Transporter (cambia p3 y p4). p2 vigila a p3, p5 vigila a p4, p6 sigue al Transporter.
    const s = game(["transporter", "lookout", "investigator", "investigator", "lookout", "tracker", "godfather"]);
    const { events } = resolve(s, [
      night("p1", "transport", "p3", "p4"),
      night("p2", "watch", "p3"),
      night("p5", "watch", "p4"),
      night("p6", "track", "p1"),
    ]);
    expect(results(events, "p2")).toEqual(["P1"]);
    expect(results(events, "p5")).toEqual(["P1"]);
    expect(results(events, "p6")).toEqual(["P3, P4"]);
  });

  it("un Veteran en alerta dispara al Transporter que visita su casa", () => {
    // p1 Transporter cambia p2 y p3 (Veteran). El Transporter visita a p3 aunque le transporte.
    const s = game(["transporter", "investigator", "veteran", "godfather"]);
    const { events } = resolve(s, [night("p1", "transport", "p2", "p3"), night("p3", "alert", null), night("p4", "kill", "p2")]);
    const deaths = ofType(events, "player.killed").map((e) => [e.payload.playerId, e.payload.cause]);
    expect(deaths).toContainEqual(["p1", "veteran"]);
  });

  it("el Retributionist visita a su muerto; el zombi visita a su segundo objetivo, no el Retributionist", () => {
    // p1 Retributionist resucita a p2 (Doctor muerto) y lo usa sobre p3. p4 vigila a p3, p5 sigue al Retributionist.
    const s = game(["retributionist", "doctor", "investigator", "lookout", "tracker", "godfather"]);
    s.players[1] = { ...s.players[1]!, status: "dead" };
    const { events } = resolve(s, [night("p1", "raise", "p2", "p3"), night("p4", "watch", "p3"), night("p5", "track", "p1")]);
    expect(results(events, "p4")).toEqual(["P2"]);
    expect(results(events, "p5")).toEqual(["P2"]);
  });
});

describe("noche: el Spy espía a su objetivo (wiki: Spy)", () => {
  const spyResults = (events: ReturnType<typeof step>["events"]) =>
    ofType(events, "investigation.result").filter((e) => e.payload.check === "bug").map((e) => [e.payload.investigatorId, e.payload.result]);

  it("ve el ataque y la protección que recibió su objetivo", () => {
    // p1 Spy espía a p3. p2 Godfather ataca a p3 y p4 Doctor lo cura: el ataque no le alcanza.
    const s = game(["spy", "godfather", "investigator", "doctor"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "kill", "p3"), night("p4", "heal", "p3")]);
    // Wiki (Spy.md:237): "Your target was attacked but someone nursed them back to health!" (una sola frase, la de la curación).
    expect(spyResults(events)).toEqual([["p1", "attack_healed"]]);
  });

  it("el Transporter cambia el objetivo del Spy: recibe la información de la otra casa", () => {
    // p1 Spy espía a p3, pero p2 Transporter cambia p3 y p4: el Spy ve a p4, que llega transportado.
    const s = game(["spy", "transporter", "investigator", "investigator", "godfather"]);
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p2", "transport", "p3", "p4")]);
    expect(spyResults(events)).toEqual([["p1", "transport"]]);
  });

  it("si el objetivo está encarcelado, el Spy lo sabe y sigue viendo las visitas de la Mafia", () => {
    // p2 Jailor tiene encarcelado a p3. El Spy lo espía; el Godfather (p4) visita a p5.
    const s = game(["spy", "jailor", "investigator", "godfather", "sheriff"]);
    s.players[2] = { ...s.players[2]!, flags: { jailed: true } };
    s.jailedBy = { p3: "p2" };
    const { events } = resolve(s, [night("p1", "bug", "p3"), night("p4", "kill", "p5")]);
    expect(spyResults(events)).toEqual([["p1", "jail"]]);
    const mafia = ofType(events, "investigation.result").find((e) => e.payload.investigatorId === "p1" && e.payload.check === "mafiaVisits");
    expect(mafia?.payload.result).toBe("P5");
  });

  it("no ve las visitas de un Mafioso disfrazado de Town, y cuenta cada visita por casa", () => {
    // p2 Disguiser disfraza al Godfather (p3) de Investigator (p4) y lo visita con él.
    const s = game(["spy", "disguiser", "godfather", "investigator", "sheriff", "investigator"]);
    // Las visitas del Disguiser (p3 y p4) sí se ven; la del Godfather a p5 no.
    const { events } = resolve(s, [night("p1", "bug", "p6"), night("p2", "disguise", "p3", "p4"), night("p3", "kill", "p5")]);
    const mafia = ofType(events, "investigation.result").find((e) => e.payload.investigatorId === "p1" && e.payload.check === "mafiaVisits");
    // Wiki (Spy.md:179): "The order is randomized." Se comprueba el conjunto, no el orden (ver spy-orden.test.ts).
    expect(String(mafia?.payload.result).split(", ").sort()).toEqual(["P3", "P4"]);
  });
});

describe("noche: transportes (wiki: Transporter)", () => {
  const notices = (events: ReturnType<typeof step>["events"]) =>
    ofType(events, "night.notice").map((e) => [e.payload.playerId, e.payload.notice]);

  it("con un objetivo encarcelado el intercambio falla: el Transporter y el encarcelado lo saben", () => {
    // p1 Transporter quiere cambiar p2 (encarcelado por p3) y p5. El Godfather (p4) mata a p5: sin intercambio, muere.
    const s = game(["transporter", "investigator", "jailor", "godfather", "sheriff"]);
    s.players[1] = { ...s.players[1]!, flags: { jailed: true } };
    s.jailedBy = { p2: "p3" };
    const { events } = resolve(s, [night("p1", "transport", "p2", "p5"), night("p4", "kill", "p5")]);
    expect(notices(events)).toEqual(expect.arrayContaining([["p1", "transport_jailed"], ["p2", "jailed_transport_attempt"]]));
    expect(notices(events).some(([, n]) => n === "transported")).toBe(false);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).toContain("p5");
  });

  it("al transportar, los dos transportados lo saben al terminar la noche", () => {
    const s = game(["transporter", "investigator", "godfather", "sheriff"]);
    const { events } = resolve(s, [night("p1", "transport", "p2", "p4")]);
    expect(notices(events)).toEqual(expect.arrayContaining([["p2", "transported"], ["p4", "transported"]]));
    expect(notices(events).filter(([, n]) => n === "transported")).toHaveLength(2);
  });

  it("un bloqueador también cambia de sitio: si el Transporter lo cambia, bloquea a quien queda en su casa", () => {
    // p1 Tavern Keeper bloquea a p3, pero p2 Transporter cambia p3 y p4 antes: el bloqueo cae sobre p4.
    const s = game(["tavern_keeper", "transporter", "investigator", "investigator", "godfather"]);
    const { events } = resolve(s, [
      night("p1", "distract", "p3"),
      night("p2", "transport", "p3", "p4"),
      night("p3", "investigate", "p1"),
      night("p4", "investigate", "p1"),
    ]);
    expect(ofType(events, "night.action.blocked").map((e) => e.payload.actorId)).toEqual(["p4"]);
  });
});

describe("noche: la trampa defiende de un ataque (wiki: Trapper)", () => {
  // p1 Trapper con trampa lista sobre p2. Los atacantes llegan visitando a p2.
  const trapped = (roles: string[]) => {
    const s = game(roles, { phase: "night", dayNumber: 2 });
    s.traps = { p1: { targetId: "p2", readyDay: 1 } };
    return s;
  };

  it("un ataque directo no mata a su objetivo: la trampa lo defiende", () => {
    const { events } = resolve(trapped(["trapper", "investigator", "godfather", "sheriff"]), [night("p3", "kill", "p2")]);
    expect(ofType(events, "player.killed").map((e) => e.payload.playerId)).not.toContain("p2");
    expect(ofType(events, "attack.prevented")).toContainEqual(expect.objectContaining({ payload: { victimId: "p2", protectorId: "p1" } }));
  });

  it("la trampa defiende solo del atacante que hiere: el otro sí mata (wiki: Keyword_System.md:349, Trapper.md:225)", () => {
    // Godfather (p3) y Vigilante (p4) atacan a p2. La trampa hiere a uno de los dos, al azar, y solo a ese defiende.
    const { events } = resolve(trapped(["trapper", "investigator", "godfather", "vigilante", "sheriff"]), [night("p3", "kill", "p2"), night("p4", "shoot", "p2")]);
    expect(ofType(events, "player.killed").filter((e) => e.payload.playerId === "p2")).toHaveLength(1);
    const trapKills = ofType(events, "player.killed").filter((e) => e.payload.cause === "trap").map((e) => e.payload.playerId);
    expect(trapKills).toHaveLength(1);
    expect(["p3", "p4"]).toContain(trapKills[0]);
  });
});

describe("bloqueo: no se bloquea a un rol con habilidad de día (wiki: Tavern_Keeper.md:181)", () => {
  // Tavern_Keeper.md:181: "You cannot Roleblock roles with Day abilties, because you have a Night ability."
  // Jailor.md:286 (el TK sí bloquea al Jailor, que tiene habilidad de noche) y Psychic.md:188 (el bloqueo le quita la visión).
  it("el Tavern Keeper no puede elegir al Mayor, cuya habilidad es de día", () => {
    const s = game(["tavern_keeper", "mayor", "investigator", "godfather"]);
    expect(rejected(s, night("p1", "distract", "p2"))).toMatch(/habilidad de día/);
  });

  it("el Bootlegger tampoco puede bloquear al Mayor (misma mecánica de bloqueo, Bootlegger.md:198)", () => {
    const s = game(["bootlegger", "mayor", "investigator", "godfather"]);
    expect(rejected(s, night("p1", "distract", "p2"))).toMatch(/habilidad de día/);
  });

  it("el Tavern Keeper sí puede bloquear al Jailor, que tiene habilidad de noche (Jailor.md:286)", () => {
    const s = game(["tavern_keeper", "jailor", "investigator", "godfather"], { dayNumber: 2 });
    expect(rejected(s, night("p1", "distract", "p2"))).toBeNull();
  });

  it("el Tavern Keeper sí puede bloquear al Psychic, que es pasivo (Psychic.md:188)", () => {
    const s = game(["tavern_keeper", "psychic", "investigator", "godfather"]);
    expect(rejected(s, night("p1", "distract", "p2"))).toBeNull();
  });

  it("el Investigator sí puede ser bloqueado y el Mayor no (mismo Tavern Keeper, dos objetivos)", () => {
    const s = game(["tavern_keeper", "mayor", "investigator", "godfather"]);
    expect(rejected(s, night("p1", "distract", "p3"))).toBeNull();
    expect(rejected(s, night("p1", "distract", "p2"))).not.toBeNull();
  });
});

describe("Framer: el encuadre dura hasta que un rol investigativo lo investiga (wiki 3.3.0)", () => {
  // Framer.md:344 (versión 3.3.0): "Frames will now last until an investigative role targets the Framed player instead of
  // only the Night the player is Framed." Framer.md:196: "Framing a target will show them as suspicious until they are investigated."
  // Sheriff.md:275 ("If the Framer does not frame the same target again, your results will change") es consejo anterior a 3.3.0.
  it("encuadre la noche 1 sin investigar: la noche 2 el Sheriff sigue viendo sospechoso (Framer.md:344)", () => {
    const s = game(["framer", "sheriff", "investigator", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p3")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "interrogate", "p3")]).events;
    expect(ofType(night2, "investigation.result")[0]?.payload.result).toBe("suspicious");
  });

  it("investigado una vez, la noche siguiente el resultado vuelve a ser normal (Framer.md:344)", () => {
    const s = game(["framer", "sheriff", "investigator", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p3")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "interrogate", "p3")]);
    expect(ofType(night2.events, "investigation.result")[0]?.payload.result).toBe("suspicious");
    expect(night2.state.players.find((p) => p.id === "p3")?.flags.framed).toBeUndefined();
    const night3 = resolve(nextNight(night2.state, 3), [night("p2", "interrogate", "p3")]).events;
    expect(ofType(night3, "investigation.result")[0]?.payload.result).toBe("innocent");
  });

  it("el Sheriff que investiga al encuadrado la misma noche que se encuadra ve sospechoso, y el encuadre termina", () => {
    const s = game(["framer", "sheriff", "investigator", "godfather"], { dayNumber: 1 });
    const { state, events } = resolve(s, [night("p1", "frame", "p3"), night("p2", "interrogate", "p3")]);
    expect(ofType(events, "investigation.result")[0]?.payload.result).toBe("suspicious");
    expect(state.players.find((p) => p.id === "p3")?.flags.framed).toBeUndefined();
  });

  it("un rol no investigativo que visita al encuadrado no quita el encuadre (solo los investigativos, Framer.md:344)", () => {
    const s = game(["framer", "doctor", "sheriff", "investigator"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p4")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "heal", "p4")]);
    expect(night2.state.players.find((p) => p.id === "p4")?.flags.framed).toBe(true);
    const night3 = resolve(nextNight(night2.state, 3), [night("p3", "interrogate", "p4")]).events;
    expect(ofType(night3, "investigation.result")[0]?.payload.result).toBe("suspicious");
  });

  it.each([
    ["consigliere", "check"],
    ["lookout", "watch"],
    ["tracker", "track"],
  ])("el %s, rol investigativo del catálogo, también quita el encuadre al investigar", (roleKey, ability) => {
    const s = game(["framer", roleKey, "sheriff", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p3")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", ability, "p3")]).state;
    expect(night2.players.find((p) => p.id === "p3")?.flags.framed).toBeUndefined();
  });

  it("sin roles que maten, el Framer asciende a Mafioso (Framer.md:43, 150)", () => {
    const s = game(["framer", "investigator", "sheriff"], { dayNumber: 1 });
    const { events } = resolve(s, []);
    expect(ofType(events, "role.promoted")[0]?.payload).toMatchObject({ playerId: "p1", roleKey: "mafioso" });
  });

  it("al ascender, los encuadres anteriores siguen en el objetivo (Framer.md:202)", () => {
    const s = game(["framer", "investigator", "sheriff"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p2")]).state;
    expect(night1.players.find((p) => p.id === "p1")?.roleKey).toBe("mafioso");
    expect(night1.players.find((p) => p.id === "p2")?.flags.framed).toBe(true);
  });

  it("el encuadre sobrevive a la muerte del Framer: el Sheriff sigue viendo sospechoso (Framer.md:254)", () => {
    const s = game(["framer", "sheriff", "investigator", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p3")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p4", "kill", "p1"), night("p2", "interrogate", "p3")]).events;
    expect(ofType(night2, "player.killed").map((e) => e.payload.playerId)).toEqual(["p1"]);
    expect(ofType(night2, "investigation.result")[0]?.payload.result).toBe("suspicious");
  });

  it("el Spy que espía al encuadrado también quita el encuadre (el Spy investiga, Spy.md:193)", () => {
    const s = game(["framer", "spy", "sheriff", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p3")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "bug", "p3")]).state;
    expect(night2.players.find((p) => p.id === "p3")?.flags.framed).toBeUndefined();
  });

  it("el Consigliere ve el rol real de un encuadrado (Consigliere.md:208) y ese chequeo también termina el encuadre", () => {
    const s = game(["framer", "consigliere", "sheriff", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p4")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "check", "p4")]);
    expect(ofType(night2.events, "investigation.result")[0]?.payload.result).toBe("Godfather");
    expect(night2.state.players.find((p) => p.id === "p4")?.flags.framed).toBeUndefined();
  });

  it("el espionaje de un Spy encuadrado (su visita a la Mafia no tiene objetivo) no le quita su propio encuadre", () => {
    const s = game(["framer", "spy", "sheriff", "godfather"], { dayNumber: 1 });
    const night1 = resolve(s, [night("p1", "frame", "p2")]).state;
    const night2 = resolve(nextNight(night1, 2), [night("p2", "bug", "p4")]).state;
    expect(night2.players.find((p) => p.id === "p2")?.flags.framed).toBe(true);
  });
});


describe("noche: avisos del registro (wiki: Janitor, Mafioso)", () => {
  it("un limpiado muere sin rol y marcado como limpiado (Janitor.md:212)", () => {
    const s = game(["janitor", "investigator", "godfather", "doctor"]);
    const { events } = resolve(s, [night("p1", "clean", "p2"), night("p3", "kill", "p2")]);
    const killed = ofType(events, "player.killed").find((e) => e.payload.playerId === "p2");
    expect(killed?.payload).toMatchObject({ roleKey: null, cleaned: true });
  });

  it("la decisión del Godfather lleva su rol, para que el Mafioso reciba la orden", () => {
    const s = game(["godfather", "mafioso", "investigator", "sheriff"]);
    const { events } = step(s, night("p1", "kill", "p3"));
    expect(ofType(events, "night.action.submitted")[0]?.payload.roleKey).toBe("godfather");
  });
});
