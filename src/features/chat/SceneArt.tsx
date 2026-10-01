/** Local storyboard artwork; represents a sample shot, not a broadcast still. */
export function SceneArt({ variant = 0, className, program = '나는 SOLO' }: { variant?: number; className?: string; program?: string }) {
  const palettes = [['#777889', '#445563', '#ceb0a2'], ['#777966', '#48584d', '#c9b48b'], ['#a38d86', '#5d6c78', '#d0afa0'], ['#75828b', '#3c5461', '#b7a195'], ['#9b8a77', '#425b56', '#c6baa5']]
  const [sky, water, shirt] = palettes[variant % palettes.length]
  return <svg className={className} viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="800" height="450" fill={sky} />
    <path d="M0 203L76 187l51 16 88-41 94 36 85-17 78 24 114-34 96 25 118-15v120H0Z" fill="#27343f" opacity=".66" />
    <rect y="237" width="800" height="213" fill={water} />
    <path d="M0 303h160m400-39h180M340 322h192M12 360h232m364-17h168" stroke="#b5b3a5" strokeWidth="2" opacity=".35" />
    <path d="M0 267Q400 193 800 267" fill="none" stroke="#c5b8a7" strokeWidth="2" />
    {[45, 122, 200, 290, 400, 510, 600, 678, 755].map((x, i) => <circle key={x} cx={x} cy={267 - Math.sin(i / 8 * Math.PI) * 36} r="4" fill="#ffe0a3" />)}
    <path d="M0 412Q400 334 800 412v38H0Z" fill="#283036" />
    <path d="M185 450l17-100q12-32 43-35l41-8q50 1 70 39l37 104Z" fill={shirt} />
    <path d="M263 320v-37h44v36q-20 17-44 1" fill="#bb927c" />
    <ellipse cx="280" cy="250" rx="43" ry="57" fill="#c7a28a" />
    <path d="M238 257q-16-62 20-73 57-17 76 33l-14 32-7-29q-34 14-67-2Z" fill="#292827" />
    <path d="M457 450l27-99q10-28 43-38l50-2q45 3 65 35l27 104Z" fill="#c2b6ad" />
    <path d="M527 320v-40h40v38q-18 18-40 2" fill="#c4a08b" />
    <path d="M497 331q-19-69-5-111 12-50 56-41 53 6 54 64l-5 82-21-7-69 13Z" fill="#44352e" />
    <ellipse cx="541" cy="254" rx="37" ry="53" fill="#d4b19a" />
    <path d="M498 235q15-63 57-44l18 34q-39-9-61 19l-11 46Z" fill="#44352e" />
    <path d="M284 264h12m239-1h-11" stroke="#725446" strokeWidth="3" strokeLinecap="round" />
    <path d="M286 283q11 8 20-3m231 1q-9 8-18 0" fill="none" stroke="#916857" strokeWidth="2" />
    <text x="30" y="52" fill="#f5eee6" fontSize="20" letterSpacing="2">{program === '나는 SOLO' ? '나는' : '드라마'}</text>
    <text x="28" y="95" fill="#f5eee6" fontSize="42" fontWeight="700">{program === '나는 SOLO' ? 'SOLO' : program}</text>
  </svg>
}
