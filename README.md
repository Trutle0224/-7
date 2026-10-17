# 怕恰狗小窩 v1.7

這是從 v0.1 原型整理出的下一個可執行增量。它保留瀏覽器預覽模式，並提供 Electron 桌面版入口：聊天 UI、快速話題、新對話、清除對話、設定面板、安全 API 金鑰儲存/主程序代理，以及 YouTube 搜尋與迷你播放器。

## 目前狀態

本工作區找不到 `/mnt/data/薇薇聊天程式_Prototype_v0.1.zip` 或 `/mnt/data/viwei_chat_app/index.html`，因此本版本沒有覆寫未知的原始內容，也沒有臆造頭像資產。`assets/README.md` 說明了日後放入正式頭像的方式。

## 執行

1. 安裝 Node.js 18 或更新版本。
2. 在此資料夾執行 `npm install`。
3. 執行 `npm start` 開啟桌面版。
4. 也可以直接用瀏覽器開啟 `index.html`，但瀏覽器模式只提供 UI 預覽，不保存 API key。

## 打包 Windows 安裝檔

在專案根資料夾執行 `npm.cmd run dist`。Electron Builder 會輸出 Windows NSIS 安裝程式到 `dist/`；安裝後即可從桌面捷徑開啟怕恰狗小窩。

## AI 服務設定

桌面版設定面板會把 API key 交給 Electron 主程序，使用作業系統提供的加密儲存，不寫進前端、不提交到 Git。可用 `.env.example` 的 `VIWEI_AI_ENDPOINT` 與 `VIWEI_AI_MODEL` 調整端點/模型；真實金鑰不要放進 `.env`、原始碼或版控。

若要改用自有後端，將 `electron/main.cjs` 中的 `chat:reply` 改成呼叫你的伺服器，讓供應商金鑰只留在伺服器端。

## 手機／電腦同步

瀏覽器版可在設定中輸入同一組「同步代碼」，同步最近 100 則聊天訊息與 ViVi 記憶。同步代碼只以 SHA-256 雜湊保存，OpenAI API 金鑰不會同步。

部署到 Render 時，請建立 Render PostgreSQL 資料庫，並將其 Internal Database URL 設為環境變數 `DATABASE_URL`。若未設定資料庫，聊天仍可使用，但同步功能會顯示未設定資料庫。

操作方式：在電腦設定輸入 Render 網址與一組至少 10 字元的同步代碼，按「立即同步」；在 iPhone 輸入相同網址與代碼，按「載入雲端紀錄」。之後每次聊天後可再次按「立即同步」。

## 圖片生成

在聊天中直接說「幫我畫一張夜晚星空下的大耳狗」或「生成一張粉藍色雙魚座桌布」，ViVi 會使用 OpenAI `gpt-image-1` 生成 1024×1024 PNG。桌面版使用安全儲存的 OpenAI API Key；Render 網頁版使用伺服器端的 `OPENAI_API_KEY`。生成後可預覽、下載或加入相簿。圖片生成會另外消耗 API 額度。

生成前可點輸入框旁的 🖼️ 選擇 PNG、JPG 或 WebP 參考圖，再用對話描述要改成的畫面；參考圖限制 8MB，會送到圖片編輯 API 生成當次結果。

## YouTube 搜尋設定

YouTube 搜尋使用官方 YouTube Data API v3 的 `search.list`。請在 Google Cloud 建立專案、啟用 YouTube Data API v3，建立 API key，然後在桌面版「設定」中貼上並安全儲存。搜尋 API key 只交給 Electron 主程序保存與呼叫，不寫入前端原始碼。未設定 key 時，仍可使用貼網址播放功能。

## 變更摘要

- 新增 Electron `main/preload` 安全邊界與 context isolation。
- 新增安全保存、移除 API key 的設定流程。
- 新增 AI 回覆代理；沒有金鑰時提供清楚的本機模式提示。
- 新增可響應式 UI、聊天操作與快速話題。
- 使用者提供的薇薇頭像已套用至左上角、頂部與聊天訊息。
- 背景改為單張完整的高解析畫面 `assets/viwei-background-from-reference.svg`，不再切割平鋪；大耳狗直接使用使用者提供的透明參考素材，完整保留正確外輪廓。
- 介面加入粉彩聊天泡泡、淺藍頂欄、星座連線、星星、愛心與雲朵裝飾。
- 背景維持 7 個直接載入的正確大耳狗素材，並增加天空小元素。
- 背景增加至 10 個正確大耳狗元素，加入月亮、夜空星星與雙魚座星座連線。
- 左右側欄改為粉彩卡片風格，並加入更柔和的圓角與陰影。
- 新增 YouTube IFrame 迷你播放器：目前歌曲名稱、播放/暫停、上一首、下一首與循環播放。
- 新增 YouTube 關鍵字搜尋、縮圖結果與點選載入播放器；搜尋需設定 YouTube Data API v3 key。
- 新增 YouTube 播放進度條與目前時間/總長度顯示，可拖曳跳轉播放位置。
- 角色顯示名稱統一為 ViVi；AI 對話設定流程維持 Electron 安全儲存。
- 新增從電腦選取 MP4 音樂檔播放，支援自訂播放、暫停、音量、進度與循環控制。
- 新增 ViVi 記憶與對話歷史：設定中可貼上 ChatGPT 對話摘要，聊天時會保留最近 30 則訊息。
- 對話歷史改為自動保存在本機，重新開啟程式會自動恢復最近 100 則訊息；按「清除對話」可刪除本機紀錄。
- 聊天輸入框按 Enter 送出，Shift + Enter 換行。
- 固定應用程式高度，對話區獨立滾動並提供可拖曳捲軸，避免聊天變長時整個介面被往下推。
- 聊天輸入框調整為約 5–6 行文字高度，並保留內部滾動。
- 新增 iPhone Safari PWA 基礎與手機版介面；iPhone 可透過 Safari「加入主畫面」使用，未製作 Android 版本。
- 新增網頁版 Node 後端：`npm.cmd run web` 可在瀏覽器使用 AI 與 YouTube 搜尋；伺服器環境變數使用 `OPENAI_API_KEY`、`YOUTUBE_API_KEY`，不暴露在手機前端。

## iPhone 私人版下一步

把本資料夾部署到支援 Node.js 的 HTTPS 主機，設定 `OPENAI_API_KEY`、`YOUTUBE_API_KEY` 與 `PORT`，再用 iPhone Safari 開啟網址並選「分享 → 加入主畫面」。正式同步帳號與雲端聊天記錄仍需要再加入登入與資料庫。
- YouTube 私人帳號連接預留 OAuth 入口；正式啟用需要 Google Cloud OAuth Client ID，不在程式中保存帳號密碼。
