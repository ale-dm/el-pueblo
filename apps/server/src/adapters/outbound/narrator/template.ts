import type { NarrationFact, Narration, Narrator } from "../../../application/ports.js";

const CAUSE: Record<string, string> = {
  mafia: "la Mafia", shot: "un disparo", execute: "una ejecución", ambush: "una emboscada",
  veteran: "un Veterano en alerta", trap: "una trampa", crusade: "el Cruzado", bodyguard: "un duelo", guilt: "la culpa",
};
const ROLE = (r: string | null) => (r ? ` Era ${r}.` : "");

/** Narración sin IA: frases fijas en español. Se usa si Gemini no responde o no hay clave. */
export function templateLines(facts: NarrationFact[]): string[] {
  return facts.map((f) => {
    switch (f.kind) {
      case "day":
        return `Día ${f.dayNumber}. El pueblo se reúne para hablar.`;
      case "night":
        if (f.deaths.length === 0) return "La noche pasa en silencio. Nadie amanece muerto.";
        return f.deaths
          .map((d) => `${d.nick} amanece muerto, víctima de ${CAUSE[d.cause] ?? "un suceso oscuro"}.${ROLE(d.role)}`)
          .join(" ");
      case "trial":
        return `${f.defendant} es llevado ante el pueblo.`;
      case "verdict":
        return f.verdict === "guilty" ? `${f.defendant} es declarado culpable.` : `${f.defendant} sale libre.`;
      case "hanged":
        return `${f.nick} cuelga de la horca.${ROLE(f.role)}`;
      case "ended":
        return f.winner === "town" ? "La Mafia ha caído. El pueblo gana." : "La Mafia se impone. El pueblo ha perdido.";
    }
  });
}

export class TemplateNarrator implements Narrator {
  async narrate(facts: NarrationFact[]): Promise<Narration> {
    return {
      text: templateLines(facts).join(" ") || "Nada que contar todavía.",
      source: "template",
      model: null,
      inputTokens: null,
      outputTokens: null,
    };
  }
}
