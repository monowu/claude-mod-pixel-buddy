export type Msg = { role: 'user' | 'buddy'; text: string }

declare module 'claude-code' {
  interface PluginState {
    'pixel-buddy': { isBusy: boolean; chat: Msg[]; round: number; typingUntil: number }
  }
}
