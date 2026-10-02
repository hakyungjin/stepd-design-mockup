import type { AccountPlugin } from './types'

// Unmodified service assets hosted by Google.
const serviceLogos: Record<AccountPlugin['icon'], string> = {
  email: 'https://fonts.gstatic.com/s/i/productlogos/gmail_2020q4/v10/192px.svg',
  drive: 'https://www.gstatic.com/images/branding/productlogos/drive_2026/v2/web-64dp/logo_drive_2026_color_2x_web_64dp.png',
}

export function ServiceIcon({ icon }: { icon: AccountPlugin['icon'] }) {
  return <img src={serviceLogos[icon]} alt="" width="26" height="26" referrerPolicy="no-referrer" />
}
