Window Context #3 - DetailsConfirmStep Refactor Plan (planned)

File
- apps/booking-web/src/features/booking/steps/DetailsConfirmStep.tsx (~735 LOC)

Goal
- Bring the file under 400 LOC with no UI or behavior changes.
- Increase clarity by extracting hooks, helpers, and presentational sections.

Constraints
- Preserve all flows, payload shapes, toasts, error messages, and timing.
- Keep booking wizard state updates identical.
- Replace any loose types with precise ones in new modules only.

Analysis (current structure hot-spots)
- Helpers/schemas: zod schemas (account/profile), data mappers (buildProfileDefaults, buildCustomerPayload), formatting (hold countdown, postcode), and booking id extraction.
- In-file components: ModalShell, LoginModal, ForgotPasswordModal.
- Effects: auth token/profile bootstrap, RHF watchers syncing to the wizard draft, hold countdown interval, forgot-password event.
- Orchestrator: confirm flow (create, confirm, release hold, reset, navigate).
- JSX sections: summary cards, account form, details form, final checks.

Planned extractions
- Hooks
  - useAccountAuth: manage token, current user fetch (/auth/me), login/forgot modal state, and logout. Expose { token, user, loadingProfile, openLogin, openForgot, setToken, setUser }.
  - useProfileDraft: own RHF forms + zod resolvers, defaults, and watchers syncing to wizard draft. Expose { accountForm, profileForm, accountEmail }.
  - useHoldManager: compute holdRemainingMs (interval), holdActive, and releaseHoldIfAny().
  - useBookingConfirmation: confirm handler to create + confirm booking, release hold, reset wizard, navigate with success state; mirror current errors/toasts.
- Utilities/schemas
  - details-confirm.schemas.ts: accountSchema, profileSchema, AccountFormValues, ProfileFormValues, UK_POSTCODE_REGEX.
  - details-confirm.utils.ts: emptyToUndefined, computeHoldRemaining, formatHoldCountdown, normaliseTitle, trimOrUndefined, uppercasePostcode, extractAppointmentDisplay, buildProfileDefaults, buildCustomerPayload, extractBookingId, formatCurrency.
- Presentational components (pure)
  - AccountSection.tsx: renders account block; props: accountForm, token/user, openLogin, onLogout, ref.
  - DetailsSection.tsx: renders customer details; props: profileForm.
  - SummarySection.tsx: service/vehicle/appointment/total; props: derived labels and amounts.
  - FinalChecks.tsx: captcha, confirm error, actions; props: disabled state/title, onBack, onStartAgain.
  - Move modals: ModalShell.tsx, LoginModal.tsx, ForgotPasswordModal.tsx (unchanged markup/behavior).

Layout
- apps/booking-web/src/features/booking/steps/details-confirm/
  - DetailsConfirmStep.tsx (thin composer)
  - hooks/useAccountAuth.ts
  - hooks/useProfileDraft.ts
  - hooks/useHoldManager.ts
  - hooks/useBookingConfirmation.ts
  - components/AccountSection.tsx
  - components/DetailsSection.tsx
  - components/SummarySection.tsx
  - components/FinalChecks.tsx
  - components/ModalShell.tsx
  - components/LoginModal.tsx
  - components/ForgotPasswordModal.tsx
  - details-confirm.schemas.ts
  - details-confirm.utils.ts

Phases
- Phase 1 (scaffold + moves): create folder, move modals, schemas, and utils; wire imports in DetailsConfirmStep. (planned)
- Phase 2 (hooks): extract account/profile/hold hooks preserving effects and watchers. (planned)
- Phase 3 (presentational): extract sections; pass props only; no logic changes. (planned)
- Phase 4 (polish): tighten types, comments, ensure ESLint passes; verify < 400 LOC. (planned)

Verification
- pnpm.cmd --filter booking-web lint
- pnpm.cmd --filter booking-web build
- Sanity: pnpm.cmd --filter booking-api build && pnpm.cmd --filter booking-api test -- --config jest.config.ts

Expected outcome
- DetailsConfirmStep.tsx ~250–350 LOC, delegating to focused hooks/components.
- Identical behavior and UI; green builds/lint.

Status
- Phase 1 (scaffold + moves): done
  - Added directory `steps/details-confirm/` with:
    - `details-confirm.schemas.ts` (account/profile schemas + types)
    - `details-confirm.utils.ts` (formatting, mapping, id extraction)
    - Components: `ModalShell.tsx`, `LoginModal.tsx`, `ForgotPasswordModal.tsx`
  - Updated `DetailsConfirmStep.tsx` to import and use moved utilities and components.
  - Removed in-file helpers and inline modal components; schemas moved to module.
  - Fixed strict typing in utils (no `any`).
  - Lint/build: booking-web lint/build pass.

- Phase 2 (hooks): done
  - Added hooks under `steps/details-confirm/hooks/`:
    - `useProfileDraft.ts`: owns RHF forms + resolvers, watchers syncing to wizard draft, and schema-derived validity + error.
    - `useAccountAuth.ts`: manages token and `/auth/me` bootstrap; resets forms identically to prior effect; handles AUTH event.
    - `useHoldManager.ts`: manages hold countdown and provides `releaseHoldIfAny` as before.
  - Updated `DetailsConfirmStep.tsx` to delegate to hooks; removed inline effects and state now handled by hooks.
  - Resulting size: `DetailsConfirmStep.tsx` ~394 LOC (down from ~735).
  - Lint/build: booking-web lint/build pass.

- Phase 3 (presentational): done
  - Added components under `steps/details-confirm/components/`:
    - `SummarySection.tsx`: service/vehicle/appointment/total cards + hold banner.
    - `AccountSection.tsx`: account header + login/register or signed-in panel.
    - `DetailsSection.tsx`: customer details form fields + validation renders.
    - `FinalChecks.tsx`: captcha + back/start again/confirm actions.
  - Updated `DetailsConfirmStep.tsx` to render these components with the same props and handlers; no behavior or UI changes.
  - Resulting size: `DetailsConfirmStep.tsx` ~211 LOC.
  - Lint/build: booking-web lint/build pass.
- Phase 4 (polish): done
  - Added short file headers and JSDoc-style comments to new hooks/components/utils.
  - Added barrel exports: `steps/details-confirm/components/index.ts` and `steps/details-confirm/hooks/index.ts`; simplified imports in step.
  - Verified: booking-web lint/build pass. File size now ~211 LOC.
