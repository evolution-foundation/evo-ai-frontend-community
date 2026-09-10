import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
import { ProductCategory } from '@/types/products';

class ProductCategoriesService {
  private readonly baseUrl = '/product_categories';

  async listCategories(q?: string): Promise<ProductCategory[]> {
    const response = await api.get(this.baseUrl, { params: q ? { q } : undefined });
    return extractData<ProductCategory[]>(response);
  }

  async createCategory(name: string): Promise<ProductCategory> {
    const response = await api.post(this.baseUrl, { product_category: { name } });
    return extractData<ProductCategory>(response);
  }
}

export const productCategoriesService = new ProductCategoriesService();