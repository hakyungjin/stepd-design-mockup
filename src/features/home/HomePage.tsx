import type { ScreenKey } from '@/app/screens'
import { ACCOUNT } from '@/features/account-settings/data'
import { NavIcon } from '@/components/ui/NavIcon'
import styles from './HomePage.module.css'

export function HomePage({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  const shortcuts: { screen: ScreenKey; title: string; note: string }[] = [
    { screen: 'programs', title: '프로그램', note: '회차와 원본 영상' },
    { screen: 'media', title: '미디어', note: '제작한 영상 모아보기' },
    { screen: 'auto', title: '자동배포', note: '발행 편성표 관리' },
    { screen: 'search', title: '영상 검색', note: '필요한 장면 찾기' },
  ]
  return <div className={styles.page}>
    <div className={styles.topLine}><span>{ACCOUNT.organization} 작업 공간</span><span>10월 1일 목요일 · 예시 데이터</span></div>
    <div className={styles.welcome}><h1>{ACCOUNT.name}님, 안녕하세요.</h1><p>오늘의 일정과 최근 작업을 확인하세요.</p></div>
    <section className={styles.shortcuts} aria-label="업무 바로가기">{shortcuts.map((item) => <button type="button" key={item.screen} onClick={() => onNavigate(item.screen)}><span className={styles.shortcutIcon}><NavIcon screen={item.screen} size={22} /></span><span><strong>{item.title}</strong><small>{item.note}</small></span><span className={styles.chevron}>›</span></button>)}</section>
    <div className={styles.columns}>
      <section className={styles.section}><div className={styles.sectionHead}><h2>오늘의 배포 일정</h2><button type="button" onClick={() => onNavigate('schedule')}>전체 일정 <span>›</span></button></div>
        <div className={styles.schedule}>
          {[{ time: '12:30', name: '나미브', title: '앵콜 무대 시작합니다', channel: 'YouTube', state: '예약됨' }, { time: '18:00', name: '나는 SOLO', title: '아무도 예상 못 한 선택', channel: 'YouTube · 네이버 클립', state: '예약됨' }, { time: '19:00', name: '나미브', title: '돌아온 사람', channel: 'YouTube', state: '예약됨' }].map((item) => <button type="button" key={item.time} onClick={() => onNavigate('schedule')} className={styles.scheduleItem}><time>{item.time}</time><span className={styles.scheduleText}><strong>{item.title}</strong><small>{item.name} · {item.channel}</small></span><span className={styles.scheduled}>{item.state}</span></button>)}
        </div>
      </section>
      <section className={styles.section}><div className={styles.sectionHead}><h2>확인이 필요한 작업</h2><span className={styles.issueCount}>2</span></div><button type="button" className={styles.attention} onClick={() => onNavigate('channels')}><span className={styles.issueIcon}>!</span><span><strong>네이버 클립 채널 연결 확인</strong><small>ENA DRAMA · 다시 연결하면 배포를 이어갈 수 있습니다.</small></span><span>›</span></button><button type="button" className={styles.attention} onClick={() => onNavigate('media')}><span className={styles.issueIcon}>!</span><span><strong>새로 제작한 영상 검수</strong><small>나는 SOLO 216회 · 발행 전 확인할 영상 3개</small></span><span>›</span></button></section>
    </div>
    <section className={styles.recent}><div className={styles.sectionHead}><h2>최근 작업</h2><button type="button" onClick={() => onNavigate('media')}>미디어 보기 <span>›</span></button></div><div className={styles.recentHead}><span>작업</span><span>프로그램</span><span>마지막 활동</span></div>{[{ title: '새벽 네 시의 전화', program: '나미브', action: '숏폼 제작', time: '오늘 10:42', screen: 'media' }, { title: '216회 영상 분석', program: '나는 SOLO', action: '회차 분석', time: '오늘 09:18', screen: 'analysis' }, { title: '다음 주 배포 편성', program: '신병', action: '자동배포', time: '어제 17:30', screen: 'auto' }].map((item) => <button type="button" key={item.title} className={styles.recentRow} onClick={() => onNavigate(item.screen as ScreenKey)}><span className={styles.recentTitle}><NavIcon screen={item.screen as ScreenKey} /><span><strong>{item.title}</strong><small>{item.action}</small></span></span><span>{item.program}</span><span>{item.time}</span></button>)}</section>
    <div className={styles.homeFooter}>STEP D · 내 작업 공간</div>
  </div>
}
