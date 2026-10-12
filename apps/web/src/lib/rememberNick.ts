const KEY = "pueblo:nick";

/** El último nick usado en este navegador, para no volver a escribirlo. Sin almacenamiento, vacío. */
export function savedNick(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberNick(nick: string) {
  try {
    localStorage.setItem(KEY, nick);
  } catch {
    // Sin almacenamiento: se escribe otra vez en la siguiente partida.
  }
}
