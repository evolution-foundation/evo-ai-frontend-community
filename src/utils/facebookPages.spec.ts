import { describe, expect, it } from 'vitest';
import { parseFacebookPagesResponse } from './facebookPages';

const page = (id: string, exists = false) => ({ id, name: `Page ${id}`, access_token: `t${id}`, exists });

// The backend renders { data: { page_details, user_access_token } } and extractData() strips the
// outer data, so the form receives { page_details, user_access_token }. It used to read
// fbPages.data.page_details, one level too deep, and always showed "no page available".
describe('parseFacebookPagesResponse', () => {
  it('reads the shape the form really receives after extractData', () => {
    const result = parseFacebookPagesResponse(
      { page_details: [page('1'), page('2')], user_access_token: 'long' },
      'short',
    );

    expect(result.pages.map((p: any) => p.id)).toEqual(['1', '2']);
    expect(result.userAccessToken).toBe('long');
  });

  it('still reads a response that keeps the outer data wrapper', () => {
    const result = parseFacebookPagesResponse(
      { data: { page_details: [page('1')], user_access_token: 'long' } },
      'short',
    );

    expect(result.pages).toHaveLength(1);
    expect(result.userAccessToken).toBe('long');
  });

  it('hides pages that are already connected', () => {
    const result = parseFacebookPagesResponse(
      { page_details: [page('1', true), page('2')], user_access_token: 'long' },
      'short',
    );

    expect(result.pages.map((p: any) => p.id)).toEqual(['2']);
  });

  it('returns no pages and the fallback token for an empty or missing response', () => {
    expect(parseFacebookPagesResponse(undefined, 'short')).toEqual({ pages: [], userAccessToken: 'short' });
    expect(parseFacebookPagesResponse({}, 'short')).toEqual({ pages: [], userAccessToken: 'short' });
  });
});
