import Link from "next/link";
import { getIncidents } from "@/lib/incidents";
import { getMessages, localePath, type Lang } from "@/lib/i18n";
import { LangSwitch } from "./LangProvider";
import { Wordmark } from "./ui";

export function SiteHeader({ lang }: { lang: Lang }) {
  const t = getMessages(lang);
  const first = getIncidents(lang)[0];
  return (
    <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
      <Link href={localePath(lang, "/")}>
        <Wordmark />
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        <Link href={localePath(lang, "/incidents")} className="rounded-lg px-3 py-1.5 text-muted transition hover:text-fg">
          {t.nav.incidents}
        </Link>
        <Link
          href={localePath(lang, `/incident/${first.id}`)}
          className="hidden rounded-lg border border-line-strong px-3 py-1.5 font-medium transition hover:border-white/25 hover:bg-white/[0.03] sm:block"
        >
          {t.nav.start}
        </Link>
        <span className="ml-2">
          <LangSwitch />
        </span>
      </nav>
    </header>
  );
}
