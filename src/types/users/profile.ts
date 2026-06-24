// Re-export from auth.ts to avoid circular dependency
import type { ProfileUpdateData, PasswordChangeData, Role } from '@/types/auth';

export type { ProfileUpdateData, PasswordChangeData };

// User Profile interfaces
export interface UserProfile {
  id: string;
  name: string;
  display_name?: string;
  email: string;
  avatar_url?: string;
  message_signature?: string;
  access_token?: string; // Legacy field
  api_access_token?: string; // New field from evo-auth-service
  ui_settings?: {
    editor_message_key?: 'enter' | 'cmd_enter';
    font_size?: 'small' | 'medium' | 'large';
  };
  custom_attributes?: Record<string, unknown>;
  availability?: 'online' | 'offline' | 'busy';
  mfa_enabled?: boolean;
  mfa_setup_incomplete?: boolean;
  confirmed?: boolean;
  unconfirmed_email?: string | null;
  created_at?: string;
  updated_at?: string;
  roles?: Role[];
}

export interface AvailabilityUpdateData {
  availability: 'online' | 'offline' | 'busy';
}

// Two-Factor Authentication interfaces
export interface TwoFactorStatus {
  enabled: boolean;
  method: 'disabled' | 'totp' | 'email';
  setup_complete: boolean;
  backup_codes_count: number;
}

export interface EnableTwoFactorResponse {
  success: boolean;
  method: 'totp' | 'email';
  message: string;
  qr_code?: string;
  provisioning_uri?: string;
  backup_codes?: string[];
  secret?: string;
}

export interface VerifyResponse {
  success: boolean;
  message: string;
}

export interface BackupCodesResponse {
  success: boolean;
  backup_codes: string[];
  message: string;
}
