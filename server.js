import express from 'express';
import multer from 'multer';
import { EdgeTTS } from '@andresaya/edge-tts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const D = path.dirname(fileURLToPath(import.meta.url)), E = process.env, app = express();
const GROQ = E.GROQ_API_KEY, COMET = E.COMETAPI_KEY || E.COMETAPI_API_KEY;
const GB = 'https://api.groq.com/openai/v1', CB = 'https://api.cometapi.com/v1';
const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

app.use(express.json({ limit: '15mb' }));
app.use((q, r, n) => {
  r.set({ 'Access-Control-Allow-Origin': E.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
  q.method === 'OPTIONS' ? r.sendStatus(204) : n();
});
const send = f => (q, r) => r.sendFile(path.join(D, f));
app.get('/', send('index.html'));
['index.html', 'style.css', 'app.js', 'logo.png', 'logo-dark.png'].forEach(f => app.get('/' + f, send(f)));

const SYS = "Your name is Nova AI. You were created by Fərid (F2 Fərid). Always reply in the language the user writes or speaks in. When asked who created you or who you are, answer in that language with a short, warm explanation: you are Nova AI, a smart multilingual assistant created by Fərid; you can chat, write code, create and edit images, make videos, see through the camera and speak naturally. Never present yourself as ChatGPT, Gemini or any other brand's assistant, and never claim to be human. Be clear, friendly and honest; do not invent facts.";
const VOICE = ' This is a spoken conversation: reply in 1-3 short, clear sentences, no markdown, no lists, no emojis, and avoid abbreviations.';
const bad = (r, e) => { console.error(e); r.status(500).json({ error: String(e.message || e) }); };
const txt = j => { const c = j.choices?.[0]?.message?.content; return (Array.isArray(c) ? c.map(x => x.text || '').join('') : c || '').trim(); };
async function J(url, key, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(j.error?.message || j.message || r.status);
  return j;
}

app.post('/chat', async (q, r) => {
  try {
    const m = (q.body.messages || []).slice(-30), sys = { role: 'system', content: SYS + (q.body.voice ? VOICE : '') };
    const CH = {
      gemini: async () => {
        if (!E.GEMINI_API_KEY) throw Error('GEMINI_API_KEY missing');
        const x = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${E.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_API_KEY },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: sys.content }] }, contents: m.map(a => ({ role: a.role === 'assistant' ? 'model' : 'user', parts: [{ text: a.content }] })) })
        });
        const j = await x.json();
        if (!x.ok) throw Error(j.error?.message || x.status);
        return j.candidates[0].content.parts.map(a => a.text || '').join('');
      },
      comet: async () => {
        if (!COMET) throw Error('COMETAPI_KEY missing');
        return txt(await J(CB + '/chat/completions', COMET, { model: E.COMET_MODEL || E.COMETAPI_MODEL || 'claude-haiku-5-5', messages: [sys, ...m] }));
      },
      groq: async () => {
        if (!GROQ) throw Error('GROQ_API_KEY missing');
        return txt(await J(GB + '/chat/completions', GROQ, { model: E.GROQ_MODEL || 'openai/gpt-oss-120b', messages: [sys, ...m] }));
      }
    };
    const first = CH[q.body.provider] ? q.body.provider : 'groq';
    const order = [first, ...['groq', 'comet', 'gemini'].filter(k => k !== first)];
    let text = '', errs = [];
    for (const k of order) {
      try { text = (await CH[k]()).trim(); if (text) break; }
      catch (e) { errs.push(k + ': ' + e.message); console.warn('chat provider failed:', k, e.message); }
    }
    if (!text) throw Error(errs.join(' | ') || 'Boş cavab');
    r.json({ text });
  } catch (e) { bad(r, e); }
});

app.post('/image', async (q, r) => {
  try {
    const h = (q.body.history || []).filter(x => x.role === 'user').map(x => x.content).slice(-3).join('\n') || q.body.prompt;
    r.json({ image: await genImage(h) });
  } catch (e) { bad(r, e); }
});

