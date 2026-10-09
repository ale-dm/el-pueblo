import { describe, expect, it } from "vitest";
import { buildLog, type LogContext } from "./log.js";
import type { GameEvent } from "../types.js";

const names: Record<string, string> = { a: "Ana", b: "Bea", c: "Caro" };
const nick = (id: string) => names[id] ?? "?";
let seq = 0;
const ev = (type: string, payload: Record<string, any>, visibility: GameEvent["visibility"] = "public"): GameEvent => ({
  seq: ++seq, type, payload, visibility, audiencePlayerId: null,
});
const ctx = (over: Partial<LogContext> = {}): LogContext => ({ meId: "a", hasNightAbility: false, nick, voters: 3, ...over });
const texts = (items: ReturnType<typeof buildLog>) => items.map((i) => (i.kind === "separator" ? `== ${i.text}` : i.text));

describe("registro estilo Town of Salem", () => {
  it("separa los días y las noches", () => {
    seq = 0;
    const items = buildLog([
      ev("phase.started", { phase: "day_1", dayNumber: 1 }),
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx());
    expect(items.filter((i) => i.kind === "separator").map((i) => i.kind === "separator" && i.text)).toEqual(["Día 1", "Noche 1", "Día 2"]);
  });

  it("el día 1 no tiene votación: solo la charla y luego la noche", () => {
    seq = 0;
    const text = texts(buildLog([ev("phase.started", { phase: "day_1", dayNumber: 1 }), ev("phase.started", { phase: "night", dayNumber: 1 })], ctx()));
    expect(text.join(" ")).not.toMatch(/Votación/);
  });

  it("las muertes de la noche aparecen al amanecer, después del separador del día", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("player.killed", { playerId: "b", cause: "mafia", roleKey: "doctor" }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx()));
    const day = text.indexOf("== Día 2");
    expect(text.findIndex((t) => t.includes("murió anoche"))).toBeGreaterThan(day);
    expect(text[day + 1]).toContain("Bea murió anoche: ha sido asesinado por la Mafia. Era Doctor.");
  });

  it("si un limpiado muere, no se revela su rol", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "mafia", roleKey: null })], ctx())).join(" ");
    expect(text).toContain("No pudimos determinar su rol.");
  });

  it("el voto cuenta sus cambios, retiradas y abstenciones", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "voting", dayNumber: 2 }),
      ev("vote.cast", { voterId: "a", targetId: "b" }),
      ev("vote.cast", { voterId: "a", targetId: "c" }),
      ev("vote.cast", { voterId: "a", targetId: null }),
      ev("vote.cast", { voterId: "b", targetId: null }),
    ], ctx()));
    expect(text).toEqual([
      "Votación: hacen falta 2 votos para llevar a alguien a juicio.",
      "Quedan 3 juicios posibles hoy.",
      "Ana vota a Bea.",
      "Ana cambia su voto a Caro.",
      "Ana retira su voto.",
      "Bea se abstiene.",
    ]);
  });

  it("el juicio enseña quién votó qué y el veredicto", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("trial.started", { defendantId: "c" }),
      ev("phase.started", { phase: "judgement", dayNumber: 2 }),
      ev("judgement.cast", { voterId: "a", verdict: "guilty" }),
      ev("judgement.cast", { voterId: "b", verdict: "innocent" }),
      ev("judgement.cast", { voterId: "a", verdict: "guilty" }),
      ev("trial.verdict", { defendantId: "c", verdict: "guilty" }),
    ], ctx())).join(" | ");
    expect(text).toContain("Ana votó culpable.");
    expect(text).toContain("Bea votó inocente.");
    expect(text).toContain("El Pueblo ha decidido ahorcar a Caro por 2 votos a 1.");
  });

  it("el recuento del juicio usa los pesos del motor (Mayor revelado)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("trial.verdict", { defendantId: "c", verdict: "guilty", guiltyWeight: 3, innocentWeight: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("El Pueblo ha decidido ahorcar a Caro por 3 votos a 2.");
  });

  it("un veredicto de inocencia lo dice y no ahorca a nadie", () => {
    seq = 0;
    const text = texts(buildLog([ev("trial.verdict", { defendantId: "c", verdict: "innocent" })], ctx())).join(" ");
    expect(text).toContain("Caro es declarado inocente.");
    expect(text).not.toContain("ahorcar");
  });

  it("si no actúas de noche, lo dice al amanecer", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ hasNightAbility: true }))).join(" ");
    expect(text).toContain("No realizaste tu habilidad nocturna.");
  });

  it("si ya has actuado, no se avisa; y tu decisión sale con su objetivo", () => {
    seq = 0;
    const items = buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("night.action.submitted", { actorId: "a", ability: "kill", targetId: "b", secondTargetId: null }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ hasNightAbility: true }));
    const text = texts(items).join(" ");
    expect(text).not.toContain("No realizaste");
    expect(text).toContain("Has decidido Atacar a Bea esta noche.");
  });

  it("un resultado de Sheriff se traduce según la comprobación", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("investigation.result", { investigatorId: "a", targetId: "b", result: "suspicious", check: "suspicious" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "Godfather", check: "role" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Bea parece sospechoso.");
    expect(text).toContain("Caro es Godfather.");
  });

  it("el Investigador ve el grupo de roles de su objetivo, con nombres de rol en inglés (wiki: Investigator)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("investigation.result", { investigatorId: "a", targetId: "b", result: "doctor,disguiser,serial_killer", check: "group" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "framer,vampire,jester", check: "group" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "", check: "group" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Bea podría ser un Doctor, Disguiser o Serial Killer.");
    expect(text).toContain("Caro podría ser un Framer, Vampire o Jester.");
    expect(text).toContain("El resultado de Caro no está definido en la tabla Classic.");
  });

  it("el Doctor que curó a un atacado lee su aviso (wiki: Doctor.md:223)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "target_attacked" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Tu objetivo fue atacado anoche.");
  });

  it("avisos de culpa, alerta y chaleco (wiki: Vigilante, Veteran, Bodyguard)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "vigilante_put_away_gun" }, "private"),
      ev("night.notice", { playerId: "a", notice: "vigilante_guilt_suicide" }, "private"),
      ev("night.notice", { playerId: "b", notice: "alert_blocked" }, "private"),
      ev("night.notice", { playerId: "c", notice: "vest_saved" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Has guardado tu pistola por matar a un miembro del pueblo.");
    expect(text).toContain("No pudiste superar la culpa de matar a un miembro del pueblo. ¡Te has disparado!");
    expect(text).toContain("Alguien intentó atacarte, pero tu defensa en alerta fue demasiado fuerte.");
    expect(text).toContain("Te atacaron, pero tu chaleco antibalas te salvó.");
  });

  it("avisos de la noche por rol: curado, Jailor, Psíquica (wiki: Doctor, Jailor, Psychic)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "healed" }, "private"),
      ev("night.notice", { playerId: "b", notice: "jailor_execute" }, "private"),
      ev("night.notice", { playerId: "b", notice: "jailor_changed_mind" }, "private"),
      ev("night.notice", { playerId: "a", notice: "psychic_small" }, "private"),
      ev("night.notice", { playerId: "a", notice: "psychic_evil" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Te atacaron, pero alguien te curó.");
    expect(text).toContain("El Jailor ha decidido ejecutarte.");
    expect(text).toContain("El Jailor ha cambiado de opinión.");
    expect(text).toContain("El pueblo es demasiado pequeño para encontrar a un malvado con precisión.");
    expect(text).toContain("El pueblo es demasiado malvado para encontrar a nadie bueno.");
  });

  it("cuántos usos quedan: balas del Vigilante y alertas del Veteran, en singular y plural", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("uses.left", { playerId: "a", ability: "shoot", left: 2 }, "private"),
      ev("uses.left", { playerId: "a", ability: "alert", left: 1 }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Te quedan 2 balas.");
    expect(text).toContain("Te queda 1 alerta.");
  });

  it("el Janitor ve el rol real de su limpiado, en inglés como en la wiki (Janitor.md:214)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("clean.revealed", { janitorId: "a", playerId: "b", roleKey: "tavern_keeper" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Sabes en secreto que el rol de Bea era Tavern Keeper.");
  });

  it("el Janitor también lee el testamento de quien limpió, si lo había (wiki: Janitor.md:224)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("clean.revealed", { janitorId: "a", playerId: "b", roleKey: "tavern_keeper", will: "Sospecho de Ana." }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Sabes en secreto el testamento de Bea: «Sospecho de Ana.»");
  });

  it("la hipnosis llega al amanecer; la falsificación y el ascenso se cuentan al momento", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("hypnosis.message", { playerId: "b", message: "attacked" }, "private"),
      ev("will.forged", { playerId: "c", role: "jailor", forgerId: "a" }, "private"),
      ev("role.promoted", { playerId: "a", roleKey: "mafioso", uses: {} }, "mafia"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Has falsificado el testamento de Caro: parecerá que era Jailor.");
    expect(text).toContain("Eres el nuevo Mafioso");
    expect(text).toContain("Te atacaron, pero alguien te curó.");
    expect(text.indexOf("Te atacaron")).toBeGreaterThan(text.indexOf("== Día 2"));
  });

  it("la visión de la Psíquica dice de qué bando hay al menos uno", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("investigation.result", { investigatorId: "a", targetId: "a", result: "Ana, Bea, Caro", check: "vision", side: "mafia" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "a", result: "Ana, Bea", check: "vision", side: "town" }, "private"),
    ], ctx())).join(" | ");
    expect(text).toContain("Al menos uno es de la Mafia: Ana, Bea, Caro.");
    expect(text).toContain("Al menos uno es del Pueblo: Ana, Bea.");
  });

  it("el Lookout dice cuando hubo más visitantes de los tres que identifica", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "Ana, Bea, Dani", check: "visitors", more: true }, "private"),
    ], ctx())).join(" | ");
    expect(text).toContain("Ana visitó a Caro anoche. Bea visitó a Caro anoche. Dani visitó a Caro anoche. Más gente visitó a Caro, pero no pudiste identificarlos.");
  });

  it("el ascenso a Godfather del Mafioso se cuenta como Godfather", () => {
    seq = 0;
    const text = texts(buildLog([ev("role.promoted", { playerId: "a", roleKey: "godfather", uses: {} }, "mafia")], ctx())).join(" | ");
    expect(text).toContain("Eres el nuevo Godfather");
    expect(text).not.toContain("Mafioso");
  });

  it("el final de partida muestra el ganador", () => {
    seq = 0;
    const items = buildLog([ev("game.ended", { winner: "town" })], ctx());
    expect(texts(items)).toEqual(["== Fin de la partida", "¡Gana el pueblo!"]);
  });
});

