import type { ReactNode } from 'react'
import styles from './Badge.module.css'

const cx = (...p: Array<string | false | undefined>) => p.filter(Boolean).join(' ')

export type Tone = 'muted' | 'accent' | 'success' | 'amber' | 'error' | 'progress'

const TONE_CLASS: Record<Tone, string> = {
  muted: styles.toneMuted,
  accent: styles.toneAccent,
  success: styles.toneSuccess,
  amber: styles.toneAmber,
  error: styles.toneError,
  progress: styles.toneProgress,
}

/** STEP D 디자인 시스템의 `StepD.Chip` 대응 */
export function Chip({
  tone = 'muted',
  size = 'sm',
  children,
  className,
}: {
  tone?: Tone
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cx(styles.chip, size === 'md' && styles.chipMd, TONE_CLASS[tone], className)}>
      {children}
    </span>
  )
}

/** 원본 목업의 StatusBadge tone 이름 */
export type StatusTone = 'idle' | 'warn' | 'progress' | 'error' | 'done'

const STATUS_TONE: Record<StatusTone, Tone> = {
  idle: 'muted',
  warn: 'amber',
  progress: 'accent',
  error: 'error',
  done: 'success',
}

/** STEP D 디자인 시스템의 `StepD.StatusBadge` 대응 */
export function StatusBadge({
  tone = 'idle',
  pulse = false,
  children,
}: {
  tone?: StatusTone
  pulse?: boolean
  children: ReactNode
}) {
  return (
    <span className={cx(styles.status, TONE_CLASS[STATUS_TONE[tone]])}>
      <span className={cx(styles.dot, pulse && styles.dotPulse)} />
      {children}
    </span>
  )
}
