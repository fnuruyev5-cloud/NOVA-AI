# NovaAI — AI Website

A responsive, neon purple/blue Azerbaijani AI assistant website with a Node.js backend.

## Features
- Responsive AI chat UI
- Groq and CometAPI provider selection
- Chat sessions saved in browser localStorage
- Code helper mode
- Browser speech output (text-to-speech)
- Image/video generator UI placeholders (not connected to generation models yet)
- Profile / Pro placeholder

## Run locally
1. `npm install`
2. `cp .env.example .env` and add your own provider keys
3. `npm start`
4. Open `http://localhost:10000`

## Render deployment
This repository includes `render.yaml`.
- Create/connect a Render Web Service from this GitHub repository.
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Add `GROQ_API_KEY`, `GROQ_MODEL`, `COMETAPI_API_KEY`, `COMETAPI_MODEL` in Render > Environment.
- Deploy. The server binds to Render's `PORT` on `0.0.0.0`.

Never put provider keys in frontend JavaScript or commit `.env`. Render environment variables are the correct place for secrets.

## Providers
- Groq API: `https://api.groq.com/openai/v1`
- CometAPI: `https://api.cometapi.com/v1`
Both are called from the server using OpenAI-compatible chat completions. Confirm the selected model exists in your provider account. Free tiers/credits and request limits can change; no unlimited free usage is promised.

## Not yet implemented
Image and video generation require provider-specific model endpoints, pricing, and async job handling. The current UI is an honest placeholder, not a fake generator. Voice input (speech recognition), login, database-backed history, payments, and production-grade user quotas are also future work.
