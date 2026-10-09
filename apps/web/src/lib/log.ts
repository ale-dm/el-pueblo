import type { GameEvent, Phase } from "../types.js";
import { HYPNOSIS_TEXT, abilityLabel } from "./text.js";
import { roleName, roleNameEn } from "./roles.js";

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
  /** Rol del jugador que mira: el Mafioso recibe las órdenes del Godfather (wiki: Mafioso.md:225). */
  meRoleKey?: string | null;
  /** El jugador tiene habilidad nocturna y está vivo: se le avisa si no actúa. */
  hasNightAbility: boolean;
  nick: (id: string) => string;
  /** Votantes que cuentan ahora (vivos y conectados). Para el umbral de juicio. */
  voters: number;
}

const VERDICT_ES = { guilty: "culpable", innocent: "inocente" } as const;

const CAUSE_ES: Record<string, string> = {
  mafia: "ha sido asesinado por la Mafia",
  // Wiki (Vigilante.md:374): "[They were] shot by a Vigilante."
  shot: "ha sido abatido por un Vigilante",
  // Wiki (Jailor.md:602): "[They were] executed by the Jailor."
  execute: "ha sido ejecutado por el Jailor",
  ambush: "ha sido emboscado",
  // Wiki (Veteran.md:490): "[They were] killed by a Veteran."
  veteran: "ha sido asesinado por un Veterano",
  // Wiki (Trapper.md:364): "[They were] killed by a Trapper."
  trap: "ha sido asesinado por un Trapper",
  crusade: "ha sido abatido por el Cruzado",
  // Wiki (Bodyguard.md:446): "[They were] killed by a Bodyguard." (el atacante que cayó en el duelo).
  bodyguard: "ha sido asesinado por un Guardaespaldas",
  // Wiki (Bodyguard.md:450): "[They] died guarding someone." (el Bodyguard que murió protegiendo).
  guarding: "ha muerto protegiendo a alguien",
  // Wiki (Vigilante.md:378): "[They] died from guilt." (el Vigilante que mató a un Town la noche anterior).
  guilt: "ha muerto por la culpa",
};

const WIN_ES = { town: "¡Gana el pueblo!", mafia: "¡Gana la Mafia!" } as const;

/** Motivos de la nota del Jailor (wiki: Death_Note_ToS.md:76-88; Jailor.md:308-320). */
const JAILOR_REASON_ES: Record<string, string> = {
  no_reason: "Sin motivo especificado.",
  evildoer: "Se sabe que es un malvado.",
  contradictory: "Su confesión fue contradictoria.",
  possessed: "Está poseído y dice tonterías.",
  quiet: "Está demasiado callado o no responde a las preguntas.",
  outsider: "Es un forastero que podría volverse contra nosotros.",
  discretion: "Lo decido según mi criterio.",
};

/** Eventos de la noche que se cuentan al amanecer, no en el momento. */
const MORNING = new Set([
  "player.killed", "investigation.result", "attack.prevented", "night.action.blocked", "player.blackmailed",
  "hypnosis.message", "role.promoted", "night.notice", "uses.left", "clean.revealed", "trap.triggered",
]);

