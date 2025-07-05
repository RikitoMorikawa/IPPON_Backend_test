const AWS = require('aws-sdk');
const { exec } = require('child_process');

// .envファイルを読み込み
require('dotenv').config();

// DynamoDB設定
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
  endpoint: process.env.AWS_DYNAMO_ENDPOINT || 'http://localhost:8080',
  accessKeyId: 'fake',
  secretAccessKey: 'fake'
});

// .envファイルの環境変数名に対応（スペースを除去）
const getUserPoolId = () => {
  return (process.env.COGNITO_IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID || process.env.IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID || '').trim();
};

const getClientId = () => {
  return (process.env.COGNITO_IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID || process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID || '').trim();
};

const getClientSecret = () => {
  return (process.env.COGNITO_IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_SECRET || process.env.IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_SECRET || '').trim();
};

// Cognito設定
let cognito;
try {
  cognito = new AWS.CognitoIdentityServiceProvider({
    region: process.env.AWS_REGION || 'ap-northeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'fake',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'fake'
  });
} catch (error) {
  console.warn('⚠️  Cognito設定をスキップします');
}

// DynamoDBテーブル名
const tableNames = {
  customers: 'dev-sales-brokerage-customer-individual-dynamodb',
  inquiry: 'dev-sales-brokerage-inquiry-dynamodb',
  properties: 'dev-sales-brokerage-property-dynamodb',
  report: 'dev-sales-brokerage-ai-report-dynamodb',
};

class ClientConsistencyChecker {
  constructor() {
    this.results = {
      postgresql: {
        clients: [],
        employees: []
      },
      dynamodb: {
        clientIds: new Set(),
        tableData: {}
      },
      cognito: {
        users: []
      }
    };
  }

  log(type, message) {
    const symbols = { success: '✅', error: '❌', warning: '⚠️ ', info: '🔍' };
    console.log(`${symbols[type]} ${message}`);
  }

  // PostgreSQLからクライアント情報を取得
  async getPostgreSQLData() {
    this.log('info', 'PostgreSQLからクライアント・従業員データを取得中...');
    
    try {
      // クライアント情報を取得
      const clientsQuery = `SELECT id, name FROM mst_clients ORDER BY name;`;
      const clientsResult = await this.execCommand(
        `docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -t -c "${clientsQuery}"`
      );
      
      const clients = clientsResult.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split('|').map(p => p.trim());
          return {
            id: parts[0],
            name: parts[1]
          };
        })
        .filter(client => client.id && client.name);

      this.results.postgresql.clients = clients;

      // 従業員情報を取得
      const employeesQuery = `SELECT id, client_id, first_name, last_name, mail_address FROM mst_client_employees ORDER BY client_id;`;
      const employeesResult = await this.execCommand(
        `docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -t -c "${employeesQuery}"`
      );
      
