/**
 * Minimal RFC 4180 CSV parser used by the bulk product import (EVO-1734).
 *
 * Why not pull in a dep: we only need a single quoted-field aware tokenizer
 * with mixed-line-ending tolerance and BOM stripping. Streaming/large files
 * are explicitly out of scope (the importer caps input at 500 rows, see
 * MAX_ITEMS in app/services/products/bulk_importer.rb on the Rails side).
 *
 * Behaviour:
 *  - Strips a leading UTF-8 BOM (Excel exports include it).
 *  - Accepts \n, \r\n and \r line endings inside the same file.
 *  - Treats `""` inside a quoted field as a literal `"`.
 *  - Returns the header row separately from data rows; both are string[].
 *  - Skips fully-blank lines (no fields, no commas) so a trailing newline
 *    does not produce a phantom row.
 */

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  /** 1-based line number in the original source for each emitted row. */
  rowLines: number[];
}

/** Stable codes used as i18n keys; the human string is just a debug aid. */
export type CsvParseErrorCode =
  | 'invalid_delimiter'
  | 'unexpected_quote'
  | 'unterminated_quoted_field';

export class CsvParseError extends Error {
  readonly line: number;
  readonly code: CsvParseErrorCode;
  constructor(code: CsvParseErrorCode, line: number) {
    super(code);
    this.name = 'CsvParseError';
    this.code = code;
    this.line = line;
  }
}

/**
 * Return duplicated header names. Used by callers that need to reject CSVs
 * where the same column name appears twice — `mapping` is keyed by header
 * string, so duplicates would silently overwrite each other.
 */
export function findDuplicateHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  headers.forEach((h) => counts.set(h, (counts.get(h) ?? 0) + 1));
  return [...counts.entries()].filter(([, n]) => n > 1).map(([h]) => h);
}

export function parseCsv(input: string, delimiter = ','): ParsedCsv {
  if (delimiter.length !== 1) {
    throw new CsvParseError('invalid_delimiter', 0);
  }
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const records: string[][] = [];
  const recordLines: number[] = [];

  let field = '';
  let record: string[] = [];
  let recordStartLine = 1;
  let line = 1;
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    record.push(field);
    field = '';
  };

  const pushRecord = () => {
    pushField();
    const isBlank = record.length === 1 && record[0] === '';
    if (!isBlank) {
      records.push(record);
      recordLines.push(recordStartLine);
    }
    record = [];
    recordStartLine = line;
  };

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === '\n') line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      if (field.length > 0) {
        throw new CsvParseError('unexpected_quote', line);
      }
      inQuotes = true;
      i += 1;
      continue;
    }

    if (ch === delimiter) {
      pushField();
      i += 1;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      pushRecord();
      // Swallow CRLF as a single line terminator.
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      line += 1;
      recordStartLine = line;
      i += 1;
      continue;
    }

    field += ch;
    i += 1;
  }

  if (inQuotes) {
    throw new CsvParseError('unterminated_quoted_field', recordStartLine);
  }

  // Flush trailing field/record if the file did not end with a newline.
  if (field.length > 0 || record.length > 0) {
    pushRecord();
  }

  if (records.length === 0) {
    return { headers: [], rows: [], rowLines: [] };
  }

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);
  const rowLines = recordLines.slice(1);

  return { headers, rows, rowLines };
}
