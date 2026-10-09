import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";
import type { GameState } from "../src/types/state.js";

// Wiki (docs/roles/Medium.md:483; docs/wiki/Messages_ToS.md:1957): "You have opened a communication with the living!" —
// "Displays at the beginning of the night to a dead Medium that seanced a player."

const notices = (events: ReturnType<typeof step>["events"]) =>
  ofType(events, "night.notice").map((e) => [e.audiencePlayerId, e.payload.notice]);

/** Medium muerto (p1) que abre su sesión con p3 de día 2, y pasa a la noche. */
function openedSession(): GameState {
  const s = game(["medium", "godfather", "investigator", "sheriff"]);
  s.players[0] = { ...s.players[0]!, status: "dead" };
  const day = { ...s, phase: "discussion" as const, dayNumber: 2 };
  return step(day, { type: "day.action", actorId: "p1", ability: "seance", targetId: "p3" }).state;
}

describe("Medium muerto: 'You have opened a communication with the living!' (wiki: Medium.md:483)", () => {
  it("al empezar la noche, el Médium muerto que abrió la sesión lo recibe, en privado", () => {
    const { events, state } = step({ ...openedSession(), phase: "voting" }, timer());
    expect(state.phase).toBe("night");
    expect(notices(events)).toContainEqual(["p1", "medium_opened"]);
    const opened = ofType(events, "night.notice").find((e) => e.payload.notice === "medium_opened")!;
    expect(opened.visibility).toBe("private");
    expect(opened.audiencePlayerId).toBe("p1");
  });

  it("el vivo al que se habla recibe su aviso, pero no el de apertura", () => {
    const { events } = step({ ...openedSession(), phase: "voting" }, timer());
    expect(notices(events)).toContainEqual(["p3", "medium_talking"]);
    expect(notices(events).some(([who, n]) => who === "p3" && n === "medium_opened")).toBe(false);
  });

  it("un Médium muerto que no abre sesión no recibe el aviso", () => {
    const s = game(["medium", "godfather", "investigator", "sheriff"], { phase: "voting", dayNumber: 2 });
    s.players[0] = { ...s.players[0]!, status: "dead" };
    const { events } = step(s, timer());
    expect(notices(events).some(([, n]) => n === "medium_opened")).toBe(false);
  });

  it("el aviso al objetivo sale al empezar la noche, justo después de phase.started (wiki: Medium.md:209)", () => {
    // Medium.md:209: "Your target will start the Night with the message "A medium is talking to you!"."
    const { events } = step({ ...openedSession(), phase: "voting" }, timer());
    const types = events.map((e) => (e.type === "night.notice" ? `notice:${e.payload.notice}` : e.type));
    const started = types.indexOf("phase.started");
    expect(types.indexOf("notice:medium_talking")).toBeGreaterThan(started);
    expect(types.indexOf("notice:medium_talking")).toBeGreaterThanOrEqual(0);
  });
});
