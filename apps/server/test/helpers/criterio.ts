import { ROLE_HANDLERS, type GameEventEnvelope, type Rng } from "@el-pueblo/engine";
import type { MatchView } from "../../src/application/use-cases/getView.js";

/**
 * Jugador "con criterio" para la exploración: decide con lo que un jugador real puede ver, nunca con el estado oculto.
 * Ve su propio rol y sus compañeros de Mafia (`ally`), los votos públicos (de hoy y de días anteriores), las muertes
 * públicas y sus resultados privados de investigación (`investigation.result` con él como investigador). Lo que no
 * puede saber (roles ajenos, objetivos de la Mafia) no entra en ninguna decisión.
 *
 * Reglas, por bando:
 * - Pueblo: vota al jugador con más sospecha (resultado "suspicious" o votos de hoy); se abstiene sin indicios. Condena
 *   salvo que sepa que el acusado es inocente.
 * - Mafia: vota y mata a quien vota contra un compañero (la voz anti-Mafia); si no hay indicios, a cualquiera que no sea
 *   compañero. Absuelve a sus compañeros y condena al resto.
 * - Investigadores: investigan a quien no han investigado, con más votos en contra.
 * - Protectores: protegen al más votado; sin votos, a sí mismos si pueden.
 * - Ejecutor (Vigilante, Jailor): solo dispara a quien tiene sospecha clara (3 o más puntos) o a su preso.
 * - Trampero: pone la trampa solo cuando su propio registro dice "ready" (trampa construida y sin poner).
 * - Modo comunicado: los investigadores declaran su resultado en el chat público ("Resultado: P3 es sospechoso") y el
 *   Pueblo lo cree. La Mafia no declara nada, así que las declaraciones son ciertas en esta exploración.
 * Lo que no tiene regla de criterio (elecciones de rol del Forger, opciones del Hypnotist, el resto del chat) se elige
 * al azar, con el mismo generador que el resto de la exploración.
 */

/** Memoria propia del jugador que el registro público no guarda: a quién encarceló (Jailor). */
export type JailMemory = ReadonlyMap<string, string>;

type Command = Record<string, unknown>;

const pick = <T,>(items: readonly T[], rng: Rng): T => items[rng.int(0, items.length - 1)]!;

/** Mejores de una lista según su puntuación; empates al azar. */
function best<T>(items: readonly T[], score: (item: T) => number, rng: Rng): T | null {
  if (items.length === 0) return null;
  const top = Math.max(...items.map(score));
  return pick(items.filter((item) => score(item) === top), rng);
}

/** Forma de la declaración pública de un resultado de investigación. */
const CLAIM = /^Resultado: (\S+) es (sospechoso|inocente)$/;

