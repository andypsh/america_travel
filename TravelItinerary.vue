<script setup>
import { ref, computed, reactive } from 'vue'

const KRW = 1450
const activePlan = ref('a')

function usd(n) { return `$${n.toLocaleString()}` }
function krw(n) { return `₩${Math.round(n * KRW / 10000).toLocaleString()}만` }

// ── 아코디언 섹션 상태 ── (timeline만 펼침, 나머지 부록처럼 닫힘)
const open = reactive({
  timeline:   true,   // 일정 — 최상단 + 펼침 (메인)
  cost:       false,  // 💰 예상 비용
  settlement: true,   // 💸 정산 (받은 돈 / 받을 돈) — 사용자 요청으로 펼침
  activities: false,
  transport:  false,
  worldcup:   false,
  flights:    false,
  giants:     false,
  hotels:     false,
  booking:    false,
})

// ── 💸 정산 (받은 돈 / 받을 돈) ──
// 200만 = 🏨 SF Hyatt + 🏞 요세미티 + 🏎 SpeedVegas 3개 항목 명목 선납
// 150만 = R32 한국전 티켓 (1,500k 정가)
const payments = [
  { person: '김성준', items: [
    { amount: 2000000, type: '선납', note: '🏨 SF Hyatt + 🏞 요세미티 + 🏎 SpeedVegas 명목' },
    { amount: 1500000, type: '티켓', note: 'R32 한국전 티켓 (1,500k)' },
  ]},
  { person: '박성한', items: [
    { amount: 2000000, type: '선납', note: '🏨 SF Hyatt + 🏞 요세미티 + 🏎 SpeedVegas 명목' },
    { amount: 1500000, type: '티켓', note: 'R32 한국전 티켓 (1,500k)' },
  ]},
]
// 200만 선납 명목 항목들의 실제 1인 부담 합계 (참고용)
const earmarkedCost = computed(() => {
  const c = currentCost.value
  const findFirst = (arr, kw) => arr.find(x => kw.some(k => x.name.includes(k)))?.perPerson || 0
  return {
    sfHyatt: findFirst(c.hotel, ['SF Hyatt']),
    yosemite: findFirst(c.hotel, ['YOS']),
    speedvegas: findFirst(c.activity, ['SpeedVegas']),
    total() { return this.sfHyatt + this.yosemite + this.speedvegas },
  }
})

// ── 💰 예상 비용 (인당 · 3명 분담 기준) ──
const costData = {
  a: {
    label: 'Plan B (SEA 한국전 · 조3위 백업)',
    hotel: [
      { name: 'SF Hyatt Regency Embarcadero (카페테리아 적용 후)', detail: '3박 객실 ≈ 54만 + 현지 $180 · 3명 분담', perPerson: 263000 },
      { name: 'YOS 1박2일 투어 (요셈투어·마이리얼트립)', detail: '778,770원 + $50 서비스 + $100 비거주자 + 점심 별도', perPerson: 1011000 },
      { name: 'SEA 호텔 (쉐라톤 그랜드)', detail: '1박', perPerson: 150000 },
      { name: 'LV Caesars Palace Octavius (회사보조 후)', detail: '3박', perPerson: 300000 },
    ],
    flight: [
      { name: 'OZ212/OZ211 ICN ↔ SFO 왕복', detail: '6/26·7/4', perPerson: 1200000 },
      { name: 'SFO → SEA', detail: '6/30 저녁', perPerson: 250000 },
      { name: 'SEA → LAS', detail: '7/1 저녁', perPerson: 180000 },
      { name: 'LAS → SFO (United 직항)', detail: '7/4 · 18:20 LAS → 20:02 SFO (1h 42m)', perPerson: 249800 },
    ],
    ticket: [
      { name: '🇰🇷 R32 한국전 티켓 (Lumen Field Match 82)', detail: '7/1', perPerson: 1500000 },
    ],
    activity: [
      { name: '✅ 🏎 SpeedVegas — Ferrari 488 GTB 7랩 + Go Kart (박성혁 1인 예약)', detail: '7/4 11:00·13:00 · $603 (Ferrari) + $35 (Go Kart) = $638 · Ref C0616037', perPerson: 925000 },
      { name: '✅ ⚾ Giants 티켓 — LB104 Row 12 Seats 3·4·5 (예매 완료)', detail: '6/27 vs Braves 18:05 · $282 (3장) · Order GNTV-26195758-76749976', perPerson: 136000 },
      { name: '🏝 Alcatraz 투어', detail: '6/27', perPerson: 70000 },
      { name: '🚴 Golden Gate 자전거', detail: '6/27', perPerson: 60000 },
      { name: '🏛 실리콘밸리 셀프 (Caltrain·식사)', detail: '6/28', perPerson: 80000 },
      { name: '🍽 Bacchanal Buffet × 2회', detail: 'LV', perPerson: 220000 },
      { name: '🎰 Caesars 카지노 베팅 (보수적)', detail: 'LV', perPerson: 280000 },
      { name: '🌃 OMNIA Nightclub (입장+음료)', detail: 'LV 1회', perPerson: 140000 },
      { name: '🌲 SEA 액티비티 (Space Needle 등)', detail: '6/30~7/1', perPerson: 70000 },
      { name: '🛍 Forum Shops 쇼핑 (보수적)', detail: 'LV', perPerson: 200000 },
      { name: '🍔 일반 식사·음료·우버', detail: '8박 9일 (팁·세금 포함)', perPerson: 800000 },
    ],
  },
  b: {
    label: 'Plan A (LA 한국전 · 조2위 ✅확정)',
    hotel: [
      { name: 'SF Hyatt Regency Embarcadero (카페테리아 적용 후)', detail: '4박 객실 ≈ 72만 + 현지 $240 · 3명 분담', perPerson: 350000 },
      { name: 'YOS 1박2일 투어 (요셈투어·마이리얼트립)', detail: '778,770원 + $50 서비스 + $100 비거주자 + 점심 별도', perPerson: 1011000 },
      { name: 'LV Caesars Palace Octavius (회사보조 후)', detail: '3박', perPerson: 300000 },
    ],
    flight: [
      { name: 'OZ212/OZ211 ICN ↔ SFO 왕복', detail: '6/26·7/4', perPerson: 1200000 },
      { name: 'SFO ↔ LAX 왕복 (Southwest 직항)', detail: '6/28 · 06:05 SFO→LAX / 21:05 LAX→SFO', perPerson: 390069 },
      { name: 'SFO ↔ LAS 왕복 (United 직항)', detail: '7/1 19:37→21:27 SFO→LAS / 7/4 18:20→20:02 LAS→SFO', perPerson: 606600 },
    ],
    ticket: [
      { name: '🇰🇷 R32 한국전 티켓 (SoFi Stadium Match 73)', detail: '6/28', perPerson: 1500000 },
    ],
    activity: [
      { name: '🔒 Alcatraz 투어', detail: '6/27 오전 (Pier 33)', perPerson: 70000 },
      { name: '🚴 Golden Gate 자전거', detail: '6/27 오후', perPerson: 60000 },
      { name: '✅ ⚾ Giants 티켓 — LB104 Row 12 Seats 3·4·5 (예매 완료)', detail: '6/27 vs Braves 18:05 · $282 (3장) · Order GNTV-26195758-76749976', perPerson: 136000 },
      { name: '🏛 실리콘밸리 풀데이 (Stanford·Google·Apple)', detail: '7/1 오전~오후', perPerson: 80000 },
      { name: '✅ 🏎 SpeedVegas — Ferrari 488 GTB 7랩 + Go Kart (박성혁 1인 예약)', detail: '7/4 11:00·13:00 · $603 (Ferrari) + $35 (Go Kart) = $638 · Ref C0616037', perPerson: 925000 },
      { name: '🍽 Bacchanal Buffet @ Caesars × 2회', detail: 'LV (7/2 저녁 포함)', perPerson: 220000 },
      { name: '🎰 Caesars 카지노 베팅 (보수적)', detail: 'LV', perPerson: 280000 },
      { name: '🌃 OMNIA Nightclub (입장+음료)', detail: 'LV 1회', perPerson: 140000 },
      { name: '🛍 Forum Shops 쇼핑 (보수적)', detail: 'LV', perPerson: 200000 },
      { name: '🍔 일반 식사·음료·우버', detail: '8박 9일 (팁·세금 포함)', perPerson: 800000 },
    ],
  },
}

const currentCost = computed(() => costData[activePlan.value === 'a' ? 'b' : 'a'])
const sumCategory = (arr) => arr.reduce((s, x) => s + x.perPerson, 0)
const costTotals = computed(() => {
  const c = currentCost.value
  return {
    hotel: sumCategory(c.hotel),
    flight: sumCategory(c.flight),
    ticket: sumCategory(c.ticket),
    activity: sumCategory(c.activity),
    total: sumCategory(c.hotel) + sumCategory(c.flight) + sumCategory(c.ticket) + sumCategory(c.activity),
  }
})
function fmtKRW(n) {
  if (n >= 10000) return (Math.round(n / 1000) / 10) + '만'
  return n.toLocaleString()
}

// ── 정산 계산 — 항공은 각자 부담 → 호텔+티켓+액티비티만 분담 ──
const sharedCost = computed(() => costTotals.value.total - costTotals.value.flight)
const settlement = computed(() => {
  const cost = sharedCost.value
  return payments.map(p => {
    const received = p.items.reduce((s, x) => s + x.amount, 0)
    return {
      person: p.person,
      items: p.items,
      received,
      cost,
      flightOwn: costTotals.value.flight,
      balance: cost - received,
    }
  })
})
const settlementTotal = computed(() => {
  return settlement.value.reduce((s, x) => s + x.balance, 0)
})

// ── 항공편 ──
const flights = [
  { label: '출국', flight: 'OZ212', route: 'ICN → SFO', dep: '6/26(금) 20:50 KST', arr: '6/26(금) ~14:30 PDT', aircraft: 'A350-900', duration: '약 10시간 10분' },
  { label: '귀국', flight: 'OZ211', route: 'SFO → ICN', dep: '7/4(토) 23:50 PDT', arr: '7/6(일) 05:45 KST', aircraft: 'A350-900', duration: '약 12시간 55분' },
]

// ── Giants ──
const giants = [
  { date: '6/26 금', time: '19:15', opponent: 'vs Atlanta Braves', note: '✈️ 도착 당일 — 장거리 비행 피로 회복 우선 → 관람 X' },
  { date: '6/27 토', time: '18:05', opponent: 'vs Atlanta Braves', note: '✅ 예매 완료 — LB104 Row 12 Seats 3·4·5 (3장) · $282 · Lower Box Select · Order GNTV-26195758-76749976 · Ballpark 앱 배송' },
  { date: '6/28 일', time: '13:05', opponent: 'vs Atlanta Braves', note: 'A: 🇰🇷 LA 항공 당일치기 (Match 73) / B: 💻 실리콘밸리 (Stanford·Google·Apple) — 둘 다 관람 X' },
]

// ── 월드컵 시나리오 (FIFA Annex C 원문 파싱 결과) ──
const wcRows = [
  { rank: '조 1위', match: 'M79', date: '6/30 14:00 PT', venue: 'Estadio Azteca, 멕시코시티', plan: null,  ok: false, note: '❌ 여행 중 방문 불가' },
  { rank: '조 2위', match: 'M73', date: '6/28 12:00 PT', venue: 'SoFi Stadium, Inglewood (LA)', plan: 'A', ok: true, note: '✅ 체코전 승리 → 확정 시나리오 · Plan A' },
  { rank: '조 3위', match: 'M82', date: '7/1 13:00 PT',  venue: 'Lumen Field, Seattle',         plan: 'B', ok: true, note: '🔄 백업 · Plan B' },
]
// Annex C 파싱 결과 (FIFA 공식 PDF)
const annexC = { qualify: 330, total: 495, seattle: 314, foxborough: 16 }

// ── Plan A: SF 3박 → YOS 1박 → SEA 1박 → LV 3박 → SFO (7/1 게임 전날 시애틀 숙박) ──
const aHotels = [
  { city: '샌프란시스코',    tag: 'SF',  nights: 3, dates: '6/26~6/29', economy: 190, mid: 230, note: '✅ Hyatt Regency Embarcadero · 정가 1실 3박 1,200k원 → CJ 콘도지원 후 실부담 인당 ~212k원 (한국 결제 149k + 현지 fees $46) · BART Embarcadero 역 직결' },
  { city: 'Yosemite',       tag: 'YOS', nights: 1, dates: '6/29~6/30', economy: 700, mid: 700, perPerson: true, note: '⭐ 마이리얼트립 [요셈투어 1박2일] 778,770원/인 + $50 서비스 + $100 비거주자(2026~) + 점심 별도 = 약 101만원/인 · 힐튼 유니온스퀘어 8:00 AM 픽업 · 팬션 숙박 · 스테이크 저녁 · 아침식사 포함 · 공원 입장료·베이브릿지 통행료 포함 · 평점 5.0/5.0 (후기 1,616개) · 최소 5명 출발' },
  { city: '시애틀',          tag: 'SEA', nights: 1, dates: '6/30~7/1', economy: 280, mid: 400, note: 'Hyatt Regency · ⚠️ 월드컵 서징 · Plan B(백업) 경기 전날 입성 / Plan A(확정) SEA 관광 1박 (Space Needle·Pike Place)' },
  { city: '라스베이거스',     tag: 'LV',  nights: 3, dates: '7/1~7/4',  economy: 140, mid: 240, note: 'Caesars Palace (24h 체크인) · 평일 요금 · 7/4 저녁 SFO' },
]
const aDays = [
  { date: '6/26 금', city: '샌프란시스코 도착', cityTag: 'SF', icon: '✈️', items: [
    { time: '14:30', text: '🛬 OZ212 SFO 도착 (International Terminal G) · 게이트 → 입국심사장 도보 10분' },
    { time: '14:40~16:00', text: '🛂 입국심사 (ESTA) + 🧳 수하물 + 🛃 세관 (성수기 1~1.5시간 · APC 키오스크 활용 권장)', bold: true },
    { time: '16:10', text: '🚶 SFO 공항 내 BART 역 이동 (International Terminal 직결 · AirTrain 불필요)' },
    { time: '16:20~16:55', text: '🚇 BART Yellow Line SFO → Embarcadero ($10.85/인 · 약 30분 · 3인 = $32.55)', bold: true },
    { time: '16:55~17:00', text: '🚶 Embarcadero 역 → Hyatt Regency Embarcadero 도보 3분 (호텔 옆 역 직결)' },
    { time: '17:00~18:30', text: '🏨 체크인 · 짐 정리 · 빠른 샤워 · 시차 적응' },
    { time: '18:30~', text: '🍜 Ferry Building 푸드홀 가벼운 저녁 (Hog Island Oysters · Slanted Door · Mensho 라멘 · 도보 10분) · ⚾ Giants 19:15 ❌ 패스 (장거리 비행 피로)' },
    { time: '22:00 이전', text: '🛌 일찍 취침 · 내일 09:00 케이블카 출발' },
  ]},
  { date: '6/27 토', city: '샌프란시스코', cityTag: 'SF', icon: '🚋', items: [
    { time: '09:00~09:30', text: '🚋 케이블카 Powell-Hyde 라인 탑승 (Powell/Market → Hyde/Beach, 편도 $8) · Lombard St·Russian Hill 절경', bold: true },
    { time: '~10:30', text: '🍫 Ghirardelli Square · Aquatic Park · Hyde St Pier · 도보로 Pier 33 이동 (10분)' },
    { time: '11:00', text: '⛴ Alcatraz Cruises — Pier 33 체크인 (사전 예약 필수)' },
    { time: '11:45~14:30', text: '🏝 Alcatraz Island 투어 (탈옥 역사 · 가이드 투어 · Bay View)' },
    { time: '15:00~', text: '🚴 Golden Gate Bridge 자전거 라이딩 · Sausalito 페리' },
    { time: '18:05', text: '✅ ⚾ Giants vs Braves @ Oracle Park — LB104 Row 12 Seats 3·4·5 (예매 완료 $282) · F Market 트램 또는 도보', baseball: true, bold: true },
  ]},
  { date: '6/28 일', city: '실리콘밸리 (당일치기)', cityTag: 'SV', icon: '💻', items: [
    { time: '08:30', text: '🍳 Hyatt Regency Embarcadero 조식 · BART/Caltrain or Uber 준비' },
    { time: '09:30', text: '🚂 4th & King 역에서 Caltrain → Palo Alto (or Uber 1시간)' },
    { time: '10:30-12:00', text: '🏛 Stanford University 캠퍼스 — Hoover Tower · Main Quad · 기념품샵', bold: true },
    { time: '12:00-13:00', text: '🍜 Palo Alto / Mountain View 점심 (인도·중식·한식 풍부)' },
    { time: '13:30-14:30', text: '🔵 Google Visitor Center · 안드로이드 동상 · Visitor Experience (Mountain View)' },
    { time: '14:30-15:30', text: '💻 Computer History Museum (선택) · 컴퓨터 역사·실리콘밸리 헤리티지' },
    { time: '16:00-17:00', text: '🍎 Apple Park Visitor Center (Cupertino) · 옥상 카페 · Apple 굿즈 쇼핑' },
    { time: '17:30~', text: '🚙 Caltrain or Uber → SF 귀환 (1시간)' },
    { time: '저녁', text: '🦞 SF Embarcadero 씨푸드 저녁 · 내일 요세미티 출발 준비 (일찍 취침)' },
  ]},
  { date: '6/29 월', city: '샌프란시스코 → 요세미티 (요셈투어 1박2일)', cityTag: 'SF→YOS', icon: '🚐', items: [
    { time: '06:30', text: '🏨 Hyatt Regency Embarcadero 조식 · 요세미티 1박짐만 챙기고 큰짐은 호텔 보관' },
    { time: '07:30', text: '🚖 Uber → 힐튼 유니온스퀘어 (5분, $8~12) · 요셈투어 미팅' },
    { time: '08:00', text: '🚐 마이리얼트립 [요셈투어 1박2일] 픽업 (Hilton Union Square 출발) · 대형 밴 · 한국어 가이드', bold: true },
    { time: '~12:00', text: '🏞 Yosemite 도착 · 가이드 인솔 시작' },
    { time: '오후', text: '⛰ Yosemite Valley 명소 — Tunnel View · Bridalveil Fall · El Capitan 전망' },
    { time: '저녁', text: '🥩 스테이크 저녁식사 (고급 등심 + 소시지 + 샐러드 + 과일 · 투어 포함) · 팬션 체크인' },
  ]},
  { date: '6/30 화', city: '요세미티 → SF → 시애틀 (심야)', cityTag: 'YOS→SEA', icon: '✈️', items: [
    { time: '07:00', text: '🌅 팬션 조식 · 일출 감상 (El Capitan / Cathedral Rocks)' },
    { time: '08:00~12:00', text: '🥾 가이드 인솔 하이킹·관광 (Tunnel View · Bridalveil Fall · Glacier Point)' },
    { time: '점심', text: '🥪 가이드 추천 점심 (별도)' },
    { time: '13:00~', text: '🚐 요셈투어 SF 복귀 드라이브' },
    { time: '~19:00', text: '🛬 힐튼 유니온스퀘어 도착 (요셈투어 드롭)', bold: true },
    { time: '19:30', text: '🚖 SFO 공항 이동 (Uber 25분)' },
    { time: '21:00~22:00', text: '✈️ SFO → SEA 야간 직항 (Alaska/Delta 막차 · 2h 30m)', bold: true },
    { time: '~24:00', text: '🛬 SEA 도착 · Uber로 Hyatt Regency Seattle 심야 체크인 (24h 프런트)' },
    { time: '늦은 밤', text: '🛌 즉시 취침 · 내일 13:00 Lumen 경기 (조3위 진출 시)' },
  ]},
  { date: '7/1 수', city: '🇰🇷 시애틀 R32 → 라스베이거스', cityTag: 'SEA→LV', icon: '⚽', highlight: true, items: [
    { time: '09:00', text: '☀️ 늦잠 · 호텔 조식 · 어제 강행 회복' },
    { time: '10:00~11:00', text: '🗼 Space Needle · Seattle Center 아침 활동' },
    { time: '11:30', text: '☕ Pike Place 1호점 스타벅스 · 가벼운 점심' },
    { time: '12:00', text: '🏟 Lumen Field 도보·Uber 이동 (downtown에서 20분)' },
    { time: '12:30 PT', text: '🇰🇷 한국 응원단 합류 · 좌석 확인 · 마지막 스낵' },
    { time: '13:00 PT', text: '⚽ R32 Match 82 — Lumen Field (한국 조3위 vs 16강 약자) · KOREA FIGHTING!', bold: true },
    { time: '~16:00', text: '🎉 경기 후 응원 · 야경 기념촬영 · Lumen 주변 축제 분위기' },
    { time: '16:30-17:00', text: '🚙 Lumen Field → SEA 공항 이동' },
    { time: '17:30~', text: '✈️ SEA → LAS 야간 국내선 (약 2.5시간)' },
    { time: '~20:00', text: '🎰 라스베이거스 도착 · 심야 체크인 (Caesars Palace 24h) · The Strip 야경' },
  ]},
  { date: '7/2 목', city: '라스베이거스 · 🏎 SpeedVegas', cityTag: 'LV', icon: '🏎', items: [
    { time: '09:00', text: '🍳 Caesars 조식 · 가벼운 워밍업 (전날 경기 피로 회복)' },
    { time: '09:30~', text: '🚖 Uber → SpeedVegas (Sloan, NV · Strip 남쪽 20분 · $25~35)' },
    { time: '11:00', text: '✅ 🏎 SpeedVegas — Ferrari 488 GTB 7랩 (박성혁) · Standard Driving Experience · $475 + HD 영상·사진 $79 + 차량 손상 보호 $49 = $603 · Ref C0616037', bold: true },
    { time: '13:00', text: '✅ 🏁 Go Kart Track (VSK · 같은 부지) — Sodikart RT10 1레이스 · $35 · Ref C0616037', bold: true },
    { time: '~14:00', text: '🚖 Uber → Caesars Palace 복귀' },
    { time: '오후', text: '🎡 Fremont Street Experience · 구시가지 LED 쇼 · 우버 13분' },
    { time: '저녁', text: '💦 Bellagio 분수쇼 (도보 3분) · 🎰 Caesars 카지노 빅휠·룰렛 · ⚽ Sportsbook 월드컵 R16', bold: true },
  ]},
  { date: '7/3 금', city: '라스베이거스 · 서커스서커스', cityTag: 'LV', icon: '🎪', items: [
    { time: '오전', text: '😴 늦잠 · Caesars 풀장 (Garden of the Gods) · 브런치' },
    { time: '오후', text: '🎢 Circus Circus Adventuredome (실내 놀이공원 · Canyon Blaster·El Loco·범퍼카) + 🎪 Carnival Midway 무료 서커스 공연 관람', bold: true },
    { time: '저녁', text: '🍽 Bacchanal 뷔페 (LV 1위) · 🎰 Caesars 카지노 빅휠·블랙잭 · 🌃 OMNIA Nightclub (선택)' },
  ]},
  { date: '7/4 토', city: '라스베이거스 → SFO 귀국', cityTag: 'LV→SFO', icon: '🏠',
    note: '⚠️ 미국 독립기념일 — 공항 혼잡 · 마지막 LV 여유로운 휴식 후 출국',
    items: [
      { time: '오전', text: '😴 늦잠 · Caesars 풀장 (Garden of the Gods 어덜트 풀) · 브런치 (마지막 LV)' },
      { time: '11:00', text: '🏨 체크아웃 · 짐 호텔 보관' },
      { time: '오후', text: '🛍 Forum Shops 마지막 쇼핑 · 🎰 마지막 카지노 (보수적) · 💦 Bellagio 분수쇼' },
      { time: '14:30', text: '🍔 LV 마지막 점심 (Caesars 내 또는 Strip 인근)' },
      { time: '15:30', text: '🚖 Caesars → LAS 공항 (Uber 20분 · 7/4 혼잡 ⚠️)' },
      { time: '18:20', text: '✈️ LAS → SFO (United 직항 · 1h 42m · ₩249,800)', bold: true },
      { time: '20:02', text: '🛬 SFO 도착 · AirTrain → International Terminal G 이동' },
      { time: '20:30~21:00', text: '🛂 아시아나 카운터 체크인 (Star Alliance 인터라인 통과 짐일 경우 X) · 보안검사' },
      { time: '23:50', text: '✈️ OZ211 SFO 출발 → 인천 7/6(일) 05:45 도착', bold: true },
  ]},
]

