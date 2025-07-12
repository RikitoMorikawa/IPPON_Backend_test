export interface SignRequestBody {
  email: string;
  password: string;
}

export interface SignInResponseData {
  client_id: string;
  client_name: string;
  token: AuthenticationResult;
  employee_id: string;
  type: string;
  role: string;
}

export interface SignInResponse {
  status: number;
  message: string;
  data: SignInResponseData;
}

export interface SendOtpRequestBody {
  email: string;
}

export interface AuthenticationResult {
  AccessToken: string;
  IdToken: string;
  RefreshToken: string;
  TokenType: string;
  ExpiresIn: number;
}

export interface VerifyOtpRequestBody {
  email: string;
  otp: string;
}

export interface ResetPasswordRequestBody  {
  email: string;
  verificationCode: string;
  newPassword: string;
}

export interface CheckEmailRequestBody {
  email: string;
}