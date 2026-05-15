import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Button, Input, Checkbox, Badge } from '@evoapi/design-system';
import { Package, Cloud, Search } from 'lucide-react';
import { productsService } from '@/services/products/productsService';
import type { Agent } from '@/types/agents';
import type { Product } from '@/types/products';

interface Props {
  agent: Agent;
}

export default function ProductsSection({ agent }: Props) {
  const { t } = useLanguage('aiAgents');
  const tp = useLanguage('products').t;
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [attachedIds, setAttachedIds] = useState<Set<string>>(new Set());
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!agent?.id) return;
    setLoading(true);
    try {
      const [allRes, attachedRes] = await Promise.all([
        productsService.getProducts({ per_page: 500, status: 'active' }),
        productsService.listAgentProducts(agent.id),
      ]);
      setAllProducts(allRes.data ?? []);
      const ids = new Set((attachedRes ?? []).map((p) => p.id));
      setAttachedIds(ids);
      setOriginalIds(new Set(ids));
    } catch (error) {
      console.error(error);
      toast.error(tp('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [agent?.id, tp]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) => {
    setAttachedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isDirty =
    attachedIds.size !== originalIds.size ||
    Array.from(attachedIds).some((id) => !originalIds.has(id));

  const handleSave = async () => {
    if (!agent?.id) return;
    setSaving(true);
    try {
      const toAttach = Array.from(attachedIds).filter((id) => !originalIds.has(id));
      const toDetach = Array.from(originalIds).filter((id) => !attachedIds.has(id));

      if (toAttach.length > 0) {
        await productsService.attachProductsToAgent(agent.id, toAttach);
      }
      for (const productId of toDetach) {
        await productsService.detachProductFromAgent(agent.id, productId);
      }

      setOriginalIds(new Set(attachedIds));
      toast.success(t('edit.products.saveSuccess') || 'Saved');
    } catch (error) {
      console.error(error);
      toast.error(t('edit.products.saveError') || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = allProducts.filter((p) =>
    search.trim() === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('edit.products.title') || 'Produtos do agente'}</h2>
        <p className="text-sm text-muted-foreground">
          {t('edit.products.subtitle') ||
            'Selecione os produtos que este agente pode recomendar durante conversas. Eles serão injetados no system prompt automaticamente.'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tp('header.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="outline">
          {attachedIds.size}/{allProducts.length}
        </Badge>
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? (t('edit.products.saving') || 'Salvando...') : (t('edit.products.save') || 'Salvar')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-10">
          {tp('page.loading')}
        </div>
      ) : (
        <div className="border rounded-md divide-y max-h-[60vh] overflow-y-auto">
          {filteredProducts.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {tp('table.empty')}
            </p>
          )}
          {filteredProducts.map((product) => {
            const Icon = product.kind === 'digital' ? Cloud : Package;
            const checked = attachedIds.has(product.id);
            return (
              <label
                key={product.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(product.id)} />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {tp(`kind.${product.kind}`)} · {product.currency}{' '}
                    {Number(product.default_price).toFixed(2)}
                  </div>
                </div>
                {product.sku && (
                  <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
