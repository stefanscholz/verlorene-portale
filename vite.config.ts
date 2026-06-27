import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Vite-Konfiguration. `server.host` macht den Dev-Server im lokalen Netzwerk
// erreichbar, damit man das Spiel direkt auf dem Handy testen kann.
export default defineConfig({
  // GitHub-Pages-Projektseite liegt unter /<repo>/ – Basis-Pfad entsprechend
  // setzen, damit Assets, Manifest und Service-Worker korrekt laden.
  base: '/verlorene-portale/',
  server: { host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'sprites/*.svg'],
      manifest: {
        name: 'Verlorene Portale',
        short_name: 'Portale',
        description: 'Finde die Teile und repariere die verlorenen Portale!',
        lang: 'de',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
