import { Button, Card, CardContent } from '@evoapi/design-system';
import { ArrowRight, Settings, Wrench, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';

interface WizardStep4Props {
  agentId: string;
  agentName: string;
  onFinish: () => void;
}

const WizardStep4_Success = ({ agentId, agentName, onFinish }: WizardStep4Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage('aiAgents');

  const handleViewAgent = () => {
    onFinish();
    navigate(`/agents/${agentId}/edit`);
  };

  const handleTestAgent = () => {
    onFinish();
    navigate(`/agents/${agentId}/edit?test=1`);
  };

  const handleGoToList = () => {
    onFinish();
    navigate('/agents/list');
  };

  return (
    <div className="flex flex-col h-full min-h-0 max-w-4xl mx-auto py-2 px-4" data-agent-name={agentName}>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-2.5 pb-2">
          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group"
            onClick={handleViewAgent}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Settings className="h-5 w-5 text-blue-500 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-0.5">{t('wizard.success.advancedSettings.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('wizard.success.advancedSettings.description')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group"
            onClick={handleTestAgent}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-green-500/10 group-hover:bg-green-500 transition-colors">
                  <MessageSquare className="h-5 w-5 text-green-500 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-0.5">{t('wizard.success.testChat.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('wizard.success.testChat.description')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:shadow-lg hover:border-primary group"
            onClick={() => navigate('/agents/custom-tools')}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500 transition-colors">
                  <Wrench className="h-5 w-5 text-purple-500 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base mb-0.5">{t('wizard.success.addTools.title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('wizard.success.addTools.description')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-center flex-shrink-0 pt-2 border-t">
        <Button variant="outline" size="lg" onClick={handleGoToList}>
          {t('wizard.success.viewAllAgents')}
        </Button>
      </div>
    </div>
  );
};

export default WizardStep4_Success;
