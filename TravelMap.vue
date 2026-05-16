<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// ── 도시 좌표 사전 ──
const CITIES = {
  SF:  { name: '샌프란시스코',     lat: 37.7749, lng: -122.4194, icon: '🌉', short: 'SF' },
  YOS: { name: '요세미티',          lat: 37.7456, lng: -119.5936, icon: '⛰️', short: 'YOS' },
  SEA: { name: '시애틀',            lat: 47.5952, lng: -122.3316, icon: '⚽', short: 'SEA' },
  LV:  { name: '라스베이거스',      lat: 36.1147, lng: -115.1728, icon: '🎰', short: 'LV' },
  LA:  { name: 'LA · SoFi Stadium', lat: 33.9534, lng: -118.3387, icon: '🇰🇷', short: 'LA' },
  SV:  { name: '실리콘밸리 (Palo Alto)', lat: 37.4275, lng: -122.1697, icon: '💻', short: 'SV' },
}

// ── Plan A: SF(4박) → SEA(1박) → LV(3박) ──
const planA = {
  color: '#7c3aed',
  bg: 'rgba(124, 58, 237, 0.08)',
  name: 'Plan A — 시애틀 R32',
  legs: [
    { city: 'SF',  date: '6/26 금',        label: '도착 · Giants 경기',         icon: '✈️',  desc: 'OZ212 SFO 도착 · Palace Hotel · Giants vs Braves' },
    { city: 'YOS', date: '6/27 토',        label: '요세미티 1박',                icon: '⛰️',  desc: 'SF→Yosemite 드라이브 3.5h · Valley 투어' },
    { city: 'SF',  date: '6/28 일',        label: '요세미티 → SF 귀환',          icon: '🚙',  desc: 'Glacier Point · 하이킹 · SF 귀환' },
    { city: 'SF',  date: '6/29 월',        label: '경비행기 · Alcatraz',         icon: '🛩️',  desc: 'Bay 경비행기 · Alcatraz Island · Golden Gate' },
    { city: 'SEA', date: '6/30 화',        label: '시애틀 이동',                  icon: '✈️',  desc: 'SFO→SEA 국내선 · Pike Place · 경기 준비' },
    { city: 'SEA', date: '7/1 수',         label: '🇰🇷 R32 한국전 + LV 야간이동',  icon: '⚽',  desc: 'Lumen Field Match 82 · 경기 후 SEA→LAS', highlight: true },
    { city: 'LV',  date: '7/2 목',         label: '라스베이거스',                 icon: '🎰',  desc: 'Fremont · Bellagio · 카지노' },
    { city: 'LV',  date: '7/3 금',         label: '라스베이거스',                 icon: '🎯',  desc: 'SpeedVegas · Topgolf · 사격장' },
    { city: 'LV',  date: '7/4 토',         label: 'LV → SFO → 귀국',              icon: '🏠',  desc: 'LAS→SFO 국내선 · OZ211 인천行' },
  ],
}

// ── Plan B: SF(5박, LA 당일치기 경비행기) → LV(3박) ──
const planB = {
  color: '#e11d48',
  bg: 'rgba(225, 29, 72, 0.08)',
  name: 'Plan B — LA 한국전 + 실리콘밸리',
  legs: [
    { city: 'SF',  date: '6/26 금',        label: '도착 · Giants 경기',          icon: '✈️',  desc: 'OZ212 SFO 도착 · Giants vs Braves' },
    { city: 'YOS', date: '6/27 토',        label: '요세미티 1박',                icon: '⛰️',  desc: 'SF→Yosemite 드라이브 · Valley 투어' },
    { city: 'SF',  date: '6/28 일',        label: '요세미티 → SF 귀환',          icon: '🚙',  desc: 'Glacier Point · SF 귀환' },
    { city: 'LA',  date: '6/29 월',        label: '🇰🇷 LA 당일치기 (경비행기)',  icon: '🛩️',  desc: 'PAO→HHR 경비행기 · SoFi Match 73 한국전 · 당일 SF 복귀', highlight: true },
    { city: 'SV',  date: '6/30 화',        label: '실리콘밸리 당일',              icon: '💻',  desc: 'Stanford · Google · Apple Park · Caltrain' },
    { city: 'LV',  date: '7/1 수',         label: 'SF → LV 이동',                 icon: '✈️',  desc: 'SFO→LAS 국내선 · The Strip 야경' },
    { city: 'LV',  date: '7/2 목',         label: '라스베이거스',                 icon: '🎰',  desc: 'Fremont · SpeedVegas · 쇼' },
    { city: 'LV',  date: '7/3 금',         label: '라스베이거스',                 icon: '🎯',  desc: '후버댐 · iFly · 마지막 카지노' },
    { city: 'LV',  date: '7/4 토',         label: 'LV → SFO → 귀국',              icon: '🏠',  desc: 'LAS→SFO · OZ211 인천行' },
  ],
}

