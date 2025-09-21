import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ReactQueryProvider from '@/lib/react-query';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Engaged - Discover Local Events',
  description:
    'Discover and save local events in Macau, Hong Kong, and the Greater Bay Area. AI-powered event matching for your perfect experience.',
  keywords: [
    'events',
    'Macau',
    'Hong Kong',
    'Greater Bay Area',
    'calendar',
    'discovery',
  ],
  authors: [{ name: 'Engaged Team' }],
  openGraph: {
    title: 'Engaged - Discover Local Events',
    description:
      'Discover and save local events in Macau, Hong Kong, and the Greater Bay Area.',
    type: 'website',
    locale: 'en_US',
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
