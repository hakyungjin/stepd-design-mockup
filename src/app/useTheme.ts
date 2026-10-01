/*
 * 흑 · 화이트 톤 전환.
 * ------------------------------------------------------------------
 * 색은 전부 styles/tokens.css 의 변수로만 쓰고 있어서,
 * <html> 의 `dark` 클래스만 켜고 끄면 화면 전체가 같이 바뀝니다.
 *
 * STEPD 연동 시: 본 프로젝트에 테마 전환이 이미 있으면 이 파일은 버리고
 * 같은 방식으로 `dark` 클래스만 맞춰 주면 됩니다.
 */

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const KEY = 'stepd-theme'

const read = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem(KEY)
  if (saved === 'dark' || saved === 'light') return saved
  // 저장된 값이 없으면 index.html 이 켜 둔 상태를 그대로 따릅니다
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      window.localStorage.setItem(KEY, theme)
    } catch {
      /* 저장이 막혀 있어도 전환 자체는 동작합니다 */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  return { theme, setTheme, toggle }
}
