import { useState } from "react";
import { useGame } from "../state/store.js";
import type { Channel, GameEvent, MatchView } from "../types.js";
import { Button, Card, TextField } from "../ui/primitives.js";
import { CHANNEL_LABEL } from "../lib/text.js";
import { chatRights, chatSenderLabel, whisperTarget } from "../lib/chatRights.js";
import { buildLog, logContext } from "../lib/log.js";
import { copyBlocked } from "../lib/copyRights.js";

export function Chat({ view, log, compact = false }: { view: MatchView; log: GameEvent[]; compact?: boolean }) {
  const { channels, notice } = chatRights(view);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [text, setText] = useState("");
  const [recipient, setRecipient] = useState("");
  const send = useGame((s) => s.send);
  const active = channel && channels.includes(channel) ? channel : channels[0] ?? null;
  const nick = (id: string) => view.players.find((p) => p.id === id)?.nick ?? "?";
  const senderLabel = (p: Record<string, any>) => chatSenderLabel(view, p, nick);
  const whisperable = view.players.filter((p) => whisperTarget(p, view.me.id));
  const target = whisperable.some((p) => p.id === recipient) ? recipient : whisperable[0]?.id ?? "";
  // En la plaza, los avisos del sistema (votos, fases, muertes) van en el mismo flujo que los mensajes.
  const stream = [
    ...log
      .filter((e) => e.type === "chat.message" && e.payload.channel === active)
      .map((e) => {
        // Wiki (Medium.md:197, 215): estos mensajes no se copian; se impide en la UI.
        const locked = copyBlocked(view, { channel: String(e.payload.channel), senderId: String(e.payload.senderId) });
        return { seq: e.seq, key: `c${e.seq}`, node: (
          <p key={`c${e.seq}`} className={locked ? "select-none" : undefined} onCopy={locked ? (ev) => ev.preventDefault() : undefined} onCut={locked ? (ev) => ev.preventDefault() : undefined} onContextMenu={locked ? (ev) => ev.preventDefault() : undefined}>
            <strong>{senderLabel(e.payload)}{e.payload.channel === "whisper" ? ` → ${nick(e.payload.recipientId)}` : ""}:</strong> {e.payload.text}
          </p>
        ) };
      }),
    ...(active === "public"
      ? buildLog(log, logContext(view))
          .filter((i) => i.kind === "line" && i.tone !== "private")
          .map((i) => ({ seq: i.seq, key: i.key, node: <p key={i.key} className="italic opacity-80">• {i.kind === "line" ? i.text : ""}</p> }))
      : []),
  ].sort((a, b) => a.seq - b.seq);

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
        {stream.length === 0 && <p className="text-sm">Aún no hay mensajes.</p>}
        {stream.map((m) => m.node)}
      </div>
      {active === "whisper" && whisperable.length > 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm font-semibold">
          Para
          <select
            aria-label="Destinatario del susurro"
            className="cartoon-input !w-auto !py-1"
            value={target}
            onChange={(e) => setRecipient(e.target.value)}
          >
            {whisperable.map((p) => <option key={p.id} value={p.id}>{p.nick}</option>)}
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