// ── Plan A (확정): SF 3박 → YOS 1박 (마이리얼트립) → SF 1박 (복귀) → LV 3박 → SFO · 시애틀 X ──
const laHotels = [
  { city: '샌프란시스코', tag: 'SF',  nights: 3, dates: '6/26~6/29', economy: 190, mid: 230, note: '✅ Hyatt Regency Embarcadero · 정가 1실 3박 1,200k원 → CJ 콘도지원 후 실부담 인당 ~212k원 · 6/28 LA 항공 당일치기(SFO↔LAX) 포함' },
  { city: 'Yosemite',    tag: 'YOS', nights: 1, dates: '6/29~6/30', economy: 700, mid: 700, perPerson: true, note: '⭐ 마이리얼트립 [요셈투어 1박2일] 778,770원/인 + $50 서비스 + $100 비거주자(2026~) + 점심 별도 = 약 101만원/인 · 힐튼 유니온스퀘어 8:00 AM 픽업 · 팬션 숙박 + 스테이크 저녁 + 아침 + 입장료·통행료 포함 · 평점 5.0 (1,616개) · 최소 5명 출발' },
  { city: '샌프란시스코', tag: 'SF',  nights: 1, dates: '6/30~7/1', economy: 190, mid: 230, note: 'Hyatt Regency Embarcadero 1박 연장 · 마이리얼트립 SF 드롭 후 1박 휴식 · 7/1 LV 비행' },
  { city: '라스베이거스', tag: 'LV',  nights: 3, dates: '7/1~7/4',  economy: 140, mid: 240, note: 'Caesars Palace · 평일 요금 · 7/4 저녁 SFO' },
]
const laDays = [
  { date: '6/26 금', city: '샌프란시스코 도착', cityTag: 'SF', icon: '✈️', items: [
    { time: '14:30', text: '🛬 OZ212 SFO 도착 (International Terminal G) · 게이트 → 입국심사장 도보 10분' },
    { time: '14:40~16:00', text: '🛂 입국심사 (ESTA) + 🧳 수하물 + 🛃 세관 (성수기 1~1.5시간 · APC 키오스크 활용 권장)', bold: true },
    { time: '16:10', text: '🚶 SFO 공항 내 BART 역 이동 (International Terminal 직결)' },
    { time: '16:20~16:55', text: '🚇 BART Yellow Line SFO → Embarcadero ($10.85/인 · 약 30분 · 3인 = $32.55)', bold: true },
    { time: '16:55~17:00', text: '🚶 Embarcadero 역 → Hyatt Regency Embarcadero 도보 3분 (호텔 옆 역 직결)' },
    { time: '17:00~18:30', text: '🏨 체크인 · 짐 정리 · 빠른 샤워 · 시차 적응' },
    { time: '18:30~', text: '🍜 Ferry Building 푸드홀 가벼운 저녁 (Hog Island Oysters · Slanted Door · Mensho 라멘 · 도보 10분) · ⚾ Giants 19:15 ❌ 패스 (장거리 비행 피로)' },
    { time: '22:00 이전', text: '🛌 일찍 취침 · 내일 09:00 케이블카 출발' },
  ]},
  { date: '6/27 토', city: '샌프란시스코', cityTag: 'SF', icon: '🚋', items: [
    { time: '09:00~09:30', text: '🚋 케이블카 Powell-Hyde 라인 탑승 (Powell/Market 시점 → Hyde/Beach 종점, 편도 $8) · Lombard St·Russian Hill 절경', bold: true },
    { time: '~10:30', text: '🍫 Ghirardelli Square 산책 · Aquatic Park · Hyde St Pier · 도보로 Pier 33 이동 (10분)' },
    { time: '11:00', text: '⛴ Alcatraz Cruises — Pier 33 체크인 (사전 예약 필수)' },
    { time: '11:45~14:30', text: '🔒 Alcatraz Island 투어 (옛 연방 감옥 · 탈옥 역사 · 가이드 오디오 투어 · Bay View)', bold: true },
    { time: '15:00~17:30', text: '🚴 Golden Gate Bridge 자전거 라이딩 · Sausalito 페리 귀환 (Blazing Saddles 렌탈 $35~50)' },
    { time: '18:05', text: '✅ ⚾ Giants vs Braves @ Oracle Park — LB104 Row 12 Seats 3·4·5 (예매 완료 $282) · F Market 트램 또는 도보', baseball: true, bold: true },
  ]},
  { date: '6/28 일', city: '🇰🇷 SF↔LA 당일치기 (Match 73 SoFi)', cityTag: 'SF↔LA', icon: '🇰🇷', highlight: true, items: [
    { time: '04:00', text: '⏰ 기상 · 당일치기 가벼운 짐만 (큰짐 호텔 보관)' },
    { time: '04:30', text: '🚖 Hyatt Embarcadero → SFO (Uber 25~40분, $40~50 · 새벽 surge 적음)' },
    { time: '06:05', text: '✈️ SFO → LAX (Southwest 직항 1h 30m · Giants 13:05 ❌ 충돌·포기)', bold: true },
    { time: '07:35', text: '🛬 LAX 도착 · Uber/Lyft → SoFi Stadium (~30분, $25~40)' },
    { time: '09:00~', text: '🍔 SoFi 인근 아침 (In-N-Out 등) · 한국 응원단 사전 합류' },
    { time: '10:30~', text: '🏟 SoFi Stadium 입장 (경기 1.5h 전)' },
    { time: '12:00 PT', text: '🏟 한국(조A 2위) vs 조B 2위 — SoFi Stadium (Match 73) · KOREA FIGHTING!', bold: true },
    { time: '~15:30', text: '🎉 경기 종료 · 사진·응원 마무리 · 빠져나오기 (15~20분)' },
    { time: '16:00', text: '🚙 Uber → K-town BCD Tofu House Wilshire (월드컵 후 surge 주의, ~30분)' },
    { time: '16:30~18:00', text: '🍲 BCD Tofu House (3575 Wilshire Blvd · 24h 영업) — 순두부찌개·솥밥·한국 서포터 모임 분위기', bold: true },
    { time: '18:00~20:30', text: '🎉 K-town 자유시간 — 호프·디저트·기념품 또는 Griffith Observatory 야경' },
    { time: '20:30', text: '🚙 Uber → LAX (~30분)' },
    { time: '21:05', text: '✈️ LAX → SFO (Southwest 직항 1h 20m)', bold: true },
    { time: '22:25', text: '🛬 SFO 도착 · 짐 + AirTrain → BART 역 (15~20분)' },
    { time: '22:45~23:20', text: '🚇 BART Yellow Line SFO → Embarcadero (~35분, $10.85/인) — 일요일 막차 가능 ✅', bold: true },
    { time: '23:25', text: '🏨 Embarcadero 역 → Hyatt 도보 3분 · 즉시 취침' },
    { time: '내일 06:30', text: '⏰ 6/29 기상 — 약 7시간 수면 확보 · 차내 보충 수면 가능' },
  ]},
  { date: '6/29 월', city: '샌프란시스코 → 요세미티 (요셈투어 1박2일)', cityTag: 'SF→YOS', icon: '🚐', items: [
    { time: '06:30', text: '🏨 호텔 조식 · 요세미티 1박짐만 챙기고 큰짐은 호텔 보관' },
    { time: '07:30', text: '🚖 Uber → 힐튼 유니온스퀘어 (5분, $8~12) · 요셈투어 미팅' },
    { time: '08:00', text: '🚐 마이리얼트립 [요셈투어 1박2일] 픽업 (Hilton Union Square 출발) · 대형 밴 · 한국어 가이드', bold: true },
    { time: '~12:00', text: '🏞 Yosemite 도착 · 가이드 인솔 시작' },
    { time: '오후', text: '⛰ Yosemite Valley 명소 — Tunnel View · Bridalveil Fall · El Capitan 전망 · LA 경기 회복' },
    { time: '저녁', text: '🥩 스테이크 저녁식사 (투어 포함) · 팬션 체크인' },
  ]},
  { date: '6/30 화', city: '요세미티 → 샌프란시스코', cityTag: 'YOS→SF', icon: '🚐', items: [
    { time: '07:00', text: '🌅 팬션 조식 · 일출 감상 (El Capitan / Cathedral Rocks)' },
    { time: '08:00~12:00', text: '🥾 가이드 인솔 하이킹·관광 (Tunnel View · Bridalveil Fall · Glacier Point 등 풀 일정)' },
    { time: '점심', text: '🥪 가이드 추천 점심 (별도 $10~20)' },
    { time: '13:00~', text: '🚐 요셈투어 SF 복귀 드라이브 (~3.5시간 + 휴게소)' },
    { time: '~19:00', text: '🛬 힐튼 유니온스퀘어 도착 (요셈투어 드롭)', bold: true },
    { time: '19:30', text: '🚖 Uber → Hyatt Regency Embarcadero 복귀 (5분) · 보관 짐 정리 · 1박 연장 체크인' },
    { time: '늦은 저녁', text: '🦞 Embarcadero 늦은 저녁 (Hog Island Oysters · Slanted Door 등) · 휴식 · 내일 SV 출발 준비' },
  ]},
  { date: '7/1 수', city: '실리콘밸리 → 라스베이거스', cityTag: 'SV→LV', icon: '💻', items: [
    { time: '08:00', text: '🍳 Hyatt 조식 · 체크아웃 · 큰짐 호텔 보관' },
    { time: '09:00~', text: '🚂 Caltrain (4th & King) → Palo Alto (1시간) or 🚙 Uber 50분' },
    { time: '10:00~12:00', text: '🏛 Stanford University 캠퍼스 — Hoover Tower · Main Quad · Memorial Church · 기념품샵', bold: true },
    { time: '12:00~13:00', text: '🍜 Palo Alto / Mountain View 점심 (인도·중식·한식 풍부)' },
    { time: '13:00~14:00', text: '🔵 Google Visitor Center (Mountain View) · 안드로이드 동상 · Visitor Experience', bold: true },
    { time: '14:00~15:00', text: '🍎 Apple Park Visitor Center (Cupertino) · 옥상 카페 · Apple 굿즈' },
    { time: '15:00~', text: '🚙 Uber → SF Hyatt 짐 픽업 (~16:00)' },
    { time: '16:00~17:30', text: '☕ Ferry Building 마지막 SF 저녁 · 짐 정리 · 19:37 출발 여유롭게' },
    { time: '17:30', text: '🚇 Hyatt → Embarcadero BART → SFO (BART 직결, 약 35분, $10.85/인)' },
    { time: '19:37', text: '✈️ SFO → LAS (United 직항 · 1h 50m · ₩606,600 왕복)', bold: true },
    { time: '21:27', text: '🛬 라스베이거스 도착 · Uber로 Caesars Palace 체크인 · The Strip 야경 · Bellagio 분수쇼' },
  ]},
  { date: '7/2 목', city: '라스베이거스 · 🏎 SpeedVegas', cityTag: 'LV', icon: '🏎', items: [
    { time: '09:00', text: '🍳 Caesars 조식 · 가벼운 워밍업 (전날 비행·SV 강행 회복)' },
    { time: '09:30~', text: '🚖 Uber → SpeedVegas (Sloan, NV · Strip 남쪽 20분 · $25~35)' },
    { time: '11:00', text: '✅ 🏎 SpeedVegas — Ferrari 488 GTB 7랩 (박성혁) · Standard Driving Experience · $475 + HD 영상·사진 $79 + 차량 손상 보호 $49 = $603 · Ref C0616037', bold: true },
    { time: '13:00', text: '✅ 🏁 Go Kart Track (VSK · 같은 부지) — Sodikart RT10 1레이스 · $35 · Ref C0616037', bold: true },
    { time: '~14:00', text: '🚖 Uber → Caesars Palace 복귀' },
    { time: '오후', text: '🎡 Fremont Street Experience · 구시가지 LED 쇼 · 우버 13분 · ⚽ Sportsbook 월드컵 R16' },
    { time: '저녁', text: '🍽 Bacchanal 뷔페 @ Caesars Palace (LV 1위 뷔페 · 일본·중식·한식·미식) · 🎰 Caesars 카지노 빅휠·블랙잭', bold: true },
  ]},
  { date: '7/3 금', city: '라스베이거스 · 서커스서커스', cityTag: 'LV', icon: '🎪', items: [
    { time: '10:00~12:30', text: '🎢 Circus Circus Adventuredome 입장 ($60/인 데이패스 · 실내 놀이공원 25개 라이드) — Canyon Blaster 더블 루프 코스터·El Loco·범퍼카·미니골프 (스트립 북쪽 끝, Uber 10분)', bold: true },
    { time: '12:30~13:30', text: '🍔 Circus Circus 호텔 내 푸드코트 점심 (The Steakhouse·Pizzeria·Westside Deli)' },
    { time: '13:30~14:30', text: '🎪 Carnival Midway 서커스 공연 관람 (무료 · 30분 간격 · 공중곡예·저글링·곡예사·마술 — 카지노 2층)', bold: true },
    { time: '15:00~', text: '🚙 Caesars 복귀 · 🛍 Forum Shops 쇼핑 · ⚽ Sportsbook 월드컵 R16 라이브' },
    { time: '저녁', text: '🎰 Caesars 카지노 마무리 · 💦 Bellagio 분수쇼 · 🌃 OMNIA Nightclub (선택)' },
  ]},
  { date: '7/4 토', city: '라스베이거스 → SFO 귀국', cityTag: 'LV→SFO', icon: '🏠',
    note: '⚠️ 미국 독립기념일 — 공항 혼잡 · 마지막 LV 여유로운 휴식 후 출국',
    items: [
      { time: '오전', text: '😴 늦잠 · Caesars 풀장 (Garden of the Gods 어덜트 풀) · 브런치 (4일간 강행 회복)' },
      { time: '11:00', text: '🏨 체크아웃 · 짐 호텔 보관 (당일 출국, 짐 들고 다니기 X)' },
      { time: '오후', text: '🛍 Forum Shops 마지막 쇼핑 · 🎰 마지막 카지노 (보수적) · 💦 Bellagio 분수쇼' },
      { time: '14:30', text: '🍔 LV 마지막 점심 (Caesars 내 또는 Strip 인근 · Carmine\'s 등)' },
      { time: '15:30', text: '🚖 Caesars → LAS 공항 (Uber 20분 · 7/4 독립기념일 혼잡 ⚠️ 여유 있게)' },
      { time: '18:20', text: '✈️ LAS → SFO (United 직항 · 1h 42m · ₩249,800)', bold: true },
      { time: '20:02', text: '🛬 SFO 도착 · AirTrain → International Terminal G 이동' },
      { time: '20:30~21:00', text: '🛂 아시아나 카운터 체크인 (Star Alliance 인터라인 통과 짐일 경우 X) · 보안검사' },
      { time: '23:50', text: '✈️ OZ211 SFO 출발 → 인천 7/6(일) 05:45 도착', bold: true },
  ]},
]

