import { ACCOUNT } from './data'
import styles from './AccountSettingsPage.module.css'

/* 머리말에 이름·소속을 또 띄우면 바로 아래 표와 같은 말이라 제목만 둡니다 */

/** 계정 정보 화면 — 플러그인(설정) 화면과 분리된 별도 페이지입니다 */
export function AccountProfilePage() {
  return <div className={styles.page}>
    <div className={styles.pageHead}>
      <div><h1>계정 정보</h1><p>현재 사용 중인 계정의 기본 정보입니다.</p></div>
    </div>
    <section className={styles.profile} aria-label="계정 정보">
      <dl>
        <div><dt>이름</dt><dd>{ACCOUNT.name}</dd></div>
        <div><dt>소속</dt><dd>{ACCOUNT.organization}</dd></div>
        <div><dt>팀</dt><dd>{ACCOUNT.team}</dd></div>
        <div><dt>역할</dt><dd>{ACCOUNT.role}</dd></div>
      </dl>
    </section>
  </div>
}
