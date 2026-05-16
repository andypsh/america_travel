import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cfgPath = resolve(__dirname, '../config/ports.json')
const cfg = existsSync(cfgPath)
  ? JSON.parse(readFileSync(cfgPath, 'utf-8'))
  : { ports: { vite: 5173, api: 8000 }, hosts: { dev: 'localhost' } }
const VITE_PORT = cfg.ports.vite
const API_PORT  = cfg.ports.api
const DEV_HOST  = cfg.hosts.dev

export default defineConfig({
  plugins: [
    vue(),
    basicSsl(),    // self-signed HTTPS for ml-1.dt.cjlocal.net access
  ],
  server: {
    host: true,
    port: VITE_PORT,
    https: true,
    strictPort: true,
    allowedHosts: [DEV_HOST, 'localhost'],
    proxy: {
      '^/api/': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
