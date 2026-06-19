import apiPublic from '@/services/core/apiPublic';

export interface PublicFormField {
  key: string;
  label?: string;
  type: string; // text | email | tel | number | textarea | select | checkbox
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface PublicFormAppearance {
  primary_color?: string;
  logo_url?: string;
  image_url?: string;
  success_message?: string;
}

export interface PublicFormConfig {
  slug: string;
  title: string;
  description?: string;
  appearance: PublicFormAppearance;
  fields: PublicFormField[];
}

export interface FormSubmissionResult {
  success: boolean;
  lead_id?: string;
  deal_id?: string;
  message?: string;
}

/**
 * Service para a API pública (anônima) de formulários de captura de lead (B14.02).
 * Endpoints: GET /public/api/v1/forms/:slug e POST .../submissions.
 * Não requer autenticação — o slug resolve o formulário/tenant.
 */
class FormsService {
  private baseURL = '/forms';

  async getForm(slug: string): Promise<PublicFormConfig> {
    const { data } = await apiPublic.get<{ data: PublicFormConfig }>(`${this.baseURL}/${slug}`);
    return data.data;
  }

  async submit(slug: string, values: Record<string, unknown>): Promise<FormSubmissionResult> {
    const { data } = await apiPublic.post<FormSubmissionResult>(
      `${this.baseURL}/${slug}/submissions`,
      { submission: values },
    );
    return data;
  }
}

export const formsService = new FormsService();
export default formsService;
