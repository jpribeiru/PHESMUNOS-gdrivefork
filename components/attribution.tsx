import Link from "next/link";
import { BRAND, PLATFORM } from "@/lib/brand";
/** Small, non-interactive-heavy attribution line for footers. Never placed inside controls or status areas. */
export function Attribution({ className = "attribution" }: { className?: string }) {
  return (
    <p className={className}>
      {BRAND.product} · Powered by {PLATFORM.name} · Created by {PLATFORM.creator} · <Link href="/about">About</Link>
    </p>
  );
}