app.post('/image-edit', async (q, r) => {
  try {
    const { image, prompt } = q.body; let buf, type = 'image/png';
    if (/^data:/.test(image || '')) { const m = image.match(/^data:([^;]+);base64,(.*)$/s); type = m[1]; buf = Buffer.from(m[2], 'base64'); }
    else { const g = await fetch(image); type = g.headers.get('content-type') || type; buf = Buffer.from(await g.arrayBuffer()); }
    const f = new FormData();
    f.append('model', E.IMAGE_MODEL || 'gpt-image-2'); f.append('prompt', prompt); f.append('n', '1');
    f.append('image', new Blob([buf], { type }), 'image.png');
    const x = await fetch(CB + '/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + COMET }, body: f });
    const j = await x.json();
    if (!x.ok) throw Error(j.error?.message || x.status);
    const i = (Array.isArray(j.data) ? j.data[0] : j.data) || j, b = i.b64_json || i.base64;
    const out = b ? `data:image/png;base64,${b}` : (i.url || i.image_url);
    if (!out) throw Error('Şəkil gəlmədi');
    r.json({ image: out });
  } catch (e) { bad(r, e); }
});

app.post('/vision', async (q, r) => {
  try {
    const { image, prompt } = q.body;
    const m = (image || '').match(/^data:(image\/[\w+.-]+);base64,(.*)$/s);
    if (!m) throw Error('Şəkil düzgün deyil');
    const ask = (prompt || 'Describe the image.') + '\nAnswer in 2-4 short, clear sentences, no markdown.';
    const oa = (base, key, model) => J(base + '/chat/completions', key, { model, max_tokens: 800, messages: [{ role: 'system', content: SYS }, { role: 'user', content: [{ type: 'text', text: ask }, { type: 'image_url', image_url: { url: image } }] }] }).then(txt);
    const gem = async (model, body) => {
      const x = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_API_KEY }, body: JSON.stringify(body) });
      const j = await x.json();
      if (!x.ok) throw Error(j.error?.message || x.status);
      return j;
    };
    const tries = [];
    if (COMET) tries.push(() => oa(CB, COMET, E.COMETAPI_VISION_MODEL || E.VISION_MODEL || 'deepseek-v4-flash-vision'));
    if (GROQ) tries.push(() => oa(GB, GROQ, E.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'));
    if (E.GEMINI_API_KEY) tries.push(async () => (await gem(E.GEMINI_VISION_MODEL || 'gemini-2.5-flash', { contents: [{ parts: [{ text: ask }, { inline_data: { mime_type: m[1], data: m[2] } }] }] })).candidates[0].content.parts.map(a => a.text || '').join(''));
    let text = '', err;
    for (const f of tries) { try { text = (await f()).trim(); if (text) break; } catch (e) { err = e; console.warn('vision try failed:', e.message); } }
    if (!text) throw err || Error('Görüntü analiz edilmədi');
    r.json({ text });
  } catch (e) { bad(r, e); }
});

