# NovaAI deploy fix

## IMPORTANT — repository root structure
Upload the CONTENTS of this ZIP, not the ZIP file and not the enclosing folder. The repository root must directly contain:
- `server.js`
- `package.json`
- `index.html`
- `public/index.html`
- `public/assets/novaai-logo.png`

Both root `index.html` and `public/index.html` are included intentionally. The server checks both paths and also `dist/index.html` and `build/index.html`.

## Render settings
- Root Directory: **leave empty**
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

After replacing files in GitHub, trigger **Manual Deploy → Deploy latest commit** in Render. Check `/health`; it should return JSON with `"ok":true` and `"index":true`.

Add API keys only in Render → Environment: `GROQ_API_KEY`, `GEMINI_API_KEY`, `COMETAPI_KEY`. Never commit secret keys to GitHub.

AI chat backends are included. Image/video generation, user accounts, cloud-synced message history, and billing require additional services and are not active in this starter.
