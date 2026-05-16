<script setup>
import { ref, computed, reactive } from 'vue'

const KRW = 1450
const activePlan = ref('a')

function usd(n) { return `$${n.toLocaleString()}` }
function krw(n) { return `₩${Math.round(n * KRW / 10000).toLocaleString()}만` }

// ── 아코디언 섹션 상태 ──
const open = reactive({
  activities: true,
  timeline:   true,
  worldcup:   true,
  flights:    false,
  giants:     false,
  hotels:     false,
  booking:    false,
})

// ── 항공편 ──
const flights = [
  { label: '출국', flight: 'OZ212', route: 'ICN → SFO', dep: '6/26(금) 20:50 KST', arr: '6/26(금) ~14:30 PDT', aircraft: 'A350-900', duration: '약 10시간 10분' },
  { label: '귀국', flight: 'OZ211', route: 'SFO → ICN', dep: '7/4(토) 23:50 PDT', arr: '7/6(일) 05:45 KST', aircraft: 'A350-900', duration: '약 12시간 55분' },
]

// ── Giants ──
const giants = [
  { date: '6/26 금', time: '19:15', opponent: 'vs Atlanta Braves', note: '⭐ 도착 당일 — 체크인 후 관람 (이번 일정 관람 경기)' },
  { date: '6/27 토', time: '18:05', opponent: 'vs Atlanta Braves', note: '⛰ 요세미티 1박 — 관람 불가' },
  { date: '6/28 일', time: '13:05', opponent: 'vs Atlanta Braves', note: '⛰ 요세미티 → SF 복귀일 — 관람 불가' },
]

// ── 월드컵 시나리오 (FIFA Annex C 원문 파싱 결과) ──
const wcRows = [
  { rank: '조 1위', match: 'M79', date: '6/30', venue: 'Estadio Azteca, 멕시코시티', plan: null,  ok: false, note: '❌ 여행 중 방문 불가' },
  { rank: '조 2위', match: 'M73', date: '6/29 12:00 PT', venue: 'SoFi Stadium, Inglewood (LA)', plan: 'B', ok: true, note: '→ Plan B' },
  { rank: '조 3위', match: 'M82', date: '7/1 13:00 PT',  venue: 'Lumen Field, Seattle',         plan: 'A', ok: true, note: '→ Plan A' },
]
// Annex C 파싱 결과 (FIFA 공식 PDF)
const annexC = { qualify: 330, total: 495, seattle: 314, foxborough: 16 }

