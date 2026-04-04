// Environment variable validation — imported before anything else in main.jsx.
// Required vars throw at startup; optional vars degrade gracefully.

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']

for (const key of required) {
  if (!import.meta.env[key]) {
    throw new Error(
      `Missing required environment variable: ${key}. Check .env.local or your hosting provider's env settings.`
    )
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || null,
  posthogKey: import.meta.env.VITE_POSTHOG_KEY || null,
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || null,
}
