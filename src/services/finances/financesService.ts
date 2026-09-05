import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';

export type FinancialKind = 'expense' | 'income';
export type FinancialScope = 'store' | 'personal';

export interface FinancialTransaction {
  id: string;
  kind: FinancialKind;
  scope: FinancialScope;
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  receipt_url?: string | null;
  recurring_transaction_id?: string | null;
  occurrence_number?: number | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialTransactionFormData {
  kind: FinancialKind;
  scope: FinancialScope;
  description: string;
  category: string;
  amount: number;
  transaction_date: string;
  receipt_url?: string | null;
}

export interface FinancialTransactionsListParams {
  scope?: FinancialScope;
  kind?: FinancialKind;
  from?: string;
  to?: string;
}

export interface FinancialTransactionsResponse {
  success: boolean;
  data: FinancialTransaction[];
  meta: Record<string, unknown>;
  message?: string;
}

class FinancialTransactionsService {
  private readonly baseUrl = '/financial_transactions';
  async getTransactions(params?: FinancialTransactionsListParams): Promise<FinancialTransaction[]> {
    try {
      const response = await api.get(this.baseUrl, { params });
      return extractResponse<FinancialTransaction>(response).data;
    } catch (error) {
      console.error('FinancialTransactionsService.getTransactions error:', error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<FinancialTransaction> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return extractData<FinancialTransaction>(response);
  }

  async createTransaction(payload: FinancialTransactionFormData): Promise<FinancialTransaction> {
    const response = await api.post(this.baseUrl, { financial_transaction: payload });
    return extractData<FinancialTransaction>(response);
  }

  async updateTransaction(id: string, payload: Partial<FinancialTransactionFormData>): Promise<FinancialTransaction> {
    const response = await api.put(`${this.baseUrl}/${id}`, { financial_transaction: payload });
    return extractData<FinancialTransaction>(response);
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export type RecurrenceFrequency = 'monthly' | 'days';
export type RecurrenceEndRule = 'never' | 'until_date' | 'count';

export interface RecurringTransaction {
  id: string;
  kind: FinancialKind;
  scope: FinancialScope;
  description: string;
  category: string | null;
  amount: number;
  start_date: string;
  frequency: RecurrenceFrequency;
  interval_days: number | null;
  end_rule: RecurrenceEndRule;
  end_date: string | null;
  max_occurrences: number | null;
  active: boolean;
  generated_count: number;
  next_occurrence_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionFormData {
  kind: FinancialKind;
  scope: FinancialScope;
  description: string;
  category?: string;
  amount: number;
  start_date: string;
  frequency: RecurrenceFrequency;
  interval_days?: number | null;
  end_rule: RecurrenceEndRule;
  end_date?: string | null;
  max_occurrences?: number | null;
}

class RecurringTransactionsService {
  private readonly baseUrl = '/recurring_transactions';

  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    const response = await api.get(this.baseUrl);
    return extractResponse<RecurringTransaction>(response).data;
  }

  async createRecurringTransaction(payload: RecurringTransactionFormData): Promise<RecurringTransaction> {
    const response = await api.post(this.baseUrl, { recurring_transaction: payload });
    return extractData<RecurringTransaction>(response);
  }

  async updateRecurringTransaction(
    id: string,
    payload: Partial<RecurringTransactionFormData>,
  ): Promise<RecurringTransaction> {
    const response = await api.put(`${this.baseUrl}/${id}`, { recurring_transaction: payload });
    return extractData<RecurringTransaction>(response);
  }

  async deleteRecurringTransaction(id: string, deleteFuture = false): Promise<void> {
    const suffix = deleteFuture ? '?delete_future=true' : '';
    await api.delete(`${this.baseUrl}/${id}${suffix}`);
  }
}

export const financialTransactionsService = new FinancialTransactionsService();
export const recurringTransactionsService = new RecurringTransactionsService();

/* ------------------------------ Leitor de Notas/Recibos ------------------------------ */

export interface ReceiptExtractionItem {
  descricao: string | null;
  quantidade: number | null;
  valor_unitario: number | null;
}

export type AiProvider = 'openai' | 'gemini';

export interface ReceiptExtraction {
  fornecedor: string | null;
  cnpj: string | null;
  endereco: string | null;
  data_compra: string | null;
  forma_pagamento: string | null;
  valor_total: number | null;
  categoria_sugerida: string | null;
  itens: ReceiptExtractionItem[];
  receipt_url: string;
  provider: AiProvider;
}

export interface AiProvidersStatus {
  openai: boolean;
  gemini: boolean;
}

class ReceiptExtractionService {
  private readonly baseUrl = '/finances/receipt_extractions';

  async extract(file: File, provider?: AiProvider): Promise<ReceiptExtraction> {
    const formData = new FormData();
    formData.append('attachment', file, file.name);
    if (provider) formData.append('provider', provider);
    const response = await api.post(this.baseUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return extractData<ReceiptExtraction>(response);
  }

  async getProvidersStatus(): Promise<AiProvidersStatus> {
    const response = await api.get(`${this.baseUrl}/providers`);
    return extractData<AiProvidersStatus>(response);
  }
}

export const receiptExtractionService = new ReceiptExtractionService();