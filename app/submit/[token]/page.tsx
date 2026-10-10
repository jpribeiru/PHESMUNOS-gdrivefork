import type { Metadata } from "next";
import Image from "next/image";
import { findLink } from "@/lib/submissions/link-info";
import { SubmissionForm } from "@/components/operations/submission-form";
import { Attribution } from "@/components/attribution";
import { BRAND } from "@/lib/brand";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `Resolution submission · ${BRAND.conference}`, robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function SubmitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await findLink(token);
  return (
    <main className="submit-page">
      <header className="submit-header">
        <Image src={BRAND.logo} alt={BRAND.logoAlt} width={40} height={40} className="brand-logo" />
        <span>{BRAND.conference} · Resolution submission</span>
      </header>
      {link === "unavailable" ? (
        <section className="submit-card" role="alert">
          <h1>Submission is temporarily unavailable</h1>
          <p>Your resolution has not been submitted. Try again in a minute, or give the file to your Chair.</p>
        </section>
      ) : !link ? (
        <section className="submit-card" role="alert">
          <h1>This submission link is not valid</h1>
          <p>It may have been replaced. Scan the QR code in your committee room again, or ask your Chair for the current link.</p>
        </section>
      ) : (
        <SubmissionForm token={token} link={link} />
      )}
      <Attribution className="attribution centered" />
    </main>
  );
}
