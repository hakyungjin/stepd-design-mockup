import type { ScreenKey } from '@/app/screens'

export function NavIcon({ screen, size = 17 }: { screen: ScreenKey; size?: number }) {
  const paths: Partial<Record<ScreenKey, string>> = {
    chat: 'M4 4h16v12H9l-5 4V4Z',
    dashboard: 'M4 4h6v7H4V4Zm10 0h6v4h-6V4ZM4 15h6v5H4v-5Zm10-3h6v8h-6v-8Z',
    programs: 'M4 5h16v15H4V5Zm0 5h16M8 5V3m8 2V3',
    analysis: 'M4 19V5m0 14h16M8 15l4-5 4 2 4-7',
    media: 'M3 6h18v14H3V6ZM7 6V3h10v3m-7 5 5 3-5 3v-6Z',
    dist: 'M12 4v12m-4-8 4-4 4 4M5 14v6h14v-6',
    schedule: 'M4 5h16v15H4V5Zm0 5h16M8 5V3m8 2V3',
    performance: 'M4 19V5m0 14h16M8 15V9m5 6V5m5 10v-4',
    channels: 'M4 7h16v10H4V7ZM8 20h8M12 17v3m-2-9 4 2-4 2v-4Z',
    auto: 'M19 7a8 8 0 0 0-13-1L3 9m0-5v5h5m-3 8a8 8 0 0 0 13 1l3-3m0 5v-5h-5',
    commerce: 'M4 5h16l-2 12H6L4 5Zm0 0L3 2M8 21h.01M16 21h.01',
    search: 'M17 17l4 4M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[screen] ?? paths.media} /></svg>
}
