import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // Si el puerto ya está ocupado, Vite por default busca el siguiente
    // libre (5176, 5177...) en vez de fallar — con strictPort en true se
    // asegura que siempre sea el 5175, o truena avisando que ya está en uso.
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5053',
        changeOrigin: true,
      },
    },
  },
})
