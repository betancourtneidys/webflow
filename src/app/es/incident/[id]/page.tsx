import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIncident, incidents } from "@/lib/incidents";
import { getMessages } from "@/lib/i18n";
import { IncidentExperience } from "@/components/IncidentExperience";

export function generateStaticParams() {
  return incidents.map((i) => ({ id: i.id }));
}

export async function generateMetadata(props: PageProps<"/es/incident/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const incident = getIncident(id, "es");
  return { title: incident ? getMessages("es").meta.incident(incident.title) : "Cloud Detective" };
}

export default async function IncidentPage(props: PageProps<"/es/incident/[id]">) {
  const { id } = await props.params;
  if (!getIncident(id, "es")) notFound();
  return <IncidentExperience key={id} id={id} />;
}
