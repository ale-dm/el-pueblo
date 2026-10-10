import { useEffect, useState } from "react";

/**
 * Pantalla de móvil: ancho de teléfono en vertical, o altura de teléfono en horizontal. Con esto se elige una de las dos
 * disposiciones de la partida; solo se monta una, así no hay dos campos de chat ni dos listas a la vez.
 */
export const PHONE_QUERY = "(max-width: 767px), (max-height: 540px)";

function matchesPhone(): boolean {
  try {
    return window.matchMedia(PHONE_QUERY).matches;
  } catch {
    // Sin matchMedia (pruebas, navegadores raros): escritorio, la disposición por defecto.
    return false;
  }
}

/** Verdadero mientras la pantalla sea de móvil. Se actualiza al girar el teléfono o cambiar el tamaño de la ventana. */
export function usePhoneLayout(): boolean {
  const [phone, setPhone] = useState(matchesPhone);
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(PHONE_QUERY);
    } catch {
      return;
    }
    const update = () => setPhone(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return phone;
}
