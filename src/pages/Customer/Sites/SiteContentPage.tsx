import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { DEFAULT_SITE_SLUG, siteHrefForSlug } from '@/utils/siteLinks';
import { findSiteMenuItem } from '@/utils/siteMenuItems';
import { ContentViewer } from '@/components/content/ContentViewer';

/** Exibe o conteúdo de um item personalizado do submenu Sites. */
export default function SiteContentPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const item = useMemo(() => (itemId ? findSiteMenuItem(itemId) : null), [itemId]);
  const backHref = siteHrefForSlug(DEFAULT_SITE_SLUG);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted-foreground">Conteúdo não encontrado.</p>
        <Button variant="outline" asChild>
          <Link to={backHref}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar a Sites
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ContentViewer
      backHref={backHref}
      backLabel="Voltar a Sites"
      title={item.title}
      subtitle="Item personalizado do submenu Sites"
      contentType={item.contentType}
      url={item.url}
      html={item.html}
      fileName={item.fileName}
      fileData={item.fileData}
    />
  );
}
