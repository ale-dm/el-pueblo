import { useEffect } from "react";

/** Cierra un aviso solo a los pocos segundos, para que no se apilen los de fases seguidas. Tocarlo también lo cierra. */
export function useAutoDismiss(active: boolean, dismiss: () => void, ms = 5000) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(dismiss, ms);
    return () => clearTimeout(timer);
  }, [active, dismiss, ms]);
}
