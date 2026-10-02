import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { EDITOR_MENU_ROUTE, findEditorNode } from '@/utils/editorMenus';
import { ContentViewer } from '@/components/content/ContentViewer';

/** Exibe o conteúdo de uma folha do Editor. */
export default function ContentViewPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const found = useMemo(() => (nodeId ? findEditorNode(nodeId) : null), [nodeId]);

  if (!found) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted-foreground">Conteúdo não encontrado.</p>
        <Button variant="outline" asChild>
          <Link to={EDITOR_MENU_ROUTE}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Editor
          </Link>
        </Button>
      </div>
    );
  }

  const { node, menu } = found;

  return (
    <ContentViewer
      backHref={EDITOR_MENU_ROUTE}
      backLabel="Voltar ao Editor"
      title={node.title}
      subtitle={`menu "${menu.name}"`}
      contentType={node.contentType}
      url={node.url}
      html={node.html}
      fileName={node.fileName}
      fileData={node.fileData}
    />
  );
}
