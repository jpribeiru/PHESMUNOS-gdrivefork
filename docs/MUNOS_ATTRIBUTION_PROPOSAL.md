# Proposal: attribution and licensing for the original MUNOS repository

Status: **proposal only.** Nothing in `zhrsidd/MUNOS` has been changed. Apply later as one reviewed PR there.

## What PHESMUN OS added (and would be ported)

1. `LICENSE` — proprietary "all rights reserved" licence for Conference OS (Copyright © 2026 Zuhayr Siddique), with explicit
   carve-outs for third-party components and conference-identity materials.
2. `THIRD_PARTY_NOTICES.md` — generated from the production dependency tree (`license-checker-rseidelsohn --production`),
   plus the bundled OFL fonts. Re-generate in MUNOS rather than copying.
3. `package.json` — `"author": "Zuhayr Siddique"`, `"license": "SEE LICENSE IN LICENSE"` (keep `"private": true`).
4. `lib/brand.ts` — one place for conference identity (DCMUN) and platform identity (Conference OS, creator, copyright,
   LinkedIn). `components/attribution.tsx` — small footer line "DCMUN OS · Powered by Conference OS · Created by Zuhayr Siddique".
5. Public `/about` page (added to `isPublicPath`, so it never opens the staff workspace) with creator, LinkedIn and notices.
6. HTML metadata: `applicationName`, `authors`, `creator`, `generator`, `robots: noindex`, `copyright`.

## Placement rules

Access screen (below the card), landing footer, workspace footer, public QR pages (below the form). Never inside debate
controls, mobile navigation, the status strip or the offline indicator.

## Points to decide for MUNOS

- Whether the DCMUN logo and name are covered by the same carve-out (they belong to Doha College MUN).
- Whether a written licence to DCMUN for conference use should accompany the LICENSE.
- Have the licence wording reviewed; this proposal is not legal advice.
