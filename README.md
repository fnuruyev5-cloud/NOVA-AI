# NovaAI Website — Complete Starter

## Fayl quruluşu
```
server.js
package.json
render.yaml
.env.example
public/
  index.html
  assets/
    novaai-logo.png
```
**Vacib:** GitHub repository-nin kökündə `server.js` və `package.json` görünməlidir. ZIP-in özünü deyil, ZIP-i açdıqdan sonra içindəki fayl və `public` qovluğunu repository-yə yüklə.

## Render ayarları
- Runtime: Node
- Root Directory: boş saxla (fayllar repository kökündədirsə)
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/health`

Ana səhifə üçün `/` marşrutu ayrıca qurulub. `/health` JSON status qaytarır.

## API açarları
Render → Service → Environment:
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `COMETAPI_KEY`

İstifadə etmədiyin provayderin açarını boş saxlaya bilərsən. Açarları GitHub-a və `public` qovluğuna qoyma. Environment dəyişəndən sonra redeploy et.

## Hazır olanlar
- Təqdim etdiyin NovaAI loqosu (şəffaf fonlu versiya)
- Responsive desktop və mobil veb dizayn
- AI chat backend: Groq, Gemini, CometAPI
- Kod köməkçisi rejimi
- Yeni söhbət, brauzerdə lokal söhbət tarixçəsi
- Şəkil/video studiyası üçün interfeys
- Profil və parametrlər üçün ilkin interfeys
- `/` ana səhifə və `/health` yoxlaması

## Hələ inteqrasiya tələb edənlər
Şəkil və video generasiyası, real istifadəçi hesabları, cihazlararası sinxron mesajlaşma, serverdə saxlanan tarixçə, fayl yükləmə və Premium ödənişləri üçün ayrıca API/xidmət, verilənlər bazası və təhlükəsizlik qurulmalıdır. Bu ZIP bunları hazır işləyir kimi təqdim etmir.

## Lokal başlatma
Node.js 18+ → `npm install` → `.env.example` faylını `.env` kimi kopyala və API açarlarını daxil et → `npm start` → `http://localhost:3000`.
