
const express = require('express');
const path = require('path');
const multer = require('multer');

const app = express();
const E = process.env;
const PORT = E.PORT || 3000;

app.disable('x-powered-by');

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// CORS
app.use((q, r, n) => {
  r.set({
    'Access-Control-Allow-Origin': E.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST,GET,OPTIONS'
  });

  q.method === 'OPTIONS' ? r.sendStatus(204) : n();
});

// FRONTEND
const send = f => (q, r) => r.sendFile(path.join(__dirname, f));

app.get('/', send('index.html'));

[
  'index.html',
  'style.css',
  'app.js',
  'logo.png',
  'logo-dark.png'
].forEach(f => app.get('/' + f, send(f)));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
});

// ======================================
// API CONFIGURATION
// ======================================

const GROQ_KEY = E.GROQ_API_KEY || '';
const COMET_KEY = E.COMETAPI_API_KEY || E.COMETAPI_KEY || '';
const GEMINI_KEY = E.GEMINI_API_KEY || '';
const RUNWAY_KEY = E.RUNWAY_API_KEY || '';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const COMET_BASE = 'https://api.cometapi.com';

const GROQ_MODEL = E.GROQ_MODEL || 'llama-3.3-70b-versatile';
const COMET_MODEL = E.COMET_MODEL || 'gpt-4o-mini';
const GEMINI_MODEL = E.GEMINI_MODEL || 'gemini-2.5-flash';

const IMAGE_MODEL = E.IMAGE_MODEL || 'gpt-image-2';
const GEMINI_IMAGE_MODEL = E.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

const VIDEO_MODEL = E.VIDEO_MODEL || 'wan3.0-prime';

const GROQ_STT_MODEL = E.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const COMET_STT_MODEL = E.COMETAPI_STT_MODEL || 'whisper-1';

const GROQ_VISION_MODEL = E.GROQ_VISION_MODEL ||
  'meta-llama/llama-4-scout-17b-16e-instruct';

const COMET_VISION_MODEL = E.COMETAPI_VISION_MODEL ||
  'deepseek-v4-flash-vision';

const RUNWAY_VERSION = '2024-11-06';
const REQUEST_TIMEOUT = 120000;

const SYS = `
You are Nova AI, a simple, helpful and professional assistant.
Reply in the language the user writes in.
Remember the previous conversation context.
Be clear, natural and helpful.
Never invent information.
`;

// Video task storage
const videoTasks = new Map();

// Upload configuration
const EDGE_VOICES = {
  az: 'az-AZ-BabekNeural',
  tr: 'tr-TR-AhmetNeural',
  en: 'en-US-GuyNeural',
  ru: 'ru-RU-DmitryNeural',
  de: 'de-DE-ConradNeural',
  fr: 'fr-FR-HenriNeural',
  es: 'es-ES-AlvaroNeural',
  it: 'it-IT-DiegoNeural',
  pt: 'pt-BR-AntonioNeural',
  ar: 'ar-SA-HamedNeural'
};

const GOOGLE_VOICES = {
  az: 'az-AZ',
  tr: 'tr-TR',
  ru: 'ru-RU',
  en: 'en-US',
  pt: 'pt-BR'
};

// ======================================
// GENERAL HELPERS
// ======================================

const bad = (r, e, status = 500) => {
  console.error(e);
  r.status(status).json({
    ok: false,
    error: String(e.message || e)
  });
};

function bearer(key, extra = {}) {
  return {
    Authorization: 'Bearer ' + key,
    ...extra
  };
}

function errorText(data, fallback = 'API sorğusu uğursuz oldu.') {
  return data?.error?.message ||
    data?.error?.detail ||
    data?.message ||
    data?.detail ||
    fallback;
}

async function requestJson(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const type = response.headers.get('content-type') || '';

    const data = type.includes('application/json')
      ? await response.json()
      : { raw: await response.text() };

    if (!response.ok) {
      throw new Error(
        errorText(data, `API xətası: ${response.status}`)
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function safeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(m =>
      m &&
      ['user', 'assistant'].includes(m.role) &&
      typeof m.content === 'string'
    )
    .slice(-40)
    .map(m => ({
      role: m.role,
      content: m.content.slice(0, 20000)
    }));
}

function extractText(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map(x => x.text || '').join('\n').trim();
  }

  return String(data?.output_text || '').trim();
}

// ======================================
// OPENAI COMPATIBLE API
// ======================================

async function openai(url, key, model, msgs) {
  if (!key) throw new Error('API açarı konfiqurasiya edilməyib.');

  const data = await requestJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYS },
        ...msgs
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  return extractText(data);
}

// ======================================
// GEMINI API
// ======================================

