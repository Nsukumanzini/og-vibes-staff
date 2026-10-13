import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "OG Vibes Staff",
  title: {
    default: "OG Vibes Staff",
    template: "%s | OG Vibes Staff",
  },
  description:
    "The secure academic operations portal for OG Vibes staff and lecturers.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "192x192" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OG Vibes Staff",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
