import type { Metadata, Viewport } from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/firebase-error-listener';
import { Toaster } from '@/components/ui/toaster';
import { AppSettingsSync } from '@/components/app-settings-sync';
import { APP_FULL_NAME, APP_NAME, APP_TAGLINE } from '@/lib/brand';

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description: `${APP_FULL_NAME}: личные чаты, группы, каналы и истории в одном приложении.`,
  applicationName: APP_NAME,
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/SLinkLogo.jpg', type: 'image/jpeg' }],
    apple: [{ url: '/icons/SLinkLogo.jpg', type: 'image/jpeg' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfbff' },
    { media: '(prefers-color-scheme: dark)', color: '#131019' },
  ],
};

/** Применяем сохранённую тему до первой отрисовки, чтобы не было вспышки. */
const themeInitScript = `
(function(){
  try {
    var mode = 'system';
    var hasExplicitTheme = false;
    var raw = localStorage.getItem('slink:settings');

    // Настройки интерфейса применяем до первой отрисовки, чтобы не было «прыжка».
    if (raw) {
      try {
        var settings = JSON.parse(raw);
        if (settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system') {
          mode = settings.theme;
          hasExplicitTheme = true;
        }
        if (settings.animations === false) document.documentElement.classList.add('animations-off');
        if (settings.chatFontSize) document.documentElement.classList.add('text-size-' + settings.chatFontSize);
        if (settings.chatWallpaper) document.documentElement.dataset.chatWallpaper = settings.chatWallpaper;
      } catch (e) {}
    }

    // Старый ключ 'theme' — только если новой настройки темы ещё нет.
    if (!hasExplicitTheme) {
      var stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') mode = stored;
    }

    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = mode === 'dark' || (mode !== 'light' && prefersDark);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-body antialiased overflow-hidden">
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <AppSettingsSync />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
