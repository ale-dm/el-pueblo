import { useState } from "react";
import { useGame } from "../state/store.js";
import type { Channel, GameEvent, MatchView } from "../types.js";
import { Button, Card, TextField } from "../ui/primitives.js";
import { CHANNEL_LABEL } from "../lib/text.js";

/** Canales a los que puede escribir ahora mismo, según la fase y el bando. */
function channelsFor(view: MatchView): Channel[] {
  const list: Channel[] = [];
  const me = view.me;
  if (me.status === "dead") list.push("dead");
  if (me.status === "alive") {
    if (view.phase === "night" && me.faction === "mafia") list.push("mafia");
    if (view.phase !== "night" && view.phase !== "ended") list.push("public");
  }
  return list;
}

export function Chat({ view, log }: { view: MatchView; log: GameEvent[] }) {
  const channels = channelsFor(view);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [text, setText] = useState("");
  const send = useGame((s) => s.send);
  const active = channel && channels.includes(channel) ? channel : channels[0] ?? null;
  const nick = (id: string) => view.players.find((p) => p.id === id)?.nick ?? "?";
  const messages = log.filter((e) => e.type === "chat.message" && e.payload.channel === active);

  return (
    <Card>
      <div className="mb-2 flex flex-wrap gap-2">
        {(["public", "mafia", "dead"] as Channel[]).filter((c) => channels.includes(c) || (c === "mafia" && view.me.faction === "mafia")).map((c) => (
          <Button key={c} tone={c === "mafia" ? "mafia" : c === "dead" ? "danger" : "sun"} className={active === c ? "" : "opacity-60"} onClick={() => setChannel(c)}>
            {CHANNEL_LABEL[c]}
          </Button>
        ))}
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border-2 border-ink bg-white/60 p-2 text-ink">
        {messages.length === 0 && <p className="text-sm">Aún no hay mensajes.</p>}
        {messages.map((m) => (
          <p key={m.seq}><strong>{nick(m.payload.senderId)}:</strong> {m.payload.text}</p>
        ))}
      </div>
      {active && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            void send({ type: "chat.send", senderId: view.me.id, channel: active, text: body });
            setText("");
          }}
        >
          <TextField value={text} maxLength={500} placeholder="Escribe…" onChange={(e) => setText(e.target.value)} />
          <Button type="submit">Enviar</Button>
        </form>
      )}
    </Card>
  );
}
