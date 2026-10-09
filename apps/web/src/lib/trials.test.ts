import { describe, expect, it } from "vitest";
import { trialsLeftToday } from "./trials.js";
import type { GameEvent } from "../types.js";

const e = (type: string, payload: Record<string, any> = {}): GameEvent => ({ seq: 1, type, payload, visibility: "public", audiencePlayerId: null });

describe("juicios que quedan hoy", () => {
  it("empieza en 3 cada día", () => {
    expect(trialsLeftToday([e("phase.started", { phase: "discussion", dayNumber: 2 })])).toBe(3);
  });

  it("cada juicio resta uno, y el día nuevo lo reinicia", () => {
    const log = [
      e("phase.started", { phase: "discussion", dayNumber: 2 }),
      e("trial.started", { defendantId: "a" }),
      e("trial.started", { defendantId: "b" }),
      e("phase.started", { phase: "night", dayNumber: 2 }),
    ];
    expect(trialsLeftToday(log)).toBe(1);
    expect(trialsLeftToday([...log, e("phase.started", { phase: "discussion", dayNumber: 3 })])).toBe(3);
  });
});
