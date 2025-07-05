# Ippon-Sales-Brokerage-Backend

Ippon売買仲介向けプロジェクトのバックエンド

## 機能概要

- Fastifyを使用したREST API
- TypeScriptで実装
- AWS Cognitoを使用した認証
- 従業員管理システム
- クライアント管理システム  
- 顧客管理・問い合わせ追跡
- 物件管理システム
- ダッシュボード・レポート機能
- メール通知システム
- データベース: PostgreSQL（メイン）+ DynamoDB
- AWSサービス連携 (S3, SES, Cognito)

## 前提条件

- Node.js 22.x以上
- Docker Desktop
- Git

## クイックセットアップ

### 1. クローン

```bash
# リポジトリのクローン
git clone https://github.com/StartGear/ippon-sales-brokerage-backend.git
cd ippon-sales-brokerage-backend

```

### 2. 環境変数設定

プロジェクトルートに`.env`ファイルを作成：

- .envの内容はJPTeamに問い合わせてください。

### 3. データベースセットアップ

#### セットアップスクリプト

```bash
# 実行権限を付与
chmod +x scripts/setup-database.sh

# セットアップ実行
./scripts/setup-database.sh
```

### 4. 開発環境セットアップ

```bash
# 実行権限を付与
chmod +x scripts/setup-development.sh

# DynamoDB Localセットアップ
./scripts/setup-development.sh
```

**🚀 ローカル開発 (推奨)**: アプリケーションはローカル起動、データベースはDocker
**🌐 アプリケーション起動**: 

### ※起動することでDynamoDBが生成されるのでモックを入れる前に必ず実行
```bash
npm run dev
```
**🌐 アクセス**: http://localhost:3000

### 5. シードデータセットアップ

#### PostgreSQLシードデータ

PostgreSQLにマスターデータと基盤データを投入します：

```bash
# PostgreSQLシードデータセットアップ
npx tsx prisma/seed.ts
```

**📊 作成されるデータ:**
- 管理メンバー（3名）
- オプション（4種類）
- サービス（4種類）
- クライアント企業（3社）
- クライアント従業員（4名）
- 企業-オプション・サービス関連

#### DynamoDBシードデータ

DynamoDBにアプリケーションデータを投入します：

```bash
# DynamoDBシードデータセットアップ
node scripts/seed-dynamodb.js
```

**📊 作成されるデータ:**
- 顧客データ（6件）
- 物件データ（6件）  
- 問い合わせデータ（9件）
- レポートデータ（3件）

**⚠️ 重要:** PostgreSQLのシードデータを先に実行してください。

#### 完全なシードデータセットアップ（推奨手順）

**⚠️ 重要**: この順序で実行してください。DynamoDBシードデータはPostgreSQLのclient_idを参照するため、PostgreSQLを先に実行する必要があります。

```bash
# 1. PostgreSQLシードデータ（基盤データ）を先に作成
npx tsx prisma/seed.ts

# 2. DynamoDBシードデータ（PostgreSQLのclient_idを使用）
node scripts/seed-dynamodb.js

# 3. 整合性確認（すべて ✅ になることを確認）
node scripts/check/check-client-consistency.js
```

**✅ 成功例**: 整合性確認ですべてのclient_idが一致していることを確認してください。

### 6. 開発ワークフロー

**推奨ワークフロー（ローカル開発）:**

```bash
# 1. データベースサービス起動（初回・または停止後）
docker-compose -f postgresql/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml up -d dynamodb

# 2. アプリケーションをローカルで起動
npm run dev

# 3. ログを確認（別ターミナル）
# アプリケーションログはターミナルに直接表示されます

# 4. データベースサービスのみ再起動が必要な場合
docker-compose -f postgresql/docker-compose.yml restart
docker-compose -f docker/docker-compose.yml restart dynamodb

# 全体のステータス確認
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 7. 代替: Docker開発

```bash
# ローカル開発
# （データベースのみDocker、アプリはローカル）
docker-compose -f postgresql/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml up -d dynamodb
npm run dev

