import Link from "next/link";
import { ArrowRight, Eye, FlaskConical, Search, Wrench } from "lucide-react";
import { getIncidents } from "@/lib/incidents";
import { getMessages, localePath, type Lang } from "@/lib/i18n";
import { CaseStamp, Difficulty } from "@/components/CaseFile";
import { LandingPreview } from "@/components/LandingPreview";
import { OnCallQuotes } from "@/components/OnCallQuotes";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo, SimulationChip, StatusDot } from "@/components/ui";

const STEP_ICONS = [Eye, Search, FlaskConical, Wrench];

export function LandingPage({ lang }: { lang: Lang }) {
  const t = getMessages(lang);
  const incidents = getIncidents(lang);
  const href = (path: string) => localePath(lang, path);
  const firstCase = href(`/incident/${incidents[0].id}`);

  return (
    <main className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="grid-dots pointer-events-none absolute inset-x-0 top-0 h-[900px] opacity-70 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)]" />
      <SiteHeader lang={lang} />

      {/* Hero */}
      <section className="relative px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Link
            href={firstCase}
            className="inline-flex items-center gap-2 rounded-full border border-critical/30 bg-critical/[0.07] px-3 py-1 text-xs text-critical transition hover:bg-critical/[0.12]"
          >
            <StatusDot status="critical" pulse />
            {t.landing.openBadge(incidents.length)}
            <ArrowRight className="size-3" />
          </Link>
          <h1 className="mt-7 text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-7xl">
            {t.landing.titleA} <span className="glitch">{t.landing.titleBroken}</span>
            <br />
            <span className="text-muted">{t.landing.titleB}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">{t.landing.subtitle}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={firstCase}
              className="group flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-sm font-semibold text-bg transition hover:bg-white"
            >
              {t.landing.ctaPrimary}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link href={href("/incidents")} className="px-4 py-3 text-sm text-muted transition hover:text-fg">
              {t.landing.ctaSecondary}
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-center text-[13px] text-faint">
            <SimulationChip label={t.sim.chip} tooltip={t.sim.tooltip} />
            {t.sim.drillLine}
          </p>
        </div>
        <LandingPreview incident={incidents[0]} />
      </section>

      {/* Loop */}
      <section className="mx-auto w-full max-w-6xl px-4 py-28 sm:px-6">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t.landing.loopTitle}</h2>
        <p className="mt-3 max-w-xl text-muted">{t.landing.loopText}</p>
        <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.landing.steps.map((step, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={step.title} className="relative rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-lg border border-line bg-raised">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="font-mono text-xs text-faint">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{step.text}</p>
                {i < t.landing.steps.length - 1 && (
                  <ArrowRight className="absolute -right-[11px] top-1/2 z-10 hidden size-4 -translate-y-1/2 text-faint lg:block" />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Patterns */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-28 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.landing.patternsTitle}</h2>
        <p className="mt-3 max-w-xl text-muted">{t.landing.patternsText}</p>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {incidents.map((incident, i) => (
            <Link
              key={incident.id}
              href={href(`/incident/${incident.id}`)}
              className="group relative flex flex-col rounded-2xl border border-line-strong bg-surface p-6 transition hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-[11px] tracking-[0.14em] text-faint">{t.landing.caseLabel(2041 + i)}</div>
                  <span className="mt-3 block text-3xl">{incident.emoji}</span>
                </div>
                <CaseStamp id={incident.id} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{incident.short}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{incident.pattern}</p>
              <div className="mt-4">
                <Difficulty level={incident.difficulty} />
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {incident.resources.slice(0, 4).map((r) => (
                  <span key={r.id} className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-muted">
                    {r.service.split(" · ")[0]}
                  </span>
                ))}
              </div>
              <span className="mt-6 flex items-center gap-1 text-sm font-medium text-fg/80 transition group-hover:text-fg">
                {t.landing.openCase}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-line-strong bg-surface px-6 py-16 text-center">
          <div className="grid-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative flex flex-col items-center">
            <Logo size={40} />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{t.landing.finalTitle}</h2>
            <p className="mt-3 text-muted">{t.landing.finalText(incidents.length)}</p>
            <Link
              href={firstCase}
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-fg px-5 py-3 text-sm font-semibold text-bg transition hover:bg-white"
            >
              {t.landing.finalCta}
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
            </Link>
            <div className="mt-10">
              <OnCallQuotes />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-faint sm:flex-row sm:px-6">
          <span>{t.landing.footerLeft}</span>
          <span>{t.landing.footerRight}</span>
        </div>
      </footer>
    </main>
  );
}
