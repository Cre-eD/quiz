import { describe, it, expect } from 'vitest'
import {
  compareLiveLeaderboardPlayers,
  comparePersistentLeaderboardPlayers
} from './ranking'

describe('ranking utils', () => {
  it('orders live players by score, then fairness metrics', () => {
    const players = [
      {
        uid: 'uid-z',
        score: 500,
        fairStats: { correctAnswers: 5, totalCorrectTimeMs: 13000, firstBloodWins: 1 }
      },
      {
        uid: 'uid-a',
        score: 500,
        fairStats: { correctAnswers: 5, totalCorrectTimeMs: 10000, firstBloodWins: 0 }
      },
      {
        uid: 'uid-b',
        score: 500,
        fairStats: { correctAnswers: 4, totalCorrectTimeMs: 7000, firstBloodWins: 2 }
      },
      {
        uid: 'uid-c',
        score: 450,
        fairStats: { correctAnswers: 6, totalCorrectTimeMs: 9000, firstBloodWins: 3 }
      }
    ]

    const sorted = [...players].sort(compareLiveLeaderboardPlayers)
    expect(sorted.map((p) => p.uid)).toEqual(['uid-a', 'uid-z', 'uid-b', 'uid-c'])
  })

  it('uses deterministic fallback when fairness stats are identical', () => {
    const players = [
      {
        key: 'zoe',
        totalScore: 300,
        totalCorrectAnswers: 3,
        totalCorrectTimeMs: 6000,
        firstBloodWins: 1
      },
      {
        key: 'anna',
        totalScore: 300,
        totalCorrectAnswers: 3,
        totalCorrectTimeMs: 6000,
        firstBloodWins: 1
      }
    ]

    const sorted = [...players].sort(comparePersistentLeaderboardPlayers)
    expect(sorted.map((p) => p.key)).toEqual(['anna', 'zoe'])
  })
})
