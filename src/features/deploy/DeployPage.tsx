import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip } from '@/components/ui/Badge'
import { Pill, Segment, Select } from '@/components/ui/Controls'
import { ChannelIcon } from '@/components/ui/ChannelIcon'
import type { ScreenKey } from '@/app/screens'
import {
  CAUSES,
  CELL_STYLE,
  CHANNELS,
  DEPLOY_ROWS,
  EPISODES,
  durationText,
  kindTone,
  latestAt,
  type CauseKey,
  type Cell,
  type Channel,
  type ChannelKey,
  type DeployRow,
} from './data'
import styles from './DeployPage.module.css'

const TOAST_MS = 2600
const RETRY_MS = 4500

export interface DeployPageProps {
  /** 손볼 것 패널 표시 여부 (원본 목업의 boolean prop) */
  showAttention?: boolean
  onNavigate: (screen: ScreenKey) => void
}

export function DeployPage({ showAttention = true, onNavigate }: DeployPageProps) {
  const [rows, setRows] = useState<DeployRow[]>(DEPLOY_ROWS)
  const [program, setProgram] = useState('all')
  /** 회차 키 — 프로그램을 고른 뒤에만 쓰입니다 */
  const [episode, setEpisode] = useState('all')
  const [kind, setKind] = useState('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const say = (text: string) => {
    setToast(text)
    const t = setTimeout(() => setToast(''), TOAST_MS)
    timers.current.push(t)
  }

  /* ---------------- 다시 보내기 ---------------- */
  const retry = (pairs: Array<[string, ChannelKey]>) => {
    const keys = new Set(pairs.map(([id, ch]) => `${id}:${ch}`))
    const move = (list: DeployRow[], from: Cell['state'], next: Partial<Cell>) =>
      list.map((r) => ({
        ...r,
        cells: Object.fromEntries(
          Object.entries(r.cells).map(([k, cell]) => [
            k,
            keys.has(`${r.id}:${k}`) && cell.state === from ? { ...cell, ...next } : cell,
          ]),
        ) as DeployRow['cells'],
      }))

    // TODO(api): POST /deploys/:id/channels/:key/retry
    setRows((list) => move(list, 'F', { state: 'U', at: '09/28 10:15', cause: undefined }))
    say(`${pairs.length}건 다시 보내는 중입니다`)

    const t = setTimeout(() => {
      setRows((list) => move(list, 'U', { state: 'P', at: '09/28 10:16' }))
    }, RETRY_MS)
    timers.current.push(t)
  }

  const publish = (row: DeployRow, channel?: Channel) =>
    say(`배포 창 — ${row.title}${channel ? ` · ${channel.name} 선택됨` : ''}`)

  /* ---------------- 집계 ---------------- */
  const allCells = useMemo(
    () =>
      rows.flatMap((r) =>
        (Object.entries(r.cells) as Array<[ChannelKey, Cell]>).map(([k, cell]) => ({
          row: r,
          key: k,
          cell,
        })),
      ),
    [rows],
  )

  const failed = allCells.filter((c) => c.cell.state === 'F')
  const pending = allCells.filter((c) => c.cell.state === 'U')
  const next = allCells
    .filter((c) => c.cell.state === 'S')
    .sort((a, b) => a.cell.at.localeCompare(b.cell.at))[0]

  const causes = (Object.entries(CAUSES) as Array<[CauseKey, (typeof CAUSES)[CauseKey]]>)
    .map(([key, cause]) => {
      const hits = failed.filter((f) => f.cell.cause === key)
      if (!hits.length) return null
      return { key, cause, hits }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  /* ---------------- 필터 · 그룹 ---------------- */
  const visible = useMemo(() => {
    const list = rows.filter((r) => {
      const ep = EPISODES[r.episodeKey]
      if (program !== 'all' && ep.program !== program) return false
      if (episode !== 'all' && r.episodeKey !== episode) return false
      if (kind !== 'all' && r.kind !== kind) return false
      return true
    })
    return list.slice().sort((a, b) => latestAt(b).localeCompare(latestAt(a)))
  }, [episode, kind, program, rows])

  const groups = useMemo(() => {
    const map = new Map<string, DeployRow[]>()
    visible.forEach((r) => {
      if (!map.has(r.episodeKey)) map.set(r.episodeKey, [])
      map.get(r.episodeKey)!.push(r)
    })
    return [...map.entries()]
      .sort((a, b) => EPISODES[b[0]].airNo - EPISODES[a[0]].airNo)
      .map(([key, list]) => ({ key, episode: EPISODES[key], rows: list }))
  }, [visible])

  const programOptions = [...new Set(Object.values(EPISODES).map((e) => e.program))]

  /** 고른 프로그램의 회차 — 최신 방송 순 */
  const episodeOptions = Object.entries(EPISODES)
    .filter(([, e]) => e.program === program)
    .sort((a, b) => b[1].airNo - a[1].airNo)

  const detail = rows.find((r) => r.id === detailId) ?? null

  /* ---------------- 셀 렌더 ---------------- */
  const renderCell = (row: DeployRow, channel: Channel) => {
    const cell = row.cells[channel.key]
    const verticalOnly = channel.verticalOnly && row.kind !== '숏폼'

    if (!cell) {
      if (verticalOnly) {
        return (
          <span className={styles.cellNa} title={`${channel.name}은 세로 숏폼만 받습니다`}>
            —
          </span>
        )
      }
      return (
        <button
          type="button"
          className={styles.cellAdd}
          title={`${channel.name}에 보내기`}
          onClick={(e) => {
            e.stopPropagation()
            publish(row, channel)
          }}
        >
          +
        </button>
      )
    }

    const style = CELL_STYLE[cell.state]
    const label = style.label
    const title =
      cell.state === 'F'
        ? `${CAUSES[cell.cause!].title}\n눌러서 원인 보기`
        : `${channel.name} · ${style.label} · ${cell.at}`

    return (
      <>
        <button
          type="button"
          className={styles.cellPill}
          title={title}
          style={{ background: style.bg, color: style.fg }}
          onClick={(e) => {
            e.stopPropagation()
            if (cell.state === 'P') say(`${channel.name}에서 "${row.title}" 열기`)
            else setDetailId(row.id)
          }}
        >
          {label}
        </button>
        {cell.state === 'S' && <span className={styles.cellAt}>{cell.at}</span>}
      </>
    )
  }

  return (
    <>
      <div className={styles.page}>
        <Segment size="lg">
          <Pill size="lg" active>
            배포
          </Pill>
          <Pill size="lg" onClick={() => onNavigate('schedule')}>
            스케줄
          </Pill>
        </Segment>

        <div className={styles.header}>
          <h1 className={styles.title}>배포</h1>
          <div className={styles.headerMeta}>
            {next && (
              <span>
                다음 예약 <b className={styles.headerStrong}>{next.cell.at}</b> ·{' '}
                {CHANNELS.find((c) => c.key === next.key)?.name} · {next.row.title}
              </span>
            )}
            {pending.length > 0 && (
              <span className={styles.inFlight}>
                <span className={styles.inFlightDot} />
                게시 중 {pending.length}건 · 5초마다 갱신
              </span>
            )}
          </div>
        </div>

        {/* ---------------- 손볼 것 ---------------- */}
        {showAttention && causes.length > 0 && (
          <section className={styles.attention}>
            <div className={styles.attentionHead}>
              <span className={styles.attentionTitle}>손볼 것 {failed.length}건</span>
              <span className={styles.attentionNote}>
                원인별로 묶었습니다. 원인을 고쳐야 다시 보낼 수 있는 것도 있습니다.
              </span>
            </div>

            {causes.map(({ key, cause, hits }) => (
              <div key={key} className={styles.causeRow}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.causeHead}>
                    <span className={styles.causeTitle}>{cause.title}</span>
                    <span className={styles.causeCount}>{hits.length}건</span>
                  </div>
                  <div className={styles.causeDesc}>{cause.desc}</div>
                  <div className={styles.causeItems}>
                    {hits.map((h) => (
                      <button
                        key={`${h.row.id}-${h.key}`}
                        type="button"
                        className={styles.causeItem}
                        onClick={() => setDetailId(h.row.id)}
                      >
                        {h.row.title} · {CHANNELS.find((c) => c.key === h.key)?.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.causeActions}>
                  {cause.link && (
                    <button
                      type="button"
                      className={styles.metaBtn}
                      style={{ height: 34 }}
                      onClick={() => onNavigate('channels')}
                    >
                      배포 채널에서 재연결 →
                    </button>
                  )}
                  {cause.fix && (
                    <button
                      type="button"
                      className={styles.metaBtn}
                      style={{ height: 34 }}
                      onClick={() =>
                        key === 'copyright'
                          ? say('클립 편집기는 준비 중입니다')
                          : say(`설명 편집 — ${hits[0].row.title}`)
                      }
                    >
                      {cause.fix}
                    </button>
                  )}
                  {cause.retry && (
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      style={{ height: 34, margin: 0, padding: '0 14px', fontSize: 12.5 }}
                      onClick={() => retry(hits.map((h) => [h.row.id, h.key]))}
                    >
                      {hits.length > 1 ? `${hits.length}건 다시 시도` : '다시 시도'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ---------------- 필터 ---------------- */}
        <div className={styles.filters}>
          <Select
            value={program}
            onChange={(e) => {
              // 프로그램을 바꾸면 회차는 다시 고릅니다
              setProgram(e.target.value)
              setEpisode('all')
            }}
          >
            <option value="all">전체 프로그램</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          {program !== 'all' && (
            <Select value={episode} onChange={(e) => setEpisode(e.target.value)}>
              <option value="all">전체 회차</option>
              {episodeOptions.map(([key, e]) => (
                <option key={key} value={key}>
                  {e.ep}회
                </option>
              ))}
            </Select>
          )}
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">전체 영상 타입</option>
            <option value="숏폼">숏폼</option>
            <option value="클립">클립</option>
            <option value="하이라이트">하이라이트</option>
          </Select>
          <span className={styles.rowCount}>영상 {visible.length}개</span>
        </div>

        {/* ---------------- 매트릭스 ---------------- */}
        <div className={styles.matrix}>
          <div className={styles.matrixHead}>
            <span />
            <span className={styles.headLabel}>영상</span>
            {/* 채널은 공식 로고로만 — 이름은 툴팁에 있습니다 */}
            {CHANNELS.map((c) => (
              <span key={c.key} className={styles.headChannel} title={c.name}>
                <ChannelIcon channel={c.name} size={20} />
              </span>
            ))}
            <span />
          </div>

          {groups.map((g) => (
            <div key={g.key}>
              <div className={styles.groupRow}>
                <span className={styles.groupTitle}>
                  {g.episode.program} {g.episode.ep}회
                </span>
                <span className={styles.groupSub}>
                  방송 {g.episode.air} · 영상 {g.rows.length}개
                </span>
              </div>

              {g.rows.map((r) => {
                const hasFailure = Object.values(r.cells).some((c) => c.state === 'F')
                return (
                  <div
                    key={r.id}
                    className={hasFailure ? `${styles.row} ${styles.rowFailed}` : styles.row}
                    onClick={() => setDetailId(r.id)}
                  >
                    <div className={styles.thumbBox}>
                      <img
                        src={r.thumb}
                        alt=""
                        className={
                          r.kind === '숏폼' ? styles.thumbPortrait : styles.thumbLandscape
                        }
                      />
                    </div>

                    <div className={styles.rowTitleCell}>
                      <div className={styles.rowTitle}>{r.title}</div>
                      <div className={styles.rowMeta}>
                        <Chip tone={kindTone(r.kind)}>{r.kind}</Chip>
                        <span>{durationText(r.dur)}</span>
                      </div>
                    </div>

                    {CHANNELS.map((c) => (
                      <div key={c.key} className={styles.cell}>
                        {renderCell(r, c)}
                      </div>
                    ))}

                    <div className={styles.rowEnd}>
                      <button
                        type="button"
                        className={styles.deployBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          publish(r)
                        }}
                      >
                        배포
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {visible.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>조건에 맞는 배포 기록이 없습니다</div>
              <div className={styles.emptyNote}>미디어 화면에서 배포하면 여기 쌓입니다.</div>
              <button
                type="button"
                className={styles.metaBtn}
                style={{ height: 34 }}
                onClick={() => {
                  setProgram('all')
                  setEpisode('all')
                  setKind('all')
                }}
              >
                필터 초기화
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 상세 드로어 ---------------- */}
      {detail && (
        <DetailDrawer
          row={detail}
          onClose={() => setDetailId(null)}
          onRetry={retry}
          onPublish={publish}
          onSay={say}
          onNavigate={onNavigate}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </>
  )
}

/* ================================================================== */

function DetailDrawer({
  row,
  onClose,
  onRetry,
  onPublish,
  onSay,
  onNavigate,
}: {
  row: DeployRow
  onClose: () => void
  onRetry: (pairs: Array<[string, ChannelKey]>) => void
  onPublish: (row: DeployRow, channel?: Channel) => void
  onSay: (text: string) => void
  onNavigate: (screen: ScreenKey) => void
}) {
  const episode = EPISODES[row.episodeKey]
  const short = row.kind === '숏폼'
  const onYoutube = row.cells.yt?.state === 'P'

  return (
    <>
      <div className={styles.scrim} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.drawerHead}>
          <span className={styles.drawerEp}>
            {episode.program} {episode.ep}회
          </span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerTop}>
            <div className={styles.drawerThumbBox}>
              <img
                src={row.thumb}
                alt=""
                className={short ? styles.drawerThumbPortrait : styles.drawerThumbLandscape}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={styles.drawerTitle}>{row.title}</div>
              <div className={styles.drawerMeta}>
                <Chip tone={kindTone(row.kind)}>{row.kind}</Chip>
                <span>{durationText(row.dur)}</span>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.sectionTitle}>채널별 결과</div>
            <div className={styles.channelList}>
              {CHANNELS.map((ch) => {
                const cell = row.cells[ch.key]
                const na = !cell && ch.verticalOnly && !short
                const cause = cell?.cause ? CAUSES[cell.cause] : null
                const style = cell ? CELL_STYLE[cell.state] : null

                return (
                  <div
                    key={ch.key}
                    className={
                      na ? `${styles.channelRow} ${styles.channelRowNa}` : styles.channelRow
                    }
                  >
                    <div className={styles.channelTop}>
                      <ChannelIcon channel={ch.name} size={17} />
                      <span className={styles.channelName}>{ch.name}</span>

                      {cell && style && (
                        <>
                          <span
                            className={styles.cellPill}
                            style={{ background: style.bg, color: style.fg, cursor: 'default' }}
                          >
                            {style.label}
                          </span>
                          <span className={styles.channelAt}>{cell.at}</span>
                        </>
                      )}
                      {na && <span className={styles.channelAt}>—</span>}
                      {!cell && !na && <span className={styles.channelAt}>보내지 않음</span>}

                      <div className={styles.channelActions}>
                        {cell?.state === 'P' && ch.key !== 'fb' && (
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => onSay(`${ch.name}에서 열기`)}
                          >
                            채널에서 보기 ↗
                          </button>
                        )}
                        {!cell && !na && (
                          <button
                            type="button"
                            className={styles.sendBtn}
                            onClick={() => onPublish(row, ch)}
                          >
                            보내기
                          </button>
                        )}
                      </div>
                    </div>

                    {cell && (
                      <div className={styles.acct}>{ch.account}</div>
                    )}

                    {cause && (
                      <div className={styles.errorBox}>
                        <div className={styles.errorTitle}>{cause.title}</div>
                        <div className={styles.errorDesc}>{cause.desc}</div>
                        <div className={styles.errorActions}>
                          {cause.link && (
                            <button
                              type="button"
                              className={styles.errorBtn}
                              onClick={() => onNavigate('channels')}
                            >
                              재연결 →
                            </button>
                          )}
                          {cause.fix && (
                            <button
                              type="button"
                              className={styles.errorBtn}
                              onClick={() =>
                                cell?.cause === 'copyright'
                                  ? onSay('클립 편집기는 준비 중입니다')
                                  : onSay('설명 편집')
                              }
                            >
                              {cause.fix}
                            </button>
                          )}
                          {cause.retry && (
                            <button
                              type="button"
                              className={styles.errorBtnSolid}
                              onClick={() => onRetry([[row.id, ch.key]])}
                            >
                              다시 시도
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className={styles.drawerFoot}>
          {onYoutube && (
            <button
              type="button"
              className={styles.metaBtn}
              title="올라간 영상의 제목 · 설명만 고쳐 반영합니다 (다시 올리지 않음)"
              onClick={() => onSay('제목 · 설명 수정 — 저장하면 YouTube 영상에 반영됩니다')}
            >
              제목 · 설명 수정
            </button>
          )}
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              onClose()
              onPublish(row)
            }}
          >
            다른 채널에 배포
          </button>
        </div>
      </aside>
    </>
  )
}
