import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, Bungee, Space_Grotesk } from 'next/font/google'
import './globals.css'

const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--font-bungee' })
const shoulders = Big_Shoulders({
  subsets: ['latin'],
  variable: '--font-shoulders',
  fallback: ['Arial Narrow', 'Helvetica Neue Condensed', 'sans-serif'],
  adjustFontFallback: false,
})
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' })

export const metadata: Metadata = {
  title: 'CORNA',
  description: 'Quién va al gimnasio esta semana, y cómo le fue.',
  // Abre a pantalla completa cuando se agrega a la pantalla de inicio.
  appleWebApp: { capable: true, title: 'CORNA', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#e7e1ce',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bungee.variable} ${shoulders.variable} ${grotesk.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
