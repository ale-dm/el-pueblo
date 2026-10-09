import { describe, expect, it } from "vitest";
import { formatClock, secondsLeft } from "./countdown.js";

describe("cuenta atrás", () => {
  const now = Date.parse("2026-10-08T12:00:00Z");
  it("cuenta los segundos que quedan, sin bajar de cero", () => {
    expect(secondsLeft("2026-10-08T12:00:15Z", now)).toBe(15);
    expect(secondsLeft("2026-10-08T11:59:59Z", now)).toBe(0);
    expect(secondsLeft(null, now)).toBeNull();
  });

  it("se muestra como m:ss", () => {
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(65)).toBe("1:05");
  });
});
