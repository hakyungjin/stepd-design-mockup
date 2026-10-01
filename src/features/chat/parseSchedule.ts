/*
 * 채팅 문장에서 예약 일정을 읽어 냅니다.
 * "매일 아침 9시에 배포 오류 정리해줘" → 매일 09:00 · 이름 "배포 오류 정리"
 *
 * 반복 표현(매일·평일·매주 X요일·내일·모레·M월 D일)이 있을 때만 제안합니다.
 * 시간만 있으면 언제부터 반복인지 알 수 없어 제안하지 않습니다.
 */

import { seoulDate, type Repeat, type TaskDraft } from './useScheduledTasksMock'

const DAY_INDEX: Record<string, number> = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }

/** 이름에서 걷어 낼 일정·말투 표현 */
const NOISE = [
  /매일\s*(아침|오전|오후|저녁|밤)?/g,
  /(평일|주중)\s*(아침|오전|오후|저녁|밤)?/g,
  /매주\s*[일월화수목금토]요일?/g,
  /[일월화수목금토]요일\s*마다/g,
  /(내일|모레|오늘)\s*(아침|오전|오후|저녁|밤)?/g,
  /\d{1,2}\s*월\s*\d{1,2}\s*일/g,
  /(오전|오후)?\s*\d{1,2}\s*시(\s*\d{1,2}\s*분)?/g,
  /\d{1,2}:\d{2}/g,
  /(해줘|해 줘|해주세요|해 주세요|부탁해|부탁드려요|알려줘|알려주세요|정리해줘|보내줘)/g,
]

const addDays = (n: number) => seoulDate(new Date(Date.now() + n * 86_400_000))

/** "오전 9시" · "18:30" · "9시 30분" → "09:00" 형태 */
function readTime(text: string): string | null {
  const hhmm = text.match(/(\d{1,2}):(\d{2})/)
  if (hhmm) {
    const h = Number(hhmm[1])
    if (h < 24 && Number(hhmm[2]) < 60) return `${String(h).padStart(2, '0')}:${hhmm[2]}`
  }
  const korean = text.match(/(오전|오후|아침|저녁|밤)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/)
  if (korean) {
    let h = Number(korean[2])
    const period = korean[1]
    if (h > 23) return null
    // "오후 6시" → 18시, "저녁 7시" → 19시. 이미 13시 이상이면 그대로 둡니다.
    if ((period === '오후' || period === '저녁' || period === '밤') && h < 12) h += 12
    if ((period === '오전' || period === '아침') && h === 12) h = 0
    const m = korean[3] ? Number(korean[3]) : 0
    if (m > 59) return null
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return null
}

function readRepeat(text: string): { repeat: Repeat; weekday: number; date: string } | null {
  if (/매일|날마다/.test(text)) return { repeat: 'daily', weekday: 1, date: '' }
  if (/평일|주중/.test(text)) return { repeat: 'weekdays', weekday: 1, date: '' }

  const weekly = text.match(/매주\s*([일월화수목금토])요일?/) ?? text.match(/([일월화수목금토])요일\s*마다/)
  if (weekly) return { repeat: 'weekly', weekday: DAY_INDEX[weekly[1]], date: '' }

  if (/내일/.test(text)) return { repeat: 'once', weekday: 1, date: addDays(1) }
  if (/모레/.test(text)) return { repeat: 'once', weekday: 1, date: addDays(2) }

  const md = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/)
  if (md) {
    const year = new Date().getFullYear()
    const date = `${year}-${md[1].padStart(2, '0')}-${md[2].padStart(2, '0')}`
    return { repeat: 'once', weekday: 1, date }
  }
  return null
}

/** 일정 표현을 걷어 낸 나머지를 작업 이름으로 씁니다 */
function readName(text: string): string {
  let rest = text
  NOISE.forEach((re) => {
    rest = rest.replace(re, ' ')
  })
  const cleaned = rest
    .replace(/\s+/g, ' ')
    .trim()
    // 일정을 걷어 내면 조사가 앞에 남습니다
    .replace(/^(에서|부터|까지|에|은|는|이|가|을|를|와|과|및|,|·)\s*/, '')
    .trim()
    .replace(/[.,·]+$/, '')
  if (cleaned.length >= 2) return cleaned.slice(0, 30)
  return text.trim().slice(0, 24)
}

/** 문장에서 예약 작업 초안을 만듭니다 — 일정이 없으면 null */
export function parseSchedule(text: string): TaskDraft | null {
  const when = readRepeat(text)
  if (!when) return null
  return {
    name: readName(text),
    instructions: text.trim(),
    repeat: when.repeat,
    time: readTime(text) ?? '09:00',
    weekday: when.weekday,
    date: when.date || seoulDate(new Date(Date.now() + 86_400_000)),
    emailNotification: false,
  }
}
