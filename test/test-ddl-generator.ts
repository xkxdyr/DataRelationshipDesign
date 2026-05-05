import { DDLGeneratorFactory } from '../client/src/ddl/DDLGeneratorFactory';
import { DDLOptions } from '../client/src/ddl/types';

interface Column {
  id: string;
  tableId: string;
  name: string;
  dataType: string;
  length?: number;
  precision?: number;
  scale?: number;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement: boolean;
  primaryKey: boolean;
  unique: boolean;
  comment?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Index {
  id: string;
  tableId: string;
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

interface Table {
  id: string;
  projectId: string;
  name: string;
  comment?: string;
  positionX: number;
  positionY: number;
  columns: Column[];
  indexes: Index[];
  createdAt: string;
  updatedAt: string;
}

interface Relationship {
  id: string;
  projectId: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  relationshipType: string;
  onUpdate: string;
  onDelete: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  databaseType: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

const now = new Date().toISOString();

const testTable: Table = {
  id: 'test_table_1',
  projectId: 'test_project',
  name: 'user',
  comment: '用户信息表',
  positionX: 100,
  positionY: 100,
  columns: [
    {
      id: 'col_1',
      tableId: 'test_table_1',
      name: 'id',
      dataType: 'BIGINT',
      nullable: false,
      autoIncrement: true,
      primaryKey: true,
      unique: true,
      comment: '用户ID',
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'col_2',
      tableId: 'test_table_1',
      name: 'username',
      dataType: 'VARCHAR',
      length: 50,
      nullable: false,
      autoIncrement: false,
      primaryKey: false,
      unique: true,
      comment: '用户名',
      order: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'col_3',
      tableId: 'test_table_1',
      name: 'email',
      dataType: 'VARCHAR',
      length: 100,
      nullable: true,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      comment: '邮箱',
      order: 2,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'col_4',
      tableId: 'test_table_1',
      name: 'created_at',
      dataType: 'TIMESTAMP',
      nullable: false,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      comment: '创建时间',
      defaultValue: 'CURRENT_TIMESTAMP',
      order: 3,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'col_5',
      tableId: 'test_table_1',
      name: 'balance',
      dataType: 'DECIMAL',
      precision: 10,
      scale: 2,
      nullable: false,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      comment: '余额',
      defaultValue: '0.00',
      order: 4,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'col_6',
      tableId: 'test_table_1',
      name: 'status',
      dataType: 'TINYINT',
      nullable: false,
      autoIncrement: false,
      primaryKey: false,
      unique: false,
      comment: '状态',
      defaultValue: '1',
      order: 5,
      createdAt: now,
      updatedAt: now
    }
  ],
  indexes: [
    {
      id: 'idx_1',
      tableId: 'test_table_1',
      name: 'idx_username',
      columns: ['col_2'],
      unique: true,
      type: 'BTREE'
    }
  ],
  createdAt: now,
  updatedAt: now
};

const testProject: Project = {
  id: 'test_project',
  name: '测试项目',
  description: 'DDL生成器测试',
  databaseType: 'MYSQL',
  status: 'active',
  version: 1,
  createdAt: now,
  updatedAt: now,
  createdBy: 'test'
};

const databases: DDLOptions['databaseType'][] = ['MYSQL', 'POSTGRESQL', 'SQLITE', 'SQLSERVER', 'ORACLE'];

console.log('========================================');
console.log('DDL 生成器测试');
console.log('========================================\n');

for (const dbType of databases) {
  console.log(`\n----------------------------------------`);
  console.log(`📦 ${dbType} DDL 生成`);
  console.log(`----------------------------------------`);
  
  const options: DDLOptions = {
    databaseType: dbType,
    includeComments: true,
    formatSql: true,
    uppercaseKeywords: true,
    includeDropTable: false,
    tablePrefix: 'test_'
  };
  
  try {
    const sql = DDLGeneratorFactory.generateCompleteSQL(
      { ...testProject, databaseType: dbType },
      [testTable],
      [],
      options
    );
    console.log(sql);
    console.log(`✅ ${dbType} DDL 生成成功!`);
  } catch (e) {
    console.error(`❌ ${dbType} DDL 生成失败:`, e);
  }
}

console.log('\n========================================');
console.log('所有数据库类型测试完成!');
console.log('========================================');