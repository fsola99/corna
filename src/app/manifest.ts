import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CORNA',
    short_name: 'CORNA',
    description: 'Quién va al gimnasio esta semana, y cómo le fue.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#101513',
    theme_color: '#101513',
    lang: 'es-AR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
