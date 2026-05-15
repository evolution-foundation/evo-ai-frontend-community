import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Avatar,
  AvatarFallback,
  Separator,
  Switch,
} from '@evoapi/design-system';
import {
  User,
  MapPin,
  Globe,
  Upload,
  X,
  Tag,
  Settings,
  Shield,
  ShieldX,
  Building2,
  Briefcase,
  Users,
} from 'lucide-react';
import { Contact, ContactFormData } from '@/types/contacts';
import ContactLabels from './ContactLabels';
import CustomAttributes from './CustomAttributes';
import CompanyMultiSelect from './CompanyMultiSelect';
import { labelsService } from '@/services/contacts';
import { Label as LabelType } from '@/types/settings';

import { PhoneInput } from '@/components/shared/PhoneInput';
import { TaxIdInput } from '@/components/shared/TaxIdInput';
import { validateTaxId, getTaxIdLabel } from '@/utils/validation';
import '@/components/shared/PhoneInput.css';
import { parsePhoneNumber, type Country } from 'react-phone-number-input';

interface ContactFormProps {
  contact?: Contact;
  isNew?: boolean;
  loading?: boolean;
  onSubmit: (data: ContactFormData) => void;
  onCancel?: () => void;
}

interface FormData {
  type: 'person' | 'company' | 'group';
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  blocked: boolean;
  tax_id: string;
  website: string;
  industry: string;
  additional_attributes: {
    description: string;
    company_name: string;
    city: string;
    country: string;
    country_code: string;
    social_profiles: {
      linkedin: string;
      facebook: string;
      instagram: string;
      twitter: string;
      github: string;
    };
  };
  labels: string[];
  custom_attributes: Record<string, unknown>;
  company_ids: string[];
  avatar?: File;
  removeAvatar?: boolean;
}

const initialFormData: FormData = {
  type: 'person',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  blocked: false,
  tax_id: '',
  website: '',
  industry: '',
  additional_attributes: {
    description: '',
    company_name: '',
    city: '',
    country: '',
    country_code: '',
    social_profiles: {
      linkedin: '',
      facebook: '',
      instagram: '',
      twitter: '',
      github: '',
    },
  },
  labels: [],
  custom_attributes: {},
  company_ids: [],
};

// countryOptions moved inside component to access t()

