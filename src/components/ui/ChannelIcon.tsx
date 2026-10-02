/*
 * 배포 채널 아이콘 — STEPD 본 저장소가 쓰는 공식 아이콘 그대로입니다.
 *
 * 파일은 `apps/web/public/channel-icons/*.png` 를 옮겨 왔고,
 * 이름도 본 저장소의 채널 id(youtube·naverclip·…)와 맞춰 뒀습니다.
 * STEPD 에 붙일 때는 이 파일을 지우고 본 저장소의 DISTRIBUTION_CHANNELS 를 쓰면 됩니다.
 */

/** 본 저장소 `DISTRIBUTION_CHANNELS` 의 채널 id */
export type ChannelId = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'naverclip' | 'daumloop'

const ICON: Record<ChannelId, string> = {
  youtube: 'youtube.png',
  instagram: 'instagram.png',
  facebook: 'facebook.png',
  tiktok: 'tiktok.png',
  naverclip: 'naver.png',
  daumloop: 'daum.png',
}

const LABEL: Record<ChannelId, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  naverclip: '네이버 클립',
  daumloop: '다음 루프',
}

/** 목업이 쓰던 두 글자 키(YT·NC·TT·IG)와 채널 이름을 본 저장소 id 로 옮깁니다 */
export function channelIdOf(value: string): ChannelId {
  const key = value.toLowerCase()
  if (key === 'yt' || key.includes('youtube') || key.includes('유튜브')) return 'youtube'
  if (key === 'nc' || key.includes('네이버') || key.includes('naver')) return 'naverclip'
  if (key === 'tt' || key.includes('tiktok') || key.includes('틱톡')) return 'tiktok'
  if (key === 'ig' || key.includes('instagram') || key.includes('인스타')) return 'instagram'
  if (key === 'fb' || key.includes('facebook') || key.includes('페이스북')) return 'facebook'
  if (key === 'dl' || key.includes('다음') || key.includes('daum')) return 'daumloop'
  return 'youtube'
}

export const channelLabel = (value: string) => LABEL[channelIdOf(value)]

/**
 * 채널 아이콘 한 개.
 * `channel` 에는 'YT' 같은 키도, 'YouTube · ENA 공식' 같은 이름도 넣을 수 있습니다.
 */
export function ChannelIcon({
  channel,
  size = 16,
  className,
}: {
  channel: string
  size?: number
  className?: string
}) {
  const id = channelIdOf(channel)
  return (
    <img
      className={className}
      src={`${import.meta.env.BASE_URL}channel-icons/${ICON[id]}`}
      alt=""
      width={size}
      height={size}
      draggable={false}
      style={{ width: size, height: size, objectFit: 'contain', flex: 'none' }}
    />
  )
}
