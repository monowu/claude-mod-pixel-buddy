import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Msg } from '../types'

const PANE = 'sidebot'
const isBusy = atom({ plugin: 'sidebot', key: 'isBusy' } as const, false)
const chat = atom({ plugin: 'sidebot', key: 'chat' } as const, [])
const round = atom({ plugin: 'sidebot', key: 'round' } as const, 0)
const typingUntil = atom({ plugin: 'sidebot', key: 'typingUntil' } as const, 0)

const PERSONA =
  '你是住在旁邊小窗的像素小機器人，語氣精準有條理、親切，偶爾冒出「嗶」。' +
  '你是使用者主要工作 session 的旁路小助手（sidecar）：你看得到主 session 目前的內容，' +
  '但只負責回答問題，不要執行任何動作、不要呼叫工具，也不要假裝主 session 做了什麼。' +
  '使用者會問名詞解釋、概念，或不想打斷主 session 的小問題。' +
  '用繁體中文回答，簡短（通常 5 行內），必要時才用程式碼區塊。'

const DARK = '#1d2433'
const KEY = '#8493aa'
const SPAN = 12 // 娃娃所在區域的寬度（置中用）
const TYPING_MS = 1500 // 最後一次按鍵後，多久內還算「正在打字」


type Gaze = 'left' | 'center' | 'right'
const EYE_AT: Record<Gaze, number[]> = { left: [0, 3], center: [1, 4], right: [2, 5] }

