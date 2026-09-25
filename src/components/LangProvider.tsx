"use client";

import { createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getMessages, localePath, switchLocalePath, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // The root layout renders <html lang="en">. Only a non-default provider (the
  // nested /es one) touches the attribute, and it restores "en" when it unmounts —
  // otherwise the root provider's effect, which runs after the child's, would win.
  useEffect(() => {
    if (lang === "en") return;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [lang]);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => getMessages(useLang());

/** Builds a link to `path` in the current language. */
export function useLocalePath() {
  const lang = useLang();
  return (path: string) => localePath(lang, path);
}

export function LangSwitch() {
  const lang = useLang();
  const pathname = usePathname();
  return (
    <span className="flex items-center rounded-lg border border-line-strong p-0.5 font-mono text-[11px]" aria-label="Language">
      {(["en", "es"] as const).map((l) => (
        <Link
          key={l}
          href={switchLocalePath(pathname, l)}
          aria-current={l === lang ? "true" : undefined}
          className={`rounded-md px-1.5 py-0.5 uppercase transition ${l === lang ? "bg-white/10 text-fg" : "text-muted hover:text-fg"}`}
        >
          {l}
        </Link>
      ))}
    </span>
  );
}
