/**
 * Orden de resolución de acciones nocturnas: prioridad ascendente (1 primero), luego asiento.
 * SUPUESTO: el desempate por asiento es provisional. La wiki no lo especifica para todos los casos.
 */
export function sortByPriority<T extends { priority: number; seat: number }>(actions: readonly T[]): T[] {
  return [...actions].sort((a, b) => a.priority - b.priority || a.seat - b.seat);
}
