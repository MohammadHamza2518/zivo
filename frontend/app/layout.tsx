import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zivo — Anonymous Random Video Chat',
  description: 'Meet new people instantly with anonymous random video chat. No signup needed.',
  keywords: ['video chat', 'random chat', 'anonymous chat', 'omegle alternative', 'zivo'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body><Suspense fallback={null}>{children}</Suspense></body>
    </html>
  );
}
