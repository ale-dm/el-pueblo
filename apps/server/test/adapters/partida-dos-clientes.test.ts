import { afterEach, describe, expect, it } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { emitAck, startSocketApp } from "../helpers/socketApp.js";

type Batch = Array<{ seq: number; type: string; payload: any; visibility: string }>;

let closeAll: (() => Promise<void>) | null = null;
afterEach(async () => {
  if (closeAll) await closeAll();
  closeAll = null;
});

const settle = () => new Promise((resolve) => setImmediate(resolve));

/**
 * M2 (GDD §9): "dos clientes juegan una partida completa". Dos clientes humanos por Socket.IO real
 * (anfitrión y un invitado) y ocho bots en el servidor. Los humanos votan, juzgan, hablan y usan su
 * habilidad de noche por socket. El servidor avanza las fases con sus temporizadores, como en producción.
 */
describe("M2: dos clientes por Socket.IO juegan una partida completa", () => {
  it("la partida llega a su fin, ambos clientes lo ven y el registro es coherente", async () => {
    const app = await startSocketApp({ chatMax: 1000 });
    closeAll = app.close;
    const host = await app.connect();
    const guest = await app.connect();
    const hostInbox: Batch = [];
    const guestInbox: Batch = [];
    host.on("match:events", (batch: Batch) => hostInbox.push(...batch));
    guest.on("match:events", (batch: Batch) => guestInbox.push(...batch));

    const created = await emitAck(host, "room:create", { nick: "Ana", bots: 8 });
    if (!created.ok) throw new Error(created.error.message);
    const { matchId, roomCode, playerId: hostId, token: hostToken } = created.data;
    const joined = await emitAck(guest, "room:join", { roomCode, nick: "Beto" });
    if (!joined.ok) throw new Error(joined.error.message);
    const guestId: string = joined.data.playerId;
    const guestToken: string = joined.data.token;

    const started = await emitAck(host, "match:start", { matchId, token: hostToken });
    if (!started.ok) throw new Error(started.error.message);

    const botKey = app.services.botKey(matchId);
    const humans = [
      { id: hostId as string, token: hostToken as string, socket: host },
      { id: guestId, token: guestToken, socket: guest },
    ];
    const accepted = { votes: 0, judgements: 0, nightActions: 0, chats: 0 };
    const rejected: string[] = [];
    const phases = new Set<string>();

    // Cada paso: los bots actúan, los humanos eligen una acción legal con su vista, y vence el temporizador de fase.
    for (let step = 0; step < 1500; step++) {
      const view = await emitAck(host, "match:view", { matchId, token: hostToken });
      if (!view.ok) throw new Error(view.error.message);
      if (view.data.phase === "ended") break;
      phases.add(view.data.phase);

      for (const human of humans) {
        const v = await emitAck(human.socket, "match:view", { matchId, token: human.token });
        if (!v.ok) continue;
        const me = v.data.me;
        const alive = v.data.players.filter((p: any) => p.status === "alive" && p.id !== human.id).map((p: any) => p.id as string);
        const send = async (command: Record<string, unknown>) => {
          const res = await emitAck(human.socket, "match:command", { matchId, token: human.token, command });
          if (!res.ok) rejected.push(`${command.type}: ${res.error.message}`);
          return res.ok;
        };
        if (v.data.phase === "voting" && me.status === "alive" && alive.length > 0 && v.data.votes[human.id] === undefined) {
          const target = alive[step % alive.length]!;
          if (await send({ type: "vote", voterId: human.id, targetId: target })) accepted.votes++;
        } else if (v.data.phase === "judgement" && v.data.defendantId !== human.id && me.status === "alive" && v.data.verdicts[human.id] === undefined) {
          if (await send({ type: "judgement.vote", voterId: human.id, verdict: step % 2 ? "guilty" : "innocent" })) accepted.judgements++;
        } else if (v.data.phase === "night" && me.status === "alive" && me.nightAction === null) {
          const ability = me.nightAbilities.find((a: any) => a.target === "player" && a.usesLeft !== 0);
          if (ability && alive.length > 0) {
            const targetId = alive[(step + 1) % alive.length]!;
            if (await send({ type: "night.action", actorId: human.id, ability: ability.key, targetId, secondTargetId: null })) accepted.nightActions++;
          }
        } else if (v.data.phase === "discussion" && me.status === "alive" && step % 5 === 0) {
          if (await send({ type: "chat.send", senderId: human.id, channel: "public", text: `paso ${step}` })) accepted.chats++;
        }
      }

      app.scheduler.fire(botKey);
      await settle();
      app.scheduler.fire(matchId);
      await settle();
    }

    const final = await emitAck(host, "match:view", { matchId, token: hostToken });
    if (!final.ok) throw new Error(final.error.message);
    expect(final.data.phase).toBe("ended");

    // Ambos clientes recibieron el final, con el mismo ganador.
    const endedHost = hostInbox.find((e) => e.type === "game.ended");
    const endedGuest = guestInbox.find((e) => e.type === "game.ended");
    expect(endedHost).toBeDefined();
    expect(endedGuest?.payload.winner).toBe(endedHost?.payload.winner);
    expect(final.data.winner).toBe(endedHost?.payload.winner);

    // Los humanos actuaron por socket y el servidor aceptó sus acciones.
    expect(accepted.votes).toBeGreaterThan(0);
    expect(accepted.judgements + accepted.nightActions + accepted.chats).toBeGreaterThan(0);
    expect(phases.has("voting") && phases.has("night") && phases.has("judgement")).toBe(true);

    // Cada cliente recibe solo su propio rol.
    expect(hostInbox.filter((e) => e.type === "roles.assigned").map((e) => e.payload.playerId)).toEqual([hostId]);
    expect(guestInbox.filter((e) => e.type === "roles.assigned").map((e) => e.payload.playerId)).toEqual([guestId]);

    // La partida queda guardada como terminada.
    expect((await app.matches.findById(matchId))?.status).toBe("finished");
    // Ningún comando legal de un humano fue rechazado (si alguno lo fue, se muestra en el fallo).
    expect(rejected).toEqual([]);
  }, 120_000);
});