// Speech to text: language is detected automatically by Whisper
app.post('/transcribe', up.single('audio'), async (q, r) => {
  try {
    if (!q.file) throw Error('Audio yoxdur');
    const g = !!GROQ, f = new FormData();
    f.append('file', new Blob([q.file.buffer], { type: q.file.mimetype || 'audio/webm' }), 'a.webm');
    f.append('temperature', '0'); f.append('prompt', 'Salam, necəsən? Merhaba, nasılsın? Hello, how are you? Привет, как дела? Olá, tudo bem?'); f.append('model', g ? (E.GROQ_STT_MODEL || 'whisper-large-v3') : 'whisper-1');
    const x = await fetch((g ? GB : CB) + '/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + (g ? GROQ : COMET) }, body: f });
    const j = await x.json();
    if (!x.ok) throw Error(j.error?.message || x.status);
    r.json({ text: (j.text || '').trim() });
  } catch (e) { bad(r, e); }
});

// Natural neural voices (Edge TTS); language is detected from the text itself
const V = { az: 'az-AZ-BabekNeural', tr: 'tr-TR-AhmetNeural', en: 'en-US-GuyNeural', ru: 'ru-RU-DmitryNeural', pt: 'pt-BR-AntonioNeural' };
const det = t => /[а-яё]/i.test(t) ? 'ru' : /ə/i.test(t) ? 'az' : /[ãõ]|\b(você|não|obrigad[oa])\b/i.test(t) ? 'pt' : /[ığşİ]/.test(t) ? 'tr' : 'en';
app.post('/tts', async (q, r) => {
  const t = String(q.body.text || '').slice(0, 2500);
  try {
    if (!COMET || E.TTS_ENGINE === 'edge') throw Error('edge');
    const x = await fetch(CB + '/audio/speech', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + COMET },
      body: JSON.stringify({ model: E.TTS_MODEL || 'gpt-4o-mini-tts', voice: E.TTS_VOICE || 'coral', input: t, response_format: 'mp3',
        instructions: 'Speak like a warm, relaxed, natural person, in the same language as the text. Natural pace and light emotion. Articulate every word clearly. Never robotic.' })
    });
    if (!x.ok) throw Error('speech ' + x.status);
    return r.type('audio/mpeg').send(Buffer.from(await x.arrayBuffer()));
  } catch (e) { console.warn('TTS fallback to Edge:', e.message); }
  try { const tts = new EdgeTTS(); await tts.synthesize(t, V[det(t)]); r.type('audio/mpeg').send(Buffer.from(tts.toBuffer())); }
  catch (e) { bad(r, e); }
});

app.post('/video', async (q, r) => {
  try {
    const f = new FormData();
    f.append('model', E.VIDEO_MODEL || 'wan3.0-prime'); f.append('prompt', q.body.prompt);
    f.append('seconds', String(q.body.seconds || 5)); f.append('size', '1280x720');
    const x = await fetch(CB + '/videos', { method: 'POST', headers: { Authorization: 'Bearer ' + COMET }, body: f });
    const j = await x.json();
    if (!x.ok) throw Error(j.error?.message || x.status);
    r.json({ id: j.id || j.task_id || j.data?.id });
  } catch (e) { bad(r, e); }
});
app.get('/video/:id', async (q, r) => {
  try {
    const x = await fetch(CB + '/videos/' + encodeURIComponent(q.params.id), { headers: { Authorization: 'Bearer ' + COMET } });
    const j = await x.json();
    if (!x.ok) throw Error(j.error?.message || x.status);
    const d = j.data && !Array.isArray(j.data) ? j.data : j, s = String(d.status || d.task_status || d.state || '').toLowerCase();
    const o = d.output || d.outputs || d.result, f = Array.isArray(o) ? o[0] : o;
    r.json({
      status: ['succeed', 'succeeded', 'success', 'completed', 'complete'].includes(s) ? 'completed' : ['failed', 'error', 'cancelled'].includes(s) ? 'failed' : 'processing',
      videoUrl: d.videoUrl || d.video_url || d.url || d.content_url || (typeof f === 'string' ? f : f?.url) || null,
      error: d.error?.message || d.error || null
    });
  } catch (e) { bad(r, e); }
});

