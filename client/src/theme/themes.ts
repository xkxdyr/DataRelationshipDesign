import { Theme } from './types'

export const LIGHT_THEME: Theme = {
  id: 'light',
  name: '浅色',
  colors: {
    primary: '#1890ff',
    primaryHover: '#40a9ff',
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    card: '#ffffff',
    text: '#262626',
    textSecondary: '#666666',
    textTertiary: '#999999',
    border: '#e8e8e8',
    borderHover: '#bfbfbf',
    hover: '#f0f0f0',
    selected: '#e6f7ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ff4d4f'
  }
}

export const DARK_THEME: Theme = {
  id: 'dark',
  name: '深色',
  colors: {
    primary: '#177ddc',
    primaryHover: '#3c9ae8',
    background: '#1e1e1e',
    backgroundSecondary: '#2d2d2d',
    card: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#9e9e9e',
    textTertiary: '#757575',
    border: '#424242',
    borderHover: '#616161',
    hover: '#3d3d3d',
    selected: '#1565c0',
    success: '#4ec9b0',
    warning: '#e9a922',
    error: '#f14c4c'
  }
}

export const DARCULA_THEME: Theme = {
  id: 'darcula',
  name: 'Darcula (IntelliJ)',
  colors: {
    primary: '#3879d9',
    primaryHover: '#5a9aee',
    background: '#2b2b2b',
    backgroundSecondary: '#1e1e1e',
    card: '#2b2b2b',
    text: '#e8e8e8',
    textSecondary: '#9d9d9d',
    textTertiary: '#7a7a7a',
    border: '#4a4a4a',
    borderHover: '#6a6a6a',
    hover: '#3c3c3c',
    selected: '#254f7a',
    success: '#6a8759',
    warning: '#cc7832',
    error: '#b94e48'
  }
}

export const BLUE_THEME: Theme = {
  id: 'blue',
  name: '蓝色',
  colors: {
    primary: '#0066cc',
    primaryHover: '#0080ff',
    background: '#f0f8ff',
    backgroundSecondary: '#e6f0ff',
    card: '#ffffff',
    text: '#1a1a2e',
    textSecondary: '#4a5568',
    textTertiary: '#718096',
    border: '#b8d4e3',
    borderHover: '#9bc5dd',
    hover: '#e6f0ff',
    selected: '#0066cc',
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545'
  }
}

export const THEMES: Record<string, Theme> = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
  darcula: DARCULA_THEME,
  blue: BLUE_THEME
}

export function getThemeById(id: string): Theme {
  return THEMES[id] || LIGHT_THEME
}

export function getThemeOptions() {
  return Object.values(THEMES).map(theme => ({
    value: theme.id,
    label: theme.name
  }))
}