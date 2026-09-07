import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Card, CardContent } from '@evoapi/design-system';
import { User, Building } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface SenderNamePreviewProps {
  senderNameType: 'friendly' | 'professional';
  businessName: string;
  onUpdate: (type: 'friendly' | 'professional') => void;
}

const SenderNamePreview: React.FC<SenderNamePreviewProps> = ({
  senderNameType,
  businessName,
  onUpdate,
}) => {
  const { t } = useLanguage('channels');
  const senderOptions = [
    {
      key: 'friendly' as const,
      heading: t('settings.senderSettings.friendly.title'),
      content: t('settings.senderSettings.friendly.description'),
      preview: {
        senderName: 'Smith',
        businessName: 'Evolution',
        email: '<support@yourbusiness.com>',
      },
      icon: User,
    },
    {
      key: 'professional' as const,
      heading: t('settings.senderSettings.professional.title'),
      content: t('settings.senderSettings.professional.description'),
      preview: {
        senderName: '',
        businessName: 'Evolution',
        email: '<support@yourbusiness.com>',
      },
      icon: Building,
    },
  ];

  const getUserName = (option: (typeof senderOptions)[0]) => {
    return option.key === 'friendly' ? option.preview.senderName : option.preview.businessName;
  };

  const getDisplayName = (option: (typeof senderOptions)[0]) => {
    const displayBusinessName = businessName || option.preview.businessName;

    if (option.key === 'friendly') {
      return t('settings.senderSettings.friendly.format', {
        name: option.preview.senderName,
        agentName: option.preview.senderName,
        businessName: displayBusinessName,
      });
    }
    return displayBusinessName;
  };

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
      {senderOptions.map(option => {
        const IconComponent = option.icon;
        const isActive = option.key === senderNameType;

        return (
          <button
            key={option.key}
            onClick={() => onUpdate(option.key)}
            className="text-foreground cursor-pointer p-0 w-full lg:w-auto"
          >
            <Card
              className={`transition-all hover:shadow-md ${
                isActive
                  ? 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <IconComponent
                      className={`w-5 h-5 ${
                        isActive ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <div className="text-left">
                      <h3
                        className={`font-medium text-sm ${
                          isActive
                            ? 'text-primary dark:text-primary'
                            : 'text-foreground'
                        }`}
                      >
                        {option.heading}
                      </h3>
                      <p className="text-xs text-muted-foreground">{option.content}</p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground block mb-2">
                      {t('settings.senderSettings.preview.example')}
                    </span>
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {getUserName(option).charAt(0).toUpperCase()}
                      </div>

                      {/* Name and Email */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 max-w-[18rem]">
                          <span className="text-xs font-semibold leading-tight text-foreground truncate">
                            {getDisplayName(option)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {option.preview.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
};

interface SenderSettingsFormProps {
  senderNameType: 'friendly' | 'professional';
  businessName: string;
  onUpdate: (data: {
    sender_name_type: 'friendly' | 'professional';
    business_name?: string;
  }) => Promise<void>;
}

const SenderSettingsForm: React.FC<SenderSettingsFormProps> = ({
  senderNameType: initialSenderNameType,
  businessName: initialBusinessName,
  onUpdate,
}) => {
  const { t } = useLanguage('channels');
  const [senderNameType, setSenderNameType] = useState<'friendly' | 'professional'>(
    initialSenderNameType || 'friendly',
  );
  const [businessName, setBusinessName] = useState(initialBusinessName || '');
  const [showBusinessNameInput, setShowBusinessNameInput] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const businessNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSenderNameType(initialSenderNameType || 'friendly');
    setBusinessName(initialBusinessName || '');
  }, [initialSenderNameType, initialBusinessName]);

  useEffect(() => {
    if (showBusinessNameInput && businessNameInputRef.current) {
      businessNameInputRef.current.focus();
    }
  }, [showBusinessNameInput]);

  const handleSenderNameTypeUpdate = async (type: 'friendly' | 'professional') => {
    setSenderNameType(type);

    try {
      setIsUpdating(true);
      await onUpdate({
        sender_name_type: type,
        business_name: businessName,
      });
    } catch (error) {
      console.error(t('settings.senderSettings.errors.updateSenderTypeError'), error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBusinessNameSave = async () => {
    if (!businessName.trim()) {
      return;
    }

    try {
      setIsUpdating(true);
      await onUpdate({
        sender_name_type: senderNameType,
        business_name: businessName,
      });
      setShowBusinessNameInput(false);
    } catch (error) {
      console.error(t('settings.senderSettings.errors.saveBusinessNameError'), error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShowBusinessNameInput = () => {
    setShowBusinessNameInput(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          {t('settings.senderSettings.title')}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('settings.senderSettings.description')}
        </p>
      </div>

      {/* Preview Cards */}
      <div>
        <SenderNamePreview
          senderNameType={senderNameType}
          businessName={businessName}
          onUpdate={handleSenderNameTypeUpdate}
        />
      </div>

      {/* Business Name Section */}
      <div className="space-y-3">
        <div className="flex flex-col items-start gap-2">
          <Button
            variant="ghost"
            onClick={handleShowBusinessNameInput}
            disabled={isUpdating}
            className="text-primary hover:text-primary/80"
          >
            {businessName
              ? t('settings.senderSettings.businessName.change')
              : t('settings.senderSettings.businessName.set')}
          </Button>

          {showBusinessNameInput && (
            <div className="flex gap-2 w-full max-w-md">
              <Input
                ref={businessNameInputRef}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder={t('settings.senderSettings.businessName.placeholder')}
                className="flex-1"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleBusinessNameSave();
                  } else if (e.key === 'Escape') {
                    setShowBusinessNameInput(false);
                    setBusinessName(initialBusinessName || '');
                  }
                }}
              />
              <Button
                onClick={handleBusinessNameSave}
                disabled={!businessName.trim() || isUpdating}
                loading={isUpdating}
                className="flex-shrink-0"
              >
                {t('settings.senderSettings.businessName.save')}
              </Button>
            </div>
          )}
        </div>

        {businessName && !showBusinessNameInput && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('settings.senderSettings.businessName.current', { businessName })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SenderSettingsForm;