const PLANS = { a: planA, b: planB }
const activePlan = ref('a')
const plan = computed(() => PLANS[activePlan.value])

// 도시별 그룹 (중복 도시 합쳐서 마커 한 개)
const cityGroups = computed(() => {
  const map = new Map()
  plan.value.legs.forEach((leg, idx) => {
    const c = CITIES[leg.city]
    if (!map.has(leg.city)) {
      map.set(leg.city, { ...c, key: leg.city, indices: [], visits: 0 })
    }
    const g = map.get(leg.city)
    g.indices.push(idx)
    g.visits = g.indices.length
  })
  return Array.from(map.values())
})

// ── Leaflet ──
const mapEl = ref(null)
let mapInstance = null
let layers = []          // markers + polylines/decorations
const selectedIdx = ref(null)

function clearLayers() {
  layers.forEach(l => mapInstance.removeLayer(l))
  layers = []
}

function buildIcon(num, color, isHighlight) {
  const ring = isHighlight ? `box-shadow: 0 0 0 3px ${color}33, 0 0 0 6px ${color}22;` : ''
  const html = `<div class="day-pin" style="background:${color};${ring}">${num}</div>`
  return L.divIcon({ html, className: 'day-pin-wrap', iconSize: [34, 34], iconAnchor: [17, 17] })
}

function buildCityIcon(label, count, color) {
  const html = `<div class="city-pin" style="background:${color}">
    <span class="city-emoji">${label}</span>
    ${count > 1 ? `<span class="city-count">${count}일</span>` : ''}
  </div>`
  return L.divIcon({ html, className: 'city-pin-wrap', iconSize: [56, 30], iconAnchor: [28, 15] })
}

function draw() {
  if (!mapInstance) return
  clearLayers()
  const p = plan.value

  // 도시별 큰 마커
  cityGroups.value.forEach(g => {
    const m = L.marker([g.lat, g.lng], { icon: buildCityIcon(g.icon, g.visits, p.color) }).addTo(mapInstance)
    m.bindPopup(`<b>${g.icon} ${g.name}</b><br>${g.visits}일 체류<br><small>Day ${g.indices.map(i=>i+1).join(', ')}</small>`)
    layers.push(m)
  })

  // 폴리라인 — 일자 순 동선 (도시 코드 같으면 같은 좌표라서 자기 자신으로 안 그려짐)
  const coords = []
  p.legs.forEach((leg, i) => {
    const c = CITIES[leg.city]
    coords.push([c.lat, c.lng])
  })
  // 연속 중복 좌표 제거 (SF→SF 같은 경우 라인 안 그림)
  const cleaned = coords.filter((co, i) => i === 0 || co[0] !== coords[i-1][0] || co[1] !== coords[i-1][1])
  const poly = L.polyline(cleaned, {
    color: p.color, weight: 3, opacity: 0.75, dashArray: '8, 10', lineCap: 'round',
  }).addTo(mapInstance)
  layers.push(poly)

  // 자동 줌
  mapInstance.fitBounds(poly.getBounds().pad(0.2))
}

