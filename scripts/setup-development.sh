#!/bin/bash

# 開発環境セットアップスクリプト
# このスクリプトは、売買仲介プロジェクトの開発環境（DynamoDB Local）を設定します

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
docker-compose -f docker/docker-compose.yml up -d dynamodb
echo "✅ DynamoDB Local container started"

# 4. 起動待ち（シンプル版）
echo "⏳ Waiting for DynamoDB Local to be ready..."
sleep 3

# 5. 起動確認
if nc -z localhost 8080 2>/dev/null; then
    echo "✅ DynamoDB Local is ready on localhost:8080"
else
    echo "⚠️  DynamoDB Local may still be starting. Please wait a few more seconds."
fi

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