// Inert @supabase/supabase-js stub for the preview bundle (~470KB saved).
// Module scope only ever calls createClient (src/lib/supabase.js); every
// network-touching call lives inside store methods previews never invoke.
// Belt-and-braces: the client is a deep proxy — synchronous chains keep
// returning proxies, awaited chains resolve to { data: {}, error: null }.
function inert() {
  return new Proxy(function () {}, {
    get(_, prop) {
      if (prop === 'then') {
        return (resolve, reject) => Promise.resolve({ data: {}, error: null }).then(resolve, reject)
      }
      return inert()
    },
    apply() {
      return inert()
    },
  })
}

export function createClient() {
  return inert()
}

// Matches supabase-js's lock signature: run the critical section directly.
export const processLock = async (_name, _timeout, fn) => fn()
