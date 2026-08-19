import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { DM_Sans, IBM_Plex_Sans, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Tectonica - Studio Admin",
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <div
        className={`studio-root font-sans flex h-full min-h-0 flex-col ${GeistSans.variable} ${GeistMono.variable} ${manrope.variable} ${ibmPlexSans.variable} ${dmSans.variable}`}
      >
        {children}
      </div>
    </ThemeProvider>
  );
}
