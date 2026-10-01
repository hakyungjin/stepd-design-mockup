import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import styles from './Controls.module.css'

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ *
 * Segment — 알약 토글 묶음
 * ------------------------------------------------------------------ */

export function Segment({
  children,
  size = 'sm',
  className,
}: {
  children: ReactNode
  size?: 'sm' | 'lg'
  className?: string
}) {
  return (
    <div className={cx(styles.segment, size === 'lg' && styles.segmentLg, className)}>
      {children}
    </div>
  )
}

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  size?: 'sm' | 'lg'
}

export function Pill({ active = false, size = 'sm', className, ...rest }: PillProps) {
  return (
    <button
      type="button"
      className={cx(
        styles.pill,
        size === 'lg' && styles.pillLg,
        active && styles.pillOn,
        className,
      )}
      {...rest}
    />
  )
}

/* ------------------------------------------------------------------ *
 * Chip — 아웃라인 토글
 * ------------------------------------------------------------------ */

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Chip({ active = false, className, style, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      className={cx(styles.chip, active && styles.chipOn, className)}
      style={style}
      {...rest}
    />
  )
}

/* ------------------------------------------------------------------ *
 * CheckBox — 18px 체크 박스 (실제 input 이 아니라 버튼입니다)
 * ------------------------------------------------------------------ */

export interface CheckBoxProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean
  round?: boolean
  /** 체크 대신 순번 같은 걸 넣고 싶을 때 */
  label?: ReactNode
}

export function CheckBox({
  checked = false,
  round = false,
  label,
  className,
  ...rest
}: CheckBoxProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      className={cx(styles.box, checked && styles.boxOn, round && styles.boxRound, className)}
      {...rest}
    >
      {label ?? (checked ? '✓' : '')}
    </button>
  )
}

/**
 * CheckBox 와 생김새는 같지만 클릭을 받지 않는 표시용 체크.
 * 이미 클릭 가능한 부모(버튼/행) 안에 넣을 때 씁니다 — 버튼 중첩을 피하기 위함.
 */
export function CheckMark({
  checked = false,
  round = false,
  label,
  className,
}: {
  checked?: boolean
  round?: boolean
  label?: ReactNode
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cx(styles.box, checked && styles.boxOn, round && styles.boxRound, className)}
    >
      {label ?? (checked ? '✓' : '')}
    </span>
  )
}

/* ------------------------------------------------------------------ *
 * Select — 네이티브 select (목업의 필터 드롭다운)
 * ------------------------------------------------------------------ */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** 'bordered'(기본) · 'plain'(테두리 없음) · 'pill'(둥근 알약) */
  look?: 'bordered' | 'plain' | 'pill'
}

export function Select({ look = 'bordered', className, ...rest }: SelectProps) {
  return (
    <select
      className={cx(
        styles.select,
        look === 'plain' && styles.selectPlain,
        look === 'pill' && styles.selectPill,
        className,
      )}
      {...rest}
    />
  )
}

/* ------------------------------------------------------------------ *
 * Thumb — 영상 썸네일
 * ------------------------------------------------------------------ */

export function Thumb({
  src,
  width,
  height,
  radius = 4,
  className,
  style,
}: {
  src: string
  width: number
  height: number
  radius?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden
      className={cx(styles.thumb, className)}
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundImage: `url("${src}")`,
        ...style,
      }}
    />
  )
}
