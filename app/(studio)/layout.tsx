import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { IBM_Plex_Sans, Manrope } from "next/font/google";


export const metadata: Metadata = {
  title: "Tectonica.ai - Studio Admin",
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

export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${manrope.variable} ${ibmPlexSans.variable}`}
    >
      {children}
    </div>
  );
}
