# Taiwan Exchange Companion — Revised Product Roadmap

## Summary

Build a reliable, secure, local-first travel companion for a Taiwan exchange. The current prototype already includes the PWA shell, local OpenAI text/photo translation, English-to-Traditional-Chinese pinyin mode, phrasebook, expenses, address cards, image library, useful websites, personal profile, and medical card.

No Cloudflare deployment or Cloudflare resource creation happens until explicitly approved.

## Phase 1 — Finish and secure the current app

- Refactor the monolithic UI into Translate, Phrasebook, Trip, Emergency, storage, and API modules without changing the visual design.
- Finish visible placeholder controls: editable checklists, emergency contacts, accommodation/embassy/insurance details, phrasebook search/filter/favorites/edit/delete, address-card copy/show/map actions.
- Improve translation reliability with client-side image resizing, timeout/cancel/offline/rate-limit states, retry, uncertainty warnings, local text history, and an explicit Terra “Improve translation” action.
- Keep source photos out of history by default and show a clear privacy notice for data sent to OpenAI.
- Protect passport, medical, and emergency fields with an optional PIN, Web Crypto encryption, five-minute auto-lock, and encrypted local export/import.

## Phase 2 — Complete the travel organizer

- Add editable packing and arrival checklist templates.
- Add trip budgets, remaining balance, category summaries, separate totals per currency, edit/delete, and CSV export.
- Add class/trip schedule, locations, reminders, and arrival setup tracking for SIM/eSIM, transport, banking, university, insurance, and registration.
- Add full-screen address cards and local backup/restore for phrases, addresses, checklists, expenses, schedules, and emergency information.

## Phase 3 — Add controlled AI capabilities

- Add push-to-record transcription followed by the existing translation pipeline.
- Add suggested Chinese replies with Traditional Chinese, pinyin, English meaning, and playback.
- Add an explicit “Explain this” action for cultural context and unfamiliar instructions.
- Add receipt scanning that proposes an expense entry for confirmation.
- Add dense-document mode using original image detail only when selected.
- Add lightweight phrase practice; defer live voice-to-voice translation until the core app is stable.

## Phase 4 — Mobile hardening and deployment preparation

- Test installation, camera capture, offline mode, storage limits, and speech playback on iPhone and Android.
- Add visible online/offline and AI-availability indicators; verify the exchange kit works in airplane mode.
- Move `/api/translate` from the Vite-only server into a reusable service and prepare a protected Cloudflare Worker.
- Add authentication, rate limits, daily spending limits, usage reporting, and secret configuration.
- Keep IndexedDB as the offline source of truth; introduce D1 sync only after deployment is approved.

## Interfaces and data changes

- Translation requests support direction/mode, image detail, and retry quality.
- Translation responses support uncertainty segments, suggested replies, model, and usage/cost metadata.
- Add versioned local records for translation history, emergency contacts, schedules, budgets, and encrypted private data.
- Add migrations so current profile, expenses, images, links, addresses, and medical information survive upgrades.
- Process images in memory and discard them after each request unless the user explicitly opts into photo history.

## Test plan

- Add Vitest and React Testing Library for storage, validation, translation modes, forms, and migrations.
- Mock OpenAI for automated tests; require an explicit environment flag for paid live smoke tests.
- Test Chinese-to-English, English-to-Traditional-Chinese pinyin, image translation, retry, malformed responses, timeout, rate-limit, and offline behavior.
- Verify every visible button works and every editable feature persists after refresh.
- Test mixed-currency expenses, backup/restore, PIN lock/unlock, incorrect PIN handling, and legacy-data migration.
- Run production builds and secret scans; complete real-device acceptance before deployment.

## Assumptions

- The immediate priority is reliable core behavior and privacy.
- The app remains single-user, local-first, English/Traditional-Chinese focused, and Taiwan-oriented.
- Photos are not retained unless a future opt-in feature is approved.
- Currency totals remain separated by currency; automatic exchange-rate conversion is deferred.
- Provider quotas and pricing will be rechecked from official documentation during deployment preparation.