describe("decisiones de la Mafia, cancelaciones y testamentos", () => {
  it("un compañero de la Mafia ve lo que elige el otro", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("night.action.submitted", { actorId: "b", ability: "kill", targetId: "c", secondTargetId: null, mafiaTeam: true }, "mafia"),
    ], ctx({ meId: "a" }))).join(" ");
    expect(text).toContain("Bea ha elegido Atacar a Caro.");
  });

  it("el Mafioso recibe la orden del Godfather al final de la noche; los demás, la elección", () => {
    seq = 0;
    const items = buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("night.action.submitted", { actorId: "b", ability: "kill", targetId: "c", secondTargetId: null, mafiaTeam: true, roleKey: "godfather" }, "mafia"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ meId: "a", meRoleKey: "mafioso" }));
    const text = texts(items);
    expect(text.slice(text.indexOf("== Día 2") + 1)).toEqual(["El Godfather te ha ordenado matar a su objetivo."]);
    seq = 0;
    expect(texts(buildLog([ev("night.action.submitted", { actorId: "b", ability: "kill", targetId: "c", secondTargetId: null, mafiaTeam: true, roleKey: "godfather" }, "mafia")], ctx({ meId: "a", meRoleKey: "janitor" }))).join(" ")).toContain("Bea ha elegido Atacar a Caro.");
  });

  it("un limpiado no revela su rol: aparece como Limpiado", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "mafia", roleKey: null, will: null, cleaned: true })], ctx())).join(" | ");
    expect(text).toContain("Su rol aparece como Limpiado.");
    expect(text).not.toContain("No pudimos determinar su rol.");
  });

  it("el Tracker ve una frase por cada visita de su objetivo", () => {
    seq = 0;
    const text = texts(buildLog([ev("investigation.result", { investigatorId: "a", targetId: "c", result: "Ana, Bea", check: "targets" }, "private")], ctx())).join(" | ");
    expect(text).toContain("Tu objetivo visitó a Ana. Tu objetivo visitó a Bea.");
  });

  it("cancelar se registra, y tu propia cancelación cuenta como tal", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("night.action.cancelled", { actorId: "a", mafiaTeam: false }, "private"),
      ev("night.action.cancelled", { actorId: "b", mafiaTeam: false }, "private"),
    ], ctx({ meId: "a" }))).join(" | ");
    expect(text).toContain("Has cancelado tu acción esta noche.");
    expect(text).toContain("Bea ha cancelado su acción.");
  });

  // Wiki (Death_Note_ToS.md:5, 17): la nota del asesino se lee al amanecer, junto a la víctima.
  it("la nota de muerte del asesino sale al amanecer con la víctima, y sin nota no sale", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("player.killed", { playerId: "b", cause: "mafia", roleKey: "doctor", will: null, note: "Headshot" }),
      ev("player.killed", { playerId: "c", cause: "mafia", roleKey: "doctor", will: null }),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain('Nota de muerte: "Headshot"');
    expect(text.match(/Nota de muerte/g)).toHaveLength(1);
  });

  it("al morir se lee el testamento, o que no había ninguno", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("player.killed", { playerId: "b", cause: "mafia", roleKey: "doctor", will: "Dejo mi reloj." }),
      ev("player.killed", { playerId: "c", cause: "mafia", roleKey: null, will: null }),
    ], ctx())).join(" | ");
    expect(text).toContain('Testamento de Bea: "Dejo mi reloj."');
    expect(text).toContain("No encontramos un testamento de Caro.");
  });
});

