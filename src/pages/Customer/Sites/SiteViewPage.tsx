import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { BaseHeader } from '@/components/base';
import { resolveSiteUrl } from '@/utils/siteLinks';

export default function SiteViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const site = useMemo(() => resolveSiteUrl(slug), [slug]);

  if (!site) {
    return (
      <div className="flex flex-col h-full bg-background p-6 space-y-4">
        <BaseHeader title="Site" subtitle="Visualização do site" />
        <div className="flex-1 rounded-lg border border-border bg-card flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Site não encontrado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-6 space-y-4">
      <BaseHeader
        title={site.name}
        subtitle="Visualização do site"
        secondaryActions={[
          {
            label: 'Abrir em nova aba',
            icon: <ExternalLink className="w-4 h-4 mr-2" />,
            onClick: () => window.open(site.url, '_blank', 'noreferrer'),
            variant: 'outline',
          },
        ]}
      />
      <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden h-[75vh]">
        <iframe
          src={site.url}
          title={site.name}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}
