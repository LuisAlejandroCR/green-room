// layout.tsx: root shell. Self-hosted Fraunces (display, roman + italic) and Hanken Grotesk (interface); both OFL.
// interactiveWidget keeps the layout viewport above the Android soft keyboard so sticky actions stay reachable.
import type { ReactNode } from "react";
import type { Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fraunces = localFont({
  src: [
    { path: "./fonts/Fraunces-roman.woff2", style: "normal", weight: "400 700" },
    { path: "./fonts/Fraunces-italic.woff2", style: "italic", weight: "400 600" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const hanken = localFont({
  src: [{ path: "./fonts/HankenGrotesk.woff2", style: "normal", weight: "400 700" }],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata = {
  title: "Green Room",
  description: "Find the podcasts whose listeners already love your guest's work.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4efe3",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
