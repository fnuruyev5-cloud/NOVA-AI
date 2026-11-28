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

- Header-dəki ✦ düyməsi Logo Studio-nu açır. Loqo adı, kateqoriya, rəng və üsluba əsasən xüsusi professional prompt qurulur.
- Loqo promptu üçün söhbət modeli/API açarı tələb olunmur; prompt serverdə hazırlanır.
- Saxla: brauzerdə (localStorage), maksimum 20 logo. Tam ölçülü nəticə üçün Download düyməsini işlət.

## v6: Image providers

- Ümumi şəkil yaratma (`🖼`) üçün `IMAGE_PROVIDER=auto` olduqda CometAPI → Cloudflare → Hugging Face → Pollinations ardıcıllığı işləyir.
- `IMAGE_PROVIDER` seçimləri: `comet` | `cloudflare` | `huggingface` | `pollinations`.
- Cloudflare üçün `CF_ACCOUNT_ID`, `CF_API_TOKEN` (Workers AI icazəsi ilə) lazımdır. Ümumi şəkil modeli `CF_IMAGE_MODEL` ilə seçilir.
- Hugging Face üçün `HF_TOKEN`, model üçün `HF_IMAGE_MODEL` lazımdır.
- Pollinations ümumi şəkil yaratmada yalnız `IMAGE_PROVIDER=auto` ehtiyat sırasındadır və ya açıq seçildikdə işləyir.

## v7: Premium Logo Studio — Leonardo Phoenix

- Logo Studio standart olaraq Cloudflare Workers AI üzərindən `@cf/leonardo/phoenix-1.0` istifadə edir. Pollinations loqo yaratmada avtomatik istifadə olunmur.
- Phoenix üçün 1024×1024 ölçü, 35 addım, guidance 6 və xüsusi negative prompt göndərilir.
- Render Environment Variables:
  - `CF_ACCOUNT_ID` — Cloudflare Account ID
  - `CF_API_TOKEN` — Workers AI modelini işlətmək icazəsi olan API token
  - `LOGO_IMAGE_PROVIDER=cloudflare` — loqo sağlayıcısı (standart)
  - `CF_LOGO_MODEL=@cf/leonardo/phoenix-1.0` — loqo modeli (standart)
- İstəyə bağlı: `LOGO_IMAGE_PROVIDER=comet` və ya `huggingface` seçilə bilər; həmin sağlayıcıların öz açarları tələb olunur.
- Cloudflare Phoenix ödənişlidir; təxmini qiymət 1024×1024 və 35 addım üçün təxminən $0.027 (hesab/qiymət dəyişə bilər). Tam pulsuz və limitsiz deyil.
- Phoenix üçün chat/LLM API açarı tələb olunmur. Loqo promptu serverdə hazırlanır.
