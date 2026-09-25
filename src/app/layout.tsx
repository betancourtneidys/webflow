import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getMessages } from "@/lib/i18n";
import { LangProvider } from "@/components/LangProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const t = getMessages("en");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. LanguageTool) add attributes to <html> before hydration.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* English by default; app/es/layout.tsx overrides the language for /es. */}
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <LangProvider lang="en">{children}</LangProvider>
      </body>
    </html>
  );
}
