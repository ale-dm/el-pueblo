import { describe, expect, it } from "vitest";
import { createRng } from "../src/core/rng.js";

describe("createRng", () => {
  it("con la misma semilla produce la misma secuencia", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 15));
    const seqB = Array.from({ length: 20 }, () => b.int(1, 15));
    expect(seqA).toEqual(seqB);
  });

  it("int respeta los límites inclusivos", () => {
    const rng = createRng(7);
    const values = Array.from({ length: 500 }, () => rng.int(3, 5));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(5);
    expect(values.every(Number.isInteger)).toBe(true);
  });

  it("int rechaza un rango vacío", () => {
    expect(() => createRng(1).int(5, 3)).toThrow(RangeError);
  });

  it("shuffle conserva los elementos y no modifica el original", () => {
    const rng = createRng(99);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(original);
    expect([...shuffled].sort()).toEqual([...original].sort());
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
