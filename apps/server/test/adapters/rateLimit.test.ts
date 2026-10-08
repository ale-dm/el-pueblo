import { describe, expect, it } from "vitest";
import { RateLimiter } from "../../src/adapters/inbound/socket-io/rateLimit.js";

describe("RateLimiter", () => {
  it("permite hasta el máximo dentro de la ventana y luego libera al pasar el tiempo", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([true, true, false]);
    now = 1001;
    expect(limiter.hit("a")).toBe(true);
  });

  it("las claves son independientes", () => {
    const limiter = new RateLimiter(1, 1000, () => 0);
    expect(limiter.hit("a")).toBe(true);
    expect(limiter.hit("b")).toBe(true);
    expect(limiter.hit("a")).toBe(false);
  });
});
