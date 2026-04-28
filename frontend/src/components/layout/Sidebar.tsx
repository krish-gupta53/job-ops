'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Send,
  Radar,
  User,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/jobs',         label: 'Jobs',         icon: Briefcase },
  { href: '/resumes',      label: 'Resumes',      icon: FileText },
  { href: '/applications', label: 'Pipeline',     icon: Send },
  { href: '/scanner',      label: 'Scanner',      icon: Radar },
  { href: '/profile',      label: 'Profile',      icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-56 h-screen shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)] shrink-0">
          <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-label="Job-Ops logo">
            <path d="M12 2L3 7l9 5 9-5-9-5z" fill="rgba(13,14,16,0.9)" />
            <path d="M3 12l9 5 9-5" stroke="rgba(13,14,16,0.9)" strokeWidth="2" strokeLinecap="round" />
            <path d="M3 17l9 5 9-5" stroke="rgba(13,14,16,0.7)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--color-text)] leading-none tracking-tight font-display">
            Job-Ops
          </p>
          <p className="text-xs text-[var(--color-text-faint)] mt-0.5">AI Search Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5" role="list">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]'
                  )}
                >
                  <Icon
                    size={16}
                    className={cn(
                      'shrink-0',
                      active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-faint)]'
                    )}
                  />
                  <span className="truncate">{label}</span>
                  {active && (
                    <ChevronRight size={12} className="ml-auto shrink-0 text-[var(--color-primary)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-[var(--color-primary)] shrink-0" />
          <span className="text-xs text-[var(--color-text-faint)]">
            Powered by Gemini Flash
          </span>
        </div>
      </div>
    </aside>
  );
}
