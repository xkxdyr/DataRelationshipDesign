export interface ThemeColors {
  primary: string
  primaryHover: string
  background: string
  backgroundSecondary: string
  text: string
  textSecondary: string
  border: string
  borderHover: string
  success: string
  warning: string
  error: string
}

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
}

export type ThemeMode = 'light' | 'dark' | 'darcula' | 'blue'