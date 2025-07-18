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

// データ生成用の設定
const DATA_CONFIG = {
  customersPerClient: 25,     // 各クライアントあたりの顧客数
  individualCustomerRatio: 0.7, // 個人顧客の割合（70%）
  propertiesPerClient: 12,    // 各クライアントあたりの物件数
  inquiriesPerProperty: 8,    // 各物件あたりの問い合わせ数
  reportsPerClient: 5         // 各クライアントあたりのレポート数
};

// ランダムデータ生成用のヘルパー関数
const randomHelpers = {
  // 日本の名前データ（漢字とカタカナのペア）
  firstNames: {
    male: [
      { kanji: '太郎', kana: 'タロウ' },
      { kanji: '次郎', kana: 'ジロウ' },
      { kanji: '三郎', kana: 'サブロウ' },
      { kanji: '四郎', kana: 'シロウ' },
      { kanji: '健太', kana: 'ケンタ' },
      { kanji: '雄一', kana: 'ユウイチ' },
      { kanji: '昭夫', kana: 'アキオ' },
      { kanji: '正男', kana: 'マサオ' },
      { kanji: '博', kana: 'ヒロシ' },
      { kanji: '隆', kana: 'タカシ' },
      { kanji: '勇', kana: 'イサム' },
      { kanji: '誠', kana: 'マコト' },
      { kanji: '学', kana: 'マナブ' },
      { kanji: '武', kana: 'タケシ' },
      { kanji: '清', kana: 'キヨシ' },
      { kanji: '豊', kana: 'ユタカ' },
      { kanji: '明', kana: 'アキラ' },
      { kanji: '光', kana: 'ヒカル' },
      { kanji: '仁', kana: 'ヒトシ' },
      { kanji: '智', kana: 'サトシ' },
      { kanji: '大輔', kana: 'ダイスケ' },
      { kanji: '拓也', kana: 'タクヤ' },
      { kanji: '翔太', kana: 'ショウタ' },
      { kanji: '涼介', kana: 'リョウスケ' },
      { kanji: '和也', kana: 'カズヤ' },
      { kanji: '直樹', kana: 'ナオキ' },
      { kanji: '隼人', kana: 'ハヤト' },
      { kanji: '祐介', kana: 'ユウスケ' },
      { kanji: '大樹', kana: 'ダイキ' },
      { kanji: '慎太郎', kana: 'シンタロウ' }
    ],
    female: [
      { kanji: '花子', kana: 'ハナコ' },
      { kanji: '美咲', kana: 'ミサキ' },
      { kanji: '由美', kana: 'ユミ' },
      { kanji: '恵子', kana: 'ケイコ' },
      { kanji: '真由美', kana: 'マユミ' },
      { kanji: '智子', kana: 'トモコ' },
      { kanji: '久美子', kana: 'クミコ' },
      { kanji: '裕子', kana: 'ユウコ' },
      { kanji: '美穂', kana: 'ミホ' },
      { kanji: '愛', kana: 'アイ' },
      { kanji: '舞', kana: 'マイ' },
      { kanji: '香', kana: 'カオリ' },
      { kanji: '麻衣', kana: 'マイ' },
      { kanji: '絵美', kana: 'エミ' },
      { kanji: '直美', kana: 'ナオミ' },
      { kanji: '美奈', kana: 'ミナ' },
      { kanji: '千鶴', kana: 'チヅル' },
      { kanji: '桜', kana: 'サクラ' },
      { kanji: '春香', kana: 'ハルカ' },
      { kanji: '夏美', kana: 'ナツミ' },
      { kanji: '彩', kana: 'アヤ' },
      { kanji: '結衣', kana: 'ユイ' },
      { kanji: '優花', kana: 'ユウカ' },
      { kanji: '莉子', kana: 'リコ' },
      { kanji: '美月', kana: 'ミヅキ' },
      { kanji: '千春', kana: 'チハル' },
      { kanji: '陽菜', kana: 'ヒナ' },
      { kanji: '七海', kana: 'ナナミ' },
      { kanji: '咲良', kana: 'サクラ' },
      { kanji: '愛美', kana: 'マナミ' }
    ]
  },
  lastNames: ['田中', '佐藤', '山田', '鈴木', '高橋', '伊藤', '渡辺', '中村', '小林', '加藤', '吉田', '山本', '佐々木', '山口', '松本', '井上', '木村', '林', '斉藤', '清水'],
  
  // 日本の地域データ
  regions: {
    '東京都': {
      prefectureCode: '13',
      cities: ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区'],
      postcodes: ['1000001', '1000002', '1000003', '1000004', '1000005', '1000006', '1000007', '1000008', '1000009', '1000010']
    },
    '大阪府': {
      prefectureCode: '27',
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

// 顧客データ生成
function generateCustomer(clientId, employeeId, companyName) {
  const gender = randomHelpers.randomBoolean() ? 'male' : 'female';
  const firstName = randomHelpers.randomChoice(randomHelpers.firstNames[gender]);
  const lastName = randomHelpers.randomChoice(randomHelpers.lastNames);
  
  // 地域を会社名に基づいて決定
  let regionData;
  if (companyName.includes('不動産ライフ')) {
    regionData = randomHelpers.regions['東京都'];
  } else if (companyName.includes('大阪')) {
    regionData = randomHelpers.regions['大阪府'];
  } else {
    regionData = randomHelpers.regions['愛知県'];
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
  let regionData, prefectureName;
  if (companyName.includes('不動産ライフ')) {
    regionData = randomHelpers.regions['東京都'];
    prefectureName = '東京都';
  } else if (companyName.includes('大阪')) {
    regionData = randomHelpers.regions['大阪府'];
    prefectureName = '大阪府';
  } else {
    regionData = randomHelpers.regions['愛知県'];
    prefectureName = '愛知県';
  }
  
  const city = randomHelpers.randomChoice(regionData.cities);
  const postcode = randomHelpers.randomChoice(regionData.postcodes);
  const area = randomHelpers.randomChoice(typeConfig.areas);
  const price = randomHelpers.randomNumber(typeConfig.minPrice, typeConfig.maxPrice);
  
  const rooms = propertyType === 'アパート' ? 
    randomHelpers.randomChoice(['1R', '1K', '1DK', '1LDK', '2DK']) :
    randomHelpers.randomChoice(['2LDK', '3LDK', '4LDK', '5LDK']);
  
  // オーナー名生成（フォールバック付き）
  let ownerLastNameData = randomHelpers.randomChoice(randomHelpers.lastNames);
  let ownerFirstNameData = randomHelpers.randomChoice([...randomHelpers.firstNames.male, ...randomHelpers.firstNames.female]);
  
  // デフォルト値設定
  if (!ownerLastNameData) {
    ownerLastNameData = { kanji: '田中', kana: 'タナカ' };
    console.warn('⚠️ オーナー姓生成でデフォルト値を使用:', ownerLastNameData.kanji);
  }
  if (!ownerFirstNameData) {
    ownerFirstNameData = { kanji: '太郎', kana: 'タロウ' };
    console.warn('⚠️ オーナー名生成でデフォルト値を使用:', ownerFirstNameData.kanji);
  }
  
  const ownerLastName = ownerLastNameData.kanji;
  const ownerLastNameKana = ownerLastNameData.kana;
  const ownerFirstName = ownerFirstNameData.kanji;
  const ownerFirstNameKana = ownerFirstNameData.kana;
  
  return {
    id: uuidv4(),
    client_id: clientId,
    employee_id: employeeId,
    name: `${prefectureName}${city}の${propertyType}`,
    type: propertyType,
    price: price,
    postal_code: postcode,
    prefecture: regionData.prefectureCode,
    city: city,
    block_number: `${randomHelpers.randomNumber(1, 5)}-${randomHelpers.randomNumber(1, 20)}-${randomHelpers.randomNumber(1, 30)}`,
    building: `${randomHelpers.randomChoice(['グランド', 'ロイヤル', 'プレミアム', 'エレガント', 'モダン'])}${propertyType}${city.slice(0, 2)}`,
    owner_last_name: ownerLastName,
    owner_first_name: ownerFirstName,
    owner_last_name_kana: ownerLastNameKana,
    owner_first_name_kana: ownerFirstNameKana,
    sales_start_date: randomHelpers.randomDate(365).split('T')[0],
    inquiry_count: 0, // 後で計算される
    created_at: randomHelpers.randomDate(365),
    // オプション情報
    private_area: parseFloat(area),
    layout: layouts,
    built_year: randomHelpers.randomNumber(2000, 2025),
    parking: randomHelpers.randomBoolean(),
    management_fee: propertyType === PROPERTY_TYPES.NEW_HOUSE ? 0 : randomHelpers.randomNumber(5000, 20000),
    repair_fund: propertyType === PROPERTY_TYPES.NEW_HOUSE ? 0 : randomHelpers.randomNumber(3000, 15000)
  };
}

// 問い合わせデータ生成
function generateInquiry(clientId, customerId, propertyId, employeeId) {
  const inquiryType = randomHelpers.randomChoice(randomHelpers.inquiryTypes);
  const method = randomHelpers.randomChoice(randomHelpers.inquiryMethods);
  
  const summaryMap = {
    [INQUIRY_TYPES.VIEWING_REQUEST]: '物件の見学希望についてのお問い合わせ',
    [INQUIRY_TYPES.PROPERTY_DETAILS]: '物件詳細情報についてのお問い合わせ',
    [INQUIRY_TYPES.RENT_PRICE_INQUIRY]: '価格についてのお問い合わせ',
    [INQUIRY_TYPES.AVAILABILITY_CHECK]: '空き状況の確認についてのお問い合わせ'
  };
  
  return {
    id: uuidv4(),
    client_id: clientId,
    customer_id: customerId,
    property_id: propertyId,
    employee_id: employeeId,
    inquired_at: randomHelpers.randomDate(60),
    title: INQUIRY_TITLES.NEW_INQUIRY,
    category: category,
    type: inquiryType,
    method: method,
    summary: `${method}による${summaryMap[inquiryType] || '問い合わせ'}です。`,
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
    title: `${companyName}活動報告書`,
    is_draft: randomHelpers.randomBoolean(),
    current_status: randomHelpers.randomChoice(Object.values(REPORT_STATUSES)),
    summary: `${companyName}の物件活動報告書です。${randomHelpers.randomChoice(['順調に問い合わせが入っており', '見学希望者が多く', '価格相談が増えており', '成約に向けて進んでおり'])}、今後の展開に期待しています。`,
    is_suumo_published: randomHelpers.randomBoolean(),
    views_count: randomHelpers.randomNumber(20, 200),
    inquiries_count: randomHelpers.randomNumber(3, 25),
    business_meeting_count: randomHelpers.randomNumber(1, 10),
    viewing_count: randomHelpers.randomNumber(2, 15),
    customer_interactions: customerInteractions,
    price: randomHelpers.randomNumber(30000000, 150000000).toString(),
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
    const { clientMapping, employeesByClient } = await getPostgreSQLData();

    const customers = [];
    const properties = [];
    const inquiries = [];
    const reports = [];
    
    const customerIds = {};
    const propertyIds = {};

    // 各クライアントに対してデータを生成
    for (const [companyName, clientId] of Object.entries(clientMapping)) {
      console.log(`\n🏢 ${companyName} (${clientId}) のデータを生成中...`);
      
      const clientEmployees = employeesByClient[clientId] || [];
      const primaryEmployee = clientEmployees[0]; // 最初の従業員を使用
      
      if (!primaryEmployee) {
        console.warn(`⚠️ クライアント ${companyName} (${clientId}) に従業員が見つかりません。スキップします。`);
        continue;
      }
      
      const employeeId = primaryEmployee.employee_id;
      
      // 顧客データ生成（個人70%、法人30%）
      console.log(`   👤 顧客データ生成中... (${DATA_CONFIG.customersPerClient}件 - 個人:${Math.floor(DATA_CONFIG.customersPerClient * DATA_CONFIG.individualCustomerRatio)}件, 法人:${Math.floor(DATA_CONFIG.customersPerClient * (1 - DATA_CONFIG.individualCustomerRatio))}件)`);
      const clientCustomers = [];
      for (let i = 0; i < DATA_CONFIG.customersPerClient; i++) {
        const isIndividual = Math.random() < DATA_CONFIG.individualCustomerRatio;
        const customer = isIndividual 
          ? generateIndividualCustomer(clientId, employeeId, companyName) 
          : generateCorporateCustomer(clientId, employeeId, companyName);
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
            customer_name: customerName,
            date: inquiry.inquired_at.split('T')[0],
            title: inquiry.title,
            category: inquiry.type === INQUIRY_TYPES.VIEWING_REQUEST ? '内見' : 
                     inquiry.type === INQUIRY_TYPES.RENT_PRICE_INQUIRY ? '価格問合せ' : '問合せ',
            content: inquiry.summary
          };
        });
        
        const report = generateReport(clientId, propertyId, companyName, customerInteractions);
        reports.push(report);
      }
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

    console.log('📊 物件別問い合わせ数（先頭10件）:');
    properties.slice(0, 10).forEach(property => {
      console.log(`   ${property.name}: ${property.inquiry_count}件`);
    });

    // データ検証
    console.log('🔍 データ検証中...');
    const invalidCustomers = customers.filter(customer => 
      !customer.first_name || !customer.last_name || 
      !customer.first_name_kana || !customer.last_name_kana ||
      customer.first_name.trim() === '' || customer.last_name.trim() === '' ||
      customer.first_name_kana.trim() === '' || customer.last_name_kana.trim() === ''
    );
    
    if (invalidCustomers.length > 0) {
      console.warn(`⚠️ 名前が不正な顧客が ${invalidCustomers.length}件 見つかりました:`);
      invalidCustomers.slice(0, 5).forEach(customer => {
        console.warn(`   顧客ID: ${customer.id}`);
        console.warn(`     姓: "${customer.last_name}" (カナ: "${customer.last_name_kana}")`);
        console.warn(`     名: "${customer.first_name}" (カナ: "${customer.first_name_kana}")`);
      });
    } else {
      console.log('✅ すべての顧客データの名前とカナ名が正常です');
    }
    
    // カナ名のサンプル表示
    console.log('📝 生成された名前の例（先頭5件）:');
    customers.slice(0, 5).forEach(customer => {
      console.log(`   ${customer.last_name}${customer.first_name} (${customer.last_name_kana}${customer.first_name_kana})`);
    });

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
    
    // CustomerDetails（新スキーマ）
    console.log(`   👤 顧客詳細データ挿入中... (${customers.length}件)`);
    const individualCount = customers.filter(c => c.customer_type === 'individual_customer').length;
    const corporateCount = customers.filter(c => c.customer_type === 'corporate_customer').length;
    console.log(`       個人顧客: ${individualCount}件, 法人顧客: ${corporateCount}件`);
    await singleWrite(tableNames.customers, customers);
    console.log(`   ✅ 顧客詳細データ挿入完了`);

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