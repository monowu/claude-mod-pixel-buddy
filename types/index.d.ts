export type Msg = { role: 'user' | 'buddy'; text: string }
export type Kind = 'claude' | 'slime' | 'robot' | 'ghost'

declare module 'claude-code' {
  interface PluginState {
    'pixel-buddy': { isBusy: boolean; chat: Msg[]; kind: Kind; round: number }
  }
}
