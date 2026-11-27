# Nova AI (Render versiyası)

Sayt və server eyni yerdə işləyir. `public/` qovluğu lazım deyil: bütün fayllar repo-nun ən üst səviyyəsində durur.

## Render-ə yükləmək

1. Render-in qoşulduğu GitHub repo-da köhnə faylları bu ZIP-dəki fayllarla əvəz et: `server.js`, `package.json`, `index.html`, `style.css`, `app.js`, `logo.png`, `logo-dark.png`.
2. Render → Settings: Build Command `npm install`, Start Command `npm start` (və ya `node server.js`).
3. Environment bölməsində bu açarlar olmalıdır: `GROQ_API_KEY`, `GEMINI_API_KEY`, `COMETAPI_API_KEY`.
4. Deploy bitəndə Render ünvanını aç. Sayt açılır. ⚙ Ayarlarda "Server ünvanı" boş qala bilər.

## İstəyə bağlı dəyişənlər

- `GROQ_MODEL`, `GEMINI_MODEL`, `COMET_MODEL`, `IMAGE_MODEL`: model adları köhnələrsə bunlarla dəyiş.
- `GOOGLE_TTS_API_KEY`: səs üçün ayrı Google Cloud açarı. Yoxdursa `GEMINI_API_KEY` yoxlanır. Səs işləməsə sayt brauzer səsinə keçir.
- `ALLOWED_ORIGIN`: sayt başqa ünvanda (məs. GitHub Pages) olsa, onun ünvanı.

## Qeydlər

- Pulsuz Render planı yatır: ilk sorğu 30–60 saniyə çəkə bilər.
- Açarları heç vaxt repo-ya yazma.
- Söhbətlər yalnız brauzerdə saxlanır.
