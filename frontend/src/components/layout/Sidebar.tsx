'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Briefcase, FileText, ClipboardList,
  Radar, User, ChevronLeft, ChevronRight, Zap
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/jobs',         icon: Briefcase,        label: 'Jobs' },
  { href: '/resumes',      icon: FileText,         label: 'Resumes' },
  { href: '/applications', icon: ClipboardList,    label: 'Pipeline' },
  { href: '/scanner',      icon: Radar,            label: 'Scanner' },
  { href: '/profile',      icon: User,             label: 'Profile' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col border-r transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-56'
      )}
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-5 border-b shrink-0',
          collapsed && 'justify-center px-0'
        )}
        style={{ borderColor: 'var(--color-divider)' }}
      >
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: 'var(--color-primary)', boxShadow: '0 0 16px oklch(from var(--color-primary) l c h / 0.4)' }}
        >
          <Zap size={16} color="white" fill="white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>
            Job<span style={{ color: 'var(--color-primary)' }}>Ops</span>
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-0' : '',
                active
                  ? 'text-white'
                  : 'hover:text-[var(--color-text)]'
              )}
              style={{
                color: active ? 'white' : 'var(--color-text-muted)',
                background: active ? 'var(--color-primary)' : 'transparent',
                boxShadow: active ? '0 0 12px oklch(from var(--color-primary) l c h / 0.3)' : 'none',
              }}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'flex items-center justify-center m-2 p-2 rounded-lg transition-all duration-150 text-sm',
          collapsed ? 'mx-auto w-8' : 'gap-2'
        )}
        style={{
          color: 'var(--color-text-muted)',
          background: 'var(--color-surface-offset)',
          border: '1px solid var(--color-border)',
        }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
      </button>
    </aside>
  )
}
