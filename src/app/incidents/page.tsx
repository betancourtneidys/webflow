import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { incidents } from "@/lib/incidents";
import { CaseStamp, Difficulty } from "@/components/CaseFile";
import { SiteHeader } from "@/components/SiteHeader";
import { STATUS_TEXT, StatusDot } from "@/components/ui";

export const metadata: Metadata = { title: "Open incidents · Cloud Detective" };

export default function IncidentsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-20 pt-10 sm:px-6">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-critical">
          <StatusDot status="critical" pulse />
          {incidents.length} open incidents
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Pick an incident to investigate</h1>
        <p className="mt-2 max-w-xl text-muted">
          Each one is a real cloud failure pattern with simulated data. No AWS account needed.
        </p>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {incidents.map((incident, i) => (
            <li key={incident.id}>
              <Link
                href={`/incident/${incident.id}`}
                className="group flex h-full flex-col rounded-2xl border border-line-strong bg-surface p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-raised"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[11px] tracking-[0.14em] text-faint">CASE #{2041 + i}</div>
                    <span className="mt-3 block text-2xl">{incident.emoji}</span>
                  </div>
                  <CaseStamp id={incident.id} />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{incident.title}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  <span className="capitalize">{incident.severity}</span> · started {incident.startedAgo}
                </p>
                <div className="mt-3">
                  <Difficulty level={incident.difficulty} />
                </div>
                <dl className="mt-5 space-y-2 border-t border-line pt-4">
                  {incident.headline.slice(0, 3).map((m) => (
                    <div key={m.label} className="flex items-center justify-between text-[13px]">
                      <dt className="text-muted">{m.label}</dt>
                      <dd className={`font-mono tabular-nums ${STATUS_TEXT[m.status]}`}>{m.value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex items-center justify-between pt-6 text-sm">
                  <span className="text-faint">{incident.resources.length} resources</span>
                  <span className="flex items-center gap-1 font-medium text-fg/90 transition group-hover:text-fg">
                    Investigate
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
