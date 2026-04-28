import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-[var(--color-text-inverse)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] font-semibold shadow-sm',
  secondary:
    'bg-[var(--color-surface-offset)] text-[var(--color-text)] hover:bg-[var(--color-surface-dynamic)] border border-[var(--color-border)]',
  ghost:
    'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]',
  danger:
    'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/40',
  outline:
    'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]',
};

const sizes: Record<Size, string> = {
  xs: 'h-6 px-2 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-10 px-5 text-sm gap-2 rounded-lg',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] focus-visible:outline-offset-2 whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
