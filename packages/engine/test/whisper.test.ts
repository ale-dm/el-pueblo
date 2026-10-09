import { describe, expect, it } from "vitest";
import { apply } from "../src/core/apply.js";
import { decide } from "../src/core/decide.js";
import { projectFor } from "../src/projection/visibility.js";
import type { GameEventEnvelope } from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import { ctx, game } from "./helpers/game.js";

const whisper = (s: GameState, from: string, to: string, text = "hola") =>
  decide(s, { type: "chat.send", senderId: from, channel: "whisper", text, recipientId: to }, ctx());

describe("susurros", () => {
  it("se registran para quien susurra y para quien recibe, y nadie más los ve", () => {
    const s = game(["doctor", "godfather", "investigator"], { phase: "discussion", dayNumber: 2 });
    const r = whisper(s, "p1", "p3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
    const after = r.value.reduce(apply, s);
    const seenBy = (id: string) => projectFor(r.value, after.players.find((p) => p.id === id)!).length;
    expect(seenBy("p1")).toBe(1); // quien susurra
    expect(seenBy("p3")).toBe(1); // quien recibe
    expect(seenBy("p2")).toBe(0); // la Mafia no lo ve
  });

  it("solo de día, entre vivos, y no a uno mismo", () => {
    expect(whisper(game(["doctor", "godfather"], { phase: "night", dayNumber: 2 }), "p1", "p2").ok).toBe(false);
    expect(whisper(game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 }), "p1", "p1").ok).toBe(false);
    const dead = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    dead.players[1]!.status = "dead";
    expect(whisper(dead, "p1", "p2").ok).toBe(false);
  });

  it("un silenciado no susurra", () => {
    const s = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    s.players[0]!.flags = { blackmailed: true };
    expect(whisper(s, "p1", "p2").ok).toBe(false);
  });

  it("no sirve el canal de susurro sin destinatario", () => {
    const s = game(["doctor", "godfather"], { phase: "discussion", dayNumber: 2 });
    expect(decide(s, { type: "chat.send", senderId: "p1", channel: "whisper", text: "x" }, ctx()).ok).toBe(false);
  });
});

describe("Mayor revelado y susurros (wiki: Mayor.md:203)", () => {
  const revealed = (s: GameState, id: string) => {
    s.players.find((p) => p.id === id)!.flags = { mayorRevealed: true };
    return s;
  };

  it("un Mayor revelado no susurra, con el mensaje de la wiki", () => {
    const s = revealed(game(["mayor", "godfather"], { phase: "discussion", dayNumber: 2 }), "p1");
    const r = whisper(s, "p1", "p2");
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.error.message).toBe("You can't whisper once you have revealed as the Mayor!");
  });

  it("nadie susurra a un Mayor revelado, con el mensaje de la wiki", () => {
    const s = revealed(game(["doctor", "mayor"], { phase: "discussion", dayNumber: 2 }), "p2");
    const r = whisper(s, "p1", "p2");
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.error.message).toBe("You can't whisper to a revealed Mayor.");
  });

  it("antes de revelarse el Mayor sí susurra, y sigue sin poder hacerlo al revelarse", () => {
    const s = game(["mayor", "doctor"], { phase: "discussion", dayNumber: 2 });
    expect(whisper(s, "p1", "p2").ok).toBe(true);
    expect(whisper(revealed(s, "p1"), "p1", "p2").ok).toBe(false);
  });
});
