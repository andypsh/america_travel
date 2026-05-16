<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from './api.js'
import PredictionTracker from './PredictionTracker.vue'
import TravelItinerary from './TravelItinerary.vue'

// ── Tab ──
const activeTab = ref('travel') // 'news' | 'predict' | 'travel'

// ── News ──
const items     = ref([])
const stamp     = ref('')
const loading   = ref(false)
const refreshing = ref(false)
const error     = ref('')
const hours     = ref(6)
const filter    = ref('')
const onlyMulti = ref(false)
const copiedUrl = ref(null)
const copiedAll = ref(false)

const WATCH = [
  { label: 'BTC',      keys: ['bitcoin', 'btc'],               color: '#f7931a' },
  { label: 'Coinbase', keys: ['coinbase'],                      color: '#0052ff' },
  { label: 'Trump',    keys: ['trump'],                         color: '#e63946' },
  { label: '이란',     keys: ['iran'],                          color: '#2ec27e' },
  { label: '금리',     keys: ['rate', 'fed ', 'fomc', '금리'], color: '#9b59b6' },
  { label: 'TGA',      keys: ['tga', 'treasury general'],       color: '#e67e22' },
]

function matchedTopics(it) {
  const blob = `${it.title} ${it.title_ko} ${it.summary} ${it.summary_ko}`.toLowerCase()
  return WATCH.filter(w => w.keys.some(k => blob.includes(k)))
}

const filtered = computed(() => {
  let out = items.value
  if (onlyMulti.value) out = out.filter(i => (i.seen_in || []).length >= 2)
  if (filter.value.trim()) {
    const q = filter.value.trim().toLowerCase()
    const wt = WATCH.find(w => w.label.toLowerCase() === q)
    if (wt) out = out.filter(i => matchedTopics(i).some(w => w.label === wt.label))
    else out = out.filter(i =>
      ((i.title_ko||'') + ' ' + (i.title||'') + ' ' + (i.source||'')).toLowerCase().includes(q)
    )
  }
  return out
})

const multiCount = computed(() => items.value.filter(i => (i.seen_in||[]).length >= 2).length)

async function loadLatest() {
  loading.value = true; error.value = ''
  try {
    const r = await api.latest()
    items.value = r.items; stamp.value = r.stamp
  } catch (e) {
    error.value = e.message
    if (e.message.includes('404')) items.value = []
  } finally { loading.value = false }
}

async function refresh() {
  refreshing.value = true; error.value = ''
  try {
    const r = await api.refresh({ hours: Number(hours.value), limit: 1000 })
    items.value = r.items; stamp.value = r.stamp
  } catch (e) { error.value = e.message }
  finally { refreshing.value = false }
}

function buildPrompt(it) {
  const lines = [`[분석 요청]`, `제목: ${it.title_ko || it.title}`]
  if (it.title_ko && it.title_ko !== it.title) lines.push(`원문: ${it.title}`)
  lines.push(`매체: ${it.source||'—'}`, `시각: ${it.published_at||'—'}`)
  if (it.summary_ko || it.summary) lines.push(`요약: ${it.summary_ko||it.summary}`)
  if (it.body) lines.push(`\n본문:\n${it.body}`)
  lines.push(`URL: ${it.url}`, '', `위 뉴스의 핵심을 3줄로 요약하고, 관련 시장 영향과 후속 모니터링 포인트를 알려줘.`)
  return lines.join('\n')
}

function buildBulkPrompt(list) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  const hdr = [
    `[해외 금융 리서치 브리핑 — ${now} KST]`, `총 ${list.length}건`, '',
    `아래 기사 목록을 분석해줘:`,
    `1) 오늘의 주요 테마 TOP 3 (각 테마별 관련 기사 번호 포함)`,
    `2) 가장 주목할 기사 TOP 5 — 이유 한 줄씩`,
    `3) 전반적인 시장 분위기 한 단락 요약`, '', `---`, '',
  ]
  const rows = list.map((it, i) => {
    const t = (it.published_at||'').slice(0,16).replace('T',' ')
    const multi = (it.seen_in||[]).length >= 2 ? ` [×${it.seen_in.length}]` : ''
    const parts = [`${i+1}. [${t}] ${it.source||'?'}${multi}`, `   ${it.title_ko||it.title}`]
    if (it.summary_ko||it.summary) parts.push(`   요약: ${it.summary_ko||it.summary}`)
    if (it.body) parts.push(`   본문: ${it.body}`)
    return parts.join('\n')
  })
  return hdr.join('\n') + rows.join('\n\n')
}

