const messages = document.querySelector('#messages');
const input = document.querySelector('#input');
const composer = document.querySelector('#composer');
const dialog = document.querySelector('#settingsDialog');
const desktop = window.viweiDesktop;
const webReply = async (messages, memory) => { const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, memory }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || `AI 服務回應 ${response.status}`); return data; };
const webImage = async (prompt, reference) => { const response = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, reference }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || `圖片服務回應 ${response.status}`); return data; };
const mobileStyles = document.createElement('link');
mobileStyles.rel = 'stylesheet';
mobileStyles.href = 'ios-mobile.css';
document.head.append(mobileStyles);
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = 'manifest.json';
document.head.append(manifestLink);
const appleIconLink = document.createElement('link');
appleIconLink.rel = 'apple-touch-icon';
appleIconLink.href = 'assets/app-icon.png';
document.head.append(appleIconLink);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(() => {});
const layoutStyle = document.createElement('style');
layoutStyle.textContent = '.app-shell{height:100vh;min-height:0;max-height:100vh;overflow:hidden}.sidebar,.info-panel{min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(91,144,170,.55) transparent}.chat-panel{height:100vh;min-height:0;overflow:hidden}.messages{min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(91,144,170,.75) rgba(255,255,255,.18)}.messages::-webkit-scrollbar,.sidebar::-webkit-scrollbar,.info-panel::-webkit-scrollbar{width:9px}.messages::-webkit-scrollbar-thumb,.sidebar::-webkit-scrollbar-thumb,.info-panel::-webkit-scrollbar-thumb{background:rgba(91,144,170,.62);border-radius:99px}.messages::-webkit-scrollbar-track,.sidebar::-webkit-scrollbar-track,.info-panel::-webkit-scrollbar-track{background:rgba(255,255,255,.12);border-radius:99px}.composer textarea{min-height:112px;max-height:150px;line-height:1.5;overflow-y:auto}';
document.head.append(layoutStyle);
const conversationStorageKey = 'viwi-conversation-history';
const conversation = JSON.parse(localStorage.getItem(conversationStorageKey) || '[]');
const memoryStorageKey = 'viwi-memory';
let viwiMemory = localStorage.getItem(memoryStorageKey) || '';
const syncCodeStorageKey = 'viwi-sync-code';
let syncCode = localStorage.getItem(syncCodeStorageKey) || '';
const syncServerStorageKey = 'viwi-sync-server-url';
let syncServerUrl = localStorage.getItem(syncServerStorageKey) || '';
let referenceImage = '';
document.querySelectorAll('.brand strong,.profile strong,.info-card h2').forEach(node => { node.textContent = 'ViVi'; });
document.querySelectorAll('img[alt*="薇薇"]').forEach(image => { image.alt = 'ViVi 頭像'; });
document.querySelector('#input').placeholder = '輸入你想對 ViVi 說的話…';
document.querySelector('#albumDialog h2').textContent = 'ViVi 相簿';
const memoryLabel = document.createElement('label');
memoryLabel.className = 'viwi-memory-setting';
memoryLabel.innerHTML = '<span>ViVi 記憶</span><textarea id="viwiMemory" rows="6" placeholder="貼上你想讓 ViVi 記住的角色設定、共同回憶或聊天摘要"></textarea><div class="memory-actions"><button id="saveViwiMemory" type="button">保存記憶</button><button id="clearViwiMemory" type="button">清除</button></div><small id="viwiMemoryNote"></small>';
document.querySelector('.setting-actions').before(memoryLabel);
document.querySelector('#viwiMemory').value = viwiMemory;
document.querySelector('#syncCode').value = syncCode;
document.querySelector('#syncServerUrl').value = syncServerUrl;
const memoryStyle = document.createElement('style');
memoryStyle.textContent = '.viwi-memory-setting{display:block;color:#c9c5d9;font-size:12px;margin-top:20px}.viwi-memory-setting textarea{display:block;width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid #3d3a59;background:#121321;color:white;outline:0;resize:vertical;font:inherit;font-size:12px}.memory-actions{display:flex;gap:7px;margin-top:8px}.memory-actions button{border:1px solid #9bc9d9;border-radius:8px;background:#dff4fb;color:#4e8095;padding:6px 9px;font-size:10px;cursor:pointer}.memory-actions button:last-child{background:transparent;color:#cdb7ef;border-color:#554b76}.viwi-memory-setting small{display:block;color:#8ed7b0;font-size:10px;margin-top:7px;min-height:14px}';
document.head.append(memoryStyle);
document.querySelector('#saveViwiMemory').addEventListener('click', () => { viwiMemory = document.querySelector('#viwiMemory').value.trim(); localStorage.setItem(memoryStorageKey, viwiMemory); document.querySelector('#viwiMemoryNote').textContent = 'ViVi 記憶已保存。'; queueSync(); });
document.querySelector('#clearViwiMemory').addEventListener('click', () => { viwiMemory = ''; localStorage.removeItem(memoryStorageKey); document.querySelector('#viwiMemory').value = ''; document.querySelector('#viwiMemoryNote').textContent = 'ViVi 記憶已清除。'; });
const albumDialog = document.querySelector('#albumDialog');
const albumItems = [
  { src: 'assets/viwei-avatar.jfif', title: 'ViVi 頭像' },
  { src: 'assets/cinnamoroll-reference.webp', title: '大耳狗' }
];

