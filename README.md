# claude-mod-pixel-buddy

一個 Claude Code mod：像素風陪伴娃娃。在側邊開一個聊天小窗，讓你問跟主 session 無關的事（名詞解釋、概念、不想打斷主 session 的小問題）。支援桌面版（Code 分頁）與終端機。

## 功能

- `/buddy` 在側邊開出聊天 pane，開啟時輸入框自動聚焦，Enter 送出，送出後自動清空。
- **Sidecar 旁路小助手**：回答時會帶上主 session 目前的對話當背景（用 `$.model.fork`，唯讀、不寫回主 session），所以可以問「剛剛那個錯誤是什麼意思」這類跟主工作有關、但不想打斷主 session 的問題。小窗的問答不會出現在主 session，也不會干擾它。主 session 還沒有內容（或剛 `/clear`）時，會退回沒有背景的一般回答。
- **記得這個 session 的對話**：關掉小窗再打開，之前的對話都還在（最多 100 則）；`[清空對話]` 可以清掉。不跨 session：換新 session 就是全新的對話。
- 像素機器人有三種動作：閒晃（原地左右看、眨眼、天線閃）、思考（你打字時，旁邊冒出泡泡）、敲鍵盤（回答中，兩隻手輪流敲鍵盤）。
- 回覆文字使用主題色，會跟著深淺色主題調整。每則回覆下有 `[複製]` 按鈕。

## 安裝

```bash
git clone https://github.com/monowu/claude-mod-pixel-buddy.git
```

把資料夾加進 `~/.claude/settings.json` 的 `CLAUDE_CODE_PLUGIN_DIRS`（多個路徑用冒號分隔）：

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "/path/to/claude-mod-pixel-buddy"
  }
}
```

開新 session 後輸入 `/buddy`。也可以單次載入：`claude --plugin-dir /path/to/claude-mod-pixel-buddy`。

## 限制

- Claude Code 的 mod API 沒有浮層與拖曳事件，所以娃娃放在側邊 pane（可拖動 pane 寬度），不能自由拖曳。
- 回覆文字不能直接用滑鼠選取，請用 `[複製]` 按鈕。
- 對話只存在當次 session，不跨 session 保留。
- sidecar 每次回答都會把主 session 的內容送去模型（有快取時很便宜，快取失效或切換模型後會重新計費）。

## 結構

```
.claude-plugin/plugin.json   外掛資訊
hooks/hooks.json             指向 register.tsx
hooks/register.tsx           全部邏輯與像素畫
types/index.d.ts             $.state 型別
```
