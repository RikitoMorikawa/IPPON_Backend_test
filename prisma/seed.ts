import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  //TODO: 決済関連は後で作成する
  console.log('🌱 シードデータの作成を開始します...');

  // 1. 管理メンバーの作成
  console.log('👤 管理メンバーを作成中...');
  const adminMembers = await Promise.all([
    prisma.mstAdminMembers.create({
      data: {
        registring_member_id: 'system-generated-id-1',
        is_admin: true,
        last_name: 'テスト',
        first_name: '太朗',
        middle_name: null,
        last_name_kana: 'テスト',
        first_name_kana: 'タロウ',
        middle_name_kana: null,
        mail_address: 'test.startgear@gmail.com',
        icon_image_path: null,
        is_active: true,
      },
    }),
  ]);

  // 2. オプションの作成
  console.log('⚙️ オプションを作成中...');
  const options = await Promise.all([
    prisma.mstOptions.create({
      data: {
        name: '高度検索機能',
        is_active: true,
      },
    }),
    prisma.mstOptions.create({
      data: {
        name: 'レポート機能',
        is_active: true,
      },
    }),
    prisma.mstOptions.create({
      data: {
        name: 'API連携',
        is_active: true,
      },
    }),
    prisma.mstOptions.create({
      data: {
        name: 'カスタムダッシュボード',
        is_active: false,
      },
    }),
  ]);

  // 3. サービスの作成
  console.log('🔧 サービスを作成中...');
  const services = await Promise.all([
    prisma.mstServices.create({
      data: {
        name: '物件管理システム',
        is_active: true,
      },
    }),
    prisma.mstServices.create({
      data: {
        name: '顧客管理システム',
        is_active: true,
      },
    }),
    prisma.mstServices.create({
      data: {
        name: '契約管理システム',
        is_active: true,
      },
    }),
    prisma.mstServices.create({
      data: {
        name: '売上分析システム',
        is_active: true,
      },
    }),
  ]);

  // 4. クライアント企業の作成（CognitoのcustomClientIdに合わせて作成）
  console.log('🏢 クライアント企業を作成中...');
  const clients = await Promise.all([
    prisma.mstClients.create({
      data: {
        id: '0423994e-0c0e-4906-b80b-b098b1527a83', // Cognitoのcustom:clientIdに合わせる
        created_by_member_id: adminMembers[0].id,
        updated_by_member_id: adminMembers[0].id,
        name: '株式会社不動産ライフ',
        name_kana: 'カブシキガイシャフドウサンライフ',
        real_estate_number: '東京都知事(1)第12345号',
        phone_number: '03-1234-5678',
        mail_address: 'info@fudosan-life.co.jp',
        hp_address: 'https://www.fudosan-life.co.jp',
        postcode: '1000001',
        prefecture: '東京都',
        city: '千代田区',
        street_address: '千代田1-1-1',
        building_and_room_number: 'チヨダビル10F',
        is_active: true,
      },
    }),
    prisma.mstClients.create({
      data: {
        id: 'a95c7f8f-1e99-4f42-9c21-0f8d3397d3d9', // Cognitoのcustom:clientIdに合わせる
        created_by_member_id: adminMembers[0].id,
        updated_by_member_id: null,
        name: '大阪不動産株式会社',
        name_kana: 'オオサカフドウサンカブシキガイシャ',
        real_estate_number: '大阪府知事(2)第67890号',
        phone_number: '06-9876-5432',
        mail_address: 'contact@osaka-fudosan.com',
        hp_address: 'https://www.osaka-fudosan.com',
        postcode: '5300001',
        prefecture: '大阪府',
        city: '大阪市北区',
        street_address: '梅田2-2-2',
        building_and_room_number: '梅田タワー5F',
        is_active: true,
      },
    }),
    prisma.mstClients.create({
      data: {
        id: 'd80d3d06-d610-4ec2-bee3-faf946ef64e2', // Cognitoのcustom:clientIdに合わせる
        created_by_member_id: adminMembers[0].id,
        updated_by_member_id: adminMembers[0].id,
        name: '名古屋ホーム販売',
        name_kana: 'ナゴヤホームハンバイ',
        real_estate_number: '愛知県知事(3)第11111号',
        phone_number: '052-1111-2222',
        mail_address: 'sales@nagoya-home.jp',
        hp_address: null,
        postcode: '4600002',
        prefecture: '愛知県',
        city: '名古屋市中区',
        street_address: '栄3-3-3',
        building_and_room_number: null,
        is_active: true,
      },
    }),
  ]);

  // 5. クライアント従業員の作成（PostgreSQLのみ）
  console.log('👨‍💼 クライアント従業員を作成中...');
  // 📝 注意: Cognitoユーザーは既に作成済みです
  // ログイン情報: suzuki@fudosan-life.co.jp / TempPass123! など
  
  const clientEmployees = await Promise.all([
    // 株式会社不動産ライフの従業員
    prisma.mstClientEmployees.create({
      data: {
        client_id: clients[0].id,
        registring_admin_employee_id: null,
        registring_admin_member_id: adminMembers[0].id,
        payment_user_id: null,
        is_active: true,
        last_name: '鈴木',
        first_name: '一郎',
        last_name_kana: 'スズキ',
        first_name_kana: 'イチロウ',
        mail_address: 'suzuki@fudosan-life.co.jp',
      },
    }),
    prisma.mstClientEmployees.create({
      data: {
        client_id: clients[0].id,
        registring_admin_employee_id: null,
        registring_admin_member_id: adminMembers[0].id,
        payment_user_id: null,
        is_active: true,
        last_name: '高橋',
        first_name: '美咲',
        last_name_kana: 'タカハシ',
        first_name_kana: 'ミサキ',
        mail_address: 'takahashi@fudosan-life.co.jp',
      },
    }),
    // 大阪不動産株式会社の従業員
    prisma.mstClientEmployees.create({
      data: {
        client_id: clients[1].id,
        registring_admin_employee_id: null,
        registring_admin_member_id: adminMembers[0].id,
        payment_user_id: null,
        is_active: true,
        last_name: '中村',
        first_name: '健太',
        last_name_kana: 'ナカムラ',
        first_name_kana: 'ケンタ',
        mail_address: 'nakamura@osaka-fudosan.com',
      },
    }),
    // 名古屋ホーム販売の従業員
    prisma.mstClientEmployees.create({
      data: {
        client_id: clients[2].id,
        registring_admin_employee_id: null,
        registring_admin_member_id: adminMembers[0].id,
        payment_user_id: null,
        is_active: true,
        last_name: '伊藤',
        first_name: '由美',
        last_name_kana: 'イトウ',
        first_name_kana: 'ユミ',
        mail_address: 'ito@nagoya-home.jp',
      },
    }),
  ]);

  // 6. クライアント-オプション関連の作成
  console.log('🔗 クライアント-オプション関連を作成中...');
  await Promise.all([
    // 株式会社不動産ライフ: 高度検索機能、レポート機能
    prisma.mstClientOptions.create({
      data: {
        client_id: clients[0].id,
        option_id: options[0].id,
      },
    }),
    prisma.mstClientOptions.create({
      data: {
        client_id: clients[0].id,
        option_id: options[1].id,
      },
    }),
    // 大阪不動産株式会社: API連携
    prisma.mstClientOptions.create({
      data: {
        client_id: clients[1].id,
        option_id: options[2].id,
      },
    }),
    // 名古屋ホーム販売: 高度検索機能
    prisma.mstClientOptions.create({
      data: {
        client_id: clients[2].id,
        option_id: options[0].id,
      },
    }),
  ]);

  // 7. クライアント-サービス関連の作成
  console.log('🔗 クライアント-サービス関連を作成中...');
  await Promise.all([
    // 株式会社不動産ライフ: 物件管理、顧客管理、契約管理
    prisma.mstClientServices.create({
      data: {
        client_id: clients[0].id,
        service_id: services[0].id,
      },
    }),
    prisma.mstClientServices.create({
      data: {
        client_id: clients[0].id,
        service_id: services[1].id,
      },
    }),
    prisma.mstClientServices.create({
      data: {
        client_id: clients[0].id,
        service_id: services[2].id,
      },
    }),
    // 大阪不動産株式会社: 物件管理、売上分析
    prisma.mstClientServices.create({
      data: {
        client_id: clients[1].id,
        service_id: services[0].id,
      },
    }),
    prisma.mstClientServices.create({
      data: {
        client_id: clients[1].id,
        service_id: services[3].id,
      },
    }),
    // 名古屋ホーム販売: 顧客管理のみ
    prisma.mstClientServices.create({
      data: {
        client_id: clients[2].id,
        service_id: services[1].id,
      },
    }),
  ]);

  console.log('✅ シードデータの作成が完了しました！');
  console.log(`📊 作成されたデータ:`);
  console.log(`   - 管理メンバー: ${adminMembers.length}件`);
  console.log(`   - オプション: ${options.length}件`);
  console.log(`   - サービス: ${services.length}件`);
  console.log(`   - クライアント企業: ${clients.length}件`);
  console.log(`   - クライアント従業員: ${clientEmployees.length}件`);
}

main()
  .catch((e) => {
    console.error('❌ シードデータの作成に失敗しました:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 