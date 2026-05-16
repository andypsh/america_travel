<script setup>
import { ref } from 'vue'
import TravelItinerary from './TravelItinerary.vue'
import TravelMap from './TravelMap.vue'

const activeTab = ref('travel') // 'travel' | 'map'
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">▣</span>
        <span class="logo-text">Intl. Research</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-item" :class="{ active: activeTab === 'travel' }" @click="activeTab = 'travel'">
          <span class="nav-icon">📋</span>
          <span>일정표</span>
        </div>
        <div class="nav-item" :class="{ active: activeTab === 'map' }" @click="activeTab = 'map'">
          <span class="nav-icon">🗺️</span>
          <span>동선 지도</span>
        </div>
      </nav>
      <div class="sidebar-footer">
        <a href="/docs/" class="docs-link" target="_blank" rel="noopener">📚 기술 문서</a>
        <span class="version-tag">v0.1</span>
        <div class="made-by">
          <span class="made-by-line"></span>
          <span class="made-by-text"><strong>글로벌사업개발팀</strong></span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <header class="page-header">
        <template v-if="activeTab === 'travel'">
          <h1 class="page-title">북미 사업개발 로드맵</h1>
          <p class="page-subtitle">North America 2026 · SF · Yosemite · Seattle · Las Vegas</p>
        </template>
        <template v-else-if="activeTab === 'map'">
          <h1 class="page-title">동선 지도</h1>
          <p class="page-subtitle">도시별 이동 경로 시각화 · Plan A / Plan B 비교</p>
        </template>
      </header>
      <TravelItinerary v-if="activeTab === 'travel'" />
      <TravelMap v-if="activeTab === 'map'" />
    </main>
  </div>
</template>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }

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
.logo-text { font-weight: 700; font-size: 1rem; color: var(--text); }
.sidebar-nav { flex: 1; padding: .5rem 0; }
.nav-item {
  display: flex; align-items: center; gap: .7rem;
  padding: .6rem 1.2rem; color: var(--text-muted);
  font-size: .875rem; font-weight: 600;
  transition: var(--transition); border-left: 3px solid transparent;
  cursor: pointer;
}
.nav-item:hover { color: var(--text); background: var(--accent-bg); }
.nav-item.active { color: var(--text); background: var(--accent-bg); border-left-color: var(--accent); }
.nav-icon { font-size: 1rem; }
.sidebar-footer {
  padding: 1rem 1.2rem; border-top: 1px solid var(--border-muted);
  display: flex; flex-direction: column; gap: .8rem; align-items: stretch;
}
.docs-link {
  display: block; text-align: center; padding: 8px 10px;
  background: var(--accent-bg); color: var(--accent);
  border: 1px solid var(--accent); border-radius: 8px;
  font-size: .8rem; font-weight: 700; text-decoration: none;
  transition: var(--transition);
}
.docs-link:hover { background: var(--accent); color: #fff; }
.version-tag { align-self: center; font-size: .72rem; color: var(--text-muted); background: var(--bg-overlay); padding: 2px 10px; border-radius: 12px; }
.made-by { display: flex; flex-direction: column; align-items: center; gap: .4rem; }
.made-by-line { display: block; width: 32px; height: 1px; background: linear-gradient(90deg, transparent, var(--text-muted), transparent); }
.made-by-text { font-size: .72rem; color: var(--text-muted); letter-spacing: .06em; }
.made-by-text strong { color: var(--accent); font-weight: 700; }

.main-content { margin-left: 220px; flex: 1; padding: 2rem 2rem 3rem; min-height: 100vh; }
.page-header { margin-bottom: 1.5rem; }
.page-title { font-size: 1.6rem; font-weight: 700; margin-bottom: .3rem; color: var(--text); }
.page-subtitle { color: var(--text-muted); font-size: .9rem; }

@media (max-width: 768px) {
  .sidebar { width: 64px; }
  .sidebar .logo-text, .nav-item span:not(.nav-icon), .sidebar-footer { display: none; }
  .main-content { margin-left: 64px; padding: 1rem; }
}
</style>
