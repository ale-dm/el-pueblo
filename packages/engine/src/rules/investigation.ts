/**
 * Resultados del Investigador en Classic: el grupo de roles en el que cae el objetivo.
 * Fuente: docs/roles/Investigator.md, sección "Classic Investigator Results" (la tabla "Coven Expansion" no es MVP).
 * Cada fila es una lista de claves de rol del catálogo, en el mismo orden que la wiki.
 *
 * Roles del MVP que no aparecen en la tabla Classic (solo en la Coven): crusader, psychic, tracker, trapper.
 * Para ellos no hay grupo: el Investigador recibe un resultado vacío (SKIPPED, ver docs/ROLES_STATUS.md).
 */
export const CLASSIC_INVESTIGATOR_GROUPS: ReadonlyArray<readonly string[]> = [
  ["vigilante", "veteran", "mafioso", "ambusher"],
  ["medium", "janitor", "retributionist"],
  ["survivor", "vampire_hunter", "amnesiac"],
  ["spy", "blackmailer", "jailor"],
  ["sheriff", "executioner", "werewolf"],
  ["framer", "vampire", "jester"],
  ["lookout", "forger", "witch"],
  ["tavern_keeper", "transporter", "bootlegger", "hypnotist"],
  ["doctor", "disguiser", "serial_killer"],
  ["investigator", "consigliere", "mayor"],
  ["bodyguard", "godfather", "arsonist"],
];

/** Grupo de roles que ve el Investigador por un rol (real, o el del disfraz). Null si el rol no está en la tabla. */
export function investigatorGroupOf(roleKey: string): readonly string[] | null {
  return CLASSIC_INVESTIGATOR_GROUPS.find((group) => group.includes(roleKey)) ?? null;
}
