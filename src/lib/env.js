// Environment variable validation — imported before anything else in main.jsx.
// Required vars throw at startup; optional vars degrade gracefully.

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

// Embedded outside Vite (the design-system preview bundle sets this flag
// before any app module loads — see .design-sync/ds-entry.mjs): substitute
// inert placeholders instead of throwing. Previews render statically and
// never reach the network; the Vite app keeps the fail-fast throw.
const embedded = globalThis.__KOLUMN_EMBED__ === true

for (const key of required) {
  if (!embedded && !import.meta.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Check .env.local or your hosting provider's env settings.`
    )
  }
}

export const env = embedded
  ? {
      supabaseUrl: 'https://kolumn-embed.invalid',
      supabaseAnonKey: 'embed-placeholder',
      sentryDsn: null,
      posthogKey: null,
      posthogHost: null,
    }
  : {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
      posthogKey: import.meta.env.VITE_POSTHOG_KEY || null,
      posthogHost: import.meta.env.VITE_POSTHOG_HOST || null,
    }
