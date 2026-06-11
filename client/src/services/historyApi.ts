const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001/api`

async function request<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; message?: string }> {
  try {
    const token = localStorage.getItem('authToken')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        ...headers,
        ...options?.headers
      },
      ...options
    })
    return await response.json()
  } catch (error) {
    return { success: false, message: 'Network error', data: undefined }
  }
}

export interface OperationRecord {
  id: string
  projectId: string
  userId: string
  userName: string
  operationType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'SYNC'
  targetType: 'PROJECT' | 'TABLE' | 'COLUMN' | 'RELATIONSHIP' | 'INDEX' | 'VERSION' | 'USER' | 'SYSTEM'
  targetId: string | null
  targetName: string | null
  description: string | null
  timestamp: string
  ip?: string
  userAgent?: string
}

export interface OperationStats {
  totalOperations: number
  createCount: number
  updateCount: number
  deleteCount: number
  otherCount: number
  uniqueUsers: number
  lastOperationAt: string | null
  mostActiveUser: {
    userId: string
    userName: string
    count: number
  } | null
  operationsByType: {
    CREATE: number
    UPDATE: number
    DELETE: number
    OTHER: number
  }
  operationsByTarget: Record<string, number>
  operationsByUser: Array<{
    userId: string
    userName: string
    count: number
  }>
}

export interface HistoryReminder {
  projectId: string
  projectName: string
  oldestRecordDate: string
  recordCount: number
  daysSinceOldest: number
  shouldRemind: boolean
}

export const historyApi = {
  async getProjectHistory(projectId: string, limit: number = 100): Promise<OperationRecord[]> {
    const response = await request<OperationRecord[]>(
      `/history/project/${projectId}?limit=${limit}`
    )
    return response.data || []
  },

  async getProjectStats(projectId: string): Promise<OperationStats | null> {
    const response = await request<OperationStats>(
      `/history/project/${projectId}/stats`
    )
    return response.data || null
  },

  async getUserHistory(projectId: string, userId: string, limit: number = 50): Promise<OperationRecord[]> {
    const response = await request<OperationRecord[]>(
      `/history/project/${projectId}/user/${userId}?limit=${limit}`
    )
    return response.data || []
  },

  async getRecentActivity(projectId: string, minutes: number = 60): Promise<OperationRecord[]> {
    const response = await request<OperationRecord[]>(
      `/history/project/${projectId}/recent?minutes=${minutes}`
    )
    return response.data || []
  },

  async exportProjectHistory(projectId: string, format: 'json' | 'csv' = 'json', limit: number = 1000): Promise<void> {
    const token = localStorage.getItem('authToken')
    const url = `${API_BASE}/history/export/project/${projectId}/${format}?limit=${limit}&t=${Date.now()}`

    const link = document.createElement('a')
    link.download = `history_${projectId}_${Date.now()}.${format}`

    if (token) {
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        link.href = objectUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(objectUrl)
      } catch (error) {
        console.error('导出失败:', error)
        window.open(url, '_blank')
      }
    } else {
      link.href = url
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  },

  async exportUserHistory(projectId: string, userId: string, format: 'json' | 'csv' = 'json', limit: number = 1000): Promise<void> {
    const token = localStorage.getItem('authToken')
    const url = `${API_BASE}/history/export/project/${projectId}/user/${userId}/${format}?limit=${limit}&t=${Date.now()}`

    const link = document.createElement('a')
    link.download = `history_${projectId}_user_${userId}_${Date.now()}.${format}`

    if (token) {
      try {
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const blob = await res.blob()
        const objectUrl = URL.createObjectURL(blob)
        link.href = objectUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(objectUrl)
      } catch (error) {
        console.error('导出失败:', error)
        window.open(url, '_blank')
      }
    } else {
      link.href = url
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  },

  async getProjectHistoryReminder(projectId: string): Promise<HistoryReminder | null> {
    const response = await request<HistoryReminder>(
      `/history/project/${projectId}/reminder`
    )
    return response.data || null
  },

  async getUserHistoryReminders(userId: string): Promise<HistoryReminder[]> {
    const response = await request<HistoryReminder[]>(
      `/history/user/${userId}/reminders`
    )
    return response.data || []
  },

  async importHistory(projectId: string, records: any[]): Promise<{ success: boolean; data?: { imported: number } }> {
    return request<{ imported: number }>(`/history/${projectId}/import`, {
      method: 'POST',
      body: JSON.stringify({ records })
    })
  }
}
