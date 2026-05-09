import React, { useEffect, useCallback } from 'react'
import { useTheme } from './useTheme'
import { useAppStore } from '../stores/appStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme } = useTheme()
  const themeColor = useAppStore(state => state.themeColor)

  const setThemeVariables = useCallback(() => {
    const root = document.documentElement
    
    const primaryColor = themeColor || theme.colors.primary
    const primaryHoverColor = themeColor ? lightenColor(primaryColor, 10) : theme.colors.primaryHover
    
    root.style.setProperty('--theme-primary', primaryColor)
    root.style.setProperty('--theme-primary-hover', primaryHoverColor)
    root.style.setProperty('--theme-background', theme.colors.background)
    root.style.setProperty('--theme-background-secondary', theme.colors.backgroundSecondary)
    root.style.setProperty('--theme-card', theme.colors.card)
    root.style.setProperty('--theme-text', theme.colors.text)
    root.style.setProperty('--theme-text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--theme-text-tertiary', theme.colors.textTertiary)
    root.style.setProperty('--theme-border', theme.colors.border)
    root.style.setProperty('--theme-border-hover', theme.colors.borderHover)
    root.style.setProperty('--theme-hover', theme.colors.hover)
    root.style.setProperty('--theme-selected', theme.colors.selected)
    root.style.setProperty('--theme-success', theme.colors.success)
    root.style.setProperty('--theme-warning', theme.colors.warning)
    root.style.setProperty('--theme-error', theme.colors.error)
    
    const shadowColor = theme.id === 'dark' || theme.id === 'darcula'
      ? 'rgba(0, 0, 0, 0.3)'
      : 'rgba(0, 0, 0, 0.1)'
    root.style.setProperty('--theme-shadow', shadowColor)
  }, [theme, themeColor])

  useEffect(() => {
    setThemeVariables()
  }, [setThemeVariables])

  return <>{children}</>
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

export default ThemeProvider