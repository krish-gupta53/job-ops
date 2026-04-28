'use client'
import { usePathname } from 'next/navigation'
import { Sun, Moon, ExternalLink } from 'lucide-react'
import { useState, useEffect } from 'react'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':    { title: 'Dashboard',     subtitle: 'Your job search at a glance' },
  '/jobs':         { title: 'Job Feed',       subtitle: 'AI-scored opportunities' },
  '/resumes':      { title: 'Resumes',        subtitle: 'Tailored resume variants' },
  '/applications': { title: 'Pipeline',       subtitle: 'Track every application' },
  '/scanner':      { title: 'Scanner',        subtitle: 'Auto-discover new jobs' },
  '/profile':      { title: 'Profile',        subtitle: 'Your skills & preferences' },
}

export default function TopBar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const page = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || (key !== '/dashboard' && pathname.startsWith(key))
  )
  const info = page?.[1] ?? { title: 'Job-Ops', subtitle: '' }

  return (
    <header
      className="flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        minHeight: '64px',
      }}
    >
      <div>
        <h1 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
          {info.title}
        </h1>
        {info.subtitle && (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {info.subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-all duration-150"
          style={{
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-offset)',
            border: '1px solid var(--color-border)',
          }}
        >
          <ExternalLink size={12} />
          API Docs
        </a>

        <button
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-150"
          style={{
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-offset)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
