import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/i18n/config';
import SurveyResponse from './SurveyResponse';
import type { SurveyDetails } from '@/types/core/survey';

// CRM-606: the public CSAT page is reached from the survey e-mail with NO session
// and NO layout, so it is the only screen whose copy depends on the `survey`
// namespace being registered in i18n/config.ts. It was not, and the contact saw
// the raw keys. These tests run the REAL i18n config on purpose — mocking
// useTranslation here would assert nothing about the wiring that was broken.

const getSurveyDetails = vi.fn();
const updateSurvey = vi.fn();

vi.mock('@/services/public/surveyService', () => ({
  surveyService: {
    getSurveyDetails: (...args: unknown[]) => getSurveyDetails(...args),
    updateSurvey: (...args: unknown[]) => updateSurvey(...args),
  },
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ uuid: '3f1b6a0e-6f2a-4f4d-9a1e-0a7c3b2d5e81' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const surveyDetails = (overrides: Partial<SurveyDetails> = {}): SurveyDetails => ({
  inbox_name: 'Suporte',
  inbox_avatar_url: '',
  csat_survey_response: null,
  display_type: 'emoji',
  ...overrides,
});

describe('Public CSAT survey page (CRM-606)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    updateSurvey.mockResolvedValue(undefined);
    await i18n.changeLanguage('pt-BR');
  });

  it('renders the rating copy translated instead of the raw i18n keys', async () => {
    getSurveyDetails.mockResolvedValue(surveyDetails());

    render(<SurveyResponse />);

    expect(await screen.findByText('Sua nota')).toBeInTheDocument();
    expect(screen.queryByText('survey.rating.label')).not.toBeInTheDocument();
  });

  it('renders the emoji labels translated, not resolved a second time', async () => {
    getSurveyDetails.mockResolvedValue(surveyDetails());

    render(<SurveyResponse />);

    await screen.findByText('Sua nota');
    expect(screen.getByTitle('Muito insatisfeito')).toBeInTheDocument();
    expect(screen.getByTitle('Muito satisfeito')).toBeInTheDocument();
  });

  it('falls back to the translated prompt when the backend sends no content', async () => {
    getSurveyDetails.mockResolvedValue(surveyDetails());

    render(<SurveyResponse />);

    expect(
      await screen.findByText('Como você avalia o atendimento que recebeu de Suporte?'),
    ).toBeInTheDocument();
  });

  it('submits the chosen rating for the conversation in the link', async () => {
    getSurveyDetails.mockResolvedValue(surveyDetails());

    render(<SurveyResponse />);
    await screen.findByText('Sua nota');
    await userEvent.click(screen.getByTitle('Muito satisfeito'));

    await waitFor(() =>
      expect(updateSurvey).toHaveBeenCalledWith('3f1b6a0e-6f2a-4f4d-9a1e-0a7c3b2d5e81', 5, ''),
    );
  });

  // A null response is what tells the page the survey is still open; an object
  // carrying `rating: null` would read as answered and hide the widget.
  it('keeps the rating widget open while csat_survey_response is null', async () => {
    getSurveyDetails.mockResolvedValue(surveyDetails());

    render(<SurveyResponse />);

    expect(await screen.findByText('Sua nota')).toBeInTheDocument();
  });

  it('shows the translated thank-you once a rating is already stored', async () => {
    getSurveyDetails.mockResolvedValue(
      surveyDetails({ csat_survey_response: { rating: 4, feedback_message: '' } }),
    );

    render(<SurveyResponse />);

    expect(
      await screen.findByText('Obrigado pela sua nota! Ela nos ajuda a melhorar.'),
    ).toBeInTheDocument();
  });

  it('translates the failure message when the survey cannot be loaded', async () => {
    getSurveyDetails.mockRejectedValue(new Error('boom'));

    render(<SurveyResponse />);

    expect(
      await screen.findByText('Não foi possível carregar esta avaliação. O link pode ter expirado.'),
    ).toBeInTheDocument();
  });
});
