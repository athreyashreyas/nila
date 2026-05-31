import type { Metadata, Viewport } from 'next';
import { Nunito, Playfair_Display } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { EncryptionProvider } from '@/lib/encryption/context';
import { ThemeProvider } from '@/lib/theme/context';
import './globals.css';

const nunito = Nunito({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
    { media: '(prefers-color-scheme: dark)', color: '#160a22' },
    { media: '(prefers-color-scheme: light)', color: '#fff4f7' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${playfair.variable} h-full`}>
      <head>
        {/* Anti-FOUC: apply stored theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('nila-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}` }} />
        {/* Favicon — SVG, swapped by ThemeProvider when theme changes */}
        <link rel="icon" href="/icons/icon-dark.svg" data-theme-icon="svg" />
        {/* Apple touch icons — PNG, ThemeProvider swaps to match current theme.
            iOS caches at "Add to Home Screen" time so theme at that moment is used. */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon-dark.png" data-theme-icon="png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-touch-icon-dark.png" data-theme-icon="png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-touch-icon-dark.png" data-theme-icon="png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-dark.png" data-theme-icon="png" />
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