// ── Plan A: SF(4박, 중간 YOS 1박은 짐 보관용 통박) → SEA(1박) → LV(3박) → SFO ──
const aHotels = [
  { city: '샌프란시스코', tag: 'SF',  nights: 4, dates: '6/26~6/30', economy: 190, mid: 230, note: 'Palace Hotel · 4박 통째로 (Yosemite 다녀와도 짐 보관 위해 6/27 빈 1박 유지)' },
  { city: 'Yosemite',    tag: 'YOS', nights: 1, dates: '6/27~6/28', economy: 200, mid: 350, note: 'Curry Village or Half Dome Village · 6~12개월 전 예약 필수 (recreation.gov / travelyosemite.com)' },
  { city: '시애틀',       tag: 'SEA', nights: 1, dates: '6/30~7/1',  economy: 280, mid: 400, note: 'Hyatt Regency · ⚠️ 월드컵 서징 · 경기 당일 밤 LV 이동' },
  { city: '라스베이거스',  tag: 'LV',  nights: 3, dates: '7/1~7/4',  economy: 140, mid: 240, note: 'Paris LV (24h 체크인) · 평일 요금 · 7/4 저녁 SFO' },
]
const aDays = [
  { date: '6/26 금', city: '샌프란시스코', cityTag: 'SF', icon: '✈️', items: [
    { time: '~14:30', text: 'OZ212 SFO 도착 — Palace Hotel 체크인' },
    { time: '19:15', text: '⚾ Giants vs Braves @ Oracle Park (도착 당일 경기)', baseball: true },
  ]},
  { date: '6/27 토', city: '요세미티 국립공원', cityTag: 'YOS', icon: '⛰️', items: [
    { time: '06:30-07:00', text: '🏨 Palace Hotel 조식 후 출발 · 요세미티 1박짐만 챙기고 큰짐은 호텔 보관' },
    { time: '08:00~', text: '🚙 SF → Yosemite 드라이브 (3.5시간) · Hwy 120 scenic route' },
    { time: '~12:00', text: '🏕 Yosemite 도착 · Curry Village / Half Dome Village 체크인' },
    { time: '13:00~16:00', text: '⛰ 오후 투어 — Yosemite Valley 순환 · Bridalveil Fall · 엘 캐피탄 전망' },
    { time: '17:00~', text: '🍽 저녁 식사 · 롯지 라운지 · Fireplace · 야간 폭포 야경 (6월 카스케이딩 최고)' },
  ]},
  { date: '6/28 일', city: '요세미티 → 샌프란시스코', cityTag: 'YOS→SF', icon: '⛰️', items: [
    { time: '07:00', text: '🌅 아침 조식 · 일출 감상 (El Capitan / Cathedral Rocks)' },
    { time: '08:00~12:00', text: '🥾 가이드 하이킹 투어 (Tunnel View · Mirror Lake · Vernal Falls viewpoint)' },
    { time: '점심', text: '🥪 트레일상 피크닉 or Yosemite Valley Lodge 카페' },
    { time: '14:00~15:00', text: '🏔 Glacier Point 파노라마 뷰 · 마지막 자연 감상' },
    { time: '15:30~', text: '🚙 Yosemite → SF 귀환 드라이브 (3.5시간)' },
    { time: '~22:00', text: '🏨 Palace Hotel 귀환 · 짐 찾기 · 늦은 저녁 식사' },
  ]},
  { date: '6/29 월', city: '샌프란시스코', cityTag: 'SF', icon: '✈️', items: [
    { time: '06:30~', text: '🚙 Palace Hotel → PAO (Palo Alto Airport) 이동 (40분)' },
    { time: '07:00-09:00', text: '✈️ SF Bay 경비행기 투어 — Golden Gate 상공 · Bay Bridge · Alcatraz · Marin Headlands 절경', bold: true },
    { time: '09:30~', text: '🚙 PAO → SF 귀환 (40분)' },
    { time: '11:00', text: '⛴ Alcatraz Cruises — Pier 33 출발 (사전 예약 필수)' },
    { time: '11:45-14:30', text: '🏝 Alcatraz Island 투어 (탈옥 역사 · 가이드 투어 · Bay View)' },
    { time: '15:00~', text: '🚴 Golden Gate Bridge 자전거 라이딩 · Sausalito 페리' },
    { time: '저녁', text: '씨푸드 · Mission District 저녁 · 내일 SEA 이동 준비' },
  ]},
  { date: '6/30 화', city: '샌프란시스코 → 시애틀', cityTag: 'SF→SEA', icon: '✈️', items: [
    { time: '08:00-09:00', text: '🏨 Palace Hotel 조식 · 체크아웃 · 수화물 최종 확인' },
    { time: '09:30~', text: '🚙 Palace Hotel → SFO 이동 (30~40분)' },
    { time: '13:00~', text: '✈️ SFO → SEA 국내선 출발 (약 1시간 30분)' },
    { time: '~15:30', text: '🏨 Hyatt Regency SEA 도착 · 체크인 · 가벼운 저녁 식사' },
    { time: '저녁', text: 'Pike Place Market 탐방 · 내일 경기 최종 준비' },
  ]},
  { date: '7/1 수', city: '시애틀 · 라스베이거스', cityTag: 'SEA→LV', icon: '⚽', highlight: true, items: [
    { time: '09:00-11:00', text: '🗼 Space Needle · Seattle Center 아침 활동 · Pike Place Market 커피' },
    { time: '11:30~', text: '🏟 Lumen Field 도보/Uber 이동 (downtown에서 20분)' },
    { time: '12:00 PT', text: '🏟 한국 응원단 합류 · 좌석 확인 · 마지막 스낵' },
    { time: '13:00 PT', text: '⚽ R32 Match 82 — Lumen Field (한국 조3위 vs 16강 약자) · KOREA FIGHTING!', bold: true },
    { time: '~16:00', text: '🎉 경기 후 응원 · 야경 기념촬영 · Lumen 주변 축제 분위기' },
    { time: '16:30-17:00', text: '🚙 Lumen Field → SEA 공항 이동 (30분)' },
    { time: '17:30~', text: '✈️ SEA → LAS 야간 국내선 (약 2.5시간) · 기내 식사' },
    { time: '~20:00', text: '🎰 라스베이거스 도착 · 심야 체크인 (Paris Las Vegas 24h) · The Strip 야경 · 카지노 오리엔테이션' },
  ]},
  { date: '7/2 목', city: '라스베이거스', cityTag: 'LV', icon: '🎰', items: [
    { time: '오전', text: '늦잠 · 호텔 풀장 · 브런치 (전날 경기 피로 회복)' },
    { time: '오후', text: 'Fremont Street Experience · 구시가지 집라인' },
    { time: '저녁', text: 'Bellagio 분수쇼 · 카지노 🎡 빅휠 · Caesars Palace' },
  ]},
  { date: '7/3 금', city: '라스베이거스', cityTag: 'LV', icon: '🎯', items: [
    { time: '오전', text: 'SpeedVegas 슈퍼카 레이싱 or ATV 사막 투어' },
    { time: '오후', text: 'Topgolf Las Vegas · Forum Shops 쇼핑' },
    { time: '저녁', text: 'Bacchanal 뷔페 or 스테이크하우스 · 마지막 카지노' },
  ]},
  { date: '7/4 토', city: '라스베이거스 → SFO 귀국', cityTag: 'LV→SFO', icon: '🏠',
    note: '미국 독립기념일 — 공항 혼잡 예상, 오후 일찍 이동',
    items: [
      { time: '낮', text: '체크아웃 · 마지막 쇼핑 · 카지노 마무리' },
      { time: '~17:00', text: 'LAS → SFO 국내선 (약 1시간 20분)' },
      { time: '~18:30', text: 'SFO 도착 · 국제선 탑승동 이동 · 체크인' },
      { time: '23:50', text: 'OZ211 SFO 출발 → 인천 7/6(일) 05:45 도착', bold: true },
  ]},
]

