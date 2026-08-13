import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VariableMapping, type DataMapping } from './VariableMapping';
import i18n from '@/i18n/config';

vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({
    variables: [],
    loading: false,
    error: null,
    fetchVariables: vi.fn(),
    updateVariables: vi.fn(),
    addVariable: vi.fn(),
    updateVariable: vi.fn(),
    deleteVariable: vi.fn(),
  }),
}));

const j = (key: string) => i18n.t(`journey:${key}`);

const mappings: DataMapping[] = [
  { id: 'm1', sourcePath: 'webhook.body.contact_id', variableName: 'contactId', transform: 'none' },
  { id: 'm2', sourcePath: 'webhook.body.timestamp', variableName: 'seenAt', transform: 'date' },
];

// CRM-141: as linhas de mapeamento repetem os mesmos rótulos, então o
// pareamento precisa ser por linha — id fixo colidiria e o label apontaria
// sempre para a primeira. getAllByLabelText prova que cada linha tem o seu.
describe('VariableMapping — Label pareado por linha', () => {
  it('gives every row its own label/control pair', () => {
    render(
      <VariableMapping
        mappings={mappings}
        onMappingsChange={vi.fn()}
        paths={['webhook.body.contact_id', 'webhook.body.timestamp']}
        journeyId="journey-1"
      />,
    );

    const sources = screen.getAllByLabelText(j('environmentManager.form.fields.description.label'));
    const variables = screen.getAllByLabelText(j('environmentManager.form.fields.name.label'));
    const transforms = screen.getAllByLabelText(j('environmentManager.form.fields.type.label'));

    expect(sources).toHaveLength(2);
    expect(variables).toHaveLength(2);
    expect(transforms).toHaveLength(2);

    // Os ids carregam o id do mapping — é o que impede uma linha de roubar o
    // rótulo da outra.
    expect(sources.map(el => el.id)).toEqual([
      'variable-mapping-source-m1',
      'variable-mapping-source-m2',
    ]);
    expect(transforms.map(el => el.id)).toEqual([
      'variable-mapping-transform-m1',
      'variable-mapping-transform-m2',
    ]);
  });
});
