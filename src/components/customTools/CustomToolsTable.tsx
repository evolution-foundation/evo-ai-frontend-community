import { useLanguage } from '@/hooks/useLanguage';
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@evoapi/design-system';
import { Edit, Globe, Loader2, MoreHorizontal, Trash2, Wand } from 'lucide-react';
import { CustomTool } from '@/types/ai';
import { usePermissions } from '@/contexts/PermissionsContext';
import { cn } from '@/utils/cn';

interface CustomToolsTableProps {
  tools: CustomTool[];
  selectedTools: CustomTool[];
  loading?: boolean;
  onSelectionChange: (tools: CustomTool[]) => void;
  onToolClick: (tool: CustomTool) => void;
  onEditTool: (tool: CustomTool) => void;
  onDeleteTool: (tool: CustomTool) => void;
  onTestTool: (tool: CustomTool) => void;
  testingToolId?: string | null;
}

/** Same layout as `AgentsTable`, so the three tabs of the container read as one screen. */
const COL = {
  checkbox: 'flex-[0_0_18px]',
  name: 'flex-1 min-w-0',
  description: 'flex-[1.3] min-w-0',
  endpoint: 'flex-[1.2] min-w-0',
  tags: 'flex-[0_0_150px]',
  createdAt: 'flex-[0_0_110px]',
  test: 'flex-[0_0_100px]',
  actions: 'flex-[0_0_50px]',
};

const HEAD_ROW_CLASS =
  'flex items-center gap-4 border-b border-border bg-muted-foreground/[0.06] px-5 py-[14px] text-[12.5px] font-bold text-muted-foreground';

const ROW_CLASS =
  'flex items-center gap-4 border-b border-border/70 px-5 py-4 transition-colors duration-150 last:border-b-0 hover:bg-accent/40';

const CHIP_CLASS =
  'rounded-[7px] border-transparent px-2 py-0.5 text-[11.5px] font-bold leading-4';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  POST: 'bg-primary/10 text-primary',
  PUT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  PATCH: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  DELETE: 'bg-destructive/10 text-destructive',
};

/** `h-auto` cancels the design-system item height, which `cn()` would otherwise keep. */
const MENU_ITEM_CLASS =
  'h-auto cursor-pointer gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-foreground focus:bg-primary/10 focus:text-primary';

const MENU_ITEM_DANGER_CLASS =
  'h-auto cursor-pointer gap-2.5 rounded-lg px-3 py-[9px] text-[13.5px] font-medium text-destructive focus:bg-destructive/10 focus:text-destructive';

const CHECKBOX_CLASS = 'data-[state=checked]:border-primary data-[state=checked]:bg-primary';

