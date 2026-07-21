import type { Metadata } from "next";
import { Playfair_Display, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalNavigation from "@/components/ConditionalNavigation";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import ClientLayout from "./ClientLayout";
import { SITE_URL, SITE_NAME } from "@/lib/site";

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

const TITLE = "Victoria Odueso | Writing Portfolio";
const DESCRIPTION =
  "An elegant portfolio showcasing expertise in SaaS, Digital Marketing, and premium Content Strategy.";

export const metadata: Metadata = {
  // Required for relative OG/canonical URLs to resolve to absolute ones.
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    // Page-level titles render as "Post Title | Victoria Odueso".
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    siteName: "Victoria Odueso Portfolio",
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${geistSans.variable} ${geistMono.variable} antialiased scroll-smooth`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen flex flex-col selection:bg-gold selection:text-onyx transition-colors duration-300">
        <ThemeProvider>
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
                className="fixed bottom-4 right-4 z-50 w-3 h-3 rounded-full bg-gold/25 hover:bg-gold/70 transition-colors duration-300"
              />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
