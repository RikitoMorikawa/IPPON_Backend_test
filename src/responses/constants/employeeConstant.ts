export const SUCCESS_MESSAGES = {
    FETCH_EMPLOYEE: 'Employee fetched successfully',
    UPDATE_EMPLOYEE: 'Employee updated successfully',
    CREATE_EMPLOYEE: 'Employee created successfully',
    FETCH_ALL_EMPLOYEES: 'All employees fetched successfully',
    EMPLOYEE_RETREIVED: 'Employee retrived successfully',
    DELETE_SUCCESS: "Successfully removed employee",
} as const;

export const ERROR_MESSAGES = {
    NOT_FOUND_EMPLOYEE: 'Employee not found',
    FAIL_FETCH: 'Error fetching employee details',
    MISSING_PARAMETERS: 'Client ID and Employee ID are required',
    UPDATE_FAIL: 'Error updating employee details',
    CREATE_FAIL: 'Error creating employee',
    REQUIRE_PARAMETERS: 'Client ID, Registrant ID, Family Name, First Name, and Mail Address are required',
    METHOD_NOT_ALLOWED: 'Method not allowed',
    SERVER_ERROR: 'Server error',
    MISSING_IPPON_CLIENT_EMPLOYEE_AWS_CLIENT_ID: 'Client ID is required',
    MISSING_EMPLOYEE_ID: 'Employee ID is required',
    MISSING_REGISTER_TIMESTAMP: 'Register Timestamp is required',
    NEED_TO_BE_MEMBER: 'You need to be a member to access this endpoint',
    EMPLOYEE_NOT_FOUND: 'Employee not found',
    INVALID_TIMESTAMP_FORMAT: 'Invalid timestamp format',
    INTERNAL_SERVER_ERROR: 'Internal Server Error',
} as const;
