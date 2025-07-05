const AWS = require('aws-sdk');

// DynamoDB Local用の設定
const dynamodb = new AWS.DynamoDB({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8080',
  accessKeyId: 'fake',
  secretAccessKey: 'fake'
});

const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8080',
  accessKeyId: 'fake',
  secretAccessKey: 'fake'
});

async function checkDynamoDB() {
  try {
    console.log('🔍 DynamoDB Localの状況を確認中...');
    
    // テーブル一覧を取得
    console.log('\n📋 テーブル一覧:');
    const tables = await dynamodb.listTables().promise();
    console.log(tables.TableNames);
    
    if (tables.TableNames.length === 0) {
      console.log('❌ テーブルが見つかりません');
      return;
    }
    
    // 各テーブルのデータを確認
    for (const tableName of tables.TableNames) {
      console.log(`\n📊 テーブル: ${tableName}`);
      
      try {
        // テーブルの詳細情報を取得
        const tableInfo = await dynamodb.describeTable({ TableName: tableName }).promise();
        console.log(`   項目数: ${tableInfo.Table.ItemCount || 'N/A'}`);
        console.log(`   状態: ${tableInfo.Table.TableStatus}`);
        
        // データのサンプルを取得（最初の5件）
        const data = await docClient.scan({
          TableName: tableName,
          Limit: 5
        }).promise();
        
        console.log(`   データ件数: ${data.Count || 0}`);
        if (data.Items && data.Items.length > 0) {
          console.log('   サンプルデータ:');
          data.Items.forEach((item, index) => {
            console.log(`     ${index + 1}:`, JSON.stringify(item, null, 2));
          });
        } else {
          console.log('   ❌ データが見つかりません');
        }
        
      } catch (error) {
        console.error(`   ❌ エラー: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ DynamoDB接続エラー:', error.message);
  }
}

checkDynamoDB(); 