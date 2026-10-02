import { useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog, type ConfirmRequest } from '@/components/ui/ConfirmDialog'
import { ChannelIcon } from '@/components/ui/ChannelIcon'
import {
  ACCOUNTS,
  ALL_PLATFORMS,
  COMMERCE,
  PLATFORMS,
  PRIVACY_OPTIONS,
  STATUS_STYLE,
  TOKEN_REFRESHED,
  countText,
  initialOf,
  needsAttention,
  statusNoteOf,
  type Account,
  type Platform,
  type PlatformKey,
} from './data'
import styles from './ChannelsPage.module.css'

const TOAST_MS = 2600
/** 카드에 기본으로 보여주는 계정 수 */
const CARD_LIMIT = 3

type Layout = 'A' | 'B'

export interface ChannelsPageProps {
  /** 'B' 한눈에 보기(기본) · 'A' 플랫폼별 */
  initialLayout?: Layout
  initialPlatform?: PlatformKey
}

export function ChannelsPage({
  initialLayout = 'B',
  initialPlatform = 'yt',
}: ChannelsPageProps = {}) {
  const [layout, setLayout] = useState<Layout>(initialLayout)
  const [selected, setSelected] = useState<PlatformKey>(initialPlatform)
  const [accounts, setAccounts] = useState<Account[]>(ACCOUNTS)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [toast, setToast] = useState('')
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const say = (text: string) => {
    if (timer.current) clearTimeout(timer.current)
    setToast(text)
    timer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  const patch = (id: string, change: Partial<Account>) =>
    setAccounts((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)))

  /* ---------------- 동작 ---------------- */

  const reconnect = (a: Account) => {
    const platform = ALL_PLATFORMS.find((p) => p.key === a.platform)!
    // TODO(api): OAuth 재인증 플로우
    patch(a.id, {
      status: 'ok',
      expires: a.expires ? '11/27' : a.expires,
      last:
        a.platform === 'tt' ? '재연결됨 — 배포 화면에서 실패 3건을 다시 보내세요' : a.last,
      lastBad: false,
    })
    say(`${platform.name} 로그인 창으로 이동 → ${a.name} 재연결됨`)
  }

  const disconnect = (a: Account) =>
    setConfirm({
      title: `${a.name} 연동을 해제할까요?`,
      body:
        (a.rules.length
          ? `자동배포 ${a.rules.length}개 프로그램(${a.rules.join(', ')})이 이 계정으로 보내고 있어, 해제하면 그 배포가 멈춥니다.\n`
          : '') + '기록은 남고, 다시 연결하면 이어서 씁니다.',
      confirmLabel: '연동 해제',
      tone: 'danger',
      onConfirm: () => {
        patch(a.id, { status: 'off' })
        say(`${a.name} 연동을 해제했습니다`)
      },
    })

  const remove = (a: Account) =>
    setConfirm({
      title: `${a.name}을(를) 삭제할까요?`,
      body:
        '연결 정보까지 지워져 다시 쓰려면 처음부터 연결해야 합니다.\n배포만 멈추려면 ‘연동 해제’를 쓰세요.',
      confirmLabel: '삭제',
      tone: 'danger',
      onConfirm: () => {
        setAccounts((list) => list.filter((x) => x.id !== a.id))
        say('삭제했습니다')
      },
    })

  const toggleSettings = (id: string) =>
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))

  /* ---------------- 파생 ---------------- */

  const issues = useMemo(
    () =>
      accounts.filter(needsAttention).map((a) => {
        const platform = ALL_PLATFORMS.find((p) => p.key === a.platform)!
        return {
          account: a,
          platform,
          impact:
            a.status === 'bad'
              ? `${a.last} · 자동배포 ${a.rules.length}개 프로그램이 이 계정으로 보냅니다`
              : a.status === 'warn'
                ? `만료되면 ${a.rules.join(', ')} 자동배포가 멈춥니다`
                : a.rules.length
                  ? `자동배포 ${a.rules.length}개 프로그램`
                  : '자동배포에 쓰지 않는 채널 — 필요 없으면 삭제하세요',
        }
      }),
    [accounts],
  )

  const accountsOf = (key: PlatformKey) => accounts.filter((a) => a.platform === key)

  const platform = ALL_PLATFORMS.find((p) => p.key === selected) ?? PLATFORMS[0]

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>배포 채널</h1>
          <div className={styles.layoutSwitch}>
            {(
              [
                ['B', '한눈에 보기'],
                ['A', '플랫폼별'],
              ] as Array<[Layout, string]>
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={layout === k ? `${styles.segBtn} ${styles.segBtnOn}` : styles.segBtn}
                onClick={() => setLayout(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ---------------- 재연결 필요 ---------------- */}
        {issues.length > 0 && (
          <section className={styles.issues}>
            <div className={styles.issuesHead}>
              <span className={styles.issuesTitle}>재연결이 필요한 계정 {issues.length}개</span>
              <span className={styles.issuesNote}>그대로 두면 다음 배포가 실패합니다.</span>
            </div>
            {issues.map(({ account, platform: p, impact }) => {
              const style = STATUS_STYLE[account.status]
              return (
                <div key={account.id} className={styles.issueRow}>
                  <span
                    className={styles.avatar}
                    style={{ width: 32, height: 32, background: p.color, fontSize: 13 }}
                  >
                    {initialOf(account.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.issueHead}>
                      <span className={styles.issueName}>{account.name}</span>
                      <span className={styles.issuePlatform}>{p.name}</span>
                      <span
                        className={styles.statusPill}
                        style={{ background: style.bg, color: style.fg, height: 20 }}
                      >
                        {account.status === 'warn' ? `${account.expires} 만료 예정` : style.label}
                      </span>
                    </div>
                    <div className={styles.issueImpact}>{impact}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={styles.detailBtn}
                      style={{ height: 34 }}
                      onClick={() => {
                        setLayout('A')
                        setSelected(account.platform)
                      }}
                    >
                      계정 보기
                    </button>
                    <button
                      type="button"
                      className={styles.detailBtnPrimary}
                      style={{ height: 34 }}
                      onClick={() => reconnect(account)}
                    >
                      재연결
                    </button>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* ---------------- 한눈에 보기 ---------------- */}
        {layout === 'B' && (
          <div className={styles.cardGrid}>
            {ALL_PLATFORMS.map((p) => {
              const list = accountsOf(p.key)
              const active = list.filter((a) => a.status === 'ok' || a.status === 'warn').length
              const hasBad = list.some((a) => a.status === 'bad' || a.status === 'revoked')
              const hasWarn = list.some((a) => a.status === 'warn')
              const rank = (a: Account) => (a.status === 'ok' ? 2 : a.status === 'warn' ? 1 : 0)
              const sorted = [...list].sort((x, y) => rank(x) - rank(y))
              const isExpanded = !!expanded[p.key]
              const more = sorted.length - CARD_LIMIT
              const shown = isExpanded ? sorted : sorted.slice(0, CARD_LIMIT)

              return (
                <div
                  key={p.key}
                  className={hasBad ? `${styles.card} ${styles.cardBad}` : styles.card}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitleRow}>
                      <PlatformMark platform={p} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.cardName}>
                          {p.name}
                          {p.key === 'cp' && <span className={styles.cardTag}>상품 링크</span>}
                        </div>
                      </div>
                      <span
                        className={styles.cardCount}
                        style={{
                          color: hasBad
                            ? 'hsl(var(--status-error))'
                            : hasWarn
                              ? 'hsl(var(--status-warn))'
                              : 'var(--text-muted)',
                        }}
                      >
                        {list.length ? `계정 ${list.length} · 활성 ${active}` : '연결 안 됨'}
                      </span>
                    </div>

                  </div>

                  <div className={styles.cardBody}>
                    {list.length === 0 && (
                      <div className={styles.cardEmpty}>
                        연결된 계정이 없습니다.
                        <br />
                        {p.emptyText ?? `"${p.connectLabel}"로 붙이세요.`}
                      </div>
                    )}

                    {shown.map((a) => (
                      <AccountCardRow
                        key={a.id}
                        account={a}
                        platform={p}
                        open={!!open[a.id] && !p.noSettings}
                        onToggle={() => toggleSettings(a.id)}
                        onReconnect={() => reconnect(a)}
                        onDisconnect={() => disconnect(a)}
                        onDelete={() => remove(a)}
                        onPatch={(c) => patch(a.id, c)}
                        onSay={say}
                      />
                    ))}

                    {more > 0 && (
                      <button
                        type="button"
                        className={styles.moreBtn}
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [p.key]: !prev[p.key] }))
                        }
                      >
                        {isExpanded ? '접기' : `${more}개 더 보기`}
                      </button>
                    )}
                  </div>

                  <div className={styles.cardFoot}>
                    <button
                      type="button"
                      className={styles.connectBtn}
                      onClick={() => say(`${p.name} 로그인 창으로 이동합니다`)}
                    >
                      {p.connectLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ---------------- 플랫폼별 ---------------- */}
        {layout === 'A' && (
          <div className={styles.splitLayout}>
            <div className={styles.rail}>
              <div className={styles.railGroup}>영상 배포</div>
              {PLATFORMS.map((p) => (
                <RailItem
                  key={p.key}
                  platform={p}
                  accounts={accountsOf(p.key)}
                  active={selected === p.key}
                  onSelect={() => setSelected(p.key)}
                />
              ))}
              <div className={styles.railGroupSep}>상품 링크</div>
              <RailItem
                platform={COMMERCE}
                accounts={accountsOf(COMMERCE.key)}
                active={selected === COMMERCE.key}
                onSelect={() => setSelected(COMMERCE.key)}
              />
            </div>

            <div className={styles.detail}>
              <div className={styles.detailHead}>
                <PlatformMark platform={platform} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={styles.detailName}>{platform.name}</span>
                  </div>
                  {platform.tip && <div className={styles.detailTip}>{platform.tip}</div>}
                </div>
                <div className={styles.detailActions}>
                  <button
                    type="button"
                    className={styles.detailBtnPrimary}
                    onClick={() => say(`${platform.name} 로그인 창으로 이동합니다`)}
                  >
                    {platform.connectLabel}
                  </button>
                </div>
              </div>

              {accountsOf(platform.key).length === 0 ? (
                <div className={styles.detailEmpty}>
                  <div className={styles.emptyTitleA}>
                    연결된 {platform.name} {platform.unit}
                    {platform.unit === '채널' ? '이' : '가'} 없습니다
                  </div>
                  <div className={styles.footNote}>
                    {platform.emptyText ?? `위 "${platform.connectLabel}"로 붙이세요.`}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.tableHead}>
                    <span />
                    <span>{platform.unit === 'Page' ? 'Page' : platform.unit}</span>
                    <span>상태</span>
                    <span>
                      {platform.audienceLabel ? `${platform.audienceLabel} · 평균 조회수` : '쓰는 곳'}
                    </span>
                    <span />
                  </div>
                  {accountsOf(platform.key).map((a) => (
                    <AccountTableRow
                      key={a.id}
                      account={a}
                      platform={platform}
                      open={!!open[a.id] && !platform.noSettings}
                      onToggle={() => toggleSettings(a.id)}
                      onReconnect={() => reconnect(a)}
                      onDisconnect={() => disconnect(a)}
                      onDelete={() => remove(a)}
                      onPatch={(c) => patch(a.id, c)}
                      onSay={say}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

/* ================================================================== */

/**
 * 플랫폼 표식 — STEPD 본 저장소의 공식 채널 아이콘을 씁니다.
 * 쿠팡 파트너스는 공식 아이콘이 없어 기존 이니셜 원을 그대로 둡니다.
 */
function PlatformMark({ platform, size }: { platform: Platform; size: number }) {
  if (platform.key === 'cp')
    return (
      <span
        className={styles.avatar}
        style={{ width: size, height: size, background: platform.color, fontSize: size * 0.4 }}
      >
        {initialOf(platform.name)}
      </span>
    )
  return (
    <span className={styles.platformMark} style={{ width: size, height: size }}>
      <ChannelIcon channel={platform.key} size={Math.round(size * 0.62)} />
    </span>
  )
}

function RailItem({
  platform,
  accounts,
  active,
  onSelect,
}: {
  platform: Platform
  accounts: Account[]
  active: boolean
  onSelect: () => void
}) {
  const bad = accounts.some((a) => a.status === 'bad' || a.status === 'revoked')
  const warn = accounts.some((a) => a.status === 'warn')
  const activeCount = accounts.filter((a) => a.status === 'ok' || a.status === 'warn').length

  return (
    <button
      type="button"
      className={active ? `${styles.railItem} ${styles.railItemOn}` : styles.railItem}
      onClick={onSelect}
    >
      <PlatformMark platform={platform} size={30} />
      <span className={styles.railBody}>
        <span className={styles.railName}>{platform.name}</span>
        <span className={styles.railSub}>
          {accounts.length ? `계정 ${accounts.length} · 활성 ${activeCount}` : '연결 안 됨'}
        </span>
      </span>
      {(bad || warn) && (
        <span
          className={styles.railDot}
          style={{ background: bad ? 'hsl(var(--status-error))' : '#D97706' }}
        />
      )}
    </button>
  )
}

/* ---------------- 공통 설정 패널 ---------------- */

interface RowActions {
  account: Account
  platform: Platform
  open: boolean
  onToggle: () => void
  onReconnect: () => void
  onDisconnect: () => void
  onDelete: () => void
  onPatch: (change: Partial<Account>) => void
  onSay: (text: string) => void
}

function SettingsPanel({
  account,
  platform,
  wide,
  onPatch,
  onSay,
}: Pick<RowActions, 'account' | 'platform' | 'onPatch' | 'onSay'> & { wide?: boolean }) {
  const len = account.footer.length
  const over = !!platform.max && len > platform.max

  return (
    <div className={wide ? `${styles.settings} ${styles.settingsWide}` : styles.settings}>
      {platform.key === 'yt' && (
        <div className={wide ? styles.privacyRow : undefined}>
          <div>
            <div className={styles.settingsLabel}>자동배포 공개 범위</div>
            {wide && (
              <div className={styles.settingsHint}>
                이 채널로 가는 자동배포 규칙이 모두 이 값을 씁니다.
              </div>
            )}
          </div>
          <div className={styles.privacySwitch} style={wide ? undefined : { marginTop: 6 }}>
            {PRIVACY_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={
                  account.privacy === o.key ? `${styles.segBtn} ${styles.segBtnOn}` : styles.segBtn
                }
                onClick={() => {
                  onPatch({ privacy: o.key })
                  onSay(`${account.name} 자동배포 공개 범위 — ${o.label}`)
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className={styles.settingsLabel}>{platform.footerLabel}</div>
        <div className={styles.settingsHint}>{platform.footerHint}</div>
        <textarea
          className={styles.textarea}
          rows={3}
          value={account.footer}
          placeholder={
            platform.key === 'tt'
              ? '예) #ENA #예능'
              : '예) 본방송은 매주 토요일 밤 9시, ENA에서 만나요.'
          }
          onChange={(e) => onPatch({ footer: e.target.value })}
        />
        <div className={styles.settingsFoot}>
          <span className={over ? `${styles.count} ${styles.countOver}` : styles.count}>
            {len} / {platform.max}자{over ? ' — 너무 깁니다' : ''}
          </span>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() =>
              onSay(
                over
                  ? `${platform.max}자 이하로 줄여 주세요`
                  : `${account.name} 고정 문구를 저장했습니다 — 다음 배포부터 붙습니다`,
              )
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 카드 레이아웃의 계정 행 ---------------- */

function AccountCardRow(props: RowActions) {
  const { account, platform, open, onToggle, onReconnect, onDisconnect, onDelete } = props
  const style = STATUS_STYLE[account.status]
  const note = statusNoteOf(account)
  const isBad = account.status === 'bad' || account.status === 'revoked'

  return (
    <div className={styles.acctCard}>
      <div
        className={
          isBad ? `${styles.acctCardRow} ${styles.acctCardRowBad}` : styles.acctCardRow
        }
      >
        <span
          className={
            account.status === 'off' ? `${styles.avatar} ${styles.avatarDim}` : styles.avatar
          }
          style={{ width: 28, height: 28, background: platform.color, fontSize: 11 }}
        >
          {initialOf(account.name)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div className={styles.acctName}>{account.name}</div>
          <div
            className={
              account.lastBad ? `${styles.acctSub} ${styles.acctSubBad}` : styles.acctSub
            }
          >
            토큰 갱신 {TOKEN_REFRESHED[account.id] ?? account.since}
          </div>
          {note && <div className={styles.acctNote}>{note}</div>}
        </div>
        <span className={styles.statusPill} style={{ background: style.bg, color: style.fg }}>
          <span className={styles.statusDot} style={{ background: style.dot }} />
          {style.label}
        </span>
      </div>

      <div className={styles.acctCardActions}>
        {account.status !== 'ok' && (
          <button type="button" className={styles.smallBtn} onClick={onReconnect}>
            재연결
          </button>
        )}
        {!platform.noSettings && account.status !== 'off' && (
          <button
            type="button"
            className={open ? `${styles.ghostBtn} ${styles.ghostBtnOn}` : styles.ghostBtn}
            onClick={onToggle}
          >
            {open ? '닫기' : '설정'}
          </button>
        )}
        {account.status === 'ok' && (
          <button
            type="button"
            className={styles.ghostBtn}
            title="토큰만 끊고 기록은 남깁니다"
            onClick={onDisconnect}
          >
            연동 해제
          </button>
        )}
        <button type="button" className={styles.deleteBtn} onClick={onDelete}>
          삭제
        </button>
      </div>

      {open && <SettingsPanel {...props} />}
    </div>
  )
}

/* ---------------- 플랫폼별 레이아웃의 계정 행 ---------------- */

function AccountTableRow(props: RowActions) {
  const { account, platform, open, onToggle, onReconnect, onDisconnect, onDelete } = props
  const style = STATUS_STYLE[account.status]
  const note = statusNoteOf(account)
  const isBad = account.status === 'bad' || account.status === 'revoked'

  return (
    <div className={styles.acctBlock}>
      <div className={isBad ? `${styles.tableRow} ${styles.tableRowBad}` : styles.tableRow}>
        <span
          className={
            account.status === 'off' ? `${styles.avatar} ${styles.avatarDim}` : styles.avatar
          }
          style={{ width: 32, height: 32, background: platform.color, fontSize: 13 }}
        >
          {initialOf(account.name)}
        </span>

        <div style={{ minWidth: 0 }}>
          <div className={styles.acctTitle}>{account.name}</div>
          <div className={styles.acctMeta}>
            {account.sub ? `${account.sub} · ` : ''}
            {account.since} 연결
          </div>
        </div>

        <div className={styles.statusCell}>
          <span className={styles.statusPill} style={{ background: style.bg, color: style.fg }}>
            <span className={styles.statusDot} style={{ background: style.dot }} />
            {style.label}
          </span>
          {note && <span className={styles.acctNote}>{note}</span>}
        </div>

        <div className={styles.usesCell}>
          {/* 구독자 수를 부르는 이름은 플랫폼마다 다릅니다 — 없는 플랫폼은 쓰는 곳을 그대로 */}
          <div>
            {platform.audienceLabel
              ? `${platform.audienceLabel} ${countText(account.audience ?? 0)} · 평균 조회수 ${countText(account.avgViews ?? 0)}`
              : platform.key === 'cp'
                ? '영상 설명의 상품 링크'
                : account.rules.length
                  ? `자동배포 ${account.rules.length}개 프로그램`
                  : '자동배포에 안 씀'}
          </div>
          <div
            className={
              account.lastBad ? `${styles.lastLine} ${styles.lastLineBad}` : styles.lastLine
            }
          >
            {account.last}
          </div>
        </div>

        <div className={styles.rowActions}>
          {!platform.noSettings && account.status !== 'off' && (
            <button
              type="button"
              className={open ? `${styles.rowBtn} ${styles.rowBtnOn}` : styles.rowBtn}
              onClick={onToggle}
            >
              {open ? '닫기' : '설정'}
            </button>
          )}
          {account.status !== 'ok' && (
            <button type="button" className={styles.rowBtnPrimary} onClick={onReconnect}>
              재연결
            </button>
          )}
          {account.status === 'ok' && (
            <button
              type="button"
              className={styles.rowBtn}
              title="토큰만 끊고 기록은 남깁니다. 다시 연결하면 이어서 씁니다."
              onClick={onDisconnect}
            >
              연동 해제
            </button>
          )}
          <button
            type="button"
            className={styles.rowBtnDanger}
            title="연결 정보까지 지웁니다"
            onClick={onDelete}
          >
            삭제
          </button>
        </div>
      </div>

      {open && <SettingsPanel {...props} wide />}
    </div>
  )
}
