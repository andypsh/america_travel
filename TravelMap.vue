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

// ── POI: 도시별 ──
const POIS = {
  SF: [
    { kind: 'stadium',  name: 'Oracle Park (SF Giants)', lat: 37.7786, lng: -122.3893, icon: '⚾', day: '6/26',   detail: '도착 당일 Giants vs Atlanta Braves' },
    { kind: 'sight',    name: 'Alcatraz Island',         lat: 37.8267, lng: -122.4230, icon: '🏝',  day: '6/29',   detail: 'Pier 33 페리 · 사전 예약 필수' },
    { kind: 'sight',    name: 'Golden Gate Bridge',      lat: 37.8199, lng: -122.4783, icon: '🌉', day: '6/29',   detail: '자전거 라이딩 → Sausalito 페리' },
    { kind: 'sight',    name: "Fisherman's Wharf",       lat: 37.8080, lng: -122.4177, icon: '🦀', detail: 'Pier 39 · 자전거 렌탈 출발' },
    { kind: 'lodging',  name: 'Palace Hotel (베이스)',   lat: 37.7884, lng: -122.4017, icon: '🏨', detail: 'Union Square · Plan A 4박 / Plan B 5박' },
    { kind: 'activity', name: 'Palo Alto Airport (PAO)', lat: 37.4611, lng: -122.1150, icon: '🛩️', day: '6/29',   detail: '경비행기 출발 · Bay 투어 또는 LA 왕복' },
  ],
  YOS: [
    { kind: 'sight',   name: 'Yosemite Valley',       lat: 37.7456, lng: -119.5936, icon: '⛰️', day: '6/27', detail: 'Valley 순환 · Bridalveil Fall · El Capitan' },
    { kind: 'sight',   name: 'Tunnel View',           lat: 37.7156, lng: -119.6779, icon: '👁',  day: '6/28', detail: '아침 하이킹 출발점 · 파노라마 포토스팟' },
    { kind: 'sight',   name: 'Glacier Point',         lat: 37.7281, lng: -119.5740, icon: '🏔', day: '6/28', detail: '오후 파노라마 · 마지막 자연 감상' },
    { kind: 'lodging', name: 'Curry Village (1박)',   lat: 37.7375, lng: -119.5736, icon: '🏕',  day: '6/27~28', detail: 'Half Dome Village · 캐빈 1박' },
  ],
  SEA: [
    { kind: 'stadium',  name: 'Lumen Field 🇰🇷',              lat: 47.5952, lng: -122.3316, icon: '⚽', day: '7/1 13:00 PT', detail: 'R32 Match 82 — 한국 vs 16강 약자 · Plan A 핵심', highlight: true },
    { kind: 'sight',    name: 'Pike Place Market',           lat: 47.6097, lng: -122.3422, icon: '🐟', day: '6/30 / 7/1', detail: '저녁 + 경기 당일 아침 커피' },
    { kind: 'sight',    name: 'Space Needle',                lat: 47.6205, lng: -122.3493, icon: '🗼', day: '7/1 오전',   detail: 'Seattle Center 전망대' },
    { kind: 'lodging',  name: 'Hyatt Regency Seattle',       lat: 47.6113, lng: -122.3329, icon: '🏨', day: '6/30~7/1',   detail: 'Plan A 1박 · downtown' },
    { kind: 'activity', name: 'Cal Anderson Park 픽업 사커',  lat: 47.6184, lng: -122.3196, icon: '⚽', day: '6/30 저녁',  detail: '한국 응원단 · 미국 픽업게임 혼합' },
    { kind: 'activity', name: 'Blade & Timber 도끼던지기',    lat: 47.6166, lng: -122.3217, icon: '🪓', detail: 'Capitol Hill · 18레인 · 맥주 가능' },
  ],
  LV: [
    { kind: 'lodging',  name: 'Paris Las Vegas',            lat: 36.1119, lng: -115.1717, icon: '🏨', day: '7/1~7/4', detail: '3박 · The Strip 한복판 · 24h 체크인' },
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
    { kind: 'stadium',  name: 'SoFi Stadium 🇰🇷',            lat: 33.9534, lng: -118.3387, icon: '⚽', day: '6/29 12:00 PT', detail: 'R32 Match 73 — 한국(조A 2위) vs 조B 2위 · Plan B 핵심', highlight: true },
    { kind: 'activity', name: 'Hawthorne Municipal (HHR)',  lat: 33.9223, lng: -118.3352, icon: '🛬', day: '6/29',           detail: 'PAO에서 경비행기 도착 · 도보 거리 SoFi' },
  ],
  SV: [
    { kind: 'sight', name: 'Stanford Campus',           lat: 37.4275, lng: -122.1697, icon: '🏛', day: '6/30 오전', detail: 'Hoover Tower · Oval · 기념품' },
    { kind: 'sight', name: 'Google Visitor Center',     lat: 37.4220, lng: -122.0841, icon: '🔵', day: '6/30 점심', detail: '예약 필수 · 무료 · Sunnyvale' },
    { kind: 'sight', name: 'Apple Park Visitor Center', lat: 37.3327, lng: -122.0053, icon: '🍎', day: '6/30 오후', detail: 'Cupertino · 옥상 카페' },
    { kind: 'sight', name: 'Computer History Museum',   lat: 37.4144, lng: -122.0775, icon: '💻', detail: '선택 방문 · Mountain View' },
  ],
}

