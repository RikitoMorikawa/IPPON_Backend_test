export interface InquiryListByPropertyParams {
  inquiryMethod?: string;
  limit?: string;
  page?: string;
  propertyId?: string;
  startDate?: string;
  endDate?: string;
  inquiryId?: string;
}

export interface InquiryHistoryList {
  inquiryId?: string;
  page?: string;
  limit?: string;
  title?: string;
}
