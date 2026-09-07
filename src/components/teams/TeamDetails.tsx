import { getFormattingDateFnsLocale } from '@/lib/formattingLocale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Avatar,
  AvatarFallback,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Separator,
} from '@evoapi/design-system';
import {
  Edit,
  Users,
  Clock,
  Settings,
  History,
  StickyNote,
} from 'lucide-react';
import { Team } from '@/types/users';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';

interface TeamDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onEdit: (team: Team) => void;
  onManageUsers: (team: Team) => void;
}

export default function TeamDetails({
  open,
  onOpenChange,
  team,
  onEdit,
  onManageUsers,
}: TeamDetailsProps) {
  const { t } = useLanguage('teams');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                  {getInitials(team.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {team.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={team.allow_auto_assign ? "secondary" : "outline"} className="text-xs">
                    {team.allow_auto_assign ? t('details.autoAssignActive') : t('details.autoAssignInactive')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t('details.id')}: {team.id}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManageUsers(team)}
              >
                <Users className="h-4 w-4 mr-2" />
                {t('details.actions.manageUsers')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(team)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {t('details.actions.edit')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="w-full justify-start px-6 py-0 h-12 bg-transparent border-b rounded-none">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <StickyNote className="h-4 w-4 mr-2" />
                {t('details.tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Users className="h-4 w-4 mr-2" />
                {t('details.tabs.members')} ({team.members_count || 0})
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <History className="h-4 w-4 mr-2" />
                {t('details.tabs.activity')}
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <Settings className="h-4 w-4 mr-2" />
                {t('details.tabs.settings')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="px-6 py-4 space-y-6">
              {/* Description */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  {t('details.overview.description')}
                </h3>
                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                  {team.description || t('details.overview.noDescription')}
                </p>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('details.overview.totalMembers')}</p>
                  <p className="text-2xl font-bold text-blue-600">{team.members_count || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('details.overview.autoAssign')}</p>
                  <p className={`text-2xl font-bold ${team.allow_auto_assign ? 'text-green-600' : 'text-gray-400'}`}>
                    {team.allow_auto_assign ? t('details.overview.active') : t('details.overview.inactive')}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('details.overview.temporalInfo')}
                </h3>
                <div className="space-y-2 text-sm">
                  {team.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('details.overview.created')}</span>
                      <span className="font-mono">
                        {formatDistanceToNow(new Date(team.created_at), {
                          addSuffix: true,
                          locale: getFormattingDateFnsLocale(),
                        })}
                      </span>
                    </div>
                  )}
                  {team.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('details.overview.lastUpdate')}</span>
                      <span className="font-mono">
                        {formatDistanceToNow(new Date(team.updated_at), {
                          addSuffix: true,
                          locale: getFormattingDateFnsLocale(),
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members" className="px-6 py-4">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('details.members.placeholder')}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => onManageUsers(team)}
                >
                  {t('details.members.manageUsers')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="px-6 py-4">
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('details.activity.placeholder')}</p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="px-6 py-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('details.settings.title')}
                </h3>

                <div className="space-y-4 bg-muted/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{t('details.settings.autoAssignTitle')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('details.settings.autoAssignDescription')}
                      </p>
                    </div>
                    <Badge variant={team.allow_auto_assign ? "secondary" : "outline"}>
                      {team.allow_auto_assign ? t('details.settings.enabled') : t('details.settings.disabled')}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => onEdit(team)}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('details.settings.editSettings')}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
