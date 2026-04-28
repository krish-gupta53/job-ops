import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Job-Ops — AI Job Search Platform',
  description: 'Discover jobs, score matches, tailor resumes, and track applications — powered by Gemini AI.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230d9488'/><text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-weight='700' font-size='18' fill='white'>J</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 page-enter">
            {children}
          </main>
        </div>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--color-surface-offset)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
            },
            success: { iconTheme: { primary: '#2dd4bf', secondary: '#0d0e10' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0d0e10' } },
          }}
        />
      </body>
    </html>
  );
}
