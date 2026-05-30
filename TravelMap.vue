<script setup>
import { ref, computed, onMounted, watch, nextTick, reactive } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── 도시 좌표 사전 ──
const CITIES = {
  SF:  { name: '샌프란시스코',     lat: 37.7749, lng: -122.4194, icon: '🌉', short: 'SF' },
  YOS: { name: '요세미티',          lat: 37.7456, lng: -119.5936, icon: '⛰️', short: 'YOS' },
  SEA: { name: '시애틀',            lat: 47.6062, lng: -122.3321, icon: '🌲', short: 'SEA' },
  LV:  { name: '라스베이거스',      lat: 36.1147, lng: -115.1728, icon: '🎰', short: 'LV' },
  LA:  { name: 'LA · Inglewood',    lat: 33.9534, lng: -118.3387, icon: '🇰🇷', short: 'LA' },
  SV:  { name: '실리콘밸리',         lat: 37.4275, lng: -122.1697, icon: '💻', short: 'SV' },
}

// ── 핀 카테고리 ──
const KINDS = {
  stadium:  { label: '경기장',   color: '#dc2626', size: 38 },
  activity: { label: '액티비티', color: '#0ea5e9', size: 26 },
  sight:    { label: '명소',     color: '#10b981', size: 26 },
  lodging:  { label: '숙소',     color: '#a855f7', size: 24 },
}

// ── 예약 전략 (지도 상단 박스 + 호텔 popup에 표시) ──
// Plan A/B 공통 7박은 환불불가로 잡고, 분기 1박(6/30~7/1)만 무료취소 양다리
const BOOKING = {
  totalNote: '🔀 Plan A/B 공통 7박 = 즉시 예약 · 분기 1박 (6/30~7/1) = 무료취소 양다리 → 6/24 한국 순위 확정 후 결정',
  decisionAt: '6/24 (한국 조별리그 마지막 경기 후 — 16강 진출 순위 확정)',
  siteUrl: 'https://otour.cjonstyle.com/pages/overseas/hotel/main',
  now: [
    { id: 'yos', hotel: 'Yosemite · Curry Village', tag: 'YOS', nights: 1, dates: '6/29 → 6/30', priority: 1,
      action: '⭐ 최우선', site: '오투어', note: '무료취소 불가 · 6~12개월 전 매진 → 가장 먼저',
      candidates: [
        { name: '커리 빌리지 (Curry Village)', stars: 2.5, perNight: 516491, total: 516491, note: 'Yosemite Valley 내 유일 옵션 · 캐빈/텐트' },
      ],
    },
    { id: 'sf-base', hotel: '✅ Hyatt Regency SF (Embarcadero) — 예약 확정', tag: 'SF', nights: 3, dates: '6/26 → 6/29', priority: 2,
      action: '예약 완료', site: '오투어 · 5 Embarcadero Center', note: '4★ · BART Embarcadero 역 직결 (도보 1분) · Financial District · 노숙자 거의 없음 · Bay Bridge view',
      picked: 'Hyatt Regency San Francisco (Embarcadero)',
      candidates: [
        { name: 'Hyatt Regency SF (Embarcadero)', stars: 4, perNight: 400000, total: 1200000, note: '✅ 예약 확정 · BART 직결 · 안전 · Bay Bridge view · 17층 아트리움 로비', picked: true },
        { name: 'Fairmont San Francisco',        stars: 5, perNight: 490289, total: 1470868, note: 'Nob Hill 5★ · 클래식 럭셔리 (검토 대상)' },
        { name: 'JW 메리어트 SF 유니언 스퀘어',   stars: 4.5, perNight: 389836, total: 1169508, note: 'Union Sq 중심 (검토 대상)' },
        { name: '인터컨티넨탈 SF',               stars: 4.5, perNight: 388184, total: 1164553, note: 'SOMA 인피니티 풀 (검토 대상)' },
        { name: '챈슬러 호텔 온 유니언 스퀘어',  stars: 3.5, perNight: 263298, total: 789896, note: '가성비 (검토 대상)' },
      ],
    },
    { id: 'lv', hotel: 'LV · The Strip', tag: 'LV', nights: 3, dates: '7/1 → 7/4', priority: 3,
      action: '지금 예약', site: '오투어', note: 'The Strip 평일 요금 · 7/1 야간 도착 → 24시간 체크인 가능 호텔 권장',
      candidates: [
        { name: '룩소 호텔 & 카지노',           stars: 3.5, perNight: 161373, total: 484119,  note: '⭐ 가성비 끝판 · 이집트 테마' },
        { name: '엑스칼리버 호텔 & 카지노',     stars: 3.5, perNight: 168940, total: 506820,  note: 'South Strip · 가성비' },
        { name: '플라밍고 라스베이거스',         stars: 3.5, perNight: 275742, total: 827226,  note: 'Strip 한복판 · 24h 카지노' },
        { name: '패리스 라스베이거스',           stars: 4,   perNight: 341994, total: 1025982, note: '⭐ 일정 매치 · Bellagio 분수쇼 정면' },
        { name: '플래닛 할리우드',               stars: 4,   perNight: 368167, total: 1104501, note: 'Strip 중심' },
        { name: '만달레이 베이',                stars: 4.5, perNight: 365673, total: 1097019, note: 'South Strip · 풀장 강함' },
        { name: '벨라지오',                    stars: 5,   perNight: 706976, total: 2120928, note: '럭셔리 · 분수쇼 직결' },
        { name: '시저스 팰리스',                stars: 4.5, perNight: 745875, total: 2237625, note: '럭셔리 · Forum Shops' },
      ],
    },
  ],
  standby: [
    { id: 'sea-a', hotel: 'SEA 호텔 (Plan A 전용)', tag: 'SEA', nights: 1, dates: '6/30 → 7/1', plan: 'A',
      site: '오투어 (무료취소 요금)', when: '한국 조3위 확정 → 시애틀 R32 (Lumen Field Match 82)',
      candidates: [
        { name: '쉐라톤 그랜드 시애틀',         stars: 4.5, perNight: 460711, total: 460711, note: '⭐ Lumen 1.2km · 가성비 + 위치' },
        { name: '롯데 호텔 시애틀',             stars: 5,   perNight: 871603, total: 871603, note: '🇰🇷 한국계 럭셔리 · Lumen 1.0km · 한국어 가능' },
        { name: '그랜드 하얏트 시애틀',         stars: 4.5, perNight: 536468, total: 536468, note: 'Pine St · Convention Center 직결' },
      ],
    },
    { id: 'sf-b-ext', hotel: 'Hyatt Regency SF 1박 연장 (Plan B 전용)', tag: 'SF', nights: 1, dates: '6/30 → 7/1', plan: 'B',
      site: '오투어 (무료취소 요금) · 별도 1박 예약', when: '한국 조2위 확정 → LA R32 + SF 베이스 유지',
      candidates: [
        { name: 'Hyatt Regency SF (Embarcadero)', stars: 4, perNight: 400000, total: 400000, note: '✅ 기존 예약과 동일 호텔 · 같은 객실로 연속 예약 권장 (체크아웃 후 재체크인 안 해도 됨)' },
      ],
    },
  ],
}

