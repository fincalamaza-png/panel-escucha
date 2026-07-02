import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import Parser from 'rss-parser';

/* =========================================================================
   PANEL DE ESCUCHA — BACKEND
   Dos funciones:
   1) Rastrear noticias de prensa (Google News RSS) sobre los temas de cada
      marca, cada pocas horas, y dejarlas listas para la app.
   2) Hacer de intermediario seguro con la API de Claude para generar
      comentarios, guardando la clave solo en el servidor.

   NO publica nada en redes sociales. Eso lo hace la persona a mano.
   ========================================================================= */

const app = express();
app.use(express.json({ limit: '256kb' }));

// --- Servir las dos apps (HTML) desde el propio backend ---
app.get('/cerdos-y-rosas.html', (req, res) => res.sendFile('/app/cerdos-y-rosas.html'));
app.get('/don-fadrique.html', (req, res) => res.sendFile('/app/don-fadrique.html'));
app.get('/', (req, res) => res.sendFile('/app/cerdos-y-rosas.html'));

// --- CORS: permite que las apps hablen con este backend ---
// Pon en la variable de entorno ALLOWED_ORIGINS las URLs de tus apps,
// separadas por comas. Si no la pones, se permite cualquier origen.
const allowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowed.length ? allowed : true
}));

/* -------------------------------------------------------------------------
   TEMAS A RASTREAR POR CADA APP
   Se guardan en un archivo (topics.json) para que persistan y se puedan
   editar desde la app. Si el archivo no existe, se usan estos por defecto.
   ------------------------------------------------------------------------- */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const TOPICS_FILE = '/app/topics.json';
const DEFAULT_TOPICS = {
  cr: [
    'Cerdos y Rosas ibérico',
    'ibérico de bellota Salamanca',
    'jamón ibérico Salamanca',
    'embutido ibérico Guijuelo',
    'montanera dehesa ibérico',
    'Tierra de Sabor ibérico'
  ],
  df: [
    'restaurante Don Fadrique',
    'gastronomía Salamanca restaurante',
    'cocina Castilla y León restaurante',
    'nueva apertura restaurante Salamanca',
    'Guía Repsol Castilla y León',
    'crítica gastronómica Salamanca'
  ]
};

let TOPICS;
function loadTopics() {
  try {
    if (existsSync(TOPICS_FILE)) {
      TOPICS = JSON.parse(readFileSync(TOPICS_FILE, 'utf8'));
      if (!TOPICS.cr) TOPICS.cr = [];
      if (!TOPICS.df) TOPICS.df = [];
      return;
    }
  } catch (e) { console.error('[topics] error leyendo:', e.message); }
  TOPICS = JSON.parse(JSON.stringify(DEFAULT_TOPICS));
  saveTopics();
}
function saveTopics() {
  try { writeFileSync(TOPICS_FILE, JSON.stringify(TOPICS, null, 2)); }
  catch (e) { console.error('[topics] error guardando:', e.message); }
}
loadTopics();

/* -------------------------------------------------------------------------
   RASTREADOR DE NOTICIAS
   ------------------------------------------------------------------------- */
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'PanelEscucha/1.0' } });
const cache = { cr: [], df: [], updatedAt: { cr: null, df: null } };

function googleNewsUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=es&gl=ES&ceid=ES:es`;
}

function cleanText(s = '') {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchTopic(query) {
  try {
    const feed = await parser.parseURL(googleNewsUrl(query));
    return (feed.items || []).slice(0, 12).map(item => ({
      title: cleanText(item.title || ''),
      link: item.link || '',
      source: cleanText((item.source && item.source._) || item.creator || ''),
      date: item.isoDate || item.pubDate || null,
      query
    }));
  } catch (e) {
    console.error(`[news] fallo con "${query}":`, e.message);
    return [];
  }
}

async function refreshApp(appKey) {
  const topics = TOPICS[appKey] || [];
  const batches = await Promise.all(topics.map(fetchTopic));
  const flat = batches.flat();

  // Deduplicar por título normalizado
  const seen = new Set();
  const items = [];
  for (const it of flat) {
    const key = it.title.toLowerCase().slice(0, 80);
    if (!it.title || seen.has(key)) continue;
    seen.add(key);
    items.push(it);
  }
  // Ordenar por fecha, lo más reciente primero
  items.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  cache[appKey] = items.slice(0, 60);
  cache.updatedAt[appKey] = new Date().toISOString();
  console.log(`[news] ${appKey}: ${cache[appKey].length} noticias · ${cache.updatedAt[appKey]}`);
}

async function refreshAll() {
  await refreshApp('cr');
  await refreshApp('df');
}

// Rastrea al arrancar y luego cada 2 horas
refreshAll();
cron.schedule('0 */2 * * *', refreshAll);

/* -------------------------------------------------------------------------
   ENDPOINTS
   ------------------------------------------------------------------------- */

// Salud (para que Easypanel sepa que el servicio está vivo)
app.get('/health', (req, res) => res.json({ ok: true, updatedAt: cache.updatedAt }));

// Noticias: /api/news?app=cr  ó  /api/news?app=df
app.get('/api/news', (req, res) => {
  const appKey = (req.query.app === 'df') ? 'df' : 'cr';
  res.json({
    app: appKey,
    updatedAt: cache.updatedAt[appKey],
    items: cache[appKey]
  });
});

// Fuerza un refresco manual (útil para probar)
app.post('/api/refresh', async (req, res) => {
  await refreshAll();
  res.json({ ok: true, updatedAt: cache.updatedAt });
});

// --- Gestión de temas desde la app ---
// Listar temas: /api/topics?app=cr
app.get('/api/topics', (req, res) => {
  const appKey = (req.query.app === 'df') ? 'df' : 'cr';
  res.json({ app: appKey, topics: TOPICS[appKey] || [] });
});

// Añadir un tema: body { app, topic }
app.post('/api/topics/add', async (req, res) => {
  const appKey = (req.body.app === 'df') ? 'df' : 'cr';
  const topic = (req.body.topic || '').trim();
  if (!topic) return res.status(400).json({ error: 'Tema vacío.' });
  if (!TOPICS[appKey].includes(topic)) {
    TOPICS[appKey].push(topic);
    saveTopics();
    refreshApp(appKey); // recarga noticias con el tema nuevo (sin bloquear)
  }
  res.json({ ok: true, topics: TOPICS[appKey] });
});

// Borrar un tema: body { app, topic }
app.post('/api/topics/remove', (req, res) => {
  const appKey = (req.body.app === 'df') ? 'df' : 'cr';
  const topic = req.body.topic || '';
  TOPICS[appKey] = (TOPICS[appKey] || []).filter(t => t !== topic);
  saveTopics();
  res.json({ ok: true, topics: TOPICS[appKey] });
});

// Intermediario de la API (Groq) para generar comentarios
app.post('/api/generate', async (req, res) => {
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: 'Falta GROQ_API_KEY en el servidor.' });

  const { voiceBrief, who, post } = req.body || {};
  if (!post || !voiceBrief) return res.status(400).json({ error: 'Faltan datos (voiceBrief y post).' });

  const model = process.env.MODEL || 'llama-3.3-70b-versatile';

  const system = `Eres asesor de comunicación gastronómica. Redactas comentarios breves para redes sociales (Instagram/X) en español de España, en la voz indicada, para publicarlos en el post de OTRA cuenta.

VOZ ACTUAL: ${voiceBrief}

REGLAS INNEGOCIABLES:
- El comentario debe APORTAR: enseñar algo con conocimiento real, aportar un matiz, o hacer una buena pregunta que abra conversación.
- Prohibido vender, prohibido enlaces, prohibido pedir que reserven, sigan o compren. Nada promocional.
- Nada de peloteo vacío ("¡qué maravilla!", "top!"). Si no aporta, no vale.
- Natural, humano, 1-3 frases. Sin hashtags salvo que sea muy natural. Sin emojis o como mucho uno.
- Honesto: no inventes datos falsos ni afirmaciones no verificables.

Devuelve SOLO un array JSON válido, sin texto alrededor ni markdown, con exactamente 3 objetos: [{"comentario":"..."},{"comentario":"..."},{"comentario":"..."}]. Que los 3 sean distintos en enfoque.`;

  const user = `Post publicado por: ${who || '(no especificado)'}\n\nContenido del post:\n"""${post}"""\n\nGenera 3 propuestas de comentario en la voz indicada.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        temperature: 0.8,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    const data = await r.json();
    if (data.error) return res.status(502).json({ error: data.error.message || 'Error de la API' });

    let text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    let arr;
    try { arr = JSON.parse(text); }
    catch (e) { const m = text.match(/\[[\s\S]*\]/); arr = m ? JSON.parse(m[0]) : null; }
    if (!arr) return res.status(502).json({ error: 'Respuesta no interpretable.' });

    res.json({ suggestions: arr });
  } catch (e) {
    console.error('[generate]', e.message);
    res.status(502).json({ error: 'No se pudo contactar con la API.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Panel de escucha backend en puerto ${PORT}`));
