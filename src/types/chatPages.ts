export interface ChatPageAppearance {
  primary_color?: string;
  logo_url?: string;
}

export interface ChatPage {
  id: string;
  slug: string;
  title?: string;
  display_title?: string;
  description?: string;
  appearance: ChatPageAppearance;
  website_token: string;
  widget_inbox_name?: string;
  published: boolean;
  public_path?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next_page?: boolean;
  has_previous_page?: boolean;
}

// A web widget the chat page can embed — derived from an existing web-widget inbox.
export interface WebWidgetOption {
  inbox_id: string;
  name: string;
  website_token: string;
}

export interface ChatPagePayload {
  slug?: string;
  title?: string;
  description?: string;
  appearance?: ChatPageAppearance;
  website_token: string;
  published?: boolean;
}