async function gemini(model, body) {
  if (!GEMINI_KEY) {
    throw new Error('GEMINI_API_KEY yoxdur.');
  }

  return requestJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_KEY
      },
      body: JSON.stringify(body)
    }
  );
}

function geminiText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();
}

async function geminiChat(messages) {
  const data = await gemini(GEMINI_MODEL, {
    systemInstruction: {
      parts: [{ text: SYS }]
    },
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))
  });

  return geminiText(data);
}

// ======================================
// AI PROVIDER SYSTEM
// ======================================

async function processChat(messages, requestedProvider) {
  const provider = String(
    requestedProvider || E.AI_PROVIDER || 'auto'
  ).toLowerCase();

  if (provider === 'gemini') {
    return {
      text: await geminiChat(messages),
      provider: 'gemini'
    };
  }

  if (provider === 'comet') {
    return {
      text: await openai(
        COMET_BASE + '/v1/chat/completions',
        COMET_KEY,
        COMET_MODEL,
        messages
      ),
      provider: 'comet'
    };
  }

  if (provider === 'groq') {
    return {
      text: await openai(
        GROQ_BASE + '/chat/completions',
        GROQ_KEY,
        GROQ_MODEL,
        messages
      ),
      provider: 'groq'
    };
  }

  // AUTO PROVIDER
  if (COMET_KEY) {
    try {
      return {
        text: await openai(
          COMET_BASE + '/v1/chat/completions',
          COMET_KEY,
          COMET_MODEL,
          messages
        ),
        provider: 'comet'
      };
    } catch (e) {
      console.warn('Comet fallback:', e.message);
    }
  }

  if (GROQ_KEY) {
    try {
      return {
        text: await openai(
          GROQ_BASE + '/chat/completions',
          GROQ_KEY,
          GROQ_MODEL,
          messages
        ),
        provider: 'groq'
      };
    } catch (e) {
      console.warn('Groq fallback:', e.message);
    }
  }

  if (GEMINI_KEY) {
    return {
      text: await geminiChat(messages),
      provider: 'gemini'
    };
  }

  throw new Error('Heç bir AI provayderi işlək deyil.');
}

// ======================================
// CHAT - ORIGINAL ENDPOINT
// ======================================

async function chatHandler(q, r) {
  try {
    const messages = safeMessages(q.body?.messages);

    if (!messages.length) {
      return bad(r, new Error('Mesaj boş ola bilməz.'), 400);
    }

    const result = await processChat(
      messages,
      q.body?.provider
    );

    if (!result.text) {
      throw new Error('AI boş cavab qaytardı.');
    }

    r.json({
      ok: true,
      text: result.text,
      answer: result.text,
      reply: result.text,
      provider: result.provider
    });
  } catch (e) {
    bad(r, e, 502);
  }
}

app.post('/chat', chatHandler);
app.post('/api/chat', chatHandler);

// ======================================
// IMAGE GENERATION - ORIGINAL GEMINI
// ======================================

