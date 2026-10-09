import { writeFileSync } from "node:fs";
import { createRng, type Rng } from "@el-pueblo/engine";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/testApp.js";
import { AppError } from "../../src/application/errors.js";

/**
 * Exploración de partidas completas con acciones de todos los tipos (no solo las de un caso).
 * Diez humanos por partida eligen acciones aleatorias, legales casi siempre: votos, juicios, chat en
 * todos los canales, habilidades de noche y de día con todas sus formas, cancelaciones y testamentos.
 * Una parte de las acciones son ilegales a propósito y deben rechazarse con error de comando.
 * Cualquier otro rechazo, excepción o incumplimiento de invariante es una anomalía.
 *
 * Variables: EXPLORE_GAMES (nº de partidas, 25 por defecto), EXPLORE_REPORT (ruta JSON opcional).
 */
const GAMES = Number(process.env.EXPLORE_GAMES ?? 25);
const MAX_STEPS = 400;
/** Códigos de error esperados cuando la acción elegida no es legal en ese momento. */
const EXPECTED_REJECTIONS = new Set(["engine_rejected", "invalid_state"]);

const settle = () => new Promise((resolve) => setImmediate(resolve));
const pick = <T,>(rng: Rng, items: readonly T[]): T => items[rng.int(0, items.length - 1)]!;
const WORDS = ["hola", "sospecho", "voto", "inocente", "culpable", "¿quién?", "ojo", "yo soy Town", "mentira", "sí"];
const text = (rng: Rng) => Array.from({ length: rng.int(1, 4) }, () => pick(rng, WORDS)).join(" ");
/** Clave de cobertura: por canal de chat, por habilidad, o por tipo de comando. */
const keyOf = (c: Record<string, any>) =>
  c.type === "chat.send" ? `chat.send:${c.channel}` : c.type === "night.action" || c.type === "day.action" ? `${c.type}:${c.ability}` : String(c.type);

interface Anomaly { game: number; step: number; kind: string; detail: string }
interface Report {
  games: number;
  finished: number;
  steps: number;
  winners: Record<string, number>;
  accepted: Record<string, number>;
  rejected: Record<string, number>;
  anomalies: Anomaly[];
  observations: Record<string, number>;
}

