# 🗺 America Travel — 북미 사업개발 로드맵

> 2026년 6/26 ~ 7/4 미국 출장(SF / Yosemite / Seattle / Las Vegas) 일정·예약 전략을 Plan A·Plan B 두 시나리오로 비교 관리하는 Vue 3 SPA.

**Live**: https://america-travel.vercel.app/
**Repo**: https://github.com/andypsh/america_travel

---

## 1. 프로젝트 개요

월드컵 R32 한국 조 순위가 6/24 경기 결과로 확정되기 전, **하나의 일정으로 두 시나리오(시애틀 R32 / LA 한국전)**를 동시에 준비해야 하는 출장. 호텔·항공은 환불 정책 안에서 양쪽 다 예약해두고, 6/24 후 한쪽을 취소하는 의사결정 트리를 UI로 시각화.

**핵심 도메인 문제**
- Plan A (조3위): SF 1박 → YOS 1박 → SF 2박 → SEA 1박 → LV 3박
- Plan B (조2위): SF 1박 → YOS 1박 → SF 3박(LA 당일치기 포함) → LV 3박
- 6/30 단 하루만 다른 도시(SEA vs SF) → 분기 비용 최소화 설계

---

## 2. 기술 스택

| 분류 | 선택 | 이유 |
|---|---|---|
| Framework | **Vue 3 (Composition API)** | `<script setup>` 보일러플레이트 최소, 반응성 추적 명시적 |
| Build | **Vite 4.5** | HMR 1초 미만, 호환성(Node 16) 위해 5 대신 4 고정 |
| Styling | **Scoped CSS + Custom Properties** | 컴포넌트 격리 + 디자인 토큰화로 다크 톤 일괄 제어 |
| State | **Native ref / computed** | Pinia·Vuex 불필요 — 단일 컴포넌트 트리에서 props·reactive로 충분 |
| Hosting | **Vercel (Static)** | Git 푸시 → 자동 빌드/배포 + 글로벌 CDN + 자동 HTTPS |
| CI/CD | **Vercel Git Integration** | main 푸시 감지 → `vite build` → CDN 게시 (별도 워크플로 작성 불필요) |

---

## 3. 아키텍처

순수 클라이언트 SPA. 백엔드·DB 없음. 모든 도메인 데이터(일정·호텔·예약 액션)는 컴포넌트 내부 상수로 선언 → 빌드 시 정적 번들에 인라인.

```
┌─────────────────────────────────────────┐
│  Browser (https://america-travel...)    │
│  ┌─────────────────────────────────┐    │
│  │  index.html → main.js           │    │
│  │     ↓                           │    │
│  │  App.vue (shell)                │    │
│  │     ↓                           │    │
│  │  TravelItinerary.vue (메인)     │    │
│  │     - aDays / laDays            │    │
│  │     - aHotels / laHotels        │    │
│  │     - bookingItems              │    │
│  │     - sleepByNight              │    │
│  │     - computed: currentDays...  │    │
│  └─────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │ (CDN edge fetch)
               ▼
       Vercel Global Edge Network
               ▲
               │ (build artifact push)
        Vercel Build Container
               ▲
               │ (git push trigger)
        GitHub (origin/main)
```

### 디렉토리

```
.
├── App.vue              # 사이드바 + 메인 콘텐츠 셸
├── TravelItinerary.vue  # 핵심 — 플랜 토글 / 일정 타임라인 / 예약 전략
├── PredictionTracker.vue  # (legacy, dev 브랜치에만 활성)
├── PriceChartLW.vue     # (legacy, 차트 컴포넌트)
├── api.js               # (legacy, 백엔드 호출용 — feature_andy에선 미사용)
├── main.js              # Vue 앱 부트스트랩
├── index.html
├── style.css            # 글로벌 디자인 토큰 (다크 테마)
├── vite.config.js
├── package.json
└── README.md
```

---

## 4. 브랜치 전략 (Gitflow-lite)

```
main ──── (production · Vercel auto-deploy)
  ▲
  │ fast-forward merge
  │
dev ───── (통합 · QA용)
  ▲
  │ feature 작업 후 PR
  │
feature_andy ── (current WIP)
```

| 브랜치 | 역할 | 트리거 |
|---|---|---|
| `main` | Vercel 프로덕션 배포 소스 | 푸시 시 자동 빌드/배포 |
| `dev` | 통합 단계 (3탭 버전 등 풍부한 상태도 보관 가능) | 수동 |
| `feature_andy` | 현재 작업 브랜치 — 단일 사업개발 뷰 + 가독성 향상 | 매 작업 단위 커밋 |

