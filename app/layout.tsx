import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Habit Tracker",
  description: "Suivez vos habitudes quotidiennes",
  icons: {
    icon: [
      { url: "/images/favicon/favicon.ico", sizes: "any" },
      { url: "/images/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/images/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/images/favicon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/images/favicon/site.webmanifest",
  appleWebApp: {
    title: "Habit Tracker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" type="image/png" href="/images/favicon/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/images/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/images/favicon/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Habit Tracker" />
        <link rel="manifest" href="/images/favicon/site.webmanifest" />
      </head>
      <body className={`${dmSans.variable} antialiased`}>{children}</body>
    </html>
  );
}
