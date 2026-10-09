import type { MatchView } from "../types.js";

/** Votos necesarios para un juicio (mayoría de los que pueden votar) y el más votado hasta ahora. */
export function voteStatus(view: MatchView): { needed: number; leader: { nick: string; count: number } | null } {
  const voters = view.players.filter((p) => p.status === "alive" && p.connected).length;
  const counts = new Map<string, number>();
  for (const target of Object.values(view.votes)) if (target) counts.set(target, (counts.get(target) ?? 0) + 1);
  let top: { id: string; count: number } | null = null;
  for (const [id, count] of counts) if (!top || count > top.count) top = { id, count };
  return {
    needed: Math.ceil(voters / 2),
    leader: top ? { nick: view.players.find((p) => p.id === top!.id)?.nick ?? "?", count: top.count } : null,
  };
}
