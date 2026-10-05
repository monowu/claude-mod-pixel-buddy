# claude-mod-pixel-buddy

一個 Claude Code mod：像素風陪伴娃娃。在側邊開一個聊天小窗，讓你問跟主 session 無關的事（名詞解釋、概念、不想打斷主 session 的小問題）。支援桌面版（Code 分頁）與終端機。

## 功能

- `/buddy` 在側邊開出聊天 pane，開啟時輸入框自動聚焦，Enter 送出，送出後自動清空。
- **獨立對話**：用 haiku 回答，只帶娃娃自己最近 10 則對話，看不到、也不影響主 session。
- **四個角色**，可在 pane 上方切換，選擇會跨 session 記住：

  | 角色 | 特色 |
  |---|---|
  | 小橘 | 橘色像素小吉祥物，回答時會對著筆電敲鍵盤；語氣開朗熱心 |
  | 史萊姆 | 綠色圓滾滾，會彈跳；語氣溫柔 |
  | 機器人 | 天線閃爍；語氣有條理，偶爾「嗶」 |
  | 幽靈 | 淡紫色，下擺飄動；語氣俏皮，偶爾「呼～」 |

- 回覆文字使用主題色（`claude` / `success` / `suggestion` / `permission`），會跟著深淺色主題調整。
- 每則回覆下有 `[複製]` 按鈕，複製完整回覆。

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
- 對話只存在當次 session，不會保留；只有選的角色會跨 session 記住。

## 結構

```
.claude-plugin/plugin.json   外掛資訊
hooks/hooks.json             指向 register.tsx
hooks/register.tsx           全部邏輯與像素畫
types/index.d.ts             $.state 型別
```
