import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Button, Input, Checkbox } from '@evoapi/design-system';
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
    <div>
      <div>
        <h2 className="text-[22px] font-extrabold tracking-[-0.3px] text-foreground">
          {t('edit.products.title') || 'Produtos do agente'}
        </h2>
        <p className="mb-[26px] mt-1 text-sm text-muted-foreground">
          {t('edit.products.subtitle') ||
            'Selecione os produtos que este agente pode recomendar durante conversas. Eles serão injetados no system prompt automaticamente.'}
        </p>
      </div>

      <div className="flex items-center gap-[10px]">
        {/* No border/background/height override, so the `--ring` focus token shows. */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tp('header.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="flex-shrink-0 rounded-[8px] border border-border px-[10px] py-[5px] text-[12.5px] font-semibold text-muted-foreground">
          {attachedIds.size}/{allProducts.length}
        </span>
        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="h-auto flex-shrink-0 rounded-[9px] bg-primary px-[18px] py-[9px] text-sm font-semibold text-primary-foreground hover:bg-primary/85 disabled:opacity-55"
        >
          {saving ? (t('edit.products.saving') || 'Salvando...') : (t('edit.products.save') || 'Salvar')}
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{tp('page.loading')}</div>
      ) : (
        <div className="mt-4 max-h-[60vh] divide-y divide-border overflow-y-auto rounded-[14px] border border-border bg-card">
          {filteredProducts.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{tp('table.empty')}</p>
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
