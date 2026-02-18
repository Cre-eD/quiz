export const COUNTDOWN_DURATION_MS = 3000
export const QUESTION_DURATION_MS = 25000

export const toMillis = (value) => (value?.toMillis ? value.toMillis() : value)

export function getQuestionStartMs(session) {
  const raw =
    session?.questionStartMs ??
    session?.countdownEnd ??
    session?.questionStartTimeFallback ??
    session?.questionStartTime

  const value = toMillis(raw)
  return Number.isFinite(value) ? value : null
}

export function getQuestionEndMs(session) {
  const explicitEnd = toMillis(session?.questionEndMs)
  if (Number.isFinite(explicitEnd)) {
    return explicitEnd
  }

  const start = getQuestionStartMs(session)
  if (!Number.isFinite(start)) {
    return null
  }

  return start + QUESTION_DURATION_MS
}

export function deriveEffectivePhase(gamePhase, session, nowMs) {
  const phase = gamePhase || 'lobby'
  if (phase !== 'countdown' && phase !== 'question') {
    return phase
  }

  const questionStartMs = getQuestionStartMs(session)
  if (Number.isFinite(questionStartMs) && Number.isFinite(nowMs) && nowMs >= questionStartMs) {
    return 'question'
  }

  return phase
}

