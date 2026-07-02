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
  posthog: ['posthog-js'],
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
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
  },
})
