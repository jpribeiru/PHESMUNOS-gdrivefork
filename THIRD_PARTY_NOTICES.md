# Third-party notices

PHESMUN OS is built on **Conference OS** (Copyright © 2026 Zuhayr Siddique, all rights reserved; see [LICENSE](LICENSE)).
Conference OS uses the open-source components below. **They are not covered by the Conference OS licence**: each remains
under its own licence, and nothing in this repository claims ownership of them. Their licence texts are included in the
installed packages (`node_modules/<package>/LICENSE*`) and are reproduced by the package manager on installation.

## Fonts (bundled in `app/fonts/`)

| Font | Licence | Notice |
| --- | --- | --- |
| DM Sans | SIL Open Font License 1.1 | [`app/fonts/OFL-DMSans.txt`](app/fonts/OFL-DMSans.txt) — Copyright 2014 The DM Sans Project Authors |
| Manrope | SIL Open Font License 1.1 | [`app/fonts/OFL-Manrope.txt`](app/fonts/OFL-Manrope.txt) — Copyright 2018 The Manrope Project Authors |

## Conference identity

The PHESMUN name and logo (`public/phesmun-logo.png`, `public/phesmun-icon-*.png`, `public/apple-touch-icon.png`,
`public/favicon-48.png`, derived from the official PHESMUN logo) identify Park House English School Model United
Nations. They belong to their owners, were provided by the PHESMUN organisers to brand this deployment, and are **not** part of
Conference OS or its licence.

## Runtime npm packages (production dependency tree, 34 packages)

Generated with `npx license-checker-rseidelsohn --production` on 10 October 2026.

| Package | Version | Licence | Source |
| --- | --- | --- | --- |
| `@img/colour` | 1.1.0 | MIT | https://github.com/lovell/colour |
| `@img/sharp-libvips-linux-x64` | 1.3.4 | LGPL-3.0-or-later | https://github.com/lovell/sharp-libvips |
| `@img/sharp-linux-x64` | 0.35.5 | Apache-2.0 | https://github.com/lovell/sharp |
| `@next/env` | 16.3.8 | MIT | https://github.com/vercel/next.js |
| `@next/swc-linux-x64-gnu` | 16.3.8 | MIT | https://github.com/vercel/next.js |
| `@supabase/auth-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@supabase/functions-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@supabase/phoenix` | 0.4.5 | MIT | https://github.com/supabase/phoenix |
| `@supabase/postgrest-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@supabase/realtime-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@supabase/ssr` | 0.12.7 | MIT | https://github.com/supabase/ssr |
| `@supabase/storage-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@supabase/supabase-js` | 2.117.2 | MIT | https://github.com/supabase/supabase-js |
| `@swc/helpers` | 0.5.23 | Apache-2.0 | https://github.com/swc-project/swc |
| `baseline-browser-mapping` | 2.11.27 | Apache-2.0 | https://github.com/web-platform-dx/baseline-browser-mapping |
| `caniuse-lite` | 1.0.30001814 | CC-BY-4.0 | https://github.com/browserslist/caniuse-lite |
| `client-only` | 0.0.1 | MIT |  |
| `cookie` | 1.1.1 | MIT | https://github.com/jshttp/cookie |
| `detect-libc` | 2.1.2 | Apache-2.0 | https://github.com/lovell/detect-libc |
| `iceberg-js` | 0.8.1 | MIT | https://github.com/supabase/iceberg-js |
| `idb` | 8.0.3 | ISC | https://github.com/jakearchibald/idb |
| `nanoid` | 3.3.19 | MIT | https://github.com/ai/nanoid |
| `next` | 16.3.8 | MIT | https://github.com/vercel/next.js |
| `picocolors` | 1.1.1 | ISC | https://github.com/alexeyraspopov/picocolors |
| `postcss` | 8.5.23 | MIT | https://github.com/postcss/postcss |
| `react-dom` | 19.3.0 | MIT | https://github.com/react/react |
| `react` | 19.3.0 | MIT | https://github.com/react/react |
| `scheduler` | 0.28.0 | MIT | https://github.com/react/react |
| `semver` | 7.8.5 | ISC | https://github.com/npm/node-semver |
| `sharp` | 0.35.5 | Apache-2.0 | https://github.com/lovell/sharp |
| `source-map-js` | 1.2.2 | BSD-3-Clause | https://github.com/7rulnik/source-map-js |
| `styled-jsx` | 5.1.6 | MIT | https://github.com/vercel/styled-jsx |
| `tslib` | 2.8.1 | 0BSD | https://github.com/Microsoft/tslib |
| `uqr` | 0.1.3 | MIT | https://github.com/unjs/uqr |

Notes:
- `@img/sharp-libvips-*` (LGPL-3.0-or-later) is a prebuilt, dynamically loaded library used by Next.js image
  optimisation through `sharp`. It is not modified. Its source and licence are available from the package.
- `caniuse-lite` data is CC-BY-4.0 (attribution: the Can I Use project).
- Development-only tools (TypeScript, ESLint, test libraries) are not distributed with the application.
