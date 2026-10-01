import type { ButtonHTMLAttributes } from 'react'
import styles from './Btn.module.css'

export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type BtnSize = 'xs' | 'sm' | 'md'

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  /** 부모 폭을 꽉 채움 */
  block?: boolean
}

/**
 * STEP D 디자인 시스템의 `StepD.Btn` 에 대응하는 버튼.
 * 목업 원본이 쓰던 variant/size 를 그대로 받습니다.
 */
export function Btn({
  variant = 'secondary',
  size = 'sm',
  block = false,
  className,
  type = 'button',
  ...rest
}: BtnProps) {
  const cls = [styles.btn, styles[variant], styles[size], block ? styles.block : '', className]
    .filter(Boolean)
    .join(' ')
  return <button type={type} className={cls} {...rest} />
}
