import type { Catalog } from "../types/catalog.js";
import type { Command } from "../types/commands.js";
import type { EventInput, GameEventEnvelope } from "../types/events.js";
import type { GameState } from "../types/state.js";
import type { Rng } from "./rng.js";
import { err, ok, type Result } from "./result.js";
import { emit } from "../events/emit.js";
import { BLACKMAIL_LINE, chatDenied, seanceHearers, seanceRecipient, type ChatChannel } from "../rules/chat.js";
import { castVote, dayAction, judgementVote } from "../phases/day.js";
import { cancelNightAction, nightAction, writeDeathNote, writeWill } from "../phases/night/collect.js";
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
      return nightAction(state, command.actorId, command.ability, command.targetId, command.secondTargetId ?? null, command.choice ?? null, command.note ?? null, command.forgedWill ?? null);
    case "night.action.cancel":
      return cancelNightAction(state, command.actorId);
    case "will.write":
      return writeWill(state, command.playerId, command.text);
    case "death.note.write":
      return writeDeathNote(state, command.actorId, command.victimId, command.note);
    case "chat.send": {
      const text = command.text.trim();
      if (text.length === 0 || text.length > MAX_CHAT_LENGTH) {
        return err("invalid_command", `El mensaje debe tener entre 1 y ${MAX_CHAT_LENGTH} caracteres`);
      }
      const denied = chatDenied(state, command.senderId, command.channel as ChatChannel, command.recipientId);
      if (denied) return err("invalid_command", denied);
      if (command.channel === "seance") {
        // Médium: el destinatario sale del estado (el vivo con quien habla esta noche). Lo oyen el vivo y
        // todos los Médiums que le hablan (wiki: Medium.md:207); una copia para cada uno.
        const recipientId = seanceRecipient(state, command.senderId);
        const hearers = seanceHearers(state, command.senderId);
        if (!recipientId || hearers.length === 0) return err("invalid_command", "No tienes ninguna sesión abierta esta noche");
        return ok(hearers.map((audienceId) => ({ type: "chat.message", payload: { channel: "seance", senderId: command.senderId, text, recipientId, audienceId } })));
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
        // Wiki (Blackmailer.md:207, 227, 375): el Blackmailer, vivo o muerto, oye los susurros del día. No se le
        // duplica si es quien susurra o quien recibe.
        const eavesdroppers = state.players
          .filter((p) => p.roleKey === "blackmailer" && p.id !== command.senderId && p.id !== recipientId)
          .map((p) => p.id);
        return ok([
          { type: "chat.message", payload: { channel: "whisper", senderId: command.senderId, text, recipientId, audienceId: recipientId } },
          { type: "chat.message", payload: { channel: "whisper", senderId: command.senderId, text, recipientId, audienceId: command.senderId } },
          ...eavesdroppers.map((audienceId) => ({ type: "chat.message" as const, payload: { channel: "whisper" as const, senderId: command.senderId, text, recipientId, audienceId } })),
        ]);
      }
      if (command.channel === "dead") {
        const sender = state.players.find((p) => p.id === command.senderId)!;
        // Wiki (Medium.md:189): el Médium vivo habla de noche con los muertos; ellos lo ven como "Medium".
        if (sender.status === "alive") {
          return ok([
            { type: "chat.message", payload: { channel: "dead", senderId: command.senderId, text, anonymous: true } },
            { type: "chat.message", payload: { channel: "dead", senderId: command.senderId, text, anonymous: true, audienceId: command.senderId } },
          ]);
        }
        // Un muerto habla con los muertos; de noche, cada Médium vivo también lo oye (Medium.md:186).
        const listeners = state.phase === "night" ? state.players.filter((p) => p.status === "alive" && p.roleKey === "medium") : [];
        return ok([
          { type: "chat.message", payload: { channel: "dead", senderId: command.senderId, text } },
          ...listeners.map((m) => ({ type: "chat.message" as const, payload: { channel: "dead" as const, senderId: command.senderId, text, audienceId: m.id } })),
        ]);
      }
      // Wiki (Blackmailer.md:213): un silenciado en su defensa solo dice "I am blackmailed.".
      const blackmailed = state.players.find((p) => p.id === command.senderId)?.flags.blackmailed === true;
      return ok([{ type: "chat.message", payload: { channel: command.channel, senderId: command.senderId, text: blackmailed ? BLACKMAIL_LINE : text } }]);
    }
    case "timer.expired":
      return onTimerExpired(state, ctx.catalog, ctx.rng);
    default: {
      const never: never = command;
      return err("invalid_command", `Comando desconocido: ${JSON.stringify(never)}`);
    }
  }
}
