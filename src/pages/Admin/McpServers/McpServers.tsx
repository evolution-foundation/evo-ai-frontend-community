import { getFormattingLocale } from '@/lib/formattingLocale';
import { useState, useEffect } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
} from '@evoapi/design-system';
import {
  Server,
  Plus,
  Settings,
  Trash2,
  Loader2,
  MoreHorizontal,
  Eye,
  Edit,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

import { MCPServer } from '@/types/ai';
import { listMCPServers } from '@/services/agents/mcpServerService';
import { useLanguage } from '@/hooks/useLanguage';
const McpServers = () => {
  const { t } = useLanguage('mcpServers');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page] = useState(1);
  const [limit] = useState(1000);

  useEffect(() => {
    const fetchServers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const skip = (page - 1) * limit;
        const data = await listMCPServers({ skip, limit });
        setServers(data);
      } catch (error) {
        console.error('Erro ao carregar servidores MCP:', error);
        setError(t("messages.loadError"));
        toast.error(t("messages.loadError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();
  }, [page, limit, t]);

  const stats = {
    total: servers.length,
    active: servers.filter(s => s.type === 'official').length, // Assumindo que 'official' são ativos
    inactive: servers.filter(s => s.type === 'community').length,
    withTools: servers.filter(s => s.tools && s.tools.length > 0).length,
    newThisMonth: servers.filter(s => {
      const createdDate = new Date(s.created_at);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return createdDate >= thisMonth;
    }).length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('messages.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t('buttons.tryAgain')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            {t('buttons.newServer')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card rounded-lg border p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base min-w-0 truncate">
                {t('stats.total')}
              </h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-2">{stats.total}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {stats.newThisMonth > 0
                ? t('stats.newThisMonth', { count: stats.newThisMonth })
                : t('stats.noNewThisMonth')}
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <Server className="h-5 w-5 text-green-500" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base min-w-0 truncate">
                {t('stats.official')}
              </h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-2">{stats.active}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {stats.total > 0
                ? t('stats.percentOfTotal', {
                    percent: Math.round((stats.active / stats.total) * 100),
                  })
                : t('stats.percentOfTotal', { percent: 0 })}
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <Settings className="h-5 w-5 text-orange-500" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base min-w-0 truncate">
                {t('stats.community')}
              </h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-2">{stats.inactive}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {stats.total > 0
                ? t('stats.percentOfTotal', {
                    percent: Math.round((stats.inactive / stats.total) * 100),
                  })
                : t('stats.percentOfTotal', { percent: 0 })}
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <Wrench className="h-5 w-5 text-purple-500" />
              </div>
              <h3 className="font-semibold text-sm sm:text-base min-w-0 truncate">
                {t('stats.withTools')}
              </h3>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-2">{stats.withTools}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {stats.total > 0
                ? t('stats.percentOfTotal', {
                    percent: Math.round((stats.withTools / stats.total) * 100),
                  })
                : t('stats.percentOfTotal', { percent: 0 })}
            </p>
          </div>
        </div>

        {/* Servers List */}
        <div className="bg-card rounded-lg border">
          <div className="border-b p-6">
            <h2 className="text-lg font-semibold">{t('table.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('table.description')}</p>
          </div>
          <div className="overflow-x-auto">
            {servers.length === 0 ? (
              <div className="p-8 text-center">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('emptyState.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('emptyState.description')}
                </p>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('emptyState.addFirst')}
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.headers.name')}</TableHead>
                    <TableHead>{t('table.headers.description')}</TableHead>
                    <TableHead>{t('table.headers.type')}</TableHead>
                    <TableHead>{t('table.headers.configuration')}</TableHead>
                    <TableHead>{t('table.headers.tools')}</TableHead>
                    <TableHead>{t('table.headers.createdAt')}</TableHead>
                    <TableHead className="text-right">
                      {t('table.headers.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servers.map(server => (
                    <TableRow key={server.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Server className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{server.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {server.description || t('fields.noDescription')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            server.type === 'official'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500'
                              : 'bg-orange-500/10 text-orange-500 border-orange-500'
                          }
                        >
                          {server.type === 'official'
                            ? t('types.official')
                            : t('types.community')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            server.config_type === 'sse'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500'
                              : 'bg-orange-500/10 text-orange-500 border-orange-500'
                          }
                        >
                          {server.config_type?.charAt(0).toUpperCase() +
                            server.config_type?.slice(1) || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center">
                          <Wrench className="h-4 w-4 mr-1 text-emerald-400" />
                          {server.tools?.length || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(server.created_at).toLocaleDateString(getFormattingLocale())}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">
                                {t('table.actions.openMenu')}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => console.log('Ver detalhes', server.id)}
                            >
                              <Eye className="h-4 w-4" />
                              <span>{t('table.actions.viewDetails')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => console.log('Editar', server.id)}>
                              <Edit className="h-4 w-4" />
                              <span>{t('table.actions.edit')}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => console.log('Excluir', server.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>{t('table.actions.delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default McpServers;
