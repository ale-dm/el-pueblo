/**
 * Iconos e ilustraciones de los roles del MVP. Son arte de la wiki (data/roles/img), reutilizado con permiso del
 * equipo; las copias servidas están en public/roles/img (ver data/README.md).
 * Los nombres salen de data/catalog/roles.json (icon_file y skin_file). Sin skin en la wiki: Ambusher, Blackmailer
 * y Framer; para ellos solo se muestra el icono (SKIPPED en docs/ROLES_STATUS.md).
 */
export const ROLE_IMAGE_FILES: Record<string, { icon: string; skin: string | null }> = {
  ambusher: { icon: "Ambusher", skin: null },
  blackmailer: { icon: "Blackmailer", skin: null },
  bodyguard: { icon: "Bodyguard", skin: "Bodyguard" },
  bootlegger: { icon: "Bootlegger", skin: "Bootlegger" },
  consigliere: { icon: "Consigliere", skin: "Consigliere" },
  crusader: { icon: "Crusader", skin: "Crusader" },
  disguiser: { icon: "Disguiser", skin: "Disguiser" },
  doctor: { icon: "Doctor", skin: "Doctor" },
  forger: { icon: "Forger", skin: "Forger" },
  framer: { icon: "Framer", skin: null },
  godfather: { icon: "Godfather", skin: "Godfather" },
  hypnotist: { icon: "Hypnotist", skin: "Hypnotist" },
  investigator: { icon: "Investigator", skin: "Investigator" },
  jailor: { icon: "Jailor", skin: "Jailor" },
  janitor: { icon: "Janitor", skin: "Janitor" },
  lookout: { icon: "Lookout", skin: "Lookout" },
  mafioso: { icon: "Mafioso", skin: "Mafioso" },
  mayor: { icon: "Mayor", skin: "Mayor" },
  medium: { icon: "Medium", skin: "Medium" },
  psychic: { icon: "Psychic", skin: "Psychic" },
  retributionist: { icon: "Retributionist", skin: "Retributionist" },
  sheriff: { icon: "Sheriff", skin: "Sheriff" },
  spy: { icon: "Spy", skin: "Spy" },
  tavern_keeper: { icon: "Tavern_Keeper", skin: "Tavern_Keeper" },
  tracker: { icon: "Tracker", skin: "Tracker" },
  transporter: { icon: "Transporter", skin: "Transporter" },
  trapper: { icon: "Trapper", skin: "Trapper" },
  veteran: { icon: "Veteran", skin: "Veteran" },
  vigilante: { icon: "Vigilante", skin: "Vigilante" },
};

const BASE = "/roles/img/";

/** Ruta del icono del rol, o null si el rol no tiene imagen. */
export function roleIconUrl(roleKey: string | null | undefined): string | null {
  const files = roleKey ? ROLE_IMAGE_FILES[roleKey] : undefined;
  return files ? `${BASE}${files.icon}_icon.png` : null;
}

/** Ruta de la ilustración (skin) del rol, o null si no existe. */
export function roleSkinUrl(roleKey: string | null | undefined): string | null {
  const files = roleKey ? ROLE_IMAGE_FILES[roleKey] : undefined;
  return files?.skin ? `${BASE}${files.skin}_skin.png` : null;
}
