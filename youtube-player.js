let ytPlayer = null;
let ytReady = false;
let loopEnabled = false;
const desktopApi = window.viweiDesktop;
let localAudio = null;
let localObjectUrl = null;

const localMediaRow = document.createElement('div');
localMediaRow.className = 'local-media-row';
localMediaRow.innerHTML = '<button id="chooseMp4" type="button">🎵 選擇電腦 MP4</button><input id="mp4File" type="file" accept="audio/mp4,video/mp4,.mp4" hidden><span id="localMediaName">尚未選擇本機音樂</span>';
document.querySelector('.music-card').prepend(localMediaRow);
const localStyle = document.createElement('style');
localStyle.textContent = '.local-media-row{display:flex;align-items:center;gap:6px;margin-bottom:8px}.local-media-row button{border:1px solid #c5b5df;border-radius:8px;background:#f0e9fb;color:#78659a;padding:6px 8px;font-size:10px;cursor:pointer}.local-media-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7897a7;font-size:9px}.youtube-player-local{display:none}';
document.head.append(localStyle);
document.querySelector('#chooseMp4').addEventListener('click', () => document.querySelector('#mp4File').click());
document.querySelector('#mp4File').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
  localObjectUrl = URL.createObjectURL(file);
  localAudio?.remove();
  localAudio = document.createElement('audio');
  localAudio.src = localObjectUrl;
  localAudio.preload = 'metadata';
  localAudio.addEventListener('play', () => document.querySelector('#recordIcon').classList.add('is-playing'));
  localAudio.addEventListener('pause', () => document.querySelector('#recordIcon').classList.remove('is-playing'));
  localAudio.addEventListener('ended', () => { document.querySelector('#recordIcon').classList.remove('is-playing'); updateProgress(); });
  document.body.append(localAudio);
  document.querySelector('#youtubePlayer').classList.add('youtube-player-local');
  document.querySelector('#localMediaName').textContent = file.name;
  document.querySelector('#nowPlaying').textContent = `♫ ${file.name}`;
  ytPlayer?.pauseVideo();
  localAudio.volume = Number(document.querySelector('#youtubeVolume').value) / 100;
  localAudio.play().catch(() => { document.querySelector('#musicMessage').textContent = '本機音樂已載入，請按播放鍵開始。'; });
});

function stopLocalAudio() { if (localAudio) { localAudio.pause(); localAudio.remove(); localAudio = null; } if (localObjectUrl) { URL.revokeObjectURL(localObjectUrl); localObjectUrl = null; } document.querySelector('#youtubePlayer').classList.remove('youtube-player-local'); }

const searchPanel = document.createElement('div');
searchPanel.className = 'youtube-search-panel';
searchPanel.innerHTML = '<div class="youtube-search-title">🔎 搜尋 YouTube</div><div class="youtube-search-row"><input id="youtubeSearchQuery" type="search" placeholder="搜尋音樂或影片"><button id="youtubeSearchButton">搜尋</button></div><div id="youtubeSearchResults" class="youtube-search-results"></div>';
document.querySelector('.music-card').prepend(searchPanel);

const youtubeSetting = document.createElement('label');
youtubeSetting.className = 'youtube-api-setting';
youtubeSetting.innerHTML = '<span>YouTube Data API Key</span><input id="youtubeApiKey" type="password" placeholder="AIza…" autocomplete="off"><div class="youtube-api-actions"><button id="saveYoutubeKey" type="button">儲存搜尋金鑰</button><button id="removeYoutubeKey" type="button">移除</button></div><small id="youtubeKeyNote"></small>';
document.querySelector('.setting-actions').before(youtubeSetting);

const style = document.createElement('style');
style.textContent = '.youtube-search-panel{margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid rgba(128,177,198,.25)}.youtube-search-title{color:#476a7f;font-size:11px;margin-bottom:6px}.youtube-search-row{display:flex;gap:5px}.youtube-search-row input{min-width:0;flex:1;border:1px solid #b5d7e3;border-radius:8px;padding:7px;color:#496b80;background:rgba(255,255,255,.82);font-size:10px}.youtube-search-row button,.youtube-api-actions button{border:1px solid #9bc9d9;border-radius:8px;background:#dff4fb;color:#4e8095;padding:5px 8px;font-size:10px;cursor:pointer}.youtube-search-results{display:grid;gap:5px;margin-top:7px;max-height:180px;overflow:auto}.youtube-search-result{display:flex;gap:6px;width:100%;padding:4px;border:0;border-radius:8px;background:rgba(255,255,255,.5);color:#496b80;text-align:left;cursor:pointer}.youtube-search-result img{width:58px;height:34px;object-fit:cover;border-radius:5px}.youtube-search-result strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}.youtube-search-result small{display:block;color:#7897a7;font-size:8px;margin-top:3px}.youtube-api-setting{display:block;color:#c9c5d9;font-size:12px;margin-top:20px}.youtube-api-setting>span{display:block}.youtube-api-setting input{display:block;width:100%;margin-top:8px;padding:12px;border-radius:10px;border:1px solid #3d3a59;background:#121321;color:white;outline:0}.youtube-api-actions{display:flex;gap:7px;margin-top:8px}.youtube-api-actions button:last-child{background:transparent;color:#cdb7ef;border-color:#554b76}.youtube-api-setting small{display:block;color:#8ed7b0;font-size:10px;margin-top:7px;min-height:14px}';
document.head.append(style);

