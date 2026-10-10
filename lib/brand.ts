// Conference identity (PHESMUN) and platform identity (Conference OS) are deliberately separate.
// Visible branding reads from here; internal identifiers (cache names, storage keys, RPC names) do not.
export const BRAND = {
  conference: "PHESMUN",
  conferenceName: "Park House English School Model United Nations",
  product: "PHESMUN OS",
  logo: "/phesmun-logo.png",
  logoAlt: "PHESMUN — Park House English School Model United Nations",
} as const;
export const PLATFORM = {
  name: "Conference OS",
  creator: "Zuhayr Siddique",
  creatorUrl: "https://www.linkedin.com/in/zhrsidd/",
  copyright: "Copyright © 2026 Zuhayr Siddique. All rights reserved.",
  contributors: [{ name: "John Paul Ribeiru", role: "Development Contributor", url: "https://www.linkedin.com/in/john-paul-ribeiru-797b2442b" }],
} as const;
export const ATTRIBUTION = `${BRAND.product} · Powered by ${PLATFORM.name} · Created by ${PLATFORM.creator}`;
