import { useState } from "react";
import { useGame } from "../state/store.js";
import type { Channel, GameEvent, MatchView } from "../types.js";
import { Button, Card, TextField } from "../ui/primitives.js";
import { CHANNEL_LABEL } from "../lib/text.js";
import { chatRights } from "../lib/chatRights.js";

export function Chat({ view, log, compact = false }: { view: MatchView; log: GameEvent[]; compact?: boolean }) {
  const { channels, notice } = chatRights(view);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [text, setText] = useState("");
  const [recipient, setRecipient] = useState("");
  const send = useGame((s) => s.send);
  const active = channel && channels.includes(channel) ? channel : channels[0] ?? null;
  const nick = (id: string) => view.players.find((p) => p.id === id)?.nick ?? "?";
  const alive = view.players.filter((p) => p.status === "alive" && p.id !== view.me.id);
  const target = alive.some((p) => p.id === recipient) ? recipient : alive[0]?.id ?? "";
  const messages = log.filter((e) => e.type === "chat.message" && e.payload.channel === active);

  return (
    <Card className={compact ? "p-2" : ""}>
      <div className="mb-2 flex flex-wrap gap-2">
        {channels.map((c) => (
          <Button key={c} tone={c === "mafia" ? "mafia" : c === "dead" ? "danger" : "sun"} className={active === c ? "" : "opacity-60"} onClick={() => setChannel(c)}>
            {CHANNEL_LABEL[c]}
          </Button>
        ))}
      </div>
      <div className={`${compact ? "max-h-24" : "max-h-56"} space-y-1 overflow-y-auto rounded-2xl border-2 border-ink bg-white/60 p-2 text-ink`}>
        {messages.length === 0 && <p className="text-sm">Aún no hay mensajes.</p>}
        {messages.map((m) => (
          <p key={m.seq}>
            <strong>{nick(m.payload.senderId)}{m.payload.channel === "whisper" ? ` → ${nick(m.payload.recipientId)}` : ""}:</strong> {m.payload.text}
          </p>
        ))}
      </div>
      {active === "whisper" && alive.length > 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
          Para
          <select
            aria-label="Destinatario del susurro"
            className="cartoon-input !w-auto !py-1"
            value={target}
            onChange={(e) => setRecipient(e.target.value)}
          >
            {alive.map((p) => <option key={p.id} value={p.id}>{p.nick}</option>)}
          </select>
        </label>
      )}
      {active && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const body = text.trim();
            if (!body) return;
            void send(
              active === "whisper"
                ? { type: "chat.send", senderId: view.me.id, channel: active, text: body, recipientId: target }
                : { type: "chat.send", senderId: view.me.id, channel: active, text: body },
            );
            setText("");
          }}
        >
          <TextField value={text} maxLength={500} placeholder="Escribe…" aria-label="Mensaje" onChange={(e) => setText(e.target.value)} />
          <Button type="submit" disabled={active === "whisper" && !target}>Enviar</Button>
        </form>
      )}
      {notice && <p className="mt-2 text-sm font-semibold">{notice}</p>}
    </Card>
  );
}
