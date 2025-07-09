import { Report } from '@src/models/report';

export function validateReport(report: Report): string[] {
  const errors: string[] = [];

  // 必須フィールドのバリデーション
  if (!report.client_id) errors.push('client_id is required');
  if (!report.property_id) errors.push('property_id is required');
  if (!report.report_start_date) errors.push('report_start_date is required');
  if (!report.report_end_date) errors.push('report_end_date is required');
  if (!report.price) errors.push('price is required');
  if (!report.sales_start_date) errors.push('sales_start_date is required');
  if (!report.created_at) errors.push('created_at is required');

  // 数値フィールドの負数チェック
  if (report.views_count && report.views_count < 0) errors.push('views_count cannot be negative');
  if (report.inquiries_count && report.inquiries_count < 0) errors.push('inquiries_count cannot be negative');
  if (report.business_meeting_count && report.business_meeting_count < 0) errors.push('business_meeting_count cannot be negative');
  if (report.viewing_count && report.viewing_count < 0) errors.push('viewing_count cannot be negative');
  if (report.suumo_views_api && report.suumo_views_api < 0) errors.push('suumo_views_api cannot be negative');
  if (report.suumo_inquiries_api && report.suumo_inquiries_api < 0) errors.push('suumo_inquiries_api cannot be negative');

  // 日付フォーマットのバリデーション
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (report.report_start_date && !dateRegex.test(report.report_start_date)) {
    errors.push('report_start_date must be in YYYY-MM-DD format');
  }
  if (report.report_end_date && !dateRegex.test(report.report_end_date)) {
    errors.push('report_end_date must be in YYYY-MM-DD format');
  }
  if (report.sales_start_date && !dateRegex.test(report.sales_start_date)) {
    errors.push('sales_start_date must be in YYYY-MM-DD format');
  }
  if (report.report_date && !dateRegex.test(report.report_date)) {
    errors.push('report_date must be in YYYY-MM-DD format');
  }

  // 日付の論理的バリデーション
  if (report.report_start_date && report.report_end_date) {
    const startDate = new Date(report.report_start_date);
    const endDate = new Date(report.report_end_date);
    if (startDate > endDate) {
      errors.push('report_start_date must be before or equal to report_end_date');
    }
  }

  return errors;
}