// ── POI: 도시별 ──
const POIS = {
  SF: [
    { kind: 'stadium',  name: 'Oracle Park (SF Giants)', lat: 37.7786, lng: -122.3893, icon: '⚾', day: '6/26',   detail: '도착 당일 Giants vs Atlanta Braves' },
    { kind: 'sight',    name: 'Alcatraz Island',         lat: 37.8267, lng: -122.4230, icon: '🏝',  day: '6/27 (A)',  detail: 'Pier 33 페리 · 사전 예약 필수' },
    { kind: 'sight',    name: 'Golden Gate Bridge',      lat: 37.8199, lng: -122.4783, icon: '🌉', day: '6/27 (A)',  detail: '자전거 라이딩 → Sausalito 페리' },
    { kind: 'sight',    name: "Fisherman's Wharf",       lat: 37.8080, lng: -122.4177, icon: '🦀', detail: 'Pier 39 · 자전거 렌탈 출발' },
    { kind: 'lodging',  name: '✅ Hyatt Regency SF (Embarcadero)',   lat: 37.7948, lng: -122.3956, icon: '🏨',
      booking: 'now', bookingPlan: 'AB', bookingNights: '3박 · ✅ 예약 확정',
      detail: '4★ · 5 Embarcadero Center · BART Embarcadero 역 직결 (도보 1분) · Financial District 안전 · Bay Bridge view · 17층 아트리움 로비 · A/B 공통 3박 (6/26~6/29)',
      picked: true },
    { kind: 'activity', name: 'SFO (Plan B 6/28 LA 당일치기 출발)', lat: 37.6213, lng: -122.3790, icon: '✈️', day: '6/28', detail: 'Southwest/Delta 직항 · SFO→LAX 1h 30m' },
  ],
  YOS: [
    { kind: 'sight',   name: 'Yosemite Valley',       lat: 37.7456, lng: -119.5936, icon: '⛰️', day: '6/29', detail: 'Valley 순환 · Bridalveil Fall · El Capitan (A/B 공통)' },
    { kind: 'sight',   name: 'Tunnel View',           lat: 37.7156, lng: -119.6779, icon: '👁',  day: '6/30', detail: '아침 하이킹 출발점 · 파노라마 포토스팟' },
    { kind: 'sight',   name: 'Glacier Point',         lat: 37.7281, lng: -119.5740, icon: '🏔', day: '6/30', detail: '오후 파노라마 · 마지막 자연 감상' },
    { kind: 'lodging', name: 'Curry Village (1박)',   lat: 37.7375, lng: -119.5736, icon: '🏕',  day: '6/29~30',
      booking: 'now', bookingPlan: 'AB', bookingNights: '1박 · ⭐ 최우선',
      detail: '⭐ A/B 공통 1박 · 무료취소 불가 → 가장 먼저 예약 · recreation.gov' },
  ],
  SEA: [
    { kind: 'stadium',  name: 'Lumen Field 🇰🇷',              lat: 47.5952, lng: -122.3316, icon: '⚽', day: '7/1 13:00 PT', detail: 'R32 Match 82 — 한국 vs 16강 약자 · Plan A 핵심', highlight: true },
    { kind: 'sight',    name: 'Pike Place Market',           lat: 47.6097, lng: -122.3422, icon: '🐟', day: '6/30 / 7/1', detail: '저녁 + 경기 당일 아침 커피' },
    { kind: 'sight',    name: 'Space Needle',                lat: 47.6205, lng: -122.3493, icon: '🗼', day: '7/1 오전',   detail: 'Seattle Center 전망대' },
    { kind: 'lodging',  name: 'SEA 호텔 (Plan A 전용)',       lat: 47.6113, lng: -122.3329, icon: '🏨', day: '6/30~7/1',
      booking: 'standby', bookingPlan: 'A', bookingNights: '1박',
      detail: '⏳ Plan A 전용 1박 · 무료취소로 예약 → 6/24 한국 순위 확정 후 결정 · 조3위면 KEEP · 후보: 쉐라톤 그랜드(46만) / 롯데(87만) / 그랜드 하얏트(54만)' },
    { kind: 'activity', name: 'Cal Anderson Park 픽업 사커',  lat: 47.6184, lng: -122.3196, icon: '⚽', day: '6/30 저녁',  detail: '한국 응원단 · 미국 픽업게임 혼합' },
    { kind: 'activity', name: 'Blade & Timber 도끼던지기',    lat: 47.6166, lng: -122.3217, icon: '🪓', detail: 'Capitol Hill · 18레인 · 맥주 가능' },
  ],
  LV: [
    { kind: 'lodging',  name: 'Paris Las Vegas',            lat: 36.1119, lng: -115.1717, icon: '🏨', day: '7/1~7/4',
      booking: 'now', bookingPlan: 'AB', bookingNights: '3박',
      detail: 'A/B 공통 3박 · The Strip 한복판 · 24h 체크인 (7/1 야간 도착)' },
    { kind: 'sight',    name: 'Bellagio 분수쇼',             lat: 36.1126, lng: -115.1767, icon: '💦', day: '7/2 저녁', detail: 'The Strip 야경의 정수' },
    { kind: 'sight',    name: 'Fremont Street Experience',  lat: 36.1707, lng: -115.1432, icon: '🎡', day: '7/2 오후', detail: '구시가지 · 집라인' },
    { kind: 'sight',    name: 'Caesars · Forum Shops',      lat: 36.1163, lng: -115.1748, icon: '🛍', detail: '쇼핑 · 카지노' },
    { kind: 'activity', name: 'SpeedVegas 슈퍼카',           lat: 35.9961, lng: -115.1697, icon: '🏎',  day: '7/3 오전', detail: '람보·페라리·포르쉐 · 국제면허 필요' },
    { kind: 'activity', name: 'Topgolf Las Vegas',           lat: 36.1054, lng: -115.1681, icon: '⛳', day: '7/3 오후', detail: '3층 · 야경 보며 골프' },
    { kind: 'activity', name: 'iFly 실내 스카이다이빙',        lat: 36.1234, lng: -115.1718, icon: '🪂', detail: 'Strip 내 · 풍동 자유낙하' },
    { kind: 'activity', name: '그랜드캐니언 헬기 (Boulder)',   lat: 35.9647, lng: -114.8581, icon: '🚁', detail: '4~6h · 협곡 착륙 패키지' },
    { kind: 'activity', name: '후버댐',                       lat: 36.0162, lng: -114.7377, icon: '🏗', detail: '왕복 3h · 댐 투어' },
    { kind: 'activity', name: 'The Gun Store 사격장',          lat: 36.1281, lng: -115.1244, icon: '🔫', detail: 'AR-15·AK-47 실탄 체험' },
    { kind: 'activity', name: 'Desert Breeze 픽업 사커',       lat: 36.1306, lng: -115.2486, icon: '⚽', detail: '저녁 6시 이후 · 라틴계 상주 · 12면' },
  ],
  LA: [
    { kind: 'stadium',  name: 'SoFi Stadium 🇰🇷',            lat: 33.9534, lng: -118.3387, icon: '⚽', day: '6/28 12:00 PT', detail: 'R32 Match 73 — 한국(조A 2위) vs 조B 2위 · Plan B 핵심', highlight: true },
    { kind: 'activity', name: 'LAX 공항',                   lat: 33.9416, lng: -118.4085, icon: '🛬', day: '6/28',           detail: 'SFO에서 직항 도착 · Uber로 SoFi 25~45분' },
  ],
  SV: [
    { kind: 'sight', name: 'Stanford Campus',           lat: 37.4275, lng: -122.1697, icon: '🏛', day: 'A: 6/28 / B: 6/27 오전', detail: 'Hoover Tower · Oval · 기념품샵' },
    { kind: 'sight', name: 'Google Visitor Center',     lat: 37.4220, lng: -122.0841, icon: '🔵', day: 'A: 6/28 / B: 6/27 점심', detail: '예약 필수 · 무료 · Sunnyvale' },
    { kind: 'sight', name: 'Apple Park Visitor Center', lat: 37.3327, lng: -122.0053, icon: '🍎', day: 'A: 6/28 / B: 6/27 오후', detail: 'Cupertino · 옥상 카페 · Apple 굿즈' },
    { kind: 'sight', name: 'Computer History Museum',   lat: 37.4144, lng: -122.0775, icon: '💻', day: 'A: 6/28 / B: 6/27', detail: 'Mountain View · 컴퓨터 역사 박물관 · 약 2시간' },
  ],
}

