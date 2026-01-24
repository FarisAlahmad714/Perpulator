import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://perpulator.com'),
  title: 'Perpulator - Perpetual Futures Position Calculator',
  description: 'Professional perpetual futures analysis tool. Calculate position sizes, risk/reward ratios, and manage your crypto trading positions.',
  icons: {
    icon: '/assets/logos/logo-favicon.png',
    shortcut: '/assets/logos/logo-favicon.png',
    apple: '/assets/logos/logo-primary.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Perpulator',
  },
  openGraph: {
    title: 'Perpulator - Perpetual Futures Position Calculator',
    description: 'Professional perpetual futures analysis tool. Calculate position sizes, risk/reward ratios, and manage your crypto trading positions.',
    url: 'https://perpulator.com',
    siteName: 'Perpulator',
    images: [
      {
        url: 'https://perpulator.com/assets/logos/logo-primary.png',
        width: 1024,
        height: 1024,
        alt: 'Perpulator - Professional Perpetual Futures Analysis',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perpulator - Perpetual Futures Position Calculator',
    description: 'Professional perpetual futures analysis tool. Calculate position sizes, risk/reward ratios, and manage your crypto trading positions.',
    images: ['https://perpulator.com/assets/logos/logo-primary.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />

        {/* Google Analytics */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <main className="min-h-screen bg-gradient-to-br from-trading-dark via-trading-dark to-gray-900 text-white">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
