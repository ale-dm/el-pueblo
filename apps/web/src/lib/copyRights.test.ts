import { describe, expect, it } from "vitest";
import { copyBlocked } from "./copyRights.js";
import type { MatchView } from "../types.js";

const view = (meId: string) => ({ me: { id: meId } }) as unknown as MatchView;

describe("copiar mensajes del chat (wiki: Medium.md:197, 215)", () => {
  it("nadie copia los mensajes de la sesión de Médium (Medium.md:215)", () => {
    expect(copyBlocked(view("a"), { channel: "seance", senderId: "b" })).toBe(true);
    expect(copyBlocked(view("b"), { channel: "seance", senderId: "b" })).toBe(true);
  });

  it("los muertos no copian sus propios mensajes del Ultratumba (Medium.md:197)", () => {
    expect(copyBlocked(view("a"), { channel: "dead", senderId: "a" })).toBe(true);
  });

  it("sí se copian los mensajes ajenos del Ultratumba y los de la plaza", () => {
    expect(copyBlocked(view("a"), { channel: "dead", senderId: "b" })).toBe(false);
    expect(copyBlocked(view("a"), { channel: "public", senderId: "a" })).toBe(false);
  });
});
