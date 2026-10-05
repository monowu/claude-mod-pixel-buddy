export type Msg = { role: 'user' | 'buddy'; text: string }

declare module 'claude-code' {
  interface PluginState {
    'sidebot': { isBusy: boolean; chat: Msg[]; round: number; typingUntil: number }
  }
}
