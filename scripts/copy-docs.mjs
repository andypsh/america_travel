import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const src = resolve('docs')
const dest = resolve('dist/docs')

if (!existsSync(src)) {
  console.log('[copy-docs] docs/ not found, skipping')
  process.exit(0)
}

cpSync(src, dest, { recursive: true })
console.log(`[copy-docs] ${src} → ${dest}`)
