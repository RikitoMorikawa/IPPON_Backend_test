#!/bin/bash

# データベースセットアップスクリプト
# このスクリプトは、プロジェクトクローン後のデータベース初期設定を自動化します

set -e  # エラーが発生したら停止

echo "🚀 Starting database setup..."

# 1. 依存関係のインストール
echo "📦 Installing dependencies..."
npm install

# 2. .envファイルの存在確認
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first. See DATABASE_SETUP.md for details."
    exit 1
else
    echo "✅ .env file found"
fi

# 3. Dockerネットワークの作成
echo "🔗 Creating Docker network..."
docker network create global-network 2>/dev/null || echo "✅ Network already exists"

# 4. PostgreSQLサービス（マスタDB）の起動
echo "🐘 Starting PostgreSQL master database services..."
docker-compose -f postgresql/docker-compose.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 3

# 5. PostgreSQLの起動を待つ
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..10}; do
    if docker exec ippon_client_management_db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "   Waiting... ($i/10)"
    sleep 1
done

# 6. データベースの状態を確認
echo "🔍 Checking if database already has tables..."
TABLE_COUNT=$(docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
TABLE_COUNT=$(echo $TABLE_COUNT | tr -d ' ')

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "⚠️  Warning: Database already contains tables!"
    echo "Found $TABLE_COUNT existing tables."
    echo ""
    echo "Please use ./scripts/update-database.sh to update existing database."
    echo "Or remove all data with: docker-compose -f postgresql/docker-compose.yml down -v"
    exit 1
fi

# 7. データベースとテーブルの作成
echo "📊 Creating database tables..."
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | \
docker exec -i ippon_client_management_db psql -U postgres -d ippon_client_management_db

# 8. Prisma Clientの生成
echo "🔧 Generating Prisma Client..."
npx prisma generate

# 9. 動作確認
echo "🔍 Verifying database setup..."
TABLE_COUNT=$(docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
TABLE_COUNT=$(echo $TABLE_COUNT | tr -d ' ')

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo "✅ Database setup completed successfully! Found $TABLE_COUNT tables."
    echo ""
    echo "📋 Created tables:"
    docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -c "\dt" | grep -E "Client|Employee|MailNotificationSetting|ReceptionHours"
else
    echo "❌ No tables found. Something went wrong."
    exit 1
fi

echo ""
echo "🎉 PostgreSQL Master Database setup completed!"
echo ""
echo "🔧 Services Status:"
echo "   - PostgreSQL (Master DB): Running on localhost:5432"
echo "   - pgAdmin: Running on localhost:5050"
echo ""
echo "Next steps:"
echo "1. Setup development environment (DynamoDB Local): ./scripts/setup-development.sh"
echo "2. Create PostgreSQL seed data: npx tsx prisma/seed.ts"
echo "3. Start application locally: npm run dev"
echo "4. Create DynamoDB seed data: node scripts/seed-dynamodb.js"
echo "5. Verify data consistency: node scripts/check/check-client-consistency.js"
echo ""
echo "Or use the complete setup workflow:"
echo "   # 1. PostgreSQL seed data (基盤データ)"
echo "   npx tsx prisma/seed.ts"
echo "   # 2. DynamoDB seed data (アプリケーションデータ)"
echo "   node scripts/seed-dynamodb.js"
echo "   # 3. Consistency check (整合性確認)"
echo "   node scripts/check/check-client-consistency.js"
echo ""
echo "📚 For more information, see README.md" 