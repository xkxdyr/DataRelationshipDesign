const http = require('http');

console.log('=== 测试所有修复 ===\n');

// 测试1: 测试连接功能
async function testConnection() {
    console.log('1. 测试连接测试功能');
    const data = JSON.stringify({
        databaseType: 'MYSQL',
        host: 'localhost',
        port: 3306,
        databaseName: 'works',
        username: 'root',
        password: 'root',
        sslEnabled: false
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/connections/test',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    console.log('   结果:', result.success ? '✓ 成功' : '✗ 失败');
                    console.log('   消息:', result.data?.message);
                    resolve(result.success);
                } catch (e) {
                    console.log('   ✗ 解析失败:', e.message);
                    reject(e);
                }
            });
        });
        req.on('error', (e) => {
            console.log('   ✗ 请求失败:', e.message);
            reject(e);
        });
        req.write(data);
        req.end();
    });
}

// 测试2: 测试导入功能
async function testImport() {
    console.log('\n2. 测试数据库导入功能');
    const data = JSON.stringify({
        databaseType: 'MYSQL',
        host: 'localhost',
        port: 3306,
        databaseName: 'works',
        username: 'root',
        password: 'root',
        tables: ['t_factory', 't_produce']
    });
    
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/reverse-engineering/import',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    console.log('   结果:', result.success ? '✓ 成功' : '✗ 失败');
                    
                    if (result.data?.tables) {
                        console.log('   导入表数:', result.data.tables.length);
                        result.data.tables.forEach(table => {
                            const pks = table.columns?.filter(c => c.isPrimaryKey).length || 0;
                            const fks = table.foreignKeys?.length || 0;
                            console.log(`   - ${table.name}: ${table.columns?.length}列, ${pks}主键, ${fks}外键`);
                        });
                    }
                    resolve(result.success);
                } catch (e) {
                    console.log('   ✗ 解析失败:', e.message);
                    reject(e);
                }
            });
        });
        req.on('error', (e) => {
            console.log('   ✗ 请求失败:', e.message);
            reject(e);
        });
        req.write(data);
        req.end();
    });
}

// 执行所有测试
(async () => {
    try {
        const connSuccess = await testConnection();
        const importSuccess = await testImport();
        
        console.log('\n=== 测试总结 ===');
        console.log('连接测试:', connSuccess ? '✓ 通过' : '✗ 失败');
        console.log('导入测试:', importSuccess ? '✓ 通过' : '✗ 失败');
        console.log('总体:', (connSuccess && importSuccess) ? '✓ 所有测试通过' : '✗ 部分测试失败');
    } catch (e) {
        console.log('\n=== 测试异常 ===');
        console.log('错误:', e.message);
    }
})();