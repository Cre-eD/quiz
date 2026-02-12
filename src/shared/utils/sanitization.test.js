import { describe, it, expect } from 'vitest'
import {
  sanitizeHTML,
  sanitizePlayerName,
  sanitizeQuizTitle,
  sanitizeQuestionText,
  sanitizeOption,
  sanitizeExplanation,
  sanitizeLeaderboardName,
  sanitizeEmail,
  sanitizeQuiz
} from './sanitization'

describe('sanitizeHTML', () => {
  it('should strip all HTML tags', () => {
    // Script tags and their content are completely removed for security
    expect(sanitizeHTML('<script>alert("xss")</script>')).toBe('')
    expect(sanitizeHTML('<b>bold</b>')).toBe('bold')
    expect(sanitizeHTML('<div>text</div>')).toBe('text')
  })

  it('should keep text content', () => {
    expect(sanitizeHTML('plain text')).toBe('plain text')
  })

  it('should handle dangerous scripts', () => {
    expect(sanitizeHTML('<img src=x onerror=alert(1)>')).toBe('')
    expect(sanitizeHTML('<svg/onload=alert(1)>')).toBe('')
  })

  it('should handle null/undefined', () => {
    expect(sanitizeHTML(null)).toBe('')
    expect(sanitizeHTML(undefined)).toBe('')
  })

  it('should handle non-strings', () => {
    expect(sanitizeHTML(123)).toBe('')
    expect(sanitizeHTML({})).toBe('')
  })

  it('should handle event handlers', () => {
    expect(sanitizeHTML('<a onclick="alert(1)">click</a>')).toBe('click')
  })
})

describe('sanitizePlayerName', () => {
  it('should sanitize valid name', () => {
    expect(sanitizePlayerName('Alice')).toBe('Alice')
  })

  it('should strip HTML from name', () => {
    // Script tags are completely removed for security
    expect(sanitizePlayerName('<script>alert("xss")</script>Bob')).toBe('Bob')
    expect(sanitizePlayerName('<b>Bold Name</b>')).toBe('Bold Name')
  })

  it('should remove non-printable characters', () => {
    // Null byte
    expect(sanitizePlayerName('Alice\x00Bob')).toBe('AliceBob')
  })

  it('should trim whitespace', () => {
    expect(sanitizePlayerName('  Alice  ')).toBe('Alice')
  })

  it('should enforce 30 character limit', () => {
    const longName = 'a'.repeat(50)
    expect(sanitizePlayerName(longName)).toBe('a'.repeat(30))
  })

  it('should handle null/undefined', () => {
    expect(sanitizePlayerName(null)).toBe('')
    expect(sanitizePlayerName(undefined)).toBe('')
  })

  it('should handle Unicode characters', () => {
    expect(sanitizePlayerName('Alice 测试')).toBe('Alice 测试')
    expect(sanitizePlayerName('José')).toBe('José')
  })
})

describe('sanitizeQuizTitle', () => {
  it('should sanitize valid title', () => {
    expect(sanitizeQuizTitle('DevOps Quiz')).toBe('DevOps Quiz')
  })

  it('should strip HTML', () => {
    expect(sanitizeQuizTitle('<h1>Title</h1>')).toBe('Title')
  })

  it('should trim whitespace', () => {
    expect(sanitizeQuizTitle('  Title  ')).toBe('Title')
  })

  it('should enforce 200 character limit', () => {
    const longTitle = 'a'.repeat(300)
    expect(sanitizeQuizTitle(longTitle)).toBe('a'.repeat(200))
  })

  it('should handle null/undefined', () => {
    expect(sanitizeQuizTitle(null)).toBe('')
    expect(sanitizeQuizTitle(undefined)).toBe('')
  })
})

describe('sanitizeQuestionText', () => {
  it('should sanitize valid question', () => {
    expect(sanitizeQuestionText('What is DevOps?')).toBe('What is DevOps?')
  })

  it('should strip HTML', () => {
    expect(sanitizeQuestionText('<p>Question?</p>')).toBe('Question?')
  })

  it('should trim whitespace', () => {
    expect(sanitizeQuestionText('  Question?  ')).toBe('Question?')
  })

  it('should enforce 500 character limit', () => {
    const longText = 'a'.repeat(600)
    expect(sanitizeQuestionText(longText)).toBe('a'.repeat(500))
  })

  it('should handle null/undefined', () => {
    expect(sanitizeQuestionText(null)).toBe('')
    expect(sanitizeQuestionText(undefined)).toBe('')
  })
})

describe('sanitizeOption', () => {
  it('should sanitize valid option', () => {
    expect(sanitizeOption('Option A')).toBe('Option A')
  })

  it('should strip HTML', () => {
    expect(sanitizeOption('<b>Option</b>')).toBe('Option')
  })

  it('should trim whitespace', () => {
    expect(sanitizeOption('  Option  ')).toBe('Option')
  })

  it('should enforce 200 character limit', () => {
    const longOption = 'a'.repeat(300)
    expect(sanitizeOption(longOption)).toBe('a'.repeat(200))
  })

  it('should handle null/undefined', () => {
    expect(sanitizeOption(null)).toBe('')
    expect(sanitizeOption(undefined)).toBe('')
  })
})

