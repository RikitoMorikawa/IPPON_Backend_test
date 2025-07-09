const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

// DynamoDB Local用の設定
const docClient = new AWS.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8080',
  accessKeyId: 'fake',
  secretAccessKey: 'fake'
});

// Prisma Client初期化
const prisma = new PrismaClient();

// テーブル名
const tableNames = {
  customers: 'dev-sales-brokerage-customer-individual-dynamodb',
  inquiry: 'dev-sales-brokerage-inquiry-dynamodb',
  properties: 'dev-sales-brokerage-property-dynamodb',
  report: 'dev-sales-brokerage-ai-report-dynamodb'
};

// データ生成用の設定
const DATA_CONFIG = {
  customersPerClient: 25,     // 各クライアントあたりの顧客数
  propertiesPerClient: 12,    // 各クライアントあたりの物件数
  inquiriesPerProperty: 8,    // 各物件あたりの問い合わせ数
  reportsPerClient: 5         // 各クライアントあたりのレポート数
};

// ランダムデータ生成用のヘルパー関数
const randomHelpers = {
  // 日本の名前データ
  firstNames: {
    male: ['太郎', '次郎', '三郎', '四郎', '健太', '雄一', '昭夫', '正男', '博', '隆', '勇', '誠', '学', '武', '清', '豊', '明', '光', '仁', '智'],
    female: ['花子', '美咲', '由美', '恵子', '真由美', '智子', '久美子', '裕子', '美穂', '愛', '舞', '香', '麻衣', '絵美', '直美', '美奈', '千鶴', '桜', '春香', '夏美']
  },
  lastNames: ['田中', '佐藤', '山田', '鈴木', '高橋', '伊藤', '渡辺', '中村', '小林', '加藤', '吉田', '山本', '佐々木', '山口', '松本', '井上', '木村', '林', '斉藤', '清水'],
  
  // 日本の地域データ
  regions: {
    '東京都': {
      cities: ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区'],
      postcodes: ['1000001', '1000002', '1000003', '1000004', '1000005', '1000006', '1000007', '1000008', '1000009', '1000010']
    },
    '大阪府': {
      cities: ['大阪市北区', '大阪市中央区', '大阪市西区', '大阪市南区', '大阪市東区', '大阪市浪速区', '大阪市天王寺区', '大阪市住吉区', '大阪市東住吉区', '大阪市平野区'],
      postcodes: ['5300001', '5300002', '5300003', '5300004', '5300005', '5300006', '5300007', '5300008', '5300009', '5300010']
    },
    '愛知県': {
      cities: ['名古屋市中区', '名古屋市東区', '名古屋市西区', '名古屋市南区', '名古屋市北区', '名古屋市中村区', '名古屋市中川区', '名古屋市港区', '名古屋市守山区', '名古屋市緑区'],
      postcodes: ['4600001', '4600002', '4600003', '4600004', '4600005', '4600006', '4600007', '4600008', '4600009', '4600010']
    }
  },
  
  // 物件タイプと価格帯
  propertyTypes: {
    'マンション': { minPrice: 3000, maxPrice: 15000, areas: [55, 70, 85, 100, 120] },
    '戸建て': { minPrice: 3500, maxPrice: 12000, areas: [80, 95, 110, 125, 140] },
    'アパート': { minPrice: 1500, maxPrice: 5000, areas: [25, 35, 45, 55, 65] }
  },
  
  // 問い合わせ関連
  inquiryMethods: ['SUUMO', '電話', 'その他', 'athome', 'LIFULL', 'メール', '直接来店', '紹介'],
  inquiryTypes: ['viewing', 'information', 'price_inquiry', 'loan_consultation', 'contract_inquiry'],
  
  // メール用ドメイン名リスト（英語のみ）
  emailDomains: ['gmail.com', 'yahoo.co.jp', 'outlook.com', 'hotmail.com', 'icloud.com', 'docomo.ne.jp', 'softbank.ne.jp', 'ezweb.ne.jp', 'nifty.com', 'biglobe.ne.jp'],
  
  // ランダム選択関数
  randomChoice: (array) => array[Math.floor(Math.random() * array.length)],
  randomNumber: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomFloat: (min, max) => (Math.random() * (max - min) + min).toFixed(1),
  randomDate: (daysAgo) => new Date(Date.now() - Math.floor(Math.random() * daysAgo) * 24 * 60 * 60 * 1000).toISOString(),
  randomPhone: () => `090-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
  randomEmail: () => `user${Math.floor(Math.random() * 10000)}@${randomHelpers.randomChoice(randomHelpers.emailDomains)}`,
  randomBoolean: () => Math.random() > 0.5
};

// PostgreSQLからクライアントと従業員データを取得
async function getPostgreSQLData() {
  console.log('🔍 PostgreSQLからクライアント・従業員データを取得中...');
  
  const clients = await prisma.mstClients.findMany({
    where: { is_active: true },
    select: {
      id: true,
      name: true
    }
  });

  const employees = await prisma.mstClientEmployees.findMany({
    where: { is_active: true },
    select: {
      id: true,
      client_id: true,
      mail_address: true,
      first_name: true,
      last_name: true
    }
  });

  // クライアント名とIDのマッピングを作成
  const clientMapping = {};
  clients.forEach(client => {
    clientMapping[client.name] = client.id;
  });

  // 従業員とクライアントのマッピングを作成
  const employeeMapping = {};
  employees.forEach(employee => {
    employeeMapping[employee.mail_address] = {
      client_id: employee.client_id,
      employee_id: employee.id,
      name: `${employee.last_name}${employee.first_name}`
    };
  });

  console.log('✅ PostgreSQLデータ取得完了');
  console.log(`   クライアント: ${clients.length}件`);
  console.log(`   従業員: ${employees.length}件`);

  return { clientMapping, employeeMapping };
}

// 顧客データ生成
function generateCustomer(clientId, employeeId, companyName) {
  const gender = randomHelpers.randomBoolean() ? 'male' : 'female';
  const firstName = randomHelpers.randomChoice(randomHelpers.firstNames[gender]);
  const lastName = randomHelpers.randomChoice(randomHelpers.lastNames);
  
  // 地域を会社名に基づいて決定
  let prefecture, cities, postcodes;
  if (companyName.includes('不動産ライフ')) {
    prefecture = '東京都';
    cities = randomHelpers.regions['東京都'].cities;
    postcodes = randomHelpers.regions['東京都'].postcodes;
  } else if (companyName.includes('大阪')) {
    prefecture = '大阪府';
    cities = randomHelpers.regions['大阪府'].cities;
    postcodes = randomHelpers.regions['大阪府'].postcodes;
  } else {
    prefecture = '愛知県';
    cities = randomHelpers.regions['愛知県'].cities;
    postcodes = randomHelpers.regions['愛知県'].postcodes;
  }
  
  const city = randomHelpers.randomChoice(cities);
  const postcode = randomHelpers.randomChoice(postcodes);
  
  return {
    id: uuidv4(),
    client_id: clientId,
    employee_id: employeeId,
    first_name: firstName,
    last_name: lastName,
    first_name_kana: firstName, // 簡略化
    last_name_kana: lastName,   // 簡略化
    birthday: `${randomHelpers.randomNumber(1970, 2000)}-${String(randomHelpers.randomNumber(1, 12)).padStart(2, '0')}-${String(randomHelpers.randomNumber(1, 28)).padStart(2, '0')}`,
    gender: gender,
    mail_address: randomHelpers.randomEmail(),
    phone_number: randomHelpers.randomPhone(),
    postcode: postcode,
    prefecture: prefecture,
    city: city,
    street_address: `${randomHelpers.randomNumber(1, 5)}-${randomHelpers.randomNumber(1, 20)}-${randomHelpers.randomNumber(1, 30)}`,
    building: `${lastName}マンション`,
    room_number: `${randomHelpers.randomNumber(1, 10)}0${randomHelpers.randomNumber(1, 9)}`,
    id_card_front_path: `/uploads/id_cards/front_${uuidv4().slice(0, 8)}.jpg`,
    id_card_back_path: `/uploads/id_cards/back_${uuidv4().slice(0, 8)}.jpg`,
    created_at: randomHelpers.randomDate(90)
  };
}

// 物件データ生成
function generateProperty(clientId, employeeId, companyName) {
  const propertyType = randomHelpers.randomChoice(Object.keys(randomHelpers.propertyTypes));
  const typeConfig = randomHelpers.propertyTypes[propertyType];
  
  // 地域を会社名に基づいて決定
  let prefecture, cities, postcodes;
  if (companyName.includes('不動産ライフ')) {
    prefecture = '東京都';
    cities = randomHelpers.regions['東京都'].cities;
    postcodes = randomHelpers.regions['東京都'].postcodes;
  } else if (companyName.includes('大阪')) {
    prefecture = '大阪府';
    cities = randomHelpers.regions['大阪府'].cities;
    postcodes = randomHelpers.regions['大阪府'].postcodes;
  } else {
    prefecture = '愛知県';
    cities = randomHelpers.regions['愛知県'].cities;
    postcodes = randomHelpers.regions['愛知県'].postcodes;
  }
  
  const city = randomHelpers.randomChoice(cities);
  const postcode = randomHelpers.randomChoice(postcodes);
  const area = randomHelpers.randomChoice(typeConfig.areas);
  const price = randomHelpers.randomNumber(typeConfig.minPrice, typeConfig.maxPrice) * 10000;
  
  const rooms = propertyType === 'アパート' ? 
    randomHelpers.randomChoice(['1R', '1K', '1DK', '1LDK', '2DK']) :
    randomHelpers.randomChoice(['2LDK', '3LDK', '4LDK', '5LDK']);
  
  return {
    id: uuidv4(),
    client_id: clientId,
    employee_id: employeeId,
    name: `${prefecture}${city}の${propertyType}`,
    type: propertyType,
    price: price,
    postcode: postcode,
    prefecture: prefecture,
    city: city,
    street_address: `${randomHelpers.randomNumber(1, 5)}-${randomHelpers.randomNumber(1, 20)}-${randomHelpers.randomNumber(1, 30)}`,
    building_name: `${randomHelpers.randomChoice(['グランド', 'ロイヤル', 'プレミアム', 'エレガント', 'モダン'])}${propertyType}${city.slice(0, 2)}`,
    floor_area: parseFloat(area),
    rooms: rooms,
    construction_year: randomHelpers.randomNumber(2000, 2025),
    parking: randomHelpers.randomBoolean(),
    inquiry_count: randomHelpers.randomNumber(0, 20),
    sales_start_date: randomHelpers.randomDate(365),
    created_at: randomHelpers.randomDate(365)
  };
}

// 問い合わせデータ生成
function generateInquiry(clientId, customerId, propertyId, employeeId) {
  const inquiryType = randomHelpers.randomChoice(randomHelpers.inquiryTypes);
  const method = randomHelpers.randomChoice(randomHelpers.inquiryMethods);
  
  const summaryMap = {
    'viewing': '物件の見学希望についてのお問い合わせ',
    'information': '物件詳細情報についてのお問い合わせ',
    'price_inquiry': '価格についてのお問い合わせ',
    'loan_consultation': '住宅ローンについてのご相談',
    'contract_inquiry': '契約条件についてのお問い合わせ'
  };
  
  return {
    id: uuidv4(),
    client_id: clientId,
    customer_id: customerId,
    property_id: propertyId,
    employee_id: employeeId,
    inquired_at: randomHelpers.randomDate(60),
    title: '新規問い合わせ',
    category: 'inquiry',
    type: inquiryType,
    method: method,
    summary: `${method}による${summaryMap[inquiryType]}です。`,
    created_at: randomHelpers.randomDate(60)
  };
}

// レポートデータ生成
function generateReport(clientId, propertyId, companyName, customerInteractions) {
  const reportId = `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 3).toUpperCase()}`;
  
  return {
    id: reportId,
    client_id: clientId,
    property_id: propertyId,
    report_start_date: randomHelpers.randomDate(30).split('T')[0],
    report_end_date: new Date().toISOString().split('T')[0],
    title: `${companyName}活動報告書_${reportId}`,
    is_draft: randomHelpers.randomBoolean(),
    current_status: randomHelpers.randomChoice(['販売中', '商談中', '成約済み', '販売停止']),
    summary: `${companyName}の物件活動報告書です。${randomHelpers.randomChoice(['順調に問い合わせが入っており', '見学希望者が多く', '価格相談が増えており', '成約に向けて進んでおり'])}、今後の展開に期待しています。`,
    is_suumo_published: randomHelpers.randomBoolean(),
    views_count: randomHelpers.randomNumber(20, 200),
    inquiries_count: randomHelpers.randomNumber(3, 25),
    business_meeting_count: randomHelpers.randomNumber(1, 10),
    viewing_count: randomHelpers.randomNumber(2, 15),
    customer_interactions: customerInteractions,
    price: `${randomHelpers.randomNumber(3000, 15000)},000,000`,
    sales_start_date: randomHelpers.randomDate(60).split('T')[0],
    created_at: randomHelpers.randomDate(30)
  };
}

async function createEnhancedSeedData() {
  console.log('🌱 Enhanced DynamoDBシードデータを作成中...');
  console.log(`📊 生成予定データ量:`);
  console.log(`   - 顧客: ${DATA_CONFIG.customersPerClient}件/クライアント`);
  console.log(`   - 物件: ${DATA_CONFIG.propertiesPerClient}件/クライアント`);
  console.log(`   - 問い合わせ: ${DATA_CONFIG.inquiriesPerProperty}件/物件`);
  console.log(`   - レポート: ${DATA_CONFIG.reportsPerClient}件/クライアント`);

  try {
    // PostgreSQLからデータを取得
    const { clientMapping, employeeMapping } = await getPostgreSQLData();

    const customers = [];
    const properties = [];
    const inquiries = [];
    const reports = [];
    
    const customerIds = {};
    const propertyIds = {};

    // 各クライアントに対してデータを生成
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      console.log(`\n🏢 ${companyName} (${clientId}) のデータを生成中...`);
      
      const employeeId = Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4();
      
      // 顧客データ生成
      console.log(`   👤 顧客データ生成中... (${DATA_CONFIG.customersPerClient}件)`);
      const clientCustomers = [];
      for (let i = 0; i < DATA_CONFIG.customersPerClient; i++) {
        const customer = generateCustomer(clientId, employeeId, companyName);
        clientCustomers.push(customer);
        customers.push(customer);
      }
      customerIds[clientId] = clientCustomers.map(c => c.id);
      
      // 物件データ生成
      console.log(`   🏠 物件データ生成中... (${DATA_CONFIG.propertiesPerClient}件)`);
      const clientProperties = [];
      for (let i = 0; i < DATA_CONFIG.propertiesPerClient; i++) {
        const property = generateProperty(clientId, employeeId, companyName);
        clientProperties.push(property);
        properties.push(property);
      }
      propertyIds[clientId] = clientProperties.map(p => p.id);
      
      // 問い合わせデータ生成
      console.log(`   📞 問い合わせデータ生成中... (${DATA_CONFIG.inquiriesPerProperty}件/物件)`);
      const clientInquiries = [];
      for (const property of clientProperties) {
        for (let i = 0; i < DATA_CONFIG.inquiriesPerProperty; i++) {
          const customerId = randomHelpers.randomChoice(customerIds[clientId]);
          const inquiry = generateInquiry(clientId, customerId, property.id, employeeId);
          clientInquiries.push(inquiry);
          inquiries.push(inquiry);
        }
      }
      
      // レポートデータ生成
      console.log(`   📊 レポートデータ生成中... (${DATA_CONFIG.reportsPerClient}件)`);
      for (let i = 0; i < DATA_CONFIG.reportsPerClient; i++) {
        const propertyId = randomHelpers.randomChoice(propertyIds[clientId]);
        
        // このレポート用の顧客対応データを作成
        const reportInquiries = clientInquiries.filter(inq => inq.property_id === propertyId).slice(0, 5);
        const customerInteractions = reportInquiries.map(inquiry => {
          const customer = customers.find(c => c.id === inquiry.customer_id);
          return {
            customer_id: inquiry.customer_id,
            customer_name: customer ? `${customer.last_name}${customer.first_name}` : '顧客名不明',
            date: inquiry.inquired_at.split('T')[0],
            title: inquiry.title,
            category: inquiry.type === 'viewing' ? '内見' : inquiry.type === 'price_inquiry' ? '価格問合せ' : '問合せ',
            content: inquiry.summary
          };
        });
        
        const report = generateReport(clientId, propertyId, companyName, customerInteractions);
        reports.push(report);
      }
    }

    // データをDynamoDBに挿入
    console.log('\n💾 DynamoDBにデータを挿入中...');
    
    // 単体挿入用のヘルパー関数
    const singleWrite = async (tableName, items) => {
      for (let i = 0; i < items.length; i++) {
        await docClient.put({
          TableName: tableName,
          Item: items[i]
        }).promise();
        
        if ((i + 1) % 25 === 0 || i === items.length - 1) {
          console.log(`     ${i + 1}/${items.length} 件挿入完了`);
        }
      }
    };
    
    // Customers
    console.log(`   👤 顧客データ挿入中... (${customers.length}件)`);
    await singleWrite(tableNames.customers, customers);
    console.log(`   ✅ 顧客データ挿入完了`);

    // Properties
    console.log(`   🏠 物件データ挿入中... (${properties.length}件)`);
    await singleWrite(tableNames.properties, properties);
    console.log(`   ✅ 物件データ挿入完了`);

    // Inquiries
    console.log(`   📞 問い合わせデータ挿入中... (${inquiries.length}件)`);
    await singleWrite(tableNames.inquiry, inquiries);
    console.log(`   ✅ 問い合わせデータ挿入完了`);

    // Reports
    console.log(`   📊 レポートデータ挿入中... (${reports.length}件)`);
    await singleWrite(tableNames.report, reports);
    console.log(`   ✅ レポートデータ挿入完了`);

    console.log('\n🎉 Enhanced DynamoDBシードデータの作成が完了しました！');
    console.log(`📊 作成されたデータ:`);
    console.log(`   - 顧客: ${customers.length}件`);
    console.log(`   - 物件: ${properties.length}件`);
    console.log(`   - 問い合わせ: ${inquiries.length}件`);
    console.log(`   - レポート: ${reports.length}件`);
    
    console.log('\n🏢 クライアント企業別データ:');
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      console.log(`   ${companyName} (${clientId}):`);
      console.log(`     - 顧客: ${customerIds[clientId].length}件`);
      console.log(`     - 物件: ${propertyIds[clientId].length}件`);
      console.log(`     - 問い合わせ: ${inquiries.filter(i => i.client_id === clientId).length}件`);
      console.log(`     - レポート: ${reports.filter(r => r.client_id === clientId).length}件`);
    }

  } catch (error) {
    console.error('❌ Enhanced DynamoDBシードデータ作成エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 既存データのクリア関数
async function clearExistingData() {
  console.log('🧹 既存データをクリア中...');
  
  try {
    const tables = Object.values(tableNames);
    
    for (const tableName of tables) {
      console.log(`   ${tableName} をクリア中...`);
      
      // テーブルのすべてのアイテムを取得
      const scanResult = await docClient.scan({
        TableName: tableName
      }).promise();
      
      // 単体削除
      if (scanResult.Items.length > 0) {
        for (let i = 0; i < scanResult.Items.length; i++) {
          await docClient.delete({
            TableName: tableName,
            Key: { id: scanResult.Items[i].id }
          }).promise();
          
          if ((i + 1) % 25 === 0 || i === scanResult.Items.length - 1) {
            console.log(`     ${i + 1}/${scanResult.Items.length} 件削除完了`);
          }
        }
        
        console.log(`   ✅ ${tableName} から ${scanResult.Items.length}件削除完了`);
      } else {
        console.log(`   ✅ ${tableName} は既に空です`);
      }
    }
    
    console.log('🧹 既存データのクリア完了');
  } catch (error) {
    console.error('❌ 既存データクリアエラー:', error);
    throw error;
  }
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');
  
  if (shouldClear) {
    await clearExistingData();
  }
  
  await createEnhancedSeedData();
}

main(); 