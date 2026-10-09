import { describe, expect, it } from "vitest";
import { game, ofType, step, timer } from "./helpers/game.js";

// Dos Transporters sobre el mismo objetivo (wiki: docs/roles/Transporter.md:266-278; orden de entrada: :198).
// Los Trackers leen a dónde llega cada Lookout: su resultado es el nombre de quien recibió la visita tras los transportes.

const night = (actorId: string, ability: string, targetId: string | null, secondTargetId: string | null = null) =>
  ({ type: "night.action", actorId, ability, targetId, secondTargetId }) as const;

/**
 * Jugadores: p1 y p2 Transporter; p3, p4, p5 son los objetivos; p6, p7, p8 Lookout vigilan a p3, p4, p5;
 * p9, p10, p11 Tracker siguen a p6, p7, p8. Así cada Tracker dice a quién visitó, tras los transportes, la visita
 * que el Lookout hizo a p3, p4 o p5.
 */
const cast = () => game([
  "transporter", "transporter", "investigator", "investigator", "investigator",
  "lookout", "lookout", "lookout", "tracker", "tracker", "tracker",
]);

/** Acciones de los Lookouts y Trackers (siempre iguales); los Transporters cambian según el caso. */
const observers = [
  night("p6", "watch", "p3"),
  night("p7", "watch", "p4"),
  night("p8", "watch", "p5"),
  night("p9", "track", "p6"),
  night("p10", "track", "p7"),
  night("p11", "track", "p8"),
];

/** Resultado de cada Tracker: el nombre de quien recibió la visita del Lookout que sigue. */
function visitsOf(actions: Array<ReturnType<typeof night>>, state = cast()) {
  let s = state;
  for (const a of actions) s = step(s, a).state;
  const { events } = step(s, timer());
  const result = (trackerId: string) =>
    ofType(events, "investigation.result").filter((e) => e.payload.investigatorId === trackerId).map((e) => e.payload.result);
  return { p3: result("p9"), p4: result("p10"), p5: result("p11") };
}

describe("dos Transporters (wiki: Transporter.md:266-278)", () => {
  it("con la misma derecha (Transporter.md:272): p3 pasa a p4, p4 pasa a p5 y p5 pasa a p3", () => {
    // T1 (p1) cambia p3 y p5; T2 (p2) cambia p4 y p5. Pasos 2 a 5 del procedimiento.
    const r = visitsOf([night("p1", "transport", "p3", "p5"), night("p2", "transport", "p4", "p5"), ...observers]);
    expect(r).toEqual({ p3: ["P4"], p4: ["P5"], p5: ["P3"] });
  });

  it("con la misma izquierda (Transporter.md:276, 278): el segundo marca a quien está en su casa derecha", () => {
    // T1 (p1) cambia p3 y p5. T2 (p2) cambia p3 y p4: sin marca en el paso 2, marca a quien está en la casa de p4 (p4)
    // y cambia a quien está en la casa de p3 (p5, que llegó allí por T1) con p4. Visitas a p3 van a p4, a p4 van a p5.
    const r = visitsOf([night("p1", "transport", "p3", "p5"), night("p2", "transport", "p3", "p4"), ...observers]);
    expect(r).toEqual({ p3: ["P4"], p4: ["P5"], p5: ["P3"] });
  });

  it("con la izquierda de uno igual a la derecha del otro (Transporter.md:274, 278): p3 pasa a p5, p5 a p4 y p4 a p3", () => {
    // T1 (p1) cambia p3 y p5. T2 (p2) cambia p5 y p4: el intercambio de T2 es con quien está en la casa de p5 (p3).
    const r = visitsOf([night("p1", "transport", "p3", "p5"), night("p2", "transport", "p5", "p4"), ...observers]);
    expect(r).toEqual({ p3: ["P5"], p4: ["P3"], p5: ["P4"] });
  });

  it("el que entró antes en el lobby transporta primero, no el que envía antes la acción (Transporter.md:198)", () => {
    // Asientos: p2 entró primero (seat 1), p1 después (seat 2). p2 cambia p3 y p4; p1 cambia p3 y p5.
    const base = cast();
    const players = base.players.map((p) => (p.id === "p1" ? { ...p, seat: 2 } : p.id === "p2" ? { ...p, seat: 1 } : p));
    const state = { ...base, players };
    const ordered = visitsOf([night("p2", "transport", "p3", "p4"), night("p1", "transport", "p3", "p5"), ...observers], state);
    const reversed = visitsOf([night("p1", "transport", "p3", "p5"), night("p2", "transport", "p3", "p4"), ...observers], state);
    expect(reversed).toEqual(ordered);
    // Con p2 primero: p3 pasa a p5, p4 a p3 y p5 a p4 (T1 cambia p3 con p4; T2 cambia p3 con p5, con quien está en la casa de p4).
    expect(ordered).toEqual({ p3: ["P5"], p4: ["P3"], p5: ["P4"] });
  });
});
