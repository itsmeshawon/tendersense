import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tendersense.app"),
  title: {
    default: "TenderSense — Daily tender shortlist",
    template: "%s · TenderSense",
  },
  description:
    "TenderSense grades and monitors public procurement notices for Bangladesh organisations.",
  openGraph: {
    title: "TenderSense",
    description:
      "Daily curated shortlist of public procurement tenders, graded against your organisation's profile.",
    url: "https://tendersense.app",
    siteName: "TenderSense",
    type: "website",
  },
  robots: {
    index: false, // pilot phase — keep out of search until public launch
    follow: false,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">{children}</body>
    </html>
  );
}
