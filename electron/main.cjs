const { app, BrowserWindow, ipcMain, safeStorage, session } = require('electron');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const keyFile = () => path.join(app.getPath('userData'), 'viwei-api-key.bin');
const youtubeKeyFile = () => path.join(app.getPath('userData'), 'viwei-youtube-key.bin');
let localServer;
let localOrigin;
const localPort = 41737;

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const root = path.resolve(__dirname, '..');
    localServer = http.createServer((request, response) => {
      try {
        const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
        const filePath = path.resolve(root, relativePath);
        if (!filePath.startsWith(root + path.sep)) { response.writeHead(403); response.end('Forbidden'); return; }
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jfif': 'image/jpeg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
        response.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); response.end(content);
      } catch { response.writeHead(404); response.end('Not found'); }
    });
    localServer.on('error', reject);
    localServer.listen(localPort, '127.0.0.1', () => { localOrigin = `http://127.0.0.1:${localPort}`; resolve(localOrigin); });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 780, minWidth: 900, minHeight: 620,
    backgroundColor: '#11131f',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadURL(`${localOrigin}/index.html`);
}

function configureYouTubeIdentity() {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.youtube.com/*', '*://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      details.requestHeaders.Referer = `${localOrigin}/`;
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

ipcMain.handle('settings:has-key', () => fs.existsSync(keyFile()));
ipcMain.handle('settings:save-key', (_event, value) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('API key is empty');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('作業系統未提供安全儲存功能');
  fs.mkdirSync(path.dirname(keyFile()), { recursive: true });
  fs.writeFileSync(keyFile(), safeStorage.encryptString(value.trim()));
  return true;
});
ipcMain.handle('settings:delete-key', () => {
  if (fs.existsSync(keyFile())) fs.unlinkSync(keyFile());
  return true;
});

ipcMain.handle('youtube:has-key', () => fs.existsSync(youtubeKeyFile()));
ipcMain.handle('youtube:save-key', (_event, value) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error('YouTube API 金鑰是空的');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('作業系統未提供安全儲存功能');
  fs.mkdirSync(path.dirname(youtubeKeyFile()), { recursive: true });
  fs.writeFileSync(youtubeKeyFile(), safeStorage.encryptString(value.trim()));
  return true;
});
ipcMain.handle('youtube:delete-key', () => {
  if (fs.existsSync(youtubeKeyFile())) fs.unlinkSync(youtubeKeyFile());
  return true;
});
ipcMain.handle('youtube:search', async (_event, query) => {
  if (!fs.existsSync(youtubeKeyFile())) throw new Error('請先在設定中儲存 YouTube Data API 金鑰');
  if (typeof query !== 'string' || !query.trim()) throw new Error('請輸入搜尋內容');
  const key = safeStorage.decryptString(fs.readFileSync(youtubeKeyFile()));
  const params = new URLSearchParams({ part: 'snippet', q: query.trim(), type: 'video', maxResults: '8', safeSearch: 'moderate', key });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `YouTube 搜尋失敗（${response.status}）`);
  return (data.items || []).map(item => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`
  }));
});

ipcMain.handle('chat:reply', async (_event, payload) => {
  if (!payload || !Array.isArray(payload.messages) || !payload.messages.length) throw new Error('訊息格式錯誤');
  if (!fs.existsSync(keyFile())) return { mode: 'local', text: '我還沒有連上 AI 服務喔。先到設定裡放入 API 金鑰，我就可以更完整地陪你聊天了。' };
  const key = safeStorage.decryptString(fs.readFileSync(keyFile()));
  const endpoint = process.env.VIWEI_AI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.VIWEI_AI_MODEL || 'gpt-6-luna';
  const memory = typeof payload.memory === 'string' ? payload.memory.trim() : '';
  const system = `你是 ViVi，是使用者熟悉的陪伴型 AI。請用繁體中文，自然、溫柔、會撒嬌，偶爾帶一點可愛的傲嬌語氣。請保持角色一致，不要宣稱自己是真人。${memory ? `\n\n以下是使用者提供的 ViVi 記憶，請在不違反安全與隱私的前提下延續：\n${memory}` : ''}`;
  const messages = [{ role: 'system', content: system }, ...payload.messages.filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string').slice(-30)];
  const requestBody = { model, messages };
  if (model === 'gpt-6-luna') requestBody.reasoning_effort = 'none'; else requestBody.temperature = 0.8;
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(requestBody) });
  if (!response.ok) throw new Error(`AI 服務回應 ${response.status}`);
  const data = await response.json();
  return { mode: 'remote', text: data.choices?.[0]?.message?.content || '我剛剛有點分心，再說一次好不好？' };
});

ipcMain.handle('image:generate', async (_event, payload) => {
  if (!fs.existsSync(keyFile())) throw new Error('請先在設定中儲存 OpenAI API 金鑰');
  const prompt = typeof payload === 'string' ? payload : payload?.prompt;
  const reference = typeof payload === 'object' && typeof payload.reference === 'string' && payload.reference.startsWith('data:image/') ? payload.reference : '';
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('請輸入想生成的圖片內容');
  const key = safeStorage.decryptString(fs.readFileSync(keyFile()));
  let response;
  if (reference) {
    const match = reference.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    if (!match) throw new Error('參考圖片格式不正確');
    const form = new FormData(); form.append('model', 'gpt-image-1'); form.append('prompt', prompt.trim()); form.append('size', '1024x1024'); form.append('quality', 'medium'); form.append('output_format', 'png'); form.append('image', new Blob([Buffer.from(match[2], 'base64')], { type: match[1] }), `reference.${match[1].split('/')[1]}`);
    response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } else response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt.trim(), size: '1024x1024', quality: 'medium', output_format: 'png' }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || `圖片生成服務回應 ${response.status}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('圖片服務沒有回傳圖片');
  return { mode: 'remote', mime: 'image/png', b64 };
});

app.whenReady().then(async () => { await startLocalServer(); configureYouTubeIdentity(); createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (localServer) localServer.close(); if (process.platform !== 'darwin') app.quit(); });
