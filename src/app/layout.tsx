import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ProgressProvider } from "@/context/ProgressContext";
import SessionProvider from "@/components/auth/SessionProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { Toaster } from "sonner";

// BBC Brand Font - Plus Jakarta Sans
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bamboo Bicycle Club - Instructor Dashboard",
  description: "Course content and progress tracking for Bamboo Bicycle Building instructors",
};

// Enable ISR - revalidate every 60 seconds for fast loads with fresh data
export const revalidate = 60;

// Script to prevent flash of wrong theme
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('theme');
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#073e27" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BB Handbook" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body
        className={`${plusJakartaSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OfflineIndicator />
        <SessionProvider>
          <ProgressProvider>
            {children}
          </ProgressProvider>
        </SessionProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
