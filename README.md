# 網頁標註插件

Chrome Manifest V3 擴充功能。選取網頁元素、寫註解，累積後一次複製成 Markdown。不需建置或安裝套件。

## 安裝

1. 開啟 Chrome 的 `chrome://extensions`。
2. 開啟「開發人員模式」，按「載入未封裝項目」。
3. 選擇本專案資料夾。
4. 重新載入要標註的網頁，點擴充功能「標註」，或按 `Alt+Shift+A`。

快捷鍵衝突時，可在 `chrome://extensions/shortcuts` 修改。

## 使用

移動游標可預覽藍框，點一下選取元素。輸入註解後按 Enter 或 ✓ 儲存；Shift+Enter 換行，Esc 取消。點編號可編輯或刪除。

底部工具列可拖曳。「暫停」可恢復網頁操作；「隱藏」切換標記；連按兩次「清除」刪除全部註解。「傳送」只複製 Markdown，成功後清空已複製的註解。複製失敗時保留內容。

關閉工具列會保留註解。同一分頁導頁或重新載入後，模式、註解和編號會恢復；只顯示目前完整 URL 的標記。各分頁獨立。資料存在 `chrome.storage.session`，結束瀏覽器工作階段、停用或重新載入擴充功能後會消失。

## 限制

- Chrome 系統頁、Chrome 線上應用程式商店等受保護頁面不允許內容腳本。
- 本機檔案與無痕頁面需要在擴充功能設定啟用對應存取權限。
- 不支援 iframe 內部及網站自己的 Shadow DOM 元素。
- 網站若改變 DOM、id 或 class，可能找不到原元素；此時以半透明標記顯示儲存位置。
- 不讀取 input、textarea、select 內容；包含它們的父元素也排除這些內容。註解由使用者自行輸入。
- 只處理游標點選。網站既有的捕獲階段處理器可能早於插件執行。
- 不包含截圖、繪圖、語音、對外傳送或跨瀏覽器同步。

## 驗證

執行 `node --test test/`。若環境沒有 Node.js，請先設定可用的 Node.js 路徑。

以 `python3 -m http.server 8830 --bind 127.0.0.1 --directory test` 啟動測試頁，再用 Chrome 開啟 `http://127.0.0.1:8830/harness.html`。測試頁用假的 Chrome API 執行真正的背景程式；sessionStorage 模擬同分頁的工作階段，複製結果顯示在頁面及 `window.__lastCopied`。勾選「模擬 Clipboard API 失敗」可驗證備援複製。驗證結束後停止伺服器。
