# STEP D 목업 (React + TypeScript)

claude.ai/design 의 **Automatic deployment UI mockups** 프로젝트에 있는 화면 전부를
**React 19 + TypeScript + Vite** 로 옮긴 것입니다.
나중에 STEPD 본 프로젝트에 붙이기 쉽도록, 화면·상태·규칙·데이터를 층으로 나눠 두었습니다.

```bash
npm install
npm run dev        # http://localhost:5273
npm run typecheck  # tsc --noEmit
npm run build      # 타입체크 + 프로덕션 빌드
```

---

## 대화형 영상 작업 공간

기본 진입 화면은 채팅 + 작업 보드입니다. `http://localhost:5273/` 또는 `#chat`에서 STEP D 영상분석 에이전트 기획서의 화면을 확인할 수 있습니다. 별도 홈 화면과 홈 메뉴는 제거했습니다.
Chatscope React 채팅 UI를 사용하며, 첫 화면은 하이라이트 구성안을 수정하는 예시 대화입니다.

- 새 채팅에서 영상 검색, 숏폼 편집, 하이라이트 구성, 채널 시안, 자동배포 계획을 요청할 수 있습니다.
- 작업 보드에서 미리보기, 장면 순서·제외, 자막·구간·비율, 배포 조건, 버전 복원과 승인을 체험합니다.
- 초안 변경 시 승인이 초기화됩니다. 실제 제작·채널 변경·발행은 실행하지 않습니다.
- 기존 예약 작업과 계정 설정의 이메일 플러그인 목업은 같은 공간에서 사용할 수 있습니다.
- 사이드바 상단의 알림함에서 미디어 @언급을 확인하고 해당 영상·버전·댓글로 이동합니다. 전체/미읽음, 모두 읽음과 예시 알림 3개를 제공합니다. 댓글과 읽음 상태는 화면 이동 중 유지되며 새로고침 시 초기화됩니다.
- 작은 화면은 대화 / 작업 보드 전환 방식입니다. 방송 스틸 대신 로컬 샘플 일러스트를 표시합니다.

목업 흐름 검증: `node scripts/check-agent-mock.mjs` (Node 24)

---

## 화면 (11개)

주소는 해시 라우팅입니다. 원본 `STEP D 통합.dc.html` 이 쓰던 키를 그대로 씁니다.

| 화면 | 주소 | 원본 |
| --- | --- | --- |
| 대시보드 | `#dashboard` | `대시보드.dc.html` |
| 프로그램 | `#programs` | `프로그램.dc.html` |
| 영상 분석 | `#analysis` | `영상분석.dc.html` |
| 미디어 | `#media` | `미디어.dc.html` |
| 배포 | `#dist` | `배포.dc.html` |
| 배포 캘린더 | `#schedule` | `배포 캘린더.dc.html` |
| 성과 | `#performance` | `성과.dc.html` |
| 배포 채널 | `#channels` | `배포 채널.dc.html` |
| 자동 배포 | `#auto` | `w_auto.dc.html` |
| 영상 검색 | `#search` | `영상검색.dc.html` |
| 조립 편집기 | `#editor-short` `#editor-clip` `#editor-hl` | `조립 편집기.dc.html` |

좌측 내비의 **상품 링크**는 원본 목업에 화면이 없어 자리 표시만 있습니다.

### 화면별로 살아 있는 동작

- **대시보드** — 누적 수익 스파크라인, 검수·승인 시 상태 변화, 각 행에서 스케줄/성과/배포로 이동
- **프로그램** — 목록(카드·표) → 프로그램 홈 → 설정 3뷰, 회차 재분석, 출연자 편집·사진 모달, 국가 제한·재생목록 추가, 이름 확인 삭제
- **영상 분석** — 분석 이력 · 진행 화면 · 결과(숏폼/클립/하이라이트/등장 인물 탭), 미등록 인물 등록, 생성물 상세 드로어
- **미디어** — 출처 탭(추천/업로드), 상태 요약 6종, 목록·카드 2 레이아웃, 다중 선택 배포 바, 채널별 메타데이터 편집, 업로드 진행 시뮬레이션,
  상세 모달의 **버전 · 댓글 패널**(버전별 필터, 새 버전 올리기, 이전 버전으로 되돌리기, `@` 멘션 자동완성)
