import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export function Card({ children, className, hover, onClick, padding = 'md' }: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-sm w-full text-left',
        hover && 'hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-2)] transition-all duration-150 cursor-pointer',
        onClick && 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]',
        paddings[padding],
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-semibold text-[var(--color-text)] font-display', className)}>
      {children}
    </h3>
  );
}