export function criterioCommands(view: MatchView, log: readonly GameEventEnvelope[], jailed: JailMemory, rng: Rng, comunicado = false): Command[] {
  const me = view.me;
  const meId = me.id;
  const mafia = me.faction === "mafia";
  const alive = view.players.filter((p) => p.status === "alive");
  const others = alive.filter((p) => p.id !== meId);
  const allies = new Set(view.players.filter((p) => p.ally).map((p) => p.id));
  const enemies = (list: typeof others) => (mafia ? list.filter((p) => !allies.has(p.id)) : list);

  // Lo que el jugador sabe por sus propios resultados de investigación.
  const suspicious = new Set<string>();
  const innocent = new Set<string>();
  const investigated = new Set<string>();
  // Votos públicos de todas las mañanas: quién votó contra quién.
  const castAgainst = new Map<string, string[]>();
  // Resultados propios que aún no ha declarado, y el último estado de su trampa.
  const results: Array<{ id: string; word: "sospechoso" | "inocente" }> = [];
  const declared = new Set<string>();
  const nickOf = new Map(view.players.map((p) => [p.nick, p.id]));
  let trapStatus: string | null = null;
  for (const e of log) {
    if (e.type === "investigation.result" && e.payload.investigatorId === meId) {
      investigated.add(e.payload.targetId);
      if (e.payload.result === "suspicious") suspicious.add(e.payload.targetId);
      if (e.payload.result === "innocent") innocent.add(e.payload.targetId);
      if (e.payload.result === "suspicious" || e.payload.result === "innocent") {
        results.push({ id: e.payload.targetId, word: e.payload.result === "suspicious" ? "sospechoso" : "inocente" });
      }
    }
    if (e.type === "trap.status" && e.payload.trapperId === meId) trapStatus = e.payload.status;
    // Declaraciones públicas: el Pueblo cree las de los demás (modo comunicado); las propias cuentan como ya hechas.
    if (e.type === "chat.message" && e.payload.channel === "public") {
      const match = CLAIM.exec(e.payload.text);
      const id = match ? nickOf.get(match[1]!) : undefined;
      if (match && id !== undefined) {
        if (e.payload.senderId === meId) declared.add(`${id}:${match[2]}`);
        if (comunicado && match[2] === "sospechoso") suspicious.add(id);
        if (comunicado && match[2] === "inocente") innocent.add(id);
      }
    }
    if (e.type === "vote.cast" && e.payload.targetId !== null) {
      castAgainst.set(e.payload.voterId, [...(castAgainst.get(e.payload.voterId) ?? []), e.payload.targetId]);
    }
  }
  const votesOn = (id: string) => Object.values(view.votes).filter((t) => t === id).length;
  const votedAgainstAlly = (id: string) => (castAgainst.get(id) ?? []).some((t) => allies.has(t));
  /** Sospecha de quien mira: resultado de investigación, votos de hoy y, para la Mafia, la voz anti-Mafia. */
  const threat = (id: string) => (suspicious.has(id) ? 3 : 0) + votesOn(id) + (mafia && votedAgainstAlly(id) ? 2 : 0);

  const commands: Command[] = [];
  const push = (command: Command) => commands.push(command);

  if (comunicado && me.status === "alive" && (view.phase === "discussion" || view.phase === "day_1")) {
    const pending = results.find((r) => !declared.has(`${r.id}:${r.word}`));
    const nick = pending && view.players.find((p) => p.id === pending.id)?.nick;
    if (pending && nick) push({ type: "chat.send", senderId: meId, channel: "public", text: `Resultado: ${nick} es ${pending.word}` });
  }

  if (view.phase === "voting" && me.status === "alive") {
    const candidates = enemies(others).filter((p) => !innocent.has(p.id));
    const target = best(candidates, (p) => threat(p.id), rng);
    // Pueblo sin indicios se abstiene; la Mafia siempre presiona a alguien que no sea compañero.
    const targetId = target && (mafia || threat(target.id) > 0) ? target.id : null;
    push({ type: "vote", voterId: meId, targetId });
  }

  if (view.phase === "judgement" && me.status === "alive" && view.defendantId !== meId && view.defendantId !== null) {
    const defendant = view.defendantId;
    const verdict = mafia ? (allies.has(defendant) ? "innocent" : "guilty") : innocent.has(defendant) ? "innocent" : "guilty";
    push({ type: "judgement.vote", voterId: meId, verdict });
  }

  if (view.phase === "night") {
    for (const ab of me.nightAbilities) {
      if (ab.usesLeft === 0) continue;
      if (me.status === "alive" && ab.deadOnly) continue;
      if (me.status !== "alive" && !ab.deadOnly) continue;
      const choice = ab.choices && ab.choices.length > 0 ? pick(ab.choices, rng) : undefined;
      const base = { type: "night.action", actorId: meId, ability: ab.key, ...(choice === undefined ? {} : { choice }) };
      if (ab.target === "none") {
        // Protección propia de un solo uso (selfHeal del Doctor, vest del Bodyguard): solo si le votan hoy. Alerta del
        // Veteran: solo si alguien tiene sospecha. Lo demás no tiene regla y no se usa.
        const use = ab.key === "alert" ? others.some((p) => threat(p.id) >= 2) : ab.key === "selfHeal" || ab.key === "vest" ? votesOn(meId) >= 1 : false;
        if (use) push({ ...base, targetId: null, secondTargetId: null });
        continue;
      }
      if (ab.target === "two") {
        if (ab.key === "disguise") {
          const mole = best(alive.filter((p) => allies.has(p.id) || p.id === meId), () => 0, rng);
          const cover = best(others.filter((p) => !allies.has(p.id)), () => 0, rng);
          if (mole && cover) push({ ...base, targetId: mole.id, secondTargetId: cover.id });
          continue;
        }
        const first = best(others, () => 0, rng);
        const second = others.find((p) => p.id !== first?.id) ?? null;
        if (first && second) push({ ...base, targetId: first.id, secondTargetId: second.id });
        continue;
      }
      let target: string | null = null;
      switch (ab.key) {
        case "kill":
          target = best(enemies(others), (p) => (votedAgainstAlly(p.id) ? 2 : 0) + votesOn(p.id), rng)?.id ?? null;
          break;
        case "investigate":
        case "track":
        case "watch":
        case "bug":
        case "check": {
          const fresh = enemies(others).filter((p) => !investigated.has(p.id));
          target = best(fresh.length ? fresh : enemies(others), (p) => threat(p.id), rng)?.id ?? null;
          break;
        }
        case "heal":
        case "protect": {
          // Si su rol puede curarse a sí mismo: la regla es pública (la wiki de cada rol), como en el cerebro de los bots.
          const self = ROLE_HANDLERS.get(me.roleKey ?? "")?.nightAbilities.find((a) => a.key === ab.key)?.selfAllowed === true;
          const pool = alive.filter((p) => p.id !== meId || self);
          target = best(pool, (p) => votesOn(p.id) + (p.id === meId ? 0.5 : 0), rng)?.id ?? null;
          break;
        }
        case "shoot":
          target = best(others.filter((p) => threat(p.id) >= 3), (p) => threat(p.id), rng)?.id ?? null;
          break;
        case "trap":
          // Solo con la trampa construida y sin poner (wiki: Trapper.md:213, 217; collect.ts).
          target = trapStatus === "ready" ? best(enemies(others).filter((p) => !innocent.has(p.id)), (p) => threat(p.id), rng)?.id ?? null : null;
          break;
        case "forge":
          // Falsifica el testamento de un muerto (wiki: Forger.md:34); el objetivo no puede ser un vivo.
          target = best(view.players.filter((p) => p.status !== "alive"), () => 0, rng)?.id ?? null;
          break;
        case "execute":
          target = jailed.get(meId) ?? null;
          if (target !== null && !alive.some((p) => p.id === target)) target = null;
          break;
        default:
          target = best(enemies(others).filter((p) => !innocent.has(p.id)), (p) => threat(p.id), rng)?.id ?? null;
      }
      if (target !== null) push({ ...base, targetId: target, secondTargetId: null });
    }
  }

  if (view.phase !== "night" && me.status === "alive") {
    for (const ab of me.dayAbilities) {
      if (ab.usesLeft === 0 || ab.target === "none") continue;
      // El Mayor revela cuando le hace falta: el criterio de esta versión no lo usa.
      if (ab.key === "jail") {
        const suspect = best(others, (p) => threat(p.id), rng);
        if (suspect && threat(suspect.id) >= 2) push({ type: "day.action", actorId: meId, ability: ab.key, targetId: suspect.id });
      }
    }
  }
  return commands;
}
