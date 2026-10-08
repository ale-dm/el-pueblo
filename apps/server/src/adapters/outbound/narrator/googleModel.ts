import { GoogleGenAI } from "@google/genai";
import type { TextModel } from "./gemini.js";

/** Adaptador real del SDK de Gemini. El timeout cancela la petición HTTP, no solo deja de esperarla. */
export function googleTextModel(apiKey: string): TextModel {
  const client = new GoogleGenAI({ apiKey });
  return {
    async generate({ prompt, model, timeoutMs, maxOutputTokens }) {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          maxOutputTokens,
          temperature: 0.9,
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
      return {
        text: response.text ?? "",
        inputTokens: response.usageMetadata?.promptTokenCount ?? null,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
      };
    },
  };
}
