<script setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import PriceChartLW from './PriceChartLW.vue'

const TICKERS = [
  { id: 'COIN', label: 'Coinbase (COIN)', color: '#0052ff' },
  { id: 'CON3', label: 'ㅇㅇㅇ 3x (CON3)', color: '#ff6b00' },
]
const HORIZONS = [
  { value: '1H',  label: '1시간',        ms: 3600000 },
  { value: '4H',  label: '4시간',        ms: 14400000 },
  { value: '1D',  label: '1일',          ms: 86400000 },
  { value: '3D',  label: '3일',          ms: 259200000 },
  { value: '1W',  label: '1주',          ms: 604800000 },
  { value: '2W',  label: '2주',          ms: 1209600000 },
  { value: '1M',  label: '1달',          ms: 2592000000 },
  { value: 'NOV', label: '11월 중간선거', date: '2026-11-03' },
  { value: 'DEC', label: '12월',         date: '2026-12-31' },
]

/* ── 저장소: 서버 파일 (data/predictions.json) + localStorage 이중 백업 ── */
const STORE_KEY = 'prediction_tracker_v2'

// localStorage 백업 (오프라인 폴백)
function _lsLoad() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] } }
function _lsSave(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch {} }

const predictions     = ref(_lsLoad())   // 초기값: localStorage (서버 로드 전 임시)
const serverSyncState = ref('idle')      // 'idle' | 'loading' | 'saving' | 'error'

// 서버에서 로드
async function serverLoad() {
  serverSyncState.value = 'loading'
  try {
    const r = await fetch('/api/predictions')
    if (!r.ok) throw new Error()
    const d = await r.json()
    const serverList = d.predictions || []
    if (serverList.length > 0) {
      // 서버 데이터 우선 — localStorage 동기화
      predictions.value = serverList
      _lsSave(serverList)
    } else {
      // 서버 비어있으면 localStorage → 서버로 마이그레이션
      const local = _lsLoad()
      if (local.length > 0) {
        predictions.value = local
        await serverSave(local)
      }
    }
    serverSyncState.value = 'idle'
  } catch {
    serverSyncState.value = 'error'
    // 서버 실패 시 localStorage 유지
  }
}

// 서버에 저장 (디바운스 100ms)
let _saveTimer = null
async function serverSave(list) {
  _lsSave(list)   // localStorage 즉시 백업
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    serverSyncState.value = 'saving'
    try {
      await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: list }),
      })
      serverSyncState.value = 'idle'
    } catch {
      serverSyncState.value = 'error'
    }
  }, 100)
}

// 기존 save() 대체
function save(list) { serverSave(list) }

/* ── Step form state ── */
const step = ref(1)   // 1=변수입력, 2=Gemini질문, 3=답변붙여넣기

/* ── Market state display ── */
const marketInfo = reactive({
  state:            '',    // PRE | REGULAR | POST | CLOSED
  regularPrice:     null,
  regularChangePct: null,
  extPrice:         null,  // 프리/애프터 가격
  extChangePct:     null,
  extSession:       '',    // PRE_MKT | POST_MKT (갭 시간에 마지막 연장세션)
  stooqPrice:       null,  // Stooq 백업
  isRealTime:       null,
  source:           '',
  // 야간 ATS (토스/삼성 야간 거래)
  overnight:        null,  // {bid, ask, lastNonReg, updatedAt}
  con3Price:        null,
  con3State:        '',
  con3Change:       null,
})

/* ── Auto-fetch market data ── */
const fetching = ref(false)
const fetchError = ref('')

async function autoFill() {
  fetching.value = true; fetchError.value = ''
  try {
    const r = await fetch('/api/market-data')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const d = await r.json()

    // ── COIN 가격 — 프리/애프터 + 야간 ATS 반영 ──
    const coin = d.coin
    if (coin) {
      const state = coin.marketState ?? 'REGULAR'
      marketInfo.state            = state
      marketInfo.regularPrice     = coin.price
      marketInfo.regularChangePct = coin.regularChangePct ?? null
      marketInfo.isRealTime       = coin.isRealTime
      marketInfo.extSession       = coin.extendedSession ?? ''
      marketInfo.overnight        = coin.overnight ?? null

      // 가격 우선순위: 프리/애프터 진행중 > 야간 ATS > 갭시간대 마지막 연장세션 > 정규 종가
      if (state === 'PRE' && coin.preMarketPrice) {
        vars.coinPrice          = coin.preMarketPrice
        marketInfo.extPrice     = coin.preMarketPrice
        marketInfo.extChangePct = coin.preMarketChangePct ?? null
      } else if ((state === 'POST' || state === 'POSTPOST') && coin.postMarketPrice) {
        vars.coinPrice          = coin.postMarketPrice
        marketInfo.extPrice     = coin.postMarketPrice
        marketInfo.extChangePct = coin.postMarketChangePct ?? null
      } else if (state === 'CLOSED' && coin.overnight?.lastNonReg) {
        // 갭 시간대 → 토스/삼성 야간 거래와 동일한 last_non_reg 사용
        vars.coinPrice          = coin.overnight.lastNonReg
        marketInfo.extPrice     = coin.overnight.lastNonReg
        marketInfo.extChangePct = coin.prevClose
          ? ((coin.overnight.lastNonReg - coin.prevClose) / coin.prevClose * 100)
          : null
      } else if (state === 'CLOSED' && coin.extendedLast) {
        vars.coinPrice          = coin.extendedLast
        marketInfo.extPrice     = coin.extendedLast
        marketInfo.extChangePct = coin.extendedChangePct ?? null
      } else {
        if (coin.price) vars.coinPrice = coin.price
        marketInfo.extPrice     = null
        marketInfo.extChangePct = null
      }
    }
    // ── CON3 (CON3.L LSE 실시간) ──
    if (d.con3?.price) {
      vars.con3Price        = d.con3.price
      marketInfo.con3Price  = d.con3.price
      marketInfo.con3State  = d.con3.marketState ?? ''
      marketInfo.con3Change = d.con3.changePct   ?? null
    }
    // ── Stooq 백업 가격 ──
    if (d.coin?.stooqPrice) marketInfo.stooqPrice = d.coin.stooqPrice
    // ── 소스 표시 ──
    marketInfo.source = d.coin?.source ?? ''
    if (d.btc?.price)    vars.btcPrice    = d.btc.price
    if (coin?.rsi)       vars.rsi         = coin.rsi
    if (d.fear_greed)    vars.fearGreed   = d.fear_greed.value
    if (d.coin_52w)      vars.highLow     = `고점 $${d.coin_52w.high} / 저점 $${d.coin_52w.low}`
    // 거시 지표
    if (d.eth?.rsi)      vars.ethRsi      = d.eth.rsi
    if (d.spx?.price)    vars.spxPrice    = d.spx.price
    if (d.spx?.rsi)      vars.spxRsi      = d.spx.rsi
    if (d.dxy?.price)    vars.dxyPrice    = d.dxy.price
    if (d.dxy?.rsi)      vars.dxyRsi      = d.dxy.rsi
    if (d.vix?.price)    vars.vix         = d.vix.price
    if (d.eth_btc_ratio != null)  vars.ethBtcRatio  = d.eth_btc_ratio
    if (d.btc_change_24h != null) vars.btcChange24h = d.btc_change_24h
    // posNote 에 실시간 가격 반영 (프리장 시 프리장 가격으로)
    const coinP   = vars.coinPrice || '?'
    const con3P   = d.con3?.price  ?? '?'
    const con3Pct = d.con3?.price  ? ((d.con3.price - 1.30) / 1.30 * 100).toFixed(1) : '?'
    const coinPct = vars.coinPrice ? ((Number(vars.coinPrice) - 260) / 260 * 100).toFixed(1) : '?'
    const mLabel  = marketInfo.state === 'PRE' ? '[프리장]' : marketInfo.state === 'POST' ? '[애프터]' : ''
    vars.posNote  = `ㅇㅇㅇ 평단 $1.30 / CON3 현재가 $${con3P} (${con3Pct}%) / COIN 평단 ~$260 / COIN ${mLabel}현재가 $${coinP} (${coinPct}%) / 투자금 9,400만원`
  } catch (e) {
    fetchError.value = '시세 불러오기 실패: ' + e.message
  } finally {
    fetching.value = false
  }
}

const vars = reactive({
  ticker:    'COIN',
  coinPrice: '',
  con3Price: '',
  // 목표가
  targetCoin: 500,     // COIN 목표가 ($)
  targetCon3: 9.1,     // CON3 목표가 ($)
  // 기술 지표
  btcPrice:  '',
  rsi:       '',
  fearGreed: '',
  volume:    '',
  highLow:   '',
  // 거시 지표 (자동 수집)
  ethRsi:        '',
  spxPrice:      '',
  spxRsi:        '',
  dxyPrice:      '',
  dxyRsi:        '',
  vix:           '',
  ethBtcRatio:   '',
  btcChange24h:  '',
  posNote:   'ㅇㅇㅇ 평단 $1.30 / 투자금 9,400만원 / COIN 환산 평단 ~$260 / 현재가 $0.65 (-50% 손실 중)',
  extraNote: '',
})

// ── 추가 지표 체크리스트 (클릭으로 선택, 값 입력) ──
const EXTRA_PRESETS = [
  { key: '자금조달비율 (Funding Rate)',  hint: '예: +0.02%',        url: 'https://www.coinglass.com/FundingRate' },
  { key: 'MVRV Z-Score',               hint: '예: 1.8',            url: 'https://www.lookintobitcoin.com/charts/mvrv-zscore/' },
  { key: '온체인 활성주소 24H',           hint: '예: 증가/감소',     url: 'https://glassnode.com/metrics/addresses/active_count' },
  { key: '미결제약정 (Open Interest)',   hint: '예: $18B, 증가 중',  url: 'https://www.coinglass.com/pro/futures/OpenInterest' },
  { key: '거래소 BTC 잔고',             hint: '예: 감소 추세',       url: 'https://www.coinglass.com/bitcoin-exchange-reserve' },
  { key: 'Long/Short 비율',            hint: '예: 1.2 (롱 우세)',   url: 'https://www.coinglass.com/LongShortRatio' },
  { key: '스테이블코인 공급 변화',        hint: '예: +$2B (매수 대기)', url: 'https://defillama.com/stablecoins' },
  { key: '고래 순매수/매도',             hint: '예: 순매수 $500M',   url: 'https://www.coinglass.com/WhaleMonitor' },
  { key: '해시레이트',                  hint: '예: 사상 최고치',     url: 'https://www.blockchain.com/explorer/charts/hash-rate' },
  { key: 'NUPL (미실현 손익)',           hint: '예: 0.45 (낙관)',    url: 'https://www.lookintobitcoin.com/charts/relative-unrealized-profit--loss/' },
  { key: '거래량 프로파일',             hint: '예: VAH $210, VAL $185', url: null },
  { key: '기타 뉴스/이슈',              hint: '자유 입력',           url: null },
]
// 선택된 프리셋 인덱스 + 값: { idx, value, fetching }
const selectedExtras = ref([])

function isPresetSelected(idx) { return selectedExtras.value.some(e => e.idx === idx) }
function getPresetEntry(idx)   { return selectedExtras.value.find(e => e.idx === idx) }

// 자동 수집 가능한 항목 인덱스
const AUTO_FETCHABLE = new Set([0, 3, 5])  // 자금조달비율, OI, L/S

// 단일 항목 브라우저 사이드 fetch (서버 우회, Binance CORS: *)
async function fetchOnePreset(idx) {
  const entry = getPresetEntry(idx)
  if (!entry || entry.fetching) return
  entry.fetching = true
  try {
    const d = await _browserFetchDerivatives()
    if (idx === 0 && d.funding_rate != null)  entry.value = `${d.funding_rate > 0 ? '+' : ''}${d.funding_rate}%`
    if (idx === 3 && d.open_interest)         entry.value = d.open_interest
    if (idx === 5 && d.long_short_ratio)      entry.value = d.long_short_ratio
  } catch { /* silent */ }
  finally { entry.fetching = false }
}

function togglePreset(idx) {
  const i = selectedExtras.value.findIndex(e => e.idx === idx)
  if (i >= 0) {
    selectedExtras.value.splice(i, 1)
  } else {
    selectedExtras.value.push({ idx, value: '', fetching: false })
    // 자동 수집 가능한 항목은 추가 즉시 fetch 시도
    if (AUTO_FETCHABLE.has(idx)) fetchOnePreset(idx)
  }
}

// 선택된 ticker 의 현재가 (예측 기준가)
const basePrice = computed(() => vars.ticker === 'CON3' ? vars.con3Price : vars.coinPrice)

/* ── Prompt builder ── */
function buildPrompt() {
  const t   = TICKERS.find(t => t.id === vars.ticker)
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })

  const tc   = vars.targetCoin || 500
  const tc3  = vars.targetCon3 || 9.1
  const cp   = vars.coinPrice  || '?'
  const c3p  = vars.con3Price  || '?'
  const coinUpPct  = vars.coinPrice  ? ((tc  - Number(vars.coinPrice))  / Number(vars.coinPrice)  * 100).toFixed(0) : '?'
  const con3UpPct  = vars.con3Price  ? ((tc3 - Number(vars.con3Price))  / Number(vars.con3Price)  * 100).toFixed(0) : '?'

  // 기간별 예측 템플릿 — "목표가 도달 확률" 기준
  const horizonTemplate = [
    `【기간별 최종 판단】`,
    `※ "상승 확률" = 해당 기간 내 COIN $${tc} / CON3 $${tc3} 도달 또는 의미있는 상승 확률`,
    `※ "하락 확률" = 도달 실패 또는 하락 확률  /  합계 반드시 100%`,
    ``,
    `1시간: 상승 확률 XX% / 하락 확률 XX%`,
    `4시간: 상승 확률 XX% / 하락 확률 XX%`,
    `1일: 상승 확률 XX% / 하락 확률 XX%`,
    `3일: 상승 확률 XX% / 하락 확률 XX%`,
    `1주: 상승 확률 XX% / 하락 확률 XX%`,
    `2주: 상승 확률 XX% / 하락 확률 XX%`,
    `1달: 상승 확률 XX% / 하락 확률 XX%`,
    `11월 중간선거: 상승 확률 XX% / 하락 확률 XX%`,
    `12월: 상승 확률 XX% / 하락 확률 XX%`,
  ].join('\n')

  const lines = []

  // ① 맨 위 경고 + 템플릿
  lines.push(`⚠️ [필수] 분석 후 응답 마지막에 아래 블록을 그대로 복사해 XX를 숫자로 채워 포함하세요.`)
  lines.push(`이 블록이 없으면 불완전한 응답으로 처리됩니다.`)
  lines.push(``)
  lines.push(horizonTemplate)
  lines.push(``)
  lines.push(`════════════════════════════════════`)
  lines.push(``)

  // ② 포지션 & 목표가
  lines.push(`[${t.label} 예측 분석 — ${now} KST]`)
  lines.push(``)
  lines.push(`━━ 나의 포지션 & 목표가 ━━`)
  lines.push(`• CON3(3x 레버리지): 평단 $1.30 / 현재 $${c3p} / 투자금 9,400만원`)
  lines.push(`• COIN: 현재 $${cp} / 평단 ~$260`)
  lines.push(`• 🎯 목표가: COIN $${tc} (+${coinUpPct}%) = CON3 $${tc3} (+${con3UpPct}%)`)
  lines.push(`  → 각 기간 내 이 목표가에 가까워질 확률을 판단 기준으로 삼아주세요.`)
  if (vars.posNote) lines.push(`• 메모: ${vars.posNote}`)

  // ③ 지표
  lines.push(``)
  lines.push(`━━ 기술 지표 ━━`)
  if (vars.btcPrice)    lines.push(`• BTC: $${vars.btcPrice}  COIN RSI: ${vars.rsi || '?'}  공포탐욕: ${vars.fearGreed || '?'}/100`)
  if (vars.highLow)     lines.push(`• COIN 52주: ${vars.highLow}`)
  if (vars.volume)      lines.push(`• 거래량: ${vars.volume}`)

  lines.push(``)
  lines.push(`━━ 거시 지표 ━━`)
  if (vars.spxPrice)    lines.push(`• S&P500: $${vars.spxPrice}  RSI ${vars.spxRsi || '?'}${vars.spxRsi > 70 ? ' ⚠과매수' : ''}`)
  if (vars.dxyPrice)    lines.push(`• DXY: ${vars.dxyPrice}  RSI ${vars.dxyRsi || '?'}${vars.dxyRsi > 60 ? ' (달러강세→암호화폐↓)' : vars.dxyRsi < 40 ? ' (달러약세→암호화폐↑)' : ''}`)
  if (vars.vix)         lines.push(`• VIX: ${vars.vix}${vars.vix >= 30 ? ' ⚠고공포' : vars.vix >= 20 ? ' 경계' : ' 안정'}`)
  if (vars.ethRsi)      lines.push(`• ETH RSI: ${vars.ethRsi}  ETH/BTC: ${vars.ethBtcRatio || '?'}${vars.ethBtcRatio < 0.04 ? ' (BTC강세)' : ''}`)
  if (vars.btcChange24h) lines.push(`• BTC 24H: ${vars.btcChange24h > 0 ? '+' : ''}${vars.btcChange24h}%`)

  if (vars.extraNote) {
    lines.push(``)
    lines.push(`━━ 오늘의 주요 뉴스/이슈 ━━`)
    lines.push(vars.extraNote)
  }

  // 선택된 추가 지표
  const activeExtras = selectedExtras.value.filter(e => EXTRA_PRESETS[e.idx])
  if (activeExtras.length) {
    lines.push(``)
    lines.push(`━━ 추가 제공 데이터 ━━`)
    activeExtras.forEach(e => {
      const preset = EXTRA_PRESETS[e.idx]
      lines.push(`• ${preset.key}: ${e.value.trim() || '(값 미입력)'}`)
    })
  }

  // ④ 분석 요청
  lines.push(``)
  lines.push(`━━ 분석 요청 ━━`)
  lines.push(`1. ${t.label} 주요 가격 드라이버 TOP 3`)
  lines.push(`2. 단기(1H~1D) / 중기(3D~2W) / 장기(1M~12월) 시나리오 핵심 근거`)
  lines.push(`3. COIN $${tc} 도달을 위한 핵심 조건과 예상 타임라인`)
  lines.push(`4. 가장 큰 리스크 요인 1가지`)
  lines.push(`5. CON3 $${tc3} 달성 가능성 평가`)

  // ⑤ 하단 템플릿 재강조
  lines.push(``)
  lines.push(`════════════════════════════════════`)
  lines.push(`⚠️ 분석 완료 후 아래를 반드시 응답 마지막에 포함:`)
  lines.push(``)
  lines.push(horizonTemplate)

  return lines.join('\n')
}

