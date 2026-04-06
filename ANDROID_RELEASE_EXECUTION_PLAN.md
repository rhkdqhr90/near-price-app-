# Android Release Execution Plan

> Target: Google Play production release only
> Updated: 2026-04-03

## Phase 1 — Security Gate (P0)

- [x] Remove secret output from CI logs (`.env` content is never printed)
- [x] Add required secret presence check without exposing values
- [x] Ensure temporary sensitive files are removed after workflow execution

## Phase 2 — Release Build Gate (P0)

- [x] Build release artifact as AAB for Google Play (`bundleRelease`)
- [x] Keep debug APK path for manual QA installs
- [x] Use CI-driven app versioning (`VERSION_CODE`, `VERSION_NAME`)

## Phase 3 — Product QA Gate (P1)

- [ ] Real-device smoke test (login/search/register price/wishlist/flyer/inquiry)
- [ ] Token refresh flow test (401 -> refresh -> retry)
- [ ] Network recovery test (offline -> online -> query refetch)

## Phase 4 — Store Submission Gate (P1)

- [ ] Privacy policy URL and in-app text consistency check
- [ ] Play Console Data safety and permissions rationale complete
- [ ] Screenshot / description / app icon / feature graphic ready

## 3-Round Validation Rule

Run all checks in 3 consecutive rounds before release approval:

1. Static checks: lint + type check
2. Test checks: unit tests
3. Build checks: Android release build (AAB)

Release can proceed only if all 3 rounds pass with no regression.
