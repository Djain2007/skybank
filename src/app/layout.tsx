import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sans = localFont({
  src: "./fonts/InstrumentSans-Variable.woff2",
  variable: "--font-sans",
  weight: "400 700",
  display: "swap",
});

const mono = localFont({
  src: "./fonts/JetBrainsMono-Variable.woff2",
  variable: "--font-mono",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SkyBank",
    template: "%s – SkyBank",
  },
  description:
    "An educational online-banking simulator that makes the cryptography behind every transfer visible.",
};

export const viewport: Viewport = {
  themeColor: "#1a2d73",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
