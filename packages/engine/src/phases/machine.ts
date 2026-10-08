import { err, ok, type Result } from "../core/result.js";
import type { Catalog } from "../types/catalog.js";
import type { EventInput } from "../types/events.js";
import type { GameState } from "../types/state.js";
import type { Rng } from "../core/rng.js";
import { trialCandidate } from "../rules/voting.js";
import { phaseStarted, playerOf, votingPlayers, withVictory } from "./context.js";
import { resolveNight } from "./night/pipeline.js";
import { handlerOf } from "./context.js";

const MAX_TRIALS_PER_DAY = 3;

/** Avance por tiempo: cada fase termina cuando vence su temporizador. Las transiciones están en docs/ENGINE.md. */
export function onTimerExpired(s: GameState, catalog: Catalog, rng: Rng): Result<EventInput[]> {
  switch (s.phase) {
    case "day_1":
      return ok([phaseStarted("discussion", s.dayNumber)]);
    case "discussion":
      return ok([phaseStarted("voting", s.dayNumber)]);
    case "voting":
      return ok(resolveVoting(s));
    case "defense":
      return ok([phaseStarted("judgement", s.dayNumber)]);
    case "judgement":
      return ok(resolveJudgement(s));
    case "last_words":
      return ok([phaseStarted("night", s.dayNumber)]);
    case "night":
      return ok(resolveNightPhase(s, catalog, rng));
    case "ended":
      return err("wrong_phase", "La partida ha terminado");
  }
}

function resolveVoting(s: GameState): EventInput[] {
  const voters = votingPlayers(s);
  const votes = new Map<string, string | null>();
  for (const v of voters) {
    if (s.votes[v.id] !== undefined) votes.set(v.id, s.votes[v.id]!);
  }
  const weightOf = (id: string) => (playerOf(s, id)?.flags.mayorRevealed ? 3 : 1);
  const candidate = trialCandidate(votes, voters.length, weightOf);
  if (candidate !== null && s.trialsToday < MAX_TRIALS_PER_DAY) {
    return [{ type: "trial.started", payload: { defendantId: candidate } }, phaseStarted("defense", s.dayNumber)];
  }
  return [phaseStarted("night", s.dayNumber)];
}

function resolveJudgement(s: GameState): EventInput[] {
  const defendant = playerOf(s, s.defendantId ?? "");
  if (!defendant) return [phaseStarted("voting", s.dayNumber)];
  const voters = votingPlayers(s).filter((p) => p.id !== defendant.id);
  let guilty = 0;
  let innocent = 0;
  for (const v of voters) {
    // SUPUESTO: quien no emite veredicto cuenta como inocente.
    if (s.verdicts[v.id] === "guilty") guilty++;
    else innocent++;
  }
  const verdict = guilty > innocent ? "guilty" : "innocent";
  const events: EventInput[] = [{ type: "trial.verdict", payload: { defendantId: defendant.id, verdict } }];
  if (verdict === "guilty") {
    const roleKey = defendant.roleKey;
    events.push({ type: "player.hanged", payload: { playerId: defendant.id, roleKey } });
    const withEnd = withVictory(s, events);
    if (withEnd.length > events.length) return withEnd;
    return [...events, phaseStarted("last_words", s.dayNumber)];
  }
  // Inocente o empate: el día sigue con el tiempo restante, salvo que se agoten los juicios.
  if (s.trialsToday >= MAX_TRIALS_PER_DAY) return [...events, phaseStarted("night", s.dayNumber)];
  return [...events, phaseStarted("voting", s.dayNumber)];
}

function resolveNightPhase(s: GameState, catalog: Catalog, rng: Rng): EventInput[] {
  const events = resolveNight(s, catalog, rng);
  const withEnd = withVictory(s, events);
  if (withEnd.length > events.length) return withEnd;
  return [...events, phaseStarted("discussion", s.dayNumber + 1)];
}

export { handlerOf };
