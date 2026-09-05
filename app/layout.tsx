import type { Metadata } from "next";
import "./globals.css";
import { TaskBar } from "@/components/TaskBar";

export const metadata: Metadata = {
  title: "tMIT Plotter",
  description: "ThrustMIT ground station and telemetry console",
};

// sets the stored theme before first paint so there is no flash of
// the wrong theme while react hydrates
const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem("tmit-theme") || "dark";
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add(stored);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <TaskBar />
        {children}
      </body>
    </html>
  );
}
