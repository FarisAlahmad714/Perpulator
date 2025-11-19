import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Perpulator - Perpetual Futures Position Calculator',
  description: 'Calculate position sizes and risk/reward ratios for crypto perpetual trading',
  icons: {
    icon: '/assets/logos/logo-favicon.png',
    shortcut: '/assets/logos/logo-favicon.png',
    apple: '/assets/logos/logo-favicon.png',
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
