import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Job-Ops — AI Job Search Dashboard',
  description: 'AI-powered job search automation: discover, score, apply, track.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%236366f1'/><text y='22' x='5' font-size='20' fill='white'>🎯</text></svg>",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto" style={{ background: 'var(--color-bg)' }}>
              <div className="p-6 max-w-[1400px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#34d399', secondary: '#0f0f11' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0f0f11' } },
          }}
        />
      </body>
    </html>
  )
}
