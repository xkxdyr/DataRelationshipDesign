import { useMemo, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { getThemeById, getThemeOptions } from './themes'
import { Theme } from './types'

export function useTheme() {
  const { themeMode, setThemeMode, fontConfig } = useAppStore()
  
  const currentTheme = useMemo((): Theme => {
    return getThemeById(themeMode)
  }, [themeMode])
  
  const themeOptions = useMemo(() => getThemeOptions(), [])
  
  const setTheme = useCallback((themeId: string) => {
    setThemeMode(themeId as any)
  }, [setThemeMode])
  
  return {
    theme: currentTheme,
    themeMode,
    themeOptions,
    setTheme,
    colors: currentTheme.colors,
    fontConfig
  }
}

export function useThemeColors() {
  const { colors } = useTheme()
  return colors
}