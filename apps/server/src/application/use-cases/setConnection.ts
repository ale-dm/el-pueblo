import type { PlayerStore } from "../ports.js";

/** Marca a un jugador como conectado o desconectado. Un desconectado no vota y no cuenta para la mayoría. */
export function setConnection(deps: { players: PlayerStore }) {
  return async (matchId: string, playerId: string, connected: boolean): Promise<void> => {
    const roster = await deps.players.listByMatch(matchId);
    const player = roster.find((p) => p.id === playerId);
    if (!player || player.connected === connected) return;
    await deps.players.update({ ...player, connected });
  };
}
