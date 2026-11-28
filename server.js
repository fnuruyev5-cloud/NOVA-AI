const express = require('express'), path = require('path');
const app = express(), E = process.env;
app.use(express.json({ limit: '1mb' }));
app.use((q, r, n) => {
  r.set({ 'Access-Control-Allow-Origin': E.ALLOWED_ORIGIN || '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' });
  q.method === 'OPTIONS' ? r.sendStatus(204) : n();
});

// Site files sit next to this file (no public/ folder needed)
const send = f => (q, r) => r.sendFile(path.join(__dirname, f));
app.get('/', send('index.html'));
['index.html', 'style.css', 'app.js', 'logo.png', 'logo-dark.png'].forEach(f => app.get('/' + f, send(f)));

const SYS = 'You are Nova AI, a simple, helpful assistant. Reply in the language the user writes in.';
const bad = (r, e) => { console.error(e); r.status(500).json({ error: String(e.message || e) }); };

async function openai(url, key, model, msgs) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({ model, messages: [{ role: 'system', content: SYS }, ...msgs] }) });
  const j = await r.json();
  if (!r.ok) throw Error(j.error?.message || r.status);
  return j.choices[0].message.content;
}
async function gemini(model, body) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GEMINI_API_KEY }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw Error(j.error?.message || r.status);
  return j;
}

app.post('/chat', async (q, r) => {
  try {
    const { provider, messages } = q.body, m = (messages || []).slice(-30);
    let text;
    if (provider === 'gemini') {
      const j = await gemini(E.GEMINI_MODEL || 'gemini-2.5-flash', {
        systemInstruction: { parts: [{ text: SYS }] },
        contents: m.map(x => ({ role: x.role === 'assistant' ? 'model' : 'user', parts: [{ text: x.content }] }))
      });
      text = j.candidates[0].content.parts.map(p => p.text || '').join('');
    } else if (provider === 'comet') {
      text = await openai('https://api.cometapi.com/v1/chat/completions', E.COMETAPI_API_KEY, E.COMET_MODEL || 'gpt-4o-mini', m);
    } else {
      text = await openai('https://api.groq.com/openai/v1/chat/completions', E.GROQ_API_KEY, E.GROQ_MODEL || 'llama-3.3-70b-versatile', m);
    }
    r.json({ text });
  } catch (e) { bad(r, e); }
});

app.post('/image', async (q, r) => {
  try {
    const h = (q.body.history || []).filter(x => x.role === 'user').map(x => x.content).slice(-3).join('\n') || q.body.prompt;
    const j = await gemini(E.IMAGE_MODEL || 'gemini-2.5-flash-image', { contents: [{ parts: [{ text: h }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } });
    const p = (j.candidates?.[0]?.content?.parts || []).find(x => x.inlineData);
    if (!p) throw Error('Şəkil gəlmədi');
    r.json({ image: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` });
  } catch (e) { bad(r, e); }
});

const V = { az: 'az-AZ', tr: 'tr-TR', ru: 'ru-RU', en: 'en-US', pt: 'pt-BR' };
app.post('/tts', async (q, r) => {
  try {
    const l = V[q.body.lang] || 'en-US';
    const x = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': E.GOOGLE_TTS_API_KEY || E.GEMINI_API_KEY },
      body: JSON.stringify({ input: { text: String(q.body.text).slice(0, 2000) }, voice: { languageCode: l, name: l + '-Chirp3-HD-Aoede' }, audioConfig: { audioEncoding: 'MP3' } })
    });
    const j = await x.json();
    if (!j.audioContent) throw Error(j.error?.message || 'tts');
    r.type('audio/mpeg').send(Buffer.from(j.audioContent, 'base64'));
  } catch (e) { bad(r, e); } // the page falls back to the browser voice on any error
});

app.listen(E.PORT || 3000, () => console.log('Nova AI is running'));
