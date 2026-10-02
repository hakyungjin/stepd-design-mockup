/*
 * 에이전트 첫 화면 — 대화가 아직 없을 때.
 *
 * 인사 한 줄과 예시 문장만 둡니다. 워크스페이스 현황·예약 작업 현황은
 * 홈과 예약 작업 화면이 이미 보여 주고 있어서 여기서는 덜어 냈습니다.
 */

import { ACCOUNT } from '@/features/account-settings/data'
import { AGENT_SUGGESTIONS } from './data'
import styles from './AgentWelcome.module.css'

export function AgentWelcome({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className={styles.welcome}>
      <span className={styles.mark} aria-hidden>
        ✦
      </span>
      <p className={styles.hello}>{ACCOUNT.name}님, 안녕하세요</p>
      <h1 className={styles.title}>오늘은 무엇을 도와드릴까요?</h1>

      {/* 누르면 그대로 입력창에 들어갑니다 */}
      <div className={styles.suggestList}>
        {AGENT_SUGGESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.suggest}
            data-kind={item.id}
            aria-label={`“${item.prompt}” 입력창에 넣기`}
            onClick={() => onPrompt(item.prompt)}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.65"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {item.prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
