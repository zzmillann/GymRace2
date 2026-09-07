import type { Metadata, Viewport } from 'next';
import { Inter, Fredoka } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Paywall } from '@/components/ui/Paywall';
import { ReminderScheduler } from '@/components/ui/ReminderScheduler';
import { ThemeApplier } from '@/components/ui/ThemeApplier';
import { SpotifySync } from '@/components/ui/SpotifySync';
import { SocialNotifier } from '@/components/ui/SocialNotifier';

// Misma escala que evolve.es: cuerpo en 400, 500 para énfasis (es el peso
// que más usan), 600 para títulos y 300 para texto de apoyo.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
});

// Tipografía de titulares: redondeada y con cuerpo, para dar un aire más
// simpático a los títulos. El cuerpo del texto sigue en Inter.
const display = Fredoka({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

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
      <body className={`${inter.variable} ${display.variable} ${inter.className} bg-app text-content antialiased selection:bg-surface-2`}>
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
