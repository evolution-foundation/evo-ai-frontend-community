import { FileText } from 'lucide-react';
import { BaseHeader } from '@/components/base';

export default function NotaFiscalPage() {
  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader
        title="Nota Fiscal & Módulo Fiscal"
        subtitle="NFC-e 65 (Delivery/Balcão) + NF-e 55 (E-commerce) + Assistente de NCM e leitor de XML de fornecedor."
      />
      <div className="flex-1 rounded-xl border border-border overflow-hidden bg-card min-h-[calc(100vh-180px)]">
        <iframe
          src="/nota-fiscal.html"
          title="Módulo Fiscal"
          className="w-full h-full min-h-[calc(100vh-180px)] block border-0"
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="w-3.5 h-3.5" />
        Módulo de demonstração. A emissão e a consulta SEFAZ são simuladas; integração com cartórios/API real pode ser
        conectada posteriormente.
      </div>
    </div>
  );
}
