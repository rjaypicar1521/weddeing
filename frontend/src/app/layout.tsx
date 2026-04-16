import type { Metadata } from "next";
import { Inter, Jost, Playfair_Display, Sail } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const sail = Sail({
  variable: "--font-sail",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wedding-online.com"),
  title: {
    default: "Wedding Online",
    template: "%s | Wedding Online",
  },
  description: "Beautiful digital invitations & RSVPs for modern weddings.",
  openGraph: {
    title: "Wedding Online",
    description: "Beautiful digital invitations & RSVPs",
    type: "website",
    url: "https://wedding-online.com",
    siteName: "Wedding Online",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${playfairDisplay.variable} ${jost.variable} ${inter.variable} ${sail.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
