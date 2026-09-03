// Inert zod stub for the preview bundle (~580KB saved). Schemas are BUILT at
// module scope (src/utils/schemas.js) so the stub must survive any
// construction chain — every access/call returns the same chainable proxy.
// Previews never validate; parse/safeParse pass values through untouched.
const chain = new Proxy(function zodStub() {}, {
  get(target, prop) {
    if (prop === 'parse') return (v) => v
    if (prop === 'safeParse') return (v) => ({ success: true, data: v })
    if (prop === Symbol.toPrimitive) return () => '[zod-stub]'
    if (prop === 'prototype') return target.prototype
    return chain
  },
  apply() {
    return chain
  },
  construct() {
    return chain
  },
})

export const z = chain
export default { z: chain }