function renderAlbum() {
  const preview = document.querySelector('#albumPreview');
  const grid = document.querySelector('#albumGrid');
  preview.innerHTML = albumItems.map((item, index) => `<button class="album-item album-preview-item" data-src="${item.src}" aria-label="開啟${item.title}"><img src="${item.src}" alt="${item.title}"></button>`).join('');
  grid.innerHTML = albumItems.map((item, index) => `<div class="album-item-wrap"><button class="album-item album-view" data-src="${item.src}" aria-label="開啟${item.title}"><img src="${item.src}" alt="${item.title}"></button><button class="album-delete" data-index="${index}" title="刪除這張照片">刪除</button></div>`).join('');
  document.querySelectorAll('.album-view,.album-preview-item').forEach(item => item.addEventListener('click', () => window.open(item.dataset.src, '_blank')));
  document.querySelectorAll('.album-delete').forEach(button => button.addEventListener('click', () => { albumItems.splice(Number(button.dataset.index), 1); renderAlbum(); }));
}
window.viweiAlbum = { add(item) { if (item?.src) { albumItems.push(item); renderAlbum(); } }, items: albumItems };
renderAlbum();

function addMessage(text, who = 'viwei') {
  const row = document.createElement('div'); row.className = `message-row ${who}`;
  if (who === 'viwei') row.innerHTML = `<img class="avatar-photo small" src="assets/viwei-avatar.jfif" alt="薇薇頭像">`;
  const wrap = document.createElement('div');
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  const time = document.createElement('time'); time.textContent = '剛剛'; wrap.append(bubble, time); row.append(wrap); messages.append(row); messages.scrollTop = messages.scrollHeight;
}
function addGeneratedImage(data, prompt) {
  const src = `data:${data.mime || 'image/png'};base64,${data.b64}`;
  const row = document.createElement('div'); row.className = 'message-row viwei generated-image-row';
  row.innerHTML = '<img class="avatar-photo small" src="assets/viwei-avatar.jfif" alt="ViVi 頭像">';
  const wrap = document.createElement('div'); const bubble = document.createElement('div'); bubble.className = 'bubble generated-image-bubble';
  const image = document.createElement('img'); image.src = src; image.alt = prompt; image.className = 'generated-image';
  const actions = document.createElement('div'); actions.className = 'generated-image-actions';
  const saveButton = document.createElement('button'); saveButton.textContent = '加入相簿'; saveButton.addEventListener('click', () => { window.viweiAlbum.add({ src, title: prompt.slice(0, 30) || 'ViVi 生成圖片' }); saveButton.textContent = '已加入相簿'; saveButton.disabled = true; });
  const download = document.createElement('a'); download.textContent = '下載圖片'; download.href = src; download.download = 'vivi-generated-image.png'; actions.append(saveButton, download); bubble.append(image, actions); const time = document.createElement('time'); time.textContent = '剛剛'; wrap.append(bubble, time); row.append(wrap); messages.append(row); messages.scrollTop = messages.scrollHeight;
}
function wantsImage(text) {
  const request = /(?:幫我|請幫我|請|可以幫我|我要|我想要|我想|希望)\s*(?:生成|畫|繪製|製作|做)\s*(?:一張|一個|一幅)?/u;
  const explicit = /(?:生成|畫|繪製|製作|做)\s*(?:一張|一個|一幅)\s*(?:圖片|圖像|照片|插圖|桌布|頭像)?/u;
  const photoRequest = /(?:幫我拍一張照片|幫我拍照|拍一張照片|拍照|自拍|想看看你現在的樣子|讓我看看你|給我看看你|看看你現在|你的照片|你的自拍|你現在長什麼樣子)/u;
  return request.test(text) || explicit.test(text) || photoRequest.test(text);
}
function imagePrompt(text) {
  if (/(?:自拍|想看看你現在的樣子|讓我看看你|給我看看你|看看你現在|你的照片|你的自拍|你現在長什麼樣子)/u.test(text)) {
    return `請把這句話理解成 ViVi 的可愛角色自拍照需求：${text}。生成一張溫柔、自然、可愛的 ViVi 陪伴型 AI 角色自拍照，使用精緻高解析度插畫風格，不要生成真人或冒充真實人物。`;
  }
  return `請根據以下使用者描述生成圖片：${text}`;
}
async function generateImage(prompt) {
  addMessage('我正在幫你畫圖，請稍等一下喔。');
  try { const result = desktop ? await desktop.generateImage(imagePrompt(prompt.trim()), referenceImage) : await webImage(imagePrompt(prompt.trim()), referenceImage); addGeneratedImage(result, prompt.trim()); }
  catch (error) { addMessage(`圖片生成遇到一點問題：${error.message || '請稍後再試。'}`); }
}
document.querySelector('#referenceImage').addEventListener('change', event => { const file = event.target.files?.[0]; const status = document.querySelector('#referenceStatus'); if (!file) return; if (!file.type.startsWith('image/')) { status.textContent = '請選擇圖片檔案。'; event.target.value = ''; return; } if (file.size > 8 * 1024 * 1024) { status.textContent = '參考圖片請小於 8MB。'; event.target.value = ''; return; } const reader = new FileReader(); reader.onload = () => { referenceImage = String(reader.result || ''); status.textContent = `已選擇參考圖：${file.name}`; }; reader.readAsDataURL(file); });
function saveConversation() { localStorage.setItem(conversationStorageKey, JSON.stringify(conversation.slice(-100))); }
function setSyncNote(text, error = false) { const note = document.querySelector('#syncNote'); note.textContent = text; note.style.color = error ? '#e58f9d' : '#8ed7b0'; }
function readSyncCode() { syncCode = document.querySelector('#syncCode').value.trim(); if (syncCode) localStorage.setItem(syncCodeStorageKey, syncCode); else localStorage.removeItem(syncCodeStorageKey); return syncCode; }
function readSyncServerUrl() { syncServerUrl = document.querySelector('#syncServerUrl').value.trim().replace(/\/$/, ''); if (syncServerUrl) localStorage.setItem(syncServerStorageKey, syncServerUrl); else localStorage.removeItem(syncServerStorageKey); return syncServerUrl || location.origin; }
function syncPayload(code) { return { code, conversation: conversation.slice(-100), memory: viwiMemory }; }
async function saveSync() {
  const code = readSyncCode(); if (!code) return setSyncNote('請先輸入同步代碼。', true);
  setSyncNote('正在同步…');
  const response = await fetch(`${readSyncServerUrl()}/api/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(syncPayload(code)) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || `同步失敗（${response.status}）`); setSyncNote('已同步到雲端。');
}
let syncTimer;
function queueSync() { if (!syncCode || !syncServerUrl) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => saveSync().catch(() => {}), 1200); }
async function loadSync() {
  const code = readSyncCode(); if (!code) return setSyncNote('請先輸入同步代碼。', true);
  setSyncNote('正在載入…');
  const response = await fetch(`${readSyncServerUrl()}/api/sync?code=${encodeURIComponent(code)}`);
  const data = await response.json(); if (!response.ok) throw new Error(data.error || `載入失敗（${response.status}）`);
  if (Array.isArray(data.conversation) && data.conversation.length) { conversation.splice(0, conversation.length, ...data.conversation); saveConversation(); messages.innerHTML = '<div class="day">雲端紀錄</div>'; conversation.forEach(item => addMessage(item.content, item.role === 'user' ? 'user' : 'viwei')); }
  if (typeof data.memory === 'string') { viwiMemory = data.memory; localStorage.setItem(memoryStorageKey, viwiMemory); document.querySelector('#viwiMemory').value = viwiMemory; }
  setSyncNote(data.updated_at ? `已載入上次同步：${new Date(data.updated_at).toLocaleString()}` : '雲端目前還沒有紀錄。');
}
if (conversation.length) { messages.innerHTML = '<div class="day">繼續聊天</div>'; conversation.forEach(item => addMessage(item.content, item.role === 'user' ? 'user' : 'viwei')); }
async function send(text) {
  text = text.trim(); if (!text) return;
  addMessage(text, 'user'); input.value = ''; conversation.push({ role: 'user', content: text }); saveConversation();
  if (wantsImage(text)) { await generateImage(text); queueSync(); return; }
  try { const result = desktop ? await desktop.reply(conversation, viwiMemory) : await webReply(conversation, viwiMemory); conversation.push({ role: 'assistant', content: result.text }); saveConversation(); addMessage(result.text); queueSync(); }
  catch (error) { addMessage(`連線時遇到一點問題：${error.message || '請稍後再試。'}`); }
}
composer.addEventListener('submit', e => { e.preventDefault(); send(input.value); });
input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); composer.requestSubmit(); } });
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => { input.value = btn.dataset.prompt; input.focus(); }));
document.querySelector('#newChat').addEventListener('click', () => { conversation.length = 0; localStorage.removeItem(conversationStorageKey); messages.innerHTML = '<div class="day">新的對話</div>'; addMessage('好呀，新的聊天開始了。你想先從哪裡聊起？'); });
document.querySelector('#clearChat').addEventListener('click', () => { conversation.length = 0; localStorage.removeItem(conversationStorageKey); messages.innerHTML = '<div class="day">今天</div>'; addMessage('清乾淨了！我們重新開始吧。'); });
function openSettings() { dialog.showModal(); if (desktop) desktop.hasKey().then(has => { document.querySelector('#settingNote').textContent = has ? '目前已有安全儲存的金鑰。' : ''; }); }
document.querySelector('#settingsBtn').addEventListener('click', openSettings); document.querySelector('#openSettings').addEventListener('click', openSettings); document.querySelector('#mobileSettings').addEventListener('click', openSettings);
document.querySelector('#saveKey').addEventListener('click', async () => { const note = document.querySelector('#settingNote'); if (!desktop) { note.textContent = '瀏覽器預覽模式不會保存金鑰，請使用桌面版。'; return; } try { await desktop.saveKey(document.querySelector('#apiKey').value); note.textContent = '已安全儲存，之後的回覆會使用 AI 服務。'; } catch (e) { note.textContent = e.message; } });
document.querySelector('#removeKey').addEventListener('click', async () => { if (desktop) await desktop.deleteKey(); document.querySelector('#settingNote').textContent = '已移除金鑰。'; });
document.querySelector('#saveSync').addEventListener('click', () => saveSync().catch(error => setSyncNote(error.message, true)));
document.querySelector('#loadSync').addEventListener('click', () => loadSync().catch(error => setSyncNote(error.message, true)));
document.querySelector('#openAlbum').addEventListener('click', () => albumDialog.showModal());
document.querySelector('#closeAlbum').addEventListener('click', () => albumDialog.close());