// ── Plan B: SF(5박, 중간 YOS 1박은 짐 보관용 통박, 6/29 LA 당일치기) → LV(3박) → SFO ──
const laHotels = [
  { city: '샌프란시스코', tag: 'SF',  nights: 5, dates: '6/26~7/1', economy: 190, mid: 230, note: 'Palace Hotel · 5박 통째로 (Yosemite 1박·LA 당일치기 모두 짐 보관 위해 빈박 유지)' },
  { city: 'Yosemite',    tag: 'YOS', nights: 1, dates: '6/27~6/28', economy: 200, mid: 350, note: 'Curry Village or Half Dome Village · 6~12개월 전 예약 필수' },
  { city: '라스베이거스',  tag: 'LV',  nights: 3, dates: '7/1~7/4',  economy: 140, mid: 240, note: 'Paris LV · 평일 요금 · 7/4 저녁 SFO 이동' },
]
const laDays = [
  { date: '6/26 금', city: '샌프란시스코', cityTag: 'SF', icon: '✈️', items: [
    { time: '~14:30', text: 'OZ212 SFO 도착 — 호텔 체크인' },
    { time: '19:15', text: '⚾ Giants vs Braves @ Oracle Park (도착 당일)', baseball: true },
  ]},
  { date: '6/27 토', city: '요세미티 국립공원', cityTag: 'YOS', icon: '⛰️', items: [
    { time: '06:30-07:00', text: '🏨 호텔 조식 후 출발 · 요세미티 1박짐만 챙기고 큰짐은 호텔 보관' },
    { time: '08:00~', text: '🚙 SF → Yosemite 드라이브 (3.5시간) · Hwy 120 scenic route' },
    { time: '~12:00', text: '🏕 Yosemite 도착 · Curry Village / Half Dome Village 체크인' },
    { time: '13:00~16:00', text: '⛰ 오후 투어 — Yosemite Valley 순환 · Bridalveil Fall · 엘 캐피탄 전망' },
    { time: '17:00~', text: '🍽 저녁 식사 · 롯지 라운지 · Fireplace · 야간 폭포 야경' },
  ]},
  { date: '6/28 일', city: '요세미티 → 샌프란시스코', cityTag: 'YOS→SF', icon: '⛰️', items: [
    { time: '07:00', text: '🌅 아침 조식 · 일출 감상 (El Capitan / Cathedral Rocks)' },
    { time: '08:00~12:00', text: '🥾 가이드 하이킹 투어 (Tunnel View · Mirror Lake · Vernal Falls viewpoint)' },
    { time: '점심', text: '🥪 트레일상 피크닉 or Yosemite Valley Lodge 카페' },
    { time: '14:00~15:00', text: '🏔 Glacier Point 파노라마 뷰 · 마지막 자연 감상' },
    { time: '15:30~', text: '🚙 Yosemite → SF 귀환 드라이브 (3.5시간)' },
    { time: '~22:00', text: '🏨 SF 호텔 귀환 · 짐 찾기 · 늦은 저녁 식사' },
  ]},
  { date: '6/29 월', city: 'KR ✈️ 경비행기 SF ↔ LA', cityTag: 'SF↔LA', icon: '🇰🇷', highlight: true, items: [
    { time: '07:00', text: '🛩️ PAO/SQL 출발 — 렌탈 경비행기 (Cessna 182 / SR22)' },
    { time: '~09:15', text: '🛬 HHR (Hawthorne Muni) 착륙 · TFR 발동 전 여유 있게 착지 ✅' },
    { time: '09:30~', text: '🛴 K Line 또는 킥보드로 SoFi 이동 (1.8mi · 15~40분)' },
    { time: '10:30~', text: '🏟 SoFi Stadium 입장 · 한국 응원단 합류' },
    { time: '12:00 PT', text: '🏟 한국(조A 2위) vs 조B 2위 — SoFi Stadium (Match 73)', bold: true },
    { time: '~15:30', text: '경기 종료 · HHR 귀환 대기 (TFR 17:00까지 활성)' },
    { time: '~16:00', text: '🥤 인근 카페/바에서 경기 복기 🍻 · TFR 해제 대기' },
    { time: '17:00~', text: '🛩️ HHR 출발 → PAO/SQL 귀환 (~2h 15m)' },
    { time: '~19:30', text: 'SF 귀환 · 호텔 체크인 · 저녁 식사' },
  ]},
  { date: '6/30 화', city: '실리콘밸리', cityTag: 'SV', icon: '💻', items: [
    { time: '09:30~', text: '🚂 Caltrain 또는 🚙 Uber → Stanford Campus (Palo Alto, 1시간)' },
    { time: '10:00-12:00', text: '🏛 Stanford 캠퍼스 산책 · Hoover Tower · Oval · 기념품샵' },
    { time: '12:00-13:00', text: '🔵 Google Visitor Center (예약 필수, 무료) · 제품 몰 투어 · 주변 Sunnyvale' },
    { time: '13:00-14:00', text: '🍜 Palo Alto / Mountain View 점심 (인도, 중국, 한식)' },
    { time: '14:30~', text: '🍎 Apple Park Visitor Center · Computer History Museum (선택)' },
    { time: '16:30~', text: '🚙 Caltrain/Uber로 SF 귀환 (1시간) · Union Square 마지막 쇼핑' },
    { time: '저녁', text: '씨푸드 마지막 저녁 · 내일 LV 이동 준비' },
  ]},
  { date: '7/1 수', city: '샌프란시스코 → 라스베이거스', cityTag: 'SF→LV', icon: '✈️', items: [
    { time: '오전', text: 'Fisherman\'s Wharf 브런치 · 마지막 SF' },
    { time: '~13:00', text: 'SFO → LAS 국내선 (약 1시간 20분)' },
    { time: '~15:00', text: '라스베이거스 호텔 체크인' },
    { time: '저녁', text: 'The Strip 야경 · Bellagio 분수쇼 · 카지노 🎡 빅휠' },
  ]},
  { date: '7/2 목', city: '라스베이거스', cityTag: 'LV', icon: '🎰', items: [
    { time: '오전', text: 'Fremont Street Experience (구시가지 · 집라인)' },
    { time: '오후', text: 'SpeedVegas 슈퍼카 · Topgolf · Forum Shops' },
    { time: '저녁', text: '쇼 관람 (Cirque du Soleil 등) · 카지노' },
  ]},
  { date: '7/3 금', city: '라스베이거스', cityTag: 'LV', icon: '🎯', items: [
    { time: '오전', text: '후버댐 투어 (왕복 약 3시간)' },
    { time: '오후', text: 'Grand Canal Shoppes · iFly 실내 스카이다이빙' },
    { time: '저녁', text: 'Bacchanal 뷔페 or 스테이크하우스 · 마지막 카지노' },
  ]},
  { date: '7/4 토', city: '라스베이거스 → SFO 귀국', cityTag: 'LV→SFO', icon: '🏠',
    note: '미국 독립기념일 — 공항 혼잡 예상, 오후 일찍 이동',
    items: [
      { time: '낮', text: '체크아웃 · 마지막 쇼핑' },
      { time: '~17:00', text: 'LAS → SFO 국내선 (약 1시간 20분)' },
      { time: '~18:30', text: 'SFO 도착 · 국제선 체크인' },
      { time: '23:50', text: 'OZ211 SFO 출발 → 인천 7/6(일) 05:45 도착', bold: true },
  ]},
]

