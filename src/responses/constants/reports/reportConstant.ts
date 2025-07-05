export const SUCCESS_MESSAGES = {
    REPORTS_FETCHED: 'Successfully retrieved reports list',
    REPORT_FETCHED: 'Successfully retrieved report',
    REPORT_CREATED: 'Successfully created report',
    REPORT_UPDATED: 'Successfully updated report', 
    REPORT_DELETED: 'Successfully deleted report'
  } as const;
  
  export const ERROR_MESSAGES = {
    PROPERTY_NOT_FOUND: 'Specified property not found',
    REPORT_NOT_FOUND: 'Specified report not found',
    INVALID_LIMIT: 'Invalid limit parameter. Please specify either 5/10/15/20',
    INVALID_PROPERTY_ID: 'Invalid property ID',
    INVALID_REPORT_ID: 'Invalid report ID',
    INVALID_DATE_RANGE: 'Invalid date range',
    INVALID_TOKEN: 'Invalid pagination token'
  } as const;