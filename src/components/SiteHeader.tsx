import Link from "next/link";
import { Wordmark } from "./ui";

export function SiteHeader() {
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
      <Link href="/">
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/incidents" className="rounded-lg px-3 py-1.5 text-muted transition hover:text-fg">
          Incidents
        </Link>
        <Link
          href="/incident/production-api-degraded"
          className="rounded-lg border border-line-strong px-3 py-1.5 font-medium transition hover:border-white/25 hover:bg-white/[0.03]"
        >
          Start investigating
        </Link>
      </nav>
    </header>
  );
}
