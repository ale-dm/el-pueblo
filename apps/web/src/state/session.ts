/** Sesión del navegador: el token de reconexión sobrevive a recargas. Si el almacenamiento falla, se juega igual. */
export interface Session {
  matchId: string;
  playerId: string;
  token: string;
  roomCode: string;
  nick: string;
}

const KEY = "elpueblo.session";

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento: la sesión vive solo en memoria.
  }
}
