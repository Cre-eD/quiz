import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Firebase config to prevent real Firebase calls in tests
vi.mock('@/lib/firebase/config', () => ({
  auth: {},
  db: {},
  googleProvider: {},
  ADMIN_EMAIL: 'admin@test.com'
}))

// Mock environment variables
process.env.VITE_ADMIN_EMAIL = 'admin@test.com'
process.env.VITE_FIREBASE_PROJECT_ID = 'test-project'
process.env.VITE_ENVIRONMENT = 'test'

// Mock window.matchMedia (used by some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      return (props) => props.children
    }
  }),
  AnimatePresence: ({ children }) => children,
}))
