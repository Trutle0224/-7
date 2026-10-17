const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');

const root = path.resolve(__dirname);
const port = Number(process.env.PORT || 8787);
const openaiKey = process.env.OPENAI_API_KEY || '';
const youtubeKey = process.env.YOUTUBE_API_KEY || '';
const model = process.env.VIWEI_AI_MODEL || 'gpt-6-luna';
const databaseUrl = process.env.DATABASE_URL || '';
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } }) : null;
let syncSchemaPromise;
function syncKey(value) { return crypto.createHash('sha256').update(String(value || '').trim()).digest('hex'); }
function ensureSyncSchema() {
  if (!pool) return Promise.resolve();
  if (!syncSchemaPromise) syncSchemaPromise = pool.query(`CREATE TABLE IF NOT EXISTS viwei_sync_profiles (sync_key TEXT PRIMARY KEY, conversation JSONB NOT NULL DEFAULT '[]'::jsonb, memory TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  return syncSchemaPromise;
}

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jfif': 'image/jpeg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
function json(response, status, data) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); response.end(JSON.stringify(data)); }
function body(request) { return new Promise((resolve, reject) => { let text = ''; request.on('data', chunk => { text += chunk; if (text.length > 12_000_000) request.destroy(); }); request.on('end', () => { try { resolve(JSON.parse(text || '{}')); } catch (error) { reject(error); } }); request.on('error', reject); }); }
async function handleApi(request, response, pathname, searchParams) {
  if (request.method !== 'POST' && !(pathname === '/api/sync' && request.method === 'GET')) return json(response, 405, { error: 'Method not allowed' });
  const payload = request.method === 'GET' ? { code: searchParams.get('code') || '' } : await body(request);
  if (pathname === '/api/chat') {
    if (!openaiKey) return json(response, 503, { error: '伺服器尚未設定 OPENAI_API_KEY' });
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const memory = typeof payload.memory === 'string' ? payload.memory.trim() : '';
    const system = `你是 ViVi，是使用者熟悉的陪伴型 AI。請用繁體中文，自然、溫柔、會撒嬌，偶爾帶一點可愛的傲嬌語氣。請保持角色一致，不要宣稱自己是真人。${memory ? `\n\n以下是使用者提供的 ViVi 記憶，請在不違反安全與隱私的前提下延續：\n${memory}` : ''}`;
    const requestBody = { model, messages: [{ role: 'system', content: system }, ...messages.filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-30)] };
    if (model === 'gpt-6-luna') requestBody.reasoning_effort = 'none'; else requestBody.temperature = 0.8;
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` }, body: JSON.stringify(requestBody) });
    const data = await upstream.json();
    if (!upstream.ok) return json(response, upstream.status, { error: data.error?.message || `AI 服務回應 ${upstream.status}` });
    return json(response, 200, { mode: 'remote', text: data.choices?.[0]?.message?.content || '我剛剛有點分心，再說一次好不好？' });
  }
  if (pathname === '/api/images') {
    if (!openaiKey) return json(response, 503, { error: '伺服器尚未設定 OPENAI_API_KEY' });
    const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
    if (!prompt) return json(response, 400, { error: '請輸入想生成的圖片內容' });
    const reference = typeof payload.reference === 'string' && payload.reference.startsWith('data:image/') ? payload.reference : '';
    let upstream;
    if (reference) {
      const match = reference.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (!match) return json(response, 400, { error: '參考圖片格式不正確' });
      const form = new FormData(); form.append('model', 'gpt-image-1'); form.append('prompt', prompt); form.append('size', '1024x1024'); form.append('quality', 'medium'); form.append('output_format', 'png'); form.append('image', new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }), `reference.${match[1].split('/')[1]}`);
      upstream = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${openaiKey}` }, body: form });
    } else upstream = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` }, body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', quality: 'medium', output_format: 'png' }) });
    const data = await upstream.json();
    if (!upstream.ok) return json(response, upstream.status, { error: data.error?.message || `圖片生成服務回應 ${upstream.status}` });
    const image = data.data?.[0]?.b64_json;
    if (!image) return json(response, 502, { error: '圖片服務沒有回傳圖片' });
    return json(response, 200, { mode: 'remote', mime: 'image/png', b64: image });
  }
  if (pathname === '/api/sync') {
    if (!pool) return json(response, 503, { error: '同步服務尚未設定資料庫，請在 Render 加入 DATABASE_URL' });
    const code = typeof payload.code === 'string' ? payload.code.trim() : '';
    if (!/^[A-Za-z0-9-]{10,80}$/.test(code)) return json(response, 400, { error: '同步代碼格式不正確' });
    await ensureSyncSchema();
    const key = syncKey(code);
    if (request.method === 'GET') {
      const result = await pool.query('SELECT conversation, memory, updated_at FROM viwei_sync_profiles WHERE sync_key = $1', [key]);
      return json(response, 200, result.rows[0] || { conversation: [], memory: '', updated_at: null });
    }
    const conversation = Array.isArray(payload.conversation) ? payload.conversation.filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-100) : [];
    const memory = typeof payload.memory === 'string' ? payload.memory.slice(0, 10000) : '';
    const result = await pool.query(`INSERT INTO viwei_sync_profiles (sync_key, conversation, memory, updated_at) VALUES ($1, $2::jsonb, $3, NOW()) ON CONFLICT (sync_key) DO UPDATE SET conversation = EXCLUDED.conversation, memory = EXCLUDED.memory, updated_at = NOW() RETURNING updated_at`, [key, JSON.stringify(conversation), memory]);
    return json(response, 200, { ok: true, updated_at: result.rows[0].updated_at });
  }
  if (pathname === '/api/youtube/search') {
    if (!youtubeKey) return json(response, 503, { error: '伺服器尚未設定 YOUTUBE_API_KEY' });
    const query = typeof payload.query === 'string' ? payload.query.trim() : '';
    if (!query) return json(response, 400, { error: '請輸入搜尋內容' });
    const params = new URLSearchParams({ part: 'snippet', q: query, type: 'video', maxResults: '8', safeSearch: 'moderate', key: youtubeKey });
    const upstream = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await upstream.json();
    if (!upstream.ok) return json(response, upstream.status, { error: data.error?.message || `YouTube 搜尋失敗（${upstream.status}）` });
    return json(response, 200, { items: (data.items || []).map(item => ({ videoId: item.id.videoId, title: item.snippet.title, channel: item.snippet.channelTitle, thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url })) });
  }
  return json(response, 404, { error: 'Not found' });
}
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }); return response.end(); }
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url.pathname, url.searchParams);
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(root + path.sep)) return response.end('Forbidden');
    const content = fs.readFileSync(filePath);
    response.writeHead(200, { 'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(content);
  } catch (error) { json(response, 404, { error: 'Not found' }); }
});
server.listen(port, '0.0.0.0', () => console.log(`怕恰狗小窩 web server listening on port ${port}`));
