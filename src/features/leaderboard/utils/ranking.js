const toNonNegativeNumber = (value) => (Number.isFinite(value) && value > 0 ? value : 0)

const getAverageCorrectTimeMs = (correctAnswers, totalCorrectTimeMs) => {
  if (correctAnswers <= 0) {
    return Number.POSITIVE_INFINITY
  }
  return totalCorrectTimeMs / correctAnswers
}

const compareFairRank = (left, right) => {
  if (right.score !== left.score) {
    return right.score - left.score
  }

  if (right.correctAnswers !== left.correctAnswers) {
    return right.correctAnswers - left.correctAnswers
  }

  const leftAvg = getAverageCorrectTimeMs(left.correctAnswers, left.totalCorrectTimeMs)
  const rightAvg = getAverageCorrectTimeMs(right.correctAnswers, right.totalCorrectTimeMs)
  if (leftAvg !== rightAvg) {
    return leftAvg - rightAvg
  }

  if (right.firstBloodWins !== left.firstBloodWins) {
    return right.firstBloodWins - left.firstBloodWins
  }

  return left.tieKey.localeCompare(right.tieKey)
}

const toFairComparable = (entry, config) => ({
  score: toNonNegativeNumber(entry?.[config.scoreKey]),
  correctAnswers: toNonNegativeNumber(entry?.[config.correctAnswersKey]),
  totalCorrectTimeMs: toNonNegativeNumber(entry?.[config.totalCorrectTimeKey]),
  firstBloodWins: toNonNegativeNumber(entry?.[config.firstBloodWinsKey]),
  tieKey: String(entry?.[config.tieKey] || '')
})

export function compareLiveLeaderboardPlayers(a, b) {
  return compareFairRank(
    toFairComparable(
      {
        score: a?.score,
        correctAnswers: a?.fairStats?.correctAnswers,
        totalCorrectTimeMs: a?.fairStats?.totalCorrectTimeMs,
        firstBloodWins: a?.fairStats?.firstBloodWins,
        tieKey: a?.uid || a?.name
      },
      {
        scoreKey: 'score',
        correctAnswersKey: 'correctAnswers',
        totalCorrectTimeKey: 'totalCorrectTimeMs',
        firstBloodWinsKey: 'firstBloodWins',
        tieKey: 'tieKey'
      }
    ),
    toFairComparable(
      {
        score: b?.score,
        correctAnswers: b?.fairStats?.correctAnswers,
        totalCorrectTimeMs: b?.fairStats?.totalCorrectTimeMs,
        firstBloodWins: b?.fairStats?.firstBloodWins,
        tieKey: b?.uid || b?.name
      },
      {
        scoreKey: 'score',
        correctAnswersKey: 'correctAnswers',
        totalCorrectTimeKey: 'totalCorrectTimeMs',
        firstBloodWinsKey: 'firstBloodWins',
        tieKey: 'tieKey'
      }
    )
  )
}

export function comparePersistentLeaderboardPlayers(a, b) {
  return compareFairRank(
    toFairComparable(a, {
      scoreKey: 'totalScore',
      correctAnswersKey: 'totalCorrectAnswers',
      totalCorrectTimeKey: 'totalCorrectTimeMs',
      firstBloodWinsKey: 'firstBloodWins',
      tieKey: 'key'
    }),
    toFairComparable(b, {
      scoreKey: 'totalScore',
      correctAnswersKey: 'totalCorrectAnswers',
      totalCorrectTimeKey: 'totalCorrectTimeMs',
      firstBloodWinsKey: 'firstBloodWins',
      tieKey: 'key'
    })
  )
}
