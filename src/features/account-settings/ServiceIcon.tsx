import type { AccountPlugin } from './types'

// Unmodified service assets hosted by Google and Slack.
const serviceLogos = {
  email: 'https://fonts.gstatic.com/s/i/productlogos/gmail_2020q4/v10/192px.svg',
  slack: 'https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png',
  drive: 'https://www.gstatic.com/images/branding/productlogos/drive_2026/v2/web-64dp/logo_drive_2026_color_2x_web_64dp.png',
}

export function ServiceIcon({ icon }: { icon: AccountPlugin['icon'] }) {
  if (icon !== 'report') return <img src={serviceLogos[icon]} alt="" width="26" height="26" referrerPolicy="no-referrer" />
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 16v-3m4 3V8m4 8v-5" /></svg>
}
