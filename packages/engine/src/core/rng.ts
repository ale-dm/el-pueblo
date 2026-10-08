/**
 * Generador pseudoaleatorio con semilla (mulberry32). Mismo seed, mismas partidas: necesario para
 * reproducir una partida desde sus eventos y para tests deterministas. El motor nunca usa Math.random.
 */
export interface Rng {
  /** Número en [0, 1). */
  next(): number;
  /** Entero en [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Copia barajada del array (Fisher–Yates). El original no cambia. */
  shuffle<T>(items: readonly T[]): T[];
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      if (max < min) throw new RangeError(`int(${min}, ${max}): rango vacío`);
      return min + Math.floor(next() * (max - min + 1));
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}
