# Taiwan Exchange Companion

A mobile-first personal exchange companion designed as an installable Progressive Web App.

## Current prototype

- Camera/text translation through the local Vite server, including English → Traditional Chinese with tone-marked pinyin
- Phrasebook search, filters, favorites, edit/delete, suggested replies, and local translation history
- Offline trip checklist, websites, address cards with full-screen show/copy/map actions, image library, notes, and mixed-currency expenses with CSV export
- Editable profile, medical, emergency, accommodation, university, embassy, and insurance details
- Optional Web Crypto PIN lock with five-minute/background auto-lock and encrypted private backup

## Stack and deployment boundary

- React + TypeScript + Vite
- A local Vite-only API for development; Cloudflare Workers/D1 are not configured or deployed
- OpenAI Responses API is called only by the local server, never from the browser bundle
- PWA offline shell with local storage for essential travel information

## Development

The application is being built in small, testable milestones. API keys and other secrets must stay in local environment files or Cloudflare secrets and must never be committed.

### Local AI translation test

1. Put your key in the ignored `.env` file as `OPENAI_API_KEY=...`.
   Your optional personal profile fields also live there, not in the Git repository.
2. Run `npm.cmd run dev`.
3. Open the local address Vite prints (normally `http://localhost:5173`).

Run the automated checks with `npm.cmd test` and the production build with `npm.cmd run build`.

The current photo and text translator uses a local Vite-only `/api/translate` endpoint. It reads the key on the server side, so the browser bundle and Git repository never receive it. This local endpoint is intentionally not a deployment setup; it will be replaced by a protected Cloudflare Worker only when you ask to deploy.

Personal profile details are copied once from the ignored `.env` into local browser storage. They remain on this device and are not included in translation requests. Translation text and selected photos are sent to OpenAI only after you tap Translate; photos are resized in memory and are not stored in translation history.

Do not deploy or create Cloudflare resources until deployment is explicitly approved.
