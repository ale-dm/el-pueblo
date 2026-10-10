import { useState } from "react";
import { useGame } from "../state/store.js";
import { enablePush, PUSH_MESSAGE } from "../net/push.js";
import { Button } from "../ui/primitives.js";

/** Activa los avisos de fase para este dispositivo. */
export function PushButton() {
  const session = useGame((s) => s.session);
  const [message, setMessage] = useState<string | null>(null);
  if (!session) return null;
  return (
    <div className="short-avisos flex flex-col items-start gap-1">
      <Button
        className="whitespace-nowrap px-3 py-1 text-sm"
        onClick={async () => {
          try {
            setMessage(PUSH_MESSAGE[await enablePush(session.matchId, session.token)]);
          } catch {
            setMessage("No se pudieron activar los avisos. Inténtalo de nuevo.");
          }
        }}
      >
        🔔 Avisos
      </Button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
