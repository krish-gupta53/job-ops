import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'violet' | 'teal' | 'muted';
  size?: 'xs' | 'sm';
  className?: string;
  dot?: boolean;
}

const variants = {
  default: 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border-[var(--color-border)]',
  success: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
  warning: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
  error:   'bg-red-900/30 text-red-400 border-red-800/40',
  info:    'bg-blue-900/30 text-blue-400 border-blue-800/40',
  violet:  'bg-violet-900/30 text-violet-400 border-violet-800/40',
  teal:    'bg-teal-900/30 text-teal-400 border-teal-800/40',
  muted:   'bg-zinc-800/50 text-zinc-500 border-zinc-700/40',
};

const dotColors = {
  default: 'bg-zinc-500',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error:   'bg-red-400',
  info:    'bg-blue-400',
  violet:  'bg-violet-400',
  teal:    'bg-teal-400',
  muted:   'bg-zinc-600',
};

export function Badge({
  children,
  variant = 'default',
  size = 'xs',
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border font-medium rounded-full',
        size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
}
