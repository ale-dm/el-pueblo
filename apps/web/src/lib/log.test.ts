import { describe, expect, it } from "vitest";
import { buildLog, type LogContext } from "./log.js";
import type { GameEvent } from "../types.js";

const names: Record<string, string> = { a: "Ana", b: "Bea", c: "Caro" };
const nick = (id: string) => names[id] ?? "?";
let seq = 0;
const ev = (type: string, payload: Record<string, any>, visibility: GameEvent["visibility"] = "public"): GameEvent => ({
  seq: ++seq, type, payload, visibility, audiencePlayerId: null,
});
const ctx = (over: Partial<LogContext> = {}): LogContext => ({ meId: "a", hasNightAbility: false, nick, voters: 3, ...over });
const texts = (items: ReturnType<typeof buildLog>) => items.map((i) => (i.kind === "separator" ? `== ${i.text}` : i.text));

describe("registro estilo Town of Salem", () => {
  it("separa los días y las noches", () => {
    seq = 0;
    const items = buildLog([
      ev("phase.started", { phase: "day_1", dayNumber: 1 }),
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx());
    expect(items.filter((i) => i.kind === "separator").map((i) => i.kind === "separator" && i.text)).toEqual(["Día 1", "Noche 1", "Día 2"]);
  });

  it("el día 1 no tiene votación: solo la charla y luego la noche", () => {
    seq = 0;
    const text = texts(buildLog([ev("phase.started", { phase: "day_1", dayNumber: 1 }), ev("phase.started", { phase: "night", dayNumber: 1 })], ctx()));
    expect(text.join(" ")).not.toMatch(/Votación/);
  });

  it("las muertes de la noche aparecen al amanecer, después del separador del día", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("player.killed", { playerId: "b", cause: "mafia", roleKey: "doctor" }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx()));
    const day = text.indexOf("== Día 2");
    expect(text.findIndex((t) => t.includes("murió anoche"))).toBeGreaterThan(day);
    expect(text[day + 1]).toContain("Bea murió anoche: ha sido asesinado por la Mafia. Era Doctor.");
  });

  it("si un limpiado muere, no se revela su rol", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "mafia", roleKey: null })], ctx())).join(" ");
    expect(text).toContain("No pudimos determinar su rol.");
  });

  it("el voto cuenta sus cambios, retiradas y abstenciones", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "voting", dayNumber: 2 }),
      ev("vote.cast", { voterId: "a", targetId: "b" }),
      ev("vote.cast", { voterId: "a", targetId: "c" }),
      ev("vote.cast", { voterId: "a", targetId: null }),
      ev("vote.cast", { voterId: "b", targetId: null }),
    ], ctx()));
    expect(text).toEqual([
      "Votación: hacen falta 2 votos para llevar a alguien a juicio.",
      "Quedan 3 juicios posibles hoy.",
      "Ana vota a Bea.",
      "Ana cambia su voto a Caro.",
      "Ana retira su voto.",
      "Bea se abstiene.",
    ]);
  });

  it("el juicio enseña quién votó qué y el veredicto", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("trial.started", { defendantId: "c" }),
      ev("phase.started", { phase: "judgement", dayNumber: 2 }),
      ev("judgement.cast", { voterId: "a", verdict: "guilty" }),
      ev("judgement.cast", { voterId: "b", verdict: "innocent" }),
      ev("judgement.cast", { voterId: "a", verdict: "guilty" }),
      ev("trial.verdict", { defendantId: "c", verdict: "guilty" }),
    ], ctx())).join(" | ");
    expect(text).toContain("Ana votó culpable.");
    expect(text).toContain("Bea votó inocente.");
    expect(text).toContain("El Pueblo ha decidido ahorcar a Caro por 2 votos a 1.");
  });

  it("el recuento del juicio usa los pesos del motor (Mayor revelado)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("trial.verdict", { defendantId: "c", verdict: "guilty", guiltyWeight: 3, innocentWeight: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("El Pueblo ha decidido ahorcar a Caro por 3 votos a 2.");
  });

  it("un veredicto de inocencia lo dice y no ahorca a nadie", () => {
    seq = 0;
    const text = texts(buildLog([ev("trial.verdict", { defendantId: "c", verdict: "innocent" })], ctx())).join(" ");
    expect(text).toContain("Caro es declarado inocente.");
    expect(text).not.toContain("ahorcar");
  });

  it("si no actúas de noche, lo dice al amanecer", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ hasNightAbility: true }))).join(" ");
    expect(text).toContain("No realizaste tu habilidad nocturna.");
  });

  it("si ya has actuado, no se avisa; y tu decisión sale con su objetivo", () => {
    seq = 0;
    const items = buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("night.action.submitted", { actorId: "a", ability: "kill", targetId: "b", secondTargetId: null }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ hasNightAbility: true }));
    const text = texts(items).join(" ");
    expect(text).not.toContain("No realizaste");
    expect(text).toContain("Has decidido Atacar a Bea esta noche.");
  });

  it("un resultado de Sheriff se traduce según la comprobación", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("investigation.result", { investigatorId: "a", targetId: "b", result: "suspicious", check: "suspicious" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "Godfather", check: "role" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Bea parece sospechoso.");
    expect(text).toContain("Caro es Godfather.");
  });

  it("la hipnosis llega al amanecer; la falsificación y el ascenso se cuentan al momento", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("hypnosis.message", { playerId: "b", message: "attacked" }, "private"),
      ev("will.forged", { playerId: "c", role: "jailor", forgerId: "a" }, "private"),
      ev("role.promoted", { playerId: "a", roleKey: "mafioso", uses: {} }, "mafia"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Has falsificado el testamento de Caro: parecerá que era Jailor.");
    expect(text).toContain("Eres el nuevo Mafioso");
    expect(text).toContain("Recuerdas haber sido atacado anoche.");
    expect(text.indexOf("Recuerdas")).toBeGreaterThan(text.indexOf("== Día 2"));
  });

  it("la visión de la Psíquica dice de qué bando hay al menos uno", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("investigation.result", { investigatorId: "a", targetId: "a", result: "Ana, Bea, Caro", check: "vision", side: "mafia" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "a", result: "Ana, Bea", check: "vision", side: "town" }, "private"),
    ], ctx())).join(" | ");
    expect(text).toContain("Al menos uno es de la Mafia: Ana, Bea, Caro.");
    expect(text).toContain("Al menos uno es del Pueblo: Ana, Bea.");
  });

  it("el Lookout dice cuando hubo más visitantes de los tres que identifica", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "Ana, Bea, Dani", check: "visitors", more: true }, "private"),
    ], ctx())).join(" | ");
    expect(text).toContain("Visitaron a Caro: Ana, Bea, Dani. Más gente visitó a Caro, pero no pudiste identificarlos.");
  });

  it("el ascenso a Godfather del Mafioso se cuenta como Godfather", () => {
    seq = 0;
    const text = texts(buildLog([ev("role.promoted", { playerId: "a", roleKey: "godfather", uses: {} }, "mafia")], ctx())).join(" | ");
    expect(text).toContain("Eres el nuevo Godfather");
    expect(text).not.toContain("Mafioso");
  });

  it("el final de partida muestra el ganador", () => {
    seq = 0;
    const items = buildLog([ev("game.ended", { winner: "town" })], ctx());
    expect(texts(items)).toEqual(["== Fin de la partida", "¡Gana el pueblo!"]);
  });
});