/** Avisos privados de la noche (evento night.notice). */
const NOTICE_TEXT: Record<string, string> = {
  target_jailed: "Tu objetivo estaba encarcelado: tu habilidad no tuvo efecto.",
  attack_attempt: "Alguien intentó atacarte mientras estabas encarcelado.",
  medium_talking: "Un médium te está hablando.",
  transport_jailed: "Uno de tus objetivos estaba encarcelado: no pudiste transportarles.",
  jailed_transport_attempt: "Alguien intentó transportarte, pero estabas encarcelado.",
  transported: "Fuiste transportado a otro lugar.",
  // Wiki (Doctor.md:225): "You were attacked but someone nursed you back to health!"
  healed: "Te atacaron, pero alguien te curó.",
  // Wiki (Doctor.md:223): "Your target was attacked last night!"
  target_attacked: "Tu objetivo fue atacado anoche.",
  // Wiki (Messages_ToS.md:383): "Your target's defense was too strong to kill." (Godfather.md:233)
  godfather_target_defense: "La defensa de tu objetivo fue demasiado fuerte para matarle.",
  // Wiki (Vigilante.md:362): "You have put away your gun for killing a town member."
  vigilante_put_away_gun: "Has guardado tu pistola por matar a un miembro del pueblo.",
  // Wiki (Vigilante.md:370): "You could not get over the guilt of killing a town member. You shot yourself!"
  vigilante_guilt_suicide: "No pudiste superar la culpa de matar a un miembro del pueblo. ¡Te has disparado!",
  // Wiki (Veteran.md:486): "Someone tried to attack you but your defense while on alert was too strong!"
  alert_blocked: "Alguien intentó atacarte, pero tu defensa en alerta fue demasiado fuerte.",
  // Wiki (Bodyguard.md:250): "You were attacked but your bulletproof vest saved you!"
  vest_saved: "Te atacaron, pero tu chaleco antibalas te salvó.",
  // Wiki (Blackmailer.md:395): "Someone tried to blackmail you but you were in jail last night."
  blackmail_jailed: "Alguien intentó chantajearte, pero anoche estabas encarcelado.",
  // Wiki (Jailor.md:282, 284): "The jailor has decided to Execute you." / "The jailor has changed his mind."
  // Wiki (Jailor.md:558, 560): "You were hauled off to jail!" al empezar la noche, para el prisionero.
  jailed: "Fuiste arrastrado a la cárcel.",
  jailor_execute: "El Jailor ha decidido ejecutarte.",
  jailor_changed_mind: "El Jailor ha cambiado de opinión.",
  // Wiki (Psychic.md:318, 322): "The town is too small..." / "The town is too evil..."
  psychic_small: "El pueblo es demasiado pequeño para encontrar a un malvado con precisión.",
  psychic_evil: "El pueblo es demasiado malvado para encontrar a nadie bueno.",
  // Wiki (Trapper.md:348): "You triggered a trap!"
  trap_triggered: "¡Has activado una trampa!",
  // Wiki (Trapper.md:352): "You were attacked but a trap saved you!"
  trap_saved: "Te atacaron, pero una trampa te salvó.",
  // Wiki (Tavern_Keeper.md:353, Bootlegger.md:346): "Someone tried to role block you but you are immune!"
  blocked_immune: "Alguien intentó bloquearte, ¡pero eres inmune!",
  // Wiki (Tavern_Keeper.md:357, Bootlegger.md:350): "Someone tried to role block you but you were in jail."
  blocked_jailed: "Alguien intentó bloquearte, pero estabas encarcelado.",
  // Wiki (Tavern_Keeper.md:349): "Someone occupied your night. You were role blocked!" (sin acción que cancelar)
  blocked_occupied: "Alguien ocupó tu noche. ¡Has sido bloqueado!",
  // Wiki (Veteran.md:478): "You were shot by the Veteran you visited!"
  veteran_shot_you: "¡Te ha disparado el Veterano al que visitaste!",
  // Wiki (Veteran.md:482): "You shot someone who visited you last night!"
  veteran_shot_visitor: "Disparaste a alguien que te visitó anoche.",
  // Wiki (Bodyguard.md:438): "You were attacked but someone fought off your attacker!"
  bodyguard_saved: "Te atacaron, pero alguien rechazó a tu atacante.",
  // Wiki (Bodyguard.md:434): "You were killed by a Bodyguard!"
  bodyguard_killed_you: "¡Te ha matado un Guardaespaldas!",
  // Wiki (Bodyguard.md:430): "You were killed protecting your target!"
  bodyguard_killed_protecting: "¡Has muerto protegiendo a tu objetivo!",
  // Wiki (Vigilante.md:358): "You decide to wait a day before using your gun."
  vigilante_wait_day: "Decides esperar un día antes de usar tu pistola.",
  // Wiki (Vigilante.md:366): "You were shot by a Vigilante!"
  vigilante_shot_you: "¡Te ha disparado un Vigilante!",
  // Wiki (Jailor.md:562): "You dragged your target off to jail!"
  jailor_dragged: "Has arrastrado a tu objetivo a la cárcel.",
  // Wiki (Jailor.md:550): "You must wait a day before executing."
  jailor_wait_day: "Debes esperar un día antes de ejecutar.",
  // Wiki (Jailor.md:294; Messages_ToS.md:1687): "You have slain a town member so you can't attack again."
  jailor_slain_town: "Has matado a un miembro del pueblo, así que no puedes volver a atacar.",
  // Wiki (Messages_ToS.md:1731): "You could not attack your target because they were in jail." (Godfather.md:233; Mafioso.md:235)
  attack_jailed: "No pudiste atacar a tu objetivo porque estaba encarcelado.",
  // Wiki (Messages_ToS.md:1873; Crusader.md:216): "You were attacked but someone protected you!"
  crusader_protected: "Te atacaron, pero alguien te protegió.",
};

