const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/ddl/databases',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
};

console.log('测试 API: GET /api/ddl/databases');
console.log('------------------------------------------------');

const req = http.request(options, (res) => {
  let data = '';

  console.log(`状态码: ${res.statusCode}`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('------------------------------------------------');
    console.log('响应体:');
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.success) {
        console.log('\n✅ DDL 路由测试成功！');
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ 解析响应失败:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message);
});

req.end();