**규칙**
- 새 기능/수정 → `feature_andy` 에서 커밋
- 안정화 → `dev` 로 fast-forward merge
- 배포 준비 완료 → `main` 으로 fast-forward merge → Vercel 자동 배포
- 모든 머지는 **fast-forward only** (`git merge --ff-only`) — 선형 히스토리 유지

---

## 5. 배포 (Vercel)

### 5-1. 초기 설정 (한 번)
1. GitHub에서 빈 repo 생성 (`andypsh/america_travel`)
2. 로컬에서 `git init` → 파일 add → first commit → `git remote add origin ...`
3. `git push -u origin main` 으로 첫 푸시
4. Vercel 대시보드에서 **New Project** → GitHub repo 연결 → Framework 자동 감지 (Vite) → Deploy

### 5-2. 빌드 파이프라인
| 단계 | 명령 | 산출물 |
|---|---|---|
| Install | `npm install` (Vercel 자동) | `node_modules/` |
| Build | `npm run build` → `vite build` | `dist/` (HTML·JS·CSS·assets) |
| Deploy | Vercel이 `dist/` 를 자체 Edge CDN에 게시 | `https://america-travel.vercel.app` |

### 5-3. 자동 배포 흐름
```
local: git push origin main
            │
            ▼
GitHub: origin/main 갱신
            │ (webhook)
            ▼
Vercel: 빌드 컨테이너 spin up
        → npm install
        → vite build
        → dist/ 업로드
            │
            ▼
CDN: 글로벌 edge에 분산 (수십 초 내)
            │
            ▼
사용자: https://america-travel.vercel.app/ 새 버전 반영
```

### 5-4. 무료 티어 한도
- 100 GB/월 대역폭 (이 정도 트래픽 없음)
- 6000분/월 빌드 시간 (1빌드 ≈ 30초)
- PR/브랜치별 프리뷰 URL 자동 생성 — `america-travel-git-feature-andy-andypsh.vercel.app` 식

---

## 6. 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 (HTTPS, self-signed cert)
npm run dev
# → https://localhost:5173/
```

**Node 호환**
- Node 16+ (Vite 4.5 최소)
- Node 18+ 권장 (Vite 5 호환을 위해 — 추후 업그레이드 시)

**Vite 설정 포인트** (`vite.config.js`)
- `@vitejs/plugin-basic-ssl` — 로컬 HTTPS (`https://localhost:5173`)
- `proxy: { '^/api/': ... }` — 정규식 매칭으로 `/api.js` 같은 로컬 파일과 충돌 회피
- `../config/ports.json` fallback — 외부 설정 없으면 5173/8000 기본값 사용

---

## 7. 주요 기술적 결정

### 7-1. CSS 디자인 토큰 (Theme as Data)
글로벌 `:root` 에 색·radius·shadow·transition을 변수로 선언. 컴포넌트는 `var(--text)` 처럼 참조만 함 → 다크 톤 전역 일괄 조정 가능.

```css
:root {
  --bg:           #0d1117;
  --text:         #ffffff;
  --text-muted:   #f1f5fa;
  --accent:       #58a6ff;
  --radius:       10px;
  --transition:   all .18s cubic-bezier(.4,0,.2,1);
}
```

`TravelItinerary.vue` 는 `:host` 레벨에서 같은 토큰을 **오버라이드** 해 컴포넌트 단위로 톤을 살짝 다르게(밝은 다크) 만들 수 있게 했다. CSS-in-JS 없이 cascade 만으로 해결.

### 7-2. 데이터-주도 UI
모든 일정·호텔·예약 항목은 배열로 선언 → `v-for` 로 렌더. UI는 데이터의 함수. 새 일정 추가 = 배열 한 줄 추가.

```js
const sleepByNight = [
  { date: '6/26 금', a: 'SF · Palace Hotel', b: 'SF · Palace Hotel', same: true, action: 'now', note: '...' },
  { date: '6/30 화', a: 'SEA · Hyatt',       b: 'SF · Palace Hotel', same: false, action: 'standby', note: '🔀 분기' },
  ...
]
```

### 7-3. 플랜 토글 = 단일 ref 스위치
```js
const activePlan = ref('a')
const currentDays = computed(() => activePlan.value === 'a' ? aDays : laDays)
const currentHotels = computed(() => activePlan.value === 'a' ? aHotels : laHotels)
```
플랜 비교 같은 도메인은 두 데이터셋을 다 들고 있다가 토글 한 줄로 스위치하는 게 가장 단순. 별도 상태관리 라이브러리 없음.

