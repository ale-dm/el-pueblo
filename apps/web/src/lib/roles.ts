/** Descripción en español de cada rol del MVP. El resumen de la wiki viene en inglés, así que no se muestra. */
export const ROLE_BLURB: Record<string, string> = {
  ambusher: "Esperas fuera de la casa de tu objetivo y atacas a quien le visite.",
  blackmailer: "Chantajeas a alguien por la noche: no podrá hablar durante el día. Oyes los susurros.",
  bootlegger: "Distraes a alguien por la noche: no puede usar su habilidad.",
  consigliere: "Cada noche averiguas el rol exacto de alguien.",
  disguiser: "Disfrazas a un miembro de la Mafia para que parezca de otro bando.",
  forger: "Reescribes la última voluntad de alguien. Solo puedes falsificar dos.",
  framer: "Incriminas a alguien: los investigadores lo verán sospechoso.",
  godfather: "Diriges a la Mafia y decides a quién atacan. Si no hay Mafioso, atacas tú.",
  hypnotist: "Te cuelas en la casa de alguien y le plantas un recuerdo que lo confunde.",
  janitor: "Limpias la escena de un asesinato: el rol de la víctima no se revelará.",
  mafioso: "Ejecutas las órdenes del Godfather. Si no hay Godfather, eliges tú.",
  bodyguard: "Proteges a alguien de un ataque. Si te atacan, luchas hasta el final.",
  crusader: "Proteges a alguien y atacas a quien le visite esa noche.",
  doctor: "Curas a alguien cada noche: sobrevive a los ataques.",
  investigator: "Investigas a alguien y descubres en qué categoría de rol encaja.",
  jailor: "De día encarcelas a alguien. De noche puedes ejecutarlo (tres veces).",
  lookout: "Vigilas a alguien por la noche y ves quién le visita.",
  mayor: "Puedes revelarte: a partir de entonces tu voto cuenta por tres.",
  medium: "Hablas con los muertos por la noche.",
  psychic: "Cada noche recibes una visión de algunos jugadores.",
  retributionist: "Alzas a un miembro del pueblo muerto para usar su habilidad.",
  sheriff: "Interrogas a alguien: sabrás si parece sospechoso.",
  spy: "Espías a la Mafia: ves a qué casas visitan cada noche.",
  tavern_keeper: "Distraes a alguien. A ti nadie puede bloquearte.",
  tracker: "Sigues a alguien y ves a qué casas va.",
  transporter: "Transportas a dos personas: sus objetivos se intercambian.",
  trapper: "Colocas una trampa en una casa; se activa la noche siguiente.",
  vampire_hunter: "Cazas vampiros cuando los haya.",
  veteran: "Te pones en alerta (tres veces): atacas a quien te visite y no puedes ser bloqueado.",
  vigilante: "Disparas a alguien (tres veces). Si es del pueblo, tú también mueres.",
};

/** Nombres de los roles, en inglés como en Town of Salem. La interfaz sigue en español. */
export const ROLE_NAMES: Record<string, string> = {
  ambusher: "Ambusher",
  blackmailer: "Blackmailer",
  bootlegger: "Bootlegger",
  consigliere: "Consigliere",
  disguiser: "Disguiser",
  forger: "Forger",
  framer: "Framer",
  godfather: "Godfather",
  hypnotist: "Hypnotist",
  janitor: "Janitor",
  mafioso: "Mafioso",
  bodyguard: "Bodyguard",
  crusader: "Crusader",
  doctor: "Doctor",
  investigator: "Investigator",
  jailor: "Jailor",
  lookout: "Lookout",
  mayor: "Mayor",
  medium: "Medium",
  psychic: "Psychic",
  retributionist: "Retributionist",
  sheriff: "Sheriff",
  spy: "Spy",
  tavern_keeper: "Tavern Keeper",
  tracker: "Tracker",
  transporter: "Transporter",
  trapper: "Trapper",
  vampire_hunter: "Vampire Hunter",
  veteran: "Veteran",
  vigilante: "Vigilante",
};

/** Nombre a mostrar de un rol; si no se conoce, la clave. */
export const roleName = (roleKey: string | null | undefined): string | null =>
  roleKey ? ROLE_NAMES[roleKey] ?? roleKey : null;

/** Nombre en inglés de cualquier rol de la wiki; si no está en ROLE_NAMES, la clave con mayúsculas ("Serial Killer"). */
export function roleNameEn(key: string): string {
  return ROLE_NAMES[key] ?? key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Grupos de roles (alineamientos) con el nombre de ToS: "Town (Support)", "Mafia (Deception)". */
export const ALIGNMENT_NAMES: Record<string, { faction: string; name: string }> = {
  town_investigative: { faction: "Town", name: "Investigative" },
  town_protective: { faction: "Town", name: "Protective" },
  town_killing: { faction: "Town", name: "Killing" },
  town_support: { faction: "Town", name: "Support" },
  mafia_killing: { faction: "Mafia", name: "Killing" },
  mafia_support: { faction: "Mafia", name: "Support" },
  mafia_deception: { faction: "Mafia", name: "Deception" },
};

/** Orden de los grupos en la lista: primero el pueblo, después la Mafia. */
export const ALIGNMENT_ORDER = Object.keys(ALIGNMENT_NAMES);

/** Cómo se escribe un alineamiento, como en ToS. Null si no se conoce. */
export function alignmentLabel(key: string | null | undefined): string | null {
  const a = key ? ALIGNMENT_NAMES[key] : undefined;
  return a ? `${a.faction} (${a.name})` : null;
}

/** Niveles de ataque y defensa en español. Se traduce el nivel base; las condiciones se omiten. */
const LEVEL_ES: Record<string, string> = {
  None: "Ninguno",
  Basic: "Básico",
  Powerful: "Potente",
  Unstoppable: "Imparable",
  Invincible: "Invencible",
};
export function levelEs(level: string | null | undefined): string | null {
  if (!level) return null;
  const base = level.split(" (")[0]!.trim();
  return LEVEL_ES[base] ?? base;
}
