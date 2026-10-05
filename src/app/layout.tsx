import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CampusFind", template: "%s | CampusFind" },
  description: "Lost and found for University of Uyo students.",
};
export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