async function playGame(game: number, report: Report, bots = 0) {
  const app = createTestApp();
  const rng = createRng(1000 + game);
  const host = await app.services.createRoom({ nick: "P1", bots });
  const seats: Array<{ playerId: string; token: string }> = [host];
  for (let i = 2; i <= 10 - bots; i++) seats.push(await app.services.joinRoom({ roomCode: host.roomCode, nick: `P${i}` }));
  await app.services.startMatch({ matchId: host.matchId, token: host.token });
  const matchId = host.matchId;
  const anomaly = (step: number, kind: string, detail: string) => report.anomalies.push({ game, step, kind, detail });
  const count = (map: Record<string, number>, key: string) => (map[key] = (map[key] ?? 0) + 1);

  for (let step = 0; step < MAX_STEPS; step++) {
    const match = await app.matches.findById(matchId);
    if (match?.status === "finished") break;
    report.steps++;

    // Invariantes sobre el registro: secuencia contigua y muertos que no actúan.
    const log = await app.events.read(matchId);
    log.forEach((e, i) => {
      if (e.seq !== i + 1) anomaly(step, "secuencia", `evento ${i} con seq ${e.seq}`);
    });
    const dead = new Set<string>();
    for (const e of log) {
      if (e.type === "player.killed" || e.type === "player.hanged") dead.add(e.payload.playerId);
    }
    // La tabla de jugadores debe reflejar las muertes del registro (recordDeaths, en cada comando y temporizador).
    const deadInRoster = new Set((await app.players.listByMatch(matchId)).filter((p) => p.status === "dead").map((p) => p.id));
    if (deadInRoster.size !== dead.size || [...dead].some((id) => !deadInRoster.has(id))) {
      anomaly(step, "roster-desincronizado", `registro ${[...dead].join(",")} / tabla ${[...deadInRoster].join(",")}`);
    }

    const order = [...seats];
    for (let i = order.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    for (const seat of order) {
      if (rng.next() < 0.3) continue;
      const view = await app.services.getView({ matchId, token: seat.token });
      if (view.phase === "ended") break;
      const me = view.me;
      const alive = view.players.filter((p: any) => p.status === "alive").map((p: any) => p.id as string);
      const others = alive.filter((id) => id !== seat.playerId);
      const commands: Array<Record<string, unknown>> = [];
      const actorId = seat.playerId;
      const legal = me.status === "alive";

      if (legal && view.phase === "voting") {
        commands.push({ type: "vote", voterId: actorId, targetId: rng.next() < 0.2 ? null : others.length ? pick(rng, others) : null });
      }
      if (legal && view.phase === "judgement" && view.defendantId !== actorId) {
        commands.push({ type: "judgement.vote", voterId: actorId, verdict: rng.next() < 0.5 ? "guilty" : "innocent" });
      }
      if (rng.next() < 0.5) {
        const channels = ["public", "whisper", "mafia", "jail", "seance", "dead"] as const;
        const channel = pick(rng, channels);
        const recipient = pick(rng, [...others, ...alive]);
        commands.push({ type: "chat.send", senderId: actorId, channel, text: text(rng), ...(channel === "whisper" ? { recipientId: recipient } : {}) });
      }
      if (rng.next() < 0.2) commands.push({ type: "will.write", playerId: actorId, text: rng.next() < 0.1 ? "" : text(rng) });
      // Death Note del asesino: solo en la mañana que anuncia a la víctima (Death_Note_ToS.md:17); fuera de esa ventana debe rechazarse.
      const authored = log.filter(
        (e): e is typeof e & { type: "death.note.authored"; payload: { victimId: string; authorId: string } } =>
          e.type === "death.note.authored" && (e.payload as { authorId: string }).authorId === actorId,
      );
      if (authored.length > 0 && rng.next() < 0.6) {
        const note = pick(rng, authored);
        commands.push({ type: "death.note.write", actorId, victimId: note.payload.victimId, note: text(rng) });
      }
      if (me.nightAction && rng.next() < 0.1) commands.push({ type: "night.action.cancel", actorId });
      if (view.phase === "night") {
        for (const ab of me.nightAbilities) {
          if (ab.usesLeft === 0) continue;
          if (rng.next() < 0.3) continue;
          const target = rng.next() < 0.1 ? actorId : rng.next() < 0.05 ? "no-existe" : pick(rng, [...others, ...alive]);
          if (ab.target === "none") {
            commands.push({ type: "night.action", actorId, ability: ab.key, targetId: null, secondTargetId: null });
          } else if (ab.target === "two") {
            const second = pick(rng, alive);
            commands.push({ type: "night.action", actorId, ability: ab.key, targetId: target, secondTargetId: second });
          } else {
            const choice = ab.choices ? pick(rng, ab.choices as string[]) : undefined;
            commands.push({ type: "night.action", actorId, ability: ab.key, targetId: target, secondTargetId: null, ...(choice ? { choice } : {}) });
          }
        }
      }
      if (view.phase !== "night" && legal) {
        for (const ab of me.dayAbilities) {
          if (ab.usesLeft === 0 || rng.next() < 0.5) continue;
          commands.push({ type: "day.action", actorId, ability: ab.key, targetId: ab.target === "none" ? null : pick(rng, others) });
        }
      }

      for (const command of commands) {
        const kind = String(command.type);
        const key = keyOf(command);
        try {
          await app.services.submitCommand({ matchId, token: seat.token, command: command as any });
          count(report.accepted, key);
          // Un muerto solo actúa con la sesión de Médium; cualquier otra acción aceptada es una anomalía.
          // La Death Note de un asesino muerto no se cambia (decisión del proyecto, ver writeDeathNote): también es anomalía.
          if (dead.has(actorId) && !(kind === "night.action" && command.ability === "seance") && kind !== "chat.send") {
            anomaly(step, "muerto-actua", `${kind} ${JSON.stringify(command)}`);
          }
        } catch (error) {
          if (error instanceof AppError && EXPECTED_REJECTIONS.has(error.code)) {
            count(report.rejected, `${key}:${error.code}`);
          } else {
            anomaly(step, "error-inesperado", `${kind}: ${error instanceof AppError ? error.code : "excepción"} ${(error as Error).message}`);
          }
        }
        await settle();
      }
    }

    // Los bots actúan antes que el temporizador de la fase, como en producción (ver bots.test.ts).
    app.scheduler.fire(app.services.botKey(matchId));
    await settle();
    app.scheduler.fire(matchId);
    await settle();
  }

  const finalMatch = await app.matches.findById(matchId);
  if (finalMatch?.status === "finished") {
    report.finished++;
    // Los vivos salen del registro de eventos (fuente de verdad); la tabla de jugadores debe coincidir (ver invariante arriba).
    const logAtEnd = await app.events.read(matchId);
    const deadAtEnd = new Set(logAtEnd.filter((e) => e.type === "player.killed" || e.type === "player.hanged").map((e) => e.payload.playerId));
    const roster = await app.players.listByMatch(matchId);
    const alive = roster.filter((p) => !deadAtEnd.has(p.id));
    const endEvent = (await app.events.read(matchId)).find((e) => e.type === "game.ended");
    const winner = String(endEvent?.payload.winner);
    report.winners[winner] = (report.winners[winner] ?? 0) + 1;
    // Sin vivos de una facción, gana la otra. Con vivos de las dos, solo vale el detector de empate
    // (1 contra 1, Victory_ToS.md): exactamente dos jugadores vivos.
    const town = alive.filter((p) => p.faction === "town").length;
    const mafia = alive.filter((p) => p.faction === "mafia").length;
    const expected = mafia === 0 ? "town" : town === 0 ? "mafia" : null;
    if (expected !== null && winner !== expected) anomaly(-1, "ganador", `evento ${winner}, vivos ${town} town / ${mafia} mafia`);
    if (expected === null && alive.length !== 2) {
      const tail = (await app.events.read(matchId)).slice(-12).map((e) => `${e.seq}:${e.type}${e.type === "phase.started" ? `(${e.payload.phase})` : ""}${e.type === "player.killed" || e.type === "player.hanged" ? `(${e.payload.playerId})` : ""}`);
      anomaly(-1, "fin-sin-motivo", `evento ${winner} con ${alive.length} vivos; cola: ${tail.join(" ")}`);
    }
  } else {
    anomaly(-1, "partida-no-termina", `tras ${MAX_STEPS} pasos`);
  }
}

describe("exploración de partidas completas con todas las acciones", () => {
  it(`${GAMES} partidas de 10 humanos y ${GAMES} con 5 humanos y 5 bots terminan sin anomalías`, async () => {
    const report: Report = { games: GAMES * 2, finished: 0, steps: 0, winners: {}, accepted: {}, rejected: {}, anomalies: [], observations: {} };
    for (let game = 1; game <= GAMES; game++) await playGame(game, report);
    for (let game = 1; game <= GAMES; game++) await playGame(GAMES + game, report, 5);
    if (process.env.EXPLORE_REPORT) writeFileSync(process.env.EXPLORE_REPORT, JSON.stringify(report, null, 2));
    expect(report.anomalies.slice(0, 20)).toEqual([]);
    expect(report.finished).toBe(GAMES * 2);
  }, 600_000);
});
