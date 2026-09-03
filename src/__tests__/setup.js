import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// This setup file runs for every test file regardless of its per-file
// `@vitest-environment` override (e.g. prerenderEntry.test.jsx runs under
// `node`, which has no `window`). Guard the jsdom-only mocks below so
// node-environment tests don't blow up before their own assertions run.
if (typeof window !== 'undefined') {
  // Mock window.matchMedia for components using useMediaQuery
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver = MockIntersectionObserver

  // Mock ResizeObserver
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = MockResizeObserver
}
