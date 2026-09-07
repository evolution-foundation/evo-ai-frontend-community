import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button, Card, CardContent, Badge, Input } from '@evoapi/design-system';
import {
  Package,
  Search,
  Star,
  ExternalLink,
  Download,
  User,
  ImageIcon,
  Filter,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  author: string;
  version: string;
  tags: string[];
  rating: number;
  downloads: number;
  price: number;
  currency: string;
  external_url?: string;
}

interface MarketplacePagination {
  current_page: number;
  total_pages: number;
  total: number;
  per_page: number;
}

const Marketplace = () => {
  const { t } = useLanguage('marketplace');
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [pagination, setPagination] = useState<MarketplacePagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Simulated data for demonstration
  const mockProducts: MarketplaceProduct[] = [
    {
      id: '1',
      name: t('mockProducts.aiAssistant.name'),
      description: t('mockProducts.aiAssistant.description'),
      thumbnail: '',
      author: 'EvoAI Team',
      version: '1.2.0',
      tags: ['assistant', 'ai', 'research'],
      rating: 4.8,
      downloads: 1250,
      price: 0,
      currency: 'USD',
    },
    {
      id: '2',
      name: t('mockProducts.customerSupport.name'),
      description: t('mockProducts.customerSupport.description'),
      thumbnail: '',
      author: 'Support Solutions',
      version: '2.1.5',
      tags: ['customer-support', 'automation', 'chat'],
      rating: 4.6,
      downloads: 850,
      price: 29.99,
      currency: 'USD',
    },
    {
      id: '3',
      name: t('mockProducts.dataAnalysis.name'),
      description: t('mockProducts.dataAnalysis.description'),
      thumbnail: '',
      author: 'Data Corp',
      version: '1.0.3',
      tags: ['data-analysis', 'reports', 'analytics'],
      rating: 4.9,
      downloads: 425,
      price: 49.99,
      currency: 'USD',
    },
  ];

  // Simulated API call
  const loadProducts = async () => {
    try {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setProducts(mockProducts);
      setPagination({
        current_page: 1,
        total_pages: 1,
        total: mockProducts.length,
        per_page: 10,
      });

      // Extract unique tags
      const allTags = mockProducts.flatMap(product => product.tags);
      setAvailableTags([...new Set(allTags)]);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some(tag => product.tags.includes(tag));
    return matchesSearch && matchesTags;
  });

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return t('product.free');
    return new Intl.NumberFormat(getFormattingLocale(), {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(price);
  };

  const ProductCard = ({ product }: { product: MarketplaceProduct }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <ImageIcon className="h-16 w-16 text-gray-400" />
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{product.author}</span>
            <span>•</span>
            <span>v{product.version}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {product.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{product.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{product.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span className="text-sm">{product.downloads}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{formatPrice(product.price, product.currency)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" size="sm">
              {t('product.install')}
            </Button>
            {product.external_url && (
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold">{t('header.title')}</h1>
          <Badge variant="secondary" className="gap-1">
            <Package className="h-4 w-4" />
            {t('header.productsCount', { count: filteredProducts.length })}
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          {t('header.subtitle')}
        </p>
      </div>

      {/* Search and Filters */}
      <div className="p-6 border-b">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('search.title')}</h3>
              {(searchQuery || selectedTags.length > 0) && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  {t('search.clearFilters')}
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tags Filter */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('search.tagsLabel')}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Package className="h-8 w-8 animate-pulse" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-48 text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('empty.title')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('empty.description')}
              </p>
              <Button onClick={clearFilters}>{t('empty.action')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination (if needed) */}
      {pagination && pagination.total_pages > 1 && (
        <div className="p-6 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('pagination.pageInfo', { current: pagination.current_page, total: pagination.total_pages, count: pagination.total })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pagination.total_pages}
                onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