const promptText = computed(() => buildPrompt())

/* ── Copy prompt ── */
const copiedPrompt = ref(false)
async function copyPrompt() {
  const text = promptText.value
  try { await navigator.clipboard.writeText(text) } catch {
    const ta = document.createElement('textarea')
    ta.value = text; document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); document.body.removeChild(ta)
  }
  copiedPrompt.value = true
  setTimeout(() => { copiedPrompt.value = false }, 2000)
}

/* ── Gemini response parser ── */
const geminiRaw = ref('')
const parsed = reactive({ horizons: [], ok: false, summary: '' })

function parseGemini(text) {
  if (!text || text.length < 10) {
    parsed.horizons = []; parsed.ok = false; parsed.summary = ''; return
  }

  // 【기간별 최종 판단】 블록을 우선 탐색, 없으면 전문 탐색
  const blockMatch = text.match(/【기간별\s*최종\s*판단】([\s\S]{20,600})/)
  const searchText = blockMatch ? blockMatch[1] : text

  // 한 줄에서 확률 숫자 두 개를 뽑는 헬퍼
  // 지원 형식: "상승 확률 55% / 하락 확률 45%"  "상승: 55% 하락: 45%"  "55% / 45%"
  function extractProbs(line) {
    // 형식 A: 상승 확률 NN% / 하락 확률 NN%
    let m = line.match(/상승\s*[확률:：]*\s*(\d{1,3})\s*%[^%]*하락\s*[확률:：]*\s*(\d{1,3})\s*%/i)
    if (m) return { up: parseInt(m[1]), down: parseInt(m[2]) }
    // 형식 B: 하락 확률 NN% / 상승 확률 NN% (역순)
    m = line.match(/하락\s*[확률:：]*\s*(\d{1,3})\s*%[^%]*상승\s*[확률:：]*\s*(\d{1,3})\s*%/i)
    if (m) return { up: parseInt(m[2]), down: parseInt(m[1]) }
    // 형식 C: 숫자 두 개만 (NN% / NN%)
    m = line.match(/(\d{1,3})\s*%\s*[\/|]\s*(\d{1,3})\s*%/)
    if (m) { const a = parseInt(m[1]), b = parseInt(m[2]); return a + b === 100 ? { up: a, down: b } : null }
    return null
  }

  const results = []
  for (const hDef of HORIZONS) {
    const escaped = hDef.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // 해당 레이블을 포함한 줄(들) 찾기 — 레이블과 확률이 같은 줄이거나 다음 줄에 있을 수 있음
    const lineRe = new RegExp(`(${escaped}[^\\n]{0,80})`, 'gi')
    let found = null
    for (const lm of searchText.matchAll(lineRe)) {
      found = extractProbs(lm[1])
      if (found) break
    }
    // 못 찾으면 레이블 위치 뒤 2줄도 시도
    if (!found) {
      const idx = searchText.search(new RegExp(escaped, 'i'))
      if (idx >= 0) {
        const snippet = searchText.slice(idx, idx + 120)
        found = extractProbs(snippet)
      }
    }
    if (found && found.up >= 0 && found.up <= 100) {
      const { up, down } = found
      const direction  = up >= down ? 'UP' : 'DOWN'
      const maxProb    = Math.max(up, down)
      const confidence = maxProb >= 80 ? 5 : maxProb >= 70 ? 4 : maxProb >= 60 ? 3 : maxProb >= 55 ? 2 : 1
      results.push({ value: hDef.value, label: hDef.label, upProb: up, downProb: down, direction, confidence })
    }
  }

  const sentences = text.split(/[.\n]/).map(s => s.trim()).filter(s => s.length > 15)
  const keyLines  = sentences.filter(s => /상승|하락|확률|결론|판단|전망|리스크/i.test(s)).slice(0, 3)
  parsed.horizons = results
  parsed.ok       = results.length >= 3
  parsed.summary  = keyLines.join(' / ').slice(0, 200)
}

/* ── verifyDir: use 1W direction (or first parsed horizon) ── */
const verifyDir = computed(() => {
  const h1w = parsed.horizons.find(h => h.value === '1W')
  return h1w?.direction ?? parsed.horizons[0]?.direction ?? 'UP'
})

/* ── Cross-validation (환각 방지) ── */
const verify = reactive({ loading: false, checks: [], riskLevel: null, marketData: null })

async function runVerification() {
  if (!parsed.ok) return
  verify.loading = true; verify.checks = []; verify.riskLevel = null
  try {
    const r = await fetch('/api/market-data')
    if (!r.ok) throw new Error()
    const d = await r.json()
    verify.marketData = d
    const dir = verifyDir.value   // 'UP' | 'DOWN'
    const checks = []

    // ① RSI 체크
    if (d.coin?.rsi != null) {
      const rsi = d.coin.rsi
      if (rsi > 72) {
        checks.push({ icon: dir === 'UP' ? '🔴' : '🟢', label: `RSI ${rsi} — 과매수 구간`,
          detail: dir === 'UP' ? 'Gemini 상승 예측에 역행. 단기 조정 가능' : '하락 예측 지지', risk: dir === 'UP' ? 1 : -1 })
      } else if (rsi < 28) {
        checks.push({ icon: dir === 'DOWN' ? '🔴' : '🟢', label: `RSI ${rsi} — 과매도 구간`,
          detail: dir === 'DOWN' ? 'Gemini 하락 예측에 역행. 반등 가능성' : '상승 예측 지지', risk: dir === 'DOWN' ? 1 : -1 })
      } else {
        checks.push({ icon: '🟡', label: `RSI ${rsi} — 중립 구간 (${rsi < 50 ? '약세 편향' : '강세 편향'})`,
          detail: '방향성 불명확. Gemini 판단 의존', risk: 0 })
      }
    }

    // ② BTC RSI
    if (d.btc?.rsi != null) {
      const brsi = d.btc.rsi
      if (brsi > 72 && dir === 'UP') {
        checks.push({ icon: '🔴', label: `BTC RSI ${brsi} — 과매수`,
          detail: 'BTC 단기 조정 시 COIN 동반 하락 위험', risk: 1 })
      } else if (brsi < 28 && dir === 'DOWN') {
        checks.push({ icon: '🔴', label: `BTC RSI ${brsi} — 과매도`,
          detail: 'BTC 반등 시 COIN 동반 상승 가능', risk: 1 })
      } else {
        checks.push({ icon: '🟢', label: `BTC RSI ${brsi} — 예측 방향과 일치`,
          detail: 'BTC 모멘텀이 예측 방향 지지', risk: -1 })
      }
    }

    // ③ 공포탐욕지수
    if (d.fear_greed != null) {
      const fg = d.fear_greed.value
      const lbl = d.fear_greed.label
      if (fg <= 25) {
        checks.push({ icon: dir === 'UP' ? '🟢' : '🔴', label: `공포탐욕지수 ${fg} — 극단적 공포 (${lbl})`,
          detail: dir === 'UP' ? '극단적 공포 = 역발상 매수 구간. 상승 예측 지지' : '저점 반등 가능성. 하락 예측에 역행', risk: dir === 'DOWN' ? 1 : -1 })
      } else if (fg >= 75) {
        checks.push({ icon: dir === 'DOWN' ? '🟢' : '🔴', label: `공포탐욕지수 ${fg} — 극단적 탐욕 (${lbl})`,
          detail: dir === 'DOWN' ? '고점 신호. 하락 예측 지지' : '과열 신호. 상승 예측 주의', risk: dir === 'UP' ? 1 : -1 })
      } else {
        checks.push({ icon: '🟡', label: `공포탐욕지수 ${fg} — ${lbl}`,
          detail: '중립 구간. 강한 방향성 없음', risk: 0 })
      }
    }

    // ④ 52주 위치
    if (d.coin_52w && d.coin?.price) {
      const price = d.coin.price
      const { high, low } = d.coin_52w
      const pos = Math.round((price - low) / (high - low) * 100)
      if (pos >= 85) {
        checks.push({ icon: dir === 'UP' ? '🔴' : '🟢', label: `52주 고점 부근 (${pos}% 위치 / 고점 $${high})`,
          detail: dir === 'UP' ? '강한 저항대 근처. 돌파 시 급등 or 되돌림' : '고점 부근 하락 예측 타당', risk: dir === 'UP' ? 1 : -1 })
      } else if (pos <= 20) {
        checks.push({ icon: dir === 'DOWN' ? '🔴' : '🟢', label: `52주 저점 부근 (${pos}% 위치 / 저점 $${low})`,
          detail: dir === 'DOWN' ? '지지선 테스트 구간. 반등 가능성' : '저점 부근 상승 예측 타당', risk: dir === 'DOWN' ? 1 : -1 })
      } else {
        checks.push({ icon: '🟡', label: `52주 중간 위치 (${pos}% / $${low}~$${high})`,
          detail: '뚜렷한 기술적 신호 없음', risk: 0 })
      }
    }

    // ⑤ S&P500 RSI — 리스크온/오프
    if (d.spx?.rsi != null) {
      const srsi = d.spx.rsi
      if (srsi > 72 && dir === 'UP') {
        checks.push({ icon: '🟡', label: `S&P500 RSI ${srsi} — 미증시 과매수`,
          detail: '미증시 단기 조정 가능 → 암호화폐 동반 하락 주의', risk: 1 })
      } else if (srsi < 35 && dir === 'UP') {
        checks.push({ icon: '🔴', label: `S&P500 RSI ${srsi} — 미증시 과매도·리스크오프`,
          detail: '위험자산 회피 국면. 상승 예측에 역행', risk: 2 })
      } else if (srsi >= 45 && srsi <= 65) {
        checks.push({ icon: '🟢', label: `S&P500 RSI ${srsi} — 미증시 안정`,
          detail: '리스크온 환경. 암호화폐 우호적', risk: -1 })
      } else {
        checks.push({ icon: '🟡', label: `S&P500 RSI ${srsi}`, detail: '중립 구간', risk: 0 })
      }
    }

    // ⑥ DXY RSI — 달러 강도 (역상관)
    if (d.dxy?.rsi != null) {
      const drsi = d.dxy.rsi
      if (drsi > 62) {
        checks.push({ icon: dir === 'UP' ? '🔴' : '🟢', label: `달러지수(DXY) RSI ${drsi} — 달러 강세`,
          detail: dir === 'UP' ? '달러강세 = 암호화폐 하락 압력. 상승 예측에 역행' : '달러강세 = 하락 예측 지지', risk: dir === 'UP' ? 2 : -1 })
      } else if (drsi < 38) {
        checks.push({ icon: dir === 'DOWN' ? '🔴' : '🟢', label: `달러지수(DXY) RSI ${drsi} — 달러 약세`,
          detail: dir === 'DOWN' ? '달러약세 = 암호화폐 상승 호재. 하락 예측에 역행' : '달러약세 = 상승 예측 지지', risk: dir === 'DOWN' ? 2 : -1 })
      } else {
        checks.push({ icon: '🟡', label: `달러지수(DXY) RSI ${drsi} — 중립`, detail: '달러 방향성 불명확', risk: 0 })
      }
    }

    // ⑦ VIX — 시장 공포 레벨
    if (d.vix?.price != null) {
      const vix = d.vix.price
      if (vix >= 30) {
        checks.push({ icon: dir === 'UP' ? '🔴' : '🟢', label: `VIX ${vix} — 고공포 구간 (≥30)`,
          detail: dir === 'UP' ? '극도의 불확실성. 위험자산 매도 압력 강함' : '패닉셀 구간. 역발상 반등 vs 추가 하락 공존', risk: dir === 'UP' ? 2 : 0 })
      } else if (vix >= 20) {
        checks.push({ icon: '🟡', label: `VIX ${vix} — 경계 구간 (20~30)`,
          detail: '변동성 확대 국면. 방향성 주의', risk: 1 })
      } else {
        checks.push({ icon: dir === 'UP' ? '🟢' : '🟡', label: `VIX ${vix} — 안정 (<20)`,
          detail: dir === 'UP' ? '낮은 공포 = 리스크온. 상승 예측 우호적' : 'VIX 안정에도 하락 예측은 주의', risk: dir === 'DOWN' ? 1 : -1 })
      }
    }

    // ⑧ ETH RSI — 알트 섹터 동조
    if (d.eth?.rsi != null) {
      const ersi = d.eth.rsi
      if (ersi > 70 && dir === 'UP') {
        checks.push({ icon: '🟡', label: `ETH RSI ${ersi} — 알트 섹터 과매수`,
          detail: 'ETH 과매수 = 알트 전반 단기 조정 가능. COIN 동반 위험', risk: 1 })
      } else if (ersi < 30 && dir === 'DOWN') {
        checks.push({ icon: '🟡', label: `ETH RSI ${ersi} — 알트 섹터 과매도`,
          detail: 'ETH 반등 시 COIN 동반 가능. 하락 예측 약화 가능성', risk: 1 })
      } else {
        const align = (dir === 'UP' && ersi > 50) || (dir === 'DOWN' && ersi < 50)
        checks.push({ icon: align ? '🟢' : '🟡', label: `ETH RSI ${ersi} — 알트 섹터 ${ersi > 50 ? '강세' : '약세'} 편향`,
          detail: align ? '알트 모멘텀이 예측 방향과 일치' : 'ETH 방향과 예측 방향 소폭 불일치', risk: align ? -1 : 0 })
      }
    }

    // ⑨ ETH/BTC 비율 — 알트시즌 강도
    if (d.eth_btc_ratio != null) {
      const ratio = d.eth_btc_ratio
      if (ratio > 0.065 && dir === 'UP') {
        checks.push({ icon: '🟢', label: `ETH/BTC ${ratio} — 알트시즌 구간`,
          detail: '알트코인으로 자금 유입. COIN 상승 예측 지지', risk: -1 })
      } else if (ratio < 0.04 && dir === 'UP') {
        checks.push({ icon: '🔴', label: `ETH/BTC ${ratio} — BTC 강세·알트 약세`,
          detail: '시장 자금이 BTC에 집중. COIN 상대 약세 우려', risk: 2 })
      } else if (ratio < 0.04 && dir === 'DOWN') {
        checks.push({ icon: '🟢', label: `ETH/BTC ${ratio} — BTC 강세 국면`,
          detail: '알트 약세 = 하락 예측 지지', risk: -1 })
      } else {
        checks.push({ icon: '🟡', label: `ETH/BTC ${ratio} — 중립`,
          detail: '알트/BTC 방향성 불명확', risk: 0 })
      }
    }

    // ⑩ Gemini 확률 자체 신뢰도 (1W 기준)
    const h1w = parsed.horizons.find(h => h.value === '1W') ?? parsed.horizons[0]
    if (h1w) {
      const maxP = Math.max(h1w.upProb, h1w.downProb)
      if (maxP >= 75) {
        checks.push({ icon: '🟡', label: `Gemini 확신도 ${maxP}% (1주) — 높은 확신`,
          detail: '확신이 높을수록 환각 가능성도 높아짐. 위 지표 교차 확인 필수', risk: 0 })
      } else {
        checks.push({ icon: '🟢', label: `Gemini 확신도 ${maxP}% (1주) — 적정 수준`,
          detail: '과도한 확신 없음. 비교적 신뢰 가능', risk: -1 })
      }
    }

    const totalRisk = checks.reduce((s, c) => s + c.risk, 0)
    verify.riskLevel = totalRisk >= 4 ? 'high' : totalRisk >= 2 ? 'mid' : 'low'
    verify.checks = checks
  } catch { /* silent */ }
  finally { verify.loading = false }
}