// ── Plan별 동선 ──
const planA = {
  color: '#7c3aed',
  bg: 'rgba(124, 58, 237, 0.08)',
  name: 'Plan A — 시애틀 R32',
  legs: [
    { city: 'SF',  date: '6/26 금', label: '도착',                          icon: '✈️', desc: 'OZ212 SFO 도착 · Hyatt Regency Embarcadero 체크인 · 비행 피로 회복' },
    { city: 'SF',  date: '6/27 토', label: 'Alcatraz·Golden Gate·Giants', icon: '🌉', desc: '알카트라즈 · 자전거 라이딩 · 저녁 Giants 18:05' },
    { city: 'SV',  date: '6/28 일', label: '실리콘밸리 풀데이 투어',         icon: '💻', desc: 'Stanford · Google Visitor Center · Apple Park · Computer History Museum · Caltrain or Uber 왕복' },
    { city: 'YOS', date: '6/29 월', label: '요세미티 1박 (A/B 공통)',       icon: '⛰️', desc: 'SF→Yosemite 3.5h · Valley 투어' },
    { city: 'SEA', date: '6/30 화', label: '요세미티 오전 → SEA 저녁 입성',  icon: '✈️', desc: '오전 짧은 하이킹 · 11:00 SF 출발 · 16:30 SFO→SEA · Hyatt Regency 1박' },
    { city: 'SEA', date: '7/1 수',  label: '🇰🇷 R32 Match 82 + LV 야간 이동', icon: '⚽', desc: '여유로운 아침 · Space Needle · 13:00 Lumen 경기 · 저녁 SEA→LAS', highlight: true },
    { city: 'LV',  date: '7/2 목',  label: '라스베이거스',                  icon: '🎰', desc: 'Fremont · Bellagio · 카지노' },
    { city: 'LV',  date: '7/3 금',  label: '라스베이거스',                  icon: '🎯', desc: 'SpeedVegas · Topgolf · 사격장' },
    { city: 'LV',  date: '7/4 토',  label: 'LV → SFO → 귀국',               icon: '🏠', desc: 'LAS→SFO 국내선 · OZ211 인천行' },
  ],
}

