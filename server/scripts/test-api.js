const fetch = require('node-fetch')

async function testApi() {
  console.log('=== 测试 API ===')
  
  // 先登录获取 token
  console.log('\n1. 登录用户...')
  const loginResponse = await fetch('http://localhost:3001/api/users/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'test01',
      password: '123456'
    })
  })
  
  const loginResult = await loginResponse.json()
  console.log('登录结果:', loginResult)
  
  if (!loginResult.success || !loginResult.data?.token) {
    console.error('登录失败')
    return
  }
  
  const token = loginResult.data.token
  console.log('获取到 token:', token.substring(0, 20) + '...')
  
  // 测试获取用户项目
  console.log('\n2. 获取用户项目...')
  const projectsResponse = await fetch('http://localhost:3001/api/users/projects', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  
  console.log('响应状态:', projectsResponse.status)
  
  try {
    const projectsResult = await projectsResponse.json()
    console.log('获取项目结果:', projectsResult)
  } catch (error) {
    console.error('解析响应失败:', error)
    const text = await projectsResponse.text()
    console.log('响应内容:', text)
  }
}

testApi().catch(console.error)