import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTranslation } from "./translation";

afterEach(() => vi.restoreAllMocks());

describe("requestTranslation", () => {
  it("returns structured traditional Chinese output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      source_text: "I would like water",
      translated_text: "我想要水",
      romanization: "Wǒ xiǎng yào shuǐ",
      context: "A polite request",
      detected_language: "English",
      uncertain_segments: [],
      suggested_reply: "好的，請稍等。",
      model: "gpt-5.6-luna",
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const result = await requestTranslation({ text: "I would like water", image: null, mode: "speakChinese" });
    expect(result.translated_text).toBe("我想要水");
    expect(result.romanization).toContain("Wǒ");
    expect(result.suggested_reply).toContain("請");
  });

  it("surfaces a safe server error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Rate limit reached" }), { status: 429 })));
    await expect(requestTranslation({ text: "hello", image: null, mode: "readChinese" })).rejects.toThrow("Rate limit reached");
  });
});