const planB = {
  color: '#e11d48',
  bg: 'rgba(225, 29, 72, 0.08)',
  name: 'Plan B — LA 한국전 + 실리콘밸리',
  legs: [
    { city: 'SF',  date: '6/26 금', label: '도착',                          icon: '✈️', desc: 'OZ212 SFO 도착 · 비행 피로 회복' },
    { city: 'SV',  date: '6/27 토', label: '실리콘밸리 + Giants',            icon: '💻', desc: 'Stanford · Google · Apple Park · 저녁 Giants 18:05' },
    { city: 'LA',  date: '6/28 일', label: '🇰🇷 LA 항공 당일치기',           icon: '✈️', desc: 'SFO→LAX 직항 1h 30m · SoFi Match 73 · 당일 SF 복귀', highlight: true },
    { city: 'YOS', date: '6/29 월', label: '요세미티 1박 (A/B 공통)',        icon: '⛰️', desc: 'SF→Yosemite · Valley 투어 · LA 경기 회복' },
    { city: 'SF',  date: '6/30 화', label: '요세미티 → SF 복귀 (베이스 1박 연장)', icon: '🌉', desc: '오전 하이킹 후 SF로 직행 · Hyatt Regency Embarcadero 1박 연장 (총 4박)' },
    { city: 'LV',  date: '7/1 수',  label: 'SFO → LAS 이동',                 icon: '✈️', desc: 'SFO→LAS 직항 · The Strip 야경 · LV 체크인' },
    { city: 'LV',  date: '7/2 목',  label: '라스베이거스',                  icon: '🎰', desc: 'Fremont · SpeedVegas · 쇼' },
    { city: 'LV',  date: '7/3 금',  label: '라스베이거스',                  icon: '🎯', desc: '후버댐 · iFly · 마지막 카지노' },
    { city: 'LV',  date: '7/4 토',  label: 'LV → SFO → 귀국',               icon: '🏠', desc: 'LAS→SFO · OZ211 인천行' },
  ],
}

const PLANS = { a: planA, b: planB }
const activePlan = ref('a')
const plan = computed(() => PLANS[activePlan.value])

// 예약 전략 박스 펼침 상태
const bookingOpen = ref(true)
const totalNightsNow = BOOKING.now.reduce((s, b) => s + b.nights, 0)

function formatKRW(n) {
  if (!n) return '—'
  if (n >= 10000) return Math.round(n / 1000) / 10 + '만원'
  return n.toLocaleString() + '원'
}

// 도시별 그룹 (활성 플랜에서 방문하는 도시만)
const visitedCities = computed(() => {
  const map = new Map()
  plan.value.legs.forEach((leg, idx) => {
    const c = CITIES[leg.city]
    if (!map.has(leg.city)) map.set(leg.city, { ...c, key: leg.city, indices: [], visits: 0 })
    const g = map.get(leg.city)
    g.indices.push(idx)
    g.visits = g.indices.length
  })
  return Array.from(map.values())
})

// 카테고리 필터
const filters = reactive({ stadium: true, activity: true, sight: true, lodging: true })

// 활성 플랜에서 보여줄 POI 전체 (필터 적용)
const visiblePois = computed(() => {
  const cities = visitedCities.value.map(c => c.key)
  const out = []
  cities.forEach(c => {
    (POIS[c] || []).forEach(p => {
      if (filters[p.kind]) out.push({ ...p, city: c })
    })
  })
  return out
})

const kindCounts = computed(() => {
  const counts = { stadium: 0, activity: 0, sight: 0, lodging: 0 }
  const cities = visitedCities.value.map(c => c.key)
  cities.forEach(c => (POIS[c] || []).forEach(p => { counts[p.kind]++ }))
  return counts
})

// ── Leaflet ──
const mapEl = ref(null)
let mapInstance = null
let layers = []
const selectedIdx = ref(null)

function clearLayers() {
  layers.forEach(l => mapInstance.removeLayer(l))
  layers = []
}

function buildCityIcon(label, count, color) {
  const html = `<div class="city-pin" style="background:${color}">
    <span class="city-emoji">${label}</span>
    ${count > 1 ? `<span class="city-count">${count}일</span>` : ''}
  </div>`
  return L.divIcon({ html, className: 'city-pin-wrap', iconSize: [56, 30], iconAnchor: [28, 15] })
}

function buildPoiIcon(p) {
  const k = KINDS[p.kind]
  let sz = k.size
  // 호텔 standby 핀은 점선 테두리로 차별화 (분기되는 호텔)
  const isStandby = p.kind === 'lodging' && p.booking === 'standby'
  const borderStyle = isStandby ? 'border:2px dashed #fff;' : 'border:2px solid #fff;'
  // 예약 확정 호텔(picked)은 크기 +6 + 초록 링 강조
  let ring
  if (p.picked) {
    sz = k.size + 6
    ring = `box-shadow: 0 0 0 3px #16a34a, 0 0 0 6px #16a34a55, 0 2px 8px rgba(0,0,0,.5);`
  } else if (p.highlight) {
    ring = `box-shadow: 0 0 0 4px ${k.color}55, 0 0 0 8px ${k.color}22, 0 2px 6px rgba(0,0,0,.4);`
  } else {
    ring = `box-shadow: 0 2px 4px rgba(0,0,0,.35);`
  }
  const checkmark = p.picked ? `<span class="poi-check">✓</span>` : ''
  const html = `<div class="poi-pin" style="background:${k.color};width:${sz}px;height:${sz}px;${borderStyle}${ring}">
    <span class="poi-emoji" style="font-size:${Math.round(sz*0.55)}px">${p.icon}</span>
    ${checkmark}
  </div>`
  return L.divIcon({ html, className: 'poi-pin-wrap', iconSize: [sz, sz], iconAnchor: [sz/2, sz/2] })
}

