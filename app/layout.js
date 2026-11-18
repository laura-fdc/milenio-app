import './globals.css';
import SwRegister from '@/components/SwRegister';

export const metadata = {
  title: 'Milenio Club Patín',
  description: 'Gestión de socios, grupos y asistencia del Milenio Club Patín',
  applicationName: 'Milenio',
  appleWebApp: { capable: true, title: 'Milenio', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: '#F28C28',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