describe('sanitizeExplanation', () => {
  it('should sanitize valid explanation', () => {
    expect(sanitizeExplanation('This is because...')).toBe('This is because...')
  })

  it('should strip HTML', () => {
    expect(sanitizeExplanation('<i>Explanation</i>')).toBe('Explanation')
  })

  it('should trim whitespace', () => {
    expect(sanitizeExplanation('  Explanation  ')).toBe('Explanation')
  })

  it('should enforce 500 character limit', () => {
    const longExpl = 'a'.repeat(600)
    expect(sanitizeExplanation(longExpl)).toBe('a'.repeat(500))
  })

  it('should handle null/undefined', () => {
    expect(sanitizeExplanation(null)).toBe('')
    expect(sanitizeExplanation(undefined)).toBe('')
  })
})

describe('sanitizeLeaderboardName', () => {
  it('should sanitize valid name', () => {
    expect(sanitizeLeaderboardName('Spring 2024')).toBe('Spring 2024')
  })

  it('should strip HTML', () => {
    expect(sanitizeLeaderboardName('<h2>Spring 2024</h2>')).toBe('Spring 2024')
  })

  it('should trim whitespace', () => {
    expect(sanitizeLeaderboardName('  Spring 2024  ')).toBe('Spring 2024')
  })

  it('should enforce 100 character limit', () => {
    const longName = 'a'.repeat(150)
    expect(sanitizeLeaderboardName(longName)).toBe('a'.repeat(100))
  })

  it('should handle null/undefined', () => {
    expect(sanitizeLeaderboardName(null)).toBe('')
    expect(sanitizeLeaderboardName(undefined)).toBe('')
  })
})

describe('sanitizeEmail', () => {
  it('should lowercase email', () => {
    expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com')
    expect(sanitizeEmail('User@Example.Com')).toBe('user@example.com')
  })

  it('should trim whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com')
  })

  it('should handle null/undefined', () => {
    expect(sanitizeEmail(null)).toBe('')
    expect(sanitizeEmail(undefined)).toBe('')
  })

  it('should preserve email structure', () => {
    expect(sanitizeEmail('user+tag@example.co.uk')).toBe('user+tag@example.co.uk')
  })
})

describe('sanitizeQuiz', () => {
  const dirtyQuiz = {
    title: '<script>alert("xss")</script>DevOps Quiz',
    level: 1,
    category: 'pre',
    questions: [
      {
        text: '<b>What</b> is <script>CI/CD</script>?',
        options: [
          '<i>Option A</i>',
          '<b>Option B</b>',
          'Option C<script>alert(1)</script>',
          'Option D'
        ],
        correct: 0,
        explanation: '<div>This is because...</div>'
      },
      {
        text: 'Question 2?',
        options: ['A', 'B', 'C', 'D'],
        correct: 1
      }
    ]
  }

  it('should sanitize quiz title', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    // Script tags are completely removed for security
    expect(clean.title).toBe('DevOps Quiz')
  })

  it('should sanitize question text', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    // Script tags are completely removed for security
    expect(clean.questions[0].text).toBe('What is ?')
  })

  it('should sanitize all options', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    expect(clean.questions[0].options[0]).toBe('Option A')
    expect(clean.questions[0].options[1]).toBe('Option B')
    // Script tags are completely removed for security
    expect(clean.questions[0].options[2]).toBe('Option C')
    expect(clean.questions[0].options[3]).toBe('Option D')
  })

  it('should sanitize explanation', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    expect(clean.questions[0].explanation).toBe('This is because...')
  })

  it('should preserve non-text fields', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    expect(clean.level).toBe(1)
    expect(clean.category).toBe('pre')
    expect(clean.questions[0].correct).toBe(0)
  })

  it('should handle quiz without explanation', () => {
    const clean = sanitizeQuiz(dirtyQuiz)
    expect(clean.questions[1].explanation).toBeUndefined()
  })

  it('should handle null/undefined quiz', () => {
    expect(sanitizeQuiz(null)).toBe(null)
    expect(sanitizeQuiz(undefined)).toBe(undefined)
  })

  it('should handle quiz with non-array questions', () => {
    const badQuiz = { ...dirtyQuiz, questions: 'not array' }
    const clean = sanitizeQuiz(badQuiz)
    expect(clean.questions).toBe('not array')
  })

  it('should handle question with non-array options', () => {
    const badQuiz = {
      ...dirtyQuiz,
      questions: [{ text: 'Q?', options: 'not array', correct: 0 }]
    }
    const clean = sanitizeQuiz(badQuiz)
    expect(clean.questions[0].options).toBe('not array')
  })

  it('should handle deeply nested XSS attempts', () => {
    const xssQuiz = {
      title: '<img src=x onerror=alert(1)>Quiz',
      level: 1,
      questions: [
        {
          text: '<svg/onload=alert(1)>Question?',
          options: [
            '<iframe src=javascript:alert(1)>',
            'Normal',
            '<object data=javascript:alert(1)>',
            '<embed src=javascript:alert(1)>'
          ],
          correct: 1
        }
      ]
    }
    const clean = sanitizeQuiz(xssQuiz)
    expect(clean.title).not.toContain('<')
    expect(clean.questions[0].text).not.toContain('<')
    expect(clean.questions[0].options.every(opt => !opt.includes('<'))).toBe(true)
  })
})
