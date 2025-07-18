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

// テーブル名（新しいスキーマに対応 - configファイルと一致）
const tableNames = {
  customers: 'dev-sales-brokerage-customer-detail-dynamodb', // CustomerDetailテーブル
  inquiry: 'dev-sales-brokerage-inquiry-dynamodb',
  properties: 'dev-sales-brokerage-property-dynamodb',
  report: 'dev-sales-brokerage-ai-report-dynamodb'
};

// Enum定義（実際のenumファイルから取得）
const GENDERS = {
  MALE: '男性',
  FEMALE: '女性',
  NOT_SET: '設定しない',
};

const INQUIRY_TITLES = {
  NEW_INQUIRY: '新規問い合わせ',
};

const INQUIRY_CATEGORIES = {
  NEW_INQUIRY: '問い合わせ（新規）',
  GENERAL_INQUIRY: 'お問い合わせ',
  BUSINESS_MEETING: '商談',
  VIEWING: '内見',
};

const INQUIRY_TYPES = {
  AVAILABILITY_CHECK: '空き状況の確認',
  RENT_PRICE_INQUIRY: '賃料・価格について',
  VIEWING_REQUEST: '内見希望',
  PROPERTY_DETAILS: '物件の詳細情報（設備、周辺環境など）',
};

const INQUIRY_METHODS = {
  SUUMO: 'SUUMO',
  PHONE: '電話',
  OTHER: 'その他',
};

const PROPERTY_TYPES = {
  LAND: '土地',
  APARTMENT: 'マンション',
  NEW_HOUSE: '新築',
};

const REPORT_STATUSES = {
  RECRUITING: '募集中',
  APPLICATION_RECEIVED: '申し込みあり',
  CONTRACT_COMPLETED: '契約済み',
  LISTING_ENDED: '掲載終了',
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

  // クライアントごとの従業員マッピングを作成
  const employeesByClient = {};
  employees.forEach(employee => {
    if (!employeesByClient[employee.client_id]) {
      employeesByClient[employee.client_id] = [];
    }
    employeesByClient[employee.client_id].push({
      employee_id: employee.id,
      name: `${employee.last_name}${employee.first_name}`,
      mail_address: employee.mail_address
    });
  });

  console.log('✅ PostgreSQLデータ取得完了');
  console.log(`   クライアント: ${clients.length}件`);
  console.log(`   従業員: ${employees.length}件`);

  return { clientMapping, employeesByClient };
}

