export const SUCCESS_MESSAGES = {
    CREATE_CLIENT: 'Client created successfully',
    SUCCESS_CLIENT_RETRIEVE: 'Client details retrieved successfully',
    SUCCESS_CLIENT_UPDATE: 'Client details updated successfully',
    SUCCESS_CLIENT_DELETE:'Client deleted successfully',
} as const;

export const ERROR_MESSAGES = {
    PARAMETER_REQUIRED: 'Registrant ID, Client Name, Client Name Kana, Mail Address are required',
    FAIL_CREATE: 'Error creating client',
    CLIENT_NOT_FOUND: 'Client not found',
    FAIL_CLIENT_RETRIEVE: 'Error retrieving client details',
    VALIDATION_ERROR: 'Validation error',
    CLIENT_UPDATE_ERROR: 'Error updating client details',
    REQUIRED_ID_ERROR: 'Client ID is required',
    METHOD_NOT_ALLOWED_ERROR: 'Method not allowed',
    SERVER_ERROR: 'Server error occurred.',
    REQUIRE_PARAMETERS: 'Require parameters',
    NEED_TO_BE_MEMBER: 'You need to be a member to access this endpoint',
    INVALID_TIMESTAMP_FORMAT: 'Invalid timestamp format',
    CLIENT_ID_NOT_REQUIRED: "クライアントIDは必須です。"
} as const;
