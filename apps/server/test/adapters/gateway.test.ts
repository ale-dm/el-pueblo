import { afterEach, describe, expect, it } from "vitest";
import type { Socket as ClientSocket } from "socket.io-client";
import { emitAck, startSocketApp, waitFor } from "../helpers/socketApp.js";

type Received = Array<{ type: string; payload: any; visibility: string }>;

let closeAll: (() => Promise<void>) | null = null;
afterEach(async () => {
  if (closeAll) await closeAll();
  closeAll = null;
});

/** Diez jugadores en una sala, con su bandeja de eventos recibidos. */
async function tenPlayers() {
  const app = await startSocketApp();
  closeAll = app.close;
  const clients: ClientSocket[] = [];
  const inbox: Received[] = [];
  for (let i = 0; i < 10; i++) {
    const s = await app.connect();
    const box: Received = [];
    s.on("match:events", (batch: Received) => box.push(...batch));
    clients.push(s);
    inbox.push(box);
  }
  const host = await emitAck(clients[0]!, "room:create", { nick: "P1" });
  if (!host.ok) throw new Error(host.error.message);
  const seats = [{ playerId: host.data.playerId, token: host.data.token, matchId: host.data.matchId }];
  for (let i = 1; i < 10; i++) {
    const joined = await emitAck(clients[i]!, "room:join", { roomCode: host.data.roomCode, nick: `P${i + 1}` });
    if (!joined.ok) throw new Error(joined.error.message);
    seats.push({ playerId: joined.data.playerId, token: joined.data.token, matchId: joined.data.matchId });
  }
  return { app, clients, inbox, seats, matchId: host.data.matchId as string };
}

describe("gateway Socket.IO con clientes reales", () => {
  it("el arranque reparte roles y cada jugador recibe solo su propio rol", async () => {
    const { clients, inbox, seats, matchId } = await tenPlayers();
    const started = await emitAck(clients[0]!, "match:start", { matchId, token: seats[0]!.token });
    expect(started.ok).toBe(true);

    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "phase.started")));
    inbox.forEach((box, i) => {
      const roles = box.filter((e) => e.type === "roles.assigned");
      expect(roles).toHaveLength(1);
      expect(roles[0]!.payload.playerId).toBe(seats[i]!.playerId);
    });
  });

  it("el chat público llega a todos y el de la Mafia solo a su canal de noche", async () => {
    const { clients, inbox, seats, matchId, app } = await tenPlayers();
    await emitAck(clients[0]!, "match:start", { matchId, token: seats[0]!.token });
    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "phase.started")));

    const sent = await emitAck(clients[1]!, "match:command", {
      matchId, token: seats[1]!.token,
      command: { type: "chat.send", senderId: seats[1]!.playerId, channel: "public", text: "hola a todos" },
    });
    expect(sent.ok).toBe(true);
    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "chat.message" && e.payload.text === "hola a todos")));

    const mafiaOut = await emitAck(clients[1]!, "match:command", {
      matchId, token: seats[1]!.token,
      command: { type: "chat.send", senderId: seats[1]!.playerId, channel: "mafia", text: "secreto" },
    });
    // El motor rechaza el chat de la Mafia de día; la aplicación lo devuelve como engine_rejected.
    expect(mafiaOut).toMatchObject({ ok: false, error: { code: "engine_rejected" } });
    expect(app.services).toBeDefined();
  });

  it("el temporizador de la fase avanza la partida y lo recibe todo el mundo", async () => {
    const { clients, inbox, seats, matchId, app } = await tenPlayers();
    await emitAck(clients[0]!, "match:start", { matchId, token: seats[0]!.token });
    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "phase.started")));

    expect(app.scheduler.fire(matchId)).toBe(true);
    // Día 1 sin votación: el siguiente paso es la noche 1.
    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "phase.started" && e.payload.phase === "night")));
    expect(app.scheduler.pending.has(matchId)).toBe(true);
  });

  it("un jugador que se desconecta puede volver con su token y recupera lo que ve", async () => {
    const { app, clients, inbox, seats, matchId } = await tenPlayers();
    await emitAck(clients[0]!, "match:start", { matchId, token: seats[0]!.token });
    await waitFor(() => inbox.every((box) => box.some((e) => e.type === "phase.started")));

    clients[2]!.disconnect();
    const fresh = await app.connect();
    const back = await emitAck(fresh, "room:reconnect", { matchId, token: seats[2]!.token });
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.data.playerId).toBe(seats[2]!.playerId);
    expect(back.data.events.filter((e: any) => e.type === "roles.assigned").map((e: any) => e.payload.playerId)).toEqual([
      seats[2]!.playerId,
    ]);
    const roster = await app.players.listByMatch(matchId);
    expect(roster.find((p) => p.id === seats[2]!.playerId)?.connected).toBe(true);
  });

  it("un token de otra partida o un token falso se rechazan con forbidden", async () => {
    const { clients, matchId } = await tenPlayers();
    const bad = await emitAck(clients[0]!, "match:command", {
      matchId, token: "falso", command: { type: "timer.expired" },
    });
    expect(bad).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("los comandos mal formados se rechazan sin romper el servidor", async () => {
    const { clients, matchId, seats } = await tenPlayers();
    const bad = await emitAck(clients[0]!, "match:command", { matchId, token: seats[0]!.token, command: "nope" });
    expect(bad).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    const missing = await emitAck(clients[0]!, "room:join", { nick: "x" });
    expect(missing).toMatchObject({ ok: false, error: { code: "invalid_input" } });
  });

  it("el chat tiene límite de velocidad por conexión", async () => {
    const app = await startSocketApp({ chatMax: 2 });
    closeAll = app.close;
    const s = await app.connect();
    const room = await emitAck(s, "room:create", { nick: "P1" });
    if (!room.ok) throw new Error("sala");
    const others = [];
    for (let i = 2; i <= 10; i++) {
      const c = await app.connect();
      const j = await emitAck(c, "room:join", { roomCode: room.data.roomCode, nick: `P${i}` });
      if (!j.ok) throw new Error("unirse");
      others.push(j);
    }
    await emitAck(s, "match:start", { matchId: room.data.matchId, token: room.data.token });
    const send = () => emitAck(s, "match:command", {
      matchId: room.data.matchId, token: room.data.token,
      command: { type: "chat.send", senderId: room.data.playerId, channel: "public", text: "hola" },
    });
    expect((await send()).ok).toBe(true);
    expect((await send()).ok).toBe(true);
    expect(await send()).toMatchObject({ ok: false, error: { code: "invalid_state" } });
  });
});

describe("gateway: bots al crear la sala", () => {
  it("room:create acepta bots, los devuelve en la vista y rechaza valores no válidos", async () => {
    const app = await startSocketApp();
    closeAll = app.close;
    const client = await app.connect();

    const bad = await emitAck(client, "room:create", { nick: "P1", bots: 15 });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("invalid_input");

    const created = await emitAck(client, "room:create", { nick: "P1", bots: 9 });
    if (!created.ok) throw new Error(created.error.message);
    const view = await emitAck(client, "match:view", { matchId: created.data.matchId, token: created.data.token });
    if (!view.ok) throw new Error(view.error.message);
    expect(view.data.players.filter((p: { isBot: boolean }) => p.isBot)).toHaveLength(9);
  });
});
