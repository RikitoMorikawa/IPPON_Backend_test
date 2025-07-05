# IPPON sales brokerage / IPPON 売買仲介

- Backend API service for Ippon Trading Platform
- Ippon売買向けプロジェクトののバックエンド

## Features Overview / 機能概要

- REST API using Fastify / Fastifyを使用したREST API
- Implemented in TypeScript / TypeScriptで実装
- Authentication using Cognito (WIP) / authはCognitoを使用（WIP）
- Using DynamoDB as data store (WIP) / DynamoDBをデータストアとして利用(WIP)
- AWS service integration (S3, DynamoDB, etc.)(WIP) / AWSサービス連携 (S3, DynamoDB等)(WIP)

## Installation / インストール方法

```bash
# Clone the repository / リポジトリのクローン
git clone https://github.com/StartGear/ippon-trading-backend.git
cd ippon-trading-backend

# Install dependencies / 依存関係のインストール
npm install

# Start development server / 開発サーバーの起動
npm run dev
```

## Environment Setup / 環境設定

Create a `.env` file in the project root. Please contact an authorized person for the required environment variables.
プロジェクトルートに`.env`ファイルを作成してください。必要な環境変数については権限者にお問い合わせください。


## Available Commands / 利用可能なコマンド

- `npm run dev` - Start the development server (with hot reload) / 開発サーバーの起動（ホットリロード対応）
- `npm run build` - Build for production / プロダクション用ビルド
- `npm start` - Build and run / ビルドして実行
- `npm run start:prod` - Run in production mode / プロダクションモードで実行
- `npm run lint` - Run linter / リンターの実行
- `npm run format` - Run code formatter / コードフォーマットの実行
- `npm test` - Run tests / テストの実行

## Directory Structure / ディレクトリ構造

```
src/
├── app.ts              - Application entry point / アプリケーションのエントリーポイント
├── server.ts           - Server configuration / サーバー設定
├── controllers/        - API endpoint processing logic / APIエンドポイントの処理ロジック
├── errors/             - Error handling / エラーハンドリング
├── helpers/            - Helper functions / ヘルパー関数
├── interfaces/         - TypeScript interfaces / TypeScript インターフェース
├── middleware/         - Middleware functions / ミドルウェア関数
├── models/             - Data models / データモデル
├── plugins/            - Fastify plugins / Fastifyプラグイン
├── responses/          - Response formats / レスポンスフォーマット
├── routes/             - API route definitions / APIルート定義
├── schemas/            - Validation schemas / バリデーションスキーマ
├── services/           - Business logic / ビジネスロジック
├── templates/          - Templates / テンプレート
├── types/              - Type definitions / 型定義
├── utils/              - Utility functions / ユーティリティ関数
└── validations/        - Validation logic / バリデーションロジック
```

## Development Environment / 開発環境

- Node.js 22.x or higher / Node.js 22.x以上
- npm 10.x or higher / npm 10.x以上
- Docker

## Docker

```bash
# Start Docker container / Dockerコンテナの起動
cd docker
docker-compose up --build
```
# IPPON_Backend_test
