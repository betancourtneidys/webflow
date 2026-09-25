import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { IncidentsPage } from "@/components/pages/IncidentsPage";

export const metadata: Metadata = { title: getMessages("es").meta.incidents };

export default function Page() {
  return <IncidentsPage lang="es" />;
}