describe("avisos privados de la noche", () => {
  it("el visitante de un encarcelado lo lee al amanecer, junto a los demás avisos de la noche", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "target_jailed" }, "private"),
      ev("night.notice", { playerId: "b", notice: "attack_attempt" }, "private"),
      ev("night.notice", { playerId: "a", notice: "medium_talking" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx({ meId: "a" })));
    const day = text.indexOf("== Día 3");
    expect(text.slice(day + 1)).toEqual([
      "Tu objetivo estaba encarcelado: tu habilidad no tuvo efecto.",
      "Alguien intentó atacarte mientras estabas encarcelado.",
      "Un médium te está hablando.",
    ]);
  });
});

describe("espionaje del Spy", () => {
  it("cuenta lo que recibió el objetivo: ataque y protección, o nada", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("investigation.result", { investigatorId: "a", targetId: "b", result: "attack,protect", check: "bug" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "nada", check: "bug" }, "private"),
      ev("investigation.result", { investigatorId: "a", targetId: "c", result: "jail", check: "bug" }, "private"),
    ], ctx({ meId: "a" })));
    expect(text).toEqual([
      "Bea fue atacado. Alguien le protegió del ataque.",
      "Caro no recibió nada esta noche.",
      "Caro estaba encarcelado: no pudiste espiarle.",
    ]);
  });
});

