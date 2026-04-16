import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NHGOne | Narai Hospitality Group",
  description: "Unified admin dashboard and PMS managed layer.",
  icons: {
    icon: "https://guideline.lubd.com/wp-content/uploads/2025/11/NHG128-1.png",
  },
};

import Navigation from "@/components/Navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full font-sans antialiased">
        <Navigation>
          {children}
        </Navigation>
      </body>
    </html>
  );
}
