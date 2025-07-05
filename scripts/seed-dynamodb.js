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

async function createSeedData() {
  console.log('🌱 DynamoDBのシードデータを作成中...');

  try {
    // PostgreSQLからデータを取得
    const { clientMapping, employeeMapping } = await getPostgreSQLData();

    console.log('📋 使用するクライアントマッピング:');
    Object.entries(clientMapping).forEach(([name, id]) => {
      console.log(`   ${name}: ${id}`);
    });

    // 1. 顧客データの作成
    console.log('👤 顧客データを作成中...');
    const customers = [];
    const customerIds = {};
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      // 各会社に2人の顧客を作成
      const companyCustomers = [
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4(),
          first_name: companyName.includes('不動産ライフ') ? '太郎' : companyName.includes('大阪') ? '次郎' : '三郎',
          last_name: companyName.includes('不動産ライフ') ? '田中' : companyName.includes('大阪') ? '佐藤' : '山田',
          first_name_kana: companyName.includes('不動産ライフ') ? 'タロウ' : companyName.includes('大阪') ? 'ジロウ' : 'サブロウ',
          last_name_kana: companyName.includes('不動産ライフ') ? 'タナカ' : companyName.includes('大阪') ? 'サトウ' : 'ヤマダ',
          birthday: '1985-05-15',
          gender: 'male',
          mail_address: `customer1@${companyName.includes('不動産ライフ') ? 'example' : companyName.includes('大阪') ? 'osaka-customer' : 'nagoya-customer'}.com`,
          phone_number: companyName.includes('不動産ライフ') ? '090-1234-5678' : companyName.includes('大阪') ? '090-2345-6789' : '090-3456-7890',
          postcode: companyName.includes('不動産ライフ') ? '1000001' : companyName.includes('大阪') ? '5300001' : '4600002',
          prefecture: companyName.includes('不動産ライフ') ? '東京都' : companyName.includes('大阪') ? '大阪府' : '愛知県',
          city: companyName.includes('不動産ライフ') ? '千代田区' : companyName.includes('大阪') ? '大阪市北区' : '名古屋市中区',
          street_address: companyName.includes('不動産ライフ') ? '千代田1-2-3' : companyName.includes('大阪') ? '梅田1-2-3' : '栄1-2-3',
          building: companyName.includes('不動産ライフ') ? 'チヨダマンション' : companyName.includes('大阪') ? '梅田マンション' : '栄マンション',
          room_number: '101',
          id_card_front_path: '/uploads/id_cards/front_sample.jpg',
          id_card_back_path: '/uploads/id_cards/back_sample.jpg',
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4(),
          first_name: companyName.includes('不動産ライフ') ? '花子' : companyName.includes('大阪') ? '美咲' : '由美',
          last_name: companyName.includes('不動産ライフ') ? '鈴木' : companyName.includes('大阪') ? '高橋' : '伊藤',
          first_name_kana: companyName.includes('不動産ライフ') ? 'ハナコ' : companyName.includes('大阪') ? 'ミサキ' : 'ユミ',
          last_name_kana: companyName.includes('不動産ライフ') ? 'スズキ' : companyName.includes('大阪') ? 'タカハシ' : 'イトウ',
          birthday: '1990-08-20',
          gender: 'female',
          mail_address: `customer2@${companyName.includes('不動産ライフ') ? 'example' : companyName.includes('大阪') ? 'osaka-customer' : 'nagoya-customer'}.com`,
          phone_number: companyName.includes('不動産ライフ') ? '090-1111-2222' : companyName.includes('大阪') ? '090-2222-3333' : '090-3333-4444',
          postcode: companyName.includes('不動産ライフ') ? '1000002' : companyName.includes('大阪') ? '5300002' : '4600003',
          prefecture: companyName.includes('不動産ライフ') ? '東京都' : companyName.includes('大阪') ? '大阪府' : '愛知県',
          city: companyName.includes('不動産ライフ') ? '港区' : companyName.includes('大阪') ? '大阪市中央区' : '名古屋市東区',
          street_address: companyName.includes('不動産ライフ') ? '六本木1-2-3' : companyName.includes('大阪') ? '本町1-2-3' : '東区1-2-3',
          building: companyName.includes('不動産ライフ') ? '六本木ハイツ' : companyName.includes('大阪') ? '本町ハイツ' : '東区ハイツ',
          room_number: '205',
          id_card_front_path: '/uploads/id_cards/front_sample2.jpg',
          id_card_back_path: '/uploads/id_cards/back_sample2.jpg',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1日前
        }
      ];
      
      customers.push(...companyCustomers);
      customerIds[clientId] = companyCustomers.map(c => c.id);
    }

    // 2. 物件データの作成
    console.log('🏠 物件データを作成中...');
    const properties = [];
    const propertyIds = {};
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const companyProperties = [
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4(),
          name: `${companyName.includes('不動産ライフ') ? '東京都千代田区の新築マンション' : companyName.includes('大阪') ? '大阪市北区の中古マンション' : '名古屋市中区の戸建て'}`,
          type: companyName.includes('不動産ライフ') ? 'マンション' : companyName.includes('大阪') ? 'マンション' : '戸建て',
          price: companyName.includes('不動産ライフ') ? 85000000 : companyName.includes('大阪') ? 65000000 : 45000000,
          postcode: companyName.includes('不動産ライフ') ? '1000001' : companyName.includes('大阪') ? '5300001' : '4600002',
          prefecture: companyName.includes('不動産ライフ') ? '東京都' : companyName.includes('大阪') ? '大阪府' : '愛知県',
          city: companyName.includes('不動産ライフ') ? '千代田区' : companyName.includes('大阪') ? '大阪市北区' : '名古屋市中区',
          street_address: companyName.includes('不動産ライフ') ? '千代田2-3-4' : companyName.includes('大阪') ? '梅田2-3-4' : '栄2-3-4',
          building_name: companyName.includes('不動産ライフ') ? 'グランドマンション千代田' : companyName.includes('大阪') ? 'ロイヤル梅田' : 'ファミリーハウス栄',
          floor_area: companyName.includes('不動産ライフ') ? 85.5 : companyName.includes('大阪') ? 72.3 : 98.7,
          rooms: companyName.includes('不動産ライフ') ? '3LDK' : companyName.includes('大阪') ? '2LDK' : '4LDK',
          construction_year: companyName.includes('不動産ライフ') ? 2024 : companyName.includes('大阪') ? 2018 : 2020,
          parking: true,
          inquiry_count: 0,
          sales_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日前
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4(),
          name: `${companyName.includes('不動産ライフ') ? '東京都港区のタワーマンション' : companyName.includes('大阪') ? '大阪市中央区のデザイナーズマンション' : '名古屋市東区の新築戸建て'}`,
          type: companyName.includes('不動産ライフ') ? 'マンション' : companyName.includes('大阪') ? 'マンション' : '戸建て',
          price: companyName.includes('不動産ライフ') ? 120000000 : companyName.includes('大阪') ? 78000000 : 52000000,
          postcode: companyName.includes('不動産ライフ') ? '1060032' : companyName.includes('大阪') ? '5410041' : '4610001',
          prefecture: companyName.includes('不動産ライフ') ? '東京都' : companyName.includes('大阪') ? '大阪府' : '愛知県',
          city: companyName.includes('不動産ライフ') ? '港区' : companyName.includes('大阪') ? '大阪市中央区' : '名古屋市東区',
          street_address: companyName.includes('不動産ライフ') ? '六本木3-4-5' : companyName.includes('大阪') ? '本町3-4-5' : '東区3-4-5',
          building_name: companyName.includes('不動産ライフ') ? 'プレミアムタワー六本木' : companyName.includes('大阪') ? 'デザインレジデンス本町' : 'モダンハウス東区',
          floor_area: companyName.includes('不動産ライフ') ? 102.8 : companyName.includes('大阪') ? 89.4 : 115.2,
          rooms: companyName.includes('不動産ライフ') ? '4LDK' : companyName.includes('大阪') ? '3LDK' : '5LDK',
          construction_year: companyName.includes('不動産ライフ') ? 2025 : companyName.includes('大阪') ? 2022 : 2024,
          parking: true,
          inquiry_count: 0,
          sales_start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15日前
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      properties.push(...companyProperties);
      propertyIds[clientId] = companyProperties.map(p => p.id);
    }

    // 3. 問い合わせデータの作成
    console.log('📞 問い合わせデータを作成中...');
    const inquiries = [];
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const companyCustomers = customerIds[clientId];
      const companyProperties = propertyIds[clientId];
      
      // 各物件に対して複数の問い合わせを作成
      for (let i = 0; i < companyProperties.length; i++) {
        for (let j = 0; j < companyCustomers.length; j++) {
          const inquiryMethods = ['SUUMO', '電話', 'その他'];
          const inquiryTypes = ['viewing', 'information', 'price_inquiry'];
          
          inquiries.push({
            id: uuidv4(),
            client_id: clientId,
            customer_id: companyCustomers[j],
            property_id: companyProperties[i],
            employee_id: Object.values(employeeMapping).find(e => e.client_id === clientId)?.employee_id || uuidv4(),
            inquired_at: new Date(Date.now() - (7 - i - j) * 24 * 60 * 60 * 1000).toISOString(),
            title: '新規問い合わせ',
            category: 'inquiry',
            type: inquiryTypes[j % inquiryTypes.length],
            method: inquiryMethods[i % inquiryMethods.length],
            summary: `${companyName}の物件に関する${inquiryMethods[i % inquiryMethods.length]}での問い合わせです。${inquiryTypes[j % inquiryTypes.length] === 'viewing' ? '見学希望' : inquiryTypes[j % inquiryTypes.length] === 'price_inquiry' ? '価格について' : '詳細情報について'}のお問い合わせです。`,
            created_at: new Date(Date.now() - (7 - i - j) * 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // 4. レポートデータの作成
    console.log('📊 レポートデータを作成中...');
    const reports = [];
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const companyProperties = propertyIds[clientId];
      const companyCustomers = customerIds[clientId];
      
      // このクライアントの問い合わせから顧客対応データを作成
      const clientInquiries = inquiries.filter(inquiry => inquiry.client_id === clientId);
      const customerInteractions = clientInquiries.map((inquiry, index) => {
        const customer = customers.find(c => c.id === inquiry.customer_id);
        return {
          customer_id: inquiry.customer_id,
          customer_name: customer ? `${customer.last_name}${customer.first_name}` : '顧客名不明',
          date: inquiry.inquired_at.split('T')[0], // 日付のみ
          title: inquiry.title,
          category: inquiry.type === 'viewing' ? '内見' : inquiry.type === 'price_inquiry' ? '価格問合せ' : '問合せ',
          content: inquiry.summary
        };
      });
      
      // 各クライアントに1つのレポートを作成
      reports.push({
        id: `RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 3).toUpperCase()}`,
        client_id: clientId,
        property_id: companyProperties[0], // 最初の物件を使用
        report_start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        report_end_date: new Date().toISOString().split('T')[0],
        title: `${companyName}月次活動報告書`,
        is_draft: false,
        current_status: '販売中',
        summary: `${companyName}の物件活動報告書です。順調に問い合わせが入っており、見学希望者も複数名います。`,
        is_suumo_published: true,
        views_count: Math.floor(Math.random() * 100) + 50,
        inquiries_count: Math.floor(Math.random() * 10) + 3,
        business_meeting_count: Math.floor(Math.random() * 5) + 1,
        viewing_count: Math.floor(Math.random() * 8) + 2,
        customer_interactions: customerInteractions, // 顧客対応データを追加
        price: companyName.includes('不動産ライフ') ? '85,000,000' : companyName.includes('大阪') ? '65,000,000' : '45,000,000',
        sales_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // データをDynamoDBに挿入
    console.log('💾 DynamoDBにデータを挿入中...');
    
    // Customers
    for (const customer of customers) {
      await docClient.put({
        TableName: tableNames.customers,
        Item: customer
      }).promise();
    }
    console.log(`✅ 顧客データ ${customers.length}件を挿入完了`);

    // Properties
    for (const property of properties) {
      await docClient.put({
        TableName: tableNames.properties,
        Item: property
      }).promise();
    }
    console.log(`✅ 物件データ ${properties.length}件を挿入完了`);

    // Inquiries
    for (const inquiry of inquiries) {
      await docClient.put({
        TableName: tableNames.inquiry,
        Item: inquiry
      }).promise();
    }
    console.log(`✅ 問い合わせデータ ${inquiries.length}件を挿入完了`);

    // Reports
    for (const report of reports) {
      await docClient.put({
        TableName: tableNames.report,
        Item: report
      }).promise();
    }
    console.log(`✅ レポートデータ ${reports.length}件を挿入完了`);

    console.log('\n🎉 DynamoDBシードデータの作成が完了しました！');
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
    console.error('❌ DynamoDBシードデータ作成エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSeedData(); 