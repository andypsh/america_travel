<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts'

const props = defineProps({
  pred:   { type: Object, required: true },
  data:   { type: Array,  default: () => [] },  // [{ ts, price }]
})

const container = ref(null)
let chart   = null
let series  = null
let ro      = null

// ── 차트 생성 ──────────────────────────────────────────────────────────────
function buildChart() {
  if (!container.value || !props.data.length) return

  // 기존 차트 제거
  if (chart) { chart.remove(); chart = null; series = null }

  const el = container.value
  chart = createChart(el, {
    width:  el.clientWidth,
    height: 220,
    layout: {
      background: { color: '#0d1117' },
      textColor: '#8b949e',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: '#21262d' },
      horzLines: { color: '#21262d' },
    },
    crosshair: { mode: CrosshairMode.Normal },
    rightPriceScale: {
      borderColor: '#30363d',
      scaleMargins: { top: 0.12, bottom: 0.08 },
    },
    timeScale: {
      borderColor: '#30363d',
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (ts) => {
        const d = new Date(ts * 1000)
        return `${d.getMonth()+1}/${d.getDate()}`
      },
    },
    handleScroll: true,
    handleScale: true,
  })

  // ── Area 시리즈 ──
  series = chart.addAreaSeries({
    lineColor: '#58a6ff',
    topColor: 'rgba(88,166,255,0.28)',
    bottomColor: 'rgba(88,166,255,0.02)',
    lineWidth: 2,
    priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    // 오토스케일: 데이터 범위만 기준 (목표가 제외)
    autoscaleInfoProvider: () => {
      const prices = props.data.map(d => d.price)
      const lo = Math.min(...prices)
      const hi = Math.max(...prices)
      const pad = (hi - lo) * 0.08
      return { priceRange: { minValue: lo - pad, maxValue: hi + pad } }
    },
  })

  // 데이터 세팅 (중복 ts 제거, 오름차순 정렬)
  const chartData = [
    ...new Map(
      props.data.map(p => [p.ts, { time: p.ts, value: p.price }])
    ).values()
  ].sort((a, b) => a.time - b.time)

  series.setData(chartData)

  // ── 기준가 점선 (노랑) ──
  const baseP = props.pred.ticker === 'CON3'
    ? props.pred.con3Price
    : props.pred.coinPrice

  if (baseP) {
    series.createPriceLine({
      price: Number(baseP),
      color: '#d2991c',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `등록 $${baseP}`,
    })
  }

  // ── 목표가 점선 (초록) — 현재가 2배 이내일 때만 ──
  const targetP = props.pred.ticker === 'CON3'
    ? (props.pred.targetCon3 || 9.1)
    : (props.pred.targetCoin || 500)
  const latestP = props.data.at(-1)?.price || baseP
  if (targetP && targetP <= latestP * 2.5) {
    series.createPriceLine({
      price: Number(targetP),
      color: '#3fb950',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: `🎯 $${targetP}`,
    })
  }

  // ── 마커 (예측 등록 시점 + 결과 도트) ──
  const entryTs   = Math.floor(new Date(props.pred.createdAt).getTime() / 1000)
  const snapToData = (ts) =>
    chartData.reduce((c, p) => Math.abs(p.time - ts) < Math.abs(c.time - ts) ? p : c)

  const markers = []

  const entrySnap = snapToData(entryTs)
  markers.push({
    time: entrySnap.time,
    position: 'belowBar',
    color: '#c9d1d9',
    shape: 'arrowUp',
    text: '예측',
    size: 1,
  })

  for (const h of props.pred.horizons || []) {
    if (h.resultAt && h.resultPrice) {
      const rTs   = Math.floor(new Date(h.resultAt).getTime() / 1000)
      const snap  = snapToData(rTs)
      markers.push({
        time:     snap.time,
        position: h.status === 'HIT' ? 'aboveBar' : 'belowBar',
        color:    h.status === 'HIT' ? '#3fb950' : '#f85149',
        shape:    'circle',
        text:     `${h.label} ${h.status === 'HIT' ? '✓' : '✗'}`,
        size:     1,
      })
    }
  }

  // 같은 time 마커 중복 제거 (나중 것 우선)
  const markerMap = new Map()
  for (const m of markers) markerMap.set(m.time, m)
  series.setMarkers([...markerMap.values()].sort((a, b) => a.time - b.time))

  chart.timeScale().fitContent()

  // ── Tooltip 오버레이 ──
  setupTooltip(el, chartData)

  // ── 리사이즈 ──
  ro = new ResizeObserver(() => {
    if (chart && el) chart.applyOptions({ width: el.clientWidth })
  })
  ro.observe(el)
}

// ── 커스텀 Tooltip ──────────────────────────────────────────────────────────
function setupTooltip(el, chartData) {
  let tip = el.querySelector('.lwc-tooltip')
  if (!tip) {
    tip = document.createElement('div')
    tip.className = 'lwc-tooltip'
    tip.style.cssText = `
      position:absolute; left:0; top:0; pointer-events:none; display:none;
      background:rgba(22,27,34,.92); border:1px solid #30363d;
      border-radius:6px; padding:5px 9px; font-size:11px;
      color:#c9d1d9; white-space:nowrap; z-index:10;
      font-family:ui-monospace,'SF Mono',Consolas,monospace;
      line-height:1.5;
    `
    el.style.position = 'relative'
    el.appendChild(tip)
  }

  chart.subscribeCrosshairMove(param => {
    if (!param.time || !param.seriesData) { tip.style.display = 'none'; return }
    const val = param.seriesData.get(series)
    if (!val) { tip.style.display = 'none'; return }

    const d = new Date(param.time * 1000)
    const dateStr = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    const priceFmt = val.value.toFixed(2)
    const baseP = props.pred.ticker === 'CON3' ? props.pred.con3Price : props.pred.coinPrice
    const chg = baseP ? (((val.value - baseP) / baseP) * 100).toFixed(1) : null
    const chgStr = chg !== null ? ` <span style="color:${chg>=0?'#3fb950':'#f85149'}">(${chg>=0?'+':''}${chg}%)</span>` : ''

    tip.innerHTML = `<span style="color:#8b949e">${dateStr}</span>　<strong style="color:#58a6ff">$${priceFmt}</strong>${chgStr}`

    const rect = el.getBoundingClientRect()
    const px   = param.point?.x ?? 0
    const py   = param.point?.y ?? 0
    const tipW = 180
    const left = px + tipW > el.clientWidth ? px - tipW - 8 : px + 12
    tip.style.left    = `${left}px`
    tip.style.top     = `${Math.max(4, py - 28)}px`
    tip.style.display = 'block'
  })
}

// ── 생명주기 ──────────────────────────────────────────────────────────────
onMounted(async () => {
  await nextTick()
  if (props.data.length) buildChart()
})

watch(() => props.data, async (d) => {
  if (d.length) { await nextTick(); buildChart() }
}, { deep: true })

onUnmounted(() => {
  if (ro)    { ro.disconnect(); ro = null }
  if (chart) { chart.remove(); chart = null }
})
</script>

<template>
  <div ref="container" class="lwc-wrap"></div>
</template>

<style scoped>
.lwc-wrap {
  width: 100%;
  height: 220px;
  border-radius: 4px;
  overflow: hidden;
  background: #0d1117;
}
</style>