describe("mensajes del Hypnotist", () => {
  it("el bloqueo a un inmune lleva el texto de inmunidad (wiki: Hypnotist)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("hypnosis.message", { playerId: "b", message: "roleblock_immune" }, "private"),
      ev("hypnosis.message", { playerId: "b", message: "roleblocked" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Alguien intentó bloquearte, pero eres inmune.");
    expect(text).toContain("Alguien ocupó tu noche: ¡fuiste bloqueado!");
  });
});

describe("avisos del Transporter", () => {
  it("el transporte fallido y el transportado tienen su aviso privado", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 1 }),
      ev("night.notice", { playerId: "a", notice: "transport_jailed" }, "private"),
      ev("night.notice", { playerId: "b", notice: "transported" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 2 }),
    ], ctx({ meId: "a" })));
    expect(text.slice(text.indexOf("== Día 2") + 1)).toEqual([
      "Uno de tus objetivos estaba encarcelado: no pudiste transportarles.",
      "Fuiste transportado a otro lugar.",
    ]);
  });
});


describe("mensajes del Trapper (wiki: Trapper.md:340-366)", () => {
  it("el estado de la trampa al empezar la noche: construyendo, lista o puesta", () => {
    seq = 0;
    const text = (status: string) => texts(buildLog([ev("trap.status", { trapperId: "a", status }, "private")], ctx())).join(" | ");
    expect(text("building")).toBe("Estás construyendo tu trampa.");
    expect(text("ready")).toBe("Tu trampa está lista para ser colocada.");
    expect(text("set")).toBe("Tu trampa está puesta.");
  });

  it("la activación da el rol de cada visitante, al amanecer, y si la trampa atacó a alguien", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("trap.triggered", { trapperId: "a", roles: ["investigator", "godfather"], attacked: true }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx()));
    const from = text.indexOf("== Día 3");
    expect(text.slice(from + 1)).toEqual([
      "Tu trampa ha sido activada por el rol Investigator.",
      "Tu trampa ha sido activada por el rol Godfather.",
      "¡Tu trampa ha atacado a alguien!",
    ]);
  });

  it("sin ataque, la activación no dice que atacó", () => {
    seq = 0;
    const text = texts(buildLog([ev("trap.triggered", { trapperId: "a", roles: ["lookout"], attacked: false }, "private")], ctx())).join(" | ");
    expect(text).toContain("Tu trampa ha sido activada por el rol Lookout.");
    expect(text).not.toMatch(/atacado/);
  });

  it("el atacante y el protegido tienen su aviso privado", () => {
    seq = 0;
    const items = texts(buildLog([
      ev("night.notice", { playerId: "b", notice: "trap_triggered" }, "private"),
      ev("night.notice", { playerId: "b", notice: "trap_saved" }, "private"),
    ], ctx({ meId: "b" })));
    expect(items).toEqual(["¡Has activado una trampa!", "Te atacaron, pero una trampa te salvó."]);
  });

  it("morir por la trampa dice que fue asesinado por un Trapper (wiki: Trapper.md:364)", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("player.killed", { playerId: "b", cause: "trap", roleKey: "godfather", will: null }),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Bea murió anoche: ha sido asesinado por un Trapper. Era Godfather.");
  });
});

