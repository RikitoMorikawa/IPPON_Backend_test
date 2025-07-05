export const SUCCESS_MESSAGES = {
  CUSTOMER_REGISTERED: 'Customer registered successfully',
  CUSTOMER_INQUIRY_UPDATE: 'Customer and Inquiry updated successfully',
  CORPORATE_CUSTOMER_REGISTERED: 'Corporate customer registered successfully',
  CORPORATE_CUSTOMER_UPDATE: 'Corporate Customer updated successfully',
  CUSTOMER_SEARCHED: 'Search results',
  CUSTOMER_DETAILS_FETCHED: 'Customer details fetched successfully',
  CUSTOMER_DETAILS_UPDATED: 'Customer details updated successfully',
  DELETE_SUCCESS: 'Records deleted successfully',
  EMPLOYEE_UPDATED: 'Employee updated successfully',
  DOCUMENT_LINKED: 'No new documents to add. All provided document IDs are already linked.',
} as const;

export const ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Validation errors',
  REGISTER_ERROR: 'Error registering customer',
  UPDATE_ERROR: 'Error updating customer',
  MISSING_KEYS_ERROR:
    'Missing required keys: client_id, register_timestamp, or customer_id and inquiry timestamp to update.',
  RECORD_NOT_FOUND_ERROR:
    'Record not found. Ensure client_id, register_timestamp, and customer_id match existing data.',
  NO_VALID_FIELD_ERROR: 'No valid fields provided for update.',
  EMAIL_ERROR: 'Failed to send email. Customer registration has been rolled back.',
  CUSTOMER_NOT_FOUND_ERROR: 'Customer not found',
  CORPORATE_REGISTER_ERROR: 'Error registering corporate customer',
  CORPORATE_UPDATE_ERROR: 'Error updating corporate customer',
  CORPORATE_CUSTOMER_NOT_FOUND_ERROR: 'Corporate Customer not found',
  DYNAMODB_ERROR: 'DynamoDB error',
  METHOD_NOT_ALLOWED: 'Method not allowed',
  USER_NOT_FOUND_ERROR: 'User Not Found',
  MISSING_PARAMETERS_ERROR: 'Missing required parameters',
  MISSING_PARAMETERS_ERROR_2:
    'Missing required parameters: client_id, customer_id, property_id, or customer_type',
  MISSING_PARAMETERS_ERROR_3:
    'Missing required parameters: client_id, customer_id, document_id, or customer_type',
  CUSTOMER_FETCHING_ERROR: 'Error fetching customer details:',
  INVALID_REQUEST_BODY_ERROR: 'Invalid request body',
  DELETE_RECORD_ERROR: 'No valid records to delete',
  PROPERTY_NOT_FOUND_ERROR: 'No properties found for the given client_id',
  DOCUMENT_NOT_FOUND_ERROR: 'No documents found for the given client_id',
  INVALID_PROPERTY_ERROR: 'Invalid property IDs provided',
  INVALID_CUSTOMER_TYPE_ERROR: 'Invalid customer_type. Must be 1 (individual) or 2 (corporate).',
  INVALID_DOCUMENT_ID_ERROR: 'Invalid document IDs provided',
  MISSING_REGISTER_TIMESTAMP_ERROR: 'Missing register_timestamp in the database record',
  SERVER_ERROR: 'Server error',
} as const;
