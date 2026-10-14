/**
 * Reads the response of POST /callbacks/facebook_pages.
 *
 * The backend renders { data: { page_details, user_access_token } } and extractData() strips the
 * outer `data`, so the caller receives { page_details, user_access_token }. A response that still
 * carries the wrapper is accepted too.
 */
export function parseFacebookPagesResponse(response: any, fallbackToken: string) {
  const payload = response?.page_details !== undefined ? response : response?.data;
  const pageDetails: any[] = payload?.page_details || [];

  return {
    pages: pageDetails.filter((page) => !page.exists),
    userAccessToken: payload?.user_access_token || fallbackToken,
  };
}
