import type { Metadata } from "next";
import { Cinzel, Josefin_Sans } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kinnisvara Transparency Dashboard",
  description:
    "Instant property permit verification, energy ratings, spatial constraints, and district market values from Estonia's national registries — EHR, In-ADS, and Maa-amet.",
  keywords: [
    "Estonia",
    "property",
    "real estate",
    "building permit",
    "energy certificate",
    "EHR",
    "Maa-amet",
    "kinnisvara",
    "transparency",
    "ehitisregister",
  ],
  openGraph: {
    title: "Kinnisvara Transparency Dashboard",
    description:
      "Verify building permits, energy ratings, and spatial constraints from Estonian national registries.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="et" className={`${cinzel.variable} ${josefinSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
