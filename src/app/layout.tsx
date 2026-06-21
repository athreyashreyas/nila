import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, DM_Serif_Display } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { EncryptionProvider } from '@/lib/encryption/context';
import { ThemeProvider } from '@/lib/theme/context';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSerif = DM_Serif_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nila',
  description: 'Your private cycle companion',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Nila',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    // iOS home screen icon
    'apple-touch-icon': '/icons/apple-touch-icon.png',
    // iOS splash screens (portrait + landscape for key breakpoints)
    'apple-touch-startup-image-portrait': '/splash/iphone-14-pro.png',
    'apple-touch-startup-image-landscape': '/splash/iphone-14-pro-landscape.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#1a1a18' },
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${dmSerif.variable} h-full`}>
      <head>
        {/* Anti-FOUC: apply stored theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('nila-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}` }} />
        {/* Favicon and home screen icon — one mark, the Nila dancer */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {/* iOS splash screens — portrait */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-pro.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-se.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-12.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-11.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        {/* iOS splash screens — landscape */}
        <link
          rel="apple-touch-startup-image"
          href="/splash/iphone-14-pro-landscape.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/ipad-pro-12-landscape.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-[--color-background] text-[--color-foreground]">
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <EncryptionProvider>
            {children}
          </EncryptionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
