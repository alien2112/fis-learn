import type { Metadata } from 'next';
import {
  Changa,
  Fraunces,
  IBM_Plex_Mono,
  IBM_Plex_Sans_Arabic,
  Inter,
  Saira_Condensed,
  Space_Grotesk,
} from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-lab', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-studio', display: 'swap' });
const saira = Saira_Condensed({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-arena',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-mono',
  display: 'swap',
});
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ar',
  display: 'swap',
});
const changa = Changa({
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-ar-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FIS Learn - E-Learning Platform',
    template: '%s | FIS Learn',
  },
  description: 'Your gateway to quality online education. Learn from expert instructors and advance your career.',
  keywords: ['e-learning', 'online courses', 'education', 'learning platform'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body
        className={[
          inter.className,
          inter.variable,
          spaceGrotesk.variable,
          fraunces.variable,
          saira.variable,
          plexMono.variable,
          plexArabic.variable,
          changa.variable,
        ].join(' ')}
      >
        {children}
      </body>
    </html>
  );
}