describe("avisos del Tavern Keeper y del Bootlegger (wiki: Tavern_Keeper.md:347-357)", () => {
  it("el bloqueo y los avisos de inmune y encarcelado llevan su frase", () => {
    seq = 0;
    const items = texts(buildLog([
      ev("night.action.blocked", { actorId: "b", ability: "investigate", cause: "roleblock" }, "private"),
      ev("night.action.blocked", { actorId: "b", ability: "investigate", cause: "jail" }, "private"),
      ev("night.notice", { playerId: "b", notice: "blocked_immune" }, "private"),
      ev("night.notice", { playerId: "b", notice: "blocked_jailed" }, "private"),
      ev("night.notice", { playerId: "b", notice: "blocked_occupied" }, "private"),
    ], ctx({ meId: "b" })));
    expect(items).toEqual([
      "Alguien ocupó tu noche. ¡Has sido bloqueado!",
      "Tu acción fue bloqueada esta noche.",
      "Alguien intentó bloquearte, ¡pero eres inmune!",
      "Alguien intentó bloquearte, pero estabas encarcelado.",
      "Alguien ocupó tu noche. ¡Has sido bloqueado!",
    ]);
  });
});

describe("mensajes del Veteran (wiki: Veteran.md:478, 482)", () => {
  it("el visitante que muere y el Veteran que dispara tienen su aviso privado", () => {
    seq = 0;
    // Cada uno solo recibe sus eventos privados (el servidor ya filtra por jugador).
    const veteran = texts(buildLog([ev("night.notice", { playerId: "a", notice: "veteran_shot_visitor" }, "private")], ctx({ meId: "a" })));
    expect(veteran).toEqual(["Disparaste a alguien que te visitó anoche."]);
    const visitor = texts(buildLog([ev("night.notice", { playerId: "b", notice: "veteran_shot_you" }, "private")], ctx({ meId: "b" })));
    expect(visitor).toEqual(["¡Te ha disparado el Veterano al que visitaste!"]);
  });
});

