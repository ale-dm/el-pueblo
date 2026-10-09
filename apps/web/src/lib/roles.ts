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

/** Nombre en español y en inglés (el del catálogo, que llega en los resultados de investigación). */
export const ROLE_NAMES: Record<string, { es: string; en: string }> = {
  ambusher: { es: "Emboscador", en: "Ambusher" },
  blackmailer: { es: "Chantajista", en: "Blackmailer" },
  bootlegger: { es: "Contrabandista", en: "Bootlegger" },
  consigliere: { es: "Consigliere", en: "Consigliere" },
  disguiser: { es: "Disfrazador", en: "Disguiser" },
  forger: { es: "Falsificador", en: "Forger" },
  framer: { es: "Incriminador", en: "Framer" },
  godfather: { es: "Padrino", en: "Godfather" },
  hypnotist: { es: "Hipnotizador", en: "Hypnotist" },
  janitor: { es: "Conserje", en: "Janitor" },
  mafioso: { es: "Mafioso", en: "Mafioso" },
  bodyguard: { es: "Guardaespaldas", en: "Bodyguard" },
  crusader: { es: "Cruzado", en: "Crusader" },
  doctor: { es: "Médico", en: "Doctor" },
  investigator: { es: "Investigador", en: "Investigator" },
  jailor: { es: "Carcelero", en: "Jailor" },
  lookout: { es: "Vigía", en: "Lookout" },
  mayor: { es: "Alcalde", en: "Mayor" },
  medium: { es: "Médium", en: "Medium" },
  psychic: { es: "Psíquico", en: "Psychic" },
  retributionist: { es: "Retribuidor", en: "Retributionist" },
  sheriff: { es: "Sheriff", en: "Sheriff" },
  spy: { es: "Espía", en: "Spy" },
  tavern_keeper: { es: "Tabernero", en: "Tavern Keeper" },
  tracker: { es: "Rastreador", en: "Tracker" },
  transporter: { es: "Transportista", en: "Transporter" },
  trapper: { es: "Trampero", en: "Trapper" },
  vampire_hunter: { es: "Cazavampiros", en: "Vampire Hunter" },
  veteran: { es: "Veterano", en: "Veteran" },
  vigilante: { es: "Vigilante", en: "Vigilante" },
};

/** Nombre a mostrar de un rol; si no se conoce, la clave. */
export const roleNameEs = (roleKey: string | null | undefined): string | null =>
  roleKey ? ROLE_NAMES[roleKey]?.es ?? roleKey : null;

/** Traduce el nombre en inglés del catálogo (resultado de Investigador) al español. */
export function roleNameFromEnglish(name: string): string {
  return Object.values(ROLE_NAMES).find((r) => r.en === name)?.es ?? name;
}
