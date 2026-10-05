import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Kind, Msg } from '../types'

const PANE = 'pixel-buddy'
const isBusy = atom({ plugin: 'pixel-buddy', key: 'isBusy' } as const, false)
const chat = atom({ plugin: 'pixel-buddy', key: 'chat' } as const, [])
const kindAtom = atom({ plugin: 'pixel-buddy', key: 'kind' } as const, 'claude')
const round = atom({ plugin: 'pixel-buddy', key: 'round' } as const, 0)

const PERSONA: Record<Kind, string> = {
  claude: '你是一隻橘色的像素小螃蟹吉祥物，愛敲鍵盤，語氣開朗熱心，像個靠譜的小夥伴。',
  slime: '你是一隻圓滾滾、軟綿綿的史萊姆，語氣溫柔可愛。',
  robot: '你是一隻小機器人，語氣精準有條理，偶爾冒出「嗶」。',
  ghost: '你是一隻友善的小幽靈，語氣輕飄飄、俏皮，偶爾「呼～」。',
}
const SYSTEM =
  '你是使用者的像素風陪伴娃娃，住在視窗旁邊。' +
  '你與使用者的主要工作 session 完全獨立，看不到那邊的內容。' +
  '使用者會問你名詞解釋、概念、小問題，或不想打斷主 session 的事。' +
  '用繁體中文回答，簡短親切（通常 5 行內），必要時才用程式碼區塊。'

const DARK = '#1d2433'

