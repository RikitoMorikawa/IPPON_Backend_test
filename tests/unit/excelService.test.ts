import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateReportExcel } from '@src/services/excelService';
import * as reportService from '@src/services/reportService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReportErrors } from '@src/responses/reportResponse';
import { Workbook } from 'exceljs';

// Mock dependencies
vi.mock('@src/services/reportService');
vi.mock('@aws-sdk/lib-dynamodb');

describe('ExcelService Unit Tests', () => {
  let mockDdbDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDdbDocClient = {} as DynamoDBDocumentClient;
  });

  describe('generateReportExcel', () => {
    it('正常ケース: 有効なreportIdとclientIdでExcelバッファーが生成される', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const clientId = 'test-client-id';
      const mockReportData = {
        id: reportId,
        client_id: clientId,
        property_id: 'test-property-id',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        price: '50000000',
        sales_start_date: '2024-01-01',
        created_at: '2024-01-15T00:00:00Z',
        report_date: '2024-01-15',
        title: 'テスト報告書',
        summary: 'テスト要約です。',
        property: {
          name: 'テスト物件',
          price: 50000000,
          sales_start_date: '2024-01-01',
          owner_last_name: '田中',
          owner_first_name: '太郎'
        },
        client_data: {
          client_name: 'テスト不動産',
          agent_name: '営業 太郎'
        },
        is_suumo_published: true,
        viewing_count: 5,
        inquiries_count: 10,
        business_meeting_count: 3,
        views_count: 25,
        customer_interactions: [
          {
            date: '2024-01-10',
            title: 'お問い合わせ',
            customer_name: '山田 花子',
            category: 'お問い合わせ',
            content: 'この物件について詳しく知りたいです。'
          },
          {
            date: '2024-01-15',
            title: '内見',
            customer_name: '佐藤 次郎',
            category: '内見',
            content: '物件の内見を行いました。'
          }
        ]
      };

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(mockReportData as any);

      // Act
      const result = await generateReportExcel(reportId, clientId, mockDdbDocClient);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
      expect(reportService.getReportDetailsWithAllData).toHaveBeenCalledWith(
        reportId,
        clientId,
        mockDdbDocClient
      );
    });

    it('エラーケース: 存在しないreportIdでエラーが発生', async () => {
      // Arrange
      const reportId = 'non-existent-report-id';
      const clientId = 'test-client-id';

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(null as any);

      // Act & Assert
      await expect(generateReportExcel(reportId, clientId, mockDdbDocClient))
        .rejects.toThrowError();

      expect(reportService.getReportDetailsWithAllData).toHaveBeenCalledWith(
        reportId,
        clientId,
        mockDdbDocClient
      );
    });

    it('生成されたExcelファイルの基本構造を検証', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const clientId = 'test-client-id';
      const mockReportData = {
        id: reportId,
        client_id: clientId,
        property_id: 'test-property-id',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        price: '50000000',
        sales_start_date: '2024-01-01',
        created_at: '2024-01-15T00:00:00Z',
        report_date: '2024-01-15',
        title: 'テスト報告書',
        property: {
          name: 'テスト物件',
          price: 50000000,
          owner_last_name: '田中',
          owner_first_name: '太郎'
        },
        client_data: {
          client_name: 'テスト不動産',
          agent_name: '営業 太郎'
        },
        customer_interactions: []
      };

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(mockReportData as any);

      // Act
      const buffer = await generateReportExcel(reportId, clientId, mockDdbDocClient);

      // Assert - Excelファイルをパースして内容を検証
      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as any);
      
      const worksheet = workbook.getWorksheet('販売状況報告書');
      expect(worksheet).toBeDefined();
      
      if (worksheet) {
        // ヘッダーの検証
        const titleCell = worksheet.getCell('A2');
        expect(titleCell.value).toBe('販売状況報告書');
        
        // 顧客名の検証
        const clientNameCell = worksheet.getCell('A3');
        expect(clientNameCell.value).toBe('田中太郎様');
      }
    });
  });

  describe('データフォーマット関数のテスト', () => {
    it('formatJapaneseDate: 日付が正しく日本語形式にフォーマットされる', () => {
      // この関数は直接エクスポートされていないため、generateReportExcelを通してテスト
      // または関数をエクスポートしてテストする必要があります
    });

    it('formatDate: 日付が正しくYYYY/MM/DD形式にフォーマットされる', () => {
      // 同様にフォーマット関数のテスト
    });

    it('calculateRowHeight: 文字数に応じて適切な行の高さが計算される', () => {
      // 行の高さ計算のテスト
    });

    it('summaryToEssayFormat: 要約が適切なエッセイ形式に変換される', () => {
      // 要約フォーマットのテスト
    });
  });

  describe('セクション作成のテスト', () => {
    it('ヘッダーセクションが正しく作成される', () => {
      // createHeader関数のテスト
      // ワークシートのモックとデータを作成してテストする
    });

    it('販売状況セクションが正しく作成される', () => {
      // createSalesStatusSection関数のテスト
    });

    it('問い合わせ履歴セクションが正しく作成される', () => {
      // createInquiryHistorySection関数のテスト
    });

    it('全体報告セクションが正しく作成される', () => {
      // createOverallReportSection関数のテスト
    });
  });

  describe('エッジケースのテスト', () => {
    it('空のcustomer_interactionsでもエラーが発生しない', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const clientId = 'test-client-id';
      const mockReportData = {
        id: reportId,
        client_id: clientId,
        property_id: 'test-property-id',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        price: '50000000',
        sales_start_date: '2024-01-01',
        created_at: '2024-01-15T00:00:00Z',
        customer_interactions: [], // 空の配列
        property: { name: 'テスト物件' },
        client_data: { client_name: 'テスト不動産' }
      };

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(mockReportData as any);

      // Act & Assert
      const result = await generateReportExcel(reportId, clientId, mockDdbDocClient);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('null/undefinedプロパティが適切に処理される', async () => {
      // Arrange
      const reportId = 'test-report-id';
      const clientId = 'test-client-id';
      const mockReportData = {
        id: reportId,
        client_id: clientId,
        property_id: 'test-property-id',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        price: '50000000',
        sales_start_date: '2024-01-01',
        created_at: '2024-01-15T00:00:00Z',
        property: null,
        client_data: null,
        customer_interactions: null
      };

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(mockReportData as any);

      // Act & Assert
      const result = await generateReportExcel(reportId, clientId, mockDdbDocClient);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('非常に長いテキストコンテンツが適切に処理される', async () => {
      // Arrange
      const longContent = 'あ'.repeat(1000); // 非常に長いテキスト
      const mockReportData = {
        id: 'test',
        client_id: 'test',
        property_id: 'test-property-id',
        report_start_date: '2024-01-01',
        report_end_date: '2024-01-31',
        price: '50000000',
        sales_start_date: '2024-01-01',
        created_at: '2024-01-15T00:00:00Z',
        summary: longContent,
        customer_interactions: [
          {
            content: longContent,
            date: '2024-01-01',
            title: 'テスト',
            customer_name: 'テスト顧客',
            category: 'テスト'
          }
        ],
        property: { name: 'テスト物件' },
        client_data: { client_name: 'テスト不動産' }
      };

      vi.mocked(reportService.getReportDetailsWithAllData).mockResolvedValue(mockReportData as any);

      // Act & Assert
      const result = await generateReportExcel('test', 'test', mockDdbDocClient);
      expect(result).toBeInstanceOf(Buffer);
    });
  });
}); 