/* ── Gemini 응답에서 추가 지표 자동 감지 + fetch ── */

// 프리셋 인덱스 → 감지 키워드 매핑
const PRESET_KEYWORDS = [
  { idx: 0,  kws: ['funding rate', '자금조달비율', 'funding', '펀딩비'] },
  { idx: 1,  kws: ['mvrv'] },
  { idx: 2,  kws: ['온체인', '활성주소', 'active address', 'active addresses'] },
  { idx: 3,  kws: ['미결제약정', 'open interest', 'oi', 'openinterest'] },
  { idx: 4,  kws: ['거래소 btc 잔고', 'exchange balance', 'btc 잔고', 'exchange btc'] },
  { idx: 5,  kws: ['long/short', 'long short', '롱숏', '롱/숏', 'ls 비율'] },
  { idx: 6,  kws: ['스테이블코인', 'stablecoin', 'usdt 공급', 'usdc 공급'] },
  { idx: 7,  kws: ['고래', 'whale', '대형 매수', '대형 매도'] },
  { idx: 8,  kws: ['해시레이트', 'hashrate', 'hash rate'] },
  { idx: 9,  kws: ['nupl', '미실현 손익'] },
  { idx: 10, kws: ['거래량 프로파일', 'volume profile', 'vah', 'val', 'poc'] },
]

const extraAutoStatus = ref('')   // '' | 'loading' | '✓ N개 감지, M개 자동 수집'
const extraAutoDetected = ref([]) // 이번 응답에서 감지된 { idx, label, fetched } 목록
const showExtraModal = ref(false)

function goToStep1FromModal() {
  showExtraModal.value = false
  step.value = 1
}

// timeout helper — AbortSignal.timeout 미지원 브라우저 대응
function _fetchWithTimeout(url, ms = 6000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { signal: ctrl.signal })
    .then(r => { clearTimeout(tid); return r.ok ? r.json() : null })
    .catch(() => { clearTimeout(tid); return null })
}

// 브라우저에서 직접 Binance fapi 호출 (CORS: Access-Control-Allow-Origin: *)
async function _browserFetchDerivatives() {
  const [fRaw, oiRaw, lsRaw, btcRaw] = await Promise.all([
    _fetchWithTimeout('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT'),
    _fetchWithTimeout('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT'),
    _fetchWithTimeout('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=1h&limit=1'),
    _fetchWithTimeout('/api/market-data', 8000),
  ])

  let funding_rate = null, open_interest = null, long_short_ratio = null

  if (fRaw?.lastFundingRate != null) {
    funding_rate = +(parseFloat(fRaw.lastFundingRate) * 100).toFixed(4)
  }
  if (oiRaw?.openInterest != null) {
    const oiBtc = parseFloat(oiRaw.openInterest)
    const btcP  = btcRaw?.btc?.price
    open_interest = btcP ? `$${(oiBtc * btcP / 1e9).toFixed(1)}B` : `${oiBtc.toLocaleString()} BTC`
  }
  if (Array.isArray(lsRaw) && lsRaw[0]) {
    const d = lsRaw[0]
    const ratio = parseFloat(d.longShortRatio).toFixed(2)
    const lp    = (parseFloat(d.longAccount)  * 100).toFixed(1)
    const sp    = (parseFloat(d.shortAccount) * 100).toFixed(1)
    long_short_ratio = `${ratio} (롱 ${lp}% / 숏 ${sp}%)`
  }

  // Bybit fallback if Binance failed
  if (!funding_rate || !open_interest || !long_short_ratio) {
    const [byFund, byOI, byLS] = await Promise.all([
      !funding_rate     ? _fetchWithTimeout('https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT', 5000) : Promise.resolve(null),
      !open_interest    ? _fetchWithTimeout('https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=1h&limit=1', 5000) : Promise.resolve(null),
      !long_short_ratio ? _fetchWithTimeout('https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=1h&limit=1', 5000) : Promise.resolve(null),
    ])
    if (byFund?.result?.list?.[0]?.fundingRate != null && !funding_rate) {
      funding_rate = +(parseFloat(byFund.result.list[0].fundingRate) * 100).toFixed(4)
    }
    if (byOI?.result?.list?.[0]?.openInterest != null && !open_interest) {
      const oi = parseFloat(byOI.result.list[0].openInterest)
      const btcP = btcRaw?.btc?.price
      open_interest = btcP ? `$${(oi * btcP / 1e9).toFixed(1)}B` : `${oi.toLocaleString()} BTC`
    }
    if (byLS?.result?.list?.[0] && !long_short_ratio) {
      const d  = byLS.result.list[0]
      const lp = (parseFloat(d.buyRatio)  * 100).toFixed(1)
      const sp = (parseFloat(d.sellRatio) * 100).toFixed(1)
      const rt = sp > 0 ? (lp / sp).toFixed(2) : null
      if (rt) long_short_ratio = `${rt} (롱 ${lp}% / 숏 ${sp}%)`
    }
  }

  return { funding_rate, open_interest, long_short_ratio }
}

async function detectAndFetchExtras(text) {
  if (!text || text.length < 20) return
  const lower = text.toLowerCase()

  // 1. 텍스트에서 언급된 프리셋 찾기
  const detected = PRESET_KEYWORDS.filter(p => p.kws.some(kw => lower.includes(kw)))
  if (!detected.length) return

  // 2. 아직 선택 안 된 것만 auto-select (fetching: false 포함)
  for (const p of detected) {
    if (!isPresetSelected(p.idx)) {
      selectedExtras.value.push({ idx: p.idx, value: '', fetching: false })
    }
  }

  extraAutoStatus.value = 'loading'
  extraAutoDetected.value = detected.map(p => ({ idx: p.idx, label: EXTRA_PRESETS[p.idx].key, fetched: false, value: '' }))

  // 3. 브라우저 직접 fetch (Binance CORS: *) → 서버 fallback
  let d = { funding_rate: null, open_interest: null, long_short_ratio: null }
  try {
    d = await _browserFetchDerivatives()
  } catch {
    try {
      const r = await fetch('/api/derivatives')
      if (r.ok) d = await r.json()
    } catch { /* silent */ }
  }

  const fill = (idx, val) => {
    if (!val) return
    const entry = getPresetEntry(idx)
    if (entry && !entry.value) entry.value = val
    const info = extraAutoDetected.value.find(x => x.idx === idx)
    if (info) { info.fetched = true; info.value = val }
  }
  fill(0, d.funding_rate != null ? `${d.funding_rate > 0 ? '+' : ''}${d.funding_rate}%` : null)
  fill(3, d.open_interest)
  fill(5, d.long_short_ratio)

  const fetchedCount = extraAutoDetected.value.filter(x => x.fetched).length
  extraAutoStatus.value = `✓ ${detected.length}개 감지 · ${fetchedCount}개 자동 수집`

  showExtraModal.value = true
}

watch(() => parsed.ok, (ok) => { if (ok) runVerification() })
watch(geminiRaw, (v) => { parseGemini(v); detectAndFetchExtras(v) })

/* ── Add prediction ── */
const addedFlash = ref(false)
function addPrediction() {
  if (!basePrice.value || !parsed.ok || parsed.horizons.length === 0) return
  const now = new Date().toISOString()
  const varsSnapshot = {
    coinPrice: vars.coinPrice,
    con3Price: vars.con3Price,
    btcPrice:  vars.btcPrice,
    rsi:       vars.rsi,
    fearGreed: vars.fearGreed,
    volume:    vars.volume,
    highLow:   vars.highLow,
  }
  predictions.value.unshift({
    id:          now + '_' + Math.random().toString(36).slice(2, 6),
    ticker:      vars.ticker,
    createdAt:   now,
    coinPrice:   Number(vars.coinPrice),
    con3Price:   Number(vars.con3Price),
    targetCoin:  Number(vars.targetCoin) || 500,
    targetCon3:  Number(vars.targetCon3) || 9.1,
    posNote:     vars.posNote,
    extraNote:   vars.extraNote,
    extraItems:  selectedExtras.value
      .filter(e => EXTRA_PRESETS[e.idx])
      .map(e => ({ key: EXTRA_PRESETS[e.idx].key, value: e.value })),
    varsSnapshot,
    geminiSummary: parsed.summary,
    horizons:    parsed.horizons.map(h => ({
      ...h,
      status:      'PENDING',
      resultPrice: null,
      resultAt:    null,
    })),
  })
  save(predictions.value)
  // 새 카드 즉시 펼침 + 차트 로드
  const newPred = predictions.value[0]
  expandedCards[newPred.id] = true
  fetchChartData(newPred)
  // reset step 2~3
  geminiRaw.value = ''
  parsed.horizons = []; parsed.ok = false; parsed.summary = ''
  selectedExtras.value = []
  step.value = 1
  addedFlash.value = true
  setTimeout(() => { addedFlash.value = false }, 1800)
}

/* ── Horizon maturity helpers ── */
function maturityOf(pred, horizonValue) {
  const h = HORIZONS.find(h => h.value === horizonValue)
  if (h?.date) return new Date(h.date + 'T23:59:59+09:00').getTime()
  return new Date(pred.createdAt).getTime() + (h?.ms ?? 604800000)
}
function isMatureH(pred, horizonValue) { return Date.now() >= maturityOf(pred, horizonValue) }
function daysLeftH(pred, horizonValue) {
  const ms = maturityOf(pred, horizonValue) - Date.now()
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000)
  if (h < 24) return `${h}h`
  const d = Math.ceil(h / 24)
  const hObj = HORIZONS.find(h => h.value === horizonValue)
  if (hObj?.date) return `D-${d}`
  return `${d}일`
}

/* ── Result verification per horizon ── */
const resultInputs   = reactive({})   // manual fallback
const resultFetching = reactive({})   // loading state

function _applyResult(pred, horizonSlot, price) {
  const baseP = pred.ticker === 'CON3' ? pred.con3Price : pred.coinPrice
  horizonSlot.resultPrice = price
  horizonSlot.resultAt    = new Date().toISOString()
  horizonSlot.status      = (horizonSlot.direction === 'UP' ? price > baseP : price < baseP) ? 'HIT' : 'MISS'
  save(predictions.value)
}

// 원클릭: 현재 시세 자동 fetch → 즉시 저장
async function autoSubmitResult(pred, horizonSlot) {
  const key = `${pred.id}_${horizonSlot.value}`
  resultFetching[key] = true
  try {
    const r = await fetch('/api/market-data')
    if (!r.ok) throw new Error()
    const d = await r.json()
    let price = null
    if (pred.ticker === 'COIN' && d.coin?.price)  price = d.coin.price
    if (pred.ticker === 'CON3' && d.con3?.price)  price = d.con3.price
    if (price) {
      _applyResult(pred, horizonSlot, price)
    } else {
      resultInputs[key] = ''   // 자동 실패 → 수동 입력으로 폴백
    }
  } catch {
    resultInputs[key] = ''     // 폴백
  } finally {
    delete resultFetching[key]
  }
}

// 수동 폴백용 (자동 fetch 실패 시)
function submitManualResult(pred, horizonSlot) {
  const key = `${pred.id}_${horizonSlot.value}`
  const rp = Number(resultInputs[key])
  if (!rp) return
  _applyResult(pred, horizonSlot, rp)
  delete resultInputs[key]
}
function cancelManualResult(key) { delete resultInputs[key] }

/* ── 만기 도달 자동 저장 (5분마다 백그라운드 체크) ── */
const autoChecking = ref(false)

async function checkAndAutoSaveMature() {
  if (autoChecking.value) return
  const pendingPreds = predictions.value.filter(p =>
    (p.horizons || []).some(h => h.status === 'PENDING' && isMatureH(p, h.value))
  )
  if (!pendingPreds.length) return

  autoChecking.value = true
  try {
    const r = await fetch('/api/market-data')
    if (!r.ok) return
    const d = await r.json()
    const prices = { COIN: d.coin?.price, CON3: d.con3?.price }

    for (const pred of pendingPreds) {
      const price = prices[pred.ticker]
      if (!price) continue
      for (const h of (pred.horizons || [])) {
        if (h.status !== 'PENDING' || !isMatureH(pred, h.value)) continue
        _applyResult(pred, h, price)
      }
    }
  } catch { /* silent */ }
  finally { autoChecking.value = false }
}

let _autoTimer = null
onMounted(async () => {
  // 1. 서버에서 예측 데이터 로드 (localStorage → 서버 마이그레이션 포함)
  await serverLoad()

  // 2. 만기 자동 저장
  checkAndAutoSaveMature()
  _autoTimer = setInterval(checkAndAutoSaveMature, 5 * 60 * 1000)

  // 3. 모든 카드 기본 펼침 + 차트 데이터 선제 로드
  for (const pred of predictions.value) {
    expandedCards[pred.id] = true
    delete chartCache[pred.id]
    fetchChartData(pred)
  }
})
onUnmounted(() => { if (_autoTimer) clearInterval(_autoTimer) })

function deletePred(id) {
  predictions.value = predictions.value.filter(p => p.id !== id)
  save(predictions.value)
}

/* ── Stats ── */
const stats = computed(() => {
  const allWithTicker = predictions.value.flatMap(p =>
    (p.horizons || []).map(h => ({ ...h, ticker: p.ticker }))
  )
  const settled  = allWithTicker.filter(h => h.status !== 'PENDING')
  const total    = settled.length
  const hits     = settled.filter(h => h.status === 'HIT').length
  const byTicker = TICKERS.map(t => {
    const s = settled.filter(h => h.ticker === t.id)
    const ht = s.filter(h => h.status === 'HIT').length
    return { ...t, total: s.length, hits: ht, rate: s.length ? Math.round(ht / s.length * 100) : null }
  })
  const byConf = [1,2,3,4,5].map(c => {
    const s = settled.filter(h => h.confidence === c)
    const ht = s.filter(h => h.status === 'HIT').length
    return { c, total: s.length, hits: ht, rate: s.length ? Math.round(ht / s.length * 100) : null }
  })
  return { total, hits, rate: total ? Math.round(hits / total * 100) : null, byTicker, byConf }
})

