# E2E Suite

Execution/discovery snapshot is maintained in `../E2E_TEST_SUMMARY.md`.

## Active Configs

- `playwright.local.config.js`
  - local app + emulators
  - deterministic seeded data
  - serialized workers (`workers: 1`)
- `playwright.prod.config.js`
  - deployed URL only
  - smoke tests only (`e2e/smoke.spec.js`)

## Commands

```bash
# Full local deterministic E2E
npm run test:e2e:local

# Admin workflow only (local emulators)
npm run test:e2e:workflow-admin

# Public smoke after deploy
TEST_URL=https://your-url npm run test:e2e:prod-smoke
```

## Local Admin Auth

Local admin tests use the hidden bridge:

- `window.__E2E_AUTH__.loginAdmin()`
- `window.__E2E_AUTH__.logout()`

Bridge exists only in E2E local mode.

## Helpers

- `e2e/test-helpers/auth.js`
- `e2e/test-helpers/pages/home.page.js`
- `e2e/test-helpers/pages/dashboard.page.js`
- `e2e/test-helpers/pages/workflow.page.js`
