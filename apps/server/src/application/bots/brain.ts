import { ROLE_HANDLERS, type Command, type GameState, type PlayerState, type Rng } from "@el-pueblo/engine";

/**
 * Cerebro de los bots: elige comandos legales según la fase. Es deliberadamente simple:
 * vota al azar entre los jugadores vivos, actúa de noche con su primera habilidad disponible
 * y usa las habilidades de día de forma esporádica. Los errores del motor se ignoran al enviar.
 */

/** Probabilidad de abstenerse en una votación. */
const ABSTAIN_CHANCE = 0.15;
/** Probabilidad de usar una habilidad de día en una fase. */
const DAY_ACTION_CHANCE = 0.3;
/** Probabilidad de condenar a un acusado que no es de su bando (los bandos Town no lo saben). */
const TOWN_GUILTY_CHANCE = 0.4;

export interface BotCommand {
  botId: string;
  command: Command;
}

/** Planea los comandos de todos los bots vivos para el estado actual. */
export function planBotCommands(state: GameState, botIds: ReadonlySet<string>, rng: Rng): BotCommand[] {
  const plan: BotCommand[] = [];
  for (const bot of state.players) {
    // Los muertos solo actúan de noche, y solo con habilidades de muerto (Medium).
    if (!botIds.has(bot.id) || (bot.status !== "alive" && state.phase !== "night")) continue;
    for (const command of commandsFor(state, bot, rng)) plan.push({ botId: bot.id, command });
  }
  return plan;
}

function commandsFor(state: GameState, bot: PlayerState, rng: Rng): Command[] {
  switch (state.phase) {
    case "day_1":
    case "discussion":
      return dayCommands(state, bot, rng);
    case "voting":
      return [voteCommand(state, bot, rng), ...dayCommands(state, bot, rng)].filter(isCommand);
    case "judgement":
      return bot.id === state.defendantId ? [] : [judgementCommand(state, bot, rng)];
    case "night":
      return [nightCommand(state, bot, rng)].filter(isCommand);
    default:
      return [];
  }
}

const isCommand = (c: Command | null): c is Command => c !== null;

