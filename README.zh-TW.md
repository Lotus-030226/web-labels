[English](README.md) | 繁體中文 | [简体中文](README.zh-CN.md)

# 網頁標註插件

Chrome Manifest V3 擴充功能：選取網頁元素、寫註解，累積後一次複製成 Markdown。

## 安裝

1. 在 GitHub 按 **Code → Download ZIP**，下載並解壓縮；或複製儲存庫：

   ```sh
   git clone https://github.com/Lotus-030226/web-labels.git
   ```

2. 在 Chrome 開啟 `chrome://extensions`。
3. 開啟「開發人員模式」，按「載入未封裝項目」。
4. 選擇包含 `manifest.json` 的資料夾。
5. 保留該資料夾的位置，Chrome 會從這裡載入擴充功能。
6. 重新載入已開啟的分頁，再開始標註。

快捷鍵衝突時，可在 `chrome://extensions/shortcuts` 修改。

## 使用

1. 點擴充功能的工具列按鈕，或按 `Alt+Shift+A` 開啟標註。游標指向元素時會顯示藍框。

   ![游標指向網頁元素時顯示藍框](assets/screenshots/1-pick.png)

2. 點選元素，輸入註解，再按 Enter 或 ✓ 儲存。

   ![選取元素後輸入註解](assets/screenshots/2-comment.png)

3. 編號標記留在點選位置。工具列提供選取、隱藏、清除及傳送功能。

   ![編號標記與標註工具列](assets/screenshots/3-markers.png)

4. 按「傳送」將全部註解複製成 Markdown，再貼到對話或議題中。

   ![複製成 Markdown 的註解](assets/screenshots/4-markdown.png)

擴充功能的按鈕目前使用繁體中文：

| 按鈕 | 功能 |
| --- | --- |
| 選取中／已暫停 | 暫停或恢復元素選取；暫停時可操作原網頁。 |
| 隱藏／顯示 | 隱藏或顯示標記。 |
| 清除 | 連按兩次，刪除全部註解。 |
| 傳送 | 將全部註解複製成 Markdown；成功後清空已複製的註解，失敗則保留。 |
| × | 關閉工具列，保留註解。 |

底部工具列可拖曳。編輯註解時，Shift+Enter 換行，Esc 取消。點編號可編輯或刪除註解。

同一分頁導頁或重新載入後，模式、註解和編號會恢復；只顯示目前完整 URL 的標記。各分頁獨立。
資料存在 `chrome.storage.session`，結束瀏覽器工作階段、停用或重新載入擴充功能後會消失。

## 限制

- Chrome 系統頁、Chrome 線上應用程式商店等受保護頁面不允許內容腳本。
- 本機檔案與無痕頁面需要在擴充功能設定啟用對應存取權限。
- 不支援 iframe 內部及網站自己的 Shadow DOM 元素。
- 網站若改變 DOM、id 或 class，可能找不到原元素；此時以半透明標記顯示儲存位置。
- 不讀取 input、textarea、select 內容；包含它們的父元素也排除這些內容。註解由使用者自行輸入。
- 只處理游標點選。網站既有的捕獲階段處理器可能早於插件執行。
- 不包含截圖、繪圖、語音、對外傳送或跨瀏覽器同步。

## 授權

[MIT](LICENSE)。Copyright (c) 2026 Lotus.
