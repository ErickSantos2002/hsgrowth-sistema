import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5300, // Porta 5173 estava reservada pelo Windows (range 5141-5240)
    host: '127.0.0.1', // Força IPv4 para evitar problemas com IPv6 no Windows
    open: true,
  },
  build: {
    outDir: 'dist',
  },
})
