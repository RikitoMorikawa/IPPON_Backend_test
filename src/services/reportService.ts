import { Property, Report, ReportListResponse, GetReportsQueryParams } from '@src/types/report';
import { ERROR_MESSAGES } from '@src/responses/constants/reports/reportConstant';
import { paginateCollection, PaginationOptions } from '@src/utils/paginationUtils';

// Mock data
const mockProperties: Record<string, Property> = {
  'prop-001': {
    id: 'prop-001',
    name: 'さくらマンション',
    address: '長野県佐久市中込3-5-1'
  },
  'prop-002': {
    id: 'prop-002',
    name: 'つつじアパート',
    address: '長野県佐久市岩村田1-1-1'
  },
  'prop-003': {
    id: 'prop-003',
    name: '春日ハイツ',
    address: '長野県佐久市長土呂808-1'
  }
};

const mockReports: Record<string, Report[]> = {
  'prop-001': [
    {
      id: 'rep-001',
      report_name: '2025年第1四半期報告書',
      created_at: '2025-04-15T09:30:00Z',
      period: {
        start_date: '2025-01-01',
        end_date: '2025-03-31'
      },
      status: 'completed'
    },
    {
      id: 'rep-002',
      report_name: '2024年第4四半期報告書',
      created_at: '2025-01-15T10:45:00Z',
      period: {
        start_date: '2024-10-01',
        end_date: '2024-12-31'
      },
      status: 'completed'
    },
    {
      id: 'rep-003',
      report_name: '2024年第3四半期報告書',
      created_at: '2024-10-16T11:20:00Z',
      period: {
        start_date: '2024-07-01',
        end_date: '2024-09-30'
      },
      status: 'completed'
    },
    {
      id: 'rep-004',
      report_name: '2024年第2四半期報告書',
      created_at: '2024-07-15T08:15:00Z',
      period: {
        start_date: '2024-04-01',
        end_date: '2024-06-30'
      },
      status: 'completed'
    },
    {
      id: 'rep-005',
      report_name: '2024年第1四半期報告書',
      created_at: '2024-04-14T14:50:00Z',
      period: {
        start_date: '2024-01-01',
        end_date: '2024-03-31'
      },
      status: 'completed'
    },
    {
      id: 'rep-006',
      report_name: '2025年第2四半期報告書',
      created_at: '2025-05-01T15:45:00Z',
      period: {
        start_date: '2025-04-01',
        end_date: '2025-06-30'
      },
      status: 'draft'
    }
  ],
  'prop-002': [
    {
      id: 'rep-007',
      report_name: '2025年第1四半期報告書',
      created_at: '2025-04-20T16:30:00Z',
      period: {
        start_date: '2025-01-01',
        end_date: '2025-03-31'
      },
      status: 'completed'
    },
    {
      id: 'rep-008',
      report_name: '2024年第4四半期報告書',
      created_at: '2025-01-18T13:25:00Z',
      period: {
        start_date: '2024-10-01',
        end_date: '2024-12-31'
      },
      status: 'completed'
    }
  ],
  'prop-003': []
};

export async function getPropertyReports(
  propertyId: string,
  queryParams: GetReportsQueryParams
): Promise<ReportListResponse | null> {
  // 物件の存在チェック
  const property = mockProperties[propertyId];
  if (!property) {
    return null;
  }

  // レポートデータの取得
  const allReports = mockReports[propertyId] || [];
  
  try {
    // ページネーションオプションの設定
    const paginationOptions: PaginationOptions = {
      limit: queryParams.limit || 5,
      next_token: queryParams.next_token,
      prev_token: queryParams.prev_token,
      allowedLimits: [5, 10, 15, 20]
    };
    
    // 汎用ページネーション関数を使用
    const paginationResult = paginateCollection(allReports, paginationOptions, propertyId);
    
    // レスポンスの作成
    return {
      property,
      reports: paginationResult.items,
      pagination: {
        next_token: paginationResult.next_token || "",
        prev_token: paginationResult.prev_token || "",
        limit: paginationResult.limit
      }
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid limit parameter') {
        throw new Error(ERROR_MESSAGES.INVALID_LIMIT);
      } else if (error.message === 'Invalid pagination token' || error.message === 'Invalid token') {
        throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
      }
    }
    throw error;
  }
}