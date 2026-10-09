import type { GameEvent, Phase } from "../types.js";
import { HYPNOSIS_TEXT, abilityLabel } from "./text.js";
import { alignmentLabel, roleName } from "./roles.js";

/**
 * Registro de la partida, como en Town of Salem: separadores "Día N" / "Noche N", lo que pasó
 * durante la noche aparece al amanecer, los votos cambian con sus mensajes y el juicio enseña
 * quién votó qué. Los eventos internos (juicio intermedio, etc.) no se muestran.
 */

export type LogTone = "info" | "private" | "danger" | "good";

export type LogItem =
  | { kind: "separator"; key: string; seq: number; text: string; night: boolean }
  | { kind: "line"; key: string; seq: number; text: string; tone: LogTone };

export interface LogContext {
  meId: string;
  /** El jugador tiene habilidad nocturna y está vivo: se le avisa si no actúa. */
  hasNightAbility: boolean;
  nick: (id: string) => string;
  /** Votantes que cuentan ahora (vivos y conectados). Para el umbral de juicio. */
  voters: number;
}

const VERDICT_ES = { guilty: "culpable", innocent: "inocente" } as const;

const CAUSE_ES: Record<string, string> = {
  mafia: "ha sido asesinado por la Mafia",
  shot: "ha sido abatido a tiros",
  execute: "ha sido ejecutado",
  ambush: "ha sido emboscado",
  veteran: "ha sido abatido por un Veterano",
  trap: "ha caído en una trampa",
  crusade: "ha sido abatido por el Cruzado",
  bodyguard: "ha muerto en un duelo con un Guardaespaldas",
  guilt: "se ha quitado la vida por culpa",
};

const WIN_ES = { town: "¡Gana el pueblo!", mafia: "¡Gana la Mafia!" } as const;

/** Eventos de la noche que se cuentan al amanecer, no en el momento. */
const MORNING = new Set([
  "player.killed", "investigation.result", "attack.prevented", "night.action.blocked", "player.blackmailed",
  "hypnosis.message", "role.promoted",
]);

/** Grupo que revela el Investigador: "Pueblo (Apoyo)", "Mafia (Engaño)"… */
function alignmentEs(key: string): string {
  return alignmentLabel(key) ?? (key === "unknown" ? "desconocido" : key.replace(/_/g, " "));
}

/** Frase de un resultado de investigación (solo lo ve quien investigó). */
export function investigationText(p: Record<string, any>, nick: (id: string) => string): string {
  const t = p.targetId ? nick(p.targetId) : "";
  switch (p.check) {
    case "suspicious":
      return p.result === "suspicious" ? `${t} parece sospechoso.` : `${t} parece inocente.`;
    case "alignment":
      return `${t} pertenece al bando ${alignmentEs(String(p.result))}.`;
    case "role":
      return `${t} es ${p.result}.`;
    case "visitors":
      return p.result === "nadie" ? `Nadie visitó a ${t} esta noche.` : `Visitaron a ${t}: ${p.result}.`;
    case "targets":
      return p.result === "nadie" ? `${t} no visitó a nadie.` : `${t} visitó a: ${p.result}.`;
    case "mafiaVisits":
      return p.result === "nadie" ? "Esta noche la Mafia no visitó a nadie." : `La Mafia visitó: ${p.result}.`;
    case "vision":
      // Wiki (Psychic): impares, al menos uno de la Mafia; pares, al menos uno del Pueblo.
      if (p.result === "nadie") return "Esta noche no viste a nadie.";
      if (p.side === "mafia") return `Al menos uno es de la Mafia: ${p.result}.`;
      if (p.side === "town") return `Al menos uno es del Pueblo: ${p.result}.`;
      return `Visión de esta noche: ${p.result}.`;
    default:
      return `Resultado: ${p.result}.`;
  }
}

