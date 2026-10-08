import type { PlayerId } from "../types/ids.js";

/**
 * Votos necesarios para llevar a juicio: ceil(vivos / 2).
 * Verificado contra la tabla de la wiki (Trial System): 15→8, 14→7, 13→7, 12→6, 11→6, 10→5, 9→5, 8→4, 7→4, 6→3, 5→3, 4→2, 3→2.
 */
export function votesRequired(aliveCount: number): number {
  if (!Number.isInteger(aliveCount) || aliveCount < 1) {
    throw new RangeError(`votesRequired: vivos inválidos (${aliveCount})`);
  }
  return Math.ceil(aliveCount / 2);
}

/** Recuento de votos por objetivo. Los votos nulos (abstención) no cuentan. */
export function tallyVotes(votes: ReadonlyMap<PlayerId, PlayerId | null>): Map<PlayerId, number> {
  const counts = new Map<PlayerId, number>();
  for (const target of votes.values()) {
    if (target === null) continue;
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  return counts;
}

/**
 * Acusado que llega a juicio, o null.
 * SUPUESTO (pendiente de verificar en la wiki): hace falta el máximo de votos, que sea único (empate = nadie)
 * y que alcance votesRequired(vivos).
 */
export function trialCandidate(
  votes: ReadonlyMap<PlayerId, PlayerId | null>,
  aliveCount: number,
): PlayerId | null {
  const counts = tallyVotes(votes);
  const required = votesRequired(aliveCount);
  let best: PlayerId | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [target, count] of counts) {
    if (count > bestCount) {
      best = target;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  if (best === null || tied || bestCount < required) return null;
  return best;
}
