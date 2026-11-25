# NovaAI Website
Responsive Azerbaijani AI assistant starter.

## Local
Node.js 18+ tələb olunur. `npm install` → `.env.example` faylını `.env` kimi kopyala, API açarını əlavə et → `npm start` → `http://localhost:3000`.

## Render
GitHub repository-yə ZIP-in içindəkiləri yüklə. `package.json` və `server.js` repository-nin kökündə olmalıdır.
Build: `npm install`
Start: `npm start`
Health check: `/health`
Render > Environment bölməsinə `GROQ_API_KEY`, `GEMINI_API_KEY`, `COMETAPI_KEY` dəyişənlərindən istifadə etdiklərini əlavə et.

API açarlarını GitHub-a və `public/` qovluğuna yerləşdirmə.

## Qeyd
AI chat Groq, Gemini və CometAPI ilə işləyir (açar tələb olunur). Şəkil/video səhifələri hələ interfeys maketidir; generasiya API-si qoşulmayıb. Profil, giriş, ödəniş və serverlərarası tarixçə hazır deyil.