describe("mensajes del Bodyguard (wiki: Bodyguard.md:426-438)", () => {
  it("el duelo y el chaleco tienen sus frases; el chaleco dice cuántos quedan", () => {
    seq = 0;
    const text = (events: GameEvent[]) => texts(buildLog(events, ctx({ meId: "b" }))).join(" | ");
    expect(text([ev("night.notice", { playerId: "b", notice: "bodyguard_saved" }, "private")])).toContain("Te atacaron, pero alguien rechazó a tu atacante.");
    expect(text([ev("night.notice", { playerId: "b", notice: "bodyguard_killed_protecting" }, "private")])).toContain("¡Has muerto protegiendo a tu objetivo!");
    expect(text([ev("night.notice", { playerId: "b", notice: "bodyguard_killed_you" }, "private")])).toContain("¡Te ha matado un Guardaespaldas!");
    expect(text([ev("uses.left", { playerId: "b", ability: "vest", left: 1 }, "private")])).toContain("Te queda 1 chaleco antibalas.");
    expect(text([ev("uses.left", { playerId: "b", ability: "vest", left: 0 }, "private")])).toContain("Te quedan 0 chalecos antibalas.");
  });
});

describe("mensajes del Vigilante (wiki: Vigilante.md:358, 366)", () => {
  it("la primera noche y el disparo tienen su frase", () => {
    seq = 0;
    const items = texts(buildLog([
      ev("night.notice", { playerId: "a", notice: "vigilante_wait_day" }, "private"),
      ev("night.notice", { playerId: "b", notice: "vigilante_shot_you" }, "private"),
    ], ctx({ meId: "a" })));
    expect(items).toEqual(["Decides esperar un día antes de usar tu pistola.", "¡Te ha disparado un Vigilante!"]);
  });
});

describe("mensajes del Jailor (wiki: Jailor.md:550, 558, 562, 566)", () => {
  it("el encarcelado de los suyos, el arrastre y la primera noche tienen su frase", () => {
    seq = 0;
    const items = texts(buildLog([
      ev("night.notice", { playerId: "a", subjectId: "c", notice: "team_jailed" }, "private"),
      ev("night.notice", { playerId: "b", subjectId: "c", notice: "jailor_dragged" }, "private"),
      ev("night.notice", { playerId: "b", notice: "jailor_wait_day" }, "private"),
    ], ctx({ meId: "a" })));
    expect(items).toEqual(["Caro fue arrastrado a la cárcel.", "Has arrastrado a tu objetivo a la cárcel.", "Debes esperar un día antes de ejecutar."]);
  });
});

describe("aviso del prisionero (wiki: Jailor.md:558, 560)", () => {
  it("el encarcelado lo lee al empezar la noche; encarcelarle de día no escribe nada en el registro", () => {
    seq = 0;
    const day = texts(buildLog([ev("player.jailed", { jailorId: "b", playerId: "a" }, "private")], ctx({ meId: "a" })));
    expect(day).toEqual([]);
    seq = 0;
    const night = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("night.notice", { playerId: "a", notice: "jailed" }, "private"),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx({ meId: "a" })));
    expect(night).toContain("Fuiste arrastrado a la cárcel.");
  });
});

