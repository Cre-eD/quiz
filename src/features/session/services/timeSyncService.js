import { doc, getDocFromServer, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

const DEFAULT_SAMPLES = 3
const MAX_SAMPLES = 5
const SAMPLE_DELAY_MS = 120

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function sampleOffset(docRef) {
  const sentAt = Date.now()
  await setDoc(docRef, { serverTime: serverTimestamp(), pingedAt: sentAt }, { merge: true })
  const snap = await getDocFromServer(docRef)
  const receivedAt = Date.now()
  const serverTimeRaw = snap.data()?.serverTime
  const serverTimeMs = serverTimeRaw?.toMillis ? serverTimeRaw.toMillis() : serverTimeRaw

  if (!Number.isFinite(serverTimeMs)) {
    throw new Error('Invalid server clock sample')
  }

  const rttMs = Math.max(1, receivedAt - sentAt)
  const estimatedLocalAtServerMs = sentAt + (rttMs / 2)
  const offsetMs = serverTimeMs - estimatedLocalAtServerMs

  return { offsetMs, rttMs }
}

/**
 * Synchronize local clock against Firestore server time.
 * Uses low-RTT samples and picks the best estimate.
 */
export async function syncServerClock(userId, options = {}) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required' }
    }

    const sampleCount = Math.max(1, Math.min(options.samples || DEFAULT_SAMPLES, MAX_SAMPLES))
    const docRef = doc(db, 'clockSync', userId)
    const samples = []

    for (let i = 0; i < sampleCount; i += 1) {
      try {
        const sample = await sampleOffset(docRef)
        samples.push(sample)
      } catch (error) {
        // Continue gathering samples if one request is noisy/fails.
      }

      if (i < sampleCount - 1) {
        await sleep(SAMPLE_DELAY_MS)
      }
    }

    if (samples.length === 0) {
      return { success: false, error: 'Failed to synchronize clock' }
    }

    const bestSample = [...samples].sort((a, b) => a.rttMs - b.rttMs)[0]
    return {
      success: true,
      offsetMs: bestSample.offsetMs,
      rttMs: bestSample.rttMs
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to synchronize clock'
    }
  }
}

