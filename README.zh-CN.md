[English](README.md) | [繁體中文](README.zh-TW.md) | 简体中文

# 网页标注插件

Chrome Manifest V3 扩展程序：选择网页元素、填写注释，累积后一次复制为 Markdown。

## 安装

1. 在 GitHub 点击 **Code → Download ZIP**，下载并解压；或克隆仓库：

   ```sh
   git clone https://github.com/Lotus-030226/web-labels.git
   ```

2. 在 Chrome 打开 `chrome://extensions`。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择包含 `manifest.json` 的文件夹。
5. 保留该文件夹的位置，Chrome 从这里加载扩展程序。
6. 重新加载已打开的标签页，再开始标注。

快捷键冲突时，可在 `chrome://extensions/shortcuts` 修改。

## 使用

1. 点击扩展程序的工具栏按钮，或按 `Alt+Shift+A` 开启标注。指针指向元素时显示蓝框。

   ![指针指向网页元素时显示蓝框](assets/screenshots/1-pick.png)

2. 点击元素，输入注释，再按 Enter 或 ✓ 保存。

   ![选择元素后输入注释](assets/screenshots/2-comment.png)

3. 编号标记留在点击位置。工具栏提供选择、隐藏、清除和发送功能。

   ![编号标记与标注工具栏](assets/screenshots/3-markers.png)

4. 点击“傳送”（发送），将全部注释复制为 Markdown，再粘贴到聊天或议题中。

   ![复制为 Markdown 的注释](assets/screenshots/4-markdown.png)

扩展程序的按钮目前使用繁体中文：

| 按钮原文 | 功能 |
| --- | --- |
| 選取中／已暫停 | 暂停或恢复元素选择；暂停时可以操作原网页。 |
| 隱藏／顯示 | 隐藏或显示标记。 |
| 清除 | 连续点击两次，删除全部注释。 |
| 傳送 | 将全部注释复制为 Markdown；成功后清空已复制的注释，失败时保留。 |
| × | 关闭工具栏，保留注释。 |

底部工具栏可以拖动。编辑注释时，Shift+Enter 换行，Esc 取消。点击编号可以编辑或删除注释。

同一标签页跳转或重新加载后，模式、注释和编号会恢复；只显示当前完整 URL 的标记。各标签页独立。
数据保存在 `chrome.storage.session`，结束浏览器会话、停用或重新加载扩展程序后会消失。

## 限制

- Chrome 系统页面、Chrome 应用商店等受保护页面不允许内容脚本。
- 本地文件与无痕页面需要在扩展程序设置中启用相应访问权限。
- 不支持 iframe 内部及网站自身的 Shadow DOM 元素。
- 网站改变 DOM、id 或 class 时，可能找不到原元素；此时用半透明标记显示保存的位置。
- 不读取 input、textarea、select 的内容；包含它们的父元素也排除这些内容。注释由用户自行输入。
- 只处理指针点击。网站现有的捕获阶段处理程序可能先于插件执行。
- 不包含截图、绘图、语音、对外发送或跨浏览器同步。

## 开发

无需构建或安装软件包。运行测试：

```sh
node --test tests/
```

如果环境没有 Node.js，请先设置可用的 Node.js 路径。

测试页面操作步骤：

1. 从项目根目录启动服务器：

   ```sh
   python3 -m http.server 8830 --bind 127.0.0.1 --directory .
   ```

2. 用 Chrome 打开 `http://127.0.0.1:8830/tests/content/harness.html`。
3. 在页面或 `window.__lastCopied` 查看复制结果。
4. 勾选“模擬 Clipboard API 失敗”（模拟 Clipboard API 失败），验证备用复制方式。
5. 验证结束后停止服务器。

测试页面用模拟的 Chrome API 运行真正的后台脚本；`sessionStorage` 模拟同一标签页的会话。
页面先注册的 capture 监听器仍可能先收到点击；扩展程序无法保证排在最前。

## 许可

[MIT](LICENSE)。Copyright (c) 2026 Lotus.
