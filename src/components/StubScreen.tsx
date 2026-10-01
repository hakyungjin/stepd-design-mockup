import { PageTopBar } from '@/layout/AppShell'

/** 원본 목업에 화면이 없는 메뉴(상품 링크)용 자리 표시 */
export function StubScreen({ title }: { title: string }) {
  return (
    <>
      <PageTopBar title={title} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          color: 'var(--text-muted)',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12.5 }}>원본 디자인 목업에 아직 이 화면이 없습니다.</div>
      </div>
    </>
  )
}
