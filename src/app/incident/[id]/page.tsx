import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIncident, incidents } from "@/lib/incidents";
import { getMessages } from "@/lib/i18n";
import { IncidentExperience } from "@/components/IncidentExperience";

// Prerendered at build time. On Webflow Cloud (OpenNext) a prerender cache miss
// falls back to rendering on demand; unknown ids hit notFound() below.
export function generateStaticParams() {
  return incidents.map((i) => ({ id: i.id }));
}

export async function generateMetadata(props: PageProps<"/incident/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const incident = getIncident(id, "en");
  return { title: incident ? getMessages("en").meta.incident(incident.title) : "Cloud Detective" };
}

export default async function IncidentPage(props: PageProps<"/incident/[id]">) {
  const { id } = await props.params;
  if (!getIncident(id)) notFound();
  // key resets all investigation state when moving to the next incident.
  return <IncidentExperience key={id} id={id} />;
}
