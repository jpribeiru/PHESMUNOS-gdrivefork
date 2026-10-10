# Provenance

PHESMUN OS is a separately deployed copy of **Conference OS**, created by Zuhayr Siddique.

| | |
| --- | --- |
| Source repository | `zhrsidd/MUNOS` (private) |
| Source commit | `d651d9766fe4dd0abbb5bde486c0791d4bb3c677` (`main`, merge of MUNOS PR #21, 10 October 2026) |
| Source tree | `d1db862b455c5d96b969d18fbd5e1a09dc4993c1` |
| Imported | 10 October 2026, as a file snapshot (`git archive`) without MUNOS history |
| Synchronisation | **None.** Changes are not merged automatically in either direction. |

The first commit of this repository contains the source tree exactly as it was at that commit, plus this file.
Every later commit is a PHESMUN-specific change made in this repository.

Not copied: local `.env*` files, untracked files, credentials, session tokens, DCMUN conference records and access codes.
`supabase/seed.sql` and `lib/seed.ts` contain only synthetic demonstration records (`example.com` addresses), used by local demo mode and the automated tests; they are never loaded into the PHESMUN database.