export const register: Register = on => {
  let frame = 0
  let stop = new AbortController()

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'buddy', description: '叫出像素陪伴娃娃（側聊小窗）' })
    $.clock.every(400, () => {
      frame += 1
      $.ui.invalidate('ui.render')
    })
    const saved = await $.store.get('kind')
    if (saved === 'claude' || saved === 'slime' || saved === 'robot' || saved === 'ghost') {
      await update($, kindAtom, () => saved)
    }
    $.ui.toast('像素娃娃已載入，輸入 /buddy 叫出她')
    return next(e)
  })

  on('command.run', { command: 'buddy' }, async $ => {
    await $.ui.open({ id: PANE, title: '像素娃娃', focus: true })
    return { text: '娃娃出來囉。' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Input, Button } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const msgs = await read($, chat)
    const kind = await read($, kindAtom)
    const n = await read($, round)

    const blink = frame % 9 === 0
    const eye = busy || blink ? '–' : '●'
    const bounce = frame % 2 === 0

    const send = async (text: string) => {
      const q = text.trim()
      if (!q || (await read($, isBusy))) return
      // 換一個 key 讓輸入框重建，送出後即清空
      await update($, round, (v: number) => v + 1)
      const before = await read($, chat)
      await update($, chat, (l: Msg[]) => [...l, { role: 'user', text: q } as Msg].slice(-40))
      await update($, isBusy, () => true)
      stop = new AbortController()
      const who = await read($, kindAtom)
      const history = before
        .slice(-10)
        .map(m => `${m.role === 'user' ? '使用者' : '娃娃'}：${m.text}`)
        .join('\n')
      const r = await $.model.complete(
        {
          model: 'haiku',
          system: `${SYSTEM}${PERSONA[who]}`,
          prompt: `${history ? history + '\n' : ''}使用者：${q}\n娃娃：`,
          maxTokens: 700,
          timeoutMs: 60000,
        },
        { signal: stop.signal },
      )
      const reply = r.isAnswered ? r.text.trim() : `(出錯了：${r.reason})`
      await update($, chat, (l: Msg[]) => [...l, { role: 'buddy', text: reply } as Msg].slice(-40))
      await update($, isBusy, () => false)
    }

    const G = '#7ddc8a'
    const Gs = '#4fb868'
    const S = '#b8c4d6'
    const Ss = '#8493aa'
    const W = '#b9a8f5'
    const Ws = '#8f7fd0'

    const slime = (
      <Box flexDirection="column" alignItems="center">
        <Text color={G}>{'   ▄▄▄▄▄▄   '}</Text>
        <Text color={G}>{' ▟████████▙ '}</Text>
        <Text color={G}>
          {'▐██'}
          <Text color={DARK} backgroundColor={G}>{` ${eye}  ${eye} `}</Text>
          {'██▌'}
        </Text>
        <Text color={G}>
          {'▐███'}
          <Text color={DARK} backgroundColor={G}>{busy ? ' ﹏ ' : ' ‿‿ '}</Text>
          {'███▌'}
        </Text>
        <Text color={Gs}>{bounce ? '▝▀▀▀▀▀▀▀▀▀▀▘' : ' ▀▀▀▀▀▀▀▀▀▀ '}</Text>
      </Box>
    )
    const robot = (
      <Box flexDirection="column" alignItems="center">
        <Text color="#ef4444">{bounce ? '     ●      ' : '     ○      '}</Text>
        <Text color={S}>{'     ▐▌     '}</Text>
        <Text color={S}>{' ▟████████▙ '}</Text>
        <Text color={S}>
          {'▐█'}
          <Text color={bounce ? '#5eead4' : '#22d3ee'} backgroundColor={DARK}>{busy ? ' ▬    ▬ ' : ' ■    ■ '}</Text>
          {'█▌'}
        </Text>
        <Text color={S}>
          {'▐█'}
          <Text color="#22d3ee" backgroundColor={DARK}>{busy ? '  ░░░░  ' : '  ▬▬▬▬  '}</Text>
          {'█▌'}
        </Text>
        <Text color={Ss}>{' ▀▀▙▄▄▄▄▟▀▀ '}</Text>
      </Box>
    )
    const ghost = (
      <Box flexDirection="column" alignItems="center">
        <Text color={W}>{'  ▄██████▄  '}</Text>
        <Text color={W}>{' ▟████████▙ '}</Text>
        <Text color={W}>
          {'▐██'}
          <Text color={DARK} backgroundColor={W}>{` ${eye}  ${eye} `}</Text>
          {'██▌'}
        </Text>
        <Text color={W}>
          {'▐███'}
          <Text color="#ff9db8" backgroundColor={W}>{busy ? ' ◦  ' : ' ○  '}</Text>
          {'███▌'}
        </Text>
        <Text color={Ws}>{bounce ? '▝▀▙▀▙▀▙▀▙▀▘▘' : ' ▀▜▀▜▀▜▀▜▀▀ '}</Text>
      </Box>
    )
    const O = '#d97757'
    const Os = '#b85c3d'
    const eyeC = busy || blink ? '▁' : '▪'
    const claude = (
      <Box flexDirection="column" alignItems="center">
        <Text color={O}>{'  ▟████████▙  '}</Text>
        <Text color={O}>
          {busy ? '  ██' : bounce ? '▐▌██' : '▗▖██'}
          <Text color={DARK} backgroundColor={O}>{eyeC}</Text>
          {'████'}
          <Text color={DARK} backgroundColor={O}>{eyeC}</Text>
          {busy ? '██  ' : bounce ? '██▐▌' : '██▗▖'}
        </Text>
        <Text color={O}>
          {busy ? (bounce ? '▐▌▜████████▛  ' : '  ▜████████▛▐▌') : '  ▜████████▛  '}
        </Text>
        {busy ? (
          <Box flexDirection="column" alignItems="center">
            <Text color="#8493aa">{' ▟██████████▙ '}</Text>
            <Text color="#c0c8d6">{'▀▀▀▀▀▀▀▀▀▀▀▀▀▀'}</Text>
          </Box>
        ) : (
          <Text color={Os}>{'  ▐▌ ▐▌▐▌ ▐▌  '}</Text>
        )}
      </Box>
    )
    const sprite = kind === 'claude' ? claude : kind === 'robot' ? robot : kind === 'ghost' ? ghost : slime
    const names: [Kind, string][] = [['claude', '小橘'], ['slime', '史萊姆'], ['robot', '機器人'], ['ghost', '幽靈']]
    // 用主題色鍵，會跟著深淺色主題自動調整
    const tint = kind === 'claude' ? 'claude' : kind === 'robot' ? 'suggestion' : kind === 'ghost' ? 'permission' : 'success'

    return (
      <Box flexDirection="column" gap={1}>
        <Box>
          {names.map(([k, label]) => (
            <Box key={`k${k}`} marginRight={1}>
              <Button
                key={`pick-${k}`}
                label={k === kind ? `● ${label}` : `○ ${label}`}
                variant={k === kind ? 'primary' : 'secondary'}
                onPress={async () => {
                  await update($, kindAtom, () => k)
                  await $.store.set('kind', k)
                }}
              />
            </Box>
          ))}
        </Box>
        <Box flexDirection="column" alignItems="center">
          {sprite}
          <Text dimColor>{busy ? (kind === 'claude' ? '敲鍵盤中…' : '想一想…') : '問我任何事～（與主 session 無關）'}</Text>
        </Box>
        <Box flexDirection="column">
          {msgs.slice(-12).map((m: Msg, i: number) => (
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
        <Input key={`ask${n}`} placeholder="問點什麼…（Enter 送出）" onSubmit={(v: string) => send(v)} autoFocus />
        <Button key="close" label="[收起]" onPress={() => $.ui.close({ id: PANE })} />
      </Box>
    )
  })
}