export default function ContactForm({
  contact,
  isNew = false,
  loading = false,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const { t } = useLanguage('contacts');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>([]);
  const [phoneCountry, setPhoneCountry] = useState<Country>('BR'); // Track phone country
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});

  const countryOptions = [
    { value: 'BR', label: t('form.countries.BR'), name: 'Brazil' },
    { value: 'US', label: t('form.countries.US'), name: 'United States' },
    { value: 'CA', label: t('form.countries.CA'), name: 'Canada' },
    { value: 'AR', label: t('form.countries.AR'), name: 'Argentina' },
    { value: 'MX', label: t('form.countries.MX'), name: 'Mexico' },
  ];

  // Load available labels
  useEffect(() => {
    const loadLabels = async () => {
      try {
        const response = await labelsService.getLabels();
        setAvailableLabels(response.data || []);
      } catch (error) {
        console.error('Error loading labels:', error);
      }
    };

    loadLabels();
  }, []);

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact && !isNew) {
      const nameParts = (contact.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        type: contact.type || 'person',
        firstName,
        lastName,
        email: contact.email || '',
        phoneNumber: contact.phone_number || '',
        blocked: contact.blocked || false,
        tax_id: contact.tax_id || '',
        website: contact.website || '',
        industry: contact.industry || '',
        additional_attributes: {
          description: contact.additional_attributes?.description || '',
          company_name: contact.additional_attributes?.company_name || '',
          city: contact.additional_attributes?.city || '',
          country: contact.additional_attributes?.location?.country || '',
          country_code: contact.additional_attributes?.location?.country_code || '',
          social_profiles: {
            linkedin: contact.additional_attributes?.social_profiles?.linkedin || '',
            facebook: contact.additional_attributes?.social_profiles?.facebook || '',
            instagram: contact.additional_attributes?.social_profiles?.instagram || '',
            twitter: contact.additional_attributes?.social_profiles?.twitter || '',
            github: contact.additional_attributes?.social_profiles?.github || '',
          },
        },
        labels: contact.labels || [],
        custom_attributes: {},
        company_ids: contact.companies?.map(c => c.id) || [],
      });

      setCustomAttributes(contact.custom_attributes || {});

      // Set avatar preview if exists
      if (contact.avatar_url) {
        setAvatarPreview(contact.avatar_url);
      }
    } else {
      setFormData(initialFormData);
      setCustomAttributes({});
      setAvatarPreview(null);
    }
  }, [contact, isNew]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      } else if (keys.length === 2) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof FormData] as Record<string, unknown>),
            [keys[1]]: value,
          },
        };
      } else if (keys.length === 3) {
        return {
          ...prev,
          [keys[0]]: {
            ...(prev[keys[0] as keyof FormData] as Record<string, unknown>),
            [keys[1]]: {
              ...(((prev[keys[0] as keyof FormData] as Record<string, unknown>)?.[
                keys[1]
              ] as Record<string, unknown>) || {}),
              [keys[2]]: value,
            },
          },
        };
      }
      return prev;
    });

    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, avatar: t('form.avatar.errors.invalidType') }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        setErrors(prev => ({ ...prev, avatar: t('form.avatar.errors.tooLarge') }));
        return;
      }

      setFormData(prev => ({ ...prev, avatar: file }));

      // Create preview
      const reader = new FileReader();
      reader.onload = e => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Clear error
      if (errors.avatar) {
        setErrors(prev => ({ ...prev, avatar: '' }));
      }
    }
  };

  const removeAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: undefined, removeAvatar: true }));
    setAvatarPreview(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('form.validation.firstNameRequired');
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('form.validation.emailInvalid');
    }

    // Phone validation - must be E.164 format
    if (formData.phoneNumber) {
      if (!formData.phoneNumber.startsWith('+')) {
        newErrors.phoneNumber = t('form.validation.phoneInvalid');
      } else if (!/^\+[1-9]\d{1,14}$/.test(formData.phoneNumber)) {
        newErrors.phoneNumber = t('form.validation.phoneInvalid');
      }
    }

    // Tax ID validation based on country
    if (formData.tax_id) {
      if (!validateTaxId(formData.tax_id, phoneCountry, taxIdType)) {
        const taxIdLabel = getTaxIdLabel(phoneCountry, taxIdType);
        newErrors.tax_id = t('form.validation.taxIdInvalid', { type: taxIdLabel });
      }
    }

    // Validação específica para empresa
    if (formData.type === 'company') {
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = t('form.validation.websiteInvalid');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData: ContactFormData = {
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
      type: formData.type,
      email: formData.email.trim() || undefined,
      phone_number: formData.phoneNumber.trim() || undefined,
      blocked: formData.blocked,
      tax_id: formData.tax_id?.trim() || undefined,
      website: formData.website?.trim() || undefined,
      industry: formData.industry?.trim() || undefined,
      additional_attributes: {
        ...formData.additional_attributes,
        location: {
          city: formData.additional_attributes.city,
          country: formData.additional_attributes.country,
          country_code: formData.additional_attributes.country_code,
        },
      },
      labels: formData.labels,
      custom_attributes: customAttributes,
      company_ids: formData.company_ids,
      avatar: formData.avatar,
    };

    onSubmit(submitData);
  };

  const getUserInitials = () => {
    const firstName = formData.firstName || '';
    const lastName = formData.lastName || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'NA';
  };

  const isCompany = formData.type === 'company';
  const isPerson = formData.type === 'person';
  const taxIdType: 'person' | 'company' = formData.type === 'company' ? 'company' : 'person';

  // Detect country from phone number
  const handlePhoneChange = (value: string) => {
    handleInputChange('phoneNumber', value);

    // Try to extract country from phone number
    try {
      if (value && value.startsWith('+')) {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber?.country) {
          setPhoneCountry(phoneNumber.country);
        }
      }
    } catch {
      // Keep current country if parsing fails
    }
  };

  // Get Tax ID label based on detected country
  const taxIdLabel = getTaxIdLabel(phoneCountry, taxIdType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Type - Selector for new, Badge for edit */}
      {isNew ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactType">
              {t('form.fields.type.label')} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'person' | 'company' | 'group') =>
                setFormData(prev => ({ ...prev, type: value }))
              }
              disabled={loading}
            >
              <SelectTrigger id="contactType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{t('form.fields.type.person')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('form.fields.type.personDescription')}
                      </div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="company">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{t('form.fields.type.company')}</div>
                      <div className="text-xs text-muted-foreground">
                        {t('form.fields.type.companyDescription')}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center gap-2">
            {formData.type === 'company' ? (
              <Building2 className="h-4 w-4 text-primary" />
            ) : formData.type === 'group' ? (
              <Users className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-primary" />
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('form.fields.type.label')}:
              </span>
              <span className="text-sm font-semibold">
                {formData.type === 'company'
                  ? t('form.fields.type.company')
                  : formData.type === 'group'
                  ? t('type.group')
                  : t('form.fields.type.person')}
              </span>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {getUserInitials()}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('avatar-upload')?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {avatarPreview ? t('form.avatar.change') : t('form.avatar.upload')}
          </Button>

          {avatarPreview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeAvatar}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      {errors.avatar && <p className="text-sm text-destructive">{errors.avatar}</p>}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {isCompany ? <Building2 className="h-5 w-5" /> : <User className="h-5 w-5" />}
          {t('form.sections.basicInfo')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nome - Labels diferentes conforme tipo */}
          <div className="space-y-2">
            <Label htmlFor="firstName">
              {isCompany ? t('form.fields.companyName.label') : t('form.fields.firstName.label')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={e => handleInputChange('firstName', e.target.value)}
              placeholder={
                isCompany
                  ? t('form.fields.companyName.placeholder')
                  : t('form.fields.firstName.placeholder')
              }
              disabled={loading}
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
          </div>

          {/* Sobrenome - Somente para pessoa */}
          {isPerson && (
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('form.fields.lastName.label')}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={e => handleInputChange('lastName', e.target.value)}
                placeholder={t('form.fields.lastName.placeholder')}
                disabled={loading}
              />
            </div>
          )}

          {/* Tax ID - International (adapts to phone country) */}
          <div className="space-y-2">
            <Label htmlFor="tax_id">{taxIdLabel}</Label>
            <TaxIdInput
              id="tax_id"
              type={taxIdType}
              country={phoneCountry}
              value={formData.tax_id}
              onChange={value => handleInputChange('tax_id', value)}
              disabled={loading}
              error={!!errors.tax_id}
            />
            {errors.tax_id && <p className="text-sm text-destructive">{errors.tax_id}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('form.fields.email.label')}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              placeholder={t('form.fields.email.placeholder')}
              disabled={loading}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">{t('form.fields.phone.label')}</Label>
            <PhoneInput
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              placeholder={t('form.fields.phone.placeholder')}
              disabled={loading}
              error={!!errors.phoneNumber}
              defaultCountry={phoneCountry}
            />
            {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
          </div>
        </div>
      </div>

      <Separator />

      {/* Block Contact Section - Only show for existing contacts */}
      {!isNew && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {formData.blocked ? (
                <ShieldX className="h-5 w-5 text-destructive" />
              ) : (
                <Shield className="h-5 w-5 text-green-600" />
              )}
              {t('form.sections.contactStatus')}
            </h3>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="blocked" className="font-medium">
                    {formData.blocked
                      ? t('form.fields.blocked.label.blocked')
                      : t('form.fields.blocked.label.active')}
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formData.blocked
                    ? t('form.fields.blocked.description.blocked')
                    : t('form.fields.blocked.description.active')}
                </p>
              </div>

              <Switch
                id="blocked"
                checked={formData.blocked}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, blocked: checked }))}
                disabled={loading}
              />
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Campos específicos por tipo */}
      {isCompany && (
        <>
          {/* Informações da Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              {t('form.sections.companyInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">{t('form.fields.website.label')}</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={e => handleInputChange('website', e.target.value)}
                  placeholder={t('form.fields.website.placeholder')}
                  disabled={loading}
                  className={errors.website ? 'border-destructive' : ''}
                />
                {errors.website && <p className="text-sm text-destructive">{errors.website}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">{t('form.fields.industry.label')}</Label>
                <Select
                  value={formData.industry}
                  onValueChange={value => handleInputChange('industry', value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.fields.industry.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">
                      {t('form.fields.industry.options.technology')}
                    </SelectItem>
                    <SelectItem value="retail">
                      {t('form.fields.industry.options.retail')}
                    </SelectItem>
                    <SelectItem value="health">
                      {t('form.fields.industry.options.health')}
                    </SelectItem>
                    <SelectItem value="education">
                      {t('form.fields.industry.options.education')}
                    </SelectItem>
                    <SelectItem value="finance">
                      {t('form.fields.industry.options.finance')}
                    </SelectItem>
                    <SelectItem value="other">{t('form.fields.industry.options.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Company Association - Only for persons */}
      {isPerson && (
        <>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('form.sections.company')}
            </h3>

            <CompanyMultiSelect
              selectedCompanyIds={formData.company_ids}
              onChange={ids => setFormData(prev => ({ ...prev, company_ids: ids }))}
              disabled={loading}
            />
          </div>

          <Separator />
        </>
      )}

      {/* Location */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {t('form.sections.location')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">{t('form.fields.city.label')}</Label>
            <Input
              id="city"
              value={formData.additional_attributes.city}
              onChange={e => handleInputChange('additional_attributes.city', e.target.value)}
              placeholder={t('form.fields.city.placeholder')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">{t('form.fields.country.label')}</Label>
            <Select
              value={formData.additional_attributes.country}
              onValueChange={value => handleInputChange('additional_attributes.country', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.fields.country.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Description */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="description">{t('form.fields.description.label')}</Label>
          <Textarea
            id="description"
            value={formData.additional_attributes.description}
            onChange={e => handleInputChange('additional_attributes.description', e.target.value)}
            placeholder={t('form.fields.description.placeholder')}
            disabled={loading}
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Social Profiles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t('form.sections.socialProfiles')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">{t('form.fields.social.linkedin.label')}</Label>
            <Input
              id="linkedin"
              value={formData.additional_attributes.social_profiles.linkedin}
              onChange={e =>
                handleInputChange('additional_attributes.social_profiles.linkedin', e.target.value)
              }
              placeholder={t('form.fields.social.linkedin.placeholder')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="facebook">{t('form.fields.social.facebook.label')}</Label>
            <Input
              id="facebook"
              value={formData.additional_attributes.social_profiles.facebook}
              onChange={e =>
                handleInputChange('additional_attributes.social_profiles.facebook', e.target.value)
              }
              placeholder={t('form.fields.social.facebook.placeholder')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram">{t('form.fields.social.instagram.label')}</Label>
            <Input
              id="instagram"
              value={formData.additional_attributes.social_profiles.instagram}
              onChange={e =>
                handleInputChange('additional_attributes.social_profiles.instagram', e.target.value)
              }
              placeholder={t('form.fields.social.instagram.placeholder')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">{t('form.fields.social.twitter.label')}</Label>
            <Input
              id="twitter"
              value={formData.additional_attributes.social_profiles.twitter}
              onChange={e =>
                handleInputChange('additional_attributes.social_profiles.twitter', e.target.value)
              }
              placeholder={t('form.fields.social.twitter.placeholder')}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github">{t('form.fields.social.github.label')}</Label>
            <Input
              id="github"
              value={formData.additional_attributes.social_profiles.github}
              onChange={e =>
                handleInputChange('additional_attributes.social_profiles.github', e.target.value)
              }
              placeholder={t('form.fields.social.github.placeholder')}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Labels */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {t('form.sections.labels')}
        </h3>
        <ContactLabels
          contactId={contact?.id}
          labels={formData.labels}
          onLabelsChange={labels => setFormData(prev => ({ ...prev, labels }))}
          availableLabels={availableLabels}
          disabled={loading}
        />
      </div>

      <Separator />

      {/* Custom Attributes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('form.sections.customAttributes')}
        </h3>
        <CustomAttributes
          attributes={customAttributes}
          onAttributesChange={setCustomAttributes}
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {t('form.actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/85 text-primary-foreground border-0 font-semibold flex-1">
          {loading
            ? t('form.actions.saving')
            : isNew
            ? t('form.actions.create')
            : t('form.actions.save')}
        </Button>
      </div>
    </form>
  );
}
