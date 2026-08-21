import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const certDir = fileURLToPath(new URL('./certs', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    https: {
      cert: readFileSync(`${certDir}/devcert.pem`),
      key: readFileSync(`${certDir}/devcert.key`),
    },
  },
})