// ── Plan별 동선 ──
const planA = {
  color: '#7c3aed',
  bg: 'rgba(124, 58, 237, 0.08)',
  name: 'Plan A — 시애틀 R32',
  legs: [
    { city: 'SF',  date: '6/26 금', label: '도착 · Giants 경기',          icon: '✈️', desc: 'OZ212 SFO 도착 · Palace Hotel · Oracle Park' },
    { city: 'YOS', date: '6/27 토', label: '요세미티 1박',                  icon: '⛰️', desc: 'SF→Yosemite 3.5h · Valley 투어' },
    { city: 'SF',  date: '6/28 일', label: '요세미티 → SF 귀환',            icon: '🚙', desc: 'Glacier Point · 하이킹 · SF 귀환' },
    { city: 'SF',  date: '6/29 월', label: '경비행기 · Alcatraz',           icon: '🛩', desc: 'Bay 경비행기(PAO) · Alcatraz · Golden Gate' },
    { city: 'SEA', date: '6/30 화', label: '시애틀 이동',                   icon: '✈️', desc: 'SFO→SEA 국내선 · Pike Place · 경기 준비' },
    { city: 'SEA', date: '7/1 수',  label: '🇰🇷 R32 + LV 야간이동',          icon: '⚽', desc: 'Lumen Field · 경기 후 SEA→LAS', highlight: true },
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
    { city: 'SF',  date: '6/26 금', label: '도착 · Giants 경기',          icon: '✈️', desc: 'OZ212 SFO 도착 · Oracle Park' },
    { city: 'YOS', date: '6/27 토', label: '요세미티 1박',                  icon: '⛰️', desc: 'SF→Yosemite · Valley 투어' },
    { city: 'SF',  date: '6/28 일', label: '요세미티 → SF 귀환',            icon: '🚙', desc: 'Glacier Point · SF 귀환' },
    { city: 'LA',  date: '6/29 월', label: '🇰🇷 LA 당일치기 (경비행기)',     icon: '🛩', desc: 'PAO→HHR 경비행기 · SoFi Match 73 · 당일 SF 복귀', highlight: true },
    { city: 'SV',  date: '6/30 화', label: '실리콘밸리 당일',                icon: '💻', desc: 'Stanford · Google · Apple Park · Caltrain' },
    { city: 'LV',  date: '7/1 수',  label: 'SF → LV 이동',                  icon: '✈️', desc: 'SFO→LAS 국내선 · The Strip 야경' },
    { city: 'LV',  date: '7/2 목',  label: '라스베이거스',                  icon: '🎰', desc: 'Fremont · SpeedVegas · 쇼' },
    { city: 'LV',  date: '7/3 금',  label: '라스베이거스',                  icon: '🎯', desc: '후버댐 · iFly · 마지막 카지노' },
    { city: 'LV',  date: '7/4 토',  label: 'LV → SFO → 귀국',               icon: '🏠', desc: 'LAS→SFO · OZ211 인천行' },
  ],
}

const PLANS = { a: planA, b: planB }
const activePlan = ref('a')
const plan = computed(() => PLANS[activePlan.value])

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
  const sz = k.size
  const ring = p.highlight
    ? `box-shadow: 0 0 0 4px ${k.color}55, 0 0 0 8px ${k.color}22, 0 2px 6px rgba(0,0,0,.4);`
    : `box-shadow: 0 2px 4px rgba(0,0,0,.35);`
  const html = `<div class="poi-pin" style="background:${k.color};width:${sz}px;height:${sz}px;${ring}">
    <span class="poi-emoji" style="font-size:${Math.round(sz*0.55)}px">${p.icon}</span>
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
    m.bindPopup(`<div style="min-width:200px">
      <b>${poi.icon} ${poi.name}</b>
      ${dayLine}
      <div style="font-size:.78rem;margin-top:3px;color:#444">${poi.detail || ''}</div>
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
        <span class="plan-sub">SF → YOS → SF → 🛩 LA(SoFi) → SV → LV → 귀국</span>
      </button>
    </div>

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
