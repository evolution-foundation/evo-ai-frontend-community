import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { DASHBOARD_DEFAULT_HREF, findDashboardItem } from '@/utils/dashboardMenu';
import { ContentViewer } from '@/components/content/ContentViewer';

/** Exibe o conteúdo de um item personalizado do submenu Dashboard. */
export default function DashboardContentPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const item = useMemo(() => (itemId ? findDashboardItem(itemId) : null), [itemId]);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted-foreground">Conteúdo não encontrado.</p>
        <Button variant="outline" asChild>
          <Link to={DASHBOARD_DEFAULT_HREF}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ContentViewer
      backHref={DASHBOARD_DEFAULT_HREF}
      backLabel="Voltar ao Dashboard"
      title={item.title}
      subtitle="Item personalizado do Dashboard"
      contentType={item.contentType}
      url={item.url}
      html={item.html}
      fileName={item.fileName}
      fileData={item.fileData}
    />
  );
}
