# Nova AI v2 (Render)

Bütün fayllar repo-nun ən üst səviyyəsində durur (`public/` qovluğu yoxdur). Köhnə faylları bunlarla əvəz et: `server.js`, `package.json`, `index.html`, `style.css`, `app.js`, `logo.png`, `logo-dark.png`.

## Environment

- `GROQ_API_KEY` (söhbət, səs tanıma, görüntü ehtiyatı)
- `COMETAPI_KEY` (və ya `COMETAPI_API_KEY`): söhbət, şəkil, görüntü, video
- `GEMINI_API_KEY`: yalnız söhbətdə Gemini seçilsə

İstəyə bağlı model adları: `GROQ_MODEL` (openai/gpt-oss-120b), `COMET_MODEL` (claude-haiku-5-5), `IMAGE_MODEL` (gpt-image-2), `VIDEO_MODEL` (wan3.0-prime), `COMETAPI_VISION_MODEL`, `GROQ_STT_MODEL`, `GEMINI_MODEL`.

## Xüsusiyyətlər

- 🎧 Səsli söhbət: danış, cavabı eşit, avtomatik davam edir. Dil avtomatik tanınır.
- 📷 Kamera: obyektləri göstər, 👁 təsvir et, 🎤 səslə soruş.
- 🖼 Şəkil, 🎬 video (5 saniyə), 🎤 səslə mesaj.
- Səs: Edge neyral səsləri. Xəta olsa brauzer səsinə keçir.
- Mikrofon və kamera icazə istəyir.

## v3

- Səs: `TTS_MODEL` (gpt-4o-mini-tts), `TTS_VOICE` (coral; digər: alloy, ash, ballad, echo, sage, shimmer, verse). `TTS_ENGINE=edge` yazsan köhnə Edge səsi işləyir.
- 🖼 Şəkil düzəltmə: şəklin altında "Düzəlt" düyməsinə bas, nəyi dəyişmək istədiyini yaz, 🖼 düyməsinə bas. Şəkil `/image-edit` ilə həqiqətən redaktə olunur.

## v5: Logo Studio

- Header-dəki ✦ düyməsi Logo Studio-nu açır. `POST /logo` söhbət modeli ilə peşəkar prompt yazır, sonra `IMAGE_MODEL` (gpt-image-2) ilə həqiqi şəkil yaradır. Yeni dəyişən lazım deyil, `COMETAPI_KEY` kifayətdir.
- Saxla: brauzerdə (localStorage), maksimum 20 logo, 768px WebP. Tam keyfiyyət üçün Download düyməsini işlət.