function draw() {
  if (!mapInstance) return
  clearLayers()
  const p = plan.value

  // 1) 도시 핀 (필터에 영향 없음, 항상 표시)
  visitedCities.value.forEach(g => {
    const m = L.marker([g.lat, g.lng], { icon: buildCityIcon(g.icon, g.visits, p.color), zIndexOffset: 1000 }).addTo(mapInstance)
    m.bindPopup(`<b>${g.icon} ${g.name}</b><br>${g.visits}일 체류<br><small>Day ${g.indices.map(i=>i+1).join(', ')}</small>`)
    layers.push(m)
  })

  // 2) POI 핀
  visiblePois.value.forEach(poi => {
    const m = L.marker([poi.lat, poi.lng], {
      icon: buildPoiIcon(poi),
      zIndexOffset: poi.highlight ? 900 : (poi.kind === 'stadium' ? 800 : 100),
    }).addTo(mapInstance)
    const dayLine = poi.day ? `<div style="color:${KINDS[poi.kind].color};font-weight:600;font-size:.75rem">${poi.day}</div>` : ''
    // 호텔의 경우 예약 액션 뱃지
    let bookingBadge = ''
    if (poi.kind === 'lodging' && poi.booking) {
      const isNow = poi.booking === 'now'
      const planLabel = poi.bookingPlan === 'AB' ? 'A/B 공통' : `Plan ${poi.bookingPlan} 전용`
      const bg = isNow ? '#16a34a' : '#ea580c'
      const label = isNow ? '✅ 지금 예약' : '⏳ 동시 대기 (6/24 결정)'
      bookingBadge = `<div style="display:inline-block;margin-top:4px;padding:3px 8px;border-radius:10px;background:${bg};color:#fff;font-size:.7rem;font-weight:700;">${label}</div>
        <div style="margin-top:3px;font-size:.7rem;color:#666"><b>${planLabel}</b> · ${poi.bookingNights || ''}</div>`
    }
    m.bindPopup(`<div style="min-width:220px">
      <b>${poi.icon} ${poi.name}</b>
      ${dayLine}
      ${bookingBadge}
      <div style="font-size:.78rem;margin-top:5px;color:#444">${poi.detail || ''}</div>
      <div style="font-size:.7rem;color:#888;margin-top:4px">📍 ${CITIES[poi.city].name}</div>
    </div>`)
    layers.push(m)
  })

  // 3) 폴리라인 (일자 순)
  const coords = p.legs.map(leg => {
    const c = CITIES[leg.city]
    return [c.lat, c.lng]
  })
  const cleaned = coords.filter((co, i) => i === 0 || co[0] !== coords[i-1][0] || co[1] !== coords[i-1][1])
  const poly = L.polyline(cleaned, {
    color: p.color, weight: 3, opacity: 0.7, dashArray: '8, 10', lineCap: 'round',
  }).addTo(mapInstance)
  layers.push(poly)

  // 자동 줌 (도시 + POI 모두 포함)
  const allBounds = L.latLngBounds([])
  visitedCities.value.forEach(g => allBounds.extend([g.lat, g.lng]))
  visiblePois.value.forEach(p => allBounds.extend([p.lat, p.lng]))
  if (allBounds.isValid()) mapInstance.fitBounds(allBounds.pad(0.15))
}

function focusLeg(idx) {
  selectedIdx.value = idx
  const leg = plan.value.legs[idx]
  const c = CITIES[leg.city]
  mapInstance.flyTo([c.lat, c.lng], 11, { duration: 0.8 })
}

function focusCity(cityKey) {
  const c = CITIES[cityKey]
  mapInstance.flyTo([c.lat, c.lng], 12, { duration: 0.8 })
}

function fitAll() {
  draw()
}

onMounted(async () => {
  await nextTick()
  mapInstance = L.map(mapEl.value, { scrollWheelZoom: true, zoomControl: true }).setView([39.5, -120], 5)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 18,
  }).addTo(mapInstance)
  draw()
})

watch(activePlan, () => { selectedIdx.value = null; draw() })
watch(filters, () => { draw() }, { deep: true })
</script>

