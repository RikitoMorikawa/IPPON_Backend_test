#!/bin/bash

# 開発環境セットアップスクリプト
# このスクリプトは、売買仲介プロジェクトの開発環境（DynamoDB Local）を設定します
# アプリケーションはローカルで手動起動してください

set -e  # エラーが発生したら停止

echo "🚀 Starting development environment setup..."

# 1. .envファイルの存在確認
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first. See README.md for details."
    exit 1
else
    echo "✅ .env file found"
fi

# 2. Dockerネットワークの存在確認
if ! docker network ls | grep -q global-network; then
    echo "🔗 Creating Docker network..."
    docker network create global-network
else
    echo "✅ Docker network exists"
fi

# 3. DynamoDB Localの起動
echo "🚀 Starting DynamoDB Local..."
if docker ps | grep -q ippon_sales_brokerage_dynamodb; then
    echo "✅ DynamoDB Local already running"
else
    docker-compose -f docker/docker-compose.yml up -d dynamodb
    echo "✅ DynamoDB Local started"
fi

# 4. DynamoDBの起動を待つ
echo "⏳ Waiting for DynamoDB Local to be ready..."
sleep 5

# 5. DynamoDB動作確認
DYNAMO_STATUS="⚠️  Still starting"

# Check DynamoDB (port check only)
if nc -z localhost 8080 2>/dev/null; then
    DYNAMO_STATUS="✅ Running"
fi

echo "🔍 Services Status Check:"
echo "   - DynamoDB Local: $DYNAMO_STATUS"

echo ""
echo "🎉 Development environment setup completed!"
echo ""
echo "🔧 Services Status:"
echo "   - DynamoDB Local: Running on localhost:8080"
echo ""
echo "📝 Note: DynamoDB tables will be created automatically when the application starts."
echo ""
echo "🚀 To start the application locally:"
echo "   npm run dev"
echo ""
echo "📚 API Documentation: http://localhost:3000/documentation (after starting app locally)"
echo ""
echo "📚 For more information, see README.md" 