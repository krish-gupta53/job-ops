'use client';

import { usePathname } from 'next/navigation';
import { Bell, ExternalLink } from 'lucide-react';

const titles: Record<string, { title: string; description: string }> = {
  '/dashboard':    { title: 'Dashboard',         description: 'Your job search at a glance' },
  '/jobs':         { title: 'Job Feed',           description: 'AI-scored opportunities ranked for you' },
  '/resumes':      { title: 'Resume Variants',    description: 'Tailored resumes per job — auto-generated' },
  '/applications': { title: 'Application Pipeline', description: 'Track every application end-to-end' },
  '/scanner':      { title: 'Job Scanner',        description: 'Automated discovery from 10+ company portals' },
  '/profile':      { title: 'Your Profile',       description: 'Skills, preferences, and master resume' },
};

export function TopBar() {
  const pathname = usePathname();
  const base = '/' + (pathname.split('/')[1] || '');
  const info = titles[base] ?? { title: 'Job-Ops', description: '' };

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[var(--color-text)] font-display leading-none">
            {info.title}
          </h1>
          <p className="text-xs text-[var(--color-text-faint)] mt-0.5 truncate">{info.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
        >
          <ExternalLink size={11} />
          Gemini API
        </a>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)] transition-all"
          aria-label="Notifications"
        >
          <Bell size={15} />
        </button>
      </div>
    </header>
  );
}