// ── 액티비티 ──
const activeActCity = ref('LV')
const actCityLabel = { SF: '🌉 샌프란시스코', LV: '🎰 라스베이거스', SEA: '🌲 시애틀' }

const activities = {
  SF: [
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
    { emoji: '🔫', name: '사격장 (자동소총 체험)', type: '액티브', price: '$60~150/인', duration: '1~2h',
      desc: 'The Gun Store / LV Outdoor Range — AR-15·AK-47·M16 실탄 사격 체험', tip: '스트립에서 차로 10~20분 · 패키지 다양 · 신분증 필수' },
    { emoji: '🚁', name: '그랜드캐니언 헬기 투어', type: '액티브', price: '$200~400/인', duration: '4~6h',
      desc: 'LV 출발 → 협곡 착륙 패키지 or 상공 비행 선택 · 점심 포함', tip: '새벽 일찍 출발 권장 (여름 낮 열기 심함)' },
    { emoji: '🏎️', name: 'SpeedVegas 슈퍼카 레이싱', type: '액티브', price: '$99~299/인', duration: '1~2h',
      desc: '람보르기니·페라리·포르쉐 실제 서킷 드라이빙 · 전문 강사 동승', tip: '스트립 남쪽 15분 · 사전 예약 필수 · 국제면허 필요' },
    { emoji: '⛳', name: 'Topgolf Las Vegas', type: '레저', price: '$35~55/h (베이)', duration: '2h',
      desc: 'The Strip 옆 · 3층 · 야경 보며 골프 · 식음료 주문 가능', tip: '베이 1개당 6명까지 · 저녁 예약 권장' },
    { emoji: '🛻', name: 'ATV 사막 투어', type: '액티브', price: '$150~250/인', duration: '3~4h',
      desc: 'Lake Mead 국립공원 사막 코스 질주 · 헬기+ATV+사격 트리플 콤보 패키지 존재', tip: '여름 오전 일찍 or 저녁 투어 권장' },
    { emoji: '🪂', name: 'iFly 실내 스카이다이빙', type: '액티브', price: '$80~100/인', duration: '1h',
      desc: '풍동 이용 자유낙하 체험 · 면허·경험 불필요 · 5분 사전 교육', tip: '스트립 내 위치 · 당일 워크인 가능' },
    { emoji: '🎾', name: 'Wimbledon 스포츠북 관람', type: '관람', price: '무료(베팅 선택)', duration: '자유',
      desc: '6/29 Wimbledon 개막 · 카지노 스포츠북 대형 스크린 · 음료 서비스', tip: 'MGM Grand · Wynn · Caesars 스포츠북 추천' },
    { emoji: '⚽', name: 'Desert Breeze 픽업 사커', type: '스포츠', price: '무료~$10', duration: '1~2h',
      desc: 'LV 최대 축구 시설 12면 · 저녁 드롭인 픽업게임 · 낮 40도 → 반드시 저녁 6시 이후만 가능 · 라틴계 상주', tip: 'Playo 앱으로 저녁 게임 확인 후 이동 · 물 2L 이상 필수 · 스트립에서 차 15분' },
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

// ── 예약 전략 ──
// ── 일자별 잠자리 (A/B 공통: 6/26~6/29, 7/1~7/3 / 분기: 6/30) ──
const sleepByNight = [
  { date: '6/26 금', a: 'SF · Palace Hotel',         b: 'SF · Palace Hotel',         aTag: 'SF',  bTag: 'SF',  action: 'now',     same: true,  note: '도착 당일 — Giants 경기 후 첫 박' },
  { date: '6/27 토', a: 'YOS · Curry Village',       b: 'YOS · Curry Village',       aTag: 'YOS', bTag: 'YOS', action: 'now',     same: true,  note: '⚠️ SF Palace는 이 날 밤 빈박 유지 (짐 보관)' },
  { date: '6/28 일', a: 'SF · Palace Hotel (재투숙)', b: 'SF · Palace Hotel (재투숙)', aTag: 'SF',  bTag: 'SF',  action: 'now',     same: true,  note: 'Yosemite 다녀와서 같은 방으로 복귀' },
  { date: '6/29 월', a: 'SF · Palace Hotel',         b: 'SF · Palace Hotel',         aTag: 'SF',  bTag: 'SF',  action: 'now',     same: true,  note: 'A: SF Bay 경비행기·Alcatraz / B: LA 당일치기' },
  { date: '6/30 화', a: 'SEA · Hyatt Regency',       b: 'SF · Palace Hotel',         aTag: 'SEA', bTag: 'SF',  action: 'standby', same: false, note: '🔀 분기점 — 6/24 경기 결과 후 한쪽 취소' },
  { date: '7/1 수',  a: 'LV · Paris Las Vegas',      b: 'LV · Paris Las Vegas',      aTag: 'LV',  bTag: 'LV',  action: 'now',     same: true,  note: 'A: 시애틀 경기 후 야간 도착 / B: SFO→LAS 오후 도착' },
  { date: '7/2 목',  a: 'LV · Paris Las Vegas',      b: 'LV · Paris Las Vegas',      aTag: 'LV',  bTag: 'LV',  action: 'now',     same: true,  note: '' },
  { date: '7/3 금',  a: 'LV · Paris Las Vegas',      b: 'LV · Paris Las Vegas',      aTag: 'LV',  bTag: 'LV',  action: 'now',     same: true,  note: '7/4 아침 체크아웃' },
]

const bookingItems = [
  // ── 즉시 예약 (A/B 공통) ──
  { id: 'sf-base',  label: 'SF Palace Hotel (4박 통째로)', tag: 'SF',  dates: '6/26 → 6/30', nights: 4, plans: ['A','B'], type: 'now',
    note: '💡 6/27 Yosemite 1박 동안 같은 방 유지 → 큰 짐 보관 + 6/28 재체크인 불필요 · 4박 요금 통째 부담 (Plan B는 6/30→7/1 연장 별도)' },
  { id: 'yosemite', label: 'Yosemite Curry Village', tag: 'YOS', dates: '6/27 → 6/28', nights: 1, plans: ['A','B'], type: 'now',
    note: '⚠️ 6~12개월 전 예약 필수 · recreation.gov 또는 travelyosemite.com · 6월은 폭포 시즌 만실 위험 → 가장 먼저 예약' },
  { id: 'lv-base', label: 'LV Paris Las Vegas (3박)', tag: 'LV', dates: '7/1 → 7/4', nights: 3, plans: ['A','B'], type: 'now',
    note: '24h 프런트 (Plan A 심야 도착) · 평일 요금 · A/B 날짜·호텔 완전 동일 → 1개만 예약' },

  // ── 6/24 경기 후 분기 — 무료취소 가능 상품으로 동시 대기 ──
  { id: 'sea-a',   label: 'SEA Hyatt Regency', tag: 'SEA', dates: '6/30 → 7/1', nights: 1, plans: ['A'], type: 'standby',
    note: '🟣 Plan A 전용 — 7/1 R32 Match 82 (Lumen Field) 다음날 LV 이동 · 월드컵 서징 가격 ⚠️' },
  { id: 'sf-b-ext', label: 'SF Palace Hotel 연장 1박', tag: 'SF', dates: '6/30 → 7/1', nights: 1, plans: ['B'], type: 'standby',
    note: '🔴 Plan B 전용 — 6/30 실리콘밸리 당일치기 후 SF 복귀 · 7/1 오후 LAS 비행 · 가능하면 동일 호텔 연장' },
]

const decisions = [
  { result: '조3위 진출 (Plan A 확정)', planTag: 'A', color: '#7c3aed',
    keep:   ['SF Palace 4박 (6/26~6/30)', 'Yosemite 1박 (6/27~6/28)', 'SEA Hyatt 1박 (6/30~7/1)', 'LV Paris 3박 (7/1~7/4)'],
    cancel: ['SF Palace 연장 (B용)'] },
  { result: '조2위 진출 (Plan B 확정)', planTag: 'B', color: '#e11d48',
    keep:   ['SF Palace 4박 (6/26~6/30)', 'Yosemite 1박 (6/27~6/28)', 'SF Palace 연장 (6/30~7/1)', 'LV Paris 3박 (7/1~7/4)'],
    cancel: ['SEA Hyatt 1박 (A용)'] },
]

// ── Computed ──
const currentDays = computed(() => activePlan.value === 'a' ? aDays : laDays)
const currentHotels = computed(() => activePlan.value === 'a' ? aHotels : laHotels)
function totalFor(tier) { return currentHotels.value.reduce((s, h) => s + h[tier] * h.nights, 0) }

const cityColors = {
  'SF': '#0052cc', 'SF→SEA': '#0ea5e9', 'SF→LA': '#e11d48', 'SF→LV': '#7c3aed',
  'LA': '#dc2626', 'LA→LV': '#f59e0b', 'LA→SF': '#f97316', 'SF↔LA': '#e11d48', 'LV': '#d97706', 'LV→SF': '#6366f1',
  'LV→SEA': '#10b981', 'SEA': '#0ea5e9', 'SEA→SF': '#6366f1', 'SEA→LV': '#f59e0b', 'SEA→SFO': '#64748b', 'LV→SFO': '#64748b', 'SV': '#059669', 'SFO': '#64748b',
  'YOS': '#22c55e', 'YOS→SF': '#f59e0b',
}
</script>

<template>
  <div class="itinerary">

    <!-- ── 플랜 토글 (항상 노출) ── -->
    <div class="plan-toggle">
      <button class="plan-btn plan-a" :class="{ active: activePlan === 'a' }" @click="activePlan = 'a'">
        🏟️ Plan A — 시애틀 R32 + LV <span class="plan-badge">조3위</span>
        <span class="plan-sub">SF(4박) → SEA(1박) → LV(3박) → SFO 귀국 · Match 82 Lumen Field 7/1</span>
      </button>
      <button class="plan-btn plan-b" :class="{ active: activePlan === 'b' }" @click="activePlan = 'b'">
        🇰🇷 Plan B — LA 한국 R32 + LV <span class="plan-badge red">조2위</span>
        <span class="plan-sub">SF(5박, 🛩경비행기 당일치기 LA) → LV(3박) → SFO · Match 73 SoFi 6/29</span>
      </button>
    </div>

    <!-- ── 🎯 액티비티 (플랜 선택 직후 바로 노출) ── -->
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
            <thead><tr><th>도시</th><th>기간</th><th>박수</th><th>이코노미/박</th><th>추천/박</th><th>비고</th></tr></thead>
            <tbody>
              <tr v-for="h in currentHotels" :key="h.dates + h.city">
                <td><span class="ct-tag" :style="{ background: (cityColors[h.tag]||'#334155')+'22', color: cityColors[h.tag]||'#94a3b8' }">{{ h.city }}</span></td>
                <td class="mono">{{ h.dates }}</td>
                <td class="center">{{ h.nights }}박</td>
                <td class="num eco">{{ usd(h.economy) }}</td>
                <td class="num mid">{{ usd(h.mid) }}</td>
                <td class="note-cell">{{ h.note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="cost-summary">
          <div class="cost-block eco-block">
            <div class="cb-label">이코노미 합계</div>
            <div class="cb-usd">{{ usd(totalFor('economy')) }}</div>
            <div class="cb-krw">{{ krw(totalFor('economy')) }}</div>
            <div class="cb-per">1인 {{ usd(Math.round(totalFor('economy')/3)) }} · {{ krw(totalFor('economy')/3) }}</div>
          </div>
          <div class="cost-block mid-block">
            <div class="cb-label">추천 합계</div>
            <div class="cb-usd">{{ usd(totalFor('mid')) }}</div>
            <div class="cb-krw">{{ krw(totalFor('mid')) }}</div>
            <div class="cb-per">1인 {{ usd(Math.round(totalFor('mid')/3)) }} · {{ krw(totalFor('mid')/3) }}</div>
          </div>
        </div>
        <p class="cost-note">※ 1실 3인 공유 기준 · 세금·리조트피 포함 추정 · 실제 가격은 예약 시 확인 필요</p>
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
          <p class="sleep-hint">💡 <strong>핵심 트릭</strong> — Yosemite 1박 (6/27 밤) 동안 <strong>SF Palace 방을 비우지 말고 유지</strong>해. 큰짐 보관 + 6/28 복귀 시 같은 방으로 바로 들어감 = 짐 옮기는 수고/체크인 시간 절약 ✅</p>
        </div>

        <div class="phase-block">
          <div class="phase-label phase-now">① 지금 바로 예약 — A/B 공통 (변동 0%)</div>
          <div class="bk-list">
            <div v-for="item in bookingItems.filter(i => i.type === 'now')" :key="item.id" class="bk-row">
              <span class="bk-tag" :style="{ background: (cityColors[item.tag]||'#334155')+'22', color: cityColors[item.tag]||'#94a3b8' }">{{ item.tag }}</span>
              <span class="bk-label">{{ item.label }}</span>
              <span class="bk-dates mono">{{ item.dates }}</span>
              <span class="bk-nights">{{ item.nights }}박</span>
              <span class="bk-plans"><span v-for="p in item.plans" :key="p" class="plan-chip" :class="'chip-'+p.toLowerCase()">{{ p }}</span></span>
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

    <!-- ── 📅 일정 타임라인 ── -->
    <div class="accordion card">
      <div class="acc-header" @click="open.timeline = !open.timeline">
        <span class="acc-icon">📅</span>
        <span class="acc-title">일정 타임라인</span>
        <span class="acc-meta">6/26(금) ~ 7/4(토) · {{ currentDays.length }}일</span>
        <span class="acc-chevron" :class="{ rotated: open.timeline }">›</span>
      </div>
      <div v-show="open.timeline" class="acc-body timeline-body">
        <div v-for="(day, idx) in currentDays" :key="activePlan + idx" class="day-row" :class="{ highlight: day.highlight }">
          <div class="day-left">
            <div class="day-date">{{ day.date }}</div>
            <span class="city-tag" :style="{ background: (cityColors[day.cityTag]||'#334155')+'22', color: cityColors[day.cityTag]||'#94a3b8', borderColor: (cityColors[day.cityTag]||'#334155')+'55' }">{{ day.cityTag }}</span>
          </div>
          <div class="day-connector">
            <div class="connector-dot" :class="{ highlight: day.highlight }"></div>
            <div v-if="idx < currentDays.length - 1" class="connector-line"></div>
          </div>
          <div class="day-card">
            <div class="day-header">
              <span class="day-icon">{{ day.icon }}</span>
              <span class="day-city">{{ day.city }}</span>
              <span v-if="day.rvDay" class="rv-day-badge">🚐 캠핑카</span>
              <span v-if="day.highlight && activePlan === 'a'" class="highlight-badge">⚽ R32</span>
              <span v-if="day.highlight && activePlan === 'b'" class="highlight-badge la-badge">🇰🇷 한국 R32</span>
            </div>
            <div v-if="day.note" class="day-note">⚠️ {{ day.note }}</div>
            <div v-if="day.standby" class="day-standby">
              <span class="standby-label">{{ day.standby.label }}</span>
              <span class="standby-text">{{ day.standby.text }}</span>
              <span class="standby-cancel">취소 기한: {{ day.standby.cancelBy }}</span>
            </div>
            <ul class="schedule-list">
              <li v-for="(item, i) in day.items" :key="i" class="schedule-item">
                <span class="sch-time">{{ item.time }}</span>
                <span class="sch-text" :class="{ bold: item.bold, baseball: item.baseball }">{{ item.text }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.itinerary {
  display: flex; flex-direction: column; gap: 1rem;

  /* ── 밝은 다크 톤 — 가독성 우선 ── */
  --text:         #ffffff;
  --text-muted:   #f4f8fd;
  --text-dim:     #e6eef9;
  --bg:           #1a2a44;
  --bg-elevated:  #243753;
  --bg-overlay:   #2f4564;
  --border:       #587498;
  --border-muted: #426087;
  --accent:       #a8d7ff;
  --accent-hover: #d0e9ff;
  --accent-bg:    rgba(168,215,255,.25);
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
.accordion { padding: 0; overflow: hidden; }
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

/* ── Timeline ── */
.timeline-body { padding-top: .25rem; }
.day-row { display: grid; grid-template-columns: 88px 26px 1fr; gap: 0 .65rem; align-items: stretch; min-height: 76px; }
.day-left { display: flex; flex-direction: column; align-items: flex-end; padding-top: .8rem; gap: .3rem; }
.day-date { font-size: .9rem; font-weight: 700; color: var(--text); white-space: nowrap; }
.city-tag { font-size: .6rem; font-weight: 700; padding: 2px 5px; border-radius: 5px; border: 1px solid; white-space: nowrap; }
.day-connector { display: flex; flex-direction: column; align-items: center; padding-top: .95rem; }
.connector-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border); border: 2px solid var(--bg-elevated); flex-shrink: 0; z-index: 1; }
.connector-dot.highlight { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
.connector-line { flex: 1; width: 2px; background: var(--border-muted); margin-top: 3px; }
.day-card { margin: .35rem 0; padding: .8rem 1rem; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.day-row.highlight .day-card { border-color: var(--accent); background: var(--accent-bg); }
.day-header { display: flex; align-items: center; gap: .45rem; margin-bottom: .5rem; }
.day-icon { font-size: .95rem; }
.day-city { font-size: 1rem; font-weight: 700; color: var(--text); }
.highlight-badge { font-size: .6rem; font-weight: 700; background: var(--accent); color: #fff; padding: 2px 7px; border-radius: 7px; margin-left: auto; }
.la-badge { background: #e11d48; }
.day-standby { display: flex; flex-direction: column; gap: .18rem; background: rgba(234,179,8,.08); border: 1px solid rgba(234,179,8,.3); border-radius: 5px; padding: 5px 9px; margin-bottom: .5rem; }
.standby-label { font-size: .62rem; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #ca8a04; }
.standby-text   { font-size: .72rem; color: var(--text-muted); }
.standby-cancel { font-size: .68rem; color: #ca8a04; font-weight: 600; }
.day-note { font-size: .72rem; color: var(--orange); background: rgba(230,126,34,.1); border-radius: 5px; padding: 4px 8px; margin-bottom: .5rem; }
.schedule-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: .3rem; }
.schedule-item { display: flex; gap: .7rem; font-size: .88rem; align-items: baseline; }
.sch-time { font-family: ui-monospace,monospace; font-size: .8rem; font-weight: 600; color: var(--text-dim); min-width: 72px; flex-shrink: 0; }
.sch-text { color: var(--text); line-height: 1.5; font-weight: 500; }
.sch-text.bold { color: var(--text); font-weight: 600; }
.sch-text.baseball { color: #f97316; font-weight: 500; }

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

.mono { font-family: ui-monospace,monospace; }

@media (max-width: 768px) {
  .plan-toggle { grid-template-columns: 1fr; }
  .decision-grid { grid-template-columns: 1fr; }
  .giants-grid { grid-template-columns: 1fr; }
  .bar-row { grid-template-columns: 1fr; gap: .3rem; }
  .prob-summary { gap: .35rem; }
}
@media (max-width: 600px) {
  .day-row { grid-template-columns: 70px 20px 1fr; gap: 0 .4rem; }
  .day-date { font-size: .7rem; }
  .flight-grid { grid-template-columns: 1fr; }
}
</style>