async function createSeedData() {
  console.log('🌱 DynamoDBのシードデータを作成中...');

  try {
    // PostgreSQLからデータを取得
    const { clientMapping, employeesByClient } = await getPostgreSQLData();

    console.log('📋 使用するクライアントマッピング:');
    Object.entries(clientMapping).forEach(([name, id]) => {
      console.log(`   ${name}: ${id}`);
    });

    // 1. 顧客詳細データの作成（個人・法人両方）
    console.log('👤 顧客詳細データを作成中...');
    const customers = [];
    const customerIds = {};
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const clientEmployees = employeesByClient[clientId] || [];
      const primaryEmployee = clientEmployees[0];
      
      if (!primaryEmployee) {
        console.warn(`⚠️ クライアント ${companyName} (${clientId}) に従業員が見つかりません。スキップします。`);
        continue;
      }
      
      // 各会社に2人の顧客を作成（個人顧客1人、法人顧客1人）
      const companyCustomers = [
        // 個人顧客
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: primaryEmployee.employee_id,
          customer_type: 'individual_customer',
          property_ids: [], // 後で物件IDが設定される
          individual_customer_details: {
            first_name: companyName.includes('不動産ライフ') ? '太郎' : companyName.includes('大阪') ? '次郎' : '三郎',
            last_name: companyName.includes('不動産ライフ') ? '田中' : companyName.includes('大阪') ? '佐藤' : '山田',
            birthday: '1985-05-15',
            mail_address: `customer1@${companyName.includes('不動産ライフ') ? 'example' : companyName.includes('大阪') ? 'osaka-customer' : 'nagoya-customer'}.com`,
            postcode: companyName.includes('不動産ライフ') ? '1000001' : companyName.includes('大阪') ? '5300001' : '4600002',
            prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23', // 都道府県コード
            city: companyName.includes('不動産ライフ') ? '千代田区' : companyName.includes('大阪') ? '大阪市北区' : '名古屋市中区',
            street_address: companyName.includes('不動産ライフ') ? '千代田1-2-3' : companyName.includes('大阪') ? '梅田1-2-3' : '栄1-2-3',
            building: companyName.includes('不動産ライフ') ? 'チヨダマンション' : companyName.includes('大阪') ? '梅田マンション' : '栄マンション',
            id_card_front_path: '/uploads/id_cards/front_sample.jpg',
            id_card_back_path: '/uploads/id_cards/back_sample.jpg'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        // 法人顧客
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: primaryEmployee.employee_id,
          customer_type: 'corporate_customer',
          property_ids: [], // 後で物件IDが設定される
          corporate_customer_details: {
            // 会社基本情報
            corporate_name: companyName.includes('不動産ライフ') ? '株式会社東京商事' : companyName.includes('大阪') ? '関西興産株式会社' : '中部建設株式会社',
            corporate_name_kana: companyName.includes('不動産ライフ') ? 'カブシキガイシャトウキョウショウジ' : companyName.includes('大阪') ? 'カンサイコウサンカブシキガイシャ' : 'チュウブケンセツカブシキガイシャ',
            head_office_postcode: companyName.includes('不動産ライフ') ? '1000002' : companyName.includes('大阪') ? '5300002' : '4600003',
            head_office_prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23', // 都道府県コード
            head_office_city: companyName.includes('不動産ライフ') ? '港区' : companyName.includes('大阪') ? '大阪市中央区' : '名古屋市東区',
            head_office_street_address: companyName.includes('不動産ライフ') ? '六本木1-2-3' : companyName.includes('大阪') ? '本町1-2-3' : '東区1-2-3',
            head_office_building: companyName.includes('不動産ライフ') ? '六本木ビル' : companyName.includes('大阪') ? '本町ビル' : '東区ビル',
            head_office_phone_number: companyName.includes('不動産ライフ') ? '03-1234-5678' : companyName.includes('大阪') ? '06-2345-6789' : '052-3456-7890',
            business_type: '建設業',
            capital_fund: '10000000',
            employees_count: '50',
            establishment_date: '2010-04-01',
            
            // 代表者情報
            representative_last_name: companyName.includes('不動産ライフ') ? '鈴木' : companyName.includes('大阪') ? '高橋' : '伊藤',
            representative_first_name: companyName.includes('不動産ライフ') ? '花子' : companyName.includes('大阪') ? '美咲' : '由美',
            representative_last_name_kana: companyName.includes('不動産ライフ') ? 'スズキ' : companyName.includes('大阪') ? 'タカハシ' : 'イトウ',
            representative_first_name_kana: companyName.includes('不動産ライフ') ? 'ハナコ' : companyName.includes('大阪') ? 'ミサキ' : 'ユミ',
            representative_mobile_number: companyName.includes('不動産ライフ') ? '090-1111-2222' : companyName.includes('大阪') ? '090-2222-3333' : '090-3333-4444',
            representative_postcode: companyName.includes('不動産ライフ') ? '1000003' : companyName.includes('大阪') ? '5300003' : '4600004',
            representative_prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23',
            representative_city: companyName.includes('不動産ライフ') ? '新宿区' : companyName.includes('大阪') ? '大阪市西区' : '名古屋市西区',
            representative_street_address: companyName.includes('不動産ライフ') ? '新宿1-1-1' : companyName.includes('大阪') ? '西区1-1-1' : '西区1-1-1',
            representative_building: companyName.includes('不動産ライフ') ? '新宿マンション' : companyName.includes('大阪') ? '西区マンション' : '西区マンション',
            representative_id_card_front_path: '/uploads/id_cards/rep_front_sample.jpg',
            representative_id_card_back_path: '/uploads/id_cards/rep_back_sample.jpg',
            
            // 担当者情報
            manager_last_name: companyName.includes('不動産ライフ') ? '山田' : companyName.includes('大阪') ? '中村' : '小林',
            manager_first_name: companyName.includes('不動産ライフ') ? '一郎' : companyName.includes('大阪') ? '二郎' : '三郎',
            manager_last_name_kana: companyName.includes('不動産ライフ') ? 'ヤマダ' : companyName.includes('大阪') ? 'ナカムラ' : 'コバヤシ',
            manager_first_name_kana: companyName.includes('不動産ライフ') ? 'イチロウ' : companyName.includes('大阪') ? 'ジロウ' : 'サブロウ',
            manager_phone_number: companyName.includes('不動産ライフ') ? '03-1111-1111' : companyName.includes('大阪') ? '06-2222-2222' : '052-3333-3333',
            manager_email_address: `manager@${companyName.includes('不動産ライフ') ? 'tokyo-shoji' : companyName.includes('大阪') ? 'kansai-kosan' : 'chubu-kensetsu'}.co.jp`,
            manager_department: '営業部',
            manager_position: '部長',
            manager_id_card_front_path: '/uploads/id_cards/mgr_front_sample.jpg',
            manager_id_card_back_path: '/uploads/id_cards/mgr_back_sample.jpg',
            manager_postcode: companyName.includes('不動産ライフ') ? '1000004' : companyName.includes('大阪') ? '5300004' : '4600005',
            manager_prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23',
            manager_city: companyName.includes('不動産ライフ') ? '渋谷区' : companyName.includes('大阪') ? '大阪市南区' : '名古屋市南区',
            manager_street_address: companyName.includes('不動産ライフ') ? '渋谷1-1-1' : companyName.includes('大阪') ? '南区1-1-1' : '南区1-1-1',
            manager_building: companyName.includes('不動産ライフ') ? '渋谷ハイツ' : companyName.includes('大阪') ? '南区ハイツ' : '南区ハイツ'
          },
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1日前
          updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
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
      const clientEmployees = employeesByClient[clientId] || [];
      const primaryEmployee = clientEmployees[0];
      
      if (!primaryEmployee) {
        continue;
      }

      const companyProperties = [
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: primaryEmployee.employee_id,
          name: `${companyName.includes('不動産ライフ') ? '東京都千代田区の新築マンション' : companyName.includes('大阪') ? '大阪市北区の中古マンション' : '名古屋市中区の戸建て'}`,
          type: companyName.includes('戸建て') ? PROPERTY_TYPES.NEW_HOUSE : PROPERTY_TYPES.APARTMENT,
          price: companyName.includes('不動産ライフ') ? 85000000 : companyName.includes('大阪') ? 65000000 : 45000000,
          postal_code: companyName.includes('不動産ライフ') ? '1000001' : companyName.includes('大阪') ? '5300001' : '4600002',
          prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23', // 東京都:13, 大阪府:27, 愛知県:23
          city: companyName.includes('不動産ライフ') ? '千代田区' : companyName.includes('大阪') ? '大阪市北区' : '名古屋市中区',
          block_number: companyName.includes('不動産ライフ') ? '千代田2-3-4' : companyName.includes('大阪') ? '梅田2-3-4' : '栄2-3-4',
          building: companyName.includes('不動産ライフ') ? 'グランドマンション千代田' : companyName.includes('大阪') ? 'ロイヤル梅田' : 'ファミリーハウス栄',
          owner_last_name: companyName.includes('不動産ライフ') ? '田中' : companyName.includes('大阪') ? '佐藤' : '山田',
          owner_first_name: companyName.includes('不動産ライフ') ? '太郎' : companyName.includes('大阪') ? '次郎' : '三郎',
          owner_last_name_kana: companyName.includes('不動産ライフ') ? 'タナカ' : companyName.includes('大阪') ? 'サトウ' : 'ヤマダ',
          owner_first_name_kana: companyName.includes('不動産ライフ') ? 'タロウ' : companyName.includes('大阪') ? 'ジロウ' : 'サブロウ',
          sales_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日前
          inquiry_count: 0,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          // オプション情報
          private_area: companyName.includes('不動産ライフ') ? 85.5 : companyName.includes('大阪') ? 72.3 : 98.7,
          layout: companyName.includes('不動産ライフ') ? '3LDK' : companyName.includes('大阪') ? '2LDK' : '4LDK',
          built_year: companyName.includes('不動産ライフ') ? 2024 : companyName.includes('大阪') ? 2018 : 2020,
          parking: true,
          management_fee: companyName.includes('不動産ライフ') ? 15000 : companyName.includes('大阪') ? 12000 : 0,
          repair_fund: companyName.includes('不動産ライフ') ? 8000 : companyName.includes('大阪') ? 6000 : 0,
        },
        {
          id: uuidv4(),
          client_id: clientId,
          employee_id: primaryEmployee.employee_id,
          name: `${companyName.includes('不動産ライフ') ? '東京都港区のタワーマンション' : companyName.includes('大阪') ? '大阪市中央区のデザイナーズマンション' : '名古屋市東区の新築戸建て'}`,
          type: companyName.includes('戸建て') ? PROPERTY_TYPES.NEW_HOUSE : PROPERTY_TYPES.APARTMENT,
          price: companyName.includes('不動産ライフ') ? 120000000 : companyName.includes('大阪') ? 78000000 : 52000000,
          postal_code: companyName.includes('不動産ライフ') ? '1060032' : companyName.includes('大阪') ? '5410041' : '4610001',
          prefecture: companyName.includes('不動産ライフ') ? '13' : companyName.includes('大阪') ? '27' : '23', // 東京都:13, 大阪府:27, 愛知県:23
          city: companyName.includes('不動産ライフ') ? '港区' : companyName.includes('大阪') ? '大阪市中央区' : '名古屋市東区',
          block_number: companyName.includes('不動産ライフ') ? '六本木3-4-5' : companyName.includes('大阪') ? '本町3-4-5' : '東区3-4-5',
          building: companyName.includes('不動産ライフ') ? 'プレミアムタワー六本木' : companyName.includes('大阪') ? 'デザインレジデンス本町' : 'モダンハウス東区',
          owner_last_name: companyName.includes('不動産ライフ') ? '佐藤' : companyName.includes('大阪') ? '田中' : '鈴木',
          owner_first_name: companyName.includes('不動産ライフ') ? '花子' : companyName.includes('大阪') ? '美咲' : '由美',
          owner_last_name_kana: companyName.includes('不動産ライフ') ? 'サトウ' : companyName.includes('大阪') ? 'タナカ' : 'スズキ',
          owner_first_name_kana: companyName.includes('不動産ライフ') ? 'ハナコ' : companyName.includes('大阪') ? 'ミサキ' : 'ユミ',
          sales_start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15日前
          inquiry_count: 0,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          // オプション情報
          private_area: companyName.includes('不動産ライフ') ? 102.8 : companyName.includes('大阪') ? 89.4 : 115.2,
          layout: companyName.includes('不動産ライフ') ? '4LDK' : companyName.includes('大阪') ? '3LDK' : '5LDK',
          built_year: companyName.includes('不動産ライフ') ? 2025 : companyName.includes('大阪') ? 2022 : 2024,
          parking: true,
          management_fee: companyName.includes('不動産ライフ') ? 18000 : companyName.includes('大阪') ? 14000 : 0,
          repair_fund: companyName.includes('不動産ライフ') ? 10000 : companyName.includes('大阪') ? 8000 : 0,
        }
      ];
      
      properties.push(...companyProperties);
      propertyIds[clientId] = companyProperties.map(p => p.id);
    }

    // 3. 問い合わせデータの作成
    console.log('📞 問い合わせデータを作成中...');
    const inquiries = [];
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const companyCustomers = customerIds[clientId] || [];
      const companyProperties = propertyIds[clientId] || [];
      const clientEmployees = employeesByClient[clientId] || [];
      const primaryEmployee = clientEmployees[0];
      
      if (!primaryEmployee || companyCustomers.length === 0 || companyProperties.length === 0) {
        continue;
      }

      // 各物件に対して複数の問い合わせを作成
      for (let i = 0; i < companyProperties.length; i++) {
        for (let j = 0; j < companyCustomers.length; j++) {
          const inquiryMethods = [INQUIRY_METHODS.SUUMO, INQUIRY_METHODS.PHONE, INQUIRY_METHODS.OTHER];
          const inquiryTypes = [INQUIRY_TYPES.VIEWING_REQUEST, INQUIRY_TYPES.PROPERTY_DETAILS, INQUIRY_TYPES.RENT_PRICE_INQUIRY];
          const inquiryCategories = [INQUIRY_CATEGORIES.VIEWING, INQUIRY_CATEGORIES.GENERAL_INQUIRY, INQUIRY_CATEGORIES.NEW_INQUIRY];
          
          // 2日以内のランダムな時間を生成（現在から48時間以内）
          const randomHoursAgo = Math.random() * 48; // 0-48時間前
          const inquiryTime = new Date(Date.now() - randomHoursAgo * 60 * 60 * 1000);
          
          inquiries.push({
            id: uuidv4(),
            client_id: clientId,
            customer_id: companyCustomers[j],
            property_id: companyProperties[i],
            employee_id: primaryEmployee.employee_id,
            inquired_at: inquiryTime.toISOString(),
            title: INQUIRY_TITLES.NEW_INQUIRY,
            category: inquiryCategories[j % inquiryCategories.length],
            type: inquiryTypes[j % inquiryTypes.length],
            method: inquiryMethods[i % inquiryMethods.length],
            summary: `${companyName}の物件に関する${inquiryMethods[i % inquiryMethods.length]}での問い合わせです。${inquiryTypes[j % inquiryTypes.length]}についてのお問い合わせです。`,
            created_at: inquiryTime.toISOString()
          });
        }
      }
    }

    // 4. レポートデータの作成
    console.log('📊 レポートデータを作成中...');
    const reports = [];
    
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      const companyProperties = propertyIds[clientId] || [];
      const companyCustomers = customerIds[clientId] || [];
      
      if (companyProperties.length === 0) {
        continue;
      }
      
      // このクライアントの問い合わせから顧客対応データを作成
      const clientInquiries = inquiries.filter(inquiry => inquiry.client_id === clientId);
      const customerInteractions = clientInquiries.map((inquiry, index) => {
        const customer = customers.find(c => c.id === inquiry.customer_id);
        let customerName = '顧客名不明';
        
        if (customer) {
          if (customer.customer_type === 'individual_customer' && customer.individual_customer_details) {
            customerName = `${customer.individual_customer_details.last_name}${customer.individual_customer_details.first_name}`;
          } else if (customer.customer_type === 'corporate_customer' && customer.corporate_customer_details) {
            customerName = customer.corporate_customer_details.corporate_name;
          }
        }
        
        return {
          customer_id: inquiry.customer_id,
          customer_name: customerName,
          date: inquiry.inquired_at.split('T')[0], // 日付のみ
          title: inquiry.title,
          category: inquiry.type === INQUIRY_TYPES.VIEWING_REQUEST ? '内見' : inquiry.type === INQUIRY_TYPES.RENT_PRICE_INQUIRY ? '価格問合せ' : '問合せ',
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
        current_status: REPORT_STATUSES.RECRUITING,
        summary: `${companyName}の物件活動報告書です。順調に問い合わせが入っており、見学希望者も複数名います。`,
        is_suumo_published: true,
        views_count: Math.floor(Math.random() * 100) + 50,
        inquiries_count: Math.floor(Math.random() * 10) + 3,
        business_meeting_count: Math.floor(Math.random() * 5) + 1,
        viewing_count: Math.floor(Math.random() * 8) + 2,
        customer_interactions: customerInteractions, // 顧客対応データを追加
        price: (companyName.includes('不動産ライフ') ? 85000000 : companyName.includes('大阪') ? 65000000 : 45000000).toString(),
        sales_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // 各物件の問い合わせ数をカウントして更新
    console.log('📊 物件の問い合わせ数を計算中...');
    const inquiryCountByProperty = {};
    inquiries.forEach(inquiry => {
      if (!inquiryCountByProperty[inquiry.property_id]) {
        inquiryCountByProperty[inquiry.property_id] = 0;
      }
      inquiryCountByProperty[inquiry.property_id]++;
    });

    // 物件データのinquiry_countを更新
    properties.forEach(property => {
      property.inquiry_count = inquiryCountByProperty[property.id] || 0;
    });

    console.log('📊 物件別問い合わせ数:');
    properties.forEach(property => {
      console.log(`   ${property.name}: ${property.inquiry_count}件`);
    });

    // データをDynamoDBに挿入
    console.log('💾 DynamoDBにデータを挿入中...');
    
    // CustomerDetails（新スキーマ）
    const individualCount = customers.filter(c => c.customer_type === 'individual_customer').length;
    const corporateCount = customers.filter(c => c.customer_type === 'corporate_customer').length;
    
    for (const customer of customers) {
      await docClient.put({
        TableName: tableNames.customers,
        Item: customer
      }).promise();
    }
    console.log(`✅ 顧客詳細データ ${customers.length}件を挿入完了 (個人:${individualCount}件, 法人:${corporateCount}件)`);

    // Properties (inquiry_countが更新済み)
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
    console.log(`   - 顧客詳細: ${customers.length}件 (個人:${individualCount}件, 法人:${corporateCount}件)`);
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