/** Estado de la trampa al empezar la noche (wiki: Trapper.md:340, 342, 344). */
const TRAP_STATUS_TEXT: Record<string, string> = {
  building: "Estás construyendo tu trampa.",
  ready: "Tu trampa está lista para ser colocada.",
  set: "Tu trampa está puesta.",
};

/**
 * Grupo que revela el Investigador (wiki: Investigator.md, "Classic Investigator Results"): "P3 podría ser un
 * Vigilante, Veteran, Mafioso o Ambusher." Los nombres de rol van en inglés; el resto, en español.
 * Vacío: el rol no tiene fila en la tabla Classic (Crusader, Psychic, Tracker, Trapper; SKIPPED).
 */
export function groupText(result: string, target: string): string {
  const keys = result ? result.split(",") : [];
  if (keys.length === 0) return `El resultado de ${target} no está definido en la tabla Classic.`;
  const names = keys.map(roleNameEn);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} o ${names[names.length - 1]}` : names[0];
  return `${target} podría ser un ${list}.`;
}

/** Espionaje del Spy (wiki: Spy.md:189-205): una frase por lo que recibió el objetivo esta noche. */
export function bugText(result: string, target: string): string {
  if (result === "nada") return `${target} no recibió nada esta noche.`;
  const sentence: Record<string, string> = {
    // Wiki (Spy.md:221-309): cada frase es el mensaje de la tabla del Spy, en español.
    jail: `${target} estaba encarcelado: no pudiste espiarle.`,
    // Spy.md:225: "Your target was Transported to another location."
    transport: `${target} fue transportado a otra casa.`,
    // Spy.md:227: "Someone occupied your target's night. They were role blocked!"
    block: `Alguien ocupó la noche de ${target}: fue bloqueado.`,
    // Spy.md:229: "Someone threatened to reveal your target's secrets. They were blackmailed!"
    blackmail: `Alguien amenazó con revelar los secretos de ${target}: fue chantajeado.`,
    // Spy.md:263: "Someone tried to role block your target but they were immune!"
    block_immune: `Alguien intentó bloquear a ${target}, pero era inmune.`,
    // Spy.md:239: "Your target was attacked by a member of the Mafia!"
    attack_mafia: `${target} fue atacado por un miembro de la Mafia.`,
    // Spy.md:243: "Your target was shot by a Vigilante!"
    attack_shot: `${target} fue disparado por un Vigilante.`,
    // Spy.md:247: "Your target was shot by the Veteran they visited!"
    attack_veteran: `${target} fue disparado por el Veterano al que visitó.`,
    // Spy.md:237: "Your target was attacked but someone nursed them back to health!"
    attack_healed: `${target} fue atacado, pero alguien le curó.`,
    // Spy.md:255: "A Bodyguard attacked your target but someone nursed them back to health!" (el atacante, curado).
    bodyguard_attack_healed: `Un Guardaespaldas atacó a ${target}, pero alguien le curó.`,
    // Spy.md:235: "Your target was attacked but someone fought off their attacker!"
    attack_fought_off: `${target} fue atacado, pero alguien repelió al atacante.`,
    // Spy.md:271: "Your target was attacked but their bulletproof vest saved them!"
    attack_vest: `${target} fue atacado, pero su chaleco antibalas le salvó.`,
    // Spy.md:273: "Someone tried to attack your alert target and failed!"
    attack_alert: `Alguien intentó atacar a ${target}, que estaba en alerta, y falló.`,
    // Spy.md:261: "Someone attacked your target but their Defense was too strong!"
    attack_defense: `Alguien atacó a ${target}, pero su defensa era demasiado fuerte.`,
    // Spy.md:259: "Your target was killed by a Bodyguard!"
    killed_by_bodyguard: `Un Guardaespaldas mató a ${target}.`,
    // Spy.md:249: "Your target was killed protecting someone!"
    killed_guarding: `${target} murió protegiendo a alguien.`,
    // Spy.md:275: "Your target shot themselves over the guilt of killing a town member!"
    killed_guilt: `${target} se disparó por la culpa de matar a un miembro del pueblo.`,
    // Claves anteriores al lote 9, de partidas guardadas: se leen con su frase antigua.
    attack: `${target} fue atacado.`,
    protect: `Alguien le protegió del ataque.`,
  };
  return result
    .split(",")
    .map((tag) => {
      // Wiki (Hypnotist.md:226; Spy.md:191): el mensaje falso de la Hypnotist, tal como lo recibe el objetivo.
      if (tag.startsWith("hypno_")) return `${target} recibió este mensaje de la Hypnotist: «${HYPNOSIS_TEXT[tag.slice(6)] ?? ""}»`;
      return sentence[tag];
    })
    .filter(Boolean)
    .join(" ");
}

/** Frase de un resultado de investigación (solo lo ve quien investigó). */
export function investigationText(p: Record<string, any>, nick: (id: string) => string): string {
  const t = p.targetId ? nick(p.targetId) : "";
  switch (p.check) {
    case "suspicious":
      return p.result === "suspicious" ? `${t} parece sospechoso.` : `${t} parece inocente.`;
    case "group":
      return groupText(String(p.result), t);
    case "role":
      return `${t} es ${p.result}.`;
    case "visitors": {
      // Wiki (Lookout.md:358, 362): "(Player) visited your target last night!" por cada visitante identificado;
      // si hubo más de tres, "More people visited your target but you couldn't identify them."
      if (p.result === "nadie") return `Nadie visitó a ${t} esta noche.`;
      const lines = String(p.result).split(", ").map((n) => `${n} visitó a ${t} anoche.`);
      const more = p.more ? ` Más gente visitó a ${t}, pero no pudiste identificarlos.` : "";
      return `${lines.join(" ")}${more}`;
    }
    case "targets":
      // Wiki (Tracker.md:322): "Your target visited (Player)!", uno por cada persona visitada.
      return p.result === "nadie" ? `${t} no visitó a nadie.` : String(p.result).split(", ").map((n) => `Tu objetivo visitó a ${n}.`).join(" ");
    case "mafiaVisits":
      return p.result === "nadie" ? "Esta noche la Mafia no visitó a nadie." : `La Mafia visitó: ${p.result}.`;
    case "bug":
      return bugText(String(p.result), t);
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
      // Wiki (Death_Note_ToS.md:17): el asesino cambia la nota durante el anuncio de la mañana; el registro la muestra.
      case "death.note.written":
        line(e, p.note ? `La nota de muerte de ${ctx.nick(p.victimId)} cambió: "${p.note}"` : `La nota de muerte de ${ctx.nick(p.victimId)} se quitó.`, "info");
        break;
      case "player.killed": {
        const role = roleName(p.roleKey);
        const cause = CAUSE_ES[p.cause] ?? "ha muerto";
        // Varias causas (Messages_ToS.md:151, 154): la primera va en la línea de la muerte y cada una de las demás en su
        // propia línea, en la forma "also" (Jailor.md:602: "[They were] also executed by the Jailor."). El motor pone
        // todas las causas en `causes` (lote 9, K6; ver muerte-dos-causas.test.ts).
        const extraCauses: string[] = Array.isArray(p.causes) ? p.causes.slice(1) : [];
        const roleText = role ? `Era ${role}.` : p.cleaned ? "Su rol aparece como Limpiado." : "No pudimos determinar su rol.";
        line(e, `${ctx.nick(p.playerId)} murió anoche: ${cause}. ${roleText}`, "danger");
        for (const extra of extraCauses) line(e, `${ctx.nick(p.playerId)} también ${CAUSE_ES[extra] ?? "ha muerto"}.`, "danger");
        // Wiki (Death_Note_ToS.md:92): la nota del Jailor dice a todos por qué ejecutó.
        if (Array.isArray(p.reasons)) line(e, `Nota del Jailor: ${p.reasons.map((r: string) => JAILOR_REASON_ES[r] ?? r).join(" ")}`, "info");
        // Wiki (Death_Note_ToS.md:5, 17): la nota de muerte del asesino se muestra al amanecer junto a la víctima.
        if (typeof p.note === "string" && p.note) line(e, `Nota de muerte: "${p.note}"`, "info");
        willLine(e, p.will, p.playerId);
        break;
      }
      case "night.action.submitted":
        if (p.actorId === ctx.meId) {
          submittedTonight = true;
          line(e, `Has decidido ${abilityLabel(p.ability)}${p.targetId ? ` a ${ctx.nick(p.targetId)}` : ""} esta noche.`, "private");
        } else if (p.roleKey === "godfather" && p.ability === "kill" && ctx.meRoleKey === "mafioso") {
          // Wiki (Mafioso.md:225, 479): al final de la noche, el Mafioso recibe la orden del Godfather.
          const item: LogItem = { kind: "line", key: `l${e.seq}`, seq: e.seq, text: "El Godfather te ha ordenado matar a su objetivo.", tone: "private" };
          if (phase === "night") morning.push(item);
          else items.push(item);
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
        // Wiki (Tavern_Keeper.md:347, Bootlegger.md:340): "Someone occupied your night. You were role blocked!"
        line(e, p.cause === "jail" ? "Tu acción fue bloqueada esta noche." : "Alguien ocupó tu noche. ¡Has sido bloqueado!", "private");
        break;
      case "night.notice":
        // Wiki (Jailor.md:566): "(Player) was hauled off to jail"
        if (p.notice === "team_jailed") line(e, `${ctx.nick(p.subjectId)} fue arrastrado a la cárcel.`, "private");
        // Wiki (Jailor.md:252): el visitante sabe que su objetivo estaba encarcelado; el prisionero, de los atacantes.
        else line(e, NOTICE_TEXT[p.notice] ?? "Algo ocurrió anoche.", "private");
        break;
      case "uses.left": {
        // Wiki (Vigilante, Veteran): "You have (#) bullet(s) left" / "You have (#) alert(s) left."
        // Wiki (Bodyguard.md:426): "You have (#) bulletproof vest(s) left."
        const noun = p.ability === "vest" ? (p.left === 1 ? "chaleco antibalas" : "chalecos antibalas")
          : p.ability === "shoot" ? (p.left === 1 ? "bala" : "balas") : p.left === 1 ? "alerta" : "alertas";
        line(e, `${p.left === 1 ? "Te queda" : "Te quedan"} ${p.left} ${noun}.`, "private");
        break;
      }
      case "clean.revealed":
        // Wiki (Janitor.md:214): "You secretly know that your target's role was [Role]."
        // Wiki (Janitor.md:224): "You secretly know your targets last will." Solo si había testamento (Janitor.md:222).
        line(
          e,
          `Sabes en secreto que el rol de ${ctx.nick(p.playerId)} era ${p.roleKey ? roleNameEn(p.roleKey) : "desconocido"}.` +
            (p.will ? ` Sabes en secreto el testamento de ${ctx.nick(p.playerId)}: «${p.will}»` : ""),
          "private",
        );
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
      case "trap.status":
        line(e, TRAP_STATUS_TEXT[p.status] ?? "", "private");
        break;
      case "trap.triggered":
        // Wiki (Trapper.md:362): "Your trap has been triggered by the (Role)." una vez por visitante, con su rol real.
        for (const role of p.roles as string[]) line(e, `Tu trampa ha sido activada por el rol ${roleName(role) ?? role}.`, "private");
        // Wiki (Trapper.md:356): "Your trap attacked someone!"
        if (p.attacked) line(e, "¡Tu trampa ha atacado a alguien!", "private");
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
export function logContext(view: { me: { id: string; status: string; nightAbilities: unknown[]; roleKey?: string | null }; players: Array<{ id: string; nick: string; status: string; connected: boolean }> }): LogContext {
  return {
    meId: view.me.id,
    hasNightAbility: view.me.status === "alive" && view.me.nightAbilities.length > 0,
    meRoleKey: view.me.roleKey,
    nick: (id) => view.players.find((p) => p.id === id)?.nick ?? "?",
    voters: view.players.filter((p) => p.status === "alive" && p.connected).length,
  };
}
