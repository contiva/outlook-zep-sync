import type { Metadata } from "next";
import { Inter, Montserrat, Caveat } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import ScrollToTop from "@/components/ScrollToTop";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: "Outlook ZEP Sync",
  description: "Übertrage Outlook-Termine zu ZEP Zeiterfassung",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Outlook ZEP Sync",
    description: "Übertrage Outlook-Termine zu ZEP Zeiterfassung",
    type: "website",
    locale: "de_DE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Outlook ZEP Sync",
    description: "Übertrage Outlook-Termine zu ZEP Zeiterfassung",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${inter.variable} ${montserrat.variable} ${caveat.variable}`}>
        <Providers>
          {children}
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