- **배포** — 실패 원인별 "손볼 것" 묶음과 일괄 재시도, 채널 매트릭스, 상세 드로어
- **배포 캘린더** — 오늘/주간/월간, 드래그 이동, 영상 교체 팝오버, 상세 드로어, 배포 추가(단건 5단계 · 묶음 자동배치), 변경 이력
- **성과** — 기간·채널·유형 필터, 이벤트 마커가 있는 수익 추이 차트(호버 툴팁), 정렬 가능한 콘텐츠 테이블, 인사이트
- **배포 채널** — 재연결 필요 패널, 한눈에 보기/플랫폼별 2 레이아웃, 공개 범위·고정 문구 설정, 연동 해제·삭제 확인
- **자동 배포** — 규칙 목록·필터·페이지네이션, 전체 일시정지, 규칙 드로어(발행 예정 / 전체 영상 / 설정),
  플랫폼 × 날짜·시각 발행 계획표(칸 누르기로 교체·빼기, 끌어 놓기로 이동, 막힌 것 패널),
  영상 상세(타이틀 후보·강조색·게시물 정보 / 자막 줄 편집·시각 넉지·저장 후 재렌더),
  설정(프로그램 다중 선택·소재 종류·요일·발행 시각 타임라인·하루 한도·템플릿 미리보기와 배치 값·알림 수신자·삭제),
  4단계 자동배포 추가 마법사
- **영상 검색** — 문장 검색(인물·장면 해석), 필터, 결과 그리드, 구간 상세 모달
- **조립 편집기** — 숏폼/클립/하이라이트 3모드, 미리보기(세이프 영역·크롭 가이드·자막), 조각 순서 드래그, AI 추천 삽입, 스타일·내보내기 설정

모든 변경은 **브라우저 메모리에만** 남습니다. 새로고침하면 초기 시드로 돌아갑니다.

---

## 폴더 구조

```
src/
├─ main.tsx / App.tsx              진입점 + 화면 스위치
├─ app/
│   ├─ screens.ts                  화면 키 · 좌측 내비 구성
│   └─ useHashRoute.ts             해시 라우팅 (STEPD 라우터로 교체할 자리)
├─ styles/
│   ├─ tokens.css                  STEP D 디자인 토큰 (라이트/다크)
│   └─ global.css                  리셋 + 폰트 + 스크롤바
├─ lib/
│   ├─ date.ts                     날짜·시간 유틸
│   └─ frames.ts                   목업용 프레임 썸네일 생성기
├─ components/ui/                  Btn, Badge/Chip/StatusBadge, Pill/Segment,
│                                  Chip, CheckBox/CheckMark, Select, Thumb, ConfirmDialog
├─ layout/AppShell.tsx             좌측 내비 셸 + PageTopBar (연동 시 버리는 부분)
└─ features/
    ├─ dashboard/ performance/ video-search/
    ├─ deploy/ deploy-calendar/ channels/
    ├─ programs/ analysis/ media/
    ├─ auto-deploy/ editor/
    └─ 각 폴더: data.ts (목 데이터) · *Page.tsx · *Page.module.css
```

각 feature 폴더는 같은 모양입니다.

- `data.ts` — **서버가 줄 데이터의 스텁**. 연동 시 통째로 버리는 파일
- `*Page.tsx` — 화면. 데이터는 props 또는 `data.ts` 기본값으로만 받습니다
- `*Page.module.css` — CSS Modules. **하드코딩된 색이 없고 전부 토큰 변수**를 참조합니다
  (플랫폼/상태/유형 고유색만 `data.ts`·`constants.ts` 에서 관리)

배포 캘린더와 자동 배포는 규모가 커서 한 단계 더 나뉘어 있습니다.

```
features/deploy-calendar/
├─ index.ts                    ★ 공개 API
├─ types.ts                    도메인 타입 (서버 DTO 와 맞출 자리)
├─ constants.ts                플랫폼/프로그램/상태/유형/슬롯/템플릿 정책
├─ domain/rules.ts             순수 검증 규칙 (서버와 공유할 로직)
├─ hooks/useDeployCalendar.ts  상태 + 모든 동작
└─ components/                 툴바·요약·3개 뷰·카드·팝오버·드로어·모달·토스트

features/auto-deploy/
├─ index.ts                    ★ 공개 API
├─ types.ts                    Rule · Hold · Cue · PlanEntry · WizardForm
├─ constants.ts                플랫폼 제약 · 템플릿 프리셋 · 제목색 · 자막 상한 · 시각 유틸
├─ data/mockData.ts            규칙 14개 · 클립 풀 · 발행 기록 시드
├─ domain/plan.ts              기본 계획 생성 · 배치 가능 검사 · 변경 요약
├─ hooks/useAutoDeploy.ts      상태 + 모든 동작 (TODO(api) 7곳)
└─ components/                 계획표·팝오버·영상 상세(자막 편집)·전체 영상·설정·마법사·모달
```