describe("decisiones de la Mafia, cancelaciones y testamentos", () => {
  it("un compañero de la Mafia ve lo que elige el otro", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("night.action.submitted", { actorId: "b", ability: "kill", targetId: "c", secondTargetId: null, mafiaTeam: true }, "mafia"),
    ], ctx({ meId: "a" }))).join(" ");
    expect(text).toContain("Bea ha elegido Atacar a Caro.");
  });

  it("cancelar se registra, y tu propia cancelación cuenta como tal", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("night.action.cancelled", { actorId: "a", mafiaTeam: false }, "private"),
      ev("night.action.cancelled", { actorId: "b", mafiaTeam: false }, "private"),
    ], ctx({ meId: "a" }))).join(" | ");
    expect(text).toContain("Has cancelado tu acción esta noche.");
    expect(text).toContain("Bea ha cancelado su acción.");
  });

  it("al morir se lee el testamento, o que no había ninguno", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("player.killed", { playerId: "b", cause: "mafia", roleKey: "doctor", will: "Dejo mi reloj." }),
      ev("player.killed", { playerId: "c", cause: "mafia", roleKey: null, will: null }),
    ], ctx())).join(" | ");
    expect(text).toContain('Testamento de Bea: "Dejo mi reloj."');
    expect(text).toContain("No encontramos un testamento de Caro.");
  });
});

describe("avisos privados de la noche", () => {
  it("el visitante de un encarcelado lo lee al amanecer, junto a los demás avisos de la noche", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "target_jailed" }, "private"),
      ev("night.notice", { playerId: "b", notice: "attack_attempt" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx({ meId: "a" })));
    const day = text.indexOf("== Día 3");
    expect(text.slice(day + 1)).toEqual([
      "Tu objetivo estaba encarcelado: tu habilidad no tuvo efecto.",
      "Alguien intentó atacarte mientras estabas encarcelado.",
    ]);
  });
});
