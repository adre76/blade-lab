import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo-192.png", "logo-512.png", "logo-maskable-512.png"],
      manifest: {
        name: "Blade X Lab",
        short_name: "Blade X Lab",
        description: "Catálogo de Beyblade X e laboratório de combinação de peças.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b0e14",
        theme_color: "#0b0e14",
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/logo-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/logo-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/logo-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        runtimeCaching: [
          {
            // Catálogo: stale-while-revalidate (spec §3.3).
            // As tabelas públicas estão listadas nominalmente de propósito: um
            // padrão amplo como /rest/v1/* cachearia inventory_items e combos
            // no disco do aparelho — dado de usuário em cache é vazamento.
            //
            // Não há prefetch explícito, e não precisa: a home carrega os beys
            // com as peças aninhadas numa consulta só, então uma visita já
            // deixa o catálogo inteiro em cache (verificado: 1 entrada,
            // contendo tudo).
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              /\/rest\/v1\/(parts|beyblades|beyblade_parts|anatomy_slots)/.test(url.pathname),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "catalogo",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Imagens do catálogo, servidas pelo Storage.
            //
            // CacheFirst, e não stale-while-revalidate: o conteúdo de
            // `beys/bx-01-....webp` nunca muda — trocar a arte de um bey
            // significa um caminho novo. Revalidar seria tráfego jogado fora.
            //
            // Só o bucket público. O padrão exclui qualquer outro caminho do
            // Storage, pela mesma razão de o catálogo listar as tabelas
            // nominalmente.
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.includes("/storage/v1/object/public/bey-images/"),
            handler: "CacheFirst",
            options: {
              cacheName: "imagens-catalogo",
              // Teto de entradas para não encher o disco do aparelho: são ~145
              // imagens hoje, e o limite acomoda o crescimento do catálogo sem
              // virar depósito.
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: { outDir: "dist" },
  server: { port: 5173 },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