---

## STEPD 에 붙이는 순서

### 1. 폴더 복사

`src/features/<화면>/`, `src/components/ui/`, `src/lib/` 을 그대로 옮깁니다.
`src/styles/tokens.css` 는 STEPD 에 같은 토큰이 이미 있으면 생략하세요.

### 2. 라우트에 꽂기

```tsx
import { DeployCalendarPage } from '@/features/deploy-calendar'

<Route path="/deploy/schedule" element={<DeployCalendarPage />} />
```

`AppShell` 과 `useHashRoute` 는 목업용이라 옮기지 않습니다.
화면 컴포넌트는 라우터를 직접 모르고, `onNavigate(screenKey)` 콜백만 받습니다 —
STEPD 의 `navigate()` 로 바꿔 끼우면 됩니다.

### 3. 실제 데이터 넣기

배포 캘린더가 대표적인 모양입니다. 모든 데이터를 props 로 받고, 없으면 목 데이터를 씁니다.

```tsx
<DeployCalendarPage
  videos={videos}          // Record<videoId, Video>
  initialItems={items}     // DeployItem[]
  initialHistory={history} // HistoryEntry[]
  archiveFor={archiveFor}  // (date) => ArchiveItem[]
  now={new Date()}         // 목업 기본값은 2026-09-30 09:00 고정
  currentUser={me.name}
/>
```

다른 화면도 같은 방식으로 `data.ts` 의 export 를 API 응답으로 바꾸면 됩니다.

### 4. 서버 호출 붙이기

배포 캘린더는 `hooks/useDeployCalendar.ts` 안에 `TODO(api)` 주석이 붙은 7곳이 전부입니다.

| 동작 | 붙일 API |
| --- | --- |
| `moveItem` | `PATCH /deploys/:id { date, time }` |
| `swapVideo` | `PATCH /deploys/:id { videoId }` |
| `togglePlatform` | `PATCH /deploys/:id { platforms }` |
| `retryPlatform` | `POST /deploys/:id/platforms/:key/retry` |
| `cancelItem` | `DELETE /deploys/:id` |
| `addSingle` | `POST /deploys` |
| `addBulk` | `POST /deploys/bulk` |

자동 배포는 `hooks/useAutoDeploy.ts` 안에 `TODO(api)` 주석이 붙은 7곳입니다.

| 동작 | 붙일 API |
| --- | --- |
| `place` / `replaceIn` | `PATCH /auto-rules/:id/plan` |
| `removeFrom` | `DELETE /auto-rules/:id/plan/:slot` |
| `saveCues` | `PUT /holds/:id/cues` |
| `saveHold` | `PUT /holds/:id` |
| `save` | `PUT /auto-rules/:id` |
| `removeRule` | `DELETE /auto-rules/:id` |
| `wzCreate` | `POST /auto-rules` |

다른 화면은 아직 로컬 상태만 바꾸는 낙관적 업데이트입니다.
실패 시 롤백 + 토스트만 추가하면 됩니다.

### 5. 상수 정렬

`constants.ts` / `data.ts` 의 값은 목업 기준으로 하드코딩돼 있습니다. 서버와 맞춰야 할 것:

- 상태 한글 리터럴 ↔ 서버 enum (`types.ts`)
- 배포 캘린더의 `DAILY_LIMIT`(프로그램별 하루 상한), `SLOTS`, `PER_SLOT`
- 자동 배포의 화면비/템플릿/썸네일/리프레임/언어 목록
- 미디어의 채널별 메타데이터 규격(`generateMeta`)

### 6. 썸네일 · 영상

`Video.thumb` 같은 필드는 전부 그냥 문자열 URL입니다.
`lib/frames.ts` 의 `frameThumb()` 대신 실제 CDN URL 을 넣으면 컴포넌트는 손댈 필요가 없습니다.

---

## 원본과 다른 점

원본 목업을 그대로 옮기되, 아래 몇 가지는 의도적으로 바꿨습니다.

- **썸네일·영상은 플레이스홀더입니다.** 원본은 `assets/frames/f1~12.jpg`(방송 스틸)과
  `preview-shorts.mp4` / `preview-clip.mp4` 를 씁니다. 목업에서는 외부 파일 없이 동작하도록
  같은 개수의 결정적 그라디언트 SVG 를 생성해 넣었습니다. 영상 플레이어 자리에는
  대표 프레임과 안내 문구를 표시합니다.
