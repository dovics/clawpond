import type { Metadata } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "ClawPond",
  description: "AI Agent Instance Management Dashboard",
  icons: {
    icon: "/logo-32x32.png",
    apple: "/logo-64x64.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="darkreader-lock" />
      </head>
      <body className="antialiased">
        <ToasterProvider>
          {children}
        </ToasterProvider>
      </body>
    </html>
  );
}
