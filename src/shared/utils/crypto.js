/**
 * Cryptographically secure random number generation utilities
 * Uses Web Crypto API (crypto.getRandomValues) instead of Math.random()
 */

/**
 * Generate a cryptographically secure random 4-digit PIN
 * @returns {string} - 4-digit PIN (1000-9999)
 */
export function generateSecurePIN() {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  // Generate number between 1000-9999
  const pin = 1000 + (array[0] % 9000)
  return pin.toString()
}

/**
 * Generate a cryptographically secure random ID
 * @param {number} length - Length of the ID (default: 9)
 * @returns {string} - Random alphanumeric ID
 */
export function generateSecureId(length = 9) {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)

  // Convert to base36 (alphanumeric)
  return Array.from(array)
    .map(byte => (byte % 36).toString(36))
    .join('')
    .substring(0, length)
}

/**
 * Generate a cryptographically secure random number between 0 and 1
 * Replacement for Math.random()
 * @returns {number} - Random number between 0 and 1
 */
export function secureRandom() {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] / (0xFFFFFFFF + 1)
}

/**
 * Generate a cryptographically secure random integer within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (exclusive)
 * @returns {number} - Random integer
 */
export function secureRandomInt(min, max) {
  const range = max - min
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return min + (array[0] % range)
}