describe("nota del Jailor (wiki: Death_Note_ToS.md:76-92; Jailor.md:322)", () => {
  it("la ejecución muestra a todos los motivos marcados", () => {
    seq = 0;
    const text = texts(buildLog([
      ev("phase.started", { phase: "night", dayNumber: 2 }),
      ev("player.killed", { playerId: "b", cause: "execute", roleKey: "investigator", will: null, reasons: ["evildoer", "quiet"] }),
      ev("phase.started", { phase: "discussion", dayNumber: 3 }),
    ], ctx())).join(" | ");
    expect(text).toContain("Nota del Jailor: Se sabe que es un malvado. Está demasiado callado o no responde a las preguntas.");
  });
});

// Textos de causa de muerte, uno por causa, con la frase de la wiki citada (H3, lote 7).
describe("textos de causa de muerte (wiki: Bodyguard.md:446, 450; Vigilante.md:374, 378; Veteran.md:490; Jailor.md:602)", () => {
  const cases: Array<[string, string, string]> = [
    // Bodyguard.md:446 "[They were] killed by a Bodyguard."
    ["bodyguard", "ha sido asesinado por un Guardaespaldas", "Bodyguard.md:446"],
    // Bodyguard.md:450 "[They] died guarding someone."
    ["guarding", "ha muerto protegiendo a alguien", "Bodyguard.md:450"],
    // Vigilante.md:374 "[They were] shot by a Vigilante."
    ["shot", "ha sido abatido por un Vigilante", "Vigilante.md:374"],
    // Vigilante.md:378 "[They] died from guilt."
    ["guilt", "ha muerto por la culpa", "Vigilante.md:378"],
    // Veteran.md:490 "[They were] killed by a Veteran."
    ["veteran", "ha sido asesinado por un Veterano", "Veteran.md:490"],
    // Jailor.md:602 "[They were] executed by the Jailor."
    ["execute", "ha sido ejecutado por el Jailor", "Jailor.md:602"],
  ];
  it.each(cases)("la causa %s dice: %s (%s)", (cause, phrase) => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause, roleKey: "doctor", will: null })], ctx())).join(" | ");
    expect(text).toContain(`Bea murió anoche: ${phrase}. Era Doctor.`);
  });
});

describe("varias causas de muerte, forma singular y plural (wiki: Messages_ToS.md:151, 154; Jailor.md:602)", () => {
  it("una sola causa: forma singular, sin líneas extra (Jailor.md:602 \"[They were] executed by the Jailor.\")", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "execute", causes: ["execute"], roleKey: "doctor", will: null })], ctx())).filter((t) => !t.includes("testamento")).join(" | ");
    expect(text).toBe("Bea murió anoche: ha sido ejecutado por el Jailor. Era Doctor.");
  });

  it("dos causas: la primera en la línea de la muerte y la segunda en forma \"also\" (Messages_ToS.md:151, 154)", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "mafia", causes: ["mafia", "shot"], roleKey: "doctor", will: null })], ctx())).filter((t) => !t.includes("testamento")).join(" | ");
    expect(text).toBe("Bea murió anoche: ha sido asesinado por la Mafia. Era Doctor. | Bea también ha sido abatido por un Vigilante.");
  });

  it("tres causas: cada una tiene su línea (Messages_ToS.md:154)", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "shot", causes: ["shot", "guilt", "bodyguard"], roleKey: "vigilante", will: null })], ctx())).filter((t) => !t.includes("testamento")).join(" | ");
    expect(text).toBe(
      "Bea murió anoche: ha sido abatido por un Vigilante. Era Vigilante. | Bea también ha muerto por la culpa. | Bea también ha sido asesinado por un Guardaespaldas.",
    );
  });

  it("sin el campo causes, el evento se lee como antes (una causa)", () => {
    seq = 0;
    const text = texts(buildLog([ev("player.killed", { playerId: "b", cause: "veteran", roleKey: "doctor", will: null })], ctx())).filter((t) => !t.includes("testamento")).join(" | ");
    expect(text).toBe("Bea murió anoche: ha sido asesinado por un Veterano. Era Doctor.");
  });
});
