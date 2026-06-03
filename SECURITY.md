# Security Notes

## Local E2E Auth Bridge

This project includes a hidden E2E auth bridge for deterministic local tests:

- `window.__E2E_AUTH__.loginAdmin()`
- `window.__E2E_AUTH__.logout()`

It is intentionally restricted to local emulator runs.

## Enable Conditions

The bridge is enabled only when all are true:

1. `import.meta.env.DEV === true`
2. `VITE_E2E_MODE === "true"`
3. `VITE_USE_FIREBASE_EMULATOR === "true"`

If these are not satisfied, the bridge is not registered.

## Production Safety

- Production auth model is unchanged (admin email check in Firestore rules).
- The E2E bridge is designed to be stripped from production bundle paths.
- Build validation fails deployment if production bundle contains:
  - `localhost:9099`
  - `localhost:8081`
  - `__E2E_AUTH__`
  - `VITE_E2E_MODE`

## Local Seeding Guards

`scripts/e2e/seed-emulators.mjs` refuses to run unless:

- `FIREBASE_AUTH_EMULATOR_HOST` is set
- `FIRESTORE_EMULATOR_HOST` is set and uses port `8081`
- project id is explicitly allowed (`demo-project`)

This prevents accidental writes outside local emulators.
