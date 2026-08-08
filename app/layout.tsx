import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tMIT Plotter",
  description: "ThrustMIT ground station and telemetry console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
