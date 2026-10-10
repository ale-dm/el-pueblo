/**
 * Nombres por defecto (wiki: Name, "Default Names"): los de los juicios de Salem. Si un jugador no elige nombre a
 * tiempo, se le da uno de la lista que no use nadie. No se pueden escribir a mano.
 */
export const DEFAULT_NAMES = [
  "Cotton Mather", "Deodat Lawson", "Edward Bishop", "Giles Corey", "James Bayley", "James Russel", "John Hathorne",
  "John Proctor", "John Willard", "Jonathan Corwin", "Samuel Parris", "Samuel Sewall", "Thomas Danforth", "William Hobbs",
  "William Phips", "Abigail Hobbs", "Alice Young", "Ann Hibbins", "Ann Putnam", "Ann Sears", "Betty Parris", "Dorothy Good",
  "Lydia Dustin", "Martha Corey", "Mary Eastey", "Mary Johnson", "Mary Warren", "Sarah Bishop", "Sarah Good", "Sarah Wildes",
] as const;

/** Un nombre por defecto que no use ya nadie en la sala (sin distinguir mayúsculas). */
export function pickDefaultName(taken: ReadonlySet<string>): string {
  const free = DEFAULT_NAMES.filter((name) => !taken.has(name.toLowerCase()));
  const pool: readonly string[] = free.length > 0 ? free : DEFAULT_NAMES;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
