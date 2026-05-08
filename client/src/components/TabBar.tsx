import React, { useCallback } from 'react'
import { Tabs, Dropdown, Button, Badge } from 'antd'
import { 
  CloseOutlined, 
  FileTextOutlined, 
  ConsoleSqlOutlined, 
  TableOutlined, 
  SettingOutlined, 
  PlusOutlined,
  DownOutlined
} from '@ant-design/icons'
import { useAppStore } from '../stores/appStore'
import { TabType } from '../types'
import type { MenuProps } from 'antd'

const TabIcon: React.FC<{ type: TabType }> = ({ type }) => {
  switch (type) {
    case 'project':
      return <FileTextOutlined />
    case 'sql':
      return <ConsoleSqlOutlined />
    case 'table':
      return <TableOutlined />
    case 'settings':
      return <SettingOutlined />
    default:
      return <FileTextOutlined />
  }
}

const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, openTab } = useAppStore()

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId)
  }, [setActiveTab])

  const handleTabClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.closable !== false) {
      closeTab(tabId)
    }
  }, [tabs, closeTab])

  const handleNewTab = useCallback((type: TabType = 'project') => {
    const titles: Record<TabType, string> = {
      project: '新项目',
      sql: 'SQL查询',
      table: '数据表格',
      settings: '设置'
    }
    openTab({
      type,
      title: titles[type],
      closable: type !== 'settings'
    })
  }, [openTab])

  const handleTabMenu = useCallback((key: string, tabId: string) => {
    switch (key) {
      case 'close':
        closeTab(tabId)
        break
      case 'close-others':
        tabs.forEach(t => {
          if (t.id !== tabId && t.closable !== false) {
            closeTab(t.id)
          }
        })
        break
      case 'close-all':
        tabs.forEach(t => {
          if (t.closable !== false) {
            closeTab(t.id)
          }
        })
        break
    }
  }, [tabs, closeTab])

  const getTabMenuItems = useCallback((tabId: string): MenuProps['items'] => [
    { key: 'close', label: '关闭' },
    { key: 'close-others', label: '关闭其他' },
    { key: 'close-all', label: '关闭全部' },
  ], [])

  const newTabMenuItems: MenuProps['items'] = [
    { 
      key: 'project', 
      label: '新项目',
      icon: <FileTextOutlined />
    },
    { 
      key: 'sql', 
      label: 'SQL查询',
      icon: <ConsoleSqlOutlined />
    },
    { 
      key: 'table', 
      label: '数据表',
      icon: <TableOutlined />
    },
    { 
      key: 'settings', 
      label: '设置',
      icon: <SettingOutlined />
    },
  ]

  const handleNewTabMenuClick = useCallback(({ key }: { key: string }) => {
    handleNewTab(key as TabType)
  }, [handleNewTab])

  if (tabs.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <Dropdown
          menu={{ 
            items: newTabMenuItems,
            onClick: handleNewTabMenuClick
          }}
          trigger={['click']}
        >
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            style={styles.newTabButton}
          >
            新建标签页 <DownOutlined style={{ fontSize: 12 }} />
          </Button>
        </Dropdown>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.tabsWrapper}>
        <Tabs
          activeKey={activeTabId || ''}
          onChange={handleTabClick}
          type="card"
          size="small"
          hideAdd
          style={styles.tabs}
          tabBarStyle={styles.tabBar}
          items={tabs.map(tab => ({
            key: tab.id,
            label: (
              <Dropdown
                menu={{ 
                  items: getTabMenuItems(tab.id),
                  onClick: ({ key }) => {
                    if (key === 'close') {
                      closeTab(tab.id)
                    } else if (key === 'close-others') {
                      tabs.forEach(t => {
                        if (t.id !== tab.id && t.closable !== false) {
                          closeTab(t.id)
                        }
                      })
                    } else if (key === 'close-all') {
                      tabs.forEach(t => {
                        if (t.closable !== false) {
                          closeTab(t.id)
                        }
                      })
                    }
                  }
                }}
                trigger={['contextMenu']}
              >
                <span style={styles.tabLabel}>
                  <TabIcon type={tab.type} />
                  <span style={styles.tabTitle}>
                    {tab.title}
                    {tab.unsaved && <Badge status="warning" style={styles.unsavedBadge} />}
                  </span>
                  {tab.closable !== false && (
                    <CloseOutlined
                      style={styles.closeIcon}
                      onClick={(e) => handleTabClose(e, tab.id)}
                    />
                  )}
                </span>
              </Dropdown>
            ),
          }))}
        />
      </div>
      <Dropdown
        menu={{ 
          items: newTabMenuItems,
          onClick: handleNewTabMenuClick
        }}
        trigger={['click']}
      >
        <Button
          type="text"
          icon={<PlusOutlined />}
          style={styles.addButton}
          size="small"
        >
          <DownOutlined style={{ fontSize: 12 }} />
        </Button>
      </Dropdown>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    background: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    padding: '0 8px',
    height: 36,
  },
  tabsWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  tabs: {
    marginBottom: 0,
  },
  tabBar: {
    marginBottom: 0,
    borderBottom: 'none',
  },
  tabLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 4px',
    cursor: 'pointer',
  },
  tabTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unsavedBadge: {
    marginLeft: 4,
  },
  closeIcon: {
    fontSize: 10,
    marginLeft: 4,
    color: '#999',
    cursor: 'pointer',
  },
  addButton: {
    flexShrink: 0,
    marginLeft: 8,
  },
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    borderBottom: '1px solid #f0f0f0',
    padding: '4px 16px',
    height: 36,
  },
  newTabButton: {
    height: 28,
  },
}

export default TabBar