// ── 액티비티 ──
const activeActCity = ref('LV')
const actCityLabel = { SF: '🌉 샌프란시스코', LV: '🎰 라스베이거스', SEA: '🌲 시애틀' }

const activities = {
  SF: [
    { emoji: '🚋', name: 'SF 케이블카 (Powell-Hyde 라인)', type: '관광', price: '$8/편도 · $13/하루', duration: '20~30분',
      desc: 'SF 시그니처 — Powell/Market 시점에서 Lombard St·Russian Hill·Nob Hill 절경 거쳐 Hyde/Beach(Ghirardelli·Aquatic Park) 종점. 1873년 개통, 미국 유일 케이블 견인 시스템', tip: '⭐ 종점 회전판에서 사람이 직접 돌려 방향 전환 보는 게 백미 · 외부 손잡이 매달리기 OK · Pier 33(Alcatraz)·Fisherman\'s Wharf와 동선 연결 좋음' },
    { emoji: '🚊', name: 'F Market 헤리티지 트램', type: '관광', price: '$3/회 · Muni Day Pass $5', duration: '편도 30분',
      desc: 'Embarcadero ↔ Castro 운행 · 전 세계 도시에서 가져온 빈티지 트램(밀란·필라델피아·뉴올리언스) 운행 · 호텔 앞에서 바로 탑승', tip: 'Hyatt Embarcadero 정문 앞 정류장 · Pier 33·Fisherman\'s Wharf까지 케이블카 대신 옵션 · 호텔 직원에게 Muni Day Pass 구매 위치 문의' },
    { emoji: '🚴', name: '골든게이트 자전거', type: '액티브', price: '$35~50/인', duration: '3~4h',
      desc: 'Fisherman\'s Wharf 렌탈 → 브리지 라이딩 → Sausalito → 페리 귀환', tip: '사전 예약 불필요 · 페리비 별도 ~$15' },
    { emoji: '🔐', name: '알카트라즈 이스케이프룸', type: '실내', price: '$35~45/인', duration: '1h',
      desc: 'Fisherman\'s Wharf 1962년 탈출 테마 · 퍼즐 풀고 탈출', tip: '실제 알카트라즈 투어 전후로 묶으면 좋음' },
    { emoji: '🍺', name: 'Craft Brewery 투어', type: '식음', price: '$50~80/인', duration: '3h',
      desc: 'Anchor · Cellarmaker · Magnolia — SoMa/Mission 구역 3곳 도보 투어', tip: 'Uber 이용 권장 · 저녁 전에 마무리' },
    { emoji: '🎾', name: 'Golden Gate Park 테니스', type: '스포츠', price: '무료~$10/h', duration: '1~2h',
      desc: '공원 내 21면 코트 · Spotery 앱으로 예약 · 채광 양호', tip: '라켓 렌탈 불가 — 현지 스포츠용품점 구매 or 호텔 문의' },
    { emoji: '🌊', name: '베이 카약', type: '액티브', price: '$60~80/인', duration: '2h',
      desc: 'Pier 39 출발 · 알카트라즈 뷰 · 소그룹 가이드 투어', tip: '파도 적은 오전 추천' },
    { emoji: '⚽', name: 'Golden Gate Park 픽업 사커', type: '스포츠', price: '무료', duration: '1~2h',
      desc: '주말 오전 Soccer Field 6~7면 상시 픽업게임 · 그냥 가면 끼워줌 · 월드컵 시즌 특히 활발 · 미국인·라틴계 혼합 팀', tip: 'Playo 앱으로 사전 게임 조인 가능 · 클릿 없이 런닝화도 OK · 물 꼭 챙기기' },
  ],
  LV: [
    { emoji: '🎢', name: 'Circus Circus Adventuredome (실내 놀이공원)', type: '액티브', price: '$60/인 데이패스 · $7~12/라이드', duration: '3~5h',
      desc: '5에이커 실내 돔 놀이공원 · 25개 라이드 · Canyon Blaster (미국 유일 실내 더블 루프 코스터)·El Loco·범퍼카·미니골프·VR 어트랙션 · 스트립 북쪽 끝 Circus Circus 호텔 직속', tip: '⭐ 라이드 5개 이상 탈 거면 데이패스 무조건 이득 · 36인치 미만은 키즈 라이드만 · 에어컨 빵빵해서 7월 LV 더위 회피 최적 · Caesars에서 Uber 12분 ($15)' },
    { emoji: '🎪', name: 'Circus Circus Carnival Midway 서커스 공연', type: '관람', price: '무료', duration: '15~20분/공연',
      desc: 'Circus Circus 카지노 2층 무료 라이브 서커스 · 30분 간격 운영 (11am~12am) · 공중곡예·저글링·곡예사·마술 등 매번 다른 액트 · 1968년부터 명물', tip: '⭐ 무료라 시간 맞춰 가서 1~2개 보고 옆 Adventuredome 연결 동선 굿 · 좋은 자리는 공연 10분 전 도착' },
    { emoji: '🏎️', name: 'SpeedVegas 슈퍼카 레이싱', type: '액티브', price: '$399~599/인 (5랩)', duration: '1~2h',
      desc: 'Huracán/488 GTB $399 · F8/STO $499~599 · 강사 동승 + Porsche SUV 디스커버리 랩 2회 무료', tip: '스트립 남쪽 15분 · 사전 예약 필수 · 멀티카 추가시 차량당 $100 할인' },
    { emoji: '🏁', name: 'Vegas Superkarts (SpeedVegas 부지)', type: '액티브', price: '$35~85/인', duration: '8~30분',
      desc: '1레이스 $35 · 2레이스 $65 ⭐ · 3레이스 $85 · Sodikart RT10 (270cc Honda · 최대 80km/h) · 1,600ft 야외 트랙', tip: 'SpeedVegas 같은 부지 · 14세 이상 · 키 140cm+ · 슈퍼카 후 가성비 묶기 좋음' },
    { emoji: '🎰', name: 'Caesars 카지노 (빅휠·블랙잭·바카라·룰렛)', type: '관람·베팅', price: '베팅액 자유', duration: '자유',
      desc: 'LV 최대급 카지노 9.6만 sqft · 빅휠·룰렛·블랙잭·바카라·포커·1,300+ 슬롯', tip: '호텔 내 24h · 신분증 필수' },
    { emoji: '⚽', name: 'Caesars Sportsbook (월드컵 R32/R16 라이브 베팅)', type: '관람·베팅', price: '베팅액 자유', duration: '자유',
      desc: '대형 LED 스크린 · William Hill 출신 Caesars Sports 운영 · 라이브 베팅 · 머니라인·핸디캡·득점왕', tip: '7/1~7/4 = R32~R16 한창 · 한국전 보러 가는 분위기' },
    { emoji: '🌃', name: 'OMNIA Nightclub (Caesars 호텔 내)', type: '나이트라이프', price: '입장료 $30~80/인', duration: '~새벽 4am',
      desc: 'LV TOP 3 클럽 · 7,500명 수용 · 메이저 DJ 매주 (Calvin Harris·Tiësto·Steve Aoki)', tip: '호텔 게스트 입장 우선권 · 드레스코드 (정장 셔츠·청바지 OK / 슬리퍼·반바지 X)' },
    { emoji: '💦', name: 'Venus Pool Club (Caesars 어덜트 풀)', type: '풀파티', price: '$10~30 입장료', duration: '낮~저녁',
      desc: '18+ 어덜트 풀 · 토플리스 가능 (시즌별) · DJ·칵테일', tip: '여름 성수기 토·일 가장 활기' },
    { emoji: '💦', name: 'Bellagio 분수쇼', type: '관광', price: '무료', duration: '15분',
      desc: 'The Strip 야경의 정수 · 매 15~30분 음악·분수 쇼', tip: '저녁 8시~자정 사이가 가장 화려 · Caesars에서 도보 3분' },
    { emoji: '🎡', name: 'Fremont Street Experience', type: '관광', price: '무료', duration: '2~3h',
      desc: '구시가지 · LED 천장 쇼 · 집라인 ($30~50) · 거리 공연', tip: 'Caesars에서 우버 13분 · 저녁 분위기' },
    { emoji: '🏗', name: '후버댐', type: '관광', price: '$15~30 (투어)', duration: '3~4h',
      desc: '댐 + Lake Mead 뷰 · Boulder City 인근', tip: 'Caesars에서 우버 35분 · 오전 권장 (오후 더움)' },
    { emoji: '🛍', name: 'Forum Shops (Caesars 직결)', type: '쇼핑', price: '브랜드별', duration: '2~4h',
      desc: '160 매장 · Gucci·Versace·Apple·Tom Ford · 로마 인테리어 + 분수쇼 + 아쿠아리움', tip: '도보 직결 · 식당·바도 多' },
    { emoji: '🍽', name: 'Bacchanal Buffet (Caesars 내)', type: '미식', price: '$80/인', duration: '2~3h',
      desc: 'LV 1위 뷔페 · 일본·중식·한식·미식 다 있음 · 음료 별도', tip: '점심·저녁 예약 권장' },
  ],
  SEA: [
    { emoji: '🐋', name: '범고래 크루즈 (Whale Watching)', type: '액티브', price: '$80~120/인', duration: '4~5h',
      desc: '다운타운 출발 · 6~7월 최성수기 · Orca 출몰률 높음 · 네이처리스트 동승', tip: '100% 고래 보장 투어 옵션 있음 · 멀미약 챙기기' },
    { emoji: '🚣', name: '카약 (Lake Union)', type: '액티브', price: '$25~40/h', duration: '2~3h',
      desc: '하우스보트 사이 노젓기 · Seattle 스카이라인 뷰 · NW Outdoor Center 렌탈', tip: '초보도 가능 · 오전 물 잔잔' },
    { emoji: '🪓', name: '도끼 던지기 (Blade & Timber)', type: '실내', price: '$25~35/인', duration: '1h',
      desc: 'Capitol Hill · 18개 레인 · 3명 대결 최적 · 라운드 토너먼트 가능', tip: '평일 워크인 가능 · 맥주 주문 가능' },
    { emoji: '🔐', name: '이스케이프룸 (Locurio)', type: '실내', price: '$30~40/인', duration: '1h',
      desc: '스토리 몰입형 방탈출 · Seattle 로컬 브랜드 · 2~8인', tip: '월드컵 전날 저녁 추천 — 에너지 소모 적음' },
    { emoji: '⛵', name: 'Argosy 시티 크루즈', type: '관광', price: '$40~60/인', duration: '1~2h',
      desc: 'Lake Union + Ship Canal · Seattle 수변 경치 · 실내외 좌석', tip: '저녁 선셋 크루즈 분위기 최고' },
    { emoji: '🎾', name: 'Volunteer Park 테니스', type: '스포츠', price: '무료', duration: '1~2h',
      desc: 'Capitol Hill 내 무료 오픈 코트 · 예약 불필요', tip: '월드컵 전날 몸 풀기 용도 추천' },
    { emoji: '⚽', name: 'Cal Anderson Park 픽업 사커', type: '스포츠', price: '무료', duration: '1~2h',
      desc: '시애틀 픽업축구 성지 · Capitol Hill 내 · 월드컵 R32 직전이라 한국 서포터·미국인 혼합 · Jefferson Park 인조잔디도 추천', tip: 'Spond / Playo 앱으로 게임 조인 · 월드컵 전날(6/30) 저녁 게임 최고 분위기 예상' },
  ],
}

// ── 🚇 이동수단 가이드 (도시별 주요 구간) ──
const activeTransportCity = ref('SF')
const transportCityLabel = { SF: '🌉 SF', YOS: '⛰ Yosemite', SEA: '🌲 시애틀', LV: '🎰 LV', LA: '🇰🇷 LA', INTER: '✈️ 도시간' }

