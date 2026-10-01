/*
 * 확인 창 · 영상 재생 창.
 * 원본은 실제 mp4 를 재생합니다 — 목업에는 파일이 없어 대체 화면을 보여 줍니다.
 */

import { useEffect } from 'react'
import type { ConfirmCfg, PlayerCfg } from '../types'
import styles from './overlays.module.css'

export function ConfirmDialog({
  cfg,
  onCancel,
}: {
  cfg: ConfirmCfg
  onCancel: () => void
}) {
  return (
    <div className={styles.confirmScrim}>
      <div className={styles.backdrop} onClick={onCancel} />
      <div className={styles.confirm} role="dialog" aria-modal>
        <h3>{cfg.title}</h3>
        <div className={styles.confirmBody}>{cfg.body}</div>
        {!!cfg.lines?.length && (
          <div className={styles.confirmList}>
            {cfg.lines.map((l) => (
              <div key={l.k} className={styles.confirmLine}>
                <span>{l.k}</span>
                <span>{l.v}</span>
              </div>
            ))}
          </div>
        )}
        <div className={styles.confirmBtns}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className={cfg.danger ? styles.okDanger : styles.okBtn}
            onClick={() => {
              onCancel()
              cfg.run()
            }}
          >
            {cfg.ok}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlayerModal({ cfg, onClose }: { cfg: PlayerCfg; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.playerScrim}>
      <div className={styles.backdropDark} onClick={onClose} />
      <div className={styles.player}>
        <div className={styles.playerHead}>
          <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: 'calc(100% - 46px)' }}>
            <div className={styles.playerTitle}>{cfg.title}</div>
            <div className={styles.playerMeta}>{cfg.meta}</div>
          </div>
          <button type="button" className={styles.playerX} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={cfg.kind === '숏폼' ? styles.stageShort : styles.stageWide}>
          <div className={styles.stageGlyph}>▶</div>
          <div className={styles.stageTitle}>샘플 영상을 불러올 수 없습니다</div>
        </div>
        <div className={styles.playerFoot}>
          실제 발행될 파일입니다. 재생 중 수정은 반영되지 않습니다.
        </div>
      </div>
    </div>
  )
}
