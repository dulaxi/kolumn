import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Heavy libraries that change rarely between deploys — splitting them
// into their own chunks lets browsers reuse cached copies across
// releases and shrinks the initial bundle on cold loads.
const VENDOR_CHUNKS = {
  react: ['react', 'react-dom', 'react-router-dom'],
  supabase: ['@supabase/supabase-js'],
  sentry: ['@sentry/react'],
  // posthog-js is loaded via a dynamic import() in src/lib/analytics.js — a
  // manualChunks entry here would fight the dynamic split and drop the code
  // from the build. Vite auto-emits it as its own lazy async chunk.
  phosphor: ['@phosphor-icons/react'],
  motion: ['motion'],
  markdown: ['react-markdown', 'remark-gfm'],
  'board-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
  'date-fns': ['date-fns'],
}

function vendorChunkOf(id) {
  if (!id.includes('node_modules')) return null
  for (const [name, libs] of Object.entries(VENDOR_CHUNKS)) {
    if (libs.some((lib) => id.includes(`/node_modules/${lib}/`))) return name
  }
  return null
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Bind IPv4 loopback explicitly. Left to the default ('localhost'),
    // Node resolves ::1 first on macOS and Vite listens on IPv6 only —
    // Safari then tries 127.0.0.1 (per /etc/hosts order), gets refused,
    // and reports it can't connect. Chrome masks this via Happy Eyeballs.
    host: '127.0.0.1',
  },
  build: {
    // 'hidden' emits .map files for Sentry symbolication without adding
    // sourceMappingURL comments to the served bundles.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          return vendorChunkOf(id)
        },
      },
    },
    // Vendor chunks keep the per-chunk threshold meaningful; bump just
    // enough so the warning targets *new* bloat, not the chunks we've
    // already isolated.
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    // Deno tests (supabase/functions/**/*.test.ts) run via `deno test`,
    // not Vitest — scope Vitest to the frontend suite.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
  },
})