- **`window.confirm` → 인앱 확인 창.** 브라우저 모달은 화면 전체를 막고 스타일도 맞지 않아
  `components/ui/ConfirmDialog` 로 바꿨습니다.
- **조립 편집기 보드가 어둡습니다.** 원본은 밝은 보드(`#F5F7FA`)에 다크 토큰 글자색을 써서
  다크 모드에서 글자가 보이지 않습니다. 읽히도록 보드도 다크로 맞췄습니다.
  숏폼·클립 모드에서는 플레이어가 한쪽으로 쏠리지 않도록 가운데 정렬했습니다.
- **좌측 내비를 고정했습니다** (`position: sticky`). 원본은 본문과 함께 스크롤돼서
  배포·미디어처럼 긴 화면에서는 내비가 화면 밖으로 사라집니다.
- **프로그램 홈의 미디어 썸네일 색을 낮췄습니다.** 원본 값(`oklch(0.86 …)`)은 밝은 테마
  기준이라 다크 UI에서 튑니다.
- **미디어의 인라인 편집 모달**은 조립 편집기와 같은 화면이라, "편집" 버튼이 편집기 화면으로
  이동하도록 연결했습니다.
- **미디어 상세의 버전 · 댓글 패널은 원본에 없습니다.** 영상 버전 관리와 협업 소통이 필요해
  새로 넣었습니다 (`media/CommentPanel.tsx`). 사람 목록은 `data.ts` 의 `MEMBERS`,
  서버 붙일 자리는 `TODO(api)` 로 표시해 두었습니다.

### 자동 배포에서 원본과 다른 점

원본 `w_auto.dc.html` 을 그대로 옮기되, 아래 네 가지만 손봤습니다.

- **영상 상세를 열 때 계획표를 다시 짜지 않습니다.** 원본은 고른 영상을 `holds` 맨 앞으로
  옮기는데, 기본 계획이 `holds` 순서에서 나오다 보니 상세를 열 때마다 편성이 뒤바뀌어
  "발행 예정"이 **편성 안 됨**으로 보였습니다. 순서를 건드리지 않도록 바꿨습니다.
- **발행 시각 드롭다운에 현재 값을 넣어 줍니다.** 원본 후보는 06/09/12:30/15/18/21/23시인데
  규칙 데이터에는 19:00·19:30·20:00 이 있어, 설정 화면에서 엉뚱한 시각이 선택돼 보였습니다.
- **발행 기록 패널은 버튼이 없습니다.** 원본도 `tab === 'runs'` 를 렌더하지만 탭 버튼을 만들지
  않아 화면에서 열리지 않습니다. 원본 그대로 두었고, 코드는 `components/RunsTab.tsx` 에 있습니다.
- **영상 재생 창은 안내 화면입니다.** 원본은 `preview-shorts.mp4` / `preview-clip.mp4` 를 재생하고,
  실패하면 같은 안내 화면을 보여 줍니다. 목업에는 파일이 없어 안내 화면만 남겼습니다.
  (계획표 칸의 썸네일은 `lib/frames.ts` 플레이스홀더, 상세의 미리보기 상자는 원본과 같은 빈 상자입니다)

## 그 밖에 알아둘 점

- **"지금"이 고정돼 있습니다.** 배포 캘린더는 `MOCK_NOW = 2026-09-30 09:00`,
  자동 배포는 2026-09-29 14:00(`NOW_T`) 기준입니다. 목업이 매일 달라지지 않게 한 것입니다.
- **자동 배포 화면은 원본 DC 프로퍼티를 props 로 받습니다** — `planDays`(3·7),
  `density`(여유·촘촘), `cardLook`(썸네일·텍스트). 기본값은 원본과 같습니다.
- **폰트는 CDN 링크입니다** (`index.html`). Outfit 은 Google Fonts, Spoqa Han Sans Neo 는 jsDelivr.
  STEPD 는 이미 폰트를 로드할 테니 해당 `<link>` 는 지우면 됩니다.
- **다크 모드 전용으로 열립니다.** `index.html` 의 `<html class="dark">` 때문이며,
  `tokens.css` 에 라이트 토큰도 함께 들어 있어 클래스만 빼면 라이트로 렌더됩니다.
- **검증 규칙은 클라이언트에만 있습니다.** 상한·중복 검사는 UX 용이고, 실제 서비스에서는
  서버가 같은 규칙을 다시 검사해야 합니다.
- 화면 폭은 원본과 같게 `min-width: 1280px` 입니다 (편집기도 동일).
