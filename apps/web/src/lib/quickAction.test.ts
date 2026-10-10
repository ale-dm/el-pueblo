import { describe, expect, it } from "vitest";
import type { MatchView } from "../types.js";
import { abilityPlan, dockAbilities, voteCommand, type DockAbility } from "./quickAction.js";

/** Vista mínima: solo lo que miran las funciones de acción. */
function view(phase: string, me: Partial<MatchView["me"]>): MatchView {
  return { phase, dayNumber: 2, defendantId: null, players: [], votes: {}, me: { id: "me", status: "alive", nightAbilities: [], dayAbilities: [], ...me } } as unknown as MatchView;
}
const ability = (key: string, target: "player" | "none" | "two", extra = {}) => ({
  key, target, usesLeft: null, choices: null, deadOnly: false, deathNote: false, defaultChoice: null, writesWill: false, ...extra,
});
const night = (key: string, target: DockAbility["target"], choices: DockAbility["choices"] = null): DockAbility => ({ key, target, choices, night: true });

describe("dockAbilities: qué botones hay en cada fase", () => {
  it("de noche, cada habilidad con usos es un botón; sin usos no aparece", () => {
    const v = view("night", { nightAbilities: [ability("heal", "player"), ability("shoot", "player", { usesLeft: 0 })] });
    expect(dockAbilities(v).map((a) => a.key)).toEqual(["heal"]);
  });

  it("una elección con valor por defecto no pide opción", () => {
    const v = view("night", { nightAbilities: [ability("forge", "player", { choices: ["roles"], defaultChoice: "ambusher" })] });
    expect(dockAbilities(v)[0]!.choices).toBeNull();
  });

  it("una elección sin valor por defecto sí la pide", () => {
    const v = view("night", { nightAbilities: [ability("hypnotize", "player", { choices: ["attacked", "protected"] })] });
    expect(dockAbilities(v)[0]!.choices).toEqual(["attacked", "protected"]);
  });

  it("de día, las habilidades de día; fuera de noche y día no hay botones de habilidad", () => {
    const v = view("discussion", { dayAbilities: [{ key: "jail", target: "player", oncePerDay: true, usesLeft: null }] });
    expect(dockAbilities(v).map((a) => [a.key, a.night])).toEqual([["jail", false]]);
    expect(dockAbilities(view("judgement", {}))).toEqual([]);
  });
});

describe("abilityPlan: qué se envía al pulsar una habilidad", () => {
  it("con objetivo elegido, envía la acción de noche con ese objetivo", () => {
    expect(abilityPlan(view("night", {}), night("investigate", "player"), ["p3"], null)).toEqual({
      kind: "command",
      command: { type: "night.action", actorId: "me", ability: "investigate", targetId: "p3", secondTargetId: null },
    });
  });

  it("sin objetivo, pide elegir", () => {
    expect(abilityPlan(view("night", {}), night("protect", "player"), [], null)).toEqual({ kind: "needs", hint: "Elige a alguien" });
  });

  it("sin objetivo y sin elección, una habilidad sin objetivo se envía", () => {
    expect(abilityPlan(view("night", {}), night("alert", "none"), [], null)).toEqual({
      kind: "command",
      command: { type: "night.action", actorId: "me", ability: "alert", targetId: null, secondTargetId: null },
    });
  });

  it("dos objetivos: espera a los dos, en el orden en que se eligieron", () => {
    const a = night("disguise", "two");
    expect(abilityPlan(view("night", {}), a, ["p1"], null)).toEqual({ kind: "needs", hint: "Elige dos" });
    expect(abilityPlan(view("night", {}), a, ["p1", "p4"], null)).toEqual({
      kind: "command",
      command: { type: "night.action", actorId: "me", ability: "disguise", targetId: "p1", secondTargetId: "p4" },
    });
  });

  it("con elección pendiente, pide la opción; con la opción, envía", () => {
    const a = night("hypnotize", "player", ["attacked", "protected"]);
    expect(abilityPlan(view("night", {}), a, ["p2"], null)).toEqual({ kind: "choose", options: ["attacked", "protected"] });
    expect(abilityPlan(view("night", {}), a, ["p2"], "attacked")).toEqual({
      kind: "command",
      command: { type: "night.action", actorId: "me", ability: "hypnotize", targetId: "p2", secondTargetId: null, choice: "attacked" },
    });
  });

  it("de día, se envía como acción de día", () => {
    expect(abilityPlan(view("discussion", {}), { key: "jail", target: "player", choices: null, night: false }, ["p5"], null)).toEqual({
      kind: "command",
      command: { type: "day.action", actorId: "me", ability: "jail", targetId: "p5" },
    });
  });
});

describe("voteCommand: votar tocando la lista", () => {
  it("tocar a alguien lo vota; tocar al que ya tienes votado retira el voto (null)", () => {
    const sinVoto = view("voting", {});
    expect(voteCommand(sinVoto, "p2")).toEqual({ type: "vote", voterId: "me", targetId: "p2" });
    const votando = { ...view("voting", {}), votes: { me: "p2" } } as unknown as MatchView;
    expect(voteCommand(votando, "p2")).toEqual({ type: "vote", voterId: "me", targetId: null });
    expect(voteCommand(votando, "p3")).toEqual({ type: "vote", voterId: "me", targetId: "p3" });
  });
});
