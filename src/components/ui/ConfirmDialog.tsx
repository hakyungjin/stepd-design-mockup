import { Btn } from './Btn'
import styles from './ConfirmDialog.module.css'

export interface ConfirmRequest {
  title: string
  /** 줄바꿈(\n)을 그대로 표시합니다 */
  body: string
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  onConfirm: () => void
}

/**
 * 인앱 확인 창.
 * 원본 목업은 window.confirm 을 썼지만, 브라우저 모달은 화면 전체를 막고
 * 스타일도 맞지 않아 같은 역할의 인앱 다이얼로그로 바꿨습니다.
 */
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest | null
  onClose: () => void
}) {
  if (!request) return null

  return (
    <div className={styles.scrim} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>{request.title}</div>
        <div className={styles.body}>{request.body}</div>
        <div className={styles.actions}>
          <Btn variant="secondary" size="md" onClick={onClose}>
            취소
          </Btn>
          <Btn
            variant={request.tone === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={() => {
              request.onConfirm()
              onClose()
            }}
          >
            {request.confirmLabel ?? '확인'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
