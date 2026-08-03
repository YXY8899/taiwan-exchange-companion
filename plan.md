# Taiwan Exchange Companion — Product and Build Plan

## 1. Product goal

Build a personal, mobile-first travel companion for an overseas exchange. The first release should solve the highest-frequency problems—understanding unfamiliar text, communicating basic needs, and finding essential personal information—while remaining inexpensive to host and simple to maintain.

The first release is an installable Progressive Web App (PWA), not a native App Store application. It should open from the phone home screen, use the camera, cache essential information for offline use, and work on both iOS and Android browsers.

## 2. MVP scope

### P0 — required for the first usable release

1. **Picture Translator**
   - Take or upload a photo of a menu, sign, receipt, letter, appliance, or other text.
   - Detect the source language.
   - Return the extracted source text, translation, pronunciation/romanization where useful, context notes, and uncertain segments.
   - Copy, share, read aloud, retry, and save the result.
   - Show a clear notice that AI translations should not be relied on alone for medical, legal, or emergency decisions.

2. **Quick Translator**
   - Translate typed or pasted text.
   - Offer practical modes such as polite, casual, asking for help, and “show this to someone.”
   - Save frequently used phrases for offline access.

3. **Offline Exchange Kit**
   - Emergency contacts, accommodation address, university address, insurance details, embassy information, and transport instructions.
   - Allergies, dietary restrictions, medications, and important personal notes.
   - Essential phrases and saved translations available without an internet connection.

4. **Basic Trip Organizer**
   - Packing and arrival checklists.
   - Saved places and notes.
   - Lightweight expenses list.

### P1 — add after the core workflow is reliable

- Recorded voice transcription followed by translation.
- Text-to-speech pronunciation improvements.
- Translation history synchronized across devices.
- Temporary photo history with explicit user opt-in.
- Better handling of handwriting and dense documents.

### Out of scope for the first release

- App Store/Google Play packaging.
- Live voice-to-voice translation.
- Automatic map or itinerary planning.
- Multi-user collaboration.
- Automatic translation overlays painted directly onto the original photo.
- A public user/account system.

## 3. Mobile experience

Use a one-handed layout with a persistent bottom navigation bar:

- **Translate** — camera translator and typed translator.
- **Phrasebook** — saved phrases and frequently used translations.
- **Trip** — checklist, notes, places, and expenses.
- **Emergency** — offline exchange kit and important contacts.

The camera flow should be the primary action on the home screen. The interface should use large tap targets, visible progress states, clear error messages, and minimal typing.

The service worker should cache the application shell and offline exchange data. AI translation itself requires a network connection and should explain that limitation.

## 4. Technical architecture

### Frontend

- React + TypeScript + Vite.
- Tailwind CSS or a small local design system.
- PWA manifest and service worker.
- IndexedDB/local storage for offline phrases, emergency details, settings, and unsynchronized notes.
- Browser camera input using a file input with `capture` support; use `getUserMedia` only where it improves the experience.

### Cloudflare

- Cloudflare Workers for the API and static asset delivery.
- Hono for typed, lightweight Worker routing.
- D1 for structured data such as settings, saved phrases, translation history, and usage events.
- R2 is optional and should only be introduced if the user explicitly wants photo history.
- Cloudflare Access can protect the personal app. Turnstile is useful if the app later becomes public.

Cloudflare Workers Free currently includes 100,000 requests per day and static assets are free and unlimited. D1 Free includes 5 million rows read per day, 100,000 rows written per day, and 5 GB of storage. R2 Standard includes 10 GB-month storage, 1 million Class A operations, 10 million Class B operations, and free egress. These limits are more than sufficient for a single-user personal app.

### OpenAI

- Use the Responses API through the Cloudflare Worker.
- Keep `OPENAI_API_KEY` only in Worker secrets or local development variables. Never expose it in browser JavaScript.
- Use structured output for translation responses.
- Use `gpt-5.6-luna` for normal production translation and quick text tasks.
- Escalate difficult images or quality-sensitive requests to `gpt-5.6-terra` with an explicit user action such as “Improve translation.”
- Use `detail: "high"` for ordinary signs and `detail: "original"` for small writing, OCR, and dense documents when necessary.
- Resize images client-side before upload, targeting roughly 1600–2000 pixels on the longest edge.
- Process images in memory and discard them by default.

Suggested structured response:

```json
{
  "detected_language": "string",
  "source_text": "string",
  "translated_text": "string",
  "romanization": "string or null",
  "context": "string or null",
  "uncertain_segments": ["string"],
  "suggested_reply": "string or null"
}
```

## 5. Data model

Start with a small schema:

- `profile_settings`: destination, language preferences, personal exchange details.
- `saved_phrases`: source phrase, translation, pronunciation, category, favorite flag.
- `translations`: source text, translated text, language pair, created time, optional metadata; do not store the original image by default.
- `trip_items`: checklist items, notes, saved places, or expenses.
- `usage_events`: model, input/output tokens when available, estimated cost, route, and timestamp.

Essential emergency data should also be cached locally so the app remains useful even if D1 or the network is unavailable.

## 6. Security and privacy

- Store all API credentials server-side.
- Do not log raw photos, medical information, passport numbers, or API keys.
- Delete temporary image data after the OpenAI response is returned.
- Add file type, file size, and image dimension validation at the Worker boundary.
- Add per-device and per-day request limits.
- Add OpenAI project budget alerts and an application-level spending cap.
- Protect the repository and deployment as private before adding personal configuration.
- If the repository remains public, commit only placeholder configuration such as `.env.example`.
- Add a visible privacy note explaining what is sent to the AI service and what is stored.

## 7. OpenAI credit plan

The credit should be used to validate quality, not to make the production app unnecessarily expensive. Current model pricing means ordinary personal translation usage is likely to cost far less than $100.

Suggested evaluation allocation:

- **$35** — compare Luna, Terra, and Sol on representative menus, signs, handwriting, receipts, and documents.
- **$25** — build a small evaluation set and repeat tests while refining prompts and structured output.
- **$15** — experiment with recorded voice transcription and translation.
- **$10** — test longer cultural explanations and exchange-specific assistance.
- **$10** — real pre-departure usage and device testing.
- **$5** — reserve for debugging or unexpected usage.

Track every request in `usage_events`. Do not intentionally create waste or add expensive features solely to exhaust the credit.

## 8. Delivery schedule

The schedule is relative to the credit expiry date and should be compressed or expanded based on the actual expiry shown in the OpenAI dashboard.

### Weeks 1–2: foundation

- Bootstrap React/Vite/TypeScript and the PWA shell.
- Add Cloudflare Worker routing and deployment configuration.
- Add mobile layout, bottom navigation, error states, and loading states.
- Add basic personal authentication/protection.

### Weeks 3–4: picture translation

- Implement camera capture and client-side image resizing.
- Add Worker validation and the Responses API call.
- Add structured translation response rendering.
- Add copy, share, pronunciation, retry, and save actions.

### Weeks 5–6: offline and trip tools

- Add phrasebook and saved translations.
- Add offline emergency/exchange kit.
- Add checklists, notes, saved places, and expenses.
- Add D1 persistence and local offline caching.

### Weeks 7–8: evaluation and hardening

- Test on iPhone and Android.
- Test weak network, airplane mode, camera permissions, oversized images, and API errors.
- Evaluate translation quality across representative image categories.
- Tune model routing, prompts, image detail, and output limits.

### Weeks 9–10: optional voice and release

- Add voice transcription only if P0 is reliable.
- Configure usage alerts and spending limits.
- Remove sensitive logs and verify secrets.
- Deploy the production Worker and install the PWA on the phone.
- Run a final end-to-end travel-day rehearsal.

## 9. Definition of done for MVP

- The app installs from Safari or Chrome onto the phone home screen.
- A user can photograph a sign and receive a useful result within a reasonable wait.
- The result includes original text, translation, and uncertainty/context information.
- Saved phrases and emergency information work with airplane mode enabled.
- The app handles denied camera permission, unsupported files, network failure, timeout, and rate limit errors gracefully.
- No API key appears in the client bundle, browser network payloads, Git history, or logs.
- API usage and estimated cost are visible to the owner.
- The repository has a clean `main` branch and no committed secrets.

## 10. Immediate next tasks

1. Change the GitHub repository visibility to private.
2. Bootstrap the React/Vite/PWA application shell.
3. Add the Cloudflare Worker and local development configuration.
4. Implement the first picture-translation request with a mocked structured response.
5. Replace the mock with the server-side OpenAI Responses API call.
6. Test the complete camera-to-translation flow on a real phone.

## Official references

- [OpenAI models](https://developers.openai.com/api/docs/models)
- [OpenAI image and vision guide](https://developers.openai.com/api/docs/guides/images-vision)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
