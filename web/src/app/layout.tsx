import type { Metadata } from "next";
import { Playfair_Display, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import { ToastProvider } from "@/context/ToastContext";
import ClientLayout from "./ClientLayout";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Victoria Odueso | Writing Portfolio",
  description: "An elegant portfolio showcasing expertise in SaaS, Digital Marketing, and premium Content Strategy.",
  openGraph: {
    title: "Victoria Odueso | Writing Portfolio",
    description: "An elegant portfolio showcasing expertise in SaaS, Digital Marketing, and premium Content Strategy.",
    type: "website",
    siteName: "Victoria Odueso Portfolio",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Victoria Odueso | Writing Portfolio",
    description: "An elegant portfolio showcasing expertise in SaaS, Digital Marketing, and premium Content Strategy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased scroll-smooth`}>
      <body className="bg-[#0F0E0D] text-[#F3F4F6] min-h-screen flex flex-col selection:bg-[#C5A059] selection:text-[#0F0E0D]">
        <ToastProvider>
            <ConditionalNavigation />
            <ClientLayout>
              {children}
            </ClientLayout>

            {/* Admin access — small but clickable dot */}
            <a
              href="/admin"
              aria-label="Admin"
              title="Admin Portal"
              className="fixed bottom-4 right-4 z-50 w-3 h-3 rounded-full bg-[#C5A059]/25 hover:bg-[#C5A059]/70 transition-colors duration-300"
            />
        </ToastProvider>
      </body>
    </html>
  );
}
