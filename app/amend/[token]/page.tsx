import type { Metadata } from 'next';
import Image from 'next/image';
import { findAmendmentLink } from '@/lib/amendments/backend';
import { AmendmentForm } from '@/components/amendments/form';
import { Attribution } from '@/components/attribution';
import { BRAND } from '@/lib/brand';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `Submit an amendment · ${BRAND.conference}`, robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function AmendmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findAmendmentLink(token);
  return <main className="submit-page"><header className="submit-header"><Image src={BRAND.logo} alt={BRAND.logoAlt} width={40} height={40} className="brand-logo" /><span>{BRAND.conference} · Amendment submission</span></header>
    {link === 'unavailable' ? <section className="submit-card" role="alert"><h1>Online amendments are temporarily unavailable</h1><p>Your amendment has not been submitted. Ask your Chair. Local demo links do not send amendments to a live committee.</p></section> : !link ? <section className="submit-card" role="alert"><h1>This amendment link is not valid</h1><p>Scan the current QR code in your committee room.</p></section> : <AmendmentForm token={token} link={link} />}
    <Attribution className="attribution centered" />
  </main>;
}
