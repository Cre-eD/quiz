/**
 * Time Synchronization Utility
 *
 * Handles clock synchronization between client and server to ensure
 * accurate timer displays across all devices regardless of clock skew.
 */

let clockOffset = 0  // Difference between server time and client time in ms

/**
 * Calculate and store the clock offset based on server timestamp
 * @param {number|Object} serverTime - Server timestamp (from Firestore)
 */
export function syncClockOffset(serverTime) {
  if (!serverTime) return

  // Firestore serverTimestamp returns an object with seconds and nanoseconds
  const serverMs = typeof serverTime === 'object' && serverTime.seconds
    ? serverTime.seconds * 1000 + Math.floor(serverTime.nanoseconds / 1000000)
    : serverTime

  const clientMs = Date.now()
  clockOffset = serverMs - clientMs

  // console.log('Clock offset calculated:', clockOffset, 'ms')
}

/**
 * Get the current server time based on calculated offset
 * @returns {number} - Synchronized server time in milliseconds
 */
export function getServerTime() {
  return Date.now() + clockOffset
}

/**
 * Convert a server timestamp to synchronized client time
 * @param {number|Object} serverTime - Server timestamp (from Firestore)
 * @returns {number} - Server time in milliseconds
 */
export function convertServerTime(serverTime) {
  if (!serverTime) return 0

  // Firestore serverTimestamp returns an object with seconds and nanoseconds
  if (typeof serverTime === 'object' && serverTime.seconds) {
    return serverTime.seconds * 1000 + Math.floor(serverTime.nanoseconds / 1000000)
  }

  return serverTime
}

/**
 * Calculate remaining time for a countdown
 * @param {number|Object} startTime - Server timestamp when countdown started
 * @param {number} duration - Duration in seconds
 * @returns {number} - Remaining seconds (0 or positive)
 */
export function getCountdownRemaining(startTime, duration) {
  if (!startTime) return duration

  const startMs = convertServerTime(startTime)
  const durationMs = duration * 1000
  const serverNow = getServerTime()
  const elapsed = serverNow - startMs
  const remaining = Math.max(0, durationMs - elapsed)

  return Math.ceil(remaining / 1000)
}

/**
 * Calculate elapsed time since a start timestamp
 * @param {number|Object} startTime - Server timestamp
 * @returns {number} - Elapsed seconds
 */
export function getElapsedSeconds(startTime) {
  if (!startTime) return 0

  const startMs = convertServerTime(startTime)
  const serverNow = getServerTime()
  const elapsed = serverNow - startMs

  return elapsed / 1000
}
