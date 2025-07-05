export const SUCCESS_MESSAGES = {
  SIGNIN_SUCCESS: 'Sign-in successful',
  OTP_SEND_SUCCESS: 'OTP sent successfully',
  OTP_VERIFIED_SUCCESS: 'OTP verified successfully',
  RESET_PASSWORD_SUCCESS: 'Password reset successful.You can now sign in with your new password.',
  CHANGE_PASSWORD_SUCCESS: 'Password changed successfully',
  EMAIL_SENT: 'Email sent successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',
  EMAIL_EXISTS: 'Email exists',
} as const;

export const ERROR_MESSAGES = {
  EMAIL_NOT_EXISTS: 'Email not exists',
  SIGNIN_FAILED: 'Sign-in failed',
  INVALID_OTP: 'Invalid OTP',
  PASSWORD_CHANGE_FAILED: 'Password change failed',
  EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
  EMAIL_NOT_FOUND: 'Email not found',
  EMAIL_VALIDATION_CODE_NEW_PASSWORD_REQUIRED:
    'Email validation code and new password are required',
  NOT_MET_VERIFICATION_CODE_REQUIREMENTS:
    'Invalid verification code or password requirements not met',
  REQUIRE_EMAIL: 'Email is required',
  NOT_REGISTER_EMAIL: 'Email is not registered',
  AUTHORIZATION_HEADER_REQUIRED: 'Authorization header is required',
  LOGOUT_FAILED: 'Logout failed',
} as const;