const volumeRow = document.createElement('label');
volumeRow.className = 'volume-row';
volumeRow.innerHTML = '<span>🔊 音量</span><input id="youtubeVolume" type="range" min="0" max="100" value="70"><output id="youtubeVolumeValue">70%</output>';
document.querySelector('.music-row').before(volumeRow);

const progressRow = document.createElement('label');
progressRow.className = 'progress-row';
progressRow.innerHTML = '<span>進度</span><input id="youtubeProgress" type="range" min="0" max="1000" value="0"><output id="youtubeTimeValue">00:00 / 00:00</output>';
document.querySelector('.music-row').before(progressRow);
const progressStyle = document.createElement('style');
progressStyle.textContent = '.progress-row{display:flex;align-items:center;gap:6px;margin:2px 0 8px;color:#63899a;font-size:9px}.progress-row input{min-width:0;flex:1;accent-color:#8fc9df;cursor:pointer}.progress-row output{width:72px;text-align:right;color:#6d91a1;font-size:9px}';
document.head.append(progressStyle);

function formatTime(seconds) { if (!Number.isFinite(seconds) || seconds < 0) return '00:00'; const minutes = Math.floor(seconds / 60); const rest = Math.floor(seconds % 60); return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`; }
function updateProgress() { const duration = localAudio?.duration || ytPlayer?.getDuration?.() || 0; const current = localAudio?.currentTime || ytPlayer?.getCurrentTime?.() || 0; const progress = document.querySelector('#youtubeProgress'); if (duration > 0 && !progress.matches(':active')) progress.value = Math.round((current / duration) * 1000); document.querySelector('#youtubeTimeValue').textContent = `${formatTime(current)} / ${formatTime(duration)}`; }
setInterval(updateProgress, 500);

function parseYouTube(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (!['youtube.com', 'youtu.be', 'music.youtube.com'].includes(host)) return { videoId: null, playlistId: null };
    const videoId = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : (url.searchParams.get('v') || url.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1]);
    return { videoId: videoId?.match(/^[\w-]{11}$/) ? videoId : null, playlistId: url.searchParams.get('list') || null };
  } catch {
    return { videoId: null, playlistId: null };
  }
}
function updateNowPlaying() {
  if (!ytPlayer || !ytPlayer.getVideoData) return;
  const title = ytPlayer.getVideoData().title;
  if (title) document.querySelector('#nowPlaying').textContent = `♫ ${title}`;
}
function onYouTubeIframeAPIReady() {
  ytPlayer = new YT.Player('youtubePlayer', { width: '260', height: '146', playerVars: { playsinline: 1, controls: 0, rel: 0, origin: window.location.origin, widget_referrer: window.location.origin }, events: { onReady: () => { ytReady = true; ytPlayer.setVolume(Number(document.querySelector('#youtubeVolume').value)); }, onError: event => { const messages = { 2: 'YouTube 網址或影片 ID 無效。', 5: '這支影片目前無法使用 HTML5 播放。', 100: '找不到這支影片，可能已刪除或設為私人。', 101: '影片擁有者禁止嵌入播放。', 150: '影片擁有者禁止嵌入播放。', 153: '播放器沒有收到 YouTube 要求的來源資訊。' }; document.querySelector('#musicMessage').textContent = `${messages[event.data] || `YouTube 播放錯誤（${event.data}）`} 可改用瀏覽器觀看。`; document.querySelector('#recordIcon').classList.remove('is-playing'); } , onStateChange: event => { document.querySelector('#recordIcon').classList.toggle('is-playing', event.data === YT.PlayerState.PLAYING); if (event.data === YT.PlayerState.PLAYING) updateNowPlaying(); } } });
}
function directEmbed(parsed) {
  const holder = document.querySelector('#youtubePlayer');
  const frame = document.createElement('iframe');
  const origin = encodeURIComponent(window.location.origin);
  const referrer = encodeURIComponent(window.location.origin);
  const src = parsed.playlistId ? `https://www.youtube.com/embed/videoseries?list=${parsed.playlistId}&autoplay=1&controls=1&origin=${origin}&widget_referrer=${referrer}` : `https://www.youtube.com/embed/${parsed.videoId}?autoplay=1&controls=1&origin=${origin}&widget_referrer=${referrer}`;
  frame.src = src; frame.referrerPolicy = 'strict-origin-when-cross-origin'; frame.title = 'YouTube 音樂播放器'; frame.allow = 'autoplay; encrypted-media; picture-in-picture'; frame.allowFullscreen = true; frame.style.width = '100%'; frame.style.height = '100%'; frame.style.border = '0'; holder.replaceChildren(frame);
  document.querySelector('#recordIcon').classList.add('is-playing');
  document.querySelector('#nowPlaying').textContent = '♫ YouTube 播放中';
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
const ytApi = document.createElement('script'); ytApi.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(ytApi);

document.querySelector('#playYoutube').addEventListener('click', () => {
  stopLocalAudio();
  const parsed = parseYouTube(document.querySelector('#youtubeUrl').value.trim());
  const message = document.querySelector('#musicMessage');
  if (!parsed.videoId && !parsed.playlistId) { message.textContent = '請貼上有效的 YouTube 影片或公開播放清單連結。'; return; }
  if (!ytReady || !ytPlayer) { directEmbed(parsed); message.textContent = '已使用直接播放模式載入；若要使用上一首/下一首控制，請等待 YouTube API 載入。'; return; }
  if (parsed.playlistId) ytPlayer.loadPlaylist({ list: parsed.playlistId, listType: 'playlist', index: 0 }); else ytPlayer.loadVideoById(parsed.videoId);
  message.textContent = '已載入 YouTube 播放內容';
});
document.querySelector('#toggleYoutube').addEventListener('click', () => { if (localAudio) { if (localAudio.paused) localAudio.play(); else localAudio.pause(); return; } if (!ytPlayer) return; const state = ytPlayer.getPlayerState(); if (state === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo(); });
document.querySelector('#prevYoutube').addEventListener('click', () => { if (localAudio) { document.querySelector('#musicMessage').textContent = '本機單曲沒有上一首；請選擇另一個 MP4。'; return; } ytPlayer?.previousVideo(); });
document.querySelector('#nextYoutube').addEventListener('click', () => { if (localAudio) { document.querySelector('#musicMessage').textContent = '本機單曲沒有下一首；請選擇另一個 MP4。'; return; } ytPlayer?.nextVideo(); });
document.querySelector('#loopYoutube').addEventListener('click', event => { loopEnabled = !loopEnabled; if (localAudio) localAudio.loop = loopEnabled; else ytPlayer?.setLoop(loopEnabled); event.currentTarget.classList.toggle('active', loopEnabled); });
document.querySelector('#youtubeVolume').addEventListener('input', event => { const value = Number(event.currentTarget.value); document.querySelector('#youtubeVolumeValue').textContent = `${value}%`; if (localAudio) localAudio.volume = value / 100; else ytPlayer?.setVolume(value); });
document.querySelector('#youtubeProgress').addEventListener('input', event => { const value = Number(event.currentTarget.value) / 1000; if (localAudio?.duration) localAudio.currentTime = value * localAudio.duration; else if (ytPlayer?.getDuration) { const duration = ytPlayer.getDuration(); if (duration > 0) ytPlayer.seekTo(value * duration, true); } updateProgress(); });
document.querySelector('#youtubeSearchButton').addEventListener('click', async () => {
  const query = document.querySelector('#youtubeSearchQuery').value.trim();
  const results = document.querySelector('#youtubeSearchResults');
  if (!desktopApi?.searchYoutube) { results.textContent = '請使用 Electron 桌面版，並先設定 YouTube API 金鑰。'; return; }
  results.textContent = '搜尋中…';
  try {
    const items = desktopApi?.searchYoutube ? await desktopApi.searchYoutube(query) : (await fetch('/api/youtube/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || `YouTube 搜尋失敗（${response.status}）`); return data.items; }));
    results.innerHTML = items.length ? items.map(item => `<button class="youtube-search-result" data-video-id="${item.videoId}" title="${item.title.replaceAll('"', '&quot;')}"><img src="${item.thumbnail}" alt=""><span><strong>${item.title}</strong><small>${item.channel}</small></span></button>`).join('') : '找不到相關影片。';
    results.querySelectorAll('[data-video-id]').forEach(button => button.addEventListener('click', () => { document.querySelector('#youtubeUrl').value = `https://www.youtube.com/watch?v=${button.dataset.videoId}`; document.querySelector('#playYoutube').click(); }));
  } catch (error) { results.textContent = error.message || '搜尋失敗，請稍後再試。'; }
});
document.querySelector('#saveYoutubeKey').addEventListener('click', async () => { const note = document.querySelector('#youtubeKeyNote'); if (!desktopApi?.saveYoutubeKey) { note.textContent = '請使用 Electron 桌面版。'; return; } try { await desktopApi.saveYoutubeKey(document.querySelector('#youtubeApiKey').value); note.textContent = 'YouTube 搜尋金鑰已安全儲存。'; } catch (error) { note.textContent = error.message; } });
document.querySelector('#removeYoutubeKey').addEventListener('click', async () => { if (desktopApi?.deleteYoutubeKey) await desktopApi.deleteYoutubeKey(); document.querySelector('#youtubeKeyNote').textContent = 'YouTube 搜尋金鑰已移除。'; });
document.querySelector('#connectYoutube').addEventListener('click', () => { document.querySelector('#musicMessage').textContent = '需要先在 Google Cloud 建立 OAuth Client ID，才能安全連接私人 YouTube 帳號。'; });