<template>
  <div class="map-page">
    <!-- 플랜 토글 -->
    <div class="plan-toggle">
      <button class="plan-btn plan-a" :class="{ active: activePlan === 'a' }" @click="activePlan = 'a'">
        🏟️ Plan A — 시애틀 R32 + LV
        <span class="plan-sub">SF → YOS → SF → SEA(Lumen Field) → LV → 귀국</span>
      </button>
      <button class="plan-btn plan-b" :class="{ active: activePlan === 'b' }" @click="activePlan = 'b'">
        🇰🇷 Plan B — LA 한국전 + LV
        <span class="plan-sub">SF → YOS → SF → ✈️ LA(SoFi) → SV → LV → 귀국</span>
      </button>
    </div>

    <!-- 🏨 숙소 예약 전략 -->
    <section class="booking-card">
      <header class="booking-head" @click="bookingOpen = !bookingOpen">
        <span class="booking-icon">🏨</span>
        <span class="booking-title">숙소 예약 전략</span>
        <span class="booking-summary">
          <span class="bs-now">즉시 {{ totalNightsNow }}박 (A/B 공통)</span>
          <span class="bs-tag-ok">분기 없음</span>
        </span>
        <span class="booking-chevron" :class="{ rotated: bookingOpen }">›</span>
      </header>
      <div v-show="bookingOpen" class="booking-body">
        <div class="booking-callout">{{ BOOKING.totalNote }}</div>
        <div class="booking-phase">
          <div class="phase-label phase-now">
            <span class="phase-num">1</span>
            <span>지금 바로 예약 — A/B 공통 ({{ totalNightsNow }}박 · 변동 0%)</span>
          </div>
          <div class="booking-grid">
            <div v-for="b in BOOKING.now" :key="b.id" class="booking-item now" :class="{ priority: b.priority === 1, confirmed: b.picked }">
              <div class="bi-head">
                <span class="bi-tag" :data-tag="b.tag">{{ b.tag }}</span>
                <span class="bi-action">{{ b.action }}</span>
              </div>
              <div class="bi-hotel">{{ b.hotel }}</div>
              <div class="bi-dates"><b>{{ b.dates }}</b> · {{ b.nights }}박</div>
              <div class="bi-note">{{ b.note }}</div>
              <!-- 후보 호텔 (오투어 검색 결과) -->
              <div v-if="b.candidates" class="bi-candidates">
                <div class="bi-cand-head">
                  <span>🏨 오투어 호텔 후보 ({{ b.candidates.length }}개)</span>
                  <a :href="BOOKING.siteUrl" target="_blank" rel="noopener" class="bi-cand-link">검색하기 ↗</a>
                </div>
                <div class="bi-cand-list">
                  <div v-for="(c, i) in b.candidates" :key="i" class="bi-cand-row"
                       :class="{ best: c.note && c.note.startsWith('⭐'), picked: c.picked }">
                    <span class="bi-cand-stars">{{ '★'.repeat(Math.floor(c.stars)) }}{{ c.stars % 1 ? '½' : '' }}</span>
                    <span class="bi-cand-name">{{ c.name }}</span>
                    <span class="bi-cand-price"><b>{{ formatKRW(c.perNight) }}</b>/박<span v-if="b.nights > 1" class="bi-cand-total">· {{ b.nights }}박 {{ formatKRW(c.total) }}</span></span>
                    <span v-if="c.note" class="bi-cand-note">{{ c.note }}</span>
                  </div>
                </div>
              </div>
              <div class="bi-site">→ {{ b.site }}</div>
            </div>
          </div>
        </div>

        <!-- 2단계: 동시 대기 (분기) -->
        <div v-if="BOOKING.standby" class="booking-phase">
          <div class="phase-label phase-standby">
            <span class="phase-num">2</span>
            <span>동시 대기 — 둘 다 무료취소로 예약 → {{ BOOKING.decisionAt }} 후 하나 취소</span>
          </div>
          <div class="booking-grid">
            <div v-for="b in BOOKING.standby" :key="b.id" class="booking-item standby" :class="`plan-${b.plan.toLowerCase()}`">
              <div class="bi-head">
                <span class="bi-tag" :data-tag="b.tag">{{ b.tag }}</span>
                <span class="bi-plan">Plan {{ b.plan }} 전용</span>
              </div>
              <div class="bi-hotel">{{ b.hotel }}</div>
              <div class="bi-dates"><b>{{ b.dates }}</b> · {{ b.nights }}박</div>
              <div class="bi-when">📌 {{ b.when }}</div>
              <div v-if="b.candidates" class="bi-candidates">
                <div class="bi-cand-head">
                  <span>🏨 후보 호텔 ({{ b.candidates.length }}개)</span>
                  <a :href="BOOKING.siteUrl" target="_blank" rel="noopener" class="bi-cand-link">오투어 ↗</a>
                </div>
                <div class="bi-cand-list">
                  <div v-for="(c, i) in b.candidates" :key="i" class="bi-cand-row"
                       :class="{ best: c.note && c.note.startsWith('⭐') }">
                    <span class="bi-cand-stars">{{ '★'.repeat(Math.floor(c.stars)) }}{{ c.stars % 1 ? '½' : '' }}</span>
                    <span class="bi-cand-name">{{ c.name }}</span>
                    <span class="bi-cand-price"><b>{{ formatKRW(c.perNight) }}</b>/박</span>
                    <span v-if="c.note" class="bi-cand-note">{{ c.note }}</span>
                  </div>
                </div>
              </div>
              <div class="bi-site">→ {{ b.site }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 필터 + 도시 ──-->
    <div class="filter-row">
      <div class="filter-group">
        <span class="filter-label">표시</span>
        <button v-for="(k, key) in KINDS" :key="key"
          class="filter-chip"
          :class="{ active: filters[key] }"
          :style="{ '--c': k.color }"
          @click="filters[key] = !filters[key]"
        >
          <span class="fc-dot" :style="{ background: k.color }"></span>
          {{ k.label }}
          <span class="fc-cnt">{{ kindCounts[key] }}</span>
        </button>
      </div>
      <div class="city-quick">
        <span class="filter-label">도시</span>
        <button v-for="g in visitedCities" :key="g.key"
          class="city-quick-btn"
          :style="{ borderColor: plan.color + '66', color: plan.color }"
          @click="focusCity(g.key)"
        >
          <span>{{ g.icon }}</span>
          <span class="cq-name">{{ g.name }}</span>
        </button>
        <button class="city-quick-btn fit" @click="fitAll">↺ 전체</button>
      </div>
    </div>

    <!-- 지도 + 사이드 -->
    <div class="map-layout">
      <div class="map-container" ref="mapEl"></div>
      <aside class="legs-panel">
        <header class="legs-head">
          <span class="legs-title">일자별 동선</span>
          <span class="legs-count">{{ plan.legs.length }}일</span>
        </header>
        <ol class="legs-list">
          <li
            v-for="(leg, i) in plan.legs" :key="i"
            class="leg-item"
            :class="{ active: selectedIdx === i, highlight: leg.highlight }"
            :style="{ '--c': plan.color }"
            @click="focusLeg(i)"
          >
            <div class="leg-day-col">
              <span class="leg-day-no" :style="{ background: plan.color }">{{ i + 1 }}</span>
              <span class="leg-city-short">{{ CITIES[leg.city].short }}</span>
            </div>
            <div class="leg-main">
              <div class="leg-top">
                <span class="leg-date">{{ leg.date }}</span>
                <span class="leg-icon">{{ leg.icon }}</span>
              </div>
              <div class="leg-label">{{ leg.label }}</div>
              <div class="leg-desc">{{ leg.desc }}</div>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<style>
/* Leaflet 핀 (전역 — divIcon HTML이 scoped 밖) */
.city-pin-wrap, .poi-pin-wrap { background: transparent !important; border: 0 !important; }
.city-pin {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 18px;
  color: #fff; font-weight: 700; font-size: .78rem;
  border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.45);
  white-space: nowrap;
}
.city-emoji { font-size: 1rem; }
.city-count { font-size: .68rem; opacity: .9; }
.poi-pin {
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  color: #fff;
  border: 2px solid #fff;
}
.poi-emoji { line-height: 1; }
.poi-check {
  position: absolute;
  bottom: -4px; right: -4px;
  width: 16px; height: 16px;
  background: #16a34a;
  color: #fff;
  border-radius: 50%;
  border: 2px solid #fff;
  font-size: 10px;
  font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  line-height: 1;
}
.poi-pin { position: relative; }
.leaflet-popup-content { font-size: .85rem; line-height: 1.5; }
.leaflet-popup-content b { color: #111; }
</style>

<style scoped>
.map-page { display: flex; flex-direction: column; gap: 1rem; }

/* 플랜 토글 */
.plan-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.plan-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: .25rem;
  padding: .9rem 1.1rem; border-radius: var(--radius-lg);
  background: var(--bg-elevated); border: 1px solid var(--border);
  font-size: .95rem; font-weight: 700; text-align: left;
  cursor: pointer; transition: var(--transition);
  color: var(--text);
}
.plan-btn:hover { border-color: var(--accent); }
.plan-btn.plan-a.active { background: rgba(124, 58, 237, 0.12); border-color: #7c3aed; color: #c4b5fd; }
.plan-btn.plan-b.active { background: rgba(225, 29, 72, 0.12); border-color: #e11d48; color: #fca5a5; }
.plan-sub { font-size: .72rem; font-weight: 500; color: var(--text-muted); }

/* 🏨 예약 전략 박스 */
.booking-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.booking-head {
  display: flex; align-items: center; gap: .6rem;
  padding: .7rem 1rem;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}
.booking-head:hover { background: var(--bg-overlay); }
.booking-icon { font-size: 1.1rem; }
.booking-title { font-weight: 700; font-size: .92rem; color: var(--text); }
.booking-summary { display: inline-flex; gap: .4rem; align-items: center; margin-left: .5rem; font-size: .78rem; }
.bs-now { color: #16a34a; font-weight: 700; background: rgba(22,163,74,.12); padding: 2px 8px; border-radius: 10px; }
.bs-tag-ok { color: #14b8a6; font-weight: 700; font-size: .72rem; background: rgba(20,184,166,.12); padding: 2px 8px; border-radius: 10px; }
.bs-sep { color: var(--text-dim); font-weight: 600; }
.booking-callout {
  background: rgba(20,184,166,.08);
  border: 1px solid rgba(20,184,166,.3);
  color: #0d9488;
  padding: .55rem .8rem;
  border-radius: 8px;
  font-size: .78rem;
  font-weight: 600;
}
.booking-chevron {
  margin-left: auto; font-size: 1.3rem; color: var(--text-muted);
  transition: transform .2s; transform: rotate(0deg);
}
.booking-chevron.rotated { transform: rotate(90deg); }

.booking-body {
  padding: .25rem 1rem 1rem;
  display: flex; flex-direction: column; gap: .9rem;
  border-top: 1px solid var(--border-muted);
}
.booking-phase { display: flex; flex-direction: column; gap: .5rem; }
.phase-label {
  display: inline-flex; align-items: center; gap: .5rem;
  font-size: .78rem; font-weight: 700;
  padding: 5px 10px; border-radius: 8px;
  align-self: flex-start;
}
.phase-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: currentColor; color: #fff !important;
  font-size: .7rem; font-weight: 800;
}
.phase-num::after { content: ''; }
.phase-now { background: rgba(22,163,74,.14); color: #16a34a; border: 1px solid rgba(22,163,74,.35); }
.phase-now .phase-num { background: #16a34a; }
.phase-standby { background: rgba(234,88,12,.12); color: #ea580c; border: 1px solid rgba(234,88,12,.35); }
.phase-standby .phase-num { background: #ea580c; }

.booking-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: .6rem;
}
.booking-item {
  padding: .7rem .85rem; border-radius: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  display: flex; flex-direction: column; gap: .25rem;
  transition: var(--transition);
}
.booking-item.now { border-left: 3px solid #16a34a; }
.booking-item.confirmed {
  border: 2px solid #16a34a;
  background: rgba(22,163,74,.04);
  position: relative;
}
.booking-item.confirmed::after {
  content: '✅ 예약 확정';
  position: absolute;
  top: -10px; right: 10px;
  background: #16a34a;
  color: #fff;
  font-size: .68rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 10px;
  letter-spacing: .04em;
  box-shadow: 0 2px 6px rgba(22,163,74,.4);
}
.booking-item.standby { border-left: 3px solid #ea580c; border-style: solid solid solid solid; background: rgba(234,88,12,.04); }
.booking-item.priority { box-shadow: 0 0 0 2px rgba(234,179,8,.35); border-color: #eab308; }
.booking-item.plan-a { background: rgba(124,58,237,.06); }
.booking-item.plan-b { background: rgba(225,29,72,.06); }
.bi-head { display: flex; align-items: center; gap: .4rem; margin-bottom: .15rem; }
.bi-tag {
  display: inline-block; font-size: .62rem; font-weight: 800; letter-spacing: .04em;
  padding: 2px 7px; border-radius: 6px;
  background: var(--bg-overlay); color: var(--text);
  border: 1px solid var(--border);
}
.bi-tag[data-tag="SF"]  { background: rgba(14,165,233,.15); color: #0ea5e9; border-color: rgba(14,165,233,.4); }
.bi-tag[data-tag="YOS"] { background: rgba(34,197,94,.15); color: #22c55e; border-color: rgba(34,197,94,.4); }
.bi-tag[data-tag="SEA"] { background: rgba(124,58,237,.15); color: #7c3aed; border-color: rgba(124,58,237,.4); }
.bi-tag[data-tag="LV"]  { background: rgba(245,158,11,.18); color: #d97706; border-color: rgba(245,158,11,.4); }
.bi-action { font-size: .7rem; font-weight: 700; color: #16a34a; margin-left: auto; }
.bi-plan { font-size: .7rem; font-weight: 700; color: #ea580c; margin-left: auto; }
.booking-item.plan-a .bi-plan { color: #7c3aed; }
.booking-item.plan-b .bi-plan { color: #e11d48; }
.bi-hotel { font-size: .88rem; font-weight: 700; color: var(--text); }
.bi-dates { font-size: .76rem; color: var(--text-muted); font-family: ui-monospace,monospace; }
.bi-dates b { color: var(--text); }
.bi-note, .bi-when { font-size: .72rem; color: var(--text-muted); line-height: 1.45; }
.bi-when { color: #ea580c; font-weight: 600; }
.booking-item.plan-a .bi-when { color: #7c3aed; }
.booking-item.plan-b .bi-when { color: #e11d48; }
.bi-site { font-size: .68rem; color: var(--text-dim); margin-top: 2px; font-style: italic; }

/* 호텔 후보 (오투어 검색 결과) */
.bi-candidates {
  margin-top: .4rem;
  padding-top: .5rem;
  border-top: 1px dashed var(--border);
  display: flex; flex-direction: column; gap: .3rem;
}
.bi-cand-head {
  display: flex; justify-content: space-between; align-items: center;
  font-size: .7rem; font-weight: 700; color: var(--text-muted);
}
.bi-cand-link {
  font-size: .66rem; color: var(--accent); font-weight: 600;
  text-decoration: none; padding: 1px 6px; border-radius: 6px;
  background: var(--accent-bg);
}
.bi-cand-link:hover { background: var(--accent); color: #fff; }
.bi-cand-list { display: flex; flex-direction: column; gap: .25rem; }
.bi-cand-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: .35rem .5rem;
  align-items: baseline;
  padding: .35rem .5rem;
  background: var(--bg-overlay);
  border-radius: 5px;
  font-size: .72rem;
  border-left: 2px solid transparent;
}
.bi-cand-row.best {
  background: rgba(234,179,8,.08);
  border-left-color: #eab308;
}
.bi-cand-row.picked {
  background: rgba(22,163,74,.12);
  border-left: 3px solid #16a34a;
  position: relative;
}
.bi-cand-row.picked::before {
  content: '✅ 예약';
  position: absolute;
  top: -7px; right: 8px;
  background: #16a34a;
  color: #fff;
  font-size: .58rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 8px;
  letter-spacing: .04em;
}
.bi-cand-row.picked .bi-cand-name { color: #16a34a; }
.bi-cand-stars {
  font-size: .65rem; color: #f59e0b; letter-spacing: -1px;
  white-space: nowrap;
}
.bi-cand-name { font-weight: 700; color: var(--text); }
.bi-cand-price {
  text-align: right;
  font-size: .7rem;
  font-family: ui-monospace, monospace;
  color: var(--text-muted);
  white-space: nowrap;
}
.bi-cand-price b { color: var(--text); }
.bi-cand-total { display: block; font-size: .62rem; color: var(--text-dim); margin-top: 1px; }
.bi-cand-note {
  grid-column: 1 / -1;
  font-size: .66rem; color: var(--text-muted);
  line-height: 1.4; margin-top: 1px;
}

/* 필터 영역 */
.filter-row {
  display: flex; flex-direction: column; gap: .55rem;
  padding: .65rem .85rem; background: var(--bg-elevated);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
}
.filter-group, .city-quick { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.filter-label {
  font-size: .68rem; color: var(--text-muted); font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em; margin-right: .25rem;
}
.filter-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 14px;
  background: var(--bg-overlay); border: 1px solid var(--border);
  color: var(--text-muted); font-size: .78rem; font-weight: 600;
  cursor: pointer; transition: var(--transition);
}
.filter-chip:hover { color: var(--text); border-color: var(--c); }
.filter-chip.active {
  background: color-mix(in srgb, var(--c) 14%, transparent);
  border-color: var(--c); color: var(--c);
}
.fc-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.fc-cnt { font-size: .68rem; opacity: .7; margin-left: 2px; }

.city-quick-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 12px;
  background: var(--bg-overlay); border: 1px solid;
  font-size: .76rem; font-weight: 600;
  cursor: pointer; transition: var(--transition);
}
.city-quick-btn:hover { transform: translateY(-1px); }
.city-quick-btn.fit { color: var(--text-muted) !important; border-color: var(--border) !important; }
.cq-name { font-size: .72rem; }

/* 지도 + 사이드 */
.map-layout {
  display: grid; grid-template-columns: 1fr 360px;
  gap: 1rem; min-height: 580px;
}
.map-container {
  height: 680px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--bg-elevated);
}

/* 일자 리스트 */
.legs-panel {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-lg); display: flex; flex-direction: column;
  max-height: 680px; overflow: hidden;
}
.legs-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1rem; border-bottom: 1px solid var(--border-muted);
}
.legs-title { font-size: .85rem; font-weight: 700; color: var(--text); }
.legs-count { font-size: .72rem; color: var(--text-muted); }
.legs-list { list-style: none; padding: 0; margin: 0; overflow-y: auto; }
.leg-item {
  display: flex; gap: .8rem;
  padding: .65rem .9rem;
  border-bottom: 1px solid var(--border-muted);
  cursor: pointer; transition: var(--transition);
  border-left: 3px solid transparent;
}
.leg-item:hover { background: var(--bg-overlay); }
.leg-item.active { background: var(--bg-overlay); border-left-color: var(--c); }
.leg-item.highlight { background: color-mix(in srgb, var(--c) 8%, transparent); }
.leg-day-col {
  display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 32px;
}
.leg-day-no {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: .75rem;
}
.leg-city-short { font-size: .62rem; font-weight: 700; color: var(--text-muted); letter-spacing: .04em; }
.leg-main { flex: 1; min-width: 0; }
.leg-top { display: flex; align-items: center; gap: .5rem; margin-bottom: 2px; }
.leg-date { font-size: .72rem; color: var(--text-muted); font-weight: 600; }
.leg-icon { font-size: .9rem; }
.leg-label { font-size: .85rem; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.leg-desc { font-size: .72rem; color: var(--text-muted); line-height: 1.5; }

@media (max-width: 900px) {
  .plan-toggle { grid-template-columns: 1fr; }
  .map-layout { grid-template-columns: 1fr; }
  .map-container { height: 460px; }
  .legs-panel { max-height: none; }
}
</style>