// Pending: predictions with at least one PENDING horizon
const pending = computed(() =>
  predictions.value.filter(p => (p.horizons || []).some(h => h.status === 'PENDING'))
)
// Settled: predictions where all horizons are non-PENDING
const settled = computed(() =>
  predictions.value.filter(p => {
    const hs = p.horizons || []
    return hs.length > 0 && hs.every(h => h.status !== 'PENDING')
  })
)

/* ── Helpers ── */
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function tickerColor(id)   { return TICKERS.find(t => t.id === id)?.color ?? '#58a6ff' }
function pct(a, b) {
  if (!a || !b) return ''
  const v = ((b - a) / a * 100).toFixed(1)
  return (v > 0 ? '+' : '') + v + '%'
}
const expandedMemo = ref(null)
function toggleMemo(id) { expandedMemo.value = expandedMemo.value === id ? null : id }

const expandedCards = reactive({})
function toggleCard(id) { expandedCards[id] = !expandedCards[id] }

const varsCount = computed(() =>
  ['btcPrice','rsi','fearGreed','volume','highLow',
   'ethRsi','spxPrice','dxyPrice','vix','ethBtcRatio','btcChange24h','posNote','extraNote']
    .filter(k => vars[k]).length
)

function confStars(n) { return '★'.repeat(n) }

/* ── Insight panel ── */
function computeInsight(pred) {
  const hs = pred.horizons || []
  const avg = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x.upProb, 0) / arr.length) : null
  const short = hs.filter(x => ['1H','4H','1D'].includes(x.value))
  const mid   = hs.filter(x => ['3D','1W','2W'].includes(x.value))
  const long  = hs.filter(x => ['1M','NOV','DEC'].includes(x.value))
  const avgS = avg(short), avgM = avg(mid), avgL = avg(long)
  const allAvg = avg(hs)
  const bestLong = long.slice().sort((a, b) => b.upProb - a.upProb)[0]
  const signal = allAvg === null ? null : allAvg >= 65 ? 'bull' : allAvg <= 35 ? 'bear' : 'neutral'

  // ── 지표 추가 제안 ──
  const extraKeys = (pred.extraItems || []).map(e => (e.key || '').toLowerCase())
  const has = (...kws) => kws.some(kw => extraKeys.some(k => k.includes(kw)))
  const suggestions = []

  // 단기 관련
  if (!has('funding', '자금조달')) {
    suggestions.push({
      label: '자금조달비율 (Funding Rate)',
      reason: '단기 과열/냉각 신호 — 단기 예측 정확도 직결. 극단적 양수=롱 청산 위험, 음수=쇼트 스퀴즈 가능',
    })
  }
  if (!has('long/short', 'ls비율', 'l/s')) {
    suggestions.push({
      label: 'Long/Short 비율',
      reason: '롱/숏 편향 파악 → 역발상 포인트·강제 청산 레벨 예측에 활용',
    })
  }
  // 중기 관련
  if (!has('미결제', 'open interest', 'oi')) {
    suggestions.push({
      label: '미결제약정 (Open Interest)',
      reason: 'OI 급증 후 가격 급등/락 = 레버리지 청산 체크포인트 — 중기 변곡점 포착',
    })
  }
  // 장기 관련
  if (!has('mvrv') && avgL !== null) {
    suggestions.push({
      label: 'MVRV Z-Score',
      reason: `장기(${avgL}%) 예측 보강 — MVRV 2 이상이면 고점권, 0 이하면 저점 매수 근거 강화`,
    })
  }
  if (!has('온체인', '활성주소') && avgL !== null && avgL > 50) {
    suggestions.push({
      label: '온체인 활성주소 24H',
      reason: '장기 상승 확률 높음 — 실제 네트워크 사용 증가 확인 시 추세 신뢰도 ↑',
    })
  }
  // 단기-중기 괴리
  if (avgS !== null && avgM !== null && Math.abs(avgS - avgM) > 20) {
    suggestions.push({
      label: '거래량 프로파일 (VAH/VAL)',
      reason: `단기 ${avgS}% ↔ 중기 ${avgM}% 괴리 큼 — 주요 가격대별 거래량 지지/저항 확인 권장`,
    })
  }
  // 스테이블 유동성
  if (!has('스테이블', 'usdt', 'usdc') && signal === 'bull') {
    suggestions.push({
      label: '스테이블코인 공급 변화',
      reason: '상승 예측 지지 — 스테이블 공급 증가 = 매수 대기자금 유입 확인 가능',
    })
  }

  return { short: avgS, mid: avgM, long: avgL, all: allAvg, bestLong, signal, suggestions: suggestions.slice(0, 4) }
}

/* ── Price history chart ── */
const chartCache = reactive({})   // { [pred.id]: { loading, data: [{ts, price}] } }

async function fetchChartData(pred) {
  if (chartCache[pred.id]) return   // already loaded or loading
  chartCache[pred.id] = { loading: true, data: [] }
  try {
    const r = await fetch(`/api/price-history?ticker=${pred.ticker}`)
    if (!r.ok) throw new Error()
    const d = await r.json()
    chartCache[pred.id] = { loading: false, data: d.data || [] }
  } catch {
    chartCache[pred.id] = { loading: false, data: [] }
  }
}

function sparklineSvg(pred) {
  const cache = chartCache[pred.id]
  if (!cache || cache.loading || !cache.data.length) return null

  const W = 620, H = 110
  const baseP   = pred.ticker === 'CON3' ? pred.con3Price : pred.coinPrice
  const targetP = pred.ticker === 'CON3' ? (pred.targetCon3 || 9.1) : (pred.targetCoin || 500)

  const entryTs = Math.floor(new Date(pred.createdAt).getTime() / 1000)
  const nowTs   = Math.floor(Date.now() / 1000)

  // x 범위: 차트 데이터 전체 (60일) vs 오늘 중 더 넓은 쪽
  const dataStart = cache.data[0].ts
  const dataEnd   = Math.max(cache.data.at(-1).ts, nowTs)
  const xSpan     = Math.max(dataEnd - dataStart, 1)

  // y 범위: 가격 데이터 + 기준가 + 목표가 + 결과가 모두 포함
  const prices   = cache.data.map(p => p.price)
  const resultPs = (pred.horizons || []).filter(h => h.resultPrice).map(h => h.resultPrice)
  const allP     = [...prices, baseP, ...resultPs].filter(Boolean)
  if (!allP.length) return null

  // 목표가가 극단적으로 높으면 y축에서 제외 (현재가의 3배 이상)
  const latestPrice = prices.at(-1) || baseP
  const showTarget  = targetP <= latestPrice * 4
  if (showTarget) allP.push(targetP)

  const minP = Math.min(...allP) * 0.97
  const maxP = Math.max(...allP) * 1.03

  const xOf = ts    => ((ts - dataStart) / xSpan) * W
  const yOf = price => H - ((price - minP) / (maxP - minP)) * H

  // Price line
  const linePts = cache.data.map(p => `${xOf(p.ts).toFixed(1)},${yOf(p.price).toFixed(1)}`)
  const path = `M ${linePts.join(' L ')}`

  // Fill area
  const firstX = xOf(cache.data[0].ts).toFixed(1)
  const lastX  = xOf(cache.data.at(-1).ts).toFixed(1)
  const fillPath = `${path} L ${lastX},${H} L ${firstX},${H} Z`

  // 기준가 점선
  const entryY  = yOf(baseP).toFixed(1)
  // 목표가 점선
  const targetY = showTarget ? yOf(targetP).toFixed(1) : null
  // 예측 등록 시점 수직선
  const entryX  = xOf(entryTs).toFixed(1)
  // 오늘 x
  const todayX  = xOf(nowTs).toFixed(1)
  const todayY  = yOf(latestPrice).toFixed(1)

  // 결과 도트 (HIT=초록, MISS=빨강)
  const dots = (pred.horizons || [])
    .filter(h => h.resultAt && h.resultPrice)
    .map(h => {
      const ts = Math.floor(new Date(h.resultAt).getTime() / 1000)
      return {
        cx:    xOf(ts).toFixed(1),
        cy:    yOf(h.resultPrice).toFixed(1),
        color: h.status === 'HIT' ? '#3fb950' : '#f85149',
        label: `${h.label} $${h.resultPrice}`,
      }
    })

  // 만기 마커 (아직 PENDING 중인 horizon)
  const maturityMarkers = (pred.horizons || [])
    .filter(h => h.status === 'PENDING')
    .map(h => {
      const mTs = Math.floor(maturityOf(pred, h.value) / 1000)
      const mx  = xOf(mTs)
      if (mx < 0 || mx > W + 40) return null
      return { x: mx.toFixed(1), label: h.label }
    })
    .filter(Boolean)

  return {
    path, fillPath,
    entryY, entryX,
    targetY, targetP: targetP.toFixed(2),
    dots, maturityMarkers,
    todayX, todayY,
    W, H,
    baseP,
    minP: minP.toFixed(2), maxP: maxP.toFixed(2),
    latestP: latestPrice.toFixed(2),
    pctChange: (((latestPrice - baseP) / baseP) * 100).toFixed(1),
    showTarget,
  }
}

watch(expandedCards, (val) => {
  for (const [id, open] of Object.entries(val)) {
    if (open && !chartCache[id]) {
      const pred = predictions.value.find(p => p.id === id)
      if (pred) fetchChartData(pred)
    }
  }
}, { deep: true })
</script>

