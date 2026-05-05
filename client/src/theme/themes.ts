import { Theme } from './types'

export const LIGHT_THEME: Theme = {
  id: 'light',
  name: '浅色',
  colors: {
    primary: '#1890ff',
    primaryHover: '#40a9ff',
    background: '#ffffff',
    backgroundSecondary: '#f5f5f5',
    text: '#262626',
    textSecondary: '#8c8c8c',
    border: '#e8e8e8',
    borderHover: '#bfbfbf',
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
    text: '#cccccc',
    textSecondary: '#6e6e6e',
    border: '#3c3c3c',
    borderHover: '#555555',
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
    background: '#3c3f41',
    backgroundSecondary: '#313335',
    text: '#a9b7c6',
    textSecondary: '#6a6a6a',
    border: '#515151',
    borderHover: '#6a6a6a',
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
    text: '#1a1a2e',
    textSecondary: '#4a5568',
    border: '#b8d4e3',
    borderHover: '#9bc5dd',
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