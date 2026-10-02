import { Btn } from '@/components/ui/Btn'
import { CheckBox, CheckMark, Chip, Thumb } from '@/components/ui/Controls'
import { durationText, timestampOf } from '@/lib/date'
import type { DateStr, TimeStr } from '@/lib/date'
import {
  DAILY_LIMIT,
  IG_REELS_MAX_SEC,
  PLATFORMS,
  PLATFORM_NAME,
  PROGRAM_NAME,
  STATUSES,
  STATUS_STYLE,
  TEMPLATES,
  VIDEO_TYPE,
  WARN_IG_LONG,
  WARN_TIKTOK,
} from '../constants'
import { countByProgram, platformKeysOf } from '../domain/rules'
import type { DeployItem, DeployStatus, HistoryEntry, PlatformKey, Video } from '../types'
import styles from './overlays.module.css'

const ONE_HOUR_MS = 3_600_000

export interface ItemDrawerProps {
  item: DeployItem
  videos: Record<string, Video>
  items: DeployItem[]
  history: HistoryEntry[]
  now: Date
  isPast: (date: DateStr, time: TimeStr) => boolean
  onClose: () => void
  onMove: (id: string, date: DateStr, time: TimeStr) => void
  onTogglePlatform: (id: string, key: PlatformKey) => void
  onSetStatus: (id: string, status: DeployStatus) => void
  onSetTemplate: (id: string, index: number) => void
  onToggleTest: (id: string) => void
  onRetry: (id: string, key: PlatformKey) => void
  onCancel: (id: string) => void
  onOpenEditor: (video: Video) => void
}

