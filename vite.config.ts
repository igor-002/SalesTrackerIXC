import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/ixc': {
        target: process.env.VITE_IXC_BASE_URL ?? 'https://central.openitgroup.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ixc/, '/webservice/v1'),
      },
    },
  },
})
