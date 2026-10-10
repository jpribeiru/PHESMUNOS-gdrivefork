// Target-identity guard for the PHESMUN deployment. Every database-connected path (build, health probe,
// operator scripts) resolves the EFFECTIVE Supabase URL and refuses to continue unless it is the PHESMUN
// project. DCMUN's Development project is always rejected. Never logs or returns secret values.
export const PHESMUN_SUPABASE_REF = "gglltljhdpkfjnyjmnif";
/** Projects this deployment must never talk to (DCMUN Development). */
export const FORBIDDEN_SUPABASE_REFS = ["opmydpozhdgkpcnjwpqb"] as const;
export type TargetCheck = { ok: true; ref: string } | { ok: false; ref: string | null; reason: string };
/** Project ref of a hosted Supabase URL (https://<ref>.supabase.co), else null. */
export function supabaseRef(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol, hostname, username, password } = new URL(url);
    if (protocol !== "https:" || username || password) return null;
    return /^([a-z0-9]{20})\.supabase\.co$/.exec(hostname)?.[1] ?? null;
  } catch {
    return null;
  }
}
export function checkTarget(url: string | undefined, expected: string = PHESMUN_SUPABASE_REF): TargetCheck {
  const ref = supabaseRef(url);
  if (!url) return { ok: false, ref, reason: "NEXT_PUBLIC_SUPABASE_URL is not set" };
  if (!ref) return { ok: false, ref, reason: "NEXT_PUBLIC_SUPABASE_URL is not a hosted Supabase project URL" };
  if ((FORBIDDEN_SUPABASE_REFS as readonly string[]).includes(ref)) return { ok: false, ref, reason: `${ref} is DCMUN's Development project, which PHESMUN must never use` };
  if (ref !== expected) return { ok: false, ref, reason: `${ref} is not the PHESMUN project (${expected})` };
  return { ok: true, ref };
}
/** For operator scripts: throws before any connection is made. Returns the verified project ref. */
export function assertPhesmunTarget(url: string | undefined, expected: string = PHESMUN_SUPABASE_REF): string {
  const result = checkTarget(url, expected);
  if (!result.ok) throw Error(`Target guard refused: ${result.reason}. Nothing was contacted.`);
  return result.ref;
}
