# Deprecated Playwright Folder

`tests/` is deprecated for Playwright E2E coverage.

Active E2E suite is now under `e2e/` and is the only one used by npm scripts:

- `npm run test:e2e:local`
- `npm run test:e2e:prod-smoke`

Keep legacy files here only for reference until full cleanup.
