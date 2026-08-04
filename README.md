# Taiwan Exchange Companion

A mobile-first personal exchange companion designed as an installable Progressive Web App.

## Planned MVP

- Camera-based picture translation
- Quick text translation and saved phrases
- Offline emergency and exchange information
- Trip checklists, notes, and lightweight expense tracking

## Planned stack

- React + TypeScript + Vite
- Cloudflare Workers and D1
- OpenAI Responses API through a server-side Worker
- PWA offline shell with local storage for essential travel information

## Development

The application is being built in small, testable milestones. API keys and other secrets must stay in local environment files or Cloudflare secrets and must never be committed.

### Local AI translation test

1. Put your key in the ignored `.env` file as `OPENAI_API_KEY=...`.
   Your optional personal profile fields also live there, not in the Git repository.
2. Run `npm.cmd run dev`.
3. Open the local address Vite prints (normally `http://localhost:5173`).

The current photo and text translator uses a local Vite-only `/api/translate` endpoint. It reads the key on the server side, so the browser bundle and Git repository never receive it. This local endpoint is intentionally not a deployment setup; it will be replaced by a protected Cloudflare Worker only when you ask to deploy.

Personal profile details are copied once from the ignored `.env` into local browser storage. They remain on this device and are not included in translation requests.