const transportRoutes = {
  SF: [
    { from: 'SFO 공항', to: 'Hyatt Regency Embarcadero (5 Embarcadero Center)', distance: '13mi · 21km', icon: '✈️',
      options: [
        { mode: '🚇 BART', detail: 'Yellow line · SFO Intl 역 → Embarcadero 역 → 도보 3분 (호텔 길 건너)', time: '30~35분', cost: '$10.85/인', tip: '⭐ 호텔 옆 BART 역 직결 · 가장 빠르고 저렴 (3인 = $32.55)' },
        { mode: '🚕 Uber/Lyft', detail: 'UberX 직행 · 짐 많으면 UberXL($55~75)', time: '25~40분', cost: '$35~55', tip: '3인 분할하면 인당 ~$15 · 러시아워(17~19시) 피하기' },
        { mode: '🚐 SuperShuttle', detail: '합승 셔틀 · 호텔 앞 도착', time: '45~60분', cost: '$25~30/인', tip: '대형 짐 OK · 사전 예약 권장' },
      ]
    },
    { from: 'Hyatt Regency Embarcadero', to: 'Pier 33 (Alcatraz Cruises)', distance: '0.7mi · 1.1km', icon: '⛴',
      options: [
        { mode: '🚶 도보', detail: 'Embarcadero 따라 북쪽 · Ferry Building 지나 직진', time: '12~15분', cost: '무료', tip: '⭐⭐ 강력 추천 — 완전 평지 · 베이 뷰 보면서 산책 · 호텔에서 가장 가까운 명소' },
        { mode: '🚋 F Market 트롤리', detail: 'Embarcadero & Drumm 정류장 → Pier 33 정류장', time: '8~10분', cost: '$3/회', tip: '빈티지 트롤리 자체가 명물 · Embarcadero 따라 운행' },
        { mode: '🚕 Uber', detail: '직행', time: '5~8분', cost: '$8~12', tip: '비 오거나 시간 압박 시' },
      ]
    },
    { from: 'Hyatt Regency Embarcadero', to: 'Golden Gate Bridge (Vista Point)', distance: '5mi · 8km', icon: '🌉',
      options: [
        { mode: '🚕 Uber', detail: 'Bridge view point 또는 Sausalito 페리 터미널', time: '15~20분', cost: '$22~30', tip: '⭐ Embarcadero에서 Lombard 직진 빠름 · 강풍 시 다리 폐쇄 가능 · Apple Weather 확인' },
        { mode: '🚴 자전거 렌탈', detail: 'Blazing Saddles @ Fisherman\'s Wharf (호텔 도보 15분)', time: '편도 45분 라이딩', cost: '$35~50/일', tip: '⭐⭐ 강력 추천 — 호텔에서 렌탈샵 도보 · Sausalito 라이딩 후 페리 귀환 ($15)' },
        { mode: '🚌 Muni 28', detail: '환승 1회 필요 · 좀 복잡', time: '50~70분', cost: '$3/인', tip: '시간 여유 있을 때만' },
      ]
    },
    { from: 'Hyatt Regency Embarcadero', to: 'Stanford Campus (Plan B 6/30)', distance: '32mi · 51km', icon: '🏛',
      options: [
        { mode: '🚆 Caltrain', detail: 'Embarcadero → MUNI Metro → 4th & King → Caltrain → Palo Alto · 도보 10분 캠퍼스', time: '1h 20분', cost: '$11.25/인 + MUNI $3', tip: '⭐추천 — 주말 30분 간격 · Palo Alto 역 내림' },
        { mode: '🚕 Uber', detail: 'UberX 직행', time: '40~55분', cost: '$80~110', tip: '주말 통행량 적음 · 3인 분할 ~$30' },
      ]
    },
    { from: 'Hyatt Regency Embarcadero', to: 'SFO (Plan A 6/30 출국)', distance: '13mi · 21km', icon: '✈️',
      options: [
        { mode: '🚇 BART', detail: 'Embarcadero 역 → SFO Intl · 환승 없이 직행 · 도보 3분 터미널', time: '30~35분', cost: '$10.85/인', tip: '⭐ 호텔 옆 역에서 SFO 한 방에 · 국내선 출발 2시간 전 도착' },
        { mode: '🚕 Uber', detail: 'UberX · 짐 많으면 XL', time: '25~40분', cost: '$35~55', tip: '체크인 카운터 앞까지 직행' },
      ]
    },
  ],
  YOS: [
    { from: 'SF Bay Area', to: 'Yosemite Curry Village', distance: '195mi · 314km', icon: '🚗',
      options: [
        { mode: '🚗 렌트카', detail: 'I-580 E → I-205 E → CA-120 E (Big Oak Flat)', time: '3.5~4시간', cost: '렌트 $60~80/일 + 주유 $40 + 입장료 $35/차', tip: '⭐ 거의 유일한 현실적 옵션 · 새벽 출발이면 교통 OK · Enterprise SF 지점' },
        { mode: '🚌 YARTS Bus', detail: 'Amtrak SF→Merced → YARTS 환승 → Yosemite Valley', time: '6~7시간', cost: '$28~50/인', tip: '차 없을 시 유일 · 시간 너무 길어 비추' },
      ]
    },
    { from: 'Curry Village', to: '공원 내 주요 명소', distance: 'Valley 내 ~7mi', icon: '🚐',
      options: [
        { mode: '🚐 무료 셔틀', detail: 'Yosemite Valley Shuttle · 모든 주요 stop 순환', time: '15분 간격', cost: '무료', tip: '⭐ 4월~10월 운행 · 6월 성수기 만석 가능 · 7~10시 운영' },
        { mode: '🚗 자가용', detail: 'Glacier Point Rd (40min), Tunnel View (15min)', time: '편도 15~40분', cost: '주유만', tip: 'Tunnel View 일출은 자가용 필수 (셔틀 안 감)' },
        { mode: '🚶 도보 트레일', detail: 'Mirror Lake (1mi flat), Lower Yosemite Fall (1mi)', time: '30분~1시간', cost: '무료', tip: 'Bridalveil Fall은 셔틀 + 도보 5분' },
      ]
    },
  ],
  SEA: [
    { from: 'SEA-TAC 공항', to: 'Hyatt Regency Downtown', distance: '14mi · 23km', icon: '✈️',
      options: [
        { mode: '🚆 Link Light Rail', detail: '1 Line · SeaTac/Airport → Pioneer Square → 도보 5분', time: '40분', cost: '$3/인', tip: '⭐추천 — 5:00~24:00 운행 · 가장 저렴 · 3인 = $9' },
        { mode: '🚕 Uber/Lyft', detail: 'UberX 직행', time: '25~30분', cost: '$35~50', tip: '평일 러시아워(7~9, 16~18시)엔 라이트레일이 더 빠를 수도' },
        { mode: '🚕 Taxi', detail: 'STITA 택시 카운터', time: '30~40분', cost: '$45~55', tip: 'Uber 없을 때만' },
      ]
    },
    { from: 'Hyatt Regency', to: 'Lumen Field (7/1 경기)', distance: '1mi · 1.6km', icon: '🏟',
      options: [
        { mode: '🚶 도보', detail: 'Downtown → SODO 직진', time: '15~20분', cost: '무료', tip: '⭐ 경기 당일 ⭐ — 차·우버 막힘 · 도보가 최강' },
        { mode: '🚆 Link Light Rail', detail: 'Pioneer Square → Stadium 1정거장', time: '5분 + 도보 5분', cost: '$2.75/인', tip: '경기 끝나면 만원 — 인내심 필요' },
        { mode: '🚕 Uber', detail: '경기일 surge', time: '10~15분 (정상시), 30~60분 (경기 종료)', cost: '$10 정상 → $25~40 surge', tip: '경기 끝나고 우버는 비추 — 도보로 빠져나와서 호출' },
      ]
    },
    { from: 'Hyatt Regency', to: 'SEA 공항 (7/1 저녁 LAS행)', distance: '14mi · 23km', icon: '✈️',
      options: [
        { mode: '🚆 Link Light Rail', detail: 'Pioneer Square → SeaTac/Airport', time: '40분', cost: '$3/인', tip: '경기 후 짐 픽업 → 라이트레일이 가장 빠름 (도로 막힘)' },
        { mode: '🚕 Uber', detail: '경기 종료 후 surge 주의', time: '30~50분', cost: '$45~70 (surge)', tip: '저녁 비행기라 시간 여유 있게' },
      ]
    },
  ],
  LV: [
    { from: 'LAS 공항 (Harry Reid Intl)', to: 'Caesars Palace (Strip 중심)', distance: '3mi · 5km', icon: '🎰',
      options: [
        { mode: '🚕 Uber/Lyft', detail: 'Terminal 3 ride-share zone (3층)', time: '15~20분', cost: '$15~25 (Plan A 심야엔 surge $25~35)', tip: '⭐ Strip 호텔 직행 OK · Plan A 22시 도착이면 surge 주의' },
        { mode: '🚕 Taxi', detail: 'Strip 호텔 정찰 요금', time: '15~20분', cost: '$25~35 (flat rate)', tip: '미터기 안 켜고 정찰가로 가달라 요청' },
        { mode: '🚐 셔틀 (BellTrans)', detail: '합승 셔틀 · Strip 호텔 순회', time: '30~45분', cost: '$13/인 편도', tip: '왕복 $24/인 · 시간 여유 있을 때' },
        { mode: '🚌 RTC Bus (CX 또는 109)', detail: 'Centennial Express · 짐 적을 때만', time: '30~40분', cost: '$2/회', tip: '거의 안 씀 — 짐 제약 있음' },
      ]
    },
    { from: 'Strip 내', to: 'Bellagio · Caesars · Fremont Street 등', distance: '0.5~4mi', icon: '🚶',
      options: [
        { mode: '🚶 도보', detail: 'Strip 내 호텔 간 (Paris→Bellagio→Caesars)', time: '5~15분', cost: '무료', tip: 'Strip은 거리 착시 — 표시보다 1.5배 걸림' },
        { mode: '🚆 Las Vegas Monorail', detail: 'Sahara → MGM Grand · Strip 동쪽', time: '15분 (양 끝)', cost: '$5/회, $15/하루', tip: '⭐ Strip 동쪽 호텔만 커버 (Caesars 비포함 주의)' },
        { mode: '🚌 RTC Deuce', detail: '24h 운행 · Strip + Downtown 풀커버', time: '구간별 5~30분', cost: '$6/2h, $8/24h', tip: '⭐ Fremont Street 갈 때 추천' },
        { mode: '🚕 Uber Strip 내', detail: '바로 호텔 정문', time: '5~10분', cost: '$8~15', tip: 'Strip 도로 자주 막힘 — 짧은 거리도 시간 안 빠름' },
        { mode: '🚌 Fremont까지 Deuce', detail: 'Strip → Fremont Street (4mi)', time: '40~50분', cost: '$8/하루', tip: '저녁 분수쇼 후 Fremont는 Uber도 OK ($15~20)' },
      ]
    },
    { from: 'Caesars Palace', to: 'LAS 공항 (7/4 귀국)', distance: '3mi · 5km', icon: '✈️',
      options: [
        { mode: '🚕 Uber', detail: '터미널 출발 zone', time: '15~25분 (7/4 독립기념일 혼잡)', cost: '$20~35', tip: '⚠️ 7/4 공항 혼잡 — 출발 3시간 전 떠나기' },
        { mode: '🚕 Taxi', detail: 'Strip 호텔 → 공항 flat', time: '15~25분', cost: '$25~35', tip: 'flat rate라 막혀도 추가비 없음' },
      ]
    },
  ],
  LA: [
    { from: 'LAX 공항', to: 'SoFi Stadium (Plan A 6/28 아침 ✅확정)', distance: '4mi · 6.4km', icon: '🏟',
      options: [
        { mode: '🚕 Uber/Lyft', detail: 'LAX-it 라이드쉐어 셔틀 후 픽업 (LAX 규정)', time: '25~45분 (LAX-it 셔틀 포함)', cost: '$25~40', tip: '⭐추천 — 짐 가볍고 시간 압박 시' },
        { mode: '🚇 LA Metro C Line + K Line', detail: 'LAX FlyAway 셔틀 → Aviation/LAX 역 → K Line 환승', time: '50~70분', cost: '$1.75 (LA Metro) + 셔틀 $9.75', tip: '경험 좋아하면 · 짐 없을 때만 추천' },
        { mode: '🚕 Taxi', detail: '미터기 요금', time: '20~35분', cost: '$40~55', tip: 'LA 교통 막힘 — 미터 빠르게 올라감' },
      ]
    },
    { from: 'SoFi Stadium', to: 'LAX (경기 종료 후 SFO 복귀)', distance: '4mi · 6.4km', icon: '✈️',
      options: [
        { mode: '🚕 Uber/Lyft', detail: 'surge 매우 심함 · 5분 멀리 걸어가서 호출 권장', time: '30~60분 (경기 직후)', cost: '$30~70 (surge 2~3x)', tip: '⚠️ 경기 끝나면 7만 명이 동시에 호출 — 인내심 + 30분 도보 후 호출 추천' },
        { mode: '🚇 K Line → FlyAway', detail: 'Westchester/Veterans → Aviation/LAX → LAX 셔틀', time: '60~80분', cost: '$1.75 + $9.75 = $11.50', tip: '비행기 출발 18:30 기준 16:00 전엔 출발해야 안전' },
      ]
    },
  ],
  INTER: [
    { from: 'SFO', to: 'SEA (Plan A 6/30)', distance: '679mi · 1,093km', icon: '✈️',
      options: [
        { mode: '✈️ Alaska Airlines', detail: '직항 다수 · 짐 별도', time: '2시간 30분', cost: '$120~180 (편도)', tip: 'Alaska·Delta 둘 다 많음 · 시애틀 ↔ SF 가장 흔한 노선' },
        { mode: '✈️ Delta', detail: '직항', time: '2시간 30분', cost: '$130~200', tip: '연결편 없음 · 직항 권장' },
      ]
    },
    { from: 'SEA', to: 'LAS (Plan A 7/1)', distance: '961mi · 1,547km', icon: '✈️',
      options: [
        { mode: '✈️ Alaska / Delta', detail: '직항', time: '2시간 30분', cost: '$140~220 (편도)', tip: '경기 후 저녁 비행 — 19시대 항공편 많음' },
      ]
    },
    { from: 'SFO', to: 'LAX (Plan A 6/28 한국전 당일치기 ✅확정)', distance: '337mi · 543km', icon: '✈️',
      options: [
        { mode: '✈️ Southwest', detail: '직항 매시간 · 짐 2개 무료', time: '1시간 30분', cost: '$80~140 (편도)', tip: '⭐ 새벽 6~7시 출발 · 18~19시 복귀편 다수 · 왕복 $160~280' },
        { mode: '✈️ Alaska/Delta', detail: '직항', time: '1시간 30분', cost: '$100~180', tip: '왕복 6/28 당일 · 마일리지 활용 가능' },
        { mode: '✈️ United', detail: '직항', time: '1시간 30분', cost: '$110~200', tip: '얼리버드 예약 ($150 미만 가능)' },
      ]
    },
    { from: 'SFO', to: 'LAS (Plan B 7/1)', distance: '417mi · 671km', icon: '✈️',
      options: [
        { mode: '✈️ Southwest', detail: '직항 다수', time: '1시간 30분', cost: '$80~150 (편도)', tip: '⭐ 가장 저렴 · 짐 2개 무료' },
        { mode: '✈️ Alaska / Delta', detail: '직항', time: '1시간 30분', cost: '$120~200', tip: '마일리지 있으면 활용' },
      ]
    },
    { from: 'LAS', to: 'SFO (7/4 귀국 분기)', distance: '417mi · 671km', icon: '✈️',
      options: [
        { mode: '✈️ Southwest', detail: '직항', time: '1시간 20분', cost: '$90~160', tip: '⚠️ 7/4 독립기념일 — 운임 ↑, 좌석 일찍 매진' },
        { mode: '✈️ United', detail: '직항', time: '1시간 20분', cost: '$110~200', tip: 'OZ211 환승 시간 여유 있게 (3시간 권장)' },
      ]
    },
  ],
}

// ── 예약 전략 ──
// ── 일자별 잠자리 (A/B 100% 동일 — 호텔·항공편 모두 공유) ──
const sleepByNight = [
  { date: '6/26 금', a: 'SF · Hyatt Regency Embarcadero',     b: 'SF · Hyatt Regency Embarcadero',     aTag: 'SF',  bTag: 'SF',  action: 'now', same: true, note: '도착 당일 — 비행 피로 회복' },
  { date: '6/27 토', a: 'SF · Hyatt Regency Embarcadero',     b: 'SF · Hyatt Regency Embarcadero',     aTag: 'SF',  bTag: 'SF',  action: 'now', same: true, note: '⭐ A/B 공통 — 🚋 케이블카 Powell-Hyde · 🔒 Alcatraz · 🚴 Golden Gate · ⚾ Giants 18:05' },
  { date: '6/28 일', a: 'SF · Hyatt Regency Embarcadero',     b: 'SF · Hyatt Regency Embarcadero',     aTag: 'SF',  bTag: 'SF',  action: 'now', same: true, note: 'A: 🇰🇷 LA 항공 당일치기 SFO↔LAX (Match 73) / B: 💻 실리콘밸리 당일치기 (Stanford·Google·Apple Park)' },
  { date: '6/29 월', a: 'YOS · 요셈투어 팬션 (마이리얼트립)', b: 'YOS · 요셈투어 팬션 (마이리얼트립)', aTag: 'YOS', bTag: 'YOS', action: 'now', same: true, note: '⭐ 요셈투어 1박2일 · 약 101만원/인 (본가 778k + $50 서비스 + $100 비거주자 + 점심) · 힐튼 유니온스퀘어 8:00 AM 픽업 · 평점 5.0 (1,616개)' },
  { date: '6/30 화', a: 'SF · Hyatt Regency Embarcadero (1박 연장)', b: 'SEA · Hyatt Regency',   aTag: 'SF',  bTag: 'SEA', action: 'now', same: false, note: 'A(LA 확정): 시애틀 X · SF 1박 연장 → 7/1 LV 직항 / B(시애틀 백업): SFO→SEA 비행 + Hyatt 1박 (월드컵 서징 ⚠️)' },
  { date: '7/1 수',  a: 'LV · Caesars Palace',  b: 'LV · Caesars Palace',  aTag: 'LV',  bTag: 'LV',  action: 'now', same: true, note: 'A: 💻 실리콘밸리(Stanford·Google·Apple) → SFO→LAS 저녁 / B: 13:00 Lumen 경기 → SEA→LAS 저녁' },
  { date: '7/2 목',  a: 'LV · Caesars Palace',  b: 'LV · Caesars Palace',  aTag: 'LV',  bTag: 'LV',  action: 'now', same: true, note: '' },
  { date: '7/3 금',  a: 'LV · Caesars Palace',  b: 'LV · Caesars Palace',  aTag: 'LV',  bTag: 'LV',  action: 'now', same: true, note: '7/4 아침 체크아웃' },
]

const bookingItems = [
  // ── 모든 예약 A/B 공통 — 6/24 결과 무관하게 동일 예약 (standby 없음) ──
  { id: 'sf-base',  label: '✅ SF Hyatt Regency Embarcadero — 3박 (예약 완료)', tag: 'SF',  dates: '6/26 → 6/29', nights: 3, plans: ['A','B'], type: 'now', confirmed: true,
    note: '✅ 예약 완료 · 정가 1실 3박 1,200k원 → CJ 콘도지원 후 실부담 인당 ~212k원 (한국 결제 149k + 현지 fees $46) · 5 Embarcadero Center · BART 직결' },
  { id: 'yosemite', label: '✅ Yosemite 1박2일 투어 (요셈투어 · 마이리얼트립)', tag: 'YOS', dates: '6/29 → 6/30', nights: 1, plans: ['A','B'], type: 'now', confirmed: true,
    note: '⭐ 마이리얼트립 [요셈투어 1박2일] 778,770원/인 + $50 서비스 + $100 비거주자(2026~) + 점심 별도 = 약 1,011,000원/인 · 3인 = 약 3,033,000원 · 힐튼 유니온스퀘어 8:00 AM 픽업 → 다음날 19:00 SF 드롭 · 팬션 숙박 + 스테이크 저녁 + 아침 + 공원 입장료 + 베이브릿지 통행료 · 평점 5.0/5.0 (후기 1,616개) · 최소 5명 출발 (그룹 합류) · 30일 전 전액 환불' },
  { id: 'sf-extend', label: 'SF Hyatt Regency Embarcadero — 1박 연장 (Plan A 전용)', tag: 'SF', dates: '6/30 → 7/1', nights: 1, plans: ['A'], type: 'now',
    note: '⭐ Plan A(LA 확정) 전용 · 마이리얼트립 요세미티 투어 SF 드롭 후 1박 → 7/1 SFO→LAS 직항 · 같은 호텔 4박째 (체크인 연장 가능)' },
  { id: 'sea-hyatt', label: 'SEA Hyatt Regency (1박) — Plan B 전용', tag: 'SEA', dates: '6/30 → 7/1', nights: 1, plans: ['B'], type: 'standby',
    note: 'Plan B(시애틀 백업) 전용 · 조3위 진출 시에만 사용 · downtown Hyatt · ⚠️ 월드컵 서징 ⚠️ 무료취소 옵션으로 예약 (6/25 23:59 이전 취소 가능)' },
  { id: 'lv-base',  label: '✅ LV Caesars Palace — Octavius Pool View, 2 Queens (예약 완료)', tag: 'LV', dates: '7/1 → 7/4', nights: 3, plans: ['A','B'], type: 'now', confirmed: true,
    note: '✅ 예약 완료 · 3570 Las Vegas Blvd S · Octavius Tower 신관(2012) · Pool View · 2 Queen Beds + Rollaway 요청 · OMNIA·Venus Pool·Forum Shops 직속 · 분수쇼 도보 3분 · 24h 프런트' },
]

