import type { NarrationFact, Narration, Narrator } from "../../../application/ports.js";
import { templateLines } from "./template.js";

/** Lo que el narrador necesita de Gemini: una llamada de texto con límite de tiempo. */
export interface TextModel {
  generate(args: { prompt: string; model: string; timeoutMs: number; maxOutputTokens: number }): Promise<{
    text: string;
    inputTokens: number | null;
    outputTokens: number | null;
  }>;
}

const SYSTEM = [
  "Eres el narrador de un juego de Mafia en español.",
  "Con los hechos públicos que te doy, escribe dos o tres frases con tono de misterio, sin adornos largos.",
  "No inventes hechos, no reveles roles que no figuren en los hechos, y no hagas preguntas.",
].join(" ");

/** Narrador con Gemini. Si la llamada falla, agota el tiempo o no hay cuota, usa plantillas. */
export class GeminiNarrator implements Narrator {
  constructor(
    private readonly model: TextModel,
    private readonly modelName: string,
    private readonly timeoutMs: number,
    private readonly log: (message: string) => void = () => undefined,
  ) {}

  async narrate(facts: NarrationFact[]): Promise<Narration> {
    if (facts.length === 0) return { text: "", source: "template", model: null, inputTokens: null, outputTokens: null };
    const prompt = `${SYSTEM}\n\nHechos:\n${facts.map((f) => `- ${JSON.stringify(f)}`).join("\n")}`;
    try {
      const out = await this.model.generate({ prompt, model: this.modelName, timeoutMs: this.timeoutMs, maxOutputTokens: 300 });
      const text = out.text.trim();
      if (text.length === 0) throw new Error("respuesta vacía");
      return { text, source: "gemini", model: this.modelName, inputTokens: out.inputTokens, outputTokens: out.outputTokens };
    } catch (error) {
      this.log(`narrador: Gemini no disponible, se usan plantillas (${String(error).slice(0, 120)})`);
      return {
        text: templateLines(facts).join(" "),
        source: "template",
        model: null,
        inputTokens: null,
        outputTokens: null,
      };
    }
  }
}