```

**⚠️ 注意**: 現在、appサービスはdocker-compose.ymlでコメントアウトされています。Docker開発を使用する場合は、`docker/docker-compose.yml`のappサービスのコメントを解除してください。

## アクセス情報

- **🚀 API**: http://localhost:3000
- **📚 API Documentation**: http://localhost:3000/documentation
- **❤️ Health Check**: http://localhost:3000/health
- **🔧 pgAdmin**: http://localhost:5050 (admin@admin.com / admin123)
- **🐘 PostgreSQL**: localhost:5432 (postgres / postgres)
- **🗃️ DynamoDB Local**: localhost:8080

## ログイン情報

```
 password: TempPass123!
```

## 利用可能なコマンド

### 開発

- `npm run dev` - ローカルで開発サーバーの起動
- `npm run build` - プロダクション用ビルド
- `npm start` - ビルドして実行
- `npm run start:prod` - プロダクションモードで実行

### コード品質

- `npm run lint` - リンターの実行
- `npm run format` - コードフォーマットの実行
- `npm test` - テストの実行

### データベース

```bash
# スキーマ変更時の更新
chmod +x scripts/update-database.sh
./scripts/update-database.sh

# データベースに接続
docker exec -it ippon_client_management_db psql -U postgres -d ippon_client_management_db

# テーブル確認
docker exec ippon_client_management_db psql -U postgres -d ippon_client_management_db -c "\dt"
```

### 環境検証

環境の整合性とデータの一致確認を行うスクリプトが用意されています：

#### PostgreSQL ↔ DynamoDB ↔ Cognito 整合性確認

```bash
# 完全なclient_id整合性確認
node scripts/check/check-client-consistency.js
```

**🔍 確認項目:**
- **PostgreSQL**: クライアント・従業員データの確認
- **DynamoDB**: 4つのテーブル（customers, inquiry, properties, report）のclient_id整合性
- **Cognito**: ユーザーの`custom:clientId`属性とPostgreSQLの一致確認
- **従業員マッピング**: PostgreSQL従業員とCognitoユーザーの対応確認

**📊 出力内容:**
- 各システムのデータ件数
- client_idの一致・不一致詳細
- テーブル別データ分布
- 整合性サマリー

#### DynamoDB単体確認

```bash
# DynamoDBテーブル・データ確認
node scripts/check/check-dynamodb.js
```

**🗄️ 確認項目:**
- テーブル一覧とステータス
- 各テーブルのデータ件数
- サンプルデータの表示（最初の5件）

## よくある問題

### データベース接続エラー
```bash
# データベースサービス再起動
docker-compose -f postgresql/docker-compose.yml restart
docker-compose -f docker/docker-compose.yml restart dynamodb
```

### アプリケーションが起動しない
```bash
# ローカル開発の場合はターミナルでエラーを確認
npm run dev

# .envファイルの確認
cat .env | head -5

# 依存関係の再インストール
npm install
```

### DynamoDB接続問題
```bash
# DynamoDBコンテナ確認
docker logs ippon_sales_brokerage_dynamodb

# DynamoDBポートテスト
nc -z localhost 8080 && echo "DynamoDB port accessible"
```

### 権限エラー
```bash
# スクリプト権限付与
chmod +x scripts/*.sh
```

### ポートが使用中
```bash
# ポート使用状況確認
lsof -i :3000  # or :5432, :8080, :5050

# 必要に応じてプロセス終了
sudo kill -9 <PID>
```

### 完全リセット
```bash
# 全コンテナ停止
docker-compose -f postgresql/docker-compose.yml down -v
docker-compose -f docker/docker-compose.yml down -v

# 完全セットアップ
./scripts/setup-database.sh
./scripts/setup-development.sh

# アプリケーションをローカルで起動
npm run dev
```
