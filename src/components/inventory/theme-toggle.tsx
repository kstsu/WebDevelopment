'use client'

import { useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isAnimating = useRef(false)

  const toggleTheme = () => {
    if (isAnimating.current) return

    const root = document.documentElement
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    isAnimating.current = true

    const applyTheme = () => {
      // Change the palette inside the snapshot callback, before React rerenders.
      root.classList.remove('light', 'dark')
      root.classList.add(nextTheme)
      root.style.colorScheme = nextTheme
      setTheme(nextTheme)
    }

    const finish = () => {
      root.classList.remove('theme-crossfade', 'theme-color-fade')
      isAnimating.current = false
    }

    if (typeof document.startViewTransition === 'function') {
      root.classList.add('theme-crossfade')
      const transition = document.startViewTransition(applyTheme)
      void transition.finished.then(finish, finish)
      return
    }

    // Commit the transition rules before changing colors in older browsers.
    root.classList.add('theme-color-fade')
    void getComputedStyle(document.body).backgroundColor
    applyTheme()
    window.setTimeout(finish, 700)
  }

  return (
    <Button type="button" variant="ghost" size="icon" aria-label="Toggle color theme" onClick={toggleTheme}>
      <Moon className="h-4 w-4 dark:hidden" aria-hidden="true" />
      <Sun className="hidden h-4 w-4 dark:block" aria-hidden="true" />
    </Button>
  )
}