const decisions = [
  { result: '조2위 진출 — 🇰🇷 LA (Plan A · 확정 시나리오)', planTag: 'A', color: '#7c3aed',
    keep:   ['SF 3박 (6/26~6/29)', 'Yosemite 1박 (6/29~6/30 · 마이리얼트립)', 'SF 1박 연장 (6/30~7/1)', 'LV Caesars 3박 (7/1~7/4)'],
    cancel: ['SEA Hyatt 1박 (시애틀 안 감)', '(6/28 LA 항공 당일치기 SFO↔LAX 확정)'] },
  { result: '조3위 진출 — 🏟 시애틀 (Plan B · 백업)', planTag: 'B', color: '#e11d48',
    keep:   ['SF 3박 (6/26~6/29)', 'Yosemite 1박 (6/29~6/30 · 마이리얼트립)', 'SEA Hyatt 1박 (6/30~7/1)', 'LV Caesars 3박 (7/1~7/4)'],
    cancel: ['SF 1박 연장 (Plan A 전용)', '(7/1 Lumen 경기 · 시애틀 진출 시)'] },
]

// ── Computed ──
// ── 체코전 승리 → LA가 새 Plan A(확정), 시애틀이 새 Plan B(백업) ──
const currentDays = computed(() => activePlan.value === 'a' ? laDays : aDays)
const currentHotels = computed(() => activePlan.value === 'a' ? laHotels : aHotels)
// 1박당 1인 금액 — perPerson:true이면 그대로, 아니면 1실가격/3
function perNightPerPerson(h, tier) { return h.perPerson ? h[tier] : h[tier] / 3 }
// 호텔당 인당 총액 (박당 × 박수)
function perPersonHotel(h, tier) { return perNightPerPerson(h, tier) * h.nights }
// 전체 일정 인당 합계
function totalPerPerson(tier) { return currentHotels.value.reduce((s, h) => s + perPersonHotel(h, tier), 0) }
// 3인 그룹 합계
function totalFor(tier) { return totalPerPerson(tier) * 3 }

const cityColors = {
  'SF': '#0052cc', 'SF→SEA': '#0ea5e9', 'SF→LA': '#e11d48', 'SF→LV': '#7c3aed',
  'LA': '#dc2626', 'LA→LV': '#f59e0b', 'LA→SF': '#f97316', 'SF↔LA': '#e11d48', 'LV': '#d97706', 'LV→SF': '#6366f1',
  'LV→SEA': '#10b981', 'SEA': '#0ea5e9', 'SEA→SF': '#6366f1', 'SEA→LV': '#f59e0b', 'SEA→SFO': '#64748b', 'LV→SFO': '#64748b', 'SV': '#059669', 'SFO': '#64748b',
  'YOS': '#22c55e', 'YOS→SF': '#f59e0b', 'SF→YOS': '#16a34a',
}

// ── 시간대 자동 분류 (한눈에 보이게 그룹화) ──
function parseHour(timeStr) {
  if (!timeStr) return -1
  const s = String(timeStr)
  if (s.includes('새벽')) return 4
  if (s.includes('아침') || s.includes('오전')) return 9
  if (s.includes('점심') || s.includes('낮')) return 12
  if (s.includes('오후')) return 15
  if (s.includes('저녁')) return 19
  if (s.includes('밤')) return 22
  const m = s.match(/(\d{1,2})\s*[:시]/)
  if (m) return parseInt(m[1], 10)
  return -1
}
const timeBuckets = [
  { key: 'dawn',    label: '새벽',  range: [0, 6],   icon: '🌙', tint: '#6366f1' },
  { key: 'morning', label: '오전',  range: [6, 12],  icon: '🌅', tint: '#f59e0b' },
  { key: 'noon',    label: '점심',  range: [12, 14], icon: '🍱', tint: '#10b981' },
  { key: 'afternoon', label: '오후', range: [14, 18], icon: '☀️', tint: '#06b6d4' },
  { key: 'evening', label: '저녁',  range: [18, 22], icon: '🌆', tint: '#e11d48' },
  { key: 'night',   label: '밤',   range: [22, 25], icon: '🌃', tint: '#7c3aed' },
]
function bucketFor(hour) {
  if (hour < 0) return timeBuckets[1]
  return timeBuckets.find(b => hour >= b.range[0] && hour < b.range[1]) || timeBuckets[5]
}
const enrichedDays = computed(() => {
  return currentDays.value.map((day, idx) => {
    const buckets = {}
    timeBuckets.forEach(b => { buckets[b.key] = { ...b, items: [] } })
    day.items.forEach(item => {
      const h = parseHour(item.time)
      const b = bucketFor(h)
      buckets[b.key].items.push(item)
    })
    const dateMatch = day.date.match(/(\d+\/\d+)\s*(.+)/)
    return {
      ...day,
      dayNum: idx + 1,
      dateOnly: dateMatch ? dateMatch[1] : day.date,
      weekday: dateMatch ? dateMatch[2] : '',
      isCityChange: day.cityTag.includes('→') || day.cityTag.includes('↔'),
      activeBuckets: timeBuckets.map(b => buckets[b.key]).filter(b => b.items.length > 0),
    }
  })
})
const tripStats = computed(() => {
  const days = currentDays.value
  if (!days.length) return null
  const cities = new Set()
  days.forEach(d => { d.cityTag.split(/→|↔/).forEach(c => cities.add(c.trim())) })
  return {
    days: days.length,
    cities: cities.size,
    transitDays: days.filter(d => d.cityTag.includes('→') || d.cityTag.includes('↔')).length,
    highlights: days.filter(d => d.highlight).length,
    startDate: days[0].date,
    endDate: days[days.length - 1].date,
  }
})
</script>

