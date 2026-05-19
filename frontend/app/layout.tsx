import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import Script from 'next/script';
import './globals.css';

const SITE_URL = 'https://zivotalk.live';
const GA_ID = 'G-XXXXXXXXXX'; // 👈 Replace with your actual Google Analytics ID

export const metadata: Metadata = {
  // ── Core ───────────────────────────────────────────────────────────────────
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Zivo Talk — Free Random Video Chat with Strangers | Omegle Alternative',
    template: '%s | Zivo Talk',
  },
  description:
    'Zivo Talk is the best free random video chat site to meet strangers instantly. No sign up needed. Talk to people worldwide — the ultimate Omegle & Umingle alternative in 2025.',
  keywords: [
    'random video chat',
    'chat with strangers',
    'omegle alternative',
    'umingle alternative',
    'free video chat',
    'anonymous chat',
    'stranger chat',
    'video chat strangers',
    'zivo talk',
    'zivotalk',
    'random chat online',
    'meet strangers online',
    'free random chat',
    'omegle like sites',
    'chatroulette alternative',
    'video chat no signup',
    'online video chat',
    'live video chat',
    'talk to strangers',
    'stranger danger free chat',
  ],
  authors: [{ name: 'Mohammad Hamza', url: SITE_URL }],
  creator: 'Mohammad Hamza — HRS Group',
  publisher: 'Zivo Talk',
  category: 'Social / Communication',
  applicationName: 'Zivo Talk',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ── Verification Tags ───────────────────────────────────────────────────────
  // 👇 After adding to Google Search Console, paste the verification content here
  verification: {
    google: 'PASTE_YOUR_GOOGLE_VERIFICATION_CODE_HERE',
    // yandex: 'YOUR_YANDEX_CODE',
    // bing: 'YOUR_BING_CODE',
  },

  // ── Open Graph ─────────────────────────────────────────────────────────────
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'Zivo Talk',
    title: 'Zivo Talk — Free Random Video Chat with Strangers',
    description:
      'Meet and talk to strangers worldwide via instant anonymous video chat. No signup, no account. The best Omegle & Umingle alternative — 100% free.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Zivo Talk — Random Video Chat with Strangers',
        type: 'image/png',
      },
    ],
  },

  // ── Twitter Card ────────────────────────────────────────────────────────────
  twitter: {
    card: 'summary_large_image',
    title: 'Zivo Talk — Free Random Video Chat with Strangers',
    description:
      'The best Omegle alternative. Instant anonymous video chat — no signup required. Meet people worldwide now.',
    images: ['/og-image.png'],
    creator: '@zivotalk',
  },

  // ── Alternate / Canonical ───────────────────────────────────────────────────
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
    },
  },

  // ── Icons ───────────────────────────────────────────────────────────────────
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icon.png', sizes: '180x180' }],
    shortcut: '/favicon.ico',
  },

  // ── App / PWA Metadata ──────────────────────────────────────────────────────
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8b5cf6',
};

// ── JSON-LD Structured Data ──────────────────────────────────────────────────
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Zivo Talk',
  url: SITE_URL,
  description:
    'Free random video chat with strangers. The best Omegle and Umingle alternative — no sign up needed.',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/chat?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Zivo Talk',
  url: SITE_URL,
  logo: `${SITE_URL}/zivo-logo-final.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'zivotalk@gmail.com',
    contactType: 'customer support',
  },
  sameAs: [
    'https://zivotalk.live',
  ],
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Zivo Talk',
  applicationCategory: 'CommunicationApplication',
  operatingSystem: 'Web Browser',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description:
    'Anonymous random video chat app. Chat with strangers instantly for free — no login required.',
  url: SITE_URL,
  screenshot: `${SITE_URL}/og-image.png`,
  featureList: [
    'Anonymous video chat',
    'Random stranger matching',
    'No signup required',
    'WebRTC peer-to-peer',
    'Instant matchmaking',
    'Free to use',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '1240',
  },
};

// Sitelinks-ready Navigation schema (helps Google show sitelinks like Umingle)
const siteNavigationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SiteNavigationElement',
  name: [
    'Video Chat with Strangers',
    'Text Chat with Strangers',
    'About Zivo Talk',
    'Community Guidelines',
    'Privacy Policy',
    'Terms of Service',
  ],
  url: [
    `${SITE_URL}/chat`,
    `${SITE_URL}/chat?mode=text`,
    `${SITE_URL}/about`,
    `${SITE_URL}/guidelines`,
    `${SITE_URL}/privacy`,
    `${SITE_URL}/terms`,
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }}
        />
      </head>
      <body>
        {/* Google Analytics — runs after page is interactive */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });
          `}
        </Script>

        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
