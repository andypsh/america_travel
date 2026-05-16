async function _json(res) {
  if (!res.ok) {
    let msg = res.statusText
    try { const j = await res.json(); msg = j.detail || msg } catch {}
    throw new Error(`${res.status} ${msg}`)
  }
  return res.json()
}

export const api = {
  health:   () => fetch('/api/health').then(_json),
  latest:   () => fetch('/api/briefings/latest').then(_json),
  list:     () => fetch('/api/briefings').then(_json),
  refresh:  (opts) => fetch('/api/refresh', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(opts || {})
  }).then(_json),
}
