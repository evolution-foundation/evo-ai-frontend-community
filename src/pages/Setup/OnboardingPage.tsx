import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { setupService } from '@/services/setup/setupService';
import { surveyService } from '@/services/survey/surveyService';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingFormData {
  teamSize: string;
  dailyVolume: string;
  mainChannel: string;
  mainChannelOther: string;
  usesAI: string;
  biggestPain: string;
  crmExperience: string;
  mainGoal: string;
}

// ─── SelectField ─────────────────────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function SelectField({ label, id, value, options, onChange }: SelectFieldProps) {
  return (
    <div style={{ marginBottom: '1.1rem' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#fafafa',
          marginBottom: '6px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '40px',
            background: '#09090b',
            border: value ? '0.5px solid #3f3f46' : '0.5px solid #27272a',
            borderRadius: '8px',
            color: value ? '#fafafa' : '#a1a1aa',
            fontSize: '14px',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            padding: '0 36px 0 12px',
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: 'pointer',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00ffa7';
            e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 167, 0.35)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = value ? '#3f3f46' : '#27272a';
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="" style={{ background: '#18181b', color: '#52525b' }}>
            Selecionar...
          </option>
          {options.map((opt) => (
            <option key={opt} value={opt} style={{ background: '#18181b', color: '#fafafa' }}>
              {opt}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '11px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#52525b',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage('onboarding');
  const { isAuthenticated, refreshUser } = useAuth();

  const [form, setForm] = useState<OnboardingFormData>({
    teamSize: '',
    dailyVolume: '',
    mainChannel: '',
    mainChannelOther: '',
    usesAI: '',
    biggestPain: '',
    crmExperience: '',
    mainGoal: '',
  });
  const [loading, setLoading] = useState(false);

  // Guard: if not coming from bootstrap (no survey_token) and not authenticated, redirect to /setup
  useEffect(() => {
    const hasSurveyToken = !!sessionStorage.getItem('survey_token');
    if (!hasSurveyToken && !isAuthenticated) {
      navigate('/setup', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const set = (key: keyof OnboardingFormData) => (value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainChannel' && value !== t('survey.channel.other')) {
        next.mainChannelOther = '';
      }
      return next;
    });
  };

  const isChannelValid =
    form.mainChannel !== '' &&
    (form.mainChannel !== t('survey.channel.other') || form.mainChannelOther.trim().length > 0);

  const filledCount = [
    form.teamSize,
    form.dailyVolume,
    isChannelValid ? 'ok' : '',
    form.usesAI,
    form.biggestPain,
    form.crmExperience,
    form.mainGoal,
  ].filter(Boolean).length;

  const progressPct = Math.round((filledCount / 7) * 100);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const surveyToken = sessionStorage.getItem('survey_token');

      if (surveyToken) {
        // Pre-login path: use the one-time survey_token from bootstrap
        await setupService.saveSurvey(form, surveyToken);
        sessionStorage.removeItem('survey_token');
        navigate('/login', { replace: true });
      } else {
        // Post-login path: refresh user so RouterGuard sees setup_survey_completed: true
        await surveyService.saveSurvey(form);
        await refreshUser();
        navigate('/conversations', { replace: true });
      }
    } catch {
      // On error (e.g. expired token), still navigate to login
      sessionStorage.removeItem('survey_token');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const teamSizeOptions = t('survey.teamSize.options', { returnObjects: true }) as unknown as string[];
  const dailyVolumeOptions = t('survey.dailyVolume.options', { returnObjects: true }) as unknown as string[];
  const channelOptions = t('survey.channel.options', { returnObjects: true }) as unknown as string[];
  const aiOptions = t('survey.ai.options', { returnObjects: true }) as unknown as string[];
  const painOptions = t('survey.pain.options', { returnObjects: true }) as unknown as string[];
  const crmOptions = t('survey.crm.options', { returnObjects: true }) as unknown as string[];
  const goalOptions = t('survey.goal.options', { returnObjects: true }) as unknown as string[];

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .evo-other-input {
          margin-top: 8px;
          animation: expandIn 0.2s ease-out;
        }
        .evo-other-input input {
          width: 100%;
          height: 40px;
          background: #09090b;
          border: 0.5px solid #00ffa7;
          box-shadow: 0 0 0 2px rgba(0, 255, 167, 0.35);
          border-radius: 8px;
          color: #fafafa;
          font-size: 14px;
          font-family: ui-sans-serif, system-ui, sans-serif;
          padding: 0 12px;
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }
        .evo-other-input input::placeholder { color: #52525b; }
        .evo-submit-btn {
          width: 100%;
          height: 40px;
          background: #00ffa7;
          color: #000;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          font-family: ui-sans-serif, system-ui, sans-serif;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.1s ease;
        }
        .evo-submit-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .evo-submit-btn:not(:disabled):hover { opacity: 0.88; }
        .evo-submit-btn:not(:disabled):active { transform: scale(0.98); }
        .evo-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 1.5rem;
        }
        @media (max-width: 600px) {
          .evo-fields-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            background: '#111113',
            border: '0.5px solid #27272a',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '820px',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.75rem' }}>
            <AppLogo alt="Zapflow CRM" style={{ height: '30px' }} forceTheme="dark" />
          </div>

          {/* Title */}
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#fafafa', marginBottom: '6px' }}>
            {t('survey.title')}
          </div>
          <div style={{ fontSize: '13px', color: '#a1a1aa', lineHeight: '1.55', marginBottom: '1.75rem' }}>
            {t('survey.subtitle')}
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <div
              style={{
                flex: 1,
                height: '3px',
                background: '#27272a',
                borderRadius: '99px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '3px',
                  background: '#00ffa7',
                  borderRadius: '99px',
                  width: `${progressPct}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '11px', color: '#52525b', whiteSpace: 'nowrap' }}>
              {filledCount} {t('survey.progress.of')} 6
            </span>
          </div>

          {/* Fields — 2 columns */}
          <div className="evo-fields-grid">
            {/* Left column */}
            <div>
              <SelectField
                label={t('survey.teamSize.label')}
                id="teamSize"
                value={form.teamSize}
                options={Array.isArray(teamSizeOptions) ? teamSizeOptions : []}
                onChange={set('teamSize')}
              />

              <SelectField
                label={t('survey.dailyVolume.label')}
                id="dailyVolume"
                value={form.dailyVolume}
                options={Array.isArray(dailyVolumeOptions) ? dailyVolumeOptions : []}
                onChange={set('dailyVolume')}
              />

              {/* Channel — with "Other" free text */}
              <div style={{ marginBottom: '1.1rem' }}>
                <label
                  htmlFor="mainChannel"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#fafafa',
                    marginBottom: '6px',
                  }}
                >
                  {t('survey.channel.label')}
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    id="mainChannel"
                    value={form.mainChannel}
                    onChange={(e) => set('mainChannel')(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      background: '#09090b',
                      border: form.mainChannel ? '0.5px solid #3f3f46' : '0.5px solid #27272a',
                      borderRadius: '8px',
                      color: form.mainChannel ? '#fafafa' : '#a1a1aa',
                      fontSize: '14px',
                      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                      padding: '0 36px 0 12px',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00ffa7';
                      e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 167, 0.35)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = form.mainChannel ? '#3f3f46' : '#27272a';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" style={{ background: '#18181b', color: '#52525b' }}>
                      {t('survey.placeholder')}
                    </option>
                    {Array.isArray(channelOptions) && channelOptions.map((opt) => (
                      <option key={opt} value={opt} style={{ background: '#18181b', color: '#fafafa' }}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <span
                    style={{
                      position: 'absolute',
                      right: '11px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: '#52525b',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>

                {form.mainChannel === t('survey.channel.other') && (
                  <div className="evo-other-input">
                    <input
                      type="text"
                      placeholder={t('survey.channel.otherPlaceholder')}
                      value={form.mainChannelOther}
                      onChange={(e) => set('mainChannelOther')(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div>
              <SelectField
                label={t('survey.ai.label')}
                id="usesAI"
                value={form.usesAI}
                options={Array.isArray(aiOptions) ? aiOptions : []}
                onChange={set('usesAI')}
              />

              <SelectField
                label={t('survey.pain.label')}
                id="biggestPain"
                value={form.biggestPain}
                options={Array.isArray(painOptions) ? painOptions : []}
                onChange={set('biggestPain')}
              />

              <SelectField
                label={t('survey.crm.label')}
                id="crmExperience"
                value={form.crmExperience}
                options={Array.isArray(crmOptions) ? crmOptions : []}
                onChange={set('crmExperience')}
              />

              <SelectField
                label={t('survey.goal.label')}
                id="mainGoal"
                value={form.mainGoal}
                options={Array.isArray(goalOptions) ? goalOptions : []}
                onChange={set('mainGoal')}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '0.5px solid #27272a', margin: '1.5rem 0 1.25rem' }} />

          {/* Submit */}
          <button
            className="evo-submit-btn"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? t('survey.submit.loading') : t('survey.submit.idle')}
          </button>

          <div style={{ textAlign: 'center', fontSize: '11px', color: '#52525b', marginTop: '1rem' }}>
            {t('survey.footer')}
          </div>
        </div>
      </div>
    </>
  );
}