export const register: Register = on => {
  let frame = 0
  
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'buddy', description: '叫出嗶嗶（Sidebot）旁路小助手小窗' })
    $.clock.every(400, () => {
      frame += 1
      $.ui.invalidate('ui.render')
    })
    // 新 session 一開始就把小窗開出來（不搶輸入焦點）；視窗太窄時會等到夠寬才顯示，/buddy 隨時可叫出
    void $.ui.open({ id: PANE, title: '嗶嗶' })
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async $ => {
    await $.ui.open({ id: PANE, title: '嗶嗶', focus: true })
    return { text: '娃娃出來囉。' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Input, Button } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const msgs = await read($, chat)
    const n = await read($, round)
    const until = await read($, typingUntil)
    const now = await $.clock.now()

    // 三種狀態：敲鍵盤（娃娃正在回答）、思考（使用者正在打字，娃娃在旁邊等）、閒晃
    const mode = busy ? 'type' : now < until ? 'think' : 'idle'
    const odd = frame % 2 === 1
    const blink = frame % 11 === 0

    // 閒晃：原地左右看（中、左、中、右，每 1.6 秒換一次）
    const pos = SPAN / 2
    const gaze: Gaze = mode === 'idle' ? (['center', 'left', 'center', 'right'] as const)[Math.floor(frame / 4) % 4] : 'center'

    // 眼睛字元：思考時往上看、打字時往下看
    const glyph = mode === 'think' ? '▀' : mode === 'type' ? '▄' : blink ? '▁' : '▪'
    const bubble = mode === 'think' ? ['·', '··', '···'][frame % 3] : ''

    const send = async (text: string) => {
      const q = text.trim()
      if (!q || (await read($, isBusy))) return
      // 換一個 key 讓輸入框重建，送出後即清空
      await update($, round, (v: number) => v + 1)
      await update($, typingUntil, () => 0)
      const before = await read($, chat)
      await update($, chat, (l: Msg[]) => [...l, { role: 'user', text: q } as Msg].slice(-100))
      await update($, isBusy, () => true)
      const history = before
        .slice(-20)
        .map(m => `${m.role === 'user' ? '使用者' : '小機器人'}：${m.text}`)
        .join('\n')
      // 旁路：複製主 session 目前的對話當背景（唯讀、不寫回主 session），
      // 再附上小窗自己的對話。小窗的問答不會出現在主 session。
      const prompt =
        `【旁路小窗】${PERSONA}\n` +
        '以下是你和使用者在小窗裡的對話紀錄，請只回答最後一個問題。\n' +
        `${history ? history + '\n' : ''}使用者：${q}\n小機器人：`
      let r = await $.model.fork({ prompt })
      let note = ''
      if (!r.isAnswered && r.reason === 'nothing-to-fork') {
        // 主 session 還沒有任何回覆（或剛 /clear）：改用沒有背景的一般回答
        note = '（主 session 還沒有內容，這次沒有背景）\n'
        r = await $.model.complete({
          model: 'haiku',
          system: PERSONA,
          prompt,
          maxTokens: 700,
          timeoutMs: 60000,
        })
      }
      const reply = r.isAnswered ? note + r.text.trim() : `(出錯了：${r.reason})`
      await update($, chat, (l: Msg[]) => [...l, { role: 'buddy', text: reply } as Msg].slice(-100))
      await update($, isBusy, () => false)
    }

    const S = '#b8c4d6'
    const Ss = '#8493aa'

    // 機器人（寬 10、高 3）
    const antenna = mode === 'think' ? (odd ? '#ef4444' : '#fecaca') : odd ? '#ef4444' : '#fca5a5'
    const screen = [0, 1, 2, 3, 4, 5].map(i => {
      const isEye = EYE_AT[gaze].includes(i)
      const g = mode === 'idle' && !isEye ? ' ' : isEye ? (glyph === '▪' ? '■' : glyph) : ' '
      return (
        <Text key={`s${i}`} color={odd && mode !== 'idle' ? '#5eead4' : '#22d3ee'} backgroundColor={DARK}>
          {g}
        </Text>
      )
    })
    const robotFeet =
      ' ▀▙▄▄▄▄▟▀ '
    const robot = (
      <Box flexDirection="column">
        <Text color={S}>
          {'  ▟██'}
          <Text color={antenna}>●</Text>
          {'█▙  '}
        </Text>
        <Text color={S}>
          {'▐█'}
          {screen}
          {'█▌'}
        </Text>
        {mode === 'type' ? (
          <Text>
            {odd ? <Text color={S}>▐▌</Text> : null}
            <Text color={KEY}>▄▄▄▄▄▄▄▄</Text>
            {odd ? null : <Text color={S}>▐▌</Text>}
          </Text>
        ) : (
          <Text color={Ss}>{robotFeet}</Text>
        )}
      </Box>
    )

    const sprite = robot
    // 用主題色鍵，會跟著深淺色主題自動調整
    const tint = 'suggestion'
    const caption = mode === 'type' ? '敲鍵盤回答中…' : mode === 'think' ? '嗯…我想想～' : '問我任何事～（我看得到主 session，但不會動它）'

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column" alignItems="center">
          <Box width={SPAN + 16}>
            <Box marginLeft={pos}>
              {sprite}
              <Box marginLeft={1}>
                <Text dimColor>{bubble}</Text>
              </Box>
            </Box>
          </Box>
          <Text dimColor>{caption}</Text>
        </Box>
        <Box flexDirection="column">
          {msgs.slice(-30).map((m: Msg, i: number) => (
            <Box key={`m${i}`} flexDirection="column">
              <Text color={m.role === 'user' ? undefined : tint} wrap="wrap">
                {m.role === 'user' ? '你：' : '娃：'}
                {m.text}
              </Text>
              {m.role === 'buddy' ? (
                <Button
                  key={`copy${i}`}
                  plain
                  label="[複製]"
                  onPress={async press => {
                    const r = await $.ui.copy({ text: m.text, surface: press.surface })
                    $.ui.toast(r.isCopied ? '已複製回覆' : '複製失敗')
                  }}
                />
              ) : null}
            </Box>
          ))}
        </Box>
        <Input
          key={`ask${n}`}
          placeholder="問點什麼…（Enter 送出）"
          onInput={async (v: string) => {
            const t = await $.clock.now()
            await update($, typingUntil, () => (v ? t + TYPING_MS : 0))
          }}
          onSubmit={(v: string) => send(v)}
          autoFocus
        />
        <Box>
          <Box marginRight={2}>
            <Button key="close" label="[收起]" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
          <Button key="clear" label="[清空對話]" onPress={() => update($, chat, () => [])} />
        </Box>
      </Box>
    )
  })
}
