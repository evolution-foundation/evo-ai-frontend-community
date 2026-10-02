import { useEffect, useState, useCallback } from 'react';
import { Package, Plus, Trash2, Edit2, AlertTriangle, RefreshCw, ShoppingCart, Cloud, Boxes, Wrench } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Badge,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import ProductModal from '@/components/products/ProductModal';
import { productsService } from '@/services/products/productsService';
import type { Product, ProductFormData } from '@/types/products';
import { stockInfo } from '@/components/products/productStock';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      // Carrega TODOS os tipos de produtos sem restrição
      const res = await productsService.getProducts({ per_page: 500 });
      setProducts(res.data || []);
    } catch {
      toast.error('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (payload: ProductFormData, files?: File[]) => {
    try {
      if (editingProduct?.id) {
        await productsService.updateProduct(editingProduct.id, payload, files);
        toast.success('Item atualizado com sucesso!');
      } else {
        await productsService.createProduct(payload, files);
        toast.success('Produto/Item criado com sucesso!');
      }
      setProductModalOpen(false);
      setEditingProduct(null);
      fetchInventory();
    } catch {
      toast.error('Erro ao salvar produto/item');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este item do estoque?')) return;
    try {
      await productsService.deleteProduct(id);
      toast.success('Item excluído com sucesso!');
      fetchInventory();
    } catch {
      toast.error('Erro ao excluir item');
    }
  };

  const getItemTypeBadge = (product: Product) => {
    const type = product.item_type || 'produto';
    switch (type) {
      case 'produto_ml':
        return <Badge variant="secondary">Produto (ML)</Badge>;
      case 'servico':
        return <Badge variant="outline">Serviço</Badge>;
      case 'insumo':
        return <Badge variant="outline">Insumo</Badge>;
      case 'equipamento':
        return (
          <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
            Equipamento {product.equipamento_tipo ? `(${product.equipamento_tipo})` : ''}
          </Badge>
        );
      default:
        return <Badge variant="default">Produto</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Estoque</h1>
          <p className="text-muted-foreground text-sm">Visão geral de todos os produtos, equipamentos, insumos e itens em estoque</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchInventory}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={handleOpenCreateProduct}>
            <Plus className="w-4 h-4 mr-2" /> Criar Produto
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-card">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando estoque...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Nenhum item cadastrado no estoque.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-2">Item / Produto</th>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Preço Padrão</th>
                <th className="px-4 py-2">Quantidade em Estoque</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const stock = stockInfo(product);
                const isOut = stock !== null && stock <= 0;
                return (
                  <tr key={product.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        {product.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{product.sku || '—'}</td>
                    <td className="px-4 py-2">{getItemTypeBadge(product)}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      R$ {product.default_price ? product.default_price.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-2 font-bold">
                      {stock === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : isOut ? (
                        <span className="text-destructive font-medium">Sem Estoque (0)</span>
                      ) : (
                        stock
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isOut
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {isOut ? 'Sem Estoque' : 'Em Estoque'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEditProduct(product)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ProductModal
        open={productModalOpen}
        product={editingProduct}
        loading={false}
        onOpenChange={setProductModalOpen}
        onSubmit={handleSaveProduct}
      />
    </div>
  );
}