export default function CustomToolsTable({
  tools,
  selectedTools,
  loading,
  onSelectionChange,
  onToolClick,
  onEditTool,
  onDeleteTool,
  onTestTool,
  testingToolId,
}: CustomToolsTableProps) {
  const { t, currentLanguage } = useLanguage('customTools');
  const { can, isReady } = usePermissions();
  const canEdit = isReady && can('ai_custom_tools', 'update');
  const canDelete = isReady && can('ai_custom_tools', 'delete');

  const selectedIds = new Set(selectedTools.map(tool => tool.id));
  const allSelected = tools.length > 0 && selectedIds.size === tools.length;

  const toggleAll = () => onSelectionChange(allSelected ? [] : tools);

  const toggleOne = (tool: CustomTool) =>
    onSelectionChange(
      selectedIds.has(tool.id)
        ? selectedTools.filter(selected => selected.id !== tool.id)
        : [...selectedTools, tool],
    );

  const statusRow = (message: string) => (
    <div role="row">
      <div
        role="cell"
        className="flex items-center justify-center py-12 text-sm text-muted-foreground"
      >
        {message}
      </div>
    </div>
  );

  return (
    <div
      role="table"
      className="overflow-visible rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]"
    >
      <div role="row" className={HEAD_ROW_CLASS}>
        <div role="columnheader" className={COL.checkbox}>
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label={t('table.selectAll')}
            className={CHECKBOX_CLASS}
          />
        </div>
        <div role="columnheader" className={COL.name}>{t('table.columns.tool')}</div>
        <div role="columnheader" className={COL.description}>{t('table.columns.description')}</div>
        <div role="columnheader" className={COL.endpoint}>{t('table.columns.endpoint')}</div>
        <div role="columnheader" className={COL.tags}>{t('table.columns.tags')}</div>
        <div role="columnheader" className={COL.createdAt}>{t('table.columns.createdAt')}</div>
        <div role="columnheader" className={COL.test}>{t('table.columns.test')}</div>
        <div role="columnheader" className={cn(COL.actions, 'text-right')}>
          {t('table.columns.actions')}
        </div>
      </div>

      {loading
        ? statusRow(t('loading.tools'))
        : tools.length === 0
          ? statusRow(t('table.empty.noResults'))
          : tools.map(tool => (
              <div role="row" key={tool.id} className={ROW_CLASS}>
                <div role="cell" className={COL.checkbox}>
                  <Checkbox
                    checked={selectedIds.has(tool.id)}
                    onCheckedChange={() => toggleOne(tool)}
                    aria-label={tool.name || t('table.noName')}
                    className={CHECKBOX_CLASS}
                  />
                </div>

                <div role="cell" className={COL.name}>
                  <button
                    type="button"
                    onClick={() => onToolClick(tool)}
                    className="flex w-full items-center gap-[11px] text-left"
                  >
                    <span className="flex size-[34px] flex-none items-center justify-center rounded-[9px] border border-primary/30 bg-primary/10 text-primary">
                      <Wand className="size-[18px]" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {tool.name || t('table.noName')}
                      </span>
                      <Badge
                        className={cn(
                          CHIP_CLASS,
                          'w-fit',
                          METHOD_COLORS[tool.method?.toUpperCase()] ??
                            'bg-muted-foreground/10 text-muted-foreground',
                        )}
                      >
                        {tool.method}
                      </Badge>
                    </span>
                  </button>
                </div>

                <div
                  role="cell"
                  className={cn(COL.description, 'truncate text-[13.5px] text-muted-foreground')}
                >
                  {tool.description || t('table.noDescription')}
                </div>

                <div
                  role="cell"
                  className={cn(COL.endpoint, 'flex items-center gap-1.5 text-muted-foreground')}
                >
                  <Globe className="size-3 flex-none" />
                  <span className="truncate font-mono text-[13px]">{tool.endpoint}</span>
                </div>

                <div role="cell" className={cn(COL.tags, 'flex flex-wrap gap-1')}>
                  {tool.tags && tool.tags.length > 0 ? (
                    <>
                      {tool.tags.slice(0, 2).map((tag, tagIndex) => (
                        <Badge
                          key={`${tag}-${tagIndex}`}
                          className={cn(CHIP_CLASS, 'max-w-full truncate bg-muted-foreground/10 text-muted-foreground')}
                        >
                          {tag}
                        </Badge>
                      ))}
                      {tool.tags.length > 2 && (
                        <Badge className={cn(CHIP_CLASS, 'bg-muted-foreground/10 text-muted-foreground')}>
                          +{tool.tags.length - 2}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-[13px] text-muted-foreground">{t('table.noTags')}</span>
                  )}
                </div>

                <div role="cell" className={cn(COL.createdAt, 'text-[13px] text-muted-foreground')}>
                  {tool.created_at && new Date(tool.created_at).toLocaleDateString(currentLanguage)}
                </div>

                <div role="cell" className={COL.test}>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => onTestTool(tool)}
                    disabled={testingToolId === tool.id}
                    className="gap-1"
                  >
                    {testingToolId === tool.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Wand className="size-3" />
                    )}
                    {t('table.actions.test')}
                  </Button>
                </div>

                <div role="cell" className={cn(COL.actions, 'flex justify-end')}>
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="size-8 p-0"
                          aria-label={t('table.columns.actions')}
                        >
                          <MoreHorizontal className="size-[18px]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-[168px] rounded-xl border-border p-1.5 shadow-[0_8px_28px_rgba(16,24,40,.14)]"
                      >
                        {canEdit && (
                          <DropdownMenuItem onClick={() => onEditTool(tool)} className={MENU_ITEM_CLASS}>
                            <Edit className="size-[15px]" />
                            {t('table.actions.edit')}
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => onDeleteTool(tool)}
                            className={MENU_ITEM_DANGER_CLASS}
                          >
                            <Trash2 className="size-[15px]" />
                            {t('table.actions.delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
    </div>
  );
}