/** Jugadores que cuentan como objetivo: vivos y, si no se permite, sin el propio bot. Mafia no se elige a sí misma. */
function targetsFor(state: GameState, actor: PlayerState, selfAllowed: boolean): PlayerState[] {
  const others = state.players.filter((p) => p.status === "alive" && (selfAllowed || p.id !== actor.id));
  return actor.faction === "mafia" ? others.filter((p) => p.faction !== "mafia") : others;
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[rng.int(0, items.length - 1)]!;

function voteCommand(state: GameState, bot: PlayerState, rng: Rng): Command | null {
  const candidates = targetsFor(state, bot, false);
  if (candidates.length === 0) return null;
  const targetId = rng.next() < ABSTAIN_CHANCE ? null : pick(candidates, rng).id;
  return { type: "vote", voterId: bot.id, targetId };
}

function judgementCommand(state: GameState, bot: PlayerState, rng: Rng): Command {
  const defendant = state.players.find((p) => p.id === state.defendantId);
  // Mafia absuelve a los suyos y condena al resto. Town vota a ciegas.
  const verdict = bot.faction === "mafia"
    ? (defendant?.faction === "mafia" ? "innocent" : "guilty")
    : (rng.next() < TOWN_GUILTY_CHANCE ? "guilty" : "innocent");
  return { type: "judgement.vote", voterId: bot.id, verdict };
}

/** Primera habilidad nocturna utilizable para el estado de vida del bot. */
function nightCommand(state: GameState, bot: PlayerState, rng: Rng): Command | null {
  const handler = bot.roleKey ? ROLE_HANDLERS.get(bot.roleKey) : undefined;
  if (!handler) return null;
  const alive = bot.status === "alive";
  for (const ability of handler.nightAbilities) {
    if (Boolean(ability.deadOnly) === alive) continue;
    if (ability.usesLimit !== null && (bot.usesLeft[ability.key] ?? 0) <= 0) continue;
    // Jailor no ejecuta en la primera noche (el motor lo rechazaría).
    if (ability.key === "execute" && state.dayNumber === 1) continue;
    const choice = ability.choices === undefined ? null : chooseOption(ability.choices, rng);
    const base = { type: "night.action" as const, actorId: bot.id, ability: ability.key, ...(choice === null ? {} : { choice }) };
    if (ability.target === "none") return { ...base, targetId: null, secondTargetId: null };
    const plan = targetPlan(state, bot, ability.key, ability.target, ability.selfAllowed ?? false, rng);
    if (plan) return { ...base, ...plan };
  }
  return null;
}

/** Elección de una habilidad: una de sus opciones, o cualquier rol del juego. */
function chooseOption(choices: readonly string[] | "roles", rng: Rng): string {
  return pick(choices === "roles" ? [...ROLE_HANDLERS.keys()] : choices, rng);
}

/** Objetivos válidos según la habilidad. Las reglas especiales están aquí; el motor valida el resto. */
function targetPlan(
  state: GameState,
  bot: PlayerState,
  key: string,
  target: "player" | "none" | "two",
  selfAllowed: boolean,
  rng: Rng,
): { targetId: string; secondTargetId: string | null } | null {
  const alivePool = targetsFor(state, bot, selfAllowed);
  if (key === "execute") {
    const jailed = alivePool.filter((p) => p.flags.jailed);
    return jailed.length ? { targetId: pick(jailed, rng).id, secondTargetId: null } : null;
  }
  if (key === "raise") {
    // Zombi: un Town muerto con rol conocido que no se haya usado; el segundo objetivo es un vivo.
    const zombies = state.players.filter((p) => p.status === "dead" && p.faction === "town" && p.roleKey && !p.flags.zombied);
    const second = state.players.filter((p) => p.status === "alive" && p.id !== bot.id);
    if (!zombies.length || !second.length) return null;
    return { targetId: pick(zombies, rng).id, secondTargetId: pick(second, rng).id };
  }
  if (key === "disguise") {
    // Un Mafioso vivo y libre, disfrazado de alguien que no es de la Mafia.
    const mafia = state.players.filter((p) => p.status === "alive" && p.faction === "mafia" && !p.flags.jailed);
    const innocents = state.players.filter((p) => p.status === "alive" && p.faction !== "mafia");
    if (!mafia.length || !innocents.length) return null;
    return { targetId: pick(mafia, rng).id, secondTargetId: pick(innocents, rng).id };
  }
  if (target === "two") {
    if (alivePool.length < 2) return null;
    const [first, second] = rng.shuffle(alivePool);
    return { targetId: first!.id, secondTargetId: second!.id };
  }
  return alivePool.length ? { targetId: pick(alivePool, rng).id, secondTargetId: null } : null;
}

/** Habilidades de día: cada una se usa con poca probabilidad por fase, respetando usos y "una vez al día". */
function dayCommands(state: GameState, bot: PlayerState, rng: Rng): Command[] {
  const handler = bot.roleKey ? ROLE_HANDLERS.get(bot.roleKey) : undefined;
  if (!handler) return [];
  const commands: Command[] = [];
  for (const ability of handler.dayAbilities) {
    if (rng.next() > DAY_ACTION_CHANCE) continue;
    if (ability.usesLimit !== null && (bot.usesLeft[ability.key] ?? 0) <= 0) continue;
    if (ability.oncePerDay && state.dayActionDay[bot.id] === state.dayNumber) continue;
    if (ability.target === "none") {
      commands.push({ type: "day.action", actorId: bot.id, ability: ability.key, targetId: null });
      continue;
    }
    const pool = targetsFor(state, bot, false);
    if (pool.length === 0) continue;
    commands.push({ type: "day.action", actorId: bot.id, ability: ability.key, targetId: pick(pool, rng).id });
  }
  return commands;
}
