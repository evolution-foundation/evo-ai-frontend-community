/**
 * API Response Helper Functions
 * 
 * Utilities for extracting and transforming API responses following
 */

import type { AxiosResponse } from 'axios';
import type {
  ErrorInfo,

} from '@/types/core';

/**
 * Extract data from a standard API response
 * Backend retorna: { success: true, data: T, meta: {...} }
 * Retorna apenas o conteúdo de 'data'
 * @template T - The expected data type
 * @param response - Axios response object
 * @returns The extracted data
 */
export function extractData<T>(response: AxiosResponse): T {
  // Backend já retorna { success, data, meta }
  if (response.data?.data !== undefined) {
    return response.data.data as T;
  }
  // Fallback para respostas sem wrapping
  return response.data as T;
}

/**
 * Extract full response (data + meta) from API
 * Use this when you need access to pagination or other metadata
 * @template T - The expected data type inside the response
 * @param response - Axios response object
 * @returns The full response with data and meta
 */
export function extractResponse<T>(response: AxiosResponse): { 
  success: true;
  data: T[];
  meta: any;
  message: string;
} {
  return {
    success: response.data.success,
    data: response.data.data as T[],
    meta: response.data.meta,
    message: response.data?.message || "",
  };
}

/**
 * Extract error information from an Axios error
 * @param error - Axios error object
 * @returns Structured error information
 */
export function extractError(error: any): ErrorInfo {
  // Check if it's an Axios error
  if (error.response) {
    const response = error.response as AxiosResponse;

    // Standard error format
    if (response.data?.success === false && response.data?.error) {
      return {
        code: response.data.error.code || 'UNKNOWN_ERROR',
        message: response.data.error.message || 'An error occurred',
        details: response.data.error.details,
      };
    }

    // Legacy format: { error: "message" }
    if (response.data?.error && typeof response.data.error === 'string') {
      return {
        code: 'UNKNOWN_ERROR',
        message: response.data.error,
      };
    }

    // Legacy format: { message: "...", attributes: [...] }
    if (response.data?.message) {
      return {
        code: 'VALIDATION_ERROR',
        message: response.data.message,
        details: response.data.attributes || response.data.errors,
      };
    }

    // Fallback to status text
    return {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'Request failed',
      details: response.data,
    };
  }

  // Network error or other issues
  if (error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network error: Unable to reach server',
    };
  }

  // Generic error
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
  };
}

/**
 * The backend's message from the error envelope, or undefined if it has none —
 * so each caller keeps its own localized fallback instead of a raw HTTP status text.
 * 5xx bodies are skipped: those messages are written for whoever operates the API,
 * not for the person on screen.
 * @param error - Value caught from a rejected request
 * @returns The server-authored message, or undefined
 */
export function apiErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  if (typeof response?.status === 'number' && response.status >= 500) return undefined;

  const data = response?.data;
  if (!data || typeof data !== 'object') return undefined;

  // Read the envelope directly instead of going through extractError, which
  // substitutes English defaults of its own ('An error occurred') for the shapes
  // that carry a code but no message — those must fall through to the caller.
  const body = data as { error?: { message?: unknown } | string | null; message?: unknown };
  const candidates = [
    typeof body.error === 'string' ? body.error : body.error?.message,
    body.message,
  ];

  return candidates.find((value): value is string => typeof value === 'string' && value.trim() !== '');
}

/**
 * The backend's error code from the envelope (`{ error: { code } }`), or undefined.
 * Unlike apiErrorMessage this does not skip 5xx: a code such as ERR_UNDEFINED_COLUMN
 * is exactly what a 500 needs to surface so the person on screen can report it.
 * @param error - Value caught from a rejected request
 * @returns The machine-readable code, or undefined
 */
export function apiErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const data = (error as { response?: { data?: unknown } }).response?.data;
  if (!data || typeof data !== 'object') return undefined;
  const code = (data as { error?: { code?: unknown } | null }).error?.code;
  return typeof code === 'string' && code.trim() !== '' ? code : undefined;
}

/**
 * Extract success message from response
 * @param response - Axios response object
 * @returns Success message or undefined
 */
export function extractMessage(response: AxiosResponse): string | undefined {
  if (response.data?.message) {
    return response.data.message;
  }
  return undefined;
}

/**
 * Check if error is of a specific type
 * @param error - Error to check
 * @param code - Error code to match
 * @returns True if error matches the code
 */
export function isErrorCode(error: any, code: string): boolean {
  const errorInfo = extractError(error);
  return errorInfo.code === code;
}

/**
 * Format validation errors for display
 * @param error - Axios error with validation details
 * @returns Array of formatted error messages
 */
export function formatValidationErrors(error: any): string[] {
  const errorInfo = extractError(error);
  
  if (!errorInfo.details) {
    return [errorInfo.message];
  }

  // Standard format: [{ field: "email", message: "is required" }]
  if (Array.isArray(errorInfo.details)) {
    return errorInfo.details.map((detail: any) => {
      if (typeof detail === 'string') return detail;
      if (detail.field && detail.message) {
        return `${detail.field}: ${detail.message}`;
      }
      if (detail.message) return detail.message;
      return JSON.stringify(detail);
    });
  }

  // Object format: { email: ["is required"], name: ["can't be blank"] }
  if (typeof errorInfo.details === 'object') {
    const messages: string[] = [];
    Object.entries(errorInfo.details).forEach(([field, errors]) => {
      if (Array.isArray(errors)) {
        errors.forEach(msg => messages.push(`${field}: ${msg}`));
      } else {
        messages.push(`${field}: ${errors}`);
      }
    });
    return messages;
  }

  return [errorInfo.message];
}

/**
 * Build pagination parameters for API requests
 * @param page - Page number (1-based)
 * @param pageSize - Number of items per page
 * @returns Object with pagination parameters (padrão: pageSize em camelCase)
 */
export function buildPaginationParams(page: number, pageSize: number): { page: number; pageSize: number } {
  return {
    page,
    pageSize, // Padrão: camelCase conforme API_RESPONSE_STANDARD.md
  };
}


export const evoGateProbe = (x: any) => x
