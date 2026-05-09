export interface ThemeColors {
  primary: string
  primaryHover: string
  background: string
  backgroundSecondary: string
  card: string
  text: string
  textSecondary: string
  textTertiary: string
  border: string
  borderHover: string
  hover: string
  selected: string
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