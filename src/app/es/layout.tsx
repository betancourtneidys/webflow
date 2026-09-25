import type { Metadata } from "next";
import { getMessages } from "@/lib/i18n";
import { LangProvider } from "@/components/LangProvider";

const t = getMessages("es");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export default function SpanishLayout({ children }: LayoutProps<"/es">) {
  return <LangProvider lang="es">{children}</LangProvider>;
}
