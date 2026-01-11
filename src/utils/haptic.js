// Haptic feedback utility for mobile devices
export const haptic = {
  // Light tap feedback
  light: () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  },
  // Medium feedback for selections
  medium: () => {
    if (navigator.vibrate) {
      navigator.vibrate(25)
    }
  },
  // Strong feedback for important actions
  heavy: () => {
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }
  },
  // Success pattern
  success: () => {
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30])
    }
  },
  // Error pattern
  error: () => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50, 30, 50])
    }
  },
  // Streak celebration
  streak: () => {
    if (navigator.vibrate) {
      navigator.vibrate([20, 20, 20, 20, 40])
    }
  }
}
