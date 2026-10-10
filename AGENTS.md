# PHESMUN OS — repository instructions

PHESMUN OS is a separately branded, operationally isolated deployment of Conference OS (created by Zuhayr Siddique) for
Park House English School Model United Nations. Source provenance: PROVENANCE.md. GitHub `zhrsidd/PHESMUNOS` (private) is
the source of truth for this deployment; it is **not** synchronised with `zhrsidd/MUNOS`, and changes are not merged back.

Safety rules (inherited from Conference OS and still binding):

- The only database is Supabase project `gglltljhdpkfjnyjmnif` (PHESMUN - Production), a live conference on Free/Nano.
  Never point anything at DCMUN's projects (Development `opmydpozhdgkpcnjwpqb`). Database-connected scripts must use
  `lib/platform/target-guard.ts`; SQL scripts must check the `supabase_migrations` target marker.
- No synthetic load tests against this project. Load/rehearsal tools are disabled in this repository.
- Apply schema changes only through committed migrations (`supabase/migrations/`), applied in order with the guarded parts
  in `supabase/phesmun/`. Do not widen RLS or grants. The server key may execute only the four public QR-form RPCs.
- Preserve the IndexedDB offline outbox, mutation idempotency, conflict handling, PT409 recovery, the local-first timer,
  the /api/health database probe, the service-worker 5xx fallback and the persistent-storage request.
- Never commit secrets, `.env*` files (except `.env.example`), session tokens or generated build output. Never force-push.
- Keep PHESMUN branding (conference identity, `lib/brand.ts`) separate from Conference OS (platform identity and attribution).
