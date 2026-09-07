// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import en from './en/customerDashboard.json';

describe('customer dashboard English translations', () => {
  it('resolves every literal dashboard key without Portuguese fallbacks', async () => {
    const i18n = createInstance();
    await i18n.init({ lng: 'en', fallbackLng: false, resources: { en: { translation: en } } });
    const directory = path.resolve(__dirname, '../../pages/Customer/Dashboard/components');
    const keys = new Set<string>();
    for (const filename of readdirSync(directory).filter(name => name.endsWith('.tsx'))) {
      const source = readFileSync(path.join(directory, filename), 'utf8');
      for (const match of source.matchAll(/\b(?:t|tx)\(\s*['"](dashboard\.[^'"]+)['"]/g)) {
        keys.add(match[1]);
      }
    }
    expect(keys.size).toBeGreaterThan(20);
    const missing = [...keys].filter(key => !i18n.exists(key));
    expect(missing).toEqual([]);
    expect(i18n.t('dashboard.agents.aiTitle')).toBe('AI Agent Performance');
    expect(i18n.t('dashboard.charts.emptyState')).toBe('No data in the selected period');
  });
});
