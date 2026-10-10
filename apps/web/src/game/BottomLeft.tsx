import { useState } from "react";
import type { GameEvent, MatchView } from "../types.js";
import { Chat } from "./Chat.js";
import { LogPanel } from "./LogPanel.js";

/** Chat y registro juntos abajo a la izquierda: pestañas, como el chat de Town of Salem. */
export function BottomLeft({ view, log, className = "" }: { view: MatchView; log: GameEvent[]; className?: string }) {
  const [tab, setTab] = useState<"chat" | "log">("chat");
  return (
    <div className={`flex min-h-0 flex-col gap-1 ${className}`}>
      <div role="tablist" className="flex gap-1">
        {(["chat", "log"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            type="button"
            onClick={() => setTab(t)}
            className={`cartoon-btn px-3 py-1 text-sm ${tab === t ? "" : "opacity-60"}`}
          >
            <span className="text-xs">{t === "chat" ? "Chat" : "Registro"}</span>
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "chat" ? <Chat view={view} log={log} compact /> : <LogPanel view={view} log={log} compact />}
      </div>
    </div>
  );
}
