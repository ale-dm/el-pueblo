import type { Catalog } from "../types/catalog.js";
import type { Command } from "../types/commands.js";
import type { EventInput, GameEventEnvelope } from "../types/events.js";
import type { GameState } from "../types/state.js";
import type { Rng } from "./rng.js";
import { err, ok, type Result } from "./result.js";
import { emit } from "../events/emit.js";
import { chatDenied, seanceRecipient, type ChatChannel } from "../rules/chat.js";
import { castVote, dayAction, judgementVote } from "../phases/day.js";
import { cancelNightAction, nightAction, writeWill } from "../phases/night/collect.js";
import { onTimerExpired } from "../phases/machine.js";
import { startGame } from "../setup/startGame.js";

export interface EngineContext {
  catalog: Catalog;
  rng: Rng;
  /** Tiempo de referencia. El motor no lee el reloj. */
  now: Date;
}

const MAX_CHAT_LENGTH = 500;

/**
 * (estado, comando) → eventos numerados. Función pura: sin I/O, sin reloj, sin azar fuera de `ctx.rng`.
 * Un comando inválido devuelve un error y no produce eventos.
 */
export function decide(state: GameState, command: Command, ctx: EngineContext): Result<GameEventEnvelope[]> {
  const inputs = dispatch(state, command, ctx);
  if (!inputs.ok) return inputs;
  return ok(emit(state.seq, inputs.value));
}

function dispatch(state: GameState, command: Command, ctx: EngineContext): Result<EventInput[]> {
  if (state.phase === "ended" && command.type !== "chat.send") {
    return err("wrong_phase", "La partida ha terminado");
  }
  switch (command.type) {
    case "game.start":
      return startGame(state, command, ctx.catalog, ctx.rng);
    case "vote":
      return castVote(state, command.voterId, command.targetId);
    case "judgement.vote":
      return judgementVote(state, command.voterId, command.verdict);
    case "day.action":
      return dayAction(state, ctx.catalog, command.actorId, command.ability, command.targetId);
    case "night.action":
      return nightAction(state, command.actorId, command.ability, command.targetId, command.secondTargetId ?? null, command.choice ?? null);
    case "night.action.cancel":
      return cancelNightAction(state, command.actorId);
    case "will.write":
      return writeWill(state, command.playerId, command.text);
    case "chat.send": {
      const text = command.text.trim();
      if (text.length === 0 || text.length > MAX_CHAT_LENGTH) {
        return err("invalid_command", `El mensaje debe tener entre 1 y ${MAX_CHAT_LENGTH} caracteres`);
      }
      const denied = chatDenied(state, command.senderId, command.channel as ChatChannel, command.recipientId);
      if (denied) return err("invalid_command", denied);
      if (command.channel === "seance") {
        // Médium: el destinatario sale del estado (el vivo con quien habla esta noche).
        const recipientId = seanceRecipient(state, command.senderId);
        if (!recipientId) return err("invalid_command", "No tienes ninguna sesión abierta esta noche");
        return ok([
          { type: "chat.message", payload: { channel: "seance", senderId: command.senderId, text, recipientId, audienceId: recipientId } },
          { type: "chat.message", payload: { channel: "seance", senderId: command.senderId, text, recipientId, audienceId: command.senderId } },
        ]);
      }
      if (command.channel === "jail") {
        // El destinatario sale del estado: el Jailor habla con su prisionero y al revés.
        const recipientId = state.jailedBy[command.senderId] ?? Object.keys(state.jailedBy).find((id) => state.jailedBy[id] === command.senderId)!;
        return ok([
          { type: "chat.message", payload: { channel: "jail", senderId: command.senderId, text, recipientId, audienceId: recipientId } },
          { type: "chat.message", payload: { channel: "jail", senderId: command.senderId, text, recipientId, audienceId: command.senderId } },
        ]);
      }
      if (command.channel === "whisper") {
        const recipientId = command.recipientId!;
        return ok([
          { type: "chat.message", payload: { channel: "whisper", senderId: command.senderId, text, recipientId, audienceId: recipientId } },
          { type: "chat.message", payload: { channel: "whisper", senderId: command.senderId, text, recipientId, audienceId: command.senderId } },
        ]);
      }
      return ok([{ type: "chat.message", payload: { channel: command.channel, senderId: command.senderId, text } }]);
    }
    case "timer.expired":
      return onTimerExpired(state, ctx.catalog, ctx.rng);
    default: {
      const never: never = command;
      return err("invalid_command", `Comando desconocido: ${JSON.stringify(never)}`);
    }
  }
}
