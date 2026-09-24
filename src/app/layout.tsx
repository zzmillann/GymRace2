import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Paywall } from '@/components/ui/Paywall';
import { ReminderScheduler } from '@/components/ui/ReminderScheduler';
import { ThemeApplier } from '@/components/ui/ThemeApplier';
import { SpotifySync } from '@/components/ui/SpotifySync';
import { SocialNotifier } from '@/components/ui/SocialNotifier';

// Sistema de diseño Locodea bronce: una sola familia, DM Sans. Texto en 400,
// énfasis, botones y titulares en 500; 600 solo para el logotipo.
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

export const viewport: Viewport = {
  themeColor: '#F8F4EE',
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
    statusBarStyle: 'default',
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
    <html lang="es" className="light" data-accent="bronze" data-palette="locodea">
      <body className={`${dmSans.variable} ${dmSans.className} bg-app text-content antialiased selection:bg-surface-2`}>
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
