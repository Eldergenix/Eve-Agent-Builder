import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "eve Agent Builder",
  description: "Build and deploy eve AI agents with Brainwave 2.0 UI",
};

export const viewport: Viewport = {
  themeColor: "#f8f7f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className="text-[1rem]" lang="en">
      <body
        className="bg-surface-02 font-inter text-body-md text-primary antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