<template>
  <div class="itinerary">

    <!-- ── 플랜 토글 (항상 노출) ── -->
    <div class="plan-toggle">
      <button class="plan-btn plan-a" :class="{ active: activePlan === 'a' }" @click="activePlan = 'a'">
        🇰🇷 Plan A — LA 한국 R32 + LV <span class="plan-badge">조2위 ✅확정</span>
        <span class="plan-sub">SF(3박, ✈️ 6/28 LA 항공 당일치기) + ⛰YOS 1박 + SEA(1박 관광) + LV(3박) · Match 73 SoFi 6/28 · ⭐ 체코전 승리 → 확정 시나리오</span>
      </button>
      <button class="plan-btn plan-b" :class="{ active: activePlan === 'b' }" @click="activePlan = 'b'">
        🏟️ Plan B — 시애틀 R32 + LV <span class="plan-badge red">조3위 백업</span>
        <span class="plan-sub">SF(3박) + ⛰YOS 1박 + SEA(1박) + LV(3박) · 7/1 Lumen Match 82 · ⭐ A/B 호텔·항공 100% 동일</span>
      </button>
    </div>

    <!-- ── 📅 일정 타임라인 (메인 · 최상단 · 디폴트 펼침) ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.timeline = !open.timeline">
        <span class="acc-icon">📅</span>
        <span class="acc-title">일정 타임라인</span>
        <span class="acc-meta">6/26(금) ~ 7/4(토) · {{ currentDays.length }}일</span>
        <span class="acc-chevron" :class="{ rotated: open.timeline }">›</span>
      </div>
      <div v-show="open.timeline" class="acc-body timeline-body-v2">

        <!-- 일자별 카드 -->
        <div class="timeline-v2">
          <div v-for="(day, idx) in enrichedDays" :key="activePlan + idx" class="day-card-v2" :class="{ 'is-highlight': day.highlight, 'is-transit': day.isCityChange }">

            <!-- 날짜 카드 헤더 -->
            <div class="day-head-v2" :style="{ '--city-color': cityColors[day.cityTag] || '#64748b' }">
              <div class="day-head-left">
                <div class="day-num-pill">
                  <span class="dnp-label">DAY</span>
                  <span class="dnp-val">{{ day.dayNum }}</span>
                </div>
                <div class="day-date-block">
                  <div class="day-date-main">{{ day.dateOnly }}</div>
                  <div class="day-weekday">{{ day.weekday }}</div>
                </div>
              </div>
              <div class="day-head-mid">
                <div class="day-icon-v2">{{ day.icon }}</div>
                <div class="day-city-block">
                  <div class="day-city-v2">{{ day.city }}</div>
                  <div class="day-city-tag-row">
                    <span class="city-chip-v2" :style="{ background: (cityColors[day.cityTag]||'#334155')+'22', color: cityColors[day.cityTag]||'#94a3b8', borderColor: (cityColors[day.cityTag]||'#334155')+'55' }">{{ day.cityTag }}</span>
                    <span v-if="day.isCityChange" class="transit-chip">✈️ 이동</span>
                    <span v-if="day.rvDay" class="rv-day-badge">🚐 캠핑카</span>
                  </div>
                </div>
              </div>
              <div class="day-head-right">
                <span v-if="day.highlight && activePlan === 'b'" class="highlight-pill-v2">⚽ R32 경기일</span>
                <span v-if="day.highlight && activePlan === 'a'" class="highlight-pill-v2 la-pill">🇰🇷 한국 R32</span>
              </div>
            </div>

            <!-- 주의 / 대기 메시지 -->
            <div v-if="day.note" class="day-warning">
              <span class="warn-icon">⚠️</span>
              <span class="warn-text">{{ day.note }}</span>
            </div>
            <div v-if="day.standby" class="day-standby-v2">
              <span class="standby-label">{{ day.standby.label }}</span>
              <span class="standby-text">{{ day.standby.text }}</span>
              <span class="standby-cancel">취소 기한: {{ day.standby.cancelBy }}</span>
            </div>

            <!-- 시간대별 슬롯 -->
            <div class="day-body-v2">
              <div v-for="bucket in day.activeBuckets" :key="bucket.key" class="time-bucket">
                <div class="bucket-rail" :style="{ background: bucket.tint }"></div>
                <div class="bucket-content">
                  <div class="bucket-label-row">
                    <span class="bucket-icon" :style="{ background: bucket.tint+'22', color: bucket.tint }">{{ bucket.icon }}</span>
                    <span class="bucket-label">{{ bucket.label }}</span>
                  </div>
                  <div class="bucket-items">
                    <div v-for="(item, i) in bucket.items" :key="i" class="sched-card" :class="{ 'is-bold': item.bold, 'is-baseball': item.baseball }">
                      <div class="sched-time-pill" :style="{ borderColor: bucket.tint+'66', color: bucket.tint }">{{ item.time }}</div>
                      <div class="sched-text-v2">{{ item.text }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 다음날 연결선 -->
            <div v-if="idx < enrichedDays.length - 1" class="day-connector-v2">
              <div class="conn-line"></div>
              <div class="conn-dot"></div>
              <div class="conn-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 부록: 부가 정보 (디폴트 닫힘) ── -->

    <!-- ── 💰 예상 비용 (인당 · 3명 분담 기준) ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.cost = !open.cost">
        <span class="acc-icon">💰</span>
        <span class="acc-title">예상 비용 (인당)</span>
        <span class="acc-meta">{{ currentCost.label }} · 총 <strong style="color: var(--accent)">{{ fmtKRW(costTotals.total) }}원</strong> / 인 (3명 분담)</span>
        <span class="acc-chevron" :class="{ rotated: open.cost }">›</span>
      </div>
      <div v-show="open.cost" class="acc-body cost-body">
        <!-- 카테고리별 요약 -->
        <div class="cost-summary">
          <div class="cost-cat-card hotel">
            <span class="cc-icon">🏨</span>
            <span class="cc-label">숙박</span>
            <span class="cc-amount">{{ fmtKRW(costTotals.hotel) }}만</span>
          </div>
          <div class="cost-cat-card flight">
            <span class="cc-icon">✈️</span>
            <span class="cc-label">항공</span>
            <span class="cc-amount">{{ fmtKRW(costTotals.flight) }}만</span>
          </div>
          <div class="cost-cat-card ticket">
            <span class="cc-icon">🎫</span>
            <span class="cc-label">월드컵 티켓</span>
            <span class="cc-amount">{{ fmtKRW(costTotals.ticket) }}만</span>
          </div>
          <div class="cost-cat-card activity">
            <span class="cc-icon">🎯</span>
            <span class="cc-label">액티비티+식비</span>
            <span class="cc-amount">{{ fmtKRW(costTotals.activity) }}만</span>
          </div>
          <div class="cost-cat-card total">
            <span class="cc-icon">💰</span>
            <span class="cc-label">총 합계 (인당)</span>
            <span class="cc-amount">{{ fmtKRW(costTotals.total) }}만</span>
          </div>
        </div>

        <!-- 카테고리별 상세 -->
        <div class="cost-section">
          <h4 class="cost-h4">🏨 숙박 ({{ fmtKRW(costTotals.hotel) }}만)</h4>
          <div class="cost-list">
            <div v-for="(x, i) in currentCost.hotel" :key="'h'+i" class="cost-row">
              <span class="cr-name">{{ x.name }}</span>
              <span class="cr-detail">{{ x.detail }}</span>
              <span class="cr-amount">{{ fmtKRW(x.perPerson) }}만</span>
            </div>
          </div>
        </div>

        <div class="cost-section">
          <h4 class="cost-h4">✈️ 항공 ({{ fmtKRW(costTotals.flight) }}만)</h4>
          <div class="cost-list">
            <div v-for="(x, i) in currentCost.flight" :key="'f'+i" class="cost-row">
              <span class="cr-name">{{ x.name }}</span>
              <span class="cr-detail">{{ x.detail }}</span>
              <span class="cr-amount">{{ fmtKRW(x.perPerson) }}만</span>
            </div>
          </div>
        </div>

        <div class="cost-section">
          <h4 class="cost-h4">🎫 월드컵 티켓 ({{ fmtKRW(costTotals.ticket) }}만)</h4>
          <div class="cost-list">
            <div v-for="(x, i) in currentCost.ticket" :key="'t'+i" class="cost-row">
              <span class="cr-name">{{ x.name }}</span>
              <span class="cr-detail">{{ x.detail }}</span>
              <span class="cr-amount">{{ fmtKRW(x.perPerson) }}만</span>
            </div>
          </div>
        </div>

        <div class="cost-section">
          <h4 class="cost-h4">🎯 액티비티+식비 ({{ fmtKRW(costTotals.activity) }}만)</h4>
          <div class="cost-list">
            <div v-for="(x, i) in currentCost.activity" :key="'a'+i" class="cost-row">
              <span class="cr-name">{{ x.name }}</span>
              <span class="cr-detail">{{ x.detail }}</span>
              <span class="cr-amount">{{ fmtKRW(x.perPerson) }}만</span>
            </div>
          </div>
        </div>

        <div class="cost-footnote">
          ※ 인당 가격은 3명 분담 기준 (호텔·투어 등)<br>
          ※ 항공권은 성수기 6/26~7/4 예상치 (예약 시점 변동 ±50만)<br>
          ※ 카지노 베팅·쇼핑은 개인 스타일에 따라 변동 큼
        </div>
      </div>
    </div>

    <!-- ── 💸 정산 (받은 돈 / 받을 돈) ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.settlement = !open.settlement">
        <span class="acc-icon">💸</span>
        <span class="acc-title">정산 (받은 돈 / 받을 돈)</span>
        <span class="acc-meta">{{ currentCost.label }} · 1인 분담(항공 제외) <strong style="color: var(--accent)">{{ fmtKRW(sharedCost) }}만원</strong> · 잔여 합계 <strong :style="{ color: settlementTotal > 0 ? '#f97316' : '#22c55e' }">{{ settlementTotal > 0 ? '+' : '' }}{{ fmtKRW(settlementTotal) }}만</strong></span>
        <span class="acc-chevron" :class="{ rotated: open.settlement }">›</span>
      </div>
      <div v-show="open.settlement" class="acc-body">
        <!-- 선납 명목 항목 부담 가이드 -->
        <div class="earmark-banner">
          <div class="eb-title">📌 200만 선납 명목 = 다음 3개 항목 (1인 부담 기준)</div>
          <div class="eb-rows">
            <span class="eb-item">🏨 SF Hyatt 4박 <strong>{{ fmtKRW(earmarkedCost.sfHyatt) }}만</strong></span>
            <span class="eb-plus">+</span>
            <span class="eb-item">🏞 요세미티(요셈투어) <strong>{{ fmtKRW(earmarkedCost.yosemite) }}만</strong></span>
            <span class="eb-plus">+</span>
            <span class="eb-item">🏎 SpeedVegas <strong>{{ fmtKRW(earmarkedCost.speedvegas) }}만</strong></span>
            <span class="eb-eq">=</span>
            <span class="eb-total">총 <strong>{{ fmtKRW(earmarkedCost.total()) }}만</strong></span>
            <span class="eb-diff" :class="{ 'eb-surplus': 2000000 - earmarkedCost.total() >= 0, 'eb-short': 2000000 - earmarkedCost.total() < 0 }">
              200만 대비 {{ 2000000 - earmarkedCost.total() >= 0 ? '+' : '−' }}{{ fmtKRW(Math.abs(2000000 - earmarkedCost.total())) }}만
            </span>
          </div>
          <div class="eb-note">↳ 잔여 ({{ fmtKRW(costTotals.total - costTotals.flight - 1500000 - earmarkedCost.total()) }}만/인): LV Caesars + 기타 LV 활동(Adventuredome·서커스 등) + 식비 — 추가 정산 대상</div>
        </div>

        <div class="settle-grid">
          <div v-for="s in settlement" :key="s.person" class="settle-card" :class="{ 'settle-paid': s.balance <= 0, 'settle-owe': s.balance > 0 }">
            <div class="settle-head">
              <span class="settle-name">{{ s.person }}</span>
              <span class="settle-badge" :class="{ 'badge-paid': s.balance <= 0, 'badge-owe': s.balance > 0 }">
                {{ s.balance > 0 ? '추가로 받을 돈' : s.balance < 0 ? '돌려줄 돈' : '정산 완료' }}
              </span>
            </div>

            <div class="settle-items">
              <div v-for="(i, idx) in s.items" :key="idx" class="settle-item-row">
                <span class="si-type" :class="{ 'si-ticket': i.type === '티켓' }">{{ i.type }}</span>
                <span class="si-amount">+{{ fmtKRW(i.amount) }}만</span>
                <span class="si-note">{{ i.note }}</span>
              </div>
            </div>

            <div class="settle-divider"></div>

            <div class="settle-summary-rows">
              <div class="ss-line">
                <span class="ss-label">받은 총액</span>
                <span class="ss-value received">{{ fmtKRW(s.received) }}만</span>
              </div>
              <div class="ss-line">
                <span class="ss-label">1인 분담 비용 <em class="ss-em">(항공 제외)</em></span>
                <span class="ss-value cost">{{ fmtKRW(s.cost) }}만</span>
              </div>
              <div class="ss-line ss-line-aside">
                <span class="ss-label">✈️ 각자 항공권 (별도 부담)</span>
                <span class="ss-value aside">{{ fmtKRW(s.flightOwn) }}만</span>
              </div>
              <div class="ss-line ss-balance">
                <span class="ss-label">{{ s.balance > 0 ? '받을 돈' : s.balance < 0 ? '돌려줄 돈' : '정산 OK' }}</span>
                <span class="ss-value" :class="{ owe: s.balance > 0, surplus: s.balance < 0 }">
                  {{ s.balance > 0 ? '+' : s.balance < 0 ? '−' : '' }}{{ fmtKRW(Math.abs(s.balance)) }}만
                </span>
              </div>
            </div>
          </div>
        </div>
        <p class="settle-note">
          💡 1인 분담 비용 = 호텔 + 티켓 + 액티비티/식비 (각자 따로 결제한 <strong>항공권은 제외</strong>). 환율·실제 예약가에 따라 변동 가능 ·
          현재 플랜 변경 시 자동 재계산됩니다.
        </p>
      </div>
    </div>

    <!-- ── 🎯 액티비티 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.activities = !open.activities">
        <span class="acc-icon">🎯</span>
        <span class="acc-title">남자 3인 액티비티</span>
        <span class="acc-meta">도시별 추천 · 스포츠·액티브·레저</span>
        <span class="acc-chevron" :class="{ rotated: open.activities }">›</span>
      </div>
      <div v-show="open.activities" class="acc-body">
        <div class="act-city-tabs">
          <button
            v-for="(label, city) in actCityLabel"
            :key="city"
            class="act-tab"
            :class="{ 'act-tab-active': activeActCity === city }"
            @click="activeActCity = city"
          >{{ label }}</button>
        </div>
        <div class="act-grid">
          <div v-for="act in activities[activeActCity]" :key="act.name" class="act-card">
            <div class="act-emoji">{{ act.emoji }}</div>
            <div class="act-info">
              <div class="act-top-row">
                <span class="act-name">{{ act.name }}</span>
                <span class="act-type-badge">{{ act.type }}</span>
              </div>
              <div class="act-price-row">
                <span class="act-price">{{ act.price }}</span>
                <span v-if="act.duration" class="act-duration">⏱ {{ act.duration }}</span>
              </div>
              <div class="act-desc">{{ act.desc }}</div>
              <div class="act-tip">💡 {{ act.tip }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 🚇 이동수단 가이드 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.transport = !open.transport">
        <span class="acc-icon">🚇</span>
        <span class="acc-title">이동수단 가이드</span>
        <span class="acc-meta">도시별 주요 구간 · 지하철·버스·택시·Uber 비교</span>
        <span class="acc-chevron" :class="{ rotated: open.transport }">›</span>
      </div>
      <div v-show="open.transport" class="acc-body">
        <div class="tp-city-tabs">
          <button
            v-for="(label, city) in transportCityLabel"
            :key="city"
            class="tp-tab"
            :class="{ 'tp-tab-active': activeTransportCity === city }"
            @click="activeTransportCity = city"
          >{{ label }}</button>
        </div>
        <div class="tp-routes">
          <div v-for="route in transportRoutes[activeTransportCity]" :key="route.from + route.to" class="tp-route-card">
            <div class="tp-route-head">
              <span class="tp-route-icon">{{ route.icon }}</span>
              <div class="tp-route-od">
                <span class="tp-from">{{ route.from }}</span>
                <span class="tp-arrow">→</span>
                <span class="tp-to">{{ route.to }}</span>
              </div>
              <span class="tp-dist">{{ route.distance }}</span>
            </div>
            <div class="tp-options">
              <div v-for="opt in route.options" :key="opt.mode" class="tp-option">
                <div class="tp-mode">{{ opt.mode }}</div>
                <div class="tp-detail-col">
                  <div class="tp-detail">{{ opt.detail }}</div>
                  <div class="tp-tip">💡 {{ opt.tip }}</div>
                </div>
                <div class="tp-meta-col">
                  <div class="tp-time">⏱ {{ opt.time }}</div>
                  <div class="tp-cost">💵 {{ opt.cost }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── ✈️ 항공편 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.flights = !open.flights">
        <span class="acc-icon">✈️</span>
        <span class="acc-title">아시아나 항공편</span>
        <span class="acc-meta">OZ212 · OZ211 · 6/26~7/4</span>
        <span class="acc-chevron" :class="{ rotated: open.flights }">›</span>
      </div>
      <div v-show="open.flights" class="acc-body">
        <div class="flight-grid">
          <div v-for="f in flights" :key="f.flight" class="flight-item">
            <div class="flight-badge-tag">{{ f.label }}</div>
            <div class="flight-number">{{ f.flight }}</div>
            <div class="flight-route">{{ f.route }}</div>
            <div class="flight-times">
              <span class="ft-dep">출발 {{ f.dep }}</span>
              <span class="ft-arrow">→</span>
              <span class="ft-arr">도착 {{ f.arr }}</span>
            </div>
            <div class="flight-meta">{{ f.aircraft }} · {{ f.duration }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── ⚾ Giants ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.giants = !open.giants">
        <span class="acc-icon">⚾</span>
        <span class="acc-title">SF Giants @ Oracle Park</span>
        <span class="acc-meta">6/26~28 vs Atlanta Braves 3연전</span>
        <span class="acc-chevron" :class="{ rotated: open.giants }">›</span>
      </div>
      <div v-show="open.giants" class="acc-body">
        <div class="giants-grid">
          <div v-for="g in giants" :key="g.date" class="giants-item">
            <div class="g-date">{{ g.date }}</div>
            <div class="g-time">{{ g.time }} PDT</div>
            <div class="g-opp">{{ g.opponent }}</div>
            <div class="g-note">{{ g.note }}</div>
          </div>
        </div>
        <p class="tip-bar">🎟 티켓: mlb.com/giants 또는 SeatGeek · 방문일 결정 후 사전 구매 권장</p>
      </div>
    </div>

    <!-- ── ⚽ 월드컵 시나리오 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.worldcup = !open.worldcup">
        <span class="acc-icon">⚽</span>
        <span class="acc-title">월드컵 한국 R32 시나리오</span>
        <span class="acc-meta">Group A · FIFA Annex C 분석</span>
        <span class="acc-chevron" :class="{ rotated: open.worldcup }">›</span>
      </div>
      <div v-show="open.worldcup" class="acc-body">
        <div class="wc-group-badge">Group A — 🇰🇷 한국 · 🇲🇽 멕시코(개최국) · 🇿🇦 남아공 · 🇨🇿 체코</div>

        <!-- 순위별 시나리오 -->
        <div class="wc-rows">
          <div v-for="r in wcRows" :key="r.rank" class="wc-row" :class="{ 'wc-ok': r.ok, 'wc-no': !r.ok }">
            <span class="wc-rank">{{ r.rank }}</span>
            <span class="wc-match">{{ r.match }}</span>
            <span class="wc-date">{{ r.date }}</span>
            <span class="wc-venue">{{ r.venue }}</span>
            <span class="wc-plan-tag bc" v-if="r.plan === 'B'">Plan B</span>
            <span class="wc-plan-tag ac" v-if="r.plan === 'A'">Plan A</span>
            <span class="wc-note">{{ r.note }}</span>
          </div>
        </div>

        <!-- FIFA Annex C 결과 -->
        <div class="annexc-block">
          <div class="annexc-title">📊 FIFA Annex C 원문 파싱 결과 — 조3위 진출 시 경기장 배정</div>
          <div class="annexc-sub">공식 PDF (FWC2026_regulations_EN.pdf) 495개 조합 직접 분석</div>
          <div class="annexc-bars">
            <div class="bar-row seattle">
              <div class="bar-label">
                <span class="bar-venue">🏟️ Lumen Field, <strong>Seattle</strong></span>
                <span class="bar-match">Match 82 · 7/1 13:00 PT</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill seattle-fill" style="width: 95.2%"></div>
              </div>
              <div class="bar-stat"><span class="bar-pct">95.2%</span><span class="bar-cnt">314 / 330</span></div>
            </div>
            <div class="bar-row foxborough">
              <div class="bar-label">
                <span class="bar-venue">Gillette Stadium, Foxborough</span>
                <span class="bar-match">Match 74 · 6/29</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill fox-fill" style="width: 4.8%"></div>
              </div>
              <div class="bar-stat"><span class="bar-pct muted">4.8%</span><span class="bar-cnt muted">16 / 330</span></div>
            </div>
          </div>

          <div class="prob-summary">
            <div class="prob-box">
              <div class="prob-label">조3위 중 8팀 진출</div>
              <div class="prob-val">{{ annexC.qualify }} / {{ annexC.total }}</div>
              <div class="prob-pct">66.7%</div>
            </div>
            <div class="prob-arrow">×</div>
            <div class="prob-box highlight-box">
              <div class="prob-label">진출 시 시애틀 배정</div>
              <div class="prob-val">{{ annexC.seattle }} / {{ annexC.qualify }}</div>
              <div class="prob-pct">95.2%</div>
            </div>
            <div class="prob-arrow">=</div>
            <div class="prob-box result-box">
              <div class="prob-label">조3위 → 시애틀 전체 확률</div>
              <div class="prob-val">&nbsp;</div>
              <div class="prob-pct">≈ 63.5%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 🏨 숙박비 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.hotels = !open.hotels">
        <span class="acc-icon">🏨</span>
        <span class="acc-title">숙박비 산출</span>
        <span class="acc-meta">3인 N분의 1 · 환율 ₩{{ KRW.toLocaleString() }}/$</span>
        <span class="acc-chevron" :class="{ rotated: open.hotels }">›</span>
      </div>
      <div v-show="open.hotels" class="acc-body">
        <div class="cost-table-wrap">
          <table class="cost-table">
            <thead><tr><th>도시</th><th>기간</th><th>박수</th><th>이코노미/박/인</th><th>추천/박/인</th><th>인당 소계</th><th>비고</th></tr></thead>
            <tbody>
              <tr v-for="h in currentHotels" :key="h.dates + h.city">
                <td>
                  <span class="ct-tag" :style="{ background: (cityColors[h.tag]||'#334155')+'22', color: cityColors[h.tag]||'#94a3b8' }">{{ h.city }}</span>
                  <span v-if="h.perPerson" class="pp-badge" title="이미 1인 기준 가격">1인</span>
                </td>
                <td class="mono">{{ h.dates }}</td>
                <td class="center">{{ h.nights }}박</td>
                <td class="num eco">{{ usd(Math.round(perNightPerPerson(h, 'economy'))) }}</td>
                <td class="num mid">{{ usd(Math.round(perNightPerPerson(h, 'mid'))) }}</td>
                <td class="num eco" style="font-weight:700">{{ usd(Math.round(perPersonHotel(h, 'economy'))) }}</td>
                <td class="note-cell">{{ h.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="cost-summary">
          <div class="cost-block eco-block">
            <div class="cb-label">이코노미 · 인당 합계</div>
            <div class="cb-usd">{{ usd(Math.round(totalPerPerson('economy'))) }}</div>
            <div class="cb-krw">{{ krw(totalPerPerson('economy')) }}</div>
            <div class="cb-per">3인 {{ usd(Math.round(totalFor('economy'))) }} · {{ krw(totalFor('economy')) }}</div>
          </div>
          <div class="cost-block mid-block">
            <div class="cb-label">추천 · 인당 합계</div>
            <div class="cb-usd">{{ usd(Math.round(totalPerPerson('mid'))) }}</div>
            <div class="cb-krw">{{ krw(totalPerPerson('mid')) }}</div>
            <div class="cb-per">3인 {{ usd(Math.round(totalFor('mid'))) }} · {{ krw(totalFor('mid')) }}</div>
          </div>
        </div>
        <p class="cost-note">※ <strong>1인 기준 금액</strong> · SF/SEA/LV는 1실 3인 공유로 ÷3 적용 · YOS는 투어가 이미 1인 기준 (1인 뱃지 표시) · 세금·리조트피 포함 추정</p>
      </div>
    </div>

    <!-- ── 🗓 예약 전략 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.booking = !open.booking">
        <span class="acc-icon">🗓</span>
        <span class="acc-title">예약 전략</span>
        <span class="acc-meta">동시 예약 · 6/24 후 취소 분기</span>
        <span class="acc-chevron" :class="{ rotated: open.booking }">›</span>
      </div>
      <div v-show="open.booking" class="acc-body">

        <!-- 🛏 일자별 잠자리 한눈에 -->
        <div class="sleep-table-wrap">
          <div class="sleep-table-title">🛏 오늘 어디서 잠? — 일자별 잠자리 한눈에</div>
          <table class="sleep-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th><span class="plan-pill plan-pill-a">Plan A</span></th>
                <th><span class="plan-pill plan-pill-b">Plan B</span></th>
                <th>예약</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in sleepByNight" :key="n.date" :class="{ 'sleep-branch': !n.same }">
                <td class="sleep-date">{{ n.date }}</td>
                <td>
                  <span class="ct-tag" :style="{ background: (cityColors[n.aTag]||'#334155')+'22', color: cityColors[n.aTag]||'#94a3b8' }">{{ n.aTag }}</span>
                  <span class="sleep-where">{{ n.a }}</span>
                </td>
                <td>
                  <span class="ct-tag" :style="{ background: (cityColors[n.bTag]||'#334155')+'22', color: cityColors[n.bTag]||'#94a3b8' }">{{ n.bTag }}</span>
                  <span class="sleep-where">{{ n.b }}</span>
                </td>
                <td>
                  <span class="sleep-action" :class="'action-' + n.action">
                    {{ n.action === 'now' ? '✅ 즉시 예약' : '⏳ 6/24 후 분기' }}
                  </span>
                </td>
                <td class="sleep-note">{{ n.note }}</td>
              </tr>
            </tbody>
          </table>
          <p class="sleep-hint">💡 <strong>핵심 트릭 — 짐 보관으로 1박값 절약</strong> · Yosemite 가는 아침 Hyatt Regency Embarcadero 체크아웃 시 프런트에 "<em>Could you store our luggage for one night?</em>" 요청 → 거의 모든 호텔이 무료 보관 OK · 복귀 후 같은 호텔로 재체크인 (비고에 "Returning guest" 적으면 같은 룸 배정 시도해줌) · <strong>1박 요금(~$190~230) 절약 + Yosemite 가벼운 짐 ✅</strong></p>
        </div>

        <div class="phase-block">
          <div class="phase-label phase-now">① 지금 바로 예약 — A/B 공통 (변동 0%)</div>
          <div class="bk-list">
            <div v-for="item in bookingItems.filter(i => i.type === 'now')" :key="item.id" class="bk-row" :class="{ 'bk-confirmed': item.confirmed }">
              <span class="bk-tag" :style="{ background: (cityColors[item.tag]||'#334155')+'22', color: cityColors[item.tag]||'#94a3b8' }">{{ item.tag }}</span>
              <span class="bk-label">{{ item.label }}</span>
              <span class="bk-dates mono">{{ item.dates }}</span>
              <span class="bk-nights">{{ item.nights }}박</span>
              <span class="bk-plans"><span v-for="p in item.plans" :key="p" class="plan-chip" :class="'chip-'+p.toLowerCase()">{{ p }}</span></span>
              <span v-if="item.confirmed" class="bk-confirmed-badge">✅ 완료</span>
              <span class="bk-note">{{ item.note }}</span>
            </div>
          </div>
        </div>
        <div class="phase-block">
          <div class="phase-label phase-standby">② 동시 대기 — A/B 둘 다 무료취소 상품으로 예약, 6/24 경기 후 하나 취소</div>
          <div class="bk-list">
            <div v-for="item in bookingItems.filter(i => i.type !== 'now')" :key="item.id" class="bk-row">
              <span class="bk-tag" :style="{ background: (cityColors[item.tag]||'#334155')+'22', color: cityColors[item.tag]||'#94a3b8' }">{{ item.tag }}</span>
              <span class="bk-label">{{ item.label }}</span>
              <span class="bk-dates mono">{{ item.dates }}</span>
              <span class="bk-nights">{{ item.nights }}박</span>
              <span class="bk-plans"><span v-for="p in item.plans" :key="p" class="plan-chip" :class="'chip-'+p.toLowerCase()">{{ p }}</span></span>
              <span class="bk-note">{{ item.note }}</span>
            </div>
          </div>
          <p class="conflict-hint">⚠️ 두 박 모두 6/30→7/1 같은 1박이라 동시 점유 불가 → <strong>반드시 무료취소 가능 상품</strong>으로 양쪽 다 잡고 6/24 후 한쪽 캔슬</p>
        </div>
        <div class="decision-header">📅 6/24 (수) 경기 후 — 플랜 확정 & 취소</div>
        <div class="decision-grid">
          <div v-for="d in decisions" :key="d.planTag" class="decision-card" :style="{ '--dc-color': d.color }">
            <div class="dc-top">
              <span class="dc-plan-tag" :style="{ background: d.color }">Plan {{ d.planTag }}</span>
              <span class="dc-result">{{ d.result }}</span>
            </div>
            <div class="dc-body">
              <div class="dc-col">
                <div class="dc-section-label keep-lbl">✅ 유지</div>
                <div v-for="k in d.keep" :key="k" class="dc-item dc-keep">{{ k }}</div>
              </div>
              <div class="dc-divider"></div>
              <div class="dc-col">
                <div class="dc-section-label cancel-lbl">❌ 취소</div>
                <div v-for="c in d.cancel" :key="c" class="dc-item dc-cancel">{{ c }}</div>
              </div>
            </div>
          </div>
        </div>
        <p class="booking-tip">💡 예약 시 취소 정책 스크린샷 필수 보관. 6/24 경기 종료 즉시 불필요 예약 취소 진행.</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.itinerary {
  display: flex; flex-direction: column; gap: 1rem;

  /* ── 라이트 테마 — 모바일 APP 친화 · 한눈에 보이는 UI ── */
  --text:         #0f172a;
  --text-muted:   #334155;
  --text-dim:     #64748b;
  --bg:           #f1f5f9;
  --bg-elevated:  #ffffff;
  --bg-overlay:   #f8fafc;
  --border:       #cbd5e1;
  --border-muted: #e2e8f0;
  --accent:       #2563eb;
  --accent-hover: #1d4ed8;
  --accent-bg:    rgba(37,99,235,.10);

  background: #e2e8f0;
  padding: 1rem;
  border-radius: 16px;
}

/* ── Plan Toggle ── */
.plan-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; }
.plan-btn {
  display: flex; flex-direction: column; gap: .25rem;
  padding: .85rem 1rem; border-radius: var(--radius-lg);
  border: 2px solid var(--border); background: var(--bg-elevated);
  color: var(--text-muted); font-size: .85rem; font-weight: 700;
  text-align: left; cursor: pointer; transition: var(--transition);
}
.plan-btn:hover { border-color: var(--accent); color: var(--text); }
.plan-btn.plan-a.active { border-color: #7c3aed; background: rgba(124,58,237,.08); color: var(--text); }
.plan-btn.plan-b.active { border-color: #e11d48; background: rgba(225,29,72,.08);  color: var(--text); }
.plan-sub { font-size: .78rem; font-weight: 500; color: var(--text-dim); }
.plan-btn.active .plan-sub { color: var(--text-muted); }
.plan-badge {
  display: inline-block; font-size: .58rem; font-weight: 800; letter-spacing: .04em;
  padding: 1px 6px; border-radius: 4px; margin-left: .3rem;
  background: rgba(124,58,237,.2); color: #7c3aed; vertical-align: middle;
}
.plan-badge.red { background: rgba(225,29,72,.15); color: #e11d48; }
.plan-badge.sky { background: rgba(14,165,233,.15); color: #0ea5e9; }

/* ── Accordion ── */
.accordion { padding: 0; overflow: hidden; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: 0 1px 3px rgba(15,23,42,.06); }
.acc-header {
  display: flex; align-items: center; gap: .6rem;
  padding: .9rem 1.1rem; cursor: pointer;
  user-select: none; transition: background .15s;
}
.acc-header:hover { background: var(--bg-overlay); }
.acc-icon { font-size: 1rem; flex-shrink: 0; }
.acc-title { font-size: 1rem; font-weight: 700; color: var(--text); }
.acc-meta { font-size: .8rem; font-weight: 500; color: var(--text-dim); margin-left: .25rem; }
.acc-chevron {
  margin-left: auto; font-size: 1.2rem; color: var(--text-dim);
  display: inline-block; transition: transform .2s; transform: rotate(0deg);
}
.acc-chevron.rotated { transform: rotate(90deg); }
.acc-body { padding: 0 1.1rem 1.1rem; }

/* ── Flights ── */
.flight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px,1fr)); gap: .75rem; }
.flight-item {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: .9rem 1rem;
  display: flex; flex-direction: column; gap: .3rem;
}
.flight-badge-tag {
  font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
  color: var(--accent); background: var(--accent-bg); padding: 2px 7px;
  border-radius: 6px; width: fit-content;
}
.flight-number { font-size: 1.3rem; font-weight: 700; font-family: ui-monospace, monospace; color: var(--text); }
.flight-route  { font-size: .85rem; font-weight: 600; color: var(--text-muted); }
.flight-times  { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; margin-top: .15rem; }
.ft-dep, .ft-arr { font-size: .75rem; color: var(--text); background: var(--bg-overlay); padding: 2px 7px; border-radius: 5px; }
.ft-arr { color: var(--accent); }
.ft-arrow { color: var(--text-dim); font-size: .7rem; }
.flight-meta { font-size: .68rem; color: var(--text-dim); }

/* ── Giants ── */
.giants-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: .65rem; margin-bottom: .75rem; }
.giants-item {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: .75rem .9rem;
  display: flex; flex-direction: column; gap: .2rem;
}
.g-date { font-size: .68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.g-time { font-size: 1.1rem; font-weight: 700; font-family: ui-monospace, monospace; color: var(--text); }
.g-opp  { font-size: .8rem; font-weight: 600; color: var(--text); }
.g-note { font-size: .7rem; color: var(--text-dim); }
.tip-bar { font-size: .73rem; color: var(--text-muted); background: var(--bg-overlay); padding: 6px 10px; border-radius: 7px; }

/* ── World Cup ── */
.wc-group-badge {
  font-size: .75rem; font-weight: 600; color: var(--text-muted);
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 8px; padding: 6px 12px; margin-bottom: .85rem;
}
.wc-rows { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1rem; }
.wc-row {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .5rem .75rem; border-radius: 8px; font-size: .78rem;
  border: 1px solid var(--border-muted);
}
.wc-ok  { background: rgba(5,150,105,.06); border-color: rgba(5,150,105,.25); }
.wc-no  { background: var(--bg); opacity: .65; }
.wc-rank  { font-weight: 700; color: var(--text); min-width: 55px; flex-shrink: 0; }
.wc-match { font-family: ui-monospace,monospace; font-size: .7rem; color: var(--accent); background: var(--accent-bg); padding: 1px 6px; border-radius: 4px; flex-shrink: 0; }
.wc-date  { font-size: .72rem; color: var(--text-dim); min-width: 110px; flex-shrink: 0; }
.wc-venue { font-size: .78rem; color: var(--text); flex: 1; }
.wc-plan-tag {
  font-size: .62rem; font-weight: 800; padding: 2px 7px; border-radius: 5px;
  background: rgba(124,58,237,.15); color: #7c3aed; flex-shrink: 0;
}
.wc-plan-tag.ac { background: rgba(14,165,233,.15); color: #0ea5e9; }
.wc-plan-tag.bc { background: rgba(225,29,72,.15);  color: #e11d48; }
.wc-note { font-size: .7rem; color: var(--text-dim); flex-shrink: 0; }

/* Annex C bars */
.annexc-block {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 1rem;
}
.annexc-title { font-size: .78rem; font-weight: 700; color: var(--text); margin-bottom: .2rem; }
.annexc-sub   { font-size: .68rem; color: var(--text-dim); margin-bottom: .85rem; }
.annexc-bars  { display: flex; flex-direction: column; gap: .6rem; margin-bottom: 1rem; }
.bar-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: .6rem; align-items: center; }
.bar-label { display: flex; flex-direction: column; gap: .1rem; }
.bar-venue { font-size: .78rem; font-weight: 600; color: var(--text); }
.bar-match { font-size: .68rem; color: var(--text-dim); }
.bar-track { background: var(--bg-overlay); border-radius: 6px; height: 10px; overflow: hidden; }
.bar-fill  { height: 100%; border-radius: 6px; transition: width .5s ease; }
.seattle-fill   { background: #0ea5e9; }
.fox-fill       { background: var(--border); }
.bar-stat { display: flex; flex-direction: column; align-items: flex-end; gap: .1rem; }
.bar-pct  { font-size: .9rem; font-weight: 800; font-family: ui-monospace,monospace; color: #0ea5e9; }
.bar-pct.muted { color: var(--text-dim); }
.bar-cnt  { font-size: .65rem; color: var(--text-dim); }

.prob-summary {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  padding-top: .75rem; border-top: 1px solid var(--border-muted);
}
.prob-box {
  flex: 1; min-width: 90px; background: var(--bg-overlay); border: 1px solid var(--border-muted);
  border-radius: 8px; padding: .6rem .75rem; text-align: center;
}
.highlight-box { background: rgba(14,165,233,.08); border-color: #0ea5e9; }
.result-box    { background: rgba(5,150,105,.08); border-color: #059669; }
.prob-label { font-size: .65rem; color: var(--text-dim); margin-bottom: .2rem; }
.prob-val   { font-size: .72rem; font-family: ui-monospace,monospace; color: var(--text-muted); }
.prob-pct   { font-size: 1.05rem; font-weight: 800; color: var(--text); }
.result-box .prob-pct { color: #059669; }
.prob-arrow { font-size: 1rem; color: var(--text-dim); font-weight: 700; flex-shrink: 0; }

/* ── Cost Table ── */
.cost-table-wrap { overflow-x: auto; margin-bottom: .85rem; }
.cost-table { width: 100%; border-collapse: collapse; font-size: .77rem; }
.pp-badge { display: inline-block; margin-left: .35rem; padding: 1px 6px; font-size: .6rem; font-weight: 800; border-radius: 4px; background: rgba(34,197,94,.18); color: #22c55e; vertical-align: middle; }
.cost-table th {
  background: var(--bg-overlay); color: var(--text-muted); font-size: .67rem;
  font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border);
}
.cost-table td { padding: 7px 10px; border-bottom: 1px solid var(--border-muted); color: var(--text-muted); vertical-align: middle; }
.cost-table tr:last-child td { border-bottom: none; }
.ct-tag { padding: 2px 8px; border-radius: 6px; font-size: .7rem; font-weight: 600; }
.num { font-family: ui-monospace,monospace; font-weight: 600; }
.eco { color: #64748b; } .mid { color: var(--accent); }
.center { text-align: center; } .note-cell { font-size: .68rem; color: var(--text-dim); }
.cost-summary { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: .6rem; }
.cost-block { border-radius: var(--radius-lg); padding: .85rem 1rem; border: 1px solid var(--border); }
.eco-block { background: var(--bg-overlay); }
.mid-block { background: var(--accent-bg); border-color: var(--accent); }
.cb-label { font-size: .63rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-dim); margin-bottom: .25rem; }
.cb-usd { font-size: 1.35rem; font-weight: 800; font-family: ui-monospace,monospace; color: var(--text); }
.cb-krw { font-size: .82rem; color: var(--text-muted); margin-bottom: .2rem; }
.cb-per { font-size: .7rem; color: var(--accent); font-weight: 600; background: var(--bg-overlay); padding: 3px 8px; border-radius: 5px; display: inline-block; }
.cost-note { font-size: .68rem; color: var(--text-dim); }

/* ── Booking Strategy ── */
/* ── 일자별 잠자리 테이블 ── */
.sleep-table-wrap { margin-bottom: 1.25rem; padding: .85rem 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.sleep-table-title { font-size: .95rem; font-weight: 700; color: var(--text); margin-bottom: .6rem; }
.sleep-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
.sleep-table thead th {
  background: var(--bg-overlay); color: var(--text-muted);
  padding: 7px 9px; text-align: left; font-weight: 700;
  border-bottom: 1px solid var(--border); white-space: nowrap;
}
.sleep-table tbody td { padding: 8px 9px; border-bottom: 1px solid var(--border-muted); color: var(--text); }
.sleep-table tr.sleep-branch { background: rgba(245,158,11,.08); }
.sleep-table tr.sleep-branch td { border-bottom-color: rgba(245,158,11,.3); }
.sleep-date { font-weight: 700; white-space: nowrap; min-width: 80px; }
.sleep-where { font-weight: 500; margin-left: .35rem; color: var(--text); }
.sleep-action { display: inline-block; font-size: .75rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
.sleep-action.action-now { background: rgba(34,197,94,.18); color: #4ade80; }
.sleep-action.action-standby { background: rgba(245,158,11,.18); color: #fbbf24; }
.sleep-note { font-size: .78rem; color: var(--text-dim); }
.plan-pill { display: inline-block; font-size: .7rem; font-weight: 800; padding: 2px 8px; border-radius: 5px; }
.plan-pill-a { background: rgba(124,58,237,.22); color: #c4b5fd; }
.plan-pill-b { background: rgba(225,29,72,.22); color: #fda4af; }
.sleep-hint { font-size: .82rem; color: var(--text); background: rgba(168,215,255,.1); border-left: 3px solid var(--accent); padding: .55rem .75rem; border-radius: 0 6px 6px 0; margin-top: .7rem; line-height: 1.55; }
.sleep-hint strong { color: var(--accent); font-weight: 700; }

.phase-block { margin-bottom: 1rem; }
.phase-label {
  font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
  padding: 3px 9px; border-radius: 5px; margin-bottom: .5rem; width: fit-content;
}
.phase-now     { background: rgba(5,150,105,.12); color: #059669; border: 1px solid rgba(5,150,105,.3); }
.phase-standby { background: rgba(234,179,8,.1); color: #ca8a04; border: 1px solid rgba(234,179,8,.3); }
.bk-list { display: flex; flex-direction: column; gap: .3rem; }
.bk-row {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  padding: .4rem .65rem; border-radius: 7px;
  background: var(--bg); border: 1px solid var(--border-muted); font-size: .76rem;
}
.bk-conflict { background: rgba(234,179,8,.06); border-color: rgba(234,179,8,.35); }
.bk-confirmed {
  background: rgba(22,163,74,.08);
  border: 2px solid #16a34a;
}
.bk-confirmed-badge {
  background: #16a34a;
  color: #fff;
  font-size: .62rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 8px;
  letter-spacing: .03em;
  flex-shrink: 0;
}

/* 💰 예상 비용 카드 */
.cost-body { display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0; }
.cost-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: .5rem;
  padding: .5rem 0;
}
.cost-cat-card {
  display: flex; flex-direction: column; align-items: center; gap: .25rem;
  padding: .7rem .5rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: var(--transition);
}
.cost-cat-card.hotel    { border-left: 3px solid #a855f7; }
.cost-cat-card.flight   { border-left: 3px solid #0ea5e9; }
.cost-cat-card.ticket   { border-left: 3px solid #dc2626; }
.cost-cat-card.activity { border-left: 3px solid #f59e0b; }
.cost-cat-card.total {
  background: rgba(124,58,237,.1);
  border: 2px solid var(--accent);
  grid-column: span 1;
}
.cc-icon { font-size: 1.1rem; }
.cc-label { font-size: .7rem; color: var(--text-muted); font-weight: 600; text-align: center; }
.cc-amount { font-size: .95rem; font-weight: 800; color: var(--text); font-family: ui-monospace, monospace; }
.cost-cat-card.total .cc-amount { color: var(--accent); font-size: 1.1rem; }

.cost-section { display: flex; flex-direction: column; gap: .4rem; }
.cost-h4 {
  font-size: .8rem; font-weight: 700; color: var(--text);
  padding-bottom: .35rem;
  border-bottom: 1px solid var(--border-muted);
  margin: 0;
}
.cost-list { display: flex; flex-direction: column; gap: .2rem; }
.cost-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: .5rem 1rem;
  padding: .35rem .55rem;
  background: var(--bg);
  border-radius: 6px;
  font-size: .73rem;
  align-items: baseline;
}
.cr-name { color: var(--text); font-weight: 500; }
.cr-detail { color: var(--text-dim); font-size: .68rem; font-style: italic; }
.cr-amount {
  color: var(--text); font-weight: 700;
  font-family: ui-monospace, monospace;
  white-space: nowrap;
  min-width: 60px; text-align: right;
}
/* ── 💸 정산 ── */
.earmark-banner {
  background: var(--bg-overlay); border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-lg); padding: .75rem 1rem;
  margin-bottom: .85rem;
  display: flex; flex-direction: column; gap: .35rem;
}
.eb-title { font-size: .78rem; font-weight: 700; color: var(--text); }
.eb-rows { display: flex; flex-wrap: wrap; gap: .35rem .5rem; align-items: center; font-size: .76rem; color: var(--text-muted); }
.eb-item { background: var(--bg); padding: 3px 8px; border-radius: 5px; border: 1px solid var(--border-muted); }
.eb-item strong { color: var(--accent); font-family: ui-monospace, monospace; margin-left: .2rem; }
.eb-plus, .eb-eq { color: var(--text-dim); font-weight: 700; font-family: ui-monospace, monospace; }
.eb-total { font-weight: 700; color: var(--text); }
.eb-total strong { font-family: ui-monospace, monospace; color: var(--accent); margin-left: .2rem; }
.eb-diff { padding: 2px 8px; border-radius: 5px; font-size: .72rem; font-weight: 700; margin-left: auto; }
.eb-diff.eb-surplus { background: rgba(34,197,94,.15); color: #22c55e; }
.eb-diff.eb-short { background: rgba(249,115,22,.15); color: #f97316; }
.eb-note { font-size: .68rem; color: var(--text-dim); line-height: 1.5; padding-top: .25rem; border-top: 1px dashed var(--border-muted); }

.settle-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: .8rem; margin-bottom: .75rem; }
.settle-card {
  background: var(--bg); border: 1.5px solid var(--border);
  border-radius: var(--radius-lg); padding: 1rem 1.1rem;
  display: flex; flex-direction: column; gap: .6rem;
  transition: var(--transition);
}
.settle-card.settle-owe { border-color: #f97316; background: rgba(249,115,22,.04); }
.settle-card.settle-paid { border-color: #22c55e; background: rgba(34,197,94,.04); }
.settle-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.settle-name { font-size: 1.05rem; font-weight: 700; color: var(--text); }
.settle-badge {
  font-size: .65rem; font-weight: 700; padding: 3px 8px; border-radius: 5px;
  letter-spacing: .03em; text-transform: uppercase;
}
.badge-owe { background: rgba(249,115,22,.18); color: #f97316; border: 1px solid rgba(249,115,22,.4); }
.badge-paid { background: rgba(34,197,94,.18); color: #22c55e; border: 1px solid rgba(34,197,94,.4); }
.settle-items { display: flex; flex-direction: column; gap: .3rem; }
.settle-item-row {
  display: grid; grid-template-columns: 50px 80px 1fr; gap: .4rem; align-items: center;
  font-size: .76rem;
}
.si-type {
  font-size: .62rem; font-weight: 700; padding: 2px 7px; border-radius: 4px;
  background: var(--bg-overlay); color: var(--text-muted); text-align: center;
}
.si-type.si-ticket { background: rgba(124,58,237,.15); color: #7c3aed; }
.si-amount { font-family: ui-monospace, monospace; font-weight: 700; color: #22c55e; }
.si-note { font-size: .7rem; color: var(--text-dim); }
.settle-divider { height: 1px; background: var(--border-muted); margin: .15rem 0; }
.settle-summary-rows { display: flex; flex-direction: column; gap: .3rem; }
.ss-line { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; }
.ss-label { color: var(--text-muted); font-weight: 500; }
.ss-value { font-family: ui-monospace, monospace; font-weight: 700; }
.ss-value.received { color: #22c55e; }
.ss-value.cost { color: var(--text); }
.ss-em { font-size: .65rem; color: var(--text-dim); font-style: normal; font-weight: 400; }
.ss-line-aside { opacity: .7; font-size: .72rem; }
.ss-value.aside { color: var(--text-dim); font-weight: 600; }
.ss-balance { padding-top: .35rem; border-top: 1px dashed var(--border-muted); font-size: .9rem; }
.ss-balance .ss-label { font-weight: 700; color: var(--text); }
.ss-value.owe { color: #f97316; font-size: 1.1rem; }
.ss-value.surplus { color: #22c55e; font-size: 1.1rem; }
.settle-note { font-size: .7rem; color: var(--text-dim); background: var(--bg-overlay); padding: 7px 11px; border-radius: 7px; line-height: 1.55; }

.cost-footnote {
  font-size: .68rem; color: var(--text-dim);
  padding: .55rem .7rem;
  background: var(--bg-overlay);
  border-radius: 8px;
  line-height: 1.55;
  border-left: 3px solid var(--border);
}
.bk-tag { padding: 2px 6px; border-radius: 4px; font-size: .65rem; font-weight: 700; flex-shrink: 0; }
.bk-label { font-weight: 600; color: var(--text); min-width: 125px; }
.bk-dates { font-size: .7rem; color: var(--text-dim); min-width: 88px; }
.bk-nights { font-size: .7rem; color: var(--text-dim); flex-shrink: 0; }
.bk-plans { display: flex; gap: .2rem; flex-shrink: 0; }
.plan-chip { font-size: .6rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
.chip-a { background: rgba(124,58,237,.15); color: #7c3aed; }
.chip-b { background: rgba(225,29,72,.13);  color: #e11d48; }
.chip-c { background: rgba(14,165,233,.13); color: #0ea5e9; }
.bk-note { font-size: .7rem; color: var(--text-dim); flex: 1; }
.conflict-hint { font-size: .71rem; color: #ca8a04; margin-top: .45rem; padding: 4px 8px; background: rgba(234,179,8,.07); border-radius: 5px; }
.decision-header { font-size: .77rem; font-weight: 700; color: var(--text-muted); margin-bottom: .65rem; padding-top: .8rem; border-top: 1px solid var(--border-muted); }
.decision-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: .65rem; margin-bottom: .75rem; }
.decision-card { border: 1.5px solid var(--dc-color, var(--border)); border-radius: var(--radius-lg); overflow: hidden; }
.dc-top { display: flex; align-items: center; gap: .45rem; padding: .5rem .7rem; background: color-mix(in srgb, var(--dc-color, #334155) 10%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--dc-color, #334155) 25%, transparent); }
.dc-plan-tag { font-size: .62rem; font-weight: 800; color: #fff; padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
.dc-result { font-size: .7rem; font-weight: 600; color: var(--text); }
.dc-body { display: flex; padding: .55rem .7rem; background: var(--bg-elevated); }
.dc-col { flex: 1; display: flex; flex-direction: column; gap: .25rem; }
.dc-divider { width: 1px; background: var(--border-muted); margin: 0 .5rem; flex-shrink: 0; }
.dc-section-label { font-size: .58rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; margin-bottom: .05rem; }
.keep-lbl { color: #059669; } .cancel-lbl { color: #dc2626; }
.dc-item { font-size: .7rem; color: var(--text-muted); line-height: 1.4; }
.dc-cancel { color: #dc2626; text-decoration: line-through; opacity: .7; }
.booking-tip { font-size: .7rem; color: var(--text-dim); background: var(--bg-overlay); padding: 6px 10px; border-radius: 7px; }

/* ── Timeline v2 (모던 여행앱 — 라이트 카드 · 한눈에 보이는 UI) ── */
.timeline-body-v2 { padding: .5rem .15rem 1rem; display: flex; flex-direction: column; gap: 1rem; background: #f1f5f9; border-radius: 12px; }

/* 헤로 — Plan 색상 그라데이션 */
.trip-hero {
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  border: none; border-radius: 16px;
  padding: 1.2rem 1.3rem;
  display: flex; flex-direction: column; gap: .95rem;
  box-shadow: 0 8px 24px -8px rgba(37,99,235,.45);
  color: #fff;
  margin: 0 .35rem;
}
.trip-hero-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: .5rem; }
.trip-hero-plan { display: flex; flex-direction: column; gap: .15rem; }
.trip-hero-plan-label { font-size: .65rem; color: rgba(255,255,255,.75); text-transform: uppercase; letter-spacing: .12em; font-weight: 700; }
.trip-hero-plan-value { font-size: 1.4rem; font-weight: 900; color: #fff; letter-spacing: -.02em; }
.trip-hero-route { font-size: .85rem; color: rgba(255,255,255,.95); font-family: ui-monospace,monospace; font-weight: 700; }
.hero-arrow { color: #fbbf24; margin: 0 .3rem; font-weight: 800; }
.trip-hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .55rem; }
.hero-stat {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.25);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: .7rem .5rem; text-align: center;
  display: flex; flex-direction: column; gap: .15rem;
}
.hero-stat-highlight { background: #fbbf24; border-color: #fbbf24; box-shadow: 0 4px 12px -4px rgba(251,191,36,.5); }
.hs-val { font-size: 1.55rem; font-weight: 900; color: #fff; letter-spacing: -.03em; line-height: 1; }
.hero-stat-highlight .hs-val { color: #1e293b; }
.hs-lbl { font-size: .68rem; color: rgba(255,255,255,.85); font-weight: 700; letter-spacing: .02em; }
.hero-stat-highlight .hs-lbl { color: #1e293b; }

/* Day Card */
.timeline-v2 { display: flex; flex-direction: column; gap: 0; padding: 0 .35rem; }
.day-card-v2 {
  position: relative;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
  box-shadow: 0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
}
.day-card-v2:hover { border-color: #2563eb; box-shadow: 0 4px 12px -2px rgba(37,99,235,.15); }
.day-card-v2.is-highlight {
  border: 2px solid #ef4444;
  background: linear-gradient(180deg, #fef2f2 0%, #fff 40%);
  box-shadow: 0 8px 24px -6px rgba(239,68,68,.25);
}
.day-card-v2 + .day-card-v2 { margin-top: .65rem; }

/* Day Head */
.day-head-v2 {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 1rem; align-items: center;
  padding: 1.1rem 1.2rem 1rem;
  border-bottom: 2px solid #e2e8f0;
  position: relative;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
}
.day-head-v2::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: 6px; background: var(--city-color, #64748b);
}
.day-head-left { display: flex; align-items: center; gap: .8rem; padding-left: .3rem; }
.day-num-pill {
  display: flex; flex-direction: column; align-items: center;
  background: var(--city-color, #64748b); color: #fff;
  border-radius: 12px; padding: .4rem .6rem;
  min-width: 48px; line-height: 1;
  box-shadow: 0 4px 10px -3px var(--city-color, #64748b);
}
.dnp-label { font-size: .58rem; font-weight: 800; letter-spacing: .12em; opacity: .9; }
.dnp-val { font-size: 1.5rem; font-weight: 900; margin-top: 3px; }
.day-date-block { display: flex; flex-direction: column; gap: .15rem; }
.day-date-main { font-size: 1.2rem; font-weight: 900; color: #0f172a; letter-spacing: -.02em; line-height: 1.1; }
.day-weekday { font-size: .8rem; color: #64748b; font-weight: 700; }

.day-head-mid { display: flex; align-items: center; gap: .7rem; min-width: 0; }
.day-icon-v2 { font-size: 1.75rem; flex-shrink: 0; }
.day-city-block { display: flex; flex-direction: column; gap: .3rem; min-width: 0; }
.day-city-v2 { font-size: 1.02rem; font-weight: 800; color: #0f172a; line-height: 1.3; }
.day-city-tag-row { display: flex; gap: .3rem; flex-wrap: wrap; }
.city-chip-v2 { font-size: .6rem; font-weight: 700; padding: 2px 7px; border-radius: 5px; border: 1px solid; white-space: nowrap; }
.transit-chip {
  font-size: .58rem; font-weight: 700;
  padding: 2px 6px; border-radius: 5px;
  background: rgba(37,99,235,.1); color: #2563eb;
  border: 1px solid rgba(37,99,235,.3);
}
.rv-day-badge {
  font-size: .58rem; font-weight: 700;
  padding: 2px 6px; border-radius: 5px;
  background: rgba(124,58,237,.12); color: #7c3aed;
  border: 1px solid rgba(124,58,237,.3);
}

.day-head-right { display: flex; flex-direction: column; gap: .3rem; align-items: flex-end; }
.highlight-pill-v2 {
  font-size: .68rem; font-weight: 800; letter-spacing: .03em;
  background: #2563eb; color: #fff;
  padding: 6px 11px; border-radius: 20px;
  box-shadow: 0 3px 10px -2px #2563eb;
  white-space: nowrap;
}
.la-pill { background: #e11d48; box-shadow: 0 3px 10px -2px #e11d48; }

/* 알림 */
.day-warning {
  margin: .7rem 1rem 0;
  background: #fff7ed;
  border: 1px solid #fdba74;
  border-radius: 9px;
  padding: .6rem .8rem;
  display: flex; gap: .55rem; align-items: flex-start;
}
.warn-icon { font-size: .9rem; flex-shrink: 0; }
.warn-text { font-size: .78rem; color: #c2410c; font-weight: 600; line-height: 1.4; }

.day-standby-v2 {
  margin: .7rem 1rem 0;
  display: flex; flex-direction: column; gap: .2rem;
  background: #fefce8;
  border: 1px solid #fcd34d;
  border-radius: 8px;
  padding: .55rem .8rem;
}
.day-standby-v2 .standby-label { font-size: .62rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #b45309; }
.day-standby-v2 .standby-text { font-size: .77rem; color: #334155; font-weight: 500; }
.day-standby-v2 .standby-cancel { font-size: .7rem; color: #b45309; font-weight: 700; }

/* Day Body — Time Buckets */
.day-body-v2 { padding: 1rem 1.1rem 1.15rem; display: flex; flex-direction: column; gap: .8rem; }
.time-bucket { display: flex; gap: .7rem; align-items: stretch; }
.bucket-rail {
  width: 3px; border-radius: 3px;
  flex-shrink: 0; opacity: .55;
}
.bucket-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .45rem; }
.bucket-label-row { display: flex; align-items: center; gap: .5rem; padding-bottom: .2rem; }
.bucket-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 8px; font-size: .88rem;
}
.bucket-label {
  font-size: .82rem; font-weight: 800; color: #0f172a;
  letter-spacing: .02em;
}
.bucket-items { display: flex; flex-direction: column; gap: .4rem; }
.sched-card {
  display: flex; gap: .7rem; align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: .6rem .8rem;
  transition: border-color .15s, background .15s, transform .1s, box-shadow .15s;
}
.sched-card:hover { border-color: #2563eb; background: #fff; box-shadow: 0 2px 8px -2px rgba(37,99,235,.1); transform: translateX(2px); }
.sched-card.is-bold {
  background: #fef3c7;
  border-color: #f59e0b;
  border-left: 4px solid #f59e0b;
}
.sched-card.is-baseball { border-color: #f97316; background: #fff7ed; border-left: 4px solid #f97316; }
.sched-time-pill {
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: .73rem; font-weight: 800;
  padding: 5px 10px; border-radius: 8px;
  border: 1.5px solid; background: #fff;
  white-space: nowrap; flex-shrink: 0;
  min-width: 72px; text-align: center;
  letter-spacing: -.02em;
}
.sched-text-v2 {
  font-size: .88rem; color: #0f172a;
  line-height: 1.5; flex: 1; min-width: 0;
  word-break: break-word; font-weight: 500;
}
.sched-card.is-bold .sched-text-v2 { color: #78350f; font-weight: 800; font-size: .92rem; }
.sched-card.is-baseball .sched-text-v2 { color: #9a3412; font-weight: 700; }

/* Day Connector (점 연결) */
.day-connector-v2 {
  display: flex; flex-direction: column; align-items: center;
  margin: 0 auto; padding: 0;
  position: relative; height: 24px;
}
.conn-line { width: 2px; flex: 1; background: #cbd5e1; }
.conn-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; margin: 2px 0; }

/* 모바일 반응형 — APP 배포 대비 */
@media (max-width: 768px) {
  .trip-hero { margin: 0 .15rem; padding: 1.05rem 1rem; }
  .trip-hero-stats { grid-template-columns: repeat(2, 1fr); gap: .5rem; }
  .timeline-v2 { padding: 0 .15rem; }
  .day-head-v2 { grid-template-columns: auto 1fr; gap: .65rem; padding: .9rem 1rem .8rem; }
  .day-head-right { grid-column: 1 / -1; flex-direction: row; align-items: center; justify-content: flex-end; padding-top: .2rem; }
}
@media (max-width: 480px) {
  .day-num-pill { min-width: 42px; padding: .3rem .45rem; }
  .dnp-val { font-size: 1.2rem; }
  .day-date-main { font-size: 1rem; }
  .day-icon-v2 { font-size: 1.4rem; }
  .day-city-v2 { font-size: .9rem; }
  .day-body-v2 { padding: .8rem .85rem 1rem; }
  .sched-text-v2 { font-size: .8rem; }
  .sched-card.is-bold .sched-text-v2 { font-size: .84rem; }
  .sched-time-pill { font-size: .65rem; min-width: 60px; padding: 3px 6px; }
  .bucket-label { font-size: .74rem; }
  .hs-val { font-size: 1.35rem; }
  .trip-hero-plan-value { font-size: 1.2rem; }
}

/* ── Activities ── */
.act-city-tabs {
  display: flex; gap: .45rem; margin-bottom: .9rem; flex-wrap: wrap;
}
.act-tab {
  padding: .4rem .9rem; border-radius: 20px; font-size: .78rem; font-weight: 600;
  border: 1.5px solid var(--border); background: var(--bg-elevated);
  color: var(--text-muted); cursor: pointer; transition: var(--transition);
}
.act-tab:hover { border-color: var(--accent); color: var(--text); }
.act-tab-active { border-color: var(--accent); background: var(--accent-bg); color: var(--accent) !important; }

.act-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: .65rem;
}
.act-card {
  display: flex; gap: .75rem;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: .85rem 1rem;
  transition: border-color .15s;
}
.act-card:hover { border-color: var(--accent); }
.act-emoji {
  font-size: 1.6rem; line-height: 1; flex-shrink: 0;
  width: 2.2rem; text-align: center; margin-top: .1rem;
}
.act-info { display: flex; flex-direction: column; gap: .25rem; flex: 1; min-width: 0; }
.act-top-row { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.act-name { font-size: .84rem; font-weight: 700; color: var(--text); }
.act-type-badge {
  font-size: .6rem; font-weight: 700; padding: 1px 6px; border-radius: 5px;
  background: var(--accent-bg); color: var(--accent); flex-shrink: 0;
}
.act-price-row { display: flex; align-items: center; gap: .5rem; }
.act-price { font-size: .8rem; font-weight: 700; color: var(--accent); font-family: ui-monospace,monospace; }
.act-duration { font-size: .68rem; color: var(--text-dim); }
.act-desc { font-size: .73rem; color: var(--text-muted); line-height: 1.45; }
.act-tip {
  font-size: .68rem; color: var(--text-dim);
  background: var(--bg-overlay); border-radius: 5px;
  padding: 3px 7px; line-height: 1.4;
}

/* ── 🚇 Transport guide ── */
.tp-city-tabs { display: flex; gap: .35rem; flex-wrap: wrap; margin-bottom: .85rem; }
.tp-tab {
  font-size: .78rem; font-weight: 600; padding: 5px 12px; border-radius: 7px;
  background: var(--bg); border: 1px solid var(--border); color: var(--text-muted);
  transition: var(--transition); cursor: pointer;
}
.tp-tab:hover { color: var(--text); border-color: var(--accent); }
.tp-tab.tp-tab-active { background: var(--accent-bg); border-color: var(--accent); color: var(--accent); }

.tp-routes { display: flex; flex-direction: column; gap: .8rem; }
.tp-route-card {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}
.tp-route-head {
  display: flex; align-items: center; gap: .65rem; padding: .65rem .9rem;
  background: var(--bg-overlay); border-bottom: 1px solid var(--border);
}
.tp-route-icon { font-size: 1.1rem; }
.tp-route-od { flex: 1; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; font-size: .9rem; }
.tp-from { font-weight: 600; color: var(--text); }
.tp-to { font-weight: 700; color: var(--text); }
.tp-arrow { color: var(--accent); font-weight: 700; }
.tp-dist { font-size: .72rem; color: var(--text-dim); font-family: ui-monospace,monospace; white-space: nowrap; }

.tp-options { display: flex; flex-direction: column; }
.tp-option {
  display: grid; grid-template-columns: 130px 1fr 130px; gap: .6rem;
  padding: .65rem .9rem; border-bottom: 1px solid var(--border-muted);
  align-items: center;
}
.tp-option:last-child { border-bottom: none; }
.tp-option:hover { background: var(--bg-overlay); }
.tp-mode { font-size: .85rem; font-weight: 700; color: var(--text); white-space: nowrap; }
.tp-detail-col { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tp-detail { font-size: .82rem; color: var(--text-muted); line-height: 1.4; }
.tp-tip { font-size: .73rem; color: var(--text-dim); line-height: 1.4; }
.tp-meta-col { display: flex; flex-direction: column; gap: 3px; align-items: flex-end; white-space: nowrap; }
.tp-time { font-size: .78rem; color: var(--text); font-weight: 600; }
.tp-cost { font-size: .78rem; color: var(--accent); font-weight: 700; }

.mono { font-family: ui-monospace,monospace; }

@media (max-width: 768px) {
  .plan-toggle { grid-template-columns: 1fr; }
  .decision-grid { grid-template-columns: 1fr; }
  .giants-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 1fr; gap: .3rem; }
  .prob-summary { gap: .35rem; }
  .tp-option { grid-template-columns: 1fr; gap: .3rem; }
  .tp-meta-col { flex-direction: row; gap: .8rem; align-items: flex-start; }
}
@media (max-width: 600px) {
  .day-row { grid-template-columns: 70px 20px 1fr; gap: 0 .4rem; }
  .day-date { font-size: .7rem; }
  .flight-grid { grid-template-columns: 1fr; }
}
</style>
