# Translation audit

Run `npm run i18n:audit` from the repository root. CI runs it before typechecking.
Use `node scripts/i18n-audit.mjs /tmp/i18n-report.json` for a report with source
locations, resolved namespaces, translation calls, and candidate display text.

The audit scans production TypeScript/TSX with the TypeScript parser. It checks
literal translation references against the English and Brazilian Portuguese
catalogs, including plural variants, and resolves finite dynamic keys using the
TypeScript type checker. It also checks translation-key registries and detects
text in JSX, labels, placeholders, display properties, feedback, and Portuguese
literals outside translation calls. Comments, tests, and console diagnostics
are excluded.

When adding UI text, add English and Brazilian Portuguese catalog entries and
use a translator bound to that namespace, or an explicit `namespace:key`.
Use interpolation and plural forms instead of concatenating sentence fragments.
Shared constants and utilities must resolve translations at access/call time;
calling `i18n.t` during module initialization captures the startup language.
Format dates and numbers using the active language through
`src/lib/formattingLocale.ts`.

`i18n-source-exceptions.json` contains reviewed **exact file/string pairs**:
brands, model names, technical tokens, language autonyms, intentionally bilingual
event data, and developer invariants. An exception is not permission to skip
the rest of a file. Add ordinary display text to a catalog instead.

The source scan is a guard, not a proof of every possible runtime value. Dynamic
keys with unbounded string types and API/user-authored content need contextual
review. Translator props with an implicit namespace have their caller context
recorded in the scanner; prefer explicit namespaces for new shared helpers.

Runtime checks in `src/i18n/english-ui.spec.tsx` cover namespace registration,
the conversation status menu (including changing language while it is open),
shared label getters, date formatting, explicit event locales, and plural and
interpolated messages. Catalog parity tests cover keys, empty values, and
interpolation variables. Run them with:

```sh
npx vitest run src/i18n/english-ui.spec.tsx src/i18n/locales
```

The complete catalog audit targets English and Brazilian Portuguese. Other
configured languages continue using the application's existing English fallback
where their catalogs are incomplete.
