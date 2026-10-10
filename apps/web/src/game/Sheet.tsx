import type { ReactNode } from "react";

/**
 * Hoja que sube desde abajo para el rol y el chat en móvil. Se cierra con "Cerrar" o tocando fuera.
 * Lo que va dentro ocupa la altura que queda y se desplaza por dentro.
 */
/** `fit`: la hoja tiene la altura de su contenido (hasta un máximo), para fichas cortas. */
export function Sheet({ title, onClose, children, fit = false }: { title: string; onClose: () => void; children: ReactNode; fit?: boolean }) {
  return (
    // El clic en el fondo cierra solo esta hoja: una hoja dentro de otra (la ficha de un rol) no cierra la de fuera.
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink/40" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col gap-2 rounded-t-3xl border-4 border-b-0 border-ink bg-paper p-3 text-ink ${fit ? "max-h-[70dvh]" : "h-[80dvh]"}`}
      >
        <header className="flex shrink-0 items-center justify-between gap-2">
          <h2 className="min-w-0 truncate font-display text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="cartoon-btn shrink-0 px-3 py-1 text-sm">Cerrar</button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </section>
    </div>
  );
}
