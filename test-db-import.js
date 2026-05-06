const http = require('http');

// 测试连接测试功能
async function testConnection() {
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
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 测试远程导入功能
async function testImport() {
    const data = JSON.stringify({
        databaseType: 'MYSQL',
        host: 'localhost',
        port: 3306,
        databaseName: 'works',
        username: 'root',
        password: 'root',
        tables: ['t_factory', 't_produce', 't_product', 't_worker']
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
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// 执行测试
(async () => {
    console.log('=== 数据库连接管理功能测试 ===\n');
    
    console.log('1. 测试连接测试功能:');
    try {
        const connResult = await testConnection();
        console.log('   - API响应:', connResult);
        console.log('   - 结构验证:', connResult.success !== undefined && connResult.data !== undefined);
        console.log('   - 连接状态:', connResult.data?.success ? '✓ 成功' : '✗ 失败');
        console.log('   - 响应时间:', connResult.data?.responseTime || 'N/A', 'ms');
    } catch (e) {
        console.log('   ✗ 测试失败:', e.message);
    }
    
    console.log('\n2. 测试远程导入功能:');
    try {
        const importResult = await testImport();
        console.log('   - API响应:', importResult.success ? '✓ 成功' : '✗ 失败');
        console.log('   - 结构验证:', importResult.success !== undefined && importResult.data !== undefined);
        
        if (importResult.data?.tables) {
            console.log('   - 导入表数量:', importResult.data.tables.length);
            importResult.data.tables.forEach(table => {
                const pks = table.columns?.filter(c => c.isPrimaryKey).map(c => c.name) || [];
                const fks = table.foreignKeys?.length || 0;
                const indexes = table.indexes?.length || 0;
                
                console.log(`\n   表: ${table.name}`);
                console.log(`     - 列数: ${table.columns?.length || 0}`);
                console.log(`     - 主键: ${pks.length > 0 ? pks.join(', ') : '无'}`);
                console.log(`     - 索引: ${indexes}`);
                console.log(`     - 外键: ${fks}`);
                
                if (fks > 0) {
                    table.foreignKeys?.forEach(fk => {
                        console.log(`       → ${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`);
                    });
                }
            });
        }
    } catch (e) {
        console.log('   ✗ 测试失败:', e.message);
    }
    
    console.log('\n=== 测试完成 ===');
})();