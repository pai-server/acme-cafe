import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/auth-queries';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Acme Cafes',
  description: 'Suscripciones de café de especialidad, directo a tu puerta.'
};

export const viewport: Viewport = {
  themeColor: 'light'
};

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope'
});

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const team = await getTeamForUser();
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <SWRConfig
          value={{
            fallback: {
              '/api/user': user,
              '/api/team': team
            }
          }}
        >
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
          />
        </SWRConfig>
      </body>
    </html>
  );
}
