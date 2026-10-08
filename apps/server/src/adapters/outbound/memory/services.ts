import type { GameEventEnvelope } from "@el-pueblo/engine";
import type { Broadcaster, Clock, IdGenerator, Security } from "../../../application/ports.js";

/** Registra lo publicado. Los tests comprueban aquí qué llegó a los clientes. */
export class RecordingBroadcaster implements Broadcaster {
  readonly published: Array<{ matchId: string; events: GameEventEnvelope[] }> = [];
  readonly narrations: Array<{ matchId: string; seq: number; text: string; source: string }> = [];

  async publish(matchId: string, events: GameEventEnvelope[]) {
    this.published.push({ matchId, events: [...events] });
  }

  async publishNarration(matchId: string, narration: { seq: number; text: string; source: "gemini" | "template" }) {
    this.narrations.push({ matchId, ...narration });
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-10-08T12:00:00Z")) {}

  now() {
    return new Date(this.current);
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Identificadores deterministas: uuid-1, uuid-2... y códigos de sala ROOM01, ROOM02... */
export class SequentialIds implements IdGenerator {
  private n = 0;

  uuid() {
    this.n++;
    return `uuid-${this.n}`;
  }

  roomCode() {
    this.n++;
    return `ROOM${String(this.n).padStart(2, "0")}`;
  }
}

/** Tokens tok-N, hash h(tok-N) y semillas 1000+N. Solo para tests: nunca en producción. */
export class SequentialSecurity implements Security {
  private n = 0;

  newToken() {
    this.n++;
    return `tok-${this.n}`;
  }

  hashToken(token: string) {
    return `h(${token})`;
  }

  newSeed() {
    return 1000 + this.n;
  }
}
