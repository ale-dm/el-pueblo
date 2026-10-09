import { createRng, replay } from "@el-pueblo/engine";
import type { Command } from "@el-pueblo/engine";
import { AppError } from "../errors.js";
import { planBotCommands } from "../bots/brain.js";
import { initialState } from "../state/initialState.js";
import type { EventLog, MatchStore, PlayerStore, Security } from "../ports.js";

export interface BotTurnDeps {
  matches: MatchStore;
  players: PlayerStore;
  events: EventLog;
  security: Security;
  /** Envía un comando como si lo hubiera enviado el jugador (pasa por la misma cola y validaciones). */
  submit: (input: { matchId: string; token: string; command: Command }) => Promise<unknown>;
}

/**
 * Turno de los bots de una partida, al empezar cada fase. Lee el estado fuera de la cola y envía
 * cada comando por el caso de uso normal. Si el estado cambió entre medias, el motor rechaza el
 * comando y se ignora: el siguiente inicio de fase vuelve a planear.
 */
export function botTurn(deps: BotTurnDeps) {
  return async (matchId: string): Promise<number> => {
    const match = await deps.matches.findById(matchId);
    if (!match || match.status !== "playing") return 0;

    const roster = await deps.players.listByMatch(matchId);
    const botIds = new Set(roster.filter((p) => p.isBot).map((p) => p.id));
    if (botIds.size === 0) return 0;

    const history = await deps.events.read(matchId);
    const state = replay(initialState(match, roster), history);
    if (state.phase === "ended") return 0;

    const rng = createRng(match.seed + state.seq * 31 + 7);
    let sent = 0;
    for (const { botId, command } of planBotCommands(state, botIds, rng)) {
      try {
        await deps.submit({ matchId, token: deps.security.botToken(matchId, botId), command });
        sent++;
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
      }
    }
    return sent;
  };
}
