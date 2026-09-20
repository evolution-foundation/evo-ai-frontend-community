# Contributing to Evo CRM Frontend

Thanks for your interest in contributing to Evo CRM Frontend! This document
outlines how to contribute effectively.

## Code of Conduct

All contributors are expected to be respectful, inclusive, and professional.
Harassment, discrimination, or abusive behavior will not be tolerated.

## How to Contribute

### Reporting Bugs

1. Check existing [issues](https://github.com/evolution-foundation/evo-ai-frontend-community/issues)
   to avoid duplicates
2. Open a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, version, dependencies)
   - Logs or screenshots when relevant

### Suggesting Features

1. Open an issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternatives you considered
2. Wait for maintainer feedback before starting implementation

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `develop`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes following the project's coding standards
4. Write or update tests for your changes
5. Ensure all tests pass and the code lints clean
6. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add new feature
   fix: resolve bug in X
   docs: update README
   refactor: simplify Y
   test: add coverage for Z
   ```
7. Push to your fork and open a PR against `develop`
8. Fill out the PR template with context, testing notes, and screenshots if
   applicable

## Development Setup

See [README.md](./README.md) for project-specific setup instructions.

## Code Standards

- Follow the existing code style of the project
- Run linters and formatters before committing
- Add tests for new features and bug fixes
- Document public APIs and non-obvious behavior
- Keep commits atomic and focused

### The lint baseline

`eslint-suppressions.json` records the lint debt this repository already
carried when the `ESLint (diff)` gate was introduced — per file, per rule, as a
count. ESLint applies it automatically; you do not pass a flag to opt in.

It exists so the gate fails you for violations **you** wrote, not for whatever
was already in a file you happened to touch. Practically:

- **Touching a file with old errors is fine.** Nothing to do.
- **Adding a violation fails the gate**, as it always has. When the rule already
  has a baseline entry for that file, ESLint reports *every* occurrence in the
  file, not only the new one — yours is the one in your diff.
- **Fixing an old violation** leaves the baseline overstated, and a bare
  `npx eslint` exits 2 ("There are suppressions left that do not occur
  anymore"). Run `npx eslint --prune-suppressions .` and commit the result. CI
  will not block you on this — it prints a reminder — but the baseline only
  shrinks if someone commits the prune, and shrinking it is the point.

`npm run lint` tolerates an overstated baseline (`--pass-on-unpruned-suppressions`)
so that one person's unpruned fix does not break everyone else's local lint;
`npm run lint:fix` prunes as it goes, so the shrink lands in your diff.

Three things that surprise people:

- **Renaming a file loses its entry.** The baseline is keyed by path, so a
  renamed file arrives with its whole backlog looking brand new, and the gate
  fails you for all of it. Re-key it with `npx eslint --suppress-all <new
  path>`, which touches only that file. The re-keyed entry makes the baseline
  *grow* in your diff — that is the rename being recorded at its new path, not
  debt being added, and it is the expected shape of a rename PR.
- **Pruning the whole tree can sweep up more than your PR.** Debt paid in
  earlier PRs where nobody pruned shows up in your diff. That is expected — it
  is catch-up, not a mistake.
- **A deleted file's entry outlives the PR that deleted it.** The gate lints
  added, changed and renamed files, never deletions, so a deletion-only PR
  prunes nothing. ESLint drops entries for files that no longer exist on the
  next prune of any kind, so the *following* PR is the one whose CI reports a
  shrink it did not earn. The notice is misattributed; the baseline is right.

After bumping ESLint or its plugins, regenerate the baseline
(`npx eslint --suppress-all .`): new rules and fixed false positives move the
counts in both directions.

Always scope these commands to `.`, not to `src`. The gate lints every changed
`.ts`/`.tsx` in the repository, which includes `vite.config.ts`, `e2e/` and the
other config files — they are clean today, so a `src`-scoped snapshot happens to
match, but the first violation to land outside `src` would fail PRs over debt
they did not write, which is exactly what this baseline exists to prevent.

## Branch Strategy

- `main` — stable production-ready code
- `develop` — integration branch for upcoming releases
- `feat/*`, `fix/*`, `chore/*` — short-lived branches off `develop`

## Trademark Notice

By contributing, you agree that your contributions will be licensed under the
Apache License 2.0 (see [LICENSE](./LICENSE)). Trademarks and brand assets are
governed separately by [TRADEMARKS.md](./TRADEMARKS.md).

## Questions?

- **Community**: [evolutionfoundation.com.br/community](https://evolutionfoundation.com.br/community)
- **Documentation**: [docs.evolutionfoundation.com.br](https://docs.evolutionfoundation.com.br)
- **Email**: suporte@evofoundation.com.br

Thanks for helping make Evo CRM Frontend better!

---

© 2026 Evolution Foundation
