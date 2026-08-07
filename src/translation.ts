import type { TranslationApiResponse, TranslationMode } from "./types";

export type TranslationQuality = "standard" | "improve";

export type TranslationRequest = {
  text: string;
  image: string | null;
  mode: TranslationMode;
  quality?: TranslationQuality;
  imageDetail?: "high" | "original";
};

export async function requestTranslation(request: TranslationRequest, signal?: AbortSignal): Promise<TranslationApiResponse> {
  let lastError = "The translator could not complete that request.";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request), signal });
      const data = await response.json().catch(() => null) as TranslationApiResponse | null;
      if (response.ok && data && typeof data.source_text === "string" && typeof data.translated_text === "string") return data;
      lastError = data?.error || lastError;
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === 2) break;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      lastError = error instanceof Error ? error.message : lastError;
      if (attempt === 2) break;
    }
    await wait(350 * (attempt + 1), signal);
  }
  throw new Error(lastError);
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => { const timeout = window.setTimeout(resolve, milliseconds); signal?.addEventListener("abort", () => { window.clearTimeout(timeout); reject(new DOMException("Translation cancelled", "AbortError")); }, { once: true }); });
}
