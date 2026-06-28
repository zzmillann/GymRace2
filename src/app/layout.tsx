import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Paywall } from '@/components/ui/Paywall';
import { ReminderScheduler } from '@/components/ui/ReminderScheduler';
import { ThemeApplier } from '@/components/ui/ThemeApplier';
import { SpotifySync } from '@/components/ui/SpotifySync';
import { SocialNotifier } from '@/components/ui/SocialNotifier';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Crucial para que el usuario en iOS no haga zoom accidental
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'GymRace',
  description: 'Progresión y Hábitos de élite',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'GymRace',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png', // CRÍTICO: El icono cuando añades a inicio
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-app text-content antialiased selection:bg-surface-2`}>
        <main className="min-h-screen safe-area-ios pb-20">
          {children}
        </main>
        <ThemeApplier />
        <Paywall />
        <ReminderScheduler />
        <SpotifySync />
        <SocialNotifier />
      </body>
    </html>
  );
}
