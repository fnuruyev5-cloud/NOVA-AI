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
    const m = (q.body.messages || []).slice(-30), p = q.body.provider, sys = { role: 'system', content: SYS + (q.body.voice ? VOICE : '') };
    let text;
    if (p === 'gemini') {
      const x = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${E.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_API_KEY },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys.content }] }, contents: m.map(a => ({ role: a.role === 'assistant' ? 'model' : 'user', parts: [{ text: a.content }] })) })
      });
      const j = await x.json();
      if (!x.ok) throw Error(j.error?.message || x.status);
      text = j.candidates[0].content.parts.map(a => a.text || '').join('');
    } else if (p === 'comet') {
      text = txt(await J(CB + '/chat/completions', COMET, { model: E.COMET_MODEL || E.COMETAPI_MODEL || 'claude-haiku-5-5', messages: [sys, ...m] }));
    } else {
      text = txt(await J(GB + '/chat/completions', GROQ, { model: E.GROQ_MODEL || 'openai/gpt-oss-120b', messages: [sys, ...m] }));
    }
    if (!text) throw Error('Boş cavab');
    r.json({ text });
  } catch (e) { bad(r, e); }
});

app.post('/image', async (q, r) => {
  try {
    const h = (q.body.history || []).filter(x => x.role === 'user').map(x => x.content).slice(-3).join('\n') || q.body.prompt;
    const j = await J(CB + '/images/generations', COMET, { model: E.IMAGE_MODEL || 'gpt-image-2', prompt: h, n: 1, size: '1024x1024' });
    const i = (Array.isArray(j.data) ? j.data[0] : j.data) || j, b = i.b64_json || i.base64;
    const image = b ? `data:image/png;base64,${b}` : (i.url || i.image_url);
    if (!image) throw Error('Şəkil gəlmədi');
    r.json({ image });
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

app.listen(E.PORT || 3000, () => console.log('Nova AI is running'));
