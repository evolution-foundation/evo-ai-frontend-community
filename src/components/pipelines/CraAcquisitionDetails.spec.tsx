import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CraAcquisitionDetails from './CraAcquisitionDetails';
import { craFieldText, safeAdUrl } from './craAcquisition';

describe('CRA acquisition', () => {
  it('labels sources, falls back to IDs and keeps unknown placement unknown', () => {
    expect(craFieldText({ cra_source: 'ctwa' }, 'cra_source')).toBe('Anúncio WhatsApp');
    expect(craFieldText({ cra_campaign_id: '123' }, 'cra_campaign_name')).toBe('123');
    expect(craFieldText({}, 'cra_placement')).toBe('Não informado');
  });
  it('allows only Meta https links without credentials or deceptive host suffixes', () => {
    expect(safeAdUrl('https://www.facebook.com/ads/123')).not.toBeNull();
    ['javascript:alert(1)', 'https://facebook.com.evil.test/', 'https://user@facebook.com/', 'http://fb.me/a', 'https://fb.me:444/a'].forEach(url => expect(safeAdUrl(url)).toBeNull());
  });
  it('renders structured attribution as text and never includes technical secrets', () => {
    const { container } = render(<CraAcquisitionDetails fields={{ cra_source: 'website', cra_ad_name: '<script>unsafe</script>', cra_ctwa_clid: 'PRIVATE', cra_visitor_id: 'PRIVATE', cra_first_touch: { utm_source: 'MetaAds', fbc: 'PRIVATE' }, cra_consent: { basis: 'explicit', analytics: true, ads: false } }} />);
    expect(screen.getByRole('region', { name: 'Aquisição' })).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).not.toContain('PRIVATE');
    expect(container.textContent).toContain('explicit');
  });
  it('leaves other pipelines unchanged', () => {
    const { container } = render(<CraAcquisitionDetails fields={{ utm_source: 'Other' }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