app.post('/image', async (q, r) => {
  try {
    const history = Array.isArray(q.body?.history)
      ? q.body.history
      : [];

    const prompt = history
      .filter(x => x.role === 'user')
      .map(x => String(x.content || ''))
      .slice(-3)
      .join('\n') || String(q.body?.prompt || '');

    if (!prompt.trim()) {
      return bad(r, new Error('Şəkil təsviri yaz.'), 400);
    }

    const data = await gemini(GEMINI_IMAGE_MODEL, {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    });

    const part = (data?.candidates?.[0]?.content?.parts || [])
      .find(x => x.inlineData);

    if (!part) throw new Error('Şəkil gəlmədi.');

    const image =
      `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

    r.json({
      ok: true,
      image,
      url: image,
      provider: 'gemini'
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// GPT IMAGE GENERATION - COMET
// ======================================

app.post('/api/generate-image', async (q, r) => {
  try {
    if (!COMET_KEY) {
      return bad(r, new Error('COMETAPI_KEY yoxdur.'), 503);
    }

    const prompt = String(q.body?.prompt || '').trim();

    if (prompt.length < 3) {
      return bad(r, new Error('Şəkil təsviri yaz.'), 400);
    }

    const model = String(q.body?.model || IMAGE_MODEL);

    const payload = {
      model,
      prompt,
      n: 1,
      size: q.body?.size || '1024x1024'
    };

    if (q.body?.quality) {
      payload.quality = String(q.body.quality);
    }

    const data = await requestJson(
      COMET_BASE + '/v1/images/generations',
      {
        method: 'POST',
        headers: bearer(COMET_KEY, {
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(payload)
      },
      240000
    );

    const root = data?.data || data?.result || data;

    const item = Array.isArray(root)
      ? root[0]
      : root?.data?.[0] || root?.images?.[0] || root;

    const url =
      item?.url ||
      item?.image_url ||
      item?.imageUrl ||
      data?.url ||
      data?.image_url ||
      null;

    const base64 =
      item?.b64_json ||
      item?.base64 ||
      item?.image_base64 ||
      item?.b64 ||
      null;

    const image = base64
      ? `data:${item?.mime_type || 'image/png'};base64,${base64}`
      : null;

    if (!url && !image) {
      throw new Error('Şəkil nəticəsi qaytarılmadı.');
    }

    r.json({
      ok: true,
      url,
      imageUrl: url,
      image,
      model,
      provider: 'comet'
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// CAMERA / IMAGE VISION
// ======================================

app.post('/api/vision', async (q, r) => {
  try {
    const image = q.body?.image;

    const prompt = String(
      q.body?.prompt || 'Bu görüntünü təsvir et.'
    ).slice(0, 2500);

    if (
      typeof image !== 'string' ||
      !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image)
    ) {
      return bad(r, new Error('Şəkil formatı düzgün deyil.'), 400);
    }

    if (image.length > 11000000) {
      return bad(r, new Error('Şəkil çox böyükdür.'), 413);
    }

    const provider = COMET_KEY ? 'comet' : GROQ_KEY ? 'groq' : null;

    if (!provider) {
      return bad(r, new Error('Vision API açarı yoxdur.'), 503);
    }

    const key = provider === 'comet' ? COMET_KEY : GROQ_KEY;

    const model = provider === 'comet'
      ? COMET_VISION_MODEL
      : GROQ_VISION_MODEL;

    const url = provider === 'comet'
      ? COMET_BASE + '/v1/chat/completions'
      : GROQ_BASE + '/chat/completions';

    const data = await requestJson(url, {
      method: 'POST',
      headers: bearer(key, {
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }]
      })
    });

    const answer = extractText(data);

    if (!answer) throw new Error('Vision boş cavab qaytardı.');

    r.json({
      ok: true,
      answer,
      reply: answer,
      provider,
      model
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// VIDEO GENERATION - WAN
// ======================================

app.post('/api/videos', async (q, r) => {
  try {
    if (!COMET_KEY) {
      return bad(r, new Error('COMETAPI_KEY yoxdur.'), 503);
    }

    const prompt = String(q.body?.prompt || '').trim();
    const seconds = Number(q.body?.seconds || 5);
    const model = String(q.body?.model || VIDEO_MODEL);

    if (prompt.length < 3) {
      return bad(r, new Error('Video təsviri yaz.'), 400);
    }

    if (![5, 10, 15].includes(seconds)) {
      return bad(r, new Error('Müddət 5, 10 və ya 15 saniyə olmalıdır.'), 400);
    }

    const form = new FormData();

    form.append('model', model);
    form.append('prompt', prompt);
    form.append('seconds', String(seconds));
    form.append('size', String(q.body?.size || '1280x720'));

    const data = await requestJson(
      COMET_BASE + '/v1/videos',
      {
        method: 'POST',
        headers: bearer(COMET_KEY),
        body: form
      },
      240000
    );

    const id = data?.id || data?.task_id || data?.data?.id;

    const videoUrl =
      data?.videoUrl || data?.video_url || data?.url || null;

    if (id) {
      videoTasks.set(String(id), {
        id: String(id),
        provider: 'comet-video',
        createdAt: Date.now()
      });
    }

    r.json({
      ok: true,
      id: id ? String(id) : null,
      jobId: id ? String(id) : null,
      task_id: id ? String(id) : null,
      videoUrl,
      video_url: videoUrl,
      status: data?.status || (videoUrl ? 'completed' : 'processing'),
      data
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// RUNWAY VIDEO UPLOAD
// ======================================

async function uploadVideoToRunway(file) {
  if (RUNWAY_KEY) {
    const info = await requestJson(
      'https://api.dev.runwayml.com/v1/uploads',
      {
        method: 'POST',
        headers: bearer(RUNWAY_KEY, {
          'Content-Type': 'application/json',
          'X-Runway-Version': RUNWAY_VERSION
        }),
        body: JSON.stringify({
          filename: file.originalname || 'nova-video.mp4',
          type: 'ephemeral'
        })
      }
    );

    const uploadUrl = info.uploadUrl || info.upload_url;
    const fields = info.fields || {};
    const uri = info.runwayUri || info.uri;

    if (!uploadUrl || !uri) {
      throw new Error('Runway upload məlumatları natamamdır.');
    }

    const form = new FormData();

    Object.entries(fields).forEach(([key, value]) => {
      form.append(key, String(value));
    });

    form.append(
      'file',
      new Blob([file.buffer], {
        type: file.mimetype || 'video/mp4'
      }),
      file.originalname || 'nova-video.mp4'
    );

    const uploaded = await fetch(uploadUrl, {
      method: 'POST',
      body: form
    });

    if (!uploaded.ok) {
      throw new Error('Runway video upload xətası: ' + uploaded.status);
    }

    return uri;
  }

  if (!COMET_KEY) {
    throw new Error('RUNWAY_API_KEY və ya COMETAPI_KEY lazımdır.');
  }

  if (file.buffer.length > 5 * 1024 * 1024) {
    throw new Error('Comet data URI üçün video 5 MB-dan kiçik olmalıdır.');
  }

  return `data:${file.mimetype || 'video/mp4'};base64,${file.buffer.toString('base64')}`;
}

async function createRunwayTask(endpoint, body) {
  const direct = Boolean(RUNWAY_KEY);

  const base = direct
    ? 'https://api.dev.runwayml.com'
    : COMET_BASE + '/runwayml';

  const key = direct ? RUNWAY_KEY : COMET_KEY;

  return requestJson(base + endpoint, {
    method: 'POST',
    headers: bearer(key, {
      'Content-Type': 'application/json',
      'X-Runway-Version': RUNWAY_VERSION
    }),
    body: JSON.stringify(body)
  });
}

// ======================================
// VIDEO EDIT
// ======================================

app.post('/api/videos/edit', upload.single('video'), async (q, r) => {
  try {
    if (!q.file) {
      return bad(r, new Error('Video faylı seçilməyib.'), 400);
    }

    const promptText = String(q.body?.prompt || '').trim();

    if (promptText.length < 3) {
      return bad(r, new Error('Redaktə təsviri yaz.'), 400);
    }

    const videoUri = await uploadVideoToRunway(q.file);

    const model = RUNWAY_KEY
      ? 'gen4_aleph'
      : String(q.body?.model || 'gen4_aleph');

    const data = await createRunwayTask(
      '/v1/video_to_video',
      { model, videoUri, promptText }
    );

    const id = data?.id || data?.task_id;

    if (id) {
      videoTasks.set(String(id), {
        id: String(id),
        provider: RUNWAY_KEY ? 'runway' : 'comet-runway',
        createdAt: Date.now()
      });
    }

    r.json({
      ok: true,
      id: id ? String(id) : null,
      jobId: id ? String(id) : null,
      task_id: id ? String(id) : null,
      videoUrl: data?.videoUrl || data?.video_url || null,
      status: data?.status || 'processing',
      data
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// VIDEO UPSCALE
// ======================================

app.post('/api/videos/upscale', upload.single('video'), async (q, r) => {
  try {
    if (!q.file) {
      return bad(r, new Error('Video seçilməyib.'), 400);
    }

    const videoUri = await uploadVideoToRunway(q.file);

    const requested = String(q.body?.quality || '4k').toLowerCase();

    const resolution = {
      '720p': '720p',
      '1080p': '1k',
      '2k': '2k',
      '4k': '4k'
    }[requested] || '4k';

    const data = await createRunwayTask(
      '/v1/video_upscale',
      {
        model: 'upscale_v1',
        videoUri,
        resolution
      }
    );

    const id = data?.id || data?.task_id;

    if (id) {
      videoTasks.set(String(id), {
        id: String(id),
        provider: RUNWAY_KEY ? 'runway' : 'comet-runway',
        createdAt: Date.now()
      });
    }

    r.json({
      ok: true,
      id: id ? String(id) : null,
      jobId: id ? String(id) : null,
      task_id: id ? String(id) : null,
      videoUrl: data?.videoUrl || data?.video_url || null,
      status: data?.status || 'processing',
      data
    });
  } catch (e) {
    bad(r, e, 502);
  }
});

// ======================================
// VIDEO TASK STATUS
// ======================================

app.get('/api/videos/:id', async (q, r) => {
  try {
    const id = String(q.params.id);
    const task = videoTasks.get(id);

    if (!task) {
      return bad(
        r,
        new Error('Tapşırıq server yaddaşında tapılmadı.'),
        404
      );
    }

    let data;

    if (
      task.provider === 'runway' ||
      task.provider === 'comet-runway'
    ) {
      const direct = task.provider === 'runway';

      const base = direct
        ? 'https://api.dev.runwayml.com'
        : COMET_BASE + '/runwayml';

      const key = direct ? RUNWAY_KEY : COMET_KEY;

      data = await requestJson(
        base + '/v
