export default function manifest() {
  return {
    name: 'Milenio Club Patín',
    short_name: 'Milenio',
    description: 'Socios, grupos y asistencia del Milenio Club Patín',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFF8EF',
    theme_color: '#F28C28',
    lang: 'es',
    icons: [
      { src: '/app-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/app-icon/512?maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