async function copyAll() {
  const text = buildBulkPrompt(filtered.value)
  try { await navigator.clipboard.writeText(text) }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
  copiedAll.value = true; setTimeout(() => { copiedAll.value = false }, 2500)
}

async function copyPrompt(it) {
  const text = buildPrompt(it)
  try { await navigator.clipboard.writeText(text) }
  catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) }
  copiedUrl.value = it.url; setTimeout(() => { copiedUrl.value = null }, 2000)
}

function fmtTime(iso) { return iso ? iso.slice(0,16).replace('T',' ') : '' }
function fmtStamp(s) {
  if (!s) return '—'
  const m = s.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/)
  return m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}` : s
}

onMounted(loadLatest)
</script>

<template>
  <div class="app-shell">
    <!-- ── Sidebar ── -->
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">▣</span>
        <span class="logo-text">Intl. Research</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item" :class="{ active: activeTab === 'travel' }" @click="activeTab = 'travel'">
          <span class="nav-icon">🗺️</span>
          <span>사업개발</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'predict' }" @click="activeTab = 'predict'">
          <span class="nav-icon">🎯</span>
          <span>예측 트래커</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'news' }" @click="activeTab = 'news'">
          <span class="nav-icon">🗞</span>
          <span>해외 동향</span>
        </div>
      </nav>
      <div class="sidebar-footer">
        <template v-if="activeTab === 'news'">
          <div class="how-to">
            <p class="how-title">AI 분석 방법</p>
            <ol class="how-steps">
              <li>기사 카드의 <strong>복사</strong> 클릭</li>
              <li><a href="https://claude.ai" target="_blank" rel="noreferrer">claude.ai</a> 열기</li>
              <li>붙여넣기 후 전송</li>
            </ol>
          </div>
        </template>
        <span class="version-tag">v0.1</span>
        <div class="made-by">
          <span class="made-by-line"></span>
          <span class="made-by-text"><strong>글로벌사업개발팀</strong></span>
        </div>
      </div>
    </aside>

    <!-- ── Main ── -->
    <main class="main-content">
      <header class="page-header">
        <div>
          <template v-if="activeTab === 'travel'">
            <h1 class="page-title">북미 사업개발 로드맵</h1>
            <p class="page-subtitle">North America 2026 · SF · Silicon Valley · Las Vegas · Seattle</p>
          </template>
          <template v-else-if="activeTab === 'predict'">
            <h1 class="page-title">예측 트래커</h1>
            <p class="page-subtitle">COIN · CON3 — Gemini 예측 기록 &amp; 적중률 검증</p>
          </template>
          <template v-else-if="activeTab === 'news'">
            <h1 class="page-title">해외 금융 리서치 모니터링</h1>
            <p class="page-subtitle">
              글로벌 주요 매체 실시간 수집 · 한국어 자동 번역 · 교차 검증
              <span v-if="stamp" class="muted"> · 마지막 업데이트: {{ fmtStamp(stamp) }}</span>
            </p>
          </template>
        </div>
      </header>

      <!-- Travel -->
      <TravelItinerary v-if="activeTab === 'travel'" />

      <!-- Predict -->
      <PredictionTracker v-if="activeTab === 'predict'" />

      <!-- News -->
      <template v-if="activeTab === 'news'">
        <section class="card filter-card">
          <div class="topic-chips">
            <span class="chip-label">빠른 필터</span>
            <button
              v-for="w in WATCH" :key="w.label"
              class="topic-chip"
              :class="{ active: filter === w.label }"
              :style="{ '--chip-color': w.color }"
              @click="filter = (filter === w.label ? '' : w.label)"
            >{{ w.label }}</button>
            <button v-if="filter" class="chip-clear" @click="filter = ''">✕ 초기화</button>
          </div>
          <div class="filters">
            <div class="filter-group">
              <label class="filter-label">시간 윈도우</label>
              <select v-model="hours">
                <option :value="3">3시간</option>
                <option :value="6">6시간</option>
                <option :value="12">12시간</option>
                <option :value="24">24시간</option>
                <option :value="48">48시간</option>
              </select>
            </div>
            <div class="filter-group grow">
              <label class="filter-label">키워드</label>
              <input v-model="filter" placeholder="ETF, 규제, 해킹, 금리 ..." />
            </div>
            <div class="filter-group">
              <label class="filter-label">필터</label>
              <label class="check">
                <input type="checkbox" v-model="onlyMulti" />
                <span>복수 출처만</span>
              </label>
            </div>
            <div class="filter-group end">
              <button class="primary" @click="refresh" :disabled="refreshing">
                {{ refreshing ? '수집 중...' : '↻ 새로고침' }}
              </button>
            </div>
          </div>
        </section>

        <section class="list-pane">
          <div v-if="loading" class="empty">불러오는 중...</div>
          <div v-else-if="error" class="empty err">{{ error }}</div>
          <div v-else-if="!items.length" class="empty">
            수집된 데이터가 없습니다. <button class="primary" @click="refresh">지금 수집</button>
          </div>
          <template v-else>
            <div class="list-meta">
              <strong>{{ filtered.length }}</strong> / {{ items.length }} 건
              <span class="dot"></span>
              <span>복수 출처 확인 <strong>{{ multiCount }}</strong></span>
              <button class="bulk-btn" :class="{ copied: copiedAll }" @click="copyAll" style="margin-left:auto">
                {{ copiedAll ? '✓ 복사 완료!' : `📋 전체 ${filtered.length}건 복사 → claude.ai` }}
              </button>
            </div>
            <div class="list">
              <article v-for="(it, idx) in filtered" :key="it.url + idx" class="card item-card">
                <div class="item-head">
                  <span class="time mono">{{ fmtTime(it.published_at) }}</span>
                  <span class="src">{{ it.source || '?' }}</span>
                  <span
                    v-for="w in matchedTopics(it)" :key="w.label"
                    class="topic-tag"
                    :style="{ background: w.color+'22', color: w.color, borderColor: w.color+'55' }"
                  >{{ w.label }}</span>
                  <span v-if="(it.seen_in||[]).length >= 2" class="badge">×{{ it.seen_in.length }}</span>
                </div>
                <h3 class="item-title">{{ it.title_ko || it.title }}</h3>
                <p v-if="it.title_ko && it.title_ko !== it.title" class="item-orig">{{ it.title }}</p>
                <p v-if="it.summary_ko || it.summary" class="item-summary">{{ it.summary_ko || it.summary }}</p>
                <div class="item-foot">
                  <a :href="it.url" target="_blank" rel="noreferrer noopener">원문 ↗</a>
                  <button class="copy-btn" :class="{ copied: copiedUrl === it.url }" @click="copyPrompt(it)">
                    {{ copiedUrl === it.url ? '✓ 복사됨' : '📋 AI 분석용 복사' }}
                  </button>
                </div>
              </article>
            </div>
          </template>
        </section>
      </template>

    </main>
  </div>
</template>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }

/* ── Sidebar ── */
.sidebar {
  width: 220px; min-height: 100vh;
  background: var(--bg-elevated); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; padding: 1rem 0;
  position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
}
.sidebar-logo {
  display: flex; align-items: center; gap: .6rem;
  padding: .5rem 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-muted); margin-bottom: .5rem;
}
.logo-icon { font-size: 1.3rem; color: var(--accent); }
.logo-text { font-weight: 700; font-size: 1rem; }
.sidebar-nav { flex: 1; padding: .5rem 0; }
.nav-item {
  display: flex; align-items: center; gap: .7rem;
  padding: .6rem 1.2rem; color: var(--text-muted);
  font-size: .875rem; font-weight: 500;
  transition: var(--transition); border-left: 3px solid transparent; cursor: pointer;
}
.nav-item:hover, .nav-item.active { color: var(--text); background: var(--accent-bg); border-left-color: var(--accent); }
.nav-icon { font-size: 1rem; }
.sidebar-footer {
  padding: 1rem 1.2rem; border-top: 1px solid var(--border-muted);
  display: flex; flex-direction: column; gap: .8rem; align-items: stretch;
}
.how-to { display: flex; flex-direction: column; gap: .4rem; }
.how-title { font-size: .72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.how-steps { padding-left: 1.1rem; margin: 0; font-size: .75rem; color: var(--text-muted); line-height: 1.8; }
.how-steps strong, .how-steps a { color: var(--accent); }
.version-tag { align-self: center; font-size: .7rem; color: var(--text-dim); background: var(--bg-overlay); padding: 2px 10px; border-radius: 12px; }
.made-by { display: flex; flex-direction: column; align-items: center; gap: .4rem; }
.made-by-line { display: block; width: 32px; height: 1px; background: linear-gradient(90deg, transparent, var(--text-dim), transparent); }
.made-by-text { font-size: .68rem; color: var(--text-dim); letter-spacing: .06em; }
.made-by-text strong { color: var(--accent); font-weight: 600; }

/* ── Main ── */
.main-content { margin-left: 220px; flex: 1; padding: 2rem 2rem 3rem; min-height: 100vh; }
.page-header { margin-bottom: 1.5rem; }
.page-title { font-size: 1.5rem; font-weight: 700; margin-bottom: .3rem; }
.page-subtitle { color: var(--text-muted); font-size: .875rem; }
.card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.25rem; }

/* ── Filter card ── */
.filter-card { margin-bottom: 1.25rem; padding: 1rem 1.25rem; }
.topic-chips { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; margin-bottom: .85rem; padding-bottom: .75rem; border-bottom: 1px solid var(--border-muted); }
.chip-label { font-size: .68rem; color: var(--text-dim); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-right: .2rem; }
.topic-chip { font-size: .75rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; background: var(--bg-overlay); border: 1px solid var(--border); color: var(--text-muted); transition: var(--transition); }
.topic-chip:hover { border-color: var(--chip-color, var(--accent)); color: var(--chip-color, var(--accent)); }
.topic-chip.active { background: color-mix(in srgb, var(--chip-color, var(--accent)) 18%, transparent); border-color: var(--chip-color, var(--accent)); color: var(--chip-color, var(--accent)); }
.chip-clear { font-size: .72rem; padding: 3px 10px; border-radius: 20px; color: var(--text-dim); }
.filters { display: flex; gap: 1.25rem; align-items: flex-end; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: .3rem; }
.filter-group.grow { flex: 1; min-width: 200px; }
.filter-group.end { margin-left: auto; }
.filter-label { font-size: .7rem; color: var(--text-dim); font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.check { display: flex; align-items: center; gap: .4rem; cursor: pointer; padding: 6px 0; }
.check input { margin: 0; }

/* ── Article list ── */
.empty { padding: 3rem 1rem; text-align: center; color: var(--text-muted); }
.empty.err { color: var(--red); }
.list-meta { display: flex; align-items: center; gap: .5rem; font-size: .8rem; color: var(--text-muted); margin-bottom: .75rem; padding: 0 .25rem; }
.list-meta strong { color: var(--text); font-weight: 700; }
.dot { width: 3px; height: 3px; background: var(--text-dim); border-radius: 50%; display: inline-block; }
.list { display: flex; flex-direction: column; gap: .6rem; }
.item-card { padding: .85rem 1rem; background: var(--bg); transition: var(--transition); }
.item-card:hover { border-color: var(--accent); box-shadow: var(--shadow-sm); }
.item-head { display: flex; align-items: center; gap: .6rem; font-size: .72rem; color: var(--text-dim); margin-bottom: .4rem; }
.time { font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-variant-numeric: tabular-nums; }
.src { color: var(--text-muted); font-weight: 500; background: var(--bg-overlay); padding: 1px 7px; border-radius: 8px; }
.topic-tag { padding: 1px 7px; border-radius: 8px; font-size: .65rem; font-weight: 700; border: 1px solid; }
.badge { background: var(--orange); color: #fff; padding: 1px 7px; border-radius: 8px; font-size: .65rem; font-weight: 700; margin-left: auto; }
.item-title { font-size: .95rem; font-weight: 600; margin-bottom: .3rem; line-height: 1.4; }
.item-orig { font-size: .78rem; color: var(--text-dim); margin-bottom: .35rem; font-style: italic; }
.item-summary { font-size: .8rem; color: var(--text-muted); line-height: 1.55; margin-bottom: .5rem; }
.item-foot { display: flex; justify-content: space-between; align-items: center; font-size: .72rem; margin-top: .4rem; }
.copy-btn { font-size: .72rem; padding: 4px 10px; border-radius: var(--radius-sm); transition: var(--transition); }
.copy-btn.copied { background: rgba(63,185,80,.15); border-color: var(--green); color: var(--green); }
.bulk-btn { font-size: .78rem; padding: 5px 14px; font-weight: 600; background: var(--accent); color: #fff; border-color: var(--accent); border-radius: var(--radius-sm); transition: var(--transition); white-space: nowrap; }
.bulk-btn:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); color: #fff; }
.bulk-btn.copied { background: rgba(63,185,80,.2); border-color: var(--green); color: var(--green); }

.muted { color: var(--text-muted); }
.mono { font-family: ui-monospace, 'SF Mono', Consolas, monospace; }

@media (max-width: 768px) {
  .sidebar { width: 64px; }
  .sidebar .logo-text, .nav-item span:not(.nav-icon), .sidebar-footer { display: none; }
  .main-content { margin-left: 64px; padding: 1rem; }
}
</style>
