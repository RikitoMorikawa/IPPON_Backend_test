// Property information
export interface Property {
    id: string;
    name: string;
    address: string;
  }
  
  // Report
  export interface Report {
    id: string;
    report_name: string;
    created_at: string;
    period: {
      start_date: string;
      end_date: string;
    };
    status: "completed" | "draft";
  }
  
  // Report list response
  export interface ReportListResponse {
    property: Property;
    reports: Report[];
    pagination: {
      next_token: string;
      prev_token: string;
      limit: number;
    };
  }
  
  // Report query parameters
  export interface GetReportsQueryParams {
    limit?: number;
    next_token?: string;
    prev_token?: string;
  }