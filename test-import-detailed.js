const http = require('http');

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
    console.log('=== 数据库导入功能详细测试 ===\n');
    
    try {
        const importResult = await testImport();
        console.log('API响应:', importResult.success ? '✓ 成功' : '✗ 失败');
        
        if (importResult.data?.tables) {
            console.log('导入表数量:', importResult.data.tables.length);
            
            let totalColumns = 0;
            let totalIndexes = 0;
            let totalForeignKeys = 0;
            
            importResult.data.tables.forEach(table => {
                const pks = table.columns?.filter(c => c.isPrimaryKey).map(c => c.name) || [];
                const indexes = table.indexes?.filter(i => !i.isPrimary) || [];
                const fks = table.foreignKeys || [];
                
                console.log(`\n===== 表: ${table.name} =====`);
                console.log('--- 列信息 ---');
                table.columns?.forEach(col => {
                    console.log(`  ${col.name} (${col.type}) ${col.isPrimaryKey ? '(PK)' : ''} ${col.isNullable ? '(可空)' : '(非空)'}`);
                });
                
                console.log('\n--- 索引信息 ---');
                if (indexes.length > 0) {
                    indexes.forEach(idx => {
                        console.log(`  ${idx.name}: ${idx.columns.join(', ')} ${idx.isUnique ? '(唯一)' : ''}`);
                    });
                } else {
                    console.log('  无额外索引');
                }
                
                console.log('\n--- 外键信息 ---');
                if (fks.length > 0) {
                    fks.forEach(fk => {
                        console.log(`  ${fk.column} -> ${fk.referencedTable}.${fk.referencedColumn}`);
                    });
                } else {
                    console.log('  无外键');
                }
                
                totalColumns += table.columns?.length || 0;
                totalIndexes += indexes.length;
                totalForeignKeys += fks.length;
            });
            
            console.log(`\n===== 统计 =====`);
            console.log(`总表数: ${importResult.data.tables.length}`);
            console.log(`总列数: ${totalColumns}`);
            console.log(`总索引数: ${totalIndexes}`);
            console.log(`总外键数: ${totalForeignKeys}`);
            
        } else {
            console.log('错误: 未返回表数据');
        }
        
    } catch (e) {
        console.log('测试失败:', e.message);
    }
    
    console.log('\n=== 测试完成 ===');
})();