/** Construye las líneas del registro a partir de los eventos, en orden. */
export function buildLog(events: readonly GameEvent[], ctx: LogContext): LogItem[] {
  const items: LogItem[] = [];
  let phase: Phase | null = null;
  let morning: LogItem[] = [];
  let trialsToday = 0;
  let defendant: string | null = null;
  let verdictVotes: Array<{ voter: string; verdict: string }> = [];
  let lastVote = new Map<string, string | null>();
  let submittedTonight = false;

  const line = (e: GameEvent, text: string, tone: LogTone = "info") => {
    const item: LogItem = { kind: "line", key: `l${e.seq}`, seq: e.seq, text, tone };
    if (phase === "night" && MORNING.has(e.type)) morning.push(item);
    else items.push(item);
  };
  const separator = (e: GameEvent, text: string, night: boolean) => items.push({ kind: "separator", key: `s${e.seq}`, seq: e.seq, text, night });
  /** Testamento al morir: el texto tal cual, o que no había ninguno. */
  const willLine = (e: GameEvent, will: string | null, playerId: string) => {
    line(e, will ? `Testamento de ${ctx.nick(playerId)}: "${will}"` : `No encontramos un testamento de ${ctx.nick(playerId)}.`, will ? "info" : "private");
  };
  /** Lo de la noche sale al amanecer, justo después del separador del día. */
  const flushMorning = () => {
    items.push(...morning);
    morning = [];
  };

  for (const e of events) {
    const p = e.payload;
    switch (e.type) {
      case "phase.started": {
        const next = p.phase as Phase;
        if (next === "day_1") {
          trialsToday = 0;
          separator(e, "Día 1", false);
          line(e, "Primer día: nadie puede ser juzgado hoy.");
        } else if (next === "night") {
          submittedTonight = false;
          separator(e, `Noche ${p.dayNumber}`, true);
          line(e, "Cae la noche.");
        } else if (next === "discussion") {
          if (phase === "night" && ctx.hasNightAbility && !submittedTonight) {
            morning.push({ kind: "line", key: `n${e.seq}`, seq: e.seq, text: "No realizaste tu habilidad nocturna.", tone: "private" });
          }
          trialsToday = 0;
          separator(e, `Día ${p.dayNumber}`, false);
          flushMorning();
        } else if (next === "voting") {
          lastVote = new Map();
          line(e, `Votación: hacen falta ${Math.ceil(ctx.voters / 2)} votos para llevar a alguien a juicio.`);
          line(e, `Quedan ${Math.max(0, 3 - trialsToday)} juicios posibles hoy.`);
        } else if (next === "defense" && defendant) {
          line(e, `${ctx.nick(defendant)} se defiende.`);
        } else if (next === "judgement") {
          verdictVotes = [];
          line(e, "Juicio: ¿culpable o inocente?");
        } else if (next === "last_words" && defendant) {
          line(e, `${ctx.nick(defendant)}, tus últimas palabras.`, "danger");
        }
        phase = next;
        break;
      }
      case "trial.started":
        defendant = p.defendantId;
        trialsToday++;
        verdictVotes = [];
        line(e, `${ctx.nick(p.defendantId)} va a juicio.`, "danger");
        break;
      case "vote.cast": {
        const voter = p.voterId as string;
        const target = p.targetId as string | null;
        const had = lastVote.has(voter);
        const previous = lastVote.get(voter) ?? null;
        if (had && previous === target) break;
        lastVote.set(voter, target);
        if (target === null) {
          line(e, had && previous ? `${ctx.nick(voter)} retira su voto.` : `${ctx.nick(voter)} se abstiene.`);
        } else if (had && previous) {
          line(e, `${ctx.nick(voter)} cambia su voto a ${ctx.nick(target)}.`);
        } else {
          line(e, `${ctx.nick(voter)} vota a ${ctx.nick(target)}.`);
        }
        break;
      }
      case "judgement.cast":
        verdictVotes.push({ voter: p.voterId, verdict: p.verdict });
        break;
      case "trial.verdict": {
        for (const v of verdictVotes) line(e, `${ctx.nick(v.voter)} votó ${VERDICT_ES[v.verdict as keyof typeof VERDICT_ES]}.`);
        if (p.verdict === "guilty") {
          // Pesos del motor (el Mayor revelado vale 3); sin ellos, se cuentan votos.
          const guilty = p.guiltyWeight ?? verdictVotes.filter((v) => v.verdict === "guilty").length;
          const innocent = p.innocentWeight ?? verdictVotes.length - verdictVotes.filter((v) => v.verdict === "guilty").length;
          line(e, `El Pueblo ha decidido ahorcar a ${ctx.nick(p.defendantId)} por ${guilty} votos a ${innocent}.`, "danger");
        } else {
          line(e, `${ctx.nick(p.defendantId)} es declarado inocente.`, "good");
        }
        break;
      }
      case "player.hanged": {
        const role = roleName(p.roleKey);
        line(e, `${ctx.nick(p.playerId)} ha sido ahorcado${role ? `. Era ${role}` : ""}.`, "danger");
        willLine(e, p.will, p.playerId);
        break;
      }
      case "player.killed": {
        const role = roleName(p.roleKey);
        const cause = CAUSE_ES[p.cause] ?? "ha muerto";
        line(e, `${ctx.nick(p.playerId)} murió anoche: ${cause}. ${role ? `Era ${role}.` : "No pudimos determinar su rol."}`, "danger");
        willLine(e, p.will, p.playerId);
        break;
      }
      case "night.action.submitted":
        if (p.actorId === ctx.meId) {
          submittedTonight = true;
          line(e, `Has decidido ${abilityLabel(p.ability)}${p.targetId ? ` a ${ctx.nick(p.targetId)}` : ""} esta noche.`, "private");
        } else {
          // Solo llega a la Mafia viva: decisiones de los compañeros.
          line(e, `${ctx.nick(p.actorId)} ha elegido ${abilityLabel(p.ability)}${p.targetId ? ` a ${ctx.nick(p.targetId)}` : ""}.`, "private");
        }
        break;
      case "night.action.cancelled":
        if (p.actorId === ctx.meId) {
          submittedTonight = false;
          line(e, "Has cancelado tu acción esta noche.", "private");
        } else {
          line(e, `${ctx.nick(p.actorId)} ha cancelado su acción.`, "private");
        }
        break;
      case "investigation.result":
        line(e, investigationText(p, ctx.nick), "private");
        break;
      case "attack.prevented":
        line(e, `Has protegido a ${ctx.nick(p.victimId)} de un ataque.`, "good");
        break;
      case "night.action.blocked":
        line(e, "Tu acción fue bloqueada esta noche.", "private");
        break;
      case "player.jailed":
        line(e, "Has sido encarcelado.", "private");
        break;
      case "player.blackmailed":
        line(e, "Estás silenciado durante el día.", "private");
        break;
      case "mayor.revealed":
        line(e, `${ctx.nick(p.playerId)} se revela como Alcalde: su voto cuenta por tres.`, "good");
        break;
      case "trap.placed":
        line(e, `Has colocado una trampa en ${ctx.nick(p.targetId)}.`, "private");
        break;
      case "hypnosis.message":
        line(e, HYPNOSIS_TEXT[p.message] ?? "Algo extraño te ocurrió anoche.", "private");
        break;
      case "will.forged":
        line(e, `Has falsificado el testamento de ${ctx.nick(p.playerId)}: parecerá que era ${roleName(p.role)}.`, "private");
        break;
      case "role.promoted":
        if (p.roleKey === "godfather") {
          // Wiki (Mafioso): si muere el Godfather y queda un Mafioso vivo, este pasa a Godfather.
          line(e, p.playerId === ctx.meId ? "Eres el nuevo Godfather: ahora decides a quién mata la Mafia." : `${ctx.nick(p.playerId)} se convierte en Godfather.`, "danger");
        } else {
          line(e, p.playerId === ctx.meId ? "Eres el nuevo Mafioso: ya no queda nadie de la Mafia que mate." : `${ctx.nick(p.playerId)} se convierte en Mafioso.`, "danger");
        }
        break;
      case "game.ended":
        flushMorning();
        separator(e, "Fin de la partida", false);
        line(e, WIN_ES[p.winner as keyof typeof WIN_ES] ?? "Fin de la partida", "good");
        break;
      default:
        break;
    }
  }
  return items;
}

/** Contexto del registro para una vista: nombres, votantes y si el jugador tiene habilidad nocturna. */
export function logContext(view: { me: { id: string; status: string; nightAbilities: unknown[] }; players: Array<{ id: string; nick: string; status: string; connected: boolean }> }): LogContext {
  return {
    meId: view.me.id,
    hasNightAbility: view.me.status === "alive" && view.me.nightAbilities.length > 0,
    nick: (id) => view.players.find((p) => p.id === id)?.nick ?? "?",
    voters: view.players.filter((p) => p.status === "alive" && p.connected).length,
  };
}
