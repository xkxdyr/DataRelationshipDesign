const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/type-convert/mappings?sourceDb=MYSQL&targetDb=POSTGRESQL',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('测试 API: GET /api/type-convert/mappings?sourceDb=MYSQL&targetDb=POSTGRESQL');
console.log('------------------------------------------------');

const req = http.request(options, (res) => {
  let data = '';

  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('------------------------------------------------');
    console.log('响应体:');
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.success && parsedData.result && parsedData.result.mappings) {
        console.log('\n✅ API 测试成功！');
        console.log(`找到 ${parsedData.result.mappings.length} 个类型映射`);
      } else {
        console.log('\n❌ API 返回格式不正确');
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ 解析响应失败:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
  console.log('\n请确保后端服务器正在运行在 http://localhost:3001');
  console.log('可以使用以下命令启动服务器: cd server && npm run dev');
});

req.end();
