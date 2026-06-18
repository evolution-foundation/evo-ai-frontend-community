import apiAuth from '@/services/core/apiAuth';
import { extractData } from '@/utils/apiHelpers';
import {
  LoginRequest,
  LoginResponse,
  LoginData,
  RegisterRequest,
  RegisterResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  UserResponse,
  ProfileUpdateData,
  PasswordChangeData,
} from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

const processApiResponse = (response: any): LoginResponse => {
  const loginData = extractData<LoginData>(response);

  const token =
    loginData?.token?.access_token ||
    loginData?.token?.token?.access_token ||
    response?.data?.access_token;

  if (token) {
    useAuthStore.getState().setAccessToken(token);
  }

  // Backend retorna formato padrão: { success: true, data: {...}, meta: {...}, message: "..." }
  return {
    success: true,
    data: loginData,
    meta: response.data?.meta || response.meta || { timestamp: new Date().toISOString() },
    message: response.data?.message || response.message,
  } as LoginResponse;
};

export const login = async (
  data: LoginRequest,
): Promise<{ response: LoginResponse; requiresMfa?: boolean; mfaData?: unknown }> => {
  const response = await apiAuth.post('/auth/login', data);

  const responseData = extractData<{
    mfa_required?: boolean;
    mfa_method?: string;
    temp_token?: string;
    email?: string;
  }>(response);

  if (responseData.mfa_required) {
    // Backend retorna formato padrão: { success: true, data: {...}, meta: {...}, message: "..." }
    return {
      response: {
        success: true,
        data: responseData as unknown as LoginData,
        meta: response.data?.meta || { timestamp: new Date().toISOString() },
        message: response.data?.message,
      } as LoginResponse,
      requiresMfa: true,
      mfaData: {
        method: responseData.mfa_method,
        tempToken: responseData.temp_token,
        email: responseData.email,
      },
    };
  }

  const processedResponse = processApiResponse(response);

  // Return the response in the expected format
  return {
    response: processedResponse,
  };
};

export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  // Add required parameters
  const registrationData = {
    ...data,
    confirm_success_url: `${window.location.origin}/auth?confirmation_success=true`,
  };

  const response = await apiAuth.post<RegisterResponse>('/auth/register', registrationData);
  return extractData<any>(response);
};

export const forgotPassword = async (
  data: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> => {
  const response = await apiAuth.post<ForgotPasswordResponse>('/auth/forgot_password', data);
  return extractData<any>(response);
};

export const resetPassword = async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
  const response = await apiAuth.post<ResetPasswordResponse>('/auth/reset_password', data);
  return extractData<any>(response);
};

export const confirmEmail = async (
  confirmationToken: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await apiAuth.post('/auth/confirmation', {
    confirmation_token: confirmationToken,
  });
  return extractData<any>(response);
};

export const resendConfirmation = async (
  email: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await apiAuth.post('/auth/confirmation', {
    email,
  });
  return extractData<any>(response);
};

export const logout = async (): Promise<{ keycloakLogoutUrl?: string }> => {
  const response = await apiAuth.post('/auth/logout', {});
  useAuthStore.getState().setAccessToken(null);
  const data = extractData<{ keycloak_logout_url?: string }>(response);
  return { keycloakLogoutUrl: data?.keycloak_logout_url };
};

export const validateToken = async (): Promise<UserResponse> => {
  const currentToken = useAuthStore.getState().accessToken;

  // 🔒 FIX: Tentar refresh apenas se não houver token, mas tratar erro silenciosamente
  // Se o refresh falhar (401), o validate ainda pode funcionar se houver cookie válido
  if (!currentToken) {
    try {
      const refreshResponse = await apiAuth.post('/auth/refresh');
      const refreshData = extractData<{ access_token: string }>(refreshResponse);
      if (refreshData.access_token) {
        useAuthStore.getState().setAccessToken(refreshData.access_token);
      }
    } catch (refreshError) {
      // Se o refresh falhar, continuar para validate - pode haver cookie válido
      // Não fazer throw aqui para permitir que validate seja tentado
      console.debug('Refresh token failed, continuing with validate:', refreshError);
    }
  }

  const response = await apiAuth.post('/auth/validate');

  const processedResponse = processApiResponse(response);

  if (!processedResponse.data.user || !processedResponse.data.user.id) {
    throw new Error('Invalid user data received from token validation');
  }

  return processedResponse.data.user as UserResponse;
};

export const getUser = async (): Promise<UserResponse> => {
  return await validateToken();
};

export const verifyMfa = async (data: {
  email: string;
  code: string;
  tempToken: string;
}): Promise<{ response: LoginResponse }> => {
  const response = await apiAuth.post('/mfa/verify', {
    email: data.email,
    code: data.code,
    temp_token: data.tempToken,
  });

  const processedResponse = processApiResponse(response);

  return {
    response: processedResponse,
  };
};

// New functions for accounts and profile management
export const getUserAccounts = async () => {
  const response = await apiAuth.get('/account');

  return extractData<any>(response);
};

export const getCurrentAccount = async () => {
  const response = await apiAuth.get('/account');

  return extractData<any>(response);
};

export const getProfile = async () => {
  const response = await apiAuth.get('/profile');

  return extractData<any>(response);
};

export const updateProfile = async (profileData: ProfileUpdateData) => {
  const response = await apiAuth.put('/profile', profileData);

  return extractData<any>(response);
};

export const updatePassword = async (passwordData: PasswordChangeData) => {
  const response = await apiAuth.put('/profile/password', passwordData);

  return extractData<any>(response);
};

export const updateAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await apiAuth.put('/profile/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return extractData<any>(response);
};