      const employees = employeesResult.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split('|').map(p => p.trim());
          return {
            id: parts[0],
            client_id: parts[1],
            first_name: parts[2],
            last_name: parts[3],
            mail_address: parts[4]
          };
        })
        .filter(emp => emp.id && emp.client_id);

      this.results.postgresql.employees = employees;

      this.log('success', `PostgreSQLデータ取得完了 - クライアント: ${clients.length}件, 従業員: ${employees.length}件`);
      
      return true;
    } catch (error) {
      this.log('error', `PostgreSQLデータ取得エラー: ${error.message}`);
      return false;
    }
  }

  // DynamoDBからデータを取得
  async getDynamoDBData() {
    this.log('info', 'DynamoDBからデータを取得中...');

    try {
      for (const [tableName, dynamoTableName] of Object.entries(tableNames)) {
        const data = await docClient.scan({
          TableName: dynamoTableName,
          ProjectionExpression: 'client_id, id'
        }).promise();

        this.results.dynamodb.tableData[tableName] = data.Items;
        
        // client_idを収集
        data.Items.forEach(item => {
          if (item.client_id) {
            this.results.dynamodb.clientIds.add(item.client_id);
          }
        });

        this.log('info', `${tableName}テーブル: ${data.Items.length}件`);
      }

      this.log('success', `DynamoDBデータ取得完了 - ユニークclient_id: ${this.results.dynamodb.clientIds.size}件`);
      return true;
    } catch (error) {
      this.log('error', `DynamoDBデータ取得エラー: ${error.message}`);
      return false;
    }
  }

  // Cognitoからユーザー情報を取得
  async getCognitoData() {
    this.log('info', 'Cognitoからユーザーデータを取得中...');

    const userPoolId = getUserPoolId();
    
    if (!cognito || !userPoolId) {
      this.log('warning', `Cognito設定がないためスキップします (IPPON_CLIENT_EMPLOYEE_AWS_USER_POOL_ID: ${userPoolId})`);
      return true;
    }

    try {
      const users = await cognito.listUsers({
        UserPoolId: userPoolId
      }).promise();

      this.results.cognito.users = users.Users.map(user => {
        const attributes = {};
        user.Attributes.forEach(attr => {
          attributes[attr.Name] = attr.Value;
        });
        
        return {
          username: user.Username,
          email: attributes.email,
          client_id: attributes['custom:clientId'],
          status: user.UserStatus
        };
      });

      this.log('success', `Cognitoデータ取得完了 - ユーザー: ${users.Users.length}件`);
      return true;
    } catch (error) {
      this.log('error', `Cognitoデータ取得エラー: ${error.message}`);
      return false;
    }
  }

  // client_idの整合性を確認
  checkConsistency() {
    this.log('info', 'client_idの整合性を確認中...');

    const postgresClientIds = new Set(this.results.postgresql.clients.map(c => c.id));
    const dynamoClientIds = this.results.dynamodb.clientIds;
    const cognitoClientIds = new Set(
      this.results.cognito.users
        .map(u => u.client_id)
        .filter(id => id)
    );

    console.log('\n' + '='.repeat(80));
    console.log('📊 client_id整合性確認結果');
    console.log('='.repeat(80));

    // PostgreSQLクライアント一覧
    console.log('\n🐘 PostgreSQL - クライアント一覧:');
    this.results.postgresql.clients.forEach(client => {
      console.log(`   ${client.id} | ${client.name}`);
    });

    // DynamoDBのclient_id一覧
    console.log('\n🗄️  DynamoDB - client_id一覧:');
    Array.from(dynamoClientIds).forEach(clientId => {
      const inPostgres = postgresClientIds.has(clientId);
      const status = inPostgres ? '✅' : '❌';
      console.log(`   ${status} ${clientId} ${inPostgres ? '' : '(PostgreSQLにない)'}`);
    });

    // 各DynamoDBテーブルのclient_id分布
    console.log('\n📋 DynamoDBテーブル別client_id分布:');
    for (const [tableName, items] of Object.entries(this.results.dynamodb.tableData)) {
      console.log(`\n   ${tableName}テーブル:`);
      const clientCounts = {};
      items.forEach(item => {
        const clientId = item.client_id;
        clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
      });
      
      Object.entries(clientCounts).forEach(([clientId, count]) => {
        const inPostgres = postgresClientIds.has(clientId);
        const status = inPostgres ? '✅' : '❌';
        const clientName = this.results.postgresql.clients.find(c => c.id === clientId)?.name || 'unknown';
        console.log(`     ${status} ${clientId} (${clientName}): ${count}件`);
      });
    }

    // Cognitoユーザー情報
    if (this.results.cognito.users.length > 0) {
      console.log('\n🔐 Cognito - ユーザー一覧:');
      this.results.cognito.users.forEach(user => {
        const inPostgres = postgresClientIds.has(user.client_id);
        const status = inPostgres ? '✅' : user.client_id ? '❌' : '⚠️ ';
        const clientName = this.results.postgresql.clients.find(c => c.id === user.client_id)?.name || 'unknown';
        console.log(`   ${status} ${user.email} | client_id: ${user.client_id || 'なし'} (${clientName}) | status: ${user.status}`);
      });
    } else {
      console.log('\n🔐 Cognito: ユーザーデータなし');
    }

    // 従業員とクライアントのマッピング
    console.log('\n👥 従業員とクライアントのマッピング:');
    const employeesByClient = {};
    this.results.postgresql.employees.forEach(emp => {
      if (!employeesByClient[emp.client_id]) {
        employeesByClient[emp.client_id] = [];
      }
      employeesByClient[emp.client_id].push(emp);
    });

    Object.entries(employeesByClient).forEach(([clientId, employees]) => {
      const clientName = this.results.postgresql.clients.find(c => c.id === clientId)?.name || 'unknown';
      console.log(`\n   ${clientName} (${clientId}):`);
      employees.forEach(emp => {
        const inCognito = this.results.cognito.users.some(u => u.email === emp.mail_address);
        const cognitoStatus = inCognito ? '✅' : '❌';
        console.log(`     ${cognitoStatus} ${emp.first_name} ${emp.last_name} (${emp.mail_address})`);
      });
    });

    // 整合性サマリー
    console.log('\n' + '='.repeat(80));
    console.log('📈 整合性サマリー');
    console.log('='.repeat(80));

    const postgresCount = postgresClientIds.size;
    const dynamoCount = dynamoClientIds.size;
    const cognitoCount = cognitoClientIds.size;

    console.log(`PostgreSQL client数: ${postgresCount}`);
    console.log(`DynamoDB client数: ${dynamoCount}`);
    console.log(`Cognito client数: ${cognitoCount}`);

    // 不一致の確認
    const onlyInPostgres = Array.from(postgresClientIds).filter(id => !dynamoClientIds.has(id));
    const onlyInDynamo = Array.from(dynamoClientIds).filter(id => !postgresClientIds.has(id));

    if (onlyInPostgres.length > 0) {
      console.log(`\n❌ PostgreSQLのみに存在: ${onlyInPostgres.join(', ')}`);
    }

    if (onlyInDynamo.length > 0) {
      console.log(`\n❌ DynamoDBのみに存在: ${onlyInDynamo.join(', ')}`);
    }

    if (onlyInPostgres.length === 0 && onlyInDynamo.length === 0) {
      console.log(`\n✅ PostgreSQLとDynamoDBのclient_idは完全に一致しています！`);
    }

    return {
      isConsistent: onlyInPostgres.length === 0 && onlyInDynamo.length === 0,
      postgresCount,
      dynamoCount,
      cognitoCount
    };
  }

  // ヘルパーメソッド
  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${error.message}\n${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // メイン実行
  async check() {
    console.log('🚀 クライアント整合性確認を開始します...');
    console.log(`⏰ 実行時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log();

    // データ取得
    const postgresOk = await this.getPostgreSQLData();
    const dynamoOk = await this.getDynamoDBData();
    const cognitoOk = await this.getCognitoData();

    if (!postgresOk || !dynamoOk) {
      console.log('❌ データ取得に失敗しました');
      return false;
    }

    // 整合性確認
    const result = this.checkConsistency();
    
    console.log('\n🎯 結論:');
    if (result.isConsistent) {
      console.log('✅ クライアントデータは完全に整合しています！');
    } else {
      console.log('❌ クライアントデータに不整合があります。上記の詳細を確認してください。');
    }

    return result.isConsistent;
  }
}

// スクリプト実行
if (require.main === module) {
  const checker = new ClientConsistencyChecker();
  checker.check().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ 整合性確認中にエラーが発生しました:', error);
    process.exit(1);
  });
}

module.exports = ClientConsistencyChecker; 