### 7-4. 가독성 (다크 + 큰 글자 + 굵게)
- `html { font-size: 17px }` (기본 14px → 21% 상향)
- `body { font-weight: 500 }` — 본문 굵기 기본 상향
- `--text-dim` 을 거의 흰색까지 끌어올림 → 다크 베이스에서도 dim 텍스트 또렷
- 일정 본문 폰트 .77rem → .88rem, weight 500

---

## 8. 디버깅 회고

실제 작업 중 만난 함정과 해결.

### 8-1. 빈 화면 (white screen of death)
`index.html` 이 `/src/main.js` 를 참조 → 실제 파일은 루트에 `main.js`. 빌드 도구가 못 찾아 모듈 로드 실패 → 앱 마운트 안 됨.
**해결**: `<script type="module" src="/main.js">` 로 경로 수정.

### 8-2. Vite 프록시 광범위 매칭
```js
// 처음 (잘못):
proxy: { '/api': { target: 'http://localhost:8000' } }
```
`/api` 로 시작하는 모든 경로를 프록시 → `App.vue` 가 `./api.js` import 시 `/api.js` 요청 → 프록시가 가로채 죽은 백엔드(:8000)로 보냄 → 모듈 로드 실패 → 빈 화면.

```js
// 수정 (정규식 prefix):
proxy: { '^/api/': { target: '...' } }
```
`^/api/` (슬래시 포함) 로 매칭 좁힘 → `/api.js` 는 로컬 파일로 정상 서빙.

### 8-3. Node 16 + Vite 5 비호환
`crypto$2.getRandomValues is not a function` 에러. Vite 5는 Node 18+ 가 최소.
**해결**: `vite ^5.4 → ^4.5`, `@vitejs/plugin-vue ^5 → ^4.6` 로 다운그레이드. Vite 4는 Node 14.18+ 지원.

### 8-4. 다른 워크트리에서 푸시된 commit 보존
다른 Claude 세션이 `main` 에 `chore: 브라우저 탭 제목 변경` (1줄) 푸시. 내 `feature_andy` 와 분기.
**해결**: 해당 커밋만 `git cherry-pick 30cfd15` 로 가져온 후 `main → dev → feature_andy` 모두 같은 시작점으로 정렬.

---

## 9. UX 의사결정 노트

### 9-1. "오늘 어디서 잠?" 표 추가
초기엔 예약 항목 리스트만 있었다. 사용자가 *"요세미티 가면 SF 따로 예약해야 하잖아"* 라는 피드백 → 추상적 리스트론 일정·예약·도시가 한눈에 안 잡힘.

→ **일자별로 행을 잡고, A/B 잠자리를 같은 행에서 비교**. 분기 행(6/30)만 주황 강조. 사용자가 *"내일 어디서 자지?"* 한 줄로 답 찾음.

### 9-2. SF 4박 통박 → 1+2박 분리 + Luggage Storage 트릭
초안: SF 4박을 통째 예약 (Yosemite 가는 6/27 밤도 빈방 유지, 짐 보관용).
사용자 지적: *"돈 아깝잖아, 짐만 보관해달라고 요청하면 안되나"*
→ **체크아웃 + 무료 luggage storage 요청 → 6/28 같은 호텔로 재체크인** 으로 변경.
효과: SF 1박 ($190~230) 절약 + 6월 시즌 비싼 1박값 회피.

표·예약 항목·decisions 트리·"핵심 트릭" 박스 모두 이 전략 반영.

### 9-3. 색상 톤 점진 조정
사용자 피드백 *"안 보여"* → 다크 베이스를 단계적으로 끌어올림:
1차: `--text-dim` 어두운 회색 → 밝은 회색
2차: 거의 흰색 + 본문 weight 500 + base font 14→17px
3차: 배경도 한 단계 밝게 (`#0d1117 → #1a2a44` for 사업개발 뷰)

---

## 10. 향후 개선 아이디어

- [ ] 비용 합계를 Plan A/B 비교 카드 한 줄로 노출 (현재는 cost-summary 박스만)
- [ ] 일정 PDF/이미지 export 기능 (현장에서 인쇄 카피로)
- [ ] i18n — 한국 응원단 합류시 외국인 동행자용 영어 토글
- [ ] 6/24 D-day 카운트다운 표시
- [ ] 실제 호텔 가격 API 연동 (Booking.com / Expedia affiliate)
- [ ] PWA 변환 → 오프라인에서도 일정 조회

---

## 11. 라이센스

개인 프로젝트 · 코드 자유 사용 / 일정 데이터는 개인 정보라 참고만.

---

**📝 작성**: 2026-05 / 클로드 코드와 페어 프로그래밍으로 개발 (커밋 메시지 `Co-Authored-By: Claude` 참고)
