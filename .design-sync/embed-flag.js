// Loaded FIRST by ds-entry.mjs — module init order guarantees this runs
// before any app module (src/lib/env.js reads the flag). Marks the graph as
// embedded outside Vite so env validation substitutes inert placeholders
// instead of throwing.
globalThis.__KOLUMN_EMBED__ = true
