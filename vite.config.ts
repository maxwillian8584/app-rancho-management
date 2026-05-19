import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Rancho Smart',
        short_name: 'Rancho',
        description: 'Gerenciador de Compras Inteligente',
        theme_color: '#10b981',
        background_color: '#f3f4f6',
        display: 'standalone',
        icons: [
          {
            src: '/vite.svg', // Mais tarde você pode trocar por um ícone de carrinho
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})
