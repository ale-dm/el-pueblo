import { describe, expect, it } from "vitest";
import type { MatchView, PublicPlayer } from "../types.js";
import { isPickableTarget, targetsNeeded } from "./targets.js";

const ability = (key: string, target: "player" | "none" | "two" = "player", usesLeft: number | null = null) => ({
  key, target, usesLeft, choices: null, deadOnly: false, deathNote: false, defaultChoice: null, writesWill: false,
});
function view(phase: string, me: Partial<MatchView["me"]>): MatchView {
  return { phase, dayNumber: 2, players: [], votes: {}, me: { id: "me", status: "alive", nightAbilities: [], dayAbilities: [], ...me } } as unknown as MatchView;
}
const player = (id: string, extra: Partial<PublicPlayer> = {}) => ({ id, status: "alive", ally: false, revealedRoleKey: null, allyRoleKey: null, ...extra }) as PublicPlayer;

describe("targetsNeeded", () => {
  it("de noche, una habilidad con objetivo pide uno; con dos, dos", () => {
    expect(targetsNeeded(view("night", { nightAbilities: [ability("kill")] }))).toEqual({ selectable: true, max: 1, raise: false });
    expect(targetsNeeded(view("night", { nightAbilities: [ability("x", "two")] })).max).toBe(2);
  });
  it("sin habilidad usable, nada se puede elegir", () => {
    expect(targetsNeeded(view("night", { nightAbilities: [ability("kill", "player", 0)] })).selectable).toBe(false);
  });
});

describe("isPickableTarget: Forger", () => {
  it("el Forger no puede elegir a su compañero de Mafia, aunque esté vivo", () => {
    const v = view("night", { nightAbilities: [ability("forge")] });
    expect(isPickableTarget(v, [], player("p2", { ally: true }))).toBe(false);
  });
  it("el Forger sí puede elegir a alguien que no es de la Mafia", () => {
    const v = view("night", { nightAbilities: [ability("forge")] });
    expect(isPickableTarget(v, [], player("p3"))).toBe(true);
  });
  it("quien tiene otra habilidad además de falsificar sí puede elegir a sus compañeros", () => {
    const v = view("night", { nightAbilities: [ability("forge"), ability("disguise")] });
    expect(isPickableTarget(v, [], player("p2", { ally: true }))).toBe(true);
  });
});

describe("isPickableTarget: votación y resto de fases", () => {
  it("votar solo a vivos", () => {
    const v = view("voting", {});
    expect(isPickableTarget(v, [], player("p2"))).toBe(true);
    expect(isPickableTarget(v, [], player("p3", { status: "dead" }))).toBe(false);
  });
  it("nunca se elige a uno mismo", () => {
    expect(isPickableTarget(view("voting", {}), [], player("me"))).toBe(false);
  });
});