export function ItemDrawer({
  item,
  videos,
  items,
  history,
  now,
  isPast,
  onClose,
  onMove,
  onTogglePlatform,
  onSetStatus,
  onSetTemplate,
  onToggleTest,
  onRetry,
  onCancel,
  onOpenEditor,
}: ItemDrawerProps) {
  const video = videos[item.vid]
  const type = VIDEO_TYPE[video.type]
  const published = item.status === '게시 완료'
  const template = TEMPLATES[item.tpl] ?? TEMPLATES[0]

  const soon =
    !published &&
    !isPast(item.date, item.time) &&
    timestampOf(item.date, item.time) - now.getTime() <= ONE_HOUR_MS

  const warnings: string[] = []
  if (!video.ready) {
    warnings.push(
      '렌더링이 끝나지 않았습니다. 끝나기 전에는 게시되지 않고, 예약 시각까지 안 끝나면 실패로 남습니다.',
    )
  }
  if (item.pl.tt) warnings.push(WARN_TIKTOK)
  if (item.pl.ig && video.dur > IG_REELS_MAX_SEC) warnings.push(WARN_IG_LONG)

  const limited = platformKeysOf(item).filter(
    (k) => countByProgram(items, videos, item.date, video.prog, k) >= DAILY_LIMIT[video.prog],
  )
  if (limited.length) {
    warnings.push(
      `이 날 ${PROGRAM_NAME[video.prog]} ${limited
        .map((k) => PLATFORM_NAME[k])
        .join('·')} 하루 상한(${DAILY_LIMIT[video.prog]}건)에 도달했습니다. 더 넣을 수 없습니다.`,
    )
  }

  const itemHistory = history.filter((h) => h.id === item.id).slice().reverse()

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.drawerHead}>
          <Thumb src={video.thumb} width={64} height={40} radius={6} />
          <div className={styles.drawerHeadBody}>
            <div className={`${styles.drawerTitle} ${styles.ellipsis}`}>{video.title}</div>
            <div className={styles.drawerMeta}>
              {PROGRAM_NAME[video.prog]} · {type.label} · {durationText(video.dur)} · 추천 점수{' '}
              {video.score}
            </div>
          </div>
          <Btn variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Btn>
        </div>

        <div className={styles.drawerBody}>
          {published && (
            <div className={styles.noticeOk}>
              게시 완료된 배포입니다. 실패한 플랫폼만 다시 보낼 수 있습니다.
            </div>
          )}

          {/* 영상 교체는 두지 않습니다 — 바꾸려면 이 배포를 취소하고 다시 넣습니다 */}
          <div className={styles.field}>
            <span className={styles.fieldLabel}>영상</span>
            <div className={styles.inlineBox}>
              <span className={`${styles.inlineText} ${styles.ellipsis}`}>
                {video.title} · {durationText(video.dur)}
              </span>
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>예정 날짜·시간</span>
            <div className={styles.row}>
              <input
                type="date"
                className={styles.input}
                style={{ flex: 1 }}
                value={item.date}
                disabled={published}
                onChange={(e) => e.target.value && onMove(item.id, e.target.value, item.time)}
              />
              <input
                type="time"
                step={600}
                className={styles.input}
                style={{ width: 120 }}
                value={item.time}
                disabled={published}
                onChange={(e) => e.target.value && onMove(item.id, item.date, e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>배포 플랫폼 · 플랫폼별 상태</span>
            {PLATFORMS.map((p) => {
              const status = item.pl[p.key]
              return (
                <div key={p.key} className={styles.platformRow}>
                  <CheckBox
                    checked={!!status}
                    disabled={published}
                    aria-label={p.name}
                    onClick={() => onTogglePlatform(item.id, p.key)}
                  />
                  <span className={styles.platformName}>{p.name}</span>
                  <span
                    className={styles.platformStatus}
                    style={{ color: status ? STATUS_STYLE[status].fg : 'var(--text-muted)' }}
                  >
                    {status ?? '사용 안 함'}
                  </span>
                  {status === '실패' && (
                    <Btn variant="danger" size="xs" onClick={() => onRetry(item.id, p.key)}>
                      다시 보내기
                    </Btn>
                  )}
                </div>
              )
            })}
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>상태</span>
            <div className={styles.wrapRow}>
              {STATUSES.map((s) => {
                const active = item.status === s
                return (
                  <Chip
                    key={s}
                    active={active}
                    disabled={published}
                    style={
                      active
                        ? {
                            borderColor: STATUS_STYLE[s].dot,
                            background: STATUS_STYLE[s].bg,
                            color: STATUS_STYLE[s].fg,
                          }
                        : undefined
                    }
                    onClick={() => onSetStatus(item.id, s)}
                  >
                    {s}
                  </Chip>
                )
              })}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>제목·설명 템플릿</span>
            <div className={styles.row}>
              {TEMPLATES.map((t, i) => (
                <Chip
                  key={t.name}
                  active={item.tpl === i}
                  disabled={published}
                  onClick={() => onSetTemplate(item.id, i)}
                >
                  {t.name}
                </Chip>
              ))}
            </div>
            <div className={styles.preview}>
              <span className={styles.previewTitle}>{template.title(video)}</span>
              <span className={styles.previewDesc}>{template.desc(video)}</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.toggleRow}
            disabled={published}
            onClick={() => onToggleTest(item.id)}
          >
            <CheckMark checked={item.test} />
            <span className={styles.toggleBody}>
              <span className={styles.toggleTitle}>공개 전 테스트 모드</span>
              <span className={styles.toggleSub}>
                비공개로 먼저 올리고, 확인 후 공개로 바꿉니다
              </span>
            </span>
          </button>

          {warnings.length > 0 && (
            <div className={styles.field} style={{ gap: 6 }}>
              {warnings.map((w) => (
                <div key={w} className={styles.noticeWarn}>
                  {w}
                </div>
              ))}
            </div>
          )}

          <div className={styles.field} style={{ gap: 6 }}>
            <span className={styles.fieldLabel}>변경 이력</span>
            {itemHistory.map((h, i) => (
              <div key={`${h.at}-${i}`} className={styles.histRow}>
                <span className={styles.histAt}>{h.at}</span>
                <span className={styles.histText}>
                  <b className={styles.histWho}>{h.who}</b> · {h.text}
                </span>
              </div>
            ))}
            {itemHistory.length === 0 && (
              <span className={styles.histEmpty}>아직 바뀐 적이 없습니다</span>
            )}
          </div>
        </div>

        <div className={styles.drawerFoot}>
          <div className={styles.grow}>
            <Btn variant="secondary" size="md" onClick={() => onOpenEditor(video)}>
              {type.label} 편집기에서 열기
            </Btn>
          </div>
          <Btn variant="danger" size="md" disabled={published} onClick={() => onCancel(item.id)}>
            {published ? '이미 게시됨' : soon ? '게시 직전 · 지금 취소' : '배포 취소'}
          </Btn>
        </div>
      </aside>
    </>
  )
}
