export const SUCCESS_MESSAGES = {
  EMAIL_EXISTS: 'Email exists',
  USER_RETERIEVED: 'User retrieved successfully',
} as const;

export const ERROR_MESSAGES = {
  REQUIRE_EMAIL: 'Email is required',
  NOT_REGISTER_EMAIL: 'Email is not registered',
  FAIL_EMAIL_CHECK: 'Failed to check email',
  USER_RETRIEVE_FAILED: 'Failed to retrieve user',
} as const;