function focusLeg(idx) {
  selectedIdx.value = idx
  const leg = plan.value.legs[idx]
  const c = CITIES[leg.city]
  mapInstance.flyTo([c.lat, c.lng], 7, { duration: 0.7 })
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
</script>

<template>
  <div class="map-page">
    <!-- 플랜 토글 -->
    <div class="plan-toggle">
      <button class="plan-btn plan-a" :class="{ active: activePlan === 'a' }" @click="activePlan = 'a'">
        🏟️ Plan A — 시애틀 R32 + LV
        <span class="plan-sub">SF → YOS → SF → SEA → LV → 귀국</span>
      </button>
      <button class="plan-btn plan-b" :class="{ active: activePlan === 'b' }" @click="activePlan = 'b'">
        🇰🇷 Plan B — LA 한국전 + LV
        <span class="plan-sub">SF → YOS → SF → 🛩 LA(당일) → SV → LV → 귀국</span>
      </button>
    </div>

    <!-- 도시 요약 칩 -->
    <div class="city-chips">
      <span class="chip-label">도시</span>
      <span
        v-for="g in cityGroups" :key="g.key"
        class="city-chip"
        :style="{ '--c': plan.color, background: plan.bg, borderColor: plan.color + '55', color: plan.color }"
      >
        <span class="chip-icon">{{ g.icon }}</span>
        <span class="chip-name">{{ g.name }}</span>
        <span class="chip-days">{{ g.visits }}일</span>
      </span>
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
/* ── Leaflet 핀 (전역 — divIcon HTML이 scoped 밖) ── */
.day-pin-wrap, .city-pin-wrap { background: transparent !important; border: 0 !important; }
.day-pin {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: .9rem;
  border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4);
}
.city-pin {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 18px;
  color: #fff; font-weight: 700; font-size: .78rem;
  border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.45);
  white-space: nowrap;
}
.city-emoji { font-size: 1rem; }
.city-count { font-size: .68rem; opacity: .9; }
.leaflet-popup-content { font-size: .85rem; line-height: 1.5; }
.leaflet-popup-content b { color: #111; }
</style>

<style scoped>
.map-page { display: flex; flex-direction: column; gap: 1rem; }

/* 플랜 토글 */
.plan-toggle {
  display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
}
.plan-btn {
  display: flex; flex-direction: column; align-items: flex-start; gap: .25rem;
  padding: .9rem 1.1rem; border-radius: var(--radius-lg);
  background: var(--bg-elevated); border: 1px solid var(--border);
  font-size: .95rem; font-weight: 700; text-align: left;
  cursor: pointer; transition: var(--transition);
}
.plan-btn:hover { border-color: var(--accent); }
.plan-btn.plan-a.active { background: rgba(124, 58, 237, 0.12); border-color: #7c3aed; color: #c4b5fd; }
.plan-btn.plan-b.active { background: rgba(225, 29, 72, 0.12); border-color: #e11d48; color: #fca5a5; }
.plan-sub { font-size: .72rem; font-weight: 500; color: var(--text-muted); }

/* 도시 칩 */
.city-chips {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  padding: .5rem .75rem; background: var(--bg-elevated);
  border: 1px solid var(--border); border-radius: var(--radius-lg);
}
.chip-label { font-size: .7rem; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-right: .25rem; }
.city-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 16px;
  border: 1px solid; font-size: .78rem; font-weight: 600;
}
.chip-icon { font-size: .9rem; }
.chip-days { opacity: .75; font-size: .7rem; }

/* 지도 + 사이드 */
.map-layout {
  display: grid; grid-template-columns: 1fr 360px;
  gap: 1rem; min-height: 580px;
}
.map-container {
  height: 640px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
  background: var(--bg-elevated);
}

/* 일자 리스트 */
.legs-panel {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius-lg); display: flex; flex-direction: column;
  max-height: 640px; overflow: hidden;
}
.legs-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1rem; border-bottom: 1px solid var(--border-muted);
}
.legs-title { font-size: .85rem; font-weight: 700; }
.legs-count { font-size: .72rem; color: var(--text-dim); }
.legs-list {
  list-style: none; padding: 0; margin: 0;
  overflow-y: auto;
}
.leg-item {
  display: flex; gap: .8rem;
  padding: .65rem .9rem;
  border-bottom: 1px solid var(--border-muted);
  cursor: pointer;
  transition: var(--transition);
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
.leg-city-short {
  font-size: .62rem; font-weight: 700; color: var(--text-dim);
  letter-spacing: .04em;
}
.leg-main { flex: 1; min-width: 0; }
.leg-top { display: flex; align-items: center; gap: .5rem; margin-bottom: 2px; }
.leg-date { font-size: .72rem; color: var(--text-dim); font-weight: 600; }
.leg-icon { font-size: .9rem; }
.leg-label { font-size: .85rem; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.leg-desc { font-size: .72rem; color: var(--text-muted); line-height: 1.5; }

/* Responsive */
@media (max-width: 900px) {
  .plan-toggle { grid-template-columns: 1fr; }
  .map-layout { grid-template-columns: 1fr; }
  .map-container { height: 420px; }
  .legs-panel { max-height: none; }
}
</style>
