#!/bin/bash

# データベース更新スクリプト
# このスクリプトは、既存のデータベースを最新の状態に更新します

set -e  # エラーが発生したら停止

echo "🔄 Starting database update..."

# 1. .envファイルの存在確認
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first. See README.md for details."
    exit 1
else
    echo "✅ .env file found"
fi

# 2. PostgreSQLコンテナが起動しているか確認
if ! docker ps | grep -q ippon_client_management_db; then
    echo "🐘 Starting PostgreSQL container..."
    docker-compose -f postgresql/docker-compose.yml up -d
    
    # PostgreSQLの起動を待つ
    echo "⏳ Waiting for PostgreSQL to be ready..."
    for i in {1..10}; do
        if docker exec ippon_client_management_db pg_isready -U postgres > /dev/null 2>&1; then
            echo "✅ PostgreSQL is ready!"
            break
        fi
        echo "   Waiting... ($i/10)"
        sleep 1
    done
else
    echo "✅ PostgreSQL is already running"
fi

# 3. データベースの状態を確認
echo "🔍 Checking database state..."
TABLE_COUNT=$(docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
TABLE_COUNT=$(echo $TABLE_COUNT | tr -d ' ')

if [ "$TABLE_COUNT" = "0" ]; then
    echo "📊 No tables found. Running initial setup..."
    # 初回セットアップ
    npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | \
    docker exec -i ippon_client_management_db psql -U postgres -d ippon_client_management_db
    echo "✅ Initial database setup completed!"
else
    echo "📊 Found existing tables. Checking for schema changes..."
    
    # スキーマの差分を確認
    DIFF=$(npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script 2>/dev/null || echo "")
    
    if [ -z "$DIFF" ]; then
        echo "✅ Database is already up to date!"
    else
        echo "📝 Schema changes detected. Applying updates..."
        # 権限エラーを回避するため、差分SQLを直接実行
        npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script | \
        docker exec -i ippon_client_management_db psql -U postgres -d ippon_client_management_db
        echo "✅ Schema updates applied successfully!"
    fi
fi

# 4. Prisma Clientの再生成
echo "🔧 Regenerating Prisma Client..."
npx prisma generate

# 5. 現在の状態を表示
echo ""
echo "📋 Current database state:"
docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -c "\dt"

echo ""
echo "🎉 Database update completed!"
echo ""
echo "Your database is now up to date with the latest schema."
echo ""