<template>
  <div class="pt-root">

    <!-- ─── 추가 지표 자동 감지 모달 ─── -->
    <teleport to="body">
      <div v-if="showExtraModal" class="modal-overlay" @click.self="showExtraModal = false">
        <div class="modal-box">
          <div class="modal-header">
            <span class="modal-title">🤖 Gemini 추가 데이터 자동 감지</span>
            <button class="modal-close" @click="showExtraModal = false">✕</button>
          </div>

          <div class="modal-body">
            <p class="modal-desc">
              Gemini 응답에서 언급된 지표를 감지하고, 수집 가능한 항목은 자동으로 가져왔습니다.<br>
              <strong>Step 1로 돌아가서 값을 확인 후 프롬프트를 다시 전송하세요.</strong>
            </p>

            <div class="modal-items">
              <div v-for="item in extraAutoDetected" :key="item.idx" class="modal-item">
                <span class="modal-badge" :class="item.fetched ? 'fetched' : 'manual'">
                  {{ item.fetched ? '✓ 자동' : '✎ 수동' }}
                </span>
                <span class="modal-label">{{ item.label }}</span>
                <span v-if="item.fetched" class="modal-value">{{ item.value }}</span>
                <template v-else>
                  <a v-if="item.idx === 0" class="modal-link" href="https://www.binance.com/en/futures/funding-history/0" target="_blank" rel="noopener">Binance ↗</a>
                  <a v-else-if="item.idx === 3" class="modal-link" href="https://www.coinglass.com/pro/futures/OpenInterest" target="_blank" rel="noopener">CoinGlass ↗</a>
                  <a v-else-if="item.idx === 5" class="modal-link" href="https://www.coinglass.com/LongShortRatio" target="_blank" rel="noopener">CoinGlass ↗</a>
                  <a v-else-if="item.idx === 1" class="modal-link" href="https://www.lookintobitcoin.com/charts/mvrv-zscore/" target="_blank" rel="noopener">LookIntoBitcoin ↗</a>
                  <a v-else-if="item.idx === 2" class="modal-link" href="https://glassnode.com/metrics/addresses/active_count" target="_blank" rel="noopener">Glassnode ↗</a>
                  <span v-else class="modal-empty">Step 1에서 직접 입력</span>
                </template>
              </div>
            </div>
          </div>

          <div class="modal-foot">
            <button class="primary modal-go-btn" @click="goToStep1FromModal">
              ← Step 1로 이동해서 확인하기
            </button>
            <button class="ghost" @click="showExtraModal = false">나중에</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- ─── Stats bar ─── -->
    <section class="card stats-bar">
      <!-- 서버 동기 상태 -->
      <div class="sync-badge" :class="serverSyncState">
        <span v-if="serverSyncState === 'loading'">⏳ 서버에서 불러오는 중…</span>
        <span v-else-if="serverSyncState === 'saving'">💾 저장 중…</span>
        <span v-else-if="serverSyncState === 'error'">⚠ 서버 저장 실패 (localStorage 백업됨)</span>
        <span v-else class="sync-ok">☁ ML-1 서버 저장됨</span>
      </div>
      <div class="stat-block overall">
        <span class="stat-label">전체 적중률</span>
        <span class="stat-val" :class="{ hit: stats.rate >= 60, miss: stats.rate !== null && stats.rate < 40 }">
          {{ stats.rate !== null ? stats.rate + '%' : '—' }}
        </span>
        <span class="stat-sub">{{ stats.hits }}/{{ stats.total }}건</span>
      </div>
      <div class="stat-divider"></div>
      <div v-for="t in stats.byTicker" :key="t.id" class="stat-block">
        <span class="stat-label" :style="{ color: t.color }">{{ t.id }}</span>
        <span class="stat-val" :class="{ hit: t.rate >= 60, miss: t.rate !== null && t.rate < 40 }">
          {{ t.rate !== null ? t.rate + '%' : '—' }}
        </span>
        <span class="stat-sub">{{ t.hits }}/{{ t.total }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-block conf-block">
        <span class="stat-label">신뢰도별 적중률</span>
        <div class="conf-bars">
          <div v-for="b in stats.byConf" :key="b.c" class="conf-bar-row">
            <span class="conf-stars">{{ '★'.repeat(b.c) }}</span>
            <div class="conf-bar-bg">
              <div class="conf-bar-fill"
                :style="{ width: (b.rate ?? 0) + '%',
                  background: b.rate >= 60 ? 'var(--green)' : b.rate !== null && b.rate < 40 ? 'var(--red)' : 'var(--accent)' }">
              </div>
            </div>
            <span class="conf-pct">{{ b.rate !== null ? b.rate + '%' : '—' }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── 3-step flow ─── -->
    <section class="card flow-card">

      <!-- Step tabs -->
      <div class="step-tabs">
        <button v-for="n in 3" :key="n"
          :class="['step-tab', { active: step === n, done: step > n }]"
          @click="step = n">
          <span class="step-num">{{ step > n ? '✓' : n }}</span>
          <span class="step-label">{{
            n === 1 ? '변수 입력' :
            n === 2 ? 'Gemini 질문' :
                      '답변 붙여넣기'
          }}</span>
        </button>
      </div>

      <!-- ── Step 1: 변수 입력 ── -->
      <div v-show="step === 1" class="step-body">

        <!-- Auto-fill bar -->
        <div class="autofill-bar">
          <button :class="['autofill-btn', { loading: fetching }]" :disabled="fetching" @click="autoFill">
            {{ fetching ? '⏳ 시세 불러오는 중...' : '⚡ 시세 자동 입력 (COIN·CON3·BTC·RSI·공탐지수)' }}
          </button>
          <span class="autofill-note">CON3 가격 포함 자동 수집 (investing.com)</span>
          <span v-if="fetchError" class="autofill-err">{{ fetchError }}</span>
        </div>

        <div class="vars-grid">

          <div class="var-group required-group">
            <p class="var-section-title">필수</p>
            <div class="var-row">
              <div class="fg">
                <label>종목</label>
                <div class="ticker-btns">
                  <button v-for="t in TICKERS" :key="t.id"
                    :class="['ticker-btn', { active: vars.ticker === t.id }]"
                    :style="{ '--tc': t.color }"
                    @click="vars.ticker = t.id">{{ t.id }}</button>
                </div>
              </div>
              <div class="fg">
                <label>COIN 현재가 ($)
                  <span v-if="marketInfo.state === 'PRE'"  class="mkt-badge mkt-pre">🌙 프리장 진행중</span>
                  <span v-else-if="marketInfo.state === 'POST' || marketInfo.state === 'POSTPOST'" class="mkt-badge mkt-post">🌆 애프터 진행중</span>
                  <span v-else-if="marketInfo.state === 'REGULAR'" class="mkt-badge mkt-regular">🟢 정규장</span>
                  <span v-else-if="marketInfo.state === 'CLOSED'"  class="mkt-badge mkt-closed">⬛ 야간 (ATS 거래중)</span>
                  <span v-if="marketInfo.source" class="src-tag">📡 {{ marketInfo.source }}</span>
                </label>
                <input type="number" v-model="vars.coinPrice" placeholder="예: 210" step="0.01"
                  :class="{ 'price-active': vars.ticker === 'COIN' }" />
                <!-- 프리/애프터 vs 정규장 가격 비교 -->
                <div v-if="marketInfo.extPrice && marketInfo.regularPrice" class="mkt-detail">
                  <span class="mkt-ext-price">${{ marketInfo.extPrice }}
                    <span v-if="marketInfo.extChangePct != null" :class="marketInfo.extChangePct >= 0 ? 'up-c' : 'dn-c'">
                      {{ marketInfo.extChangePct >= 0 ? '+' : '' }}{{ marketInfo.extChangePct?.toFixed(2) }}%
                    </span>
                  </span>
                  <span class="mkt-sep">|</span>
                  <span class="mkt-reg-price">정규 ${{ marketInfo.regularPrice }}</span>
                </div>
                <!-- 야간 ATS bid/ask (토스·삼성 야간거래 데이터) -->
                <div v-if="marketInfo.overnight && (marketInfo.overnight.bid || marketInfo.overnight.ask)" class="ats-row">
                  <span class="ats-label">🌃 야간 호가</span>
                  <span class="ats-bid">Bid <strong>${{ marketInfo.overnight.bid }}</strong><span class="ats-size">×{{ marketInfo.overnight.bidSize }}</span></span>
                  <span class="ats-sep">/</span>
                  <span class="ats-ask">Ask <strong>${{ marketInfo.overnight.ask }}</strong><span class="ats-size">×{{ marketInfo.overnight.askSize }}</span></span>
                  <span v-if="marketInfo.overnight.lastNonReg" class="ats-last">
                    마지막 ${{ marketInfo.overnight.lastNonReg }}
                  </span>
                </div>
              </div>
              <div class="fg">
                <label>CON3 현재가 ($)
                  <span v-if="marketInfo.con3State === 'REGULAR'" class="mkt-badge mkt-regular">🇬🇧 LSE 실시간</span>
                  <span v-else-if="marketInfo.con3State === 'CLOSED'" class="mkt-badge mkt-closed">🇬🇧 LSE 마감</span>
                  <span v-else-if="marketInfo.con3State" class="mkt-badge mkt-regular">🇬🇧 LSE</span>
                  <span v-else class="mkt-badge mkt-closed" style="opacity:.6">🇬🇧 LSE</span>
                </label>
                <input type="number" v-model="vars.con3Price" placeholder="예: 0.62" step="0.001"
                  :class="{ 'price-active': vars.ticker === 'CON3' }" />
                <div v-if="marketInfo.con3Change != null" class="mkt-detail">
                  <span :class="marketInfo.con3Change >= 0 ? 'up-c' : 'dn-c'">
                    {{ marketInfo.con3Change >= 0 ? '+' : '' }}{{ marketInfo.con3Change?.toFixed(2) }}%
                  </span>
                  <span class="mkt-sep">|</span>
                  <span class="mkt-reg-price">CON3.L (LSE)</span>
                </div>
              </div>
              <div class="fg">
                <label>🎯 COIN 목표가 ($)</label>
                <input type="number" v-model="vars.targetCoin" placeholder="예: 500" step="1" class="target-input" />
                <span v-if="vars.coinPrice && vars.targetCoin" class="rsi-hint up-c">
                  +{{ (((vars.targetCoin - vars.coinPrice) / vars.coinPrice) * 100).toFixed(0) }}% 필요
                </span>
              </div>
              <div class="fg">
                <label>🎯 CON3 목표가 ($)</label>
                <input type="number" v-model="vars.targetCon3" placeholder="예: 9.1" step="0.1" class="target-input" />
                <span v-if="vars.con3Price && vars.targetCon3" class="rsi-hint up-c">
                  +{{ (((vars.targetCon3 - vars.con3Price) / vars.con3Price) * 100).toFixed(0) }}% 필요
                </span>
              </div>
            </div>
          </div>

          <div class="var-group market-group">
            <p class="var-section-title">
              기술 지표
              <span class="var-hint">— 자동 입력됨</span>
              <span v-if="varsCount" class="var-filled">{{ varsCount }}개 입력됨</span>
            </p>
            <div class="var-row">
              <div class="fg">
                <label>BTC 현재가 ($)</label>
                <input type="number" v-model="vars.btcPrice" placeholder="예: 103500" />
              </div>
              <div class="fg">
                <label>COIN RSI (14일)</label>
                <input type="number" v-model="vars.rsi" placeholder="0~100" min="0" max="100" />
                <span v-if="vars.rsi" class="rsi-hint">
                  {{ vars.rsi > 70 ? '⚠ 과매수' : vars.rsi < 30 ? '⚠ 과매도' : '정상 구간' }}
                </span>
              </div>
              <div class="fg">
                <label>공포탐욕지수</label>
                <input type="number" v-model="vars.fearGreed" placeholder="0~100" min="0" max="100" />
                <span v-if="vars.fearGreed" class="rsi-hint">
                  {{ vars.fearGreed >= 75 ? '극단적 탐욕' : vars.fearGreed >= 55 ? '탐욕' : vars.fearGreed >= 45 ? '중립' : vars.fearGreed >= 25 ? '공포' : '극단적 공포' }}
                </span>
              </div>
              <div class="fg">
                <label>거래량 (평균 대비)</label>
                <input type="text" v-model="vars.volume" placeholder="예: +45%, 평균 이하" />
              </div>
              <div class="fg wide">
                <label>52주 고점/저점</label>
                <input type="text" v-model="vars.highLow" placeholder="자동 입력됨" />
              </div>
            </div>
          </div>

          <!-- 거시 지표 -->
          <div class="var-group macro-group">
            <p class="var-section-title">
              거시 지표 (Macro)
              <span class="var-hint">— 자동 수집 · 환각 교차검증에 사용</span>
            </p>
            <div class="var-row">
              <div class="fg">
                <label>S&amp;P500</label>
                <input type="number" v-model="vars.spxPrice" placeholder="자동" step="0.01" readonly />
                <span v-if="vars.spxRsi" class="rsi-hint">RSI {{ vars.spxRsi }}{{ vars.spxRsi > 70 ? ' ⚠과매수' : vars.spxRsi < 30 ? ' ⚠과매도' : '' }}</span>
              </div>
              <div class="fg">
                <label>달러지수 DXY</label>
                <input type="number" v-model="vars.dxyPrice" placeholder="자동" step="0.001" readonly />
                <span v-if="vars.dxyRsi" class="rsi-hint">RSI {{ vars.dxyRsi }}{{ vars.dxyRsi > 62 ? ' ⚠강세' : vars.dxyRsi < 38 ? ' ✓약세' : '' }}</span>
              </div>
              <div class="fg">
                <label>VIX 공포지수</label>
                <input type="number" v-model="vars.vix" placeholder="자동" step="0.01" readonly />
                <span v-if="vars.vix" class="rsi-hint">{{ vars.vix >= 30 ? '⚠고공포' : vars.vix >= 20 ? '⚠경계' : '✓안정' }}</span>
              </div>
              <div class="fg">
                <label>ETH RSI</label>
                <input type="number" v-model="vars.ethRsi" placeholder="자동" step="0.1" readonly />
                <span v-if="vars.ethRsi" class="rsi-hint">{{ vars.ethRsi > 70 ? '⚠과매수' : vars.ethRsi < 30 ? '⚠과매도' : '정상' }}</span>
              </div>
              <div class="fg">
                <label>ETH/BTC 비율</label>
                <input type="number" v-model="vars.ethBtcRatio" placeholder="자동" step="0.00001" readonly />
                <span v-if="vars.ethBtcRatio" class="rsi-hint">{{ vars.ethBtcRatio > 0.065 ? '알트시즌↑' : vars.ethBtcRatio < 0.04 ? 'BTC강세↓' : '중립' }}</span>
              </div>
              <div class="fg">
                <label>BTC 24H 변화</label>
                <input type="text" :value="vars.btcChange24h ? (vars.btcChange24h > 0 ? '+' : '') + vars.btcChange24h + '%' : ''" placeholder="자동" readonly />
                <span v-if="vars.btcChange24h" class="rsi-hint" :style="{ color: vars.btcChange24h > 0 ? 'var(--green)' : 'var(--red)' }">{{ vars.btcChange24h > 0 ? '▲' : '▼' }}</span>
              </div>
            </div>
          </div>

          <div class="var-group context-group">
            <p class="var-section-title">
              컨텍스트
              <span class="var-hint">— 포지션 상황, 오늘 뉴스 등</span>
            </p>
            <div class="var-row">
              <div class="fg wide">
                <label>포지션 메모</label>
                <input type="text" v-model="vars.posNote" placeholder="예: 물타기 고민 중, 손절가 $0.50 설정" />
              </div>
              <div class="fg full">
                <label>오늘 주요 뉴스 / 이슈 요약</label>
                <textarea v-model="vars.extraNote" rows="3"
                  placeholder="오늘 크롤링한 뉴스 중 관련 내용을 여기에 붙여넣으세요.&#10;예: SEC 승인 관련 뉴스, BTC ETF 자금 유입, 거시경제 지표 등"></textarea>
              </div>
            </div>
          </div>

          <!-- Gemini 추가 요청 항목 — 클릭 체크리스트 -->
          <div class="var-group extra-items-group">
            <p class="var-section-title">
              Gemini 추가 제공 데이터
              <span class="var-hint">— 클릭으로 선택 → 값 입력 → 프롬프트에 자동 포함</span>
              <span v-if="selectedExtras.length" class="var-filled">{{ selectedExtras.length }}개 선택됨</span>
            </p>
            <div class="preset-chips">
              <button
                v-for="(p, i) in EXTRA_PRESETS" :key="i"
                :class="['preset-chip', { active: isPresetSelected(i) }]"
                @click="togglePreset(i)">
                {{ p.key }}
              </button>
            </div>
            <div v-if="selectedExtras.length" class="preset-values">
              <div v-for="e in selectedExtras" :key="e.idx"
                class="preset-value-row" :class="{ 'needs-value': !e.value && !e.fetching }">
                <span class="preset-value-key">{{ EXTRA_PRESETS[e.idx].key }}</span>
                <!-- fetch 중일 때 -->
                <span v-if="e.fetching" class="preset-fetching-indicator">
                  ⏳ 실시간 조회 중...
                </span>
                <!-- 값 있거나 fetch 완료 -->
                <template v-else>
                  <input
                    type="text"
                    v-model="e.value"
                    class="preset-value-input"
                    :class="{ empty: !e.value }"
                    :placeholder="e.value ? '' : (AUTO_FETCHABLE.has(e.idx) ? '자동 수집 실패 — 직접 입력' : EXTRA_PRESETS[e.idx].hint)"
                  />
                  <!-- 재시도 버튼 (자동수집 가능, 값 없을 때) -->
                  <button v-if="AUTO_FETCHABLE.has(e.idx) && !e.value"
                    class="preset-fetch-btn"
                    @click="fetchOnePreset(e.idx)"
                    title="재시도">
                    ⚡ 재시도
                  </button>
                  <!-- 데이터 소스 링크 -->
                  <a v-if="EXTRA_PRESETS[e.idx].url"
                    :href="EXTRA_PRESETS[e.idx].url"
                    target="_blank" rel="noopener"
                    class="preset-link-btn" title="데이터 소스 열기">↗</a>
                </template>
                <button class="extra-del" @click="togglePreset(e.idx)" title="삭제">✕</button>
              </div>
            </div>
          </div>
        </div>

        <div class="step-foot">
          <button class="primary step-next" :disabled="!basePrice" @click="step = 2">
            다음: Gemini 프롬프트 확인 →
          </button>
          <span v-if="!basePrice" class="step-hint">기준가 입력 필요 (COIN 또는 CON3)</span>
        </div>
      </div>

      <!-- ── Step 2: Gemini 질문 복사 ── -->
      <div v-show="step === 2" class="step-body">
        <div class="prompt-preview-wrap">
          <div class="prompt-header">
            <span class="prompt-title">Gemini에 붙여넣을 프롬프트 미리보기</span>
            <div class="prompt-actions">
              <button :class="['copy-big-btn', { copied: copiedPrompt }]" @click="copyPrompt">
                {{ copiedPrompt ? '✓ 복사됨!' : '📋 전체 복사 (Ctrl+C 대용)' }}
              </button>
            </div>
          </div>
          <pre class="prompt-preview">{{ promptText }}</pre>
        </div>
        <div class="step-foot">
          <button class="ghost" @click="step = 1">← 변수 수정</button>
          <button class="primary step-next" @click="step = 3">
            Gemini에 물어봤어요 →
          </button>
        </div>
      </div>

      <!-- ── Step 3: 답변 붙여넣기 ── -->
      <div v-show="step === 3" class="step-body">
        <label class="paste-label">
          Gemini 답변 전체 붙여넣기
          <span class="paste-hint">— 기간별 상승/하락 확률을 자동으로 읽어냅니다</span>
        </label>
        <textarea class="gemini-paste" v-model="geminiRaw" rows="8"
          placeholder="Gemini 답변을 여기에 Ctrl+V 로 붙여넣으세요.&#10;'【기간별 최종 판단】' 블록에서 각 기간의 확률을 자동 인식합니다."></textarea>

        <!-- 추가 지표 자동 감지 패널 -->
        <div v-if="extraAutoStatus" class="extra-auto-panel" :class="{ loading: extraAutoStatus === 'loading' }">
          <div class="extra-auto-header">
            <span v-if="extraAutoStatus === 'loading'">⏳ Gemini 응답에서 추가 지표 감지 중...</span>
            <span v-else class="extra-auto-title">🤖 {{ extraAutoStatus }}</span>
            <span class="extra-auto-hint">← Step 1로 돌아가면 자동 선택된 항목 확인 가능</span>
          </div>
          <div v-if="extraAutoDetected.length && extraAutoStatus !== 'loading'" class="extra-auto-list">
            <div v-for="item in extraAutoDetected" :key="item.idx" class="extra-auto-item">
              <span class="extra-auto-badge" :class="item.fetched ? 'fetched' : 'manual'">
                {{ item.fetched ? '✓ 자동' : '✎ 수동' }}
              </span>
              <span class="extra-auto-label">{{ item.label }}</span>
              <span v-if="item.fetched" class="extra-auto-value">{{ item.value }}</span>
              <span v-else class="extra-auto-empty">직접 입력 필요</span>
            </div>
          </div>
        </div>

        <!-- Parse result -->
        <div class="parse-result" :class="{ active: parsed.ok, fail: !parsed.ok && geminiRaw }">
          <template v-if="!geminiRaw">
            <span class="parse-idle">위에 Gemini 답변을 붙여넣으면 자동 분석됩니다.</span>
          </template>
          <template v-else-if="!parsed.ok">
            <span class="parse-fail-msg">⚠ 확률 인식 실패 ({{ parsed.horizons.length }}개 파싱됨, 최소 3개 필요) — '【기간별 최종 판단】' 블록이 있는지 확인하거나, Step 2 프롬프트로 다시 질문해보세요.</span>
          </template>
          <template v-else>
            <div class="parsed-horizons-title">【기간별 예측】 — {{ parsed.horizons.length }}개 기간 인식</div>
            <table class="parsed-horizons-table">
              <tbody>
                <tr v-for="h in parsed.horizons" :key="h.value" class="parsed-h-row">
                  <td class="ph-label">{{ h.label }}</td>
                  <td class="ph-dir" :class="h.direction === 'UP' ? 'up' : 'dn'">
                    {{ h.direction === 'UP' ? '▲ 상승' : '▼ 하락' }}
                  </td>
                  <td class="ph-prob">
                    <span class="up-c">{{ h.upProb }}%</span>
                    <span class="ph-sep">/</span>
                    <span class="dn-c">{{ h.downProb }}%</span>
                  </td>
                  <td class="ph-conf">
                    <span class="conf-stars-display">
                      <span v-for="n in 5" :key="n" :class="['star', { lit: n <= h.confidence }]">★</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="parsed.summary" class="parsed-summary">{{ parsed.summary }}</div>
          </template>
        </div>

        <!-- ── 환각 검증 패널 ── -->
        <div v-if="parsed.ok || verify.loading" class="verify-panel" :class="verify.riskLevel">
          <div class="verify-header">
            <span class="verify-title">🔍 Gemini 환각 교차검증 (1주 방향 기준)</span>
            <template v-if="verify.riskLevel">
              <span class="risk-badge" :class="verify.riskLevel">
                {{ verify.riskLevel === 'high' ? '🔴 주의 필요' : verify.riskLevel === 'mid' ? '🟡 일부 불일치' : '🟢 지표 일치' }}
              </span>
            </template>
          </div>
          <div v-if="verify.loading" class="verify-loading">⏳ 기술 지표 교차 확인 중...</div>
          <div v-else class="verify-checks">
            <div v-for="(c, i) in verify.checks" :key="i" class="verify-check">
              <span class="check-icon">{{ c.icon }}</span>
              <div class="check-body">
                <span class="check-label">{{ c.label }}</span>
                <span class="check-detail">{{ c.detail }}</span>
              </div>
            </div>
          </div>
          <div v-if="verify.riskLevel === 'high'" class="verify-warn">
            ⚠ 기술 지표 다수가 Gemini 예측과 불일치합니다. 프롬프트를 재질문하거나 신뢰도를 낮춰 등록하세요.
          </div>
        </div>

        <div class="step-foot">
          <button class="ghost" @click="step = 2">← 프롬프트 다시 보기</button>
          <button
            class="primary add-btn"
            :class="{ flash: addedFlash }"
            :disabled="!basePrice || !parsed.ok || parsed.horizons.length === 0"
            @click="addPrediction">
            {{ addedFlash ? '✓ 등록 완료!' : '+ 예측 등록' }}
          </button>
          <span v-if="!parsed.ok && geminiRaw" class="step-hint warn">확률 인식 실패</span>
          <span v-else-if="!geminiRaw" class="step-hint">답변을 붙여넣어 주세요</span>
        </div>
      </div>
    </section>

    <!-- ─── Pending ─── -->
    <section v-if="pending.length" class="card list-card">
      <h2 class="list-title">검증 대기 중 <span class="badge-cnt">{{ pending.length }}</span></h2>
      <div class="pred-list">
        <div v-for="p in pending" :key="p.id" class="pred-row pending-row">
          <!-- Collapsible card header -->
          <div class="pred-card-header" @click="toggleCard(p.id)">
            <span class="pred-ticker" :style="{ color: tickerColor(p.ticker) }">{{ p.ticker }}</span>
            <span class="pred-price">
              COIN ${{ p.coinPrice || '?' }}
              <span class="muted">/</span>
              CON3 ${{ p.con3Price || '?' }}
            </span>
            <span class="pred-time muted">{{ fmt(p.createdAt) }}</span>
            <div class="pred-summary-trend" v-if="(p.horizons||[]).length > 0">
              <span class="trend-item">
                <span class="trend-label">단기</span>
                <span :class="computeInsight(p).short >= 50 ? 'up-c' : 'dn-c'">
                  {{ computeInsight(p).short >= 50 ? '▲' : '▼' }}{{ computeInsight(p).short }}%
                </span>
              </span>
              <span class="trend-item">
                <span class="trend-label">중기</span>
                <span :class="computeInsight(p).mid >= 50 ? 'up-c' : 'dn-c'">
                  {{ computeInsight(p).mid >= 50 ? '▲' : '▼' }}{{ computeInsight(p).mid }}%
                </span>
              </span>
              <span class="trend-item">
                <span class="trend-label">장기</span>
                <span :class="computeInsight(p).long >= 50 ? 'up-c' : 'dn-c'">
                  {{ computeInsight(p).long >= 50 ? '▲' : '▼' }}{{ computeInsight(p).long }}%
                </span>
              </span>
            </div>
            <span class="horizon-count-tag">{{ (p.horizons || []).length }}기간</span>
            <span class="pred-expand-arrow" :class="{ open: expandedCards[p.id] }">▼</span>
          </div>

          <!-- Expanded content -->
          <div v-show="expandedCards[p.id]">
            <!-- Horizons table -->
            <div class="horizon-table-wrap">
              <table class="horizon-table">
                <thead>
                  <tr>
                    <th>기간</th>
                    <th>방향</th>
                    <th>확률</th>
                    <th>신뢰도</th>
                    <th>만기</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in (p.horizons || [])" :key="h.value"
                    :class="['h-row',
                      { 'h-mature': isMatureH(p, h.value) },
                      h.status === 'HIT'  ? 'h-hit'  : '',
                      h.status === 'MISS' ? 'h-miss' : '',
                    ]">
                    <td class="h-label">{{ h.label }}</td>
                    <td class="h-dir" :class="h.direction === 'UP' ? 'up' : 'dn'">
                      {{ h.direction === 'UP' ? '▲ 상승' : '▼ 하락' }}
                    </td>
                    <td class="h-prob">
                      <span class="up-c">{{ h.upProb }}%</span>/<span class="dn-c">{{ h.downProb }}%</span>
                    </td>
                    <td class="h-conf">{{ confStars(h.confidence) }}</td>
                    <td class="h-maturity">
                      <span v-if="h.status !== 'PENDING'" class="status-badge" :class="h.status === 'HIT' ? 'hit' : 'miss'">
                        {{ h.status === 'HIT' ? '✓ 적중' : '✗ 미스' }}
                      </span>
                      <span v-else-if="isMatureH(p, h.value)" class="mature-tag">만기됨</span>
                      <span v-else class="not-mature">{{ daysLeftH(p, h.value) }}</span>
                    </td>
                    <td class="h-action">
                      <template v-if="h.status === 'PENDING'">
                        <!-- fetch 중 -->
                        <span v-if="resultFetching[`${p.id}_${h.value}`]" class="result-fetching">⏳</span>
                        <!-- 수동 폴백 (자동 실패 시) -->
                        <template v-else-if="resultInputs[`${p.id}_${h.value}`] !== undefined">
                          <input type="number" v-model="resultInputs[`${p.id}_${h.value}`]"
                            placeholder="직접 입력" step="0.0001" class="result-input-sm" />
                          <button class="primary small" @click="submitManualResult(p, h)">저장</button>
                          <button class="small" @click="cancelManualResult(`${p.id}_${h.value}`)">✕</button>
                        </template>
                        <!-- 만기됨: 시스템이 자동 저장 (버튼 없음) -->
                        <template v-else-if="isMatureH(p, h.value)">
                          <span class="auto-save-tag">🔄 자동 저장 대기</span>
                        </template>
                        <!-- 아직 만기 전: 조기 수동 저장만 -->
                        <template v-else>
                          <button class="small verify-early-btn" @click="autoSubmitResult(p, h)">
                            조기 저장
                          </button>
                        </template>
                      </template>
                      <span v-else class="h-result-price muted">${{ h.resultPrice }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Interactive price chart (Lightweight Charts) -->
            <div class="price-chart-wrap" v-if="expandedCards[p.id]">
              <div class="chart-header">
                <span class="chart-title">{{ p.ticker === 'CON3' ? 'COIN (CON3 대리)' : p.ticker }} 60일</span>
                <span class="chart-entry">등록 ${{ p.ticker === 'CON3' ? p.con3Price : p.coinPrice }}</span>
                <span class="chart-entry target-label">🎯 목표 ${{ p.ticker === 'CON3' ? (p.targetCon3||9.1) : (p.targetCoin||500) }}</span>
                <span v-if="chartCache[p.id]?.data?.length" class="chart-change"
                  :class="((chartCache[p.id].data.at(-1).price - (p.ticker==='CON3'?p.con3Price:p.coinPrice)) >= 0) ? 'up-c' : 'dn-c'">
                  현재 ${{ chartCache[p.id].data.at(-1).price?.toFixed(2) }}
                  ({{ ((chartCache[p.id].data.at(-1).price-(p.ticker==='CON3'?p.con3Price:p.coinPrice))/(p.ticker==='CON3'?p.con3Price:p.coinPrice)*100).toFixed(1) }}%)
                </span>
                <span class="chart-hint muted">← 드래그 줌 · 스크롤 팬 · 호버 가격 확인</span>
              </div>
              <div v-if="chartCache[p.id]?.loading" class="chart-loading">⏳ 가격 이력 로딩 중...</div>
              <PriceChartLW
                v-else-if="chartCache[p.id]?.data?.length"
                :pred="p"
                :data="chartCache[p.id].data"
              />
              <div v-else-if="chartCache[p.id] && !chartCache[p.id].loading" class="chart-no-data">
                차트 데이터 없음
              </div>
            </div>

            <!-- Insight panel -->
            <div class="insight-panel" v-if="(p.horizons||[]).length > 0">
              <div class="insight-bars">
                <div class="insight-bar-item" v-if="computeInsight(p).short !== null">
                  <span class="insight-label">단기</span>
                  <div class="insight-bar-bg">
                    <div class="insight-bar-fill"
                      :class="computeInsight(p).short >= 60 ? 'bull' : computeInsight(p).short <= 40 ? 'bear' : 'neutral'"
                      :style="{ width: computeInsight(p).short + '%' }"></div>
                  </div>
                  <span class="insight-pct"
                    :class="computeInsight(p).short >= 60 ? 'up-c' : computeInsight(p).short <= 40 ? 'dn-c' : ''">
                    {{ computeInsight(p).short }}%</span>
                </div>
                <div class="insight-bar-item" v-if="computeInsight(p).mid !== null">
                  <span class="insight-label">중기</span>
                  <div class="insight-bar-bg">
                    <div class="insight-bar-fill"
                      :class="computeInsight(p).mid >= 60 ? 'bull' : computeInsight(p).mid <= 40 ? 'bear' : 'neutral'"
                      :style="{ width: computeInsight(p).mid + '%' }"></div>
                  </div>
                  <span class="insight-pct"
                    :class="computeInsight(p).mid >= 60 ? 'up-c' : computeInsight(p).mid <= 40 ? 'dn-c' : ''">
                    {{ computeInsight(p).mid }}%</span>
                </div>
                <div class="insight-bar-item" v-if="computeInsight(p).long !== null">
                  <span class="insight-label">장기</span>
                  <div class="insight-bar-bg">
                    <div class="insight-bar-fill"
                      :class="computeInsight(p).long >= 60 ? 'bull' : computeInsight(p).long <= 40 ? 'bear' : 'neutral'"
                      :style="{ width: computeInsight(p).long + '%' }"></div>
                  </div>
                  <span class="insight-pct"
                    :class="computeInsight(p).long >= 60 ? 'up-c' : computeInsight(p).long <= 40 ? 'dn-c' : ''">
                    {{ computeInsight(p).long }}%</span>
                </div>
              </div>
              <div class="insight-meta">
                <span class="insight-signal" :class="computeInsight(p).signal">
                  {{ computeInsight(p).signal === 'bull' ? '🟢 종합 강세' : computeInsight(p).signal === 'bear' ? '🔴 종합 약세' : '🟡 중립/혼조' }}
                  · 목표가 도달 평균 {{ computeInsight(p).all }}%
                </span>
                <span v-if="computeInsight(p).bestLong" class="insight-target">
                  📅 최고 기대 기간: <strong>{{ computeInsight(p).bestLong.label }}</strong> ({{ computeInsight(p).bestLong.upProb }}%)
                </span>
              </div>
              <!-- 지표 추가 제안 -->
              <div v-if="computeInsight(p).suggestions.length" class="insight-suggestions">
                <div class="insight-sug-title">💡 이 지표 추가하면 정확도 높아짐</div>
                <div v-for="(s, si) in computeInsight(p).suggestions" :key="si" class="insight-sug-row">
                  <span class="insight-sug-label">{{ s.label }}</span>
                  <span class="insight-sug-reason">{{ s.reason }}</span>
                </div>
              </div>
            </div>

            <!-- Memo / detail -->
            <div v-if="p.posNote || p.extraNote || p.geminiSummary || (p.extraItems && p.extraItems.length) || (p.varsSnapshot && Object.values(p.varsSnapshot).some(Boolean))" class="pred-memo-row">
              <button class="memo-toggle" @click.stop="toggleMemo(p.id)">{{ expandedMemo === p.id ? '▲ 접기' : '▼ 상세 보기' }}</button>
              <div v-if="expandedMemo === p.id" class="memo-box">
                <template v-if="p.varsSnapshot">
                  <p v-if="p.varsSnapshot.btcPrice"><strong>BTC:</strong> ${{ p.varsSnapshot.btcPrice }}</p>
                  <p v-if="p.varsSnapshot.rsi"><strong>RSI:</strong> {{ p.varsSnapshot.rsi }}</p>
                  <p v-if="p.varsSnapshot.fearGreed"><strong>공탐지수:</strong> {{ p.varsSnapshot.fearGreed }}</p>
                  <p v-if="p.varsSnapshot.volume"><strong>거래량:</strong> {{ p.varsSnapshot.volume }}</p>
                  <p v-if="p.varsSnapshot.highLow"><strong>고/저점:</strong> {{ p.varsSnapshot.highLow }}</p>
                </template>
                <p v-if="p.posNote"><strong>포지션:</strong> {{ p.posNote }}</p>
                <p v-if="p.geminiSummary"><strong>Gemini 요약:</strong> {{ p.geminiSummary }}</p>
                <p v-if="p.extraNote"><strong>뉴스:</strong> {{ p.extraNote.slice(0, 200) }}{{ p.extraNote.length > 200 ? '…' : '' }}</p>
                <template v-if="p.extraItems && p.extraItems.length">
                  <p><strong>추가 제공 데이터:</strong></p>
                  <p v-for="(e, i) in p.extraItems" :key="i" style="padding-left:.75rem">
                    • {{ e.key || '항목' }}: {{ e.value || '—' }}
                  </p>
                </template>
              </div>
            </div>

            <div class="pred-actions">
              <button class="del-btn small" @click="deletePred(p.id)">✕ 삭제</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Settled ─── -->
    <section v-if="settled.length" class="card list-card">
      <h2 class="list-title">검증 완료 <span class="badge-cnt">{{ settled.length }}</span></h2>
      <div class="pred-list">
        <div v-for="p in settled" :key="p.id" class="pred-row settled-row">
          <!-- Collapsible card header -->
          <div class="pred-card-header" @click="toggleCard(p.id)">
            <span class="pred-ticker" :style="{ color: tickerColor(p.ticker) }">{{ p.ticker }}</span>
            <span class="pred-price">
              COIN ${{ p.coinPrice || '?' }}
              <span class="muted">/</span>
              CON3 ${{ p.con3Price || '?' }}
            </span>
            <span class="pred-time muted">{{ fmt(p.createdAt) }}</span>
            <!-- summary hit/miss count -->
            <span class="hit-summary">
              <span class="up-c">✓ {{ (p.horizons || []).filter(h => h.status === 'HIT').length }}적중</span>
              /
              <span class="dn-c">✗ {{ (p.horizons || []).filter(h => h.status === 'MISS').length }}미스</span>
            </span>
            <span class="horizon-count-tag">{{ (p.horizons || []).length }}기간</span>
            <span class="pred-expand-arrow" :class="{ open: expandedCards[p.id] }">▼</span>
          </div>

          <!-- Expanded content -->
          <div v-show="expandedCards[p.id]">
            <!-- Horizons table (all settled) -->
            <div class="horizon-table-wrap">
              <table class="horizon-table">
                <thead>
                  <tr>
                    <th>기간</th>
                    <th>방향</th>
                    <th>확률</th>
                    <th>신뢰도</th>
                    <th>기준가</th>
                    <th>결과가</th>
                    <th>수익률</th>
                    <th>결과</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="h in (p.horizons || [])" :key="h.value"
                    :class="['h-row', h.status === 'HIT' ? 'h-hit' : 'h-miss']">
                    <td class="h-label">{{ h.label }}</td>
                    <td class="h-dir" :class="h.direction === 'UP' ? 'up' : 'dn'">
                      {{ h.direction === 'UP' ? '▲ 상승' : '▼ 하락' }}
                    </td>
                    <td class="h-prob">
                      <span class="up-c">{{ h.upProb }}%</span>/<span class="dn-c">{{ h.downProb }}%</span>
                    </td>
                    <td class="h-conf">{{ confStars(h.confidence) }}</td>
                    <td class="h-baseprice">${{ p.ticker === 'CON3' ? p.con3Price : p.coinPrice }}</td>
                    <td class="h-baseprice">${{ h.resultPrice ?? '—' }}</td>
                    <td class="h-pct" :class="h.status === 'HIT' ? 'up' : 'dn'">
                      {{ pct(p.ticker === 'CON3' ? p.con3Price : p.coinPrice, h.resultPrice) }}
                    </td>
                    <td>
                      <span class="status-badge" :class="h.status === 'HIT' ? 'hit' : 'miss'">
                        {{ h.status === 'HIT' ? '✓ 적중' : '✗ 미스' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Interactive price chart (settled) -->
            <div class="price-chart-wrap" v-if="expandedCards[p.id]">
              <div class="chart-header">
                <span class="chart-title">{{ p.ticker === 'CON3' ? 'COIN (CON3 대리)' : p.ticker }} 60일</span>
                <span class="chart-entry">등록 ${{ p.ticker === 'CON3' ? p.con3Price : p.coinPrice }}</span>
                <span class="chart-entry target-label">🎯 목표 ${{ p.ticker === 'CON3' ? (p.targetCon3||9.1) : (p.targetCoin||500) }}</span>
                <span v-if="chartCache[p.id]?.data?.length" class="chart-change"
                  :class="((chartCache[p.id].data.at(-1).price - (p.ticker==='CON3'?p.con3Price:p.coinPrice)) >= 0) ? 'up-c' : 'dn-c'">
                  현재 ${{ chartCache[p.id].data.at(-1).price?.toFixed(2) }}
                  ({{ ((chartCache[p.id].data.at(-1).price-(p.ticker==='CON3'?p.con3Price:p.coinPrice))/(p.ticker==='CON3'?p.con3Price:p.coinPrice)*100).toFixed(1) }}%)
                </span>
                <span class="chart-hint muted">← 드래그 줌 · 스크롤 팬</span>
              </div>
              <div v-if="chartCache[p.id]?.loading" class="chart-loading">⏳ 가격 이력 로딩 중...</div>
              <PriceChartLW
                v-else-if="chartCache[p.id]?.data?.length"
                :pred="p"
                :data="chartCache[p.id].data"
              />
              <div v-else-if="chartCache[p.id] && !chartCache[p.id].loading" class="chart-no-data">
                차트 데이터 없음
              </div>
            </div>

            <div class="pred-actions">
              <button class="del-btn small" @click="deletePred(p.id)">✕ 삭제</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!predictions.length" class="empty-state">예측을 등록하면 여기에 기록됩니다.</div>
  </div>
</template>

<style scoped>
.pt-root { display: flex; flex-direction: column; gap: 1.25rem; }

/* ─── Sync badge ─── */
.sync-badge {
  position: absolute; top: .5rem; right: .75rem;
  font-size: .65rem; font-weight: 600; padding: 2px 10px;
  border-radius: 8px; border: 1px solid transparent;
}
.sync-badge.idle   { color: var(--text-dim); border-color: transparent; }
.sync-badge.saving { color: var(--accent); border-color: var(--accent); background: var(--accent-bg); animation: pulse-opacity 1s infinite; }
.sync-badge.loading{ color: var(--yellow); border-color: var(--yellow); background: rgba(210,153,34,.08); animation: pulse-opacity 1s infinite; }
.sync-badge.error  { color: var(--red); border-color: var(--red); background: rgba(248,81,73,.08); }
.sync-ok { color: var(--green); }

/* ─── Stats ─── */
.stats-bar { display: flex; align-items: stretch; padding: 1rem 1.5rem; flex-wrap: wrap; position: relative; }
.stat-block { display: flex; flex-direction: column; align-items: center; gap: .15rem; padding: 0 1.25rem; }
.stat-block.overall { padding-left: 0; }
.stat-block.conf-block { align-items: flex-start; padding-right: 0; }
.stat-divider { width: 1px; background: var(--border); margin: 0 .5rem; align-self: stretch; }
.stat-label { font-size: .65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
.stat-val { font-size: 1.5rem; font-weight: 800; color: var(--text); }
.stat-val.hit { color: var(--green); }
.stat-val.miss { color: var(--red); }
.stat-sub { font-size: .72rem; color: var(--text-dim); }
.conf-bars { display: flex; flex-direction: column; gap: .25rem; margin-top: .3rem; }
.conf-bar-row { display: flex; align-items: center; gap: .4rem; }
.conf-stars { font-size: .62rem; color: var(--yellow); width: 52px; }
.conf-bar-bg { width: 80px; height: 6px; background: var(--bg-overlay); border-radius: 3px; overflow: hidden; }
.conf-bar-fill { height: 100%; border-radius: 3px; transition: width .3s; }
.conf-pct { font-size: .68rem; color: var(--text-muted); width: 28px; text-align: right; }

/* ─── Auto-fill ─── */
.autofill-bar {
  display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  padding: .75rem 1rem; border-radius: var(--radius);
  background: var(--accent-bg); border: 1px solid var(--accent);
  margin-bottom: 1.25rem;
}
.autofill-btn {
  font-size: .85rem; font-weight: 700; padding: 7px 18px;
  background: var(--accent); color: #fff; border-color: var(--accent);
  border-radius: var(--radius-sm);
}
.autofill-btn:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); color: #fff; }
.autofill-btn.loading { opacity: .7; }
.autofill-note { font-size: .75rem; color: var(--text-muted); }
.autofill-err { font-size: .75rem; color: var(--red); }

/* ─── Step tabs ─── */
.flow-card { padding: 0; overflow: hidden; }
.step-tabs { display: flex; border-bottom: 1px solid var(--border); }
.step-tab {
  flex: 1; display: flex; align-items: center; gap: .5rem; justify-content: center;
  padding: .75rem 1rem; border: none; border-radius: 0;
  background: var(--bg-elevated); color: var(--text-muted);
  font-size: .82rem; font-weight: 600;
  border-right: 1px solid var(--border);
  transition: var(--transition); cursor: pointer;
}
.step-tab:last-child { border-right: none; }
.step-tab:hover { background: var(--bg-overlay); color: var(--text); }
.step-tab.active { background: var(--bg); color: var(--accent); border-bottom: 2px solid var(--accent); }
.step-tab.done { color: var(--green); }
.step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--bg-overlay); display: flex; align-items: center; justify-content: center;
  font-size: .72rem; font-weight: 800; flex-shrink: 0;
}
.step-tab.active .step-num { background: var(--accent); color: #fff; }
.step-tab.done .step-num { background: var(--green); color: #fff; }
.step-label { font-size: .8rem; }
.step-body { padding: 1.25rem 1.5rem; }

/* ─── Vars grid ─── */
.vars-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.var-group { display: flex; flex-direction: column; gap: .6rem; }
.var-section-title {
  font-size: .7rem; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .05em;
  display: flex; align-items: center; gap: .5rem;
}
.var-hint { font-weight: 400; color: var(--text-dim); text-transform: none; letter-spacing: 0; font-size: .7rem; }
.var-filled { background: var(--accent-bg); color: var(--accent); padding: 1px 8px; border-radius: 8px; font-size: .68rem; font-weight: 700; text-transform: none; letter-spacing: 0; }
.required-group .var-section-title { color: var(--accent); }
.macro-group .var-section-title { color: #a78bfa; }
.macro-group input[readonly] { opacity: .85; cursor: default; background: var(--bg-overlay); }

/* ─── Gemini 추가 요청 ─── */
.extra-items-group .var-section-title { color: #f59e0b; }
.extra-items-list { display: flex; flex-direction: column; gap: .5rem; margin-bottom: .75rem; }
.extra-item-row {
  display: flex; align-items: center; gap: .4rem;
}
.extra-key {
  flex: 0 0 200px; font-size: .82rem;
  padding: 5px 10px; border-radius: var(--radius-sm);
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text);
}
.extra-sep { color: var(--text-muted); font-weight: 700; flex-shrink: 0; }
.extra-val {
  flex: 1; font-size: .82rem;
  padding: 5px 10px; border-radius: var(--radius-sm);
  background: var(--bg-elevated); border: 1px solid var(--border);
  color: var(--text);
}
.extra-del {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: transparent; border: 1px solid var(--border-muted);
  color: var(--text-dim); font-size: .7rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.extra-del:hover { background: var(--red); border-color: var(--red); color: #fff; }
.extra-add-btn {
  font-size: .78rem; font-weight: 600; padding: 5px 14px;
  border: 1px dashed var(--border); border-radius: var(--radius-sm);
  background: transparent; color: var(--text-muted); cursor: pointer;
  transition: var(--transition);
}
.extra-add-btn:hover { border-color: #f59e0b; color: #f59e0b; background: color-mix(in srgb, #f59e0b 8%, transparent); }
.var-row { display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-start; }
.fg { display: flex; flex-direction: column; gap: .25rem; min-width: 130px; }
.fg.wide { min-width: 260px; flex: 1; }
.fg.full { width: 100%; }
.fg label { font-size: .68rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: .04em; }
.fg input, .fg select, .fg textarea { width: 100%; }
.fg textarea { resize: vertical; min-height: 70px; font-size: .82rem; line-height: 1.5; }
.rsi-hint { font-size: .68rem; color: var(--yellow); margin-top: 2px; }
.ticker-btns { display: flex; gap: .4rem; }
.ticker-btn { font-weight: 700; font-size: .82rem; padding: 6px 14px; transition: var(--transition); }
.ticker-btn.active { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 15%, transparent); color: var(--tc); }
.fg input.price-active { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent); }

/* ─── Market state badge ─── */
.mkt-badge {
  display: inline-flex; align-items: center;
  font-size: .72rem; font-weight: 600;
  padding: 1px 6px; border-radius: 5px;
  margin-left: 5px; vertical-align: middle;
  letter-spacing: .01em;
}
.mkt-pre     { background: rgba(139,92,246,.15); color: #a78bfa; border: 1px solid rgba(139,92,246,.3); }
.mkt-post    { background: rgba(251,146,60,.15);  color: #fb923c; border: 1px solid rgba(251,146,60,.3); }
.mkt-regular { background: rgba(34,197,94,.13);   color: #4ade80; border: 1px solid rgba(34,197,94,.3); }
.mkt-closed  { background: rgba(100,116,139,.13); color: #94a3b8; border: 1px solid rgba(100,116,139,.3); }
.mkt-detail {
  display: flex; align-items: center; gap: .4rem;
  margin-top: 3px; font-size: .8rem;
}
.mkt-ext-price  { font-weight: 700; color: var(--text); }
.mkt-reg-price  { color: var(--text-dim); }
.mkt-sep        { color: var(--border); }

/* 데이터 소스 태그 */
.src-tag {
  display: inline-block;
  font-size: .68rem; font-weight: 500;
  padding: 1px 5px; margin-left: 4px;
  border-radius: 4px;
  background: rgba(99,102,241,.12); color: #a5b4fc;
  border: 1px solid rgba(99,102,241,.25);
}

/* 야간 ATS bid/ask 행 (토스/삼성 야간거래 표시) */
.ats-row {
  display: flex; align-items: center; gap: .5rem; flex-wrap: wrap;
  margin-top: 4px;
  padding: 5px 8px;
  background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(168,85,247,.05));
  border: 1px solid rgba(99,102,241,.25);
  border-radius: 6px;
  font-size: .76rem;
}
.ats-label { font-weight: 700; color: #a5b4fc; letter-spacing: .02em; }
.ats-bid   { color: #4ade80; }
.ats-ask   { color: #f87171; }
.ats-bid strong, .ats-ask strong { font-family: ui-monospace, 'SF Mono', monospace; }
.ats-size  { font-size: .68rem; color: var(--text-dim); margin-left: 2px; }
.ats-sep   { color: var(--border); }
.ats-last  {
  margin-left: auto; color: var(--text-dim); font-size: .72rem;
  padding-left: .6rem; border-left: 1px solid var(--border-muted);
}

/* ─── Step foot ─── */
.step-foot { display: flex; align-items: center; gap: .75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border-muted); }
.step-next { min-width: 200px; }
.step-hint { font-size: .75rem; color: var(--text-dim); }
.step-hint.warn { color: var(--orange); }
button.ghost { background: transparent; border-color: var(--border); color: var(--text-muted); }
button.ghost:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

/* ─── Prompt preview ─── */
.prompt-preview-wrap { display: flex; flex-direction: column; gap: .75rem; }
.prompt-header { display: flex; align-items: center; justify-content: space-between; }
.prompt-title { font-size: .82rem; font-weight: 700; color: var(--text); }
.prompt-actions { display: flex; gap: .5rem; }
.copy-big-btn { font-size: .82rem; font-weight: 600; padding: 7px 18px; }
.copy-big-btn.copied { color: var(--green); border-color: var(--green); background: rgba(63,185,80,.1); }
.prompt-preview {
  background: var(--bg-overlay);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem 1.2rem;
  font-family: ui-monospace, 'SF Mono', Consolas, monospace;
  font-size: .78rem;
  line-height: 1.7;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 380px;
  overflow-y: auto;
}

/* ─── Paste & parse ─── */
.paste-label { display: block; font-size: .78rem; font-weight: 700; color: var(--text); margin-bottom: .4rem; }
.paste-hint { font-weight: 400; color: var(--text-muted); font-size: .72rem; }
.gemini-paste { width: 100%; resize: vertical; font-size: .82rem; line-height: 1.5; }

/* ─── Modal overlay ─── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,.65);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  backdrop-filter: blur(3px);
}
.modal-box {
  background: var(--bg-elevated); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: 0 24px 60px rgba(0,0,0,.5);
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  animation: modal-in .15s ease;
}
@keyframes modal-in {
  from { transform: scale(.94); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem .75rem;
  border-bottom: 1px solid var(--border);
}
.modal-title { font-size: .9rem; font-weight: 800; color: #f59e0b; }
.modal-close {
  width: 26px; height: 26px; border-radius: 50%;
  background: transparent; border: 1px solid var(--border);
  color: var(--text-dim); font-size: .75rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: var(--red); border-color: var(--red); color: #fff; }
.modal-body { padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: .75rem; }
.modal-desc { font-size: .82rem; color: var(--text-muted); line-height: 1.6; }
.modal-desc strong { color: var(--text); }
.modal-items { display: flex; flex-direction: column; gap: .4rem; }
.modal-item {
  display: flex; align-items: center; gap: .6rem; font-size: .8rem;
  padding: .4rem .6rem; border-radius: var(--radius-sm);
  background: var(--bg-overlay);
}
.modal-badge {
  font-size: .65rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; flex-shrink: 0;
}
.modal-badge.fetched { background: rgba(63,185,80,.2);  color: var(--green); }
.modal-badge.manual  { background: rgba(210,153,34,.2); color: var(--orange); }
.modal-label  { font-weight: 600; color: var(--text); flex: 1; }
.modal-value  { font-family: ui-monospace, monospace; color: var(--green); font-size: .78rem; }
.modal-empty  { color: var(--text-dim); font-size: .72rem; font-style: italic; }
.modal-link   { color: var(--accent); font-size: .72rem; font-weight: 600; text-decoration: none; }
.modal-link:hover { text-decoration: underline; }
.modal-foot {
  display: flex; gap: .6rem; padding: .75rem 1.25rem 1rem;
  border-top: 1px solid var(--border);
}
.modal-go-btn { flex: 1; font-weight: 700; }

/* ─── Extra auto-detect panel ─── */
.extra-auto-panel {
  margin-top: .6rem; padding: .6rem .9rem;
  border: 1px solid #f59e0b; border-radius: var(--radius);
  background: color-mix(in srgb, #f59e0b 8%, transparent);
}
.extra-auto-panel.loading { opacity: .7; }
.extra-auto-header { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; margin-bottom: .4rem; }
.extra-auto-title { font-size: .78rem; font-weight: 700; color: #f59e0b; }
.extra-auto-hint  { font-size: .7rem; color: var(--text-muted); }
.extra-auto-list  { display: flex; flex-direction: column; gap: .25rem; }
.extra-auto-item  { display: flex; align-items: center; gap: .5rem; font-size: .75rem; }
.extra-auto-badge {
  font-size: .65rem; font-weight: 700; padding: 1px 7px; border-radius: 8px; flex-shrink: 0;
}
.extra-auto-badge.fetched { background: rgba(63,185,80,.2); color: var(--green); }
.extra-auto-badge.manual  { background: rgba(210,153,34,.2); color: var(--orange); }
.extra-auto-label { font-weight: 600; color: var(--text); }
.extra-auto-value { color: var(--green); font-family: ui-monospace, monospace; }
.extra-auto-empty { color: var(--text-dim); font-style: italic; font-size: .7rem; }

.parse-result {
  margin-top: .75rem; padding: .75rem 1rem; border-radius: var(--radius);
  border: 1px dashed var(--border); background: var(--bg-overlay);
  min-height: 48px;
}
.parse-result.active { border-color: var(--accent); border-style: solid; background: var(--accent-bg); }
.parse-result.fail  { border-color: var(--orange); border-style: solid; }
.parse-idle { font-size: .8rem; color: var(--text-dim); }
.parse-fail-msg { font-size: .8rem; color: var(--orange); }

/* parsed horizons table in step 3 */
.parsed-horizons-title { font-size: .8rem; font-weight: 700; color: var(--text); margin-bottom: .5rem; }
.parsed-horizons-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
.parsed-h-row td { padding: .25rem .5rem; border-bottom: 1px solid var(--border-muted); }
.parsed-h-row:last-child td { border-bottom: none; }
.ph-label { font-weight: 600; color: var(--text); width: 100px; }
.ph-dir { font-weight: 700; }
.ph-dir.up { color: var(--green); }
.ph-dir.dn { color: var(--red); }
.ph-prob { font-size: .75rem; }
.ph-sep { color: var(--text-dim); margin: 0 2px; }
.ph-conf { color: var(--yellow); font-size: .7rem; }

.up-c { color: var(--green); }
.dn-c { color: var(--red); }
.parsed-summary { font-size: .78rem; color: var(--text-muted); line-height: 1.5; padding-top: .4rem; border-top: 1px solid var(--border-muted); margin-top: .5rem; }

/* prob bars (kept for reference) */
.conf-stars-display .star { font-size: .95rem; color: var(--bg-overlay); }
.conf-stars-display .star.lit { color: var(--yellow); }

/* ─── Verify panel ─── */
.verify-panel {
  margin-top: .9rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.verify-panel.high { border-color: var(--red); }
.verify-panel.mid  { border-color: var(--orange); }
.verify-panel.low  { border-color: var(--green); }

.verify-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .6rem .9rem;
  background: var(--bg-overlay);
  border-bottom: 1px solid var(--border);
}
.verify-title { font-size: .78rem; font-weight: 700; color: var(--text); }
.risk-badge { font-size: .72rem; font-weight: 700; padding: 2px 10px; border-radius: 8px; }
.risk-badge.high { background: rgba(248,81,73,.15); color: var(--red); }
.risk-badge.mid  { background: rgba(210,153,34,.15); color: var(--orange); }
.risk-badge.low  { background: rgba(63,185,80,.15);  color: var(--green); }
.verify-loading { padding: .75rem .9rem; font-size: .8rem; color: var(--text-muted); }

.verify-checks { display: flex; flex-direction: column; }
.verify-check {
  display: flex; align-items: flex-start; gap: .7rem;
  padding: .5rem .9rem;
  border-bottom: 1px solid var(--border-muted);
  font-size: .78rem;
}
.verify-check:last-child { border-bottom: none; }
.check-icon { font-size: .9rem; flex-shrink: 0; margin-top: 1px; }
.check-body { display: flex; flex-direction: column; gap: .15rem; }
.check-label { font-weight: 600; color: var(--text); }
.check-detail { color: var(--text-muted); font-size: .73rem; }
.verify-warn {
  padding: .6rem .9rem;
  background: rgba(248,81,73,.08);
  font-size: .75rem; color: var(--red);
  border-top: 1px solid rgba(248,81,73,.2);
}

.add-btn { min-width: 120px; }
.add-btn.flash { background: var(--green); border-color: var(--green); }

/* ─── Lists ─── */
.list-title { font-size: .8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: .75rem; display: flex; align-items: center; gap: .5rem; }
.badge-cnt { background: var(--bg-overlay); color: var(--text); padding: 1px 8px; border-radius: 10px; font-size: .72rem; }
.pred-list { display: flex; flex-direction: column; gap: .75rem; }
.pred-row { padding: .75rem .9rem; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg); }
.pending-row { border-left: 3px solid var(--accent); }
.settled-row { border-left: 3px solid var(--border); }
.pred-meta { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; font-size: .8rem; margin-bottom: .5rem; }
.pred-ticker { font-weight: 800; font-size: .88rem; }
.pred-price { font-family: ui-monospace, monospace; font-size: .8rem; }
.horizon-count-tag { padding: 1px 8px; border-radius: 8px; background: var(--bg-overlay); color: var(--text-muted); font-size: .68rem; font-weight: 600; }
.hit-summary { font-size: .78rem; font-weight: 600; }
.pred-time { font-size: .7rem; margin-left: auto; }

/* ─── Horizon table ─── */
.horizon-table-wrap { overflow-x: auto; margin-bottom: .5rem; }
.horizon-table {
  width: 100%; border-collapse: collapse; font-size: .78rem;
}
.horizon-table th {
  padding: .3rem .5rem; text-align: left;
  font-size: .65rem; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-overlay);
}
.h-row td { padding: .3rem .5rem; border-bottom: 1px solid var(--border-muted); vertical-align: middle; }
.h-row:last-child td { border-bottom: none; }
.h-label { font-weight: 600; color: var(--text); white-space: nowrap; }
.h-dir { font-weight: 700; white-space: nowrap; }
.h-dir.up { color: var(--green); }
.h-dir.dn { color: var(--red); }
.h-prob { font-size: .73rem; white-space: nowrap; }
.h-conf { color: var(--yellow); font-size: .7rem; white-space: nowrap; }
.h-maturity { white-space: nowrap; }
.h-action { white-space: nowrap; }
.h-baseprice { font-family: ui-monospace, monospace; font-size: .75rem; white-space: nowrap; }
.h-pct { font-weight: 700; font-size: .75rem; }
.h-pct.up { color: var(--green); }
.h-pct.dn { color: var(--red); }
.h-result-price { font-size: .72rem; }

/* h-row state highlights */
.h-mature { background: color-mix(in srgb, var(--accent) 5%, transparent); }
.h-hit td  { background: rgba(63,185,80,.06); }
.h-miss td { background: rgba(248,81,73,.05); }

/* ─── Badges ─── */
.status-badge { padding: 2px 9px; border-radius: 8px; font-size: .72rem; font-weight: 700; }
.status-badge.hit  { background: rgba(63,185,80,.18); color: var(--green); }
.status-badge.miss { background: rgba(248,81,73,.18); color: var(--red); }
.mature-tag { font-size: .7rem; color: var(--accent); font-weight: 600; }
.not-mature { font-size: .7rem; color: var(--orange); font-weight: 600; }

/* ─── Memo ─── */
.pred-memo-row { margin-top: .4rem; }
.memo-toggle { font-size: .7rem; color: var(--text-dim); background: transparent; border-color: transparent; padding: 2px 0; }
.memo-box { margin-top: .35rem; padding: .6rem .8rem; background: var(--bg-overlay); border-radius: var(--radius-sm); font-size: .78rem; color: var(--text-muted); line-height: 1.6; display: flex; flex-direction: column; gap: .25rem; }
.memo-box strong { color: var(--text); }

/* ─── Actions ─── */
.pred-actions { display: flex; gap: .4rem; margin-top: .5rem; align-items: center; }
.small { font-size: .75rem; padding: 4px 10px; }
.verify-btn { border-color: var(--accent); color: var(--accent); }
.verify-early-btn { color: var(--text-dim); border-color: var(--border); font-size: .75rem; padding: 4px 10px; }
.del-btn { color: var(--text-dim); }
.result-input-sm { width: 100px; font-size: .75rem; padding: 3px 6px; }
.result-fetching { font-size: .75rem; color: var(--text-muted); }
.muted { color: var(--text-dim); }
.empty-state { text-align: center; color: var(--text-dim); padding: 3rem; font-size: .9rem; }

/* ─── Target price inputs ─── */
.fg input.target-input {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.fg input.target-input:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent); }

/* ─── Preset chips (추가 지표 체크리스트) ─── */
.extra-items-group .var-section-title { color: #f59e0b; }
.preset-chips {
  display: flex; flex-wrap: wrap; gap: .4rem;
}
.preset-chip {
  font-size: .75rem; font-weight: 600; padding: 4px 11px;
  border: 1px solid var(--border); border-radius: 12px;
  background: var(--bg-elevated); color: var(--text-muted);
  cursor: pointer; transition: var(--transition);
}
.preset-chip:hover { border-color: #f59e0b; color: #f59e0b; background: color-mix(in srgb, #f59e0b 8%, transparent); }
.preset-chip.active { border-color: #f59e0b; background: color-mix(in srgb, #f59e0b 15%, transparent); color: #f59e0b; font-weight: 700; }

.preset-values { display: flex; flex-direction: column; gap: .4rem; margin-top: .6rem; }
.preset-value-row { display: flex; align-items: center; gap: .5rem; }
.preset-value-key { font-size: .75rem; font-weight: 600; color: #f59e0b; min-width: 160px; flex-shrink: 0; }
.preset-value-input {
  flex: 1; font-size: .82rem; padding: 5px 10px;
  border-radius: var(--radius-sm); background: var(--bg-elevated);
  border: 1px solid var(--border); color: var(--text);
}
.preset-value-input.empty { border-color: #f59e0b; background: color-mix(in srgb, #f59e0b 5%, transparent); }
.preset-value-row.needs-value .preset-value-key::after {
  content: ' *'; color: #f59e0b; font-size: .65rem;
}
.preset-fetching-indicator {
  flex: 1; font-size: .78rem; color: var(--accent);
  font-style: italic; animation: pulse-opacity 1.2s ease-in-out infinite;
}
.preset-fetch-btn {
  flex-shrink: 0; padding: 4px 8px; border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid var(--accent); color: var(--accent);
  font-size: .72rem; cursor: pointer; transition: var(--transition);
}
.preset-fetch-btn:hover:not(:disabled) { background: var(--accent); color: #fff; }
.preset-fetch-btn:disabled { opacity: .5; cursor: default; }
.preset-link-btn {
  flex-shrink: 0; padding: 4px 8px; border-radius: var(--radius-sm);
  background: transparent; border: 1px solid var(--border);
  color: var(--text-muted); font-size: .72rem; cursor: pointer;
  text-decoration: none; transition: var(--transition);
  display: flex; align-items: center;
}
.preset-link-btn:hover { border-color: var(--accent); color: var(--accent); }
.extra-del {
  flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
  background: transparent; border: 1px solid var(--border-muted);
  color: var(--text-dim); font-size: .65rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: var(--transition);
}
.extra-del:hover { background: var(--red); border-color: var(--red); color: #fff; }

/* ─── Insight panel ─── */
.insight-panel {
  margin: .5rem 0; padding: .6rem .9rem;
  background: var(--bg-overlay); border-radius: var(--radius-sm);
  border: 1px solid var(--border-muted);
  display: flex; flex-direction: column; gap: .45rem;
}
.insight-bars { display: flex; flex-direction: column; gap: .3rem; }
.insight-bar-item { display: flex; align-items: center; gap: .5rem; }
.insight-label { font-size: .68rem; font-weight: 700; color: var(--text-muted); width: 28px; text-align: right; flex-shrink: 0; }
.insight-bar-bg { flex: 1; height: 7px; background: var(--bg-elevated); border-radius: 4px; overflow: hidden; max-width: 200px; }
.insight-bar-fill { height: 100%; border-radius: 4px; transition: width .4s; }
.insight-bar-fill.bull { background: var(--green); }
.insight-bar-fill.bear { background: var(--red); }
.insight-bar-fill.neutral { background: var(--yellow); }
.insight-pct { font-size: .72rem; font-weight: 700; min-width: 34px; }

.insight-meta { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; font-size: .73rem; padding-top: .3rem; border-top: 1px solid var(--border-muted); }
.insight-signal { font-weight: 600; }
.insight-signal.bull { color: var(--green); }
.insight-signal.bear { color: var(--red); }
.insight-signal.neutral { color: var(--yellow); }
.insight-target { color: var(--text-muted); }
.insight-target strong { color: var(--accent); }

/* ─── Insight suggestions ─── */
.insight-suggestions {
  padding-top: .4rem; border-top: 1px solid var(--border-muted);
  display: flex; flex-direction: column; gap: .3rem;
}
.insight-sug-title { font-size: .68rem; font-weight: 700; color: #f59e0b; margin-bottom: .15rem; }
.insight-sug-row {
  display: flex; align-items: baseline; gap: .5rem; font-size: .72rem;
}
.insight-sug-label {
  font-weight: 700; color: var(--text); white-space: nowrap;
  min-width: 140px; flex-shrink: 0;
}
.insight-sug-reason { color: var(--text-muted); line-height: 1.4; }

/* ─── Collapsible card header ─── */
.pred-card-header {
  display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  padding: .6rem .9rem; cursor: pointer; user-select: none;
  transition: background .15s;
  margin: -.75rem -.9rem .5rem;
  border-radius: var(--radius);
}
.pred-card-header:hover { background: var(--bg-overlay); }
.pred-summary-trend { display: flex; gap: .6rem; font-size: .75rem; }
.trend-item { display: flex; align-items: center; gap: .2rem; }
.trend-label { color: var(--text-dim); font-size: .68rem; }
.pred-expand-arrow { margin-left: auto; color: var(--text-dim); font-size: .75rem; transition: transform .2s; }
.pred-expand-arrow.open { transform: rotate(180deg); }

/* ─── Price chart ─── */
.price-chart-wrap {
  margin: .5rem 0; padding: .6rem .9rem;
  background: #0d1117; border-radius: var(--radius-sm);
  border: 1px solid var(--border-muted);
}
.chart-header {
  display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  margin-bottom: .5rem; font-size: .73rem;
}
.chart-title { font-weight: 700; color: var(--text); }
.chart-entry { color: #d2991c; font-family: ui-monospace, monospace; }
.chart-entry.target-label { color: #3fb950; }
.chart-change { font-weight: 700; font-family: ui-monospace, monospace; }
.chart-hint { font-size: .65rem; margin-left: auto; }
.price-chart-svg {
  width: 100%; height: 128px; display: block;
  overflow: visible;
}
.chart-legend {
  display: flex; gap: .75rem; flex-wrap: wrap;
  margin-top: .4rem; padding-top: .3rem;
  border-top: 1px solid var(--border-muted);
}
.legend-item {
  display: flex; align-items: center; gap: .3rem;
  font-size: .68rem; color: var(--text-muted);
}
.legend-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.legend-line {
  width: 16px; height: 0; border-top: 2px dashed; flex-shrink: 0;
}
.chart-loading { font-size: .75rem; color: var(--text-dim); padding: .5rem 0; }
.chart-no-data { font-size: .72rem; color: var(--text-dim); font-style: italic; }

/* ─── Auto-save tag ─── */
.auto-save-tag {
  font-size: .68rem; font-weight: 600; color: var(--accent);
  opacity: .75;
  animation: pulse-opacity 2s ease-in-out infinite;
}
@keyframes pulse-opacity {
  0%, 100% { opacity: .5; }
  50%       { opacity: 1;  }
}
</style>
