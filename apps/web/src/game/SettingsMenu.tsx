import { useState } from "react";
import { useGame } from "../state/store.js";
import { Button, Card } from "../ui/primitives.js";

/** Ajustes de la partida: sonido y salir. Se abre desde el icono de la esquina. */
export function SettingsMenu({ muted, onToggleMute }: { muted: boolean; onToggleMute: () => void }) {
  const [open, setOpen] = useState(false);
  const leave = useGame((s) => s.leave);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Ajustes"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cartoon-btn flex size-10 items-center justify-center px-0 py-0 text-xl"
      >
        ☰
      </button>
      {open && (
        <Card className="absolute left-0 top-full z-30 mt-2 w-56 space-y-2 p-3">
          <Button className="w-full text-sm" onClick={onToggleMute}>{muted ? "Activar sonidos" : "Silenciar sonidos"}</Button>
          <Button tone="danger" className="w-full text-sm" onClick={() => {
            if (window.confirm("¿Salir de la partida? No podrás volver a entrar en esta sesión.")) leave();
          }}>Salir de la partida</Button>
          <Button className="w-full text-sm" onClick={() => setOpen(false)}>Cerrar</Button>
        </Card>
      )}
    </div>
  );
}