// ---- Logo Studio: premium prompt builder + dedicated logo image provider ----
const CAT = {
  'Esports Gaming': 'professional esports team identity, aggressive mascot or iconic shield emblem, bold angular silhouette, competitive gaming brand language',
  'Clan Logo': 'premium gaming clan insignia, memorable heraldic crest, powerful symmetrical symbol, custom initials integrated into the emblem',
  'Company Logo': 'high-end corporate brand identity, distinctive geometric symbol and precise wordmark, timeless, balanced, scalable',
  'Minimalist Logo': 'minimal luxury identity, intelligent negative space, simple iconic geometry, exceptionally clean vector-like construction',
  'Mascot Logo': 'original expressive mascot character, powerful readable face and silhouette, polished sports-team illustration, confident personality',
  '3D Logo': 'premium dimensional brand emblem, sculpted metallic materials, controlled bevels, realistic studio lighting, crisp readable silhouette'
};
const STYLE_GUIDE = {
  'Flat vector': 'crisp flat vector artwork, clean geometric shapes, precise edges, limited color palette',
  'Gradient': 'premium controlled gradient transitions, subtle depth, clean polished graphic design',
  'Neon glow': 'restrained electric neon rim lighting, luminous cyan and violet accents, deep dark contrast',
  'Metallic chrome': 'brushed chrome and polished metal surfaces, tasteful reflections, premium dark studio finish',
  '3D render': 'high-end 3D emblem render, realistic materials, refined bevels, cinematic studio lighting',
  'Line art': 'precise custom linework, elegant contours, balanced negative space, minimal visual noise'
};
const LOGO_NEGATIVE = 'low resolution, blurry, pixelated, amateur clipart, generic stock icon, watermark, signature, mockup, business card, shirt, wall, storefront, extra objects, extra words, random letters, misspelled text, duplicate text, crowded composition, messy background, cropped emblem, deformed mascot, asymmetrical eyes, cheap plastic, oversaturated glow';
function buildLogoPrompt({ name, desc, category, style, colors }) {
  const palette = (Array.isArray(colors) ? colors : []).slice(0, 3).map(x => String(x).slice(0, 40)).join(', ') || 'designer-selected premium palette';
  const categoryGuide = CAT[category] || CAT['Esports Gaming'];
  const styleGuide = STYLE_GUIDE[style] || STYLE_GUIDE['Flat vector'];
  const details = String(desc || '').trim().slice(0, 500);
  const esports = category === 'Esports Gaming' || category === 'Clan Logo' || category === 'Mascot Logo';
  return [
    'Create one exceptionally polished, original, professional brand logo. This is the final logo artwork, NOT a presentation or mockup.',
    `EXACT BRAND NAME: "${name}". If text is included, reproduce this spelling exactly, once only. Do not invent any additional lettering, slogan, numbers, or symbols that resemble text.`,
    `CATEGORY AND ART DIRECTION: ${categoryGuide}.`,
    `RENDERING STYLE: ${styleGuide}.`,
    `COLOR PALETTE: ${palette}. Use these colors deliberately and consistently; do not introduce unrelated colors.`,
    details ? `CREATIVE BRIEF: ${details}.` : '',
    esports
      ? 'Design a memorable esports-grade identity with a bold instantly recognizable silhouette, expertly drawn mascot or emblem, sharp intentional shapes, strong facial expression if a character is used, professional sports branding polish, and excellent readability as a small gaming avatar.'
      : 'Design a distinctive brand mark with excellent visual hierarchy, balanced proportions, intelligent negative space, precise geometry, and timeless professional identity design.',
    'COMPOSITION: single centered logo, complete and fully visible, optically balanced, generous clear space around it. Keep the symbol and brand name visually integrated. Use a clean solid background with strong contrast; no scene or environment.',
    'QUALITY: art-director-level logo design, refined custom shapes, clean contours, crisp edges, sophisticated lighting only where appropriate, high detail without clutter, production-ready finish.',
    'The result must look like a premium custom-designed logo made by a top branding studio, not AI clipart.'
  ].filter(Boolean).join(' ');
}
const b64url = (buf, type) => `data:${type || 'image/png'};base64,${Buffer.from(buf).toString('base64')}`;
const IMG = {
  async comet(p) {
    if (!COMET) throw Error('COMETAPI_KEY missing');
    const j = await J(CB + '/images/generations', COMET, { model: E.IMAGE_MODEL || 'gpt-image-2', prompt: p, n: 1, size: '1024x1024' });
    const i = (Array.isArray(j.data) ? j.data[0] : j.data) || j, b = i.b64_json || i.base64;
    if (b) return `data:image/png;base64,${b}`;
    const u = i.url || i.image_url;
    if (!u) throw Error('The image API returned no image');
    const g = await fetch(u);
    if (!g.ok) throw Error('Could not fetch the generated image');
    return b64url(await g.arrayBuffer(), g.headers.get('content-type'));
  },
  async cloudflare(p, opts = {}) {
    if (!E.CF_ACCOUNT_ID || !E.CF_API_TOKEN) throw Error('CF_ACCOUNT_ID / CF_API_TOKEN missing');
    const model = opts.model || E.CF_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';
    const isPhoenix = model === '@cf/leonardo/phoenix-1.0';
    const body = {
      prompt: p.slice(0, 3500),
      width: 1024,
      height: 1024,
      guidance: isPhoenix ? 6 : 4,
      num_steps: isPhoenix ? 35 : 4,
      negative_prompt: LOGO_NEGATIVE
    };
    const x = await fetch(`https://api.cloudflare.com/client/v4/accounts/${E.CF_ACCOUNT_ID}/ai/run/${encodeURIComponent(model).replace('%40','@')}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + E.CF_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000)
    });
    const type = x.headers.get('content-type') || '';
    if (x.ok && type.startsWith('image/')) return b64url(await x.arrayBuffer(), type);
    const j = await x.json().catch(() => ({}));
    const b = j.result?.image || j.image;
    if (!x.ok || !b) throw Error(j.errors?.[0]?.message || j.messages?.[0]?.message || 'Cloudflare image generation failed (' + x.status + ')');
    return `data:image/jpeg;base64,${b}`;
  },
  async huggingface(p) {
    if (!E.HF_TOKEN) throw Error('HF_TOKEN missing');
    const x = await fetch(`https://router.huggingface.co/hf-inference/models/${E.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell'}`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + E.HF_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: p.slice(0, 1500) })
    });
    const type = x.headers.get('content-type') || '';
    if (!x.ok || !type.startsWith('image/')) throw Error('HuggingFace ' + x.status + ' ' + (await x.text()).slice(0, 120));
    return b64url(await x.arrayBuffer(), type);
  },
  async pollinations(p) {
    const u = `https://image.pollinations.ai/prompt/${encodeURIComponent(p.slice(0, 1000))}?width=1024&height=1024&model=${E.POLLINATIONS_MODEL || 'flux'}&nologo=true&private=true&seed=${Math.floor(Math.random() * 1e6)}`;
    for (let t = 0; t < 2; t++) {
      const x = await fetch(u, { signal: AbortSignal.timeout(90000) });
      if (x.status === 429 && !t) { await new Promise(r => setTimeout(r, 16000)); continue; }
      const type = x.headers.get('content-type') || '';
      if (!x.ok || !type.startsWith('image/')) throw Error('Pollinations ' + x.status);
      return b64url(await x.arrayBuffer(), type);
    }
  }
};
async function genImage(prompt) {
  const want = (E.IMAGE_PROVIDER || 'auto').toLowerCase();
  const order = want === 'auto' ? ['comet', 'cloudflare', 'huggingface', 'pollinations'] : [want];
  const errs = [];
  for (const k of order) {
    try { if (!IMG[k]) throw Error('unknown provider'); return await IMG[k](prompt); }
    catch (e) { errs.push(k + ': ' + e.message); console.warn('image provider failed:', k, e.message); }
  }
  throw Error(errs.join(' | '));
}
async function genLogoImage(prompt) {
  // Logo Studio defaults to Leonardo Phoenix. Pollinations is never silently selected.
  const provider = String(E.LOGO_IMAGE_PROVIDER || 'cloudflare').toLowerCase();
  if (provider === 'cloudflare') {
    return IMG.cloudflare(prompt, { model: E.CF_LOGO_MODEL || '@cf/leonardo/phoenix-1.0' });
  }
  if (!IMG[provider]) throw Error('Unknown LOGO_IMAGE_PROVIDER: ' + provider);
  return IMG[provider](prompt);
}
app.post('/logo', async (q, r) => {
  try {
    const { name, desc, category, style, colors, prompt: keep } = q.body || {};
    const n = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (!n) throw Error('Loqo üçün ad daxil edin');
    if (!CAT[category]) throw Error('Loqo kateqoriyası düzgün deyil');
    const prompt = typeof keep === 'string' && keep.length > 40
      ? keep.slice(0, 3500)
      : buildLogoPrompt({ name: n, desc, category, style, colors });
    const image = await genLogoImage(prompt);
    r.json({ image, prompt, provider: E.LOGO_IMAGE_PROVIDER || 'cloudflare', model: E.CF_LOGO_MODEL || '@cf/leonardo/phoenix-1.0' });
  } catch (e) { bad(r, e); }
});
app.listen(E.PORT || 3000, () => console.log('Nova AI is running'));
