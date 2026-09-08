/**
 * Option lists for the campaign wizard settings, shared by Step4 (pickers) and
 * Step5 (summary) and read by the specs that guard them.
 */

/**
 * `id` is the `Date.getDay()` number the API stores in `recurrence_settings.week_days`;
 * the list starts on Monday because that is the order the picker renders.
 */
export const WEEKDAYS = [
  { id: 1, key: 'mon' },
  { id: 2, key: 'tue' },
  { id: 3, key: 'wed' },
  { id: 4, key: 'thu' },
  { id: 5, key: 'fri' },
  { id: 6, key: 'sat' },
  { id: 0, key: 'sun' },
] as const;

/**
 * `value` is persisted verbatim as `spread_sending_hours`, so it has to state the
 * same number the label does — the "10 Horas" row shipped bound to 9 (CRM-479).
 * 9 stays on the list because campaigns saved by that row still hold it.
 */
export const SPREAD_OPTIONS = [
  { value: '0.166', key: 'min10' },
  { value: '0.5', key: 'min30' },
  { value: '1', key: 'min60' },
  { value: '1.5', key: 'h1m30' },
  { value: '2', key: 'h2' },
  { value: '2.5', key: 'h2m30' },
  { value: '3', key: 'h3' },
  { value: '4', key: 'h4' },
  { value: '5', key: 'h5' },
  { value: '6', key: 'h6' },
  { value: '7', key: 'h7' },
  { value: '8', key: 'h8' },
  { value: '9', key: 'h9' },
  { value: '10', key: 'h10' },
  { value: '11', key: 'h11' },
  { value: '12', key: 'h12' },
  { value: '18', key: 'h18' },
  { value: '24', key: 'h24' },
  { value: '0', key: 'none' },
] as const;
