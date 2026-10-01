import { useCallback, useEffect, useState } from 'react'
import { isScreenKey, type ScreenKey } from './screens'

const DEFAULT_SCREEN: ScreenKey = 'home'

const readHash = (): ScreenKey => {
  const raw = decodeURIComponent((window.location.hash || '').slice(1))
  if (raw === 'agents') return 'chat'
  return isScreenKey(raw) ? raw : DEFAULT_SCREEN
}

/**
 * 해시 기반 라우팅.
 *
 * STEPD 에 붙일 때는 이 훅을 버리고 프로젝트가 쓰는 라우터
 * (react-router / next/navigation 등)로 갈아끼우면 됩니다.
 * 화면 컴포넌트는 라우터를 직접 모르고, App 에서만 씁니다.
 */
export function useHashRoute() {
  const [screen, setScreen] = useState<ScreenKey>(readHash)

  useEffect(() => {
    const onHashChange = () => setScreen(readHash())
    onHashChange()
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: ScreenKey) => {
    if (window.location.hash.slice(1) !== next) {
      window.history.replaceState(null, '', `#${next}`)
    }
    setScreen(next)
    window.scrollTo(0, 0)
  }, [])

  return { screen, navigate }
}
