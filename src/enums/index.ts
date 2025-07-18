/**
 * Enum定数の統合エクスポート
 */

// Customer Enums
export {
  GENDERS,
  CUSTOMER_TYPES,
  LISTING_STATUS,
  type ListingStatus,
  getListingStatus,
  isValidListingStatus,
  type CustomerType,
  getCustomerTypes,
  isValidCustomerType,
  type Gender,
  getGenders,
  isValidGender,
  CUSTOMER_PREFECTURE_MAPPING,
  type PrefectureCode as CustomerPrefectureCode,
  type PrefectureName as CustomerPrefectureName,
  getPrefectures as getCustomerPrefectures,
  isValidPrefectureCode as isValidCustomerPrefectureCode,
  isValidPrefectureName as isValidCustomerPrefectureName,
  getPrefectureByCode as getCustomerPrefectureByCode,
  getPrefectureCodeByName as getCustomerPrefectureCodeByName,
} from './customerEnums';

// Inquiry Enums
export {
  INQUIRY_TITLES,
  INQUIRY_CATEGORIES,
  INQUIRY_TYPES,
  INQUIRY_METHODS,
  type InquiryTitle,
  type InquiryCategory,
  type InquiryType,
  type InquiryMethod,
  getInquiryTitles,
  getInquiryCategories,
  getInquiryTypes,
  getInquiryMethods,
  isValidInquiryTitle,
  isValidInquiryCategory,
  isValidInquiryType,
  isValidInquiryMethod,
} from './inquiryEnums';

// Property Enums
export {
  PROPERTY_TYPES,
  PREFECTURE_MAPPING,
  type PropertyType,
  type PrefectureCode,
  type PrefectureName,
  getPropertyTypes,
  getPrefectures,
  isValidPropertyType,
  isValidPrefectureCode,
  isValidPrefectureName,
  getPrefectureByCode,
  getPrefectureCodeByName,
} from './propertyEnums';

// Report Enums
export {
  SAVE_TYPES,
  REPORT_STATUSES,
  type SaveType,
  type ReportStatus,
  getSaveTypes,
  getReportStatuses,
  isValidSaveType,
  isValidReportStatus,
} from './reportEnums';

// Helper function imports for getAllEnums
import {
  getGenders,
  getPrefectures as getCustomerPrefectures,
  getCustomerTypes,
  getListingStatus,
} from './customerEnums';

import {
  getInquiryTitles,
  getInquiryCategories,
  getInquiryTypes,
  getInquiryMethods,
} from './inquiryEnums';

import {
  getPropertyTypes,
  getPrefectures,
} from './propertyEnums';

import {
  getSaveTypes,
  getReportStatuses,
} from './reportEnums';

/**
 * 全てのEnum定数を取得する関数
 */
export const getAllEnums = () => {
  return {
    customers: {
      genders: getGenders(),
      prefectures: getCustomerPrefectures(),
      customerTypes: getCustomerTypes(),
      listingStatuses: getListingStatus(),
    },
    inquiries: {
      titles: getInquiryTitles(),
      categories: getInquiryCategories(),
      types: getInquiryTypes(),
      methods: getInquiryMethods(),
    },
    properties: {
      types: getPropertyTypes(),
      prefectures: getPrefectures(),
    },
    reports: {
      saveTypes: getSaveTypes(),
      reportStatuses: getReportStatuses(),
    },
  };
}; 