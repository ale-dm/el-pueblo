import { useGame } from "../state/store.js";
import { Button } from "../ui/primitives.js";

interface Props {
  onRole: () => void;
  onRoles: () => void;
  onWill: () => void;
  onLive: () => void;
  onGraveyard: () => void;
}

/** Barra de iconos abajo a la derecha, como la de Town of Salem: vivos, cementerio, roles, testamento, tu rol y salir. */
export function ActionBar({ onRole, onRoles, onWill, onLive, onGraveyard }: Props) {
  const leave = useGame((s) => s.leave);
  const items: Array<{ label: string; icon: string; onClick: () => void }> = [
    { label: "Vivos", icon: "👥", onClick: onLive },
    { label: "Muertos", icon: "🪦", onClick: onGraveyard },
    { label: "Roles", icon: "📜", onClick: onRoles },
    { label: "Testam.", icon: "✍️", onClick: onWill },
    { label: "Mi rol", icon: "🎭", onClick: onRole },
  ];
  return (
    <div role="toolbar" aria-label="Acciones de la partida" className="grid grid-cols-6 gap-1 border-t-4 border-ink bg-paper p-1.5">
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick} aria-label={item.label} title={item.label} className="cartoon-btn flex items-center justify-center px-0 py-1">
          <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
        </button>
      ))}
      <Button
        tone="danger"
        aria-label="Salir de la partida"
        title="Salir de la partida"
        className="flex items-center justify-center px-0 py-1"
        onClick={() => {
          if (window.confirm("¿Salir de la partida? No podrás volver a entrar en esta sesión.")) leave();
        }}
      >
        <span aria-hidden="true" className="text-lg leading-none">🚪</span>
      </Button>
    </div>
  );
}
