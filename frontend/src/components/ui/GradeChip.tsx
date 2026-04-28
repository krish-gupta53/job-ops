import { cn, gradeColor } from '@/lib/utils'

interface GradeChipProps {
  grade?: string
  score?: number
  size?: 'sm' | 'md' | 'lg'
}

export function GradeChip({ grade, score, size = 'md' }: GradeChipProps) {
  if (!grade) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded border text-xs font-mono font-bold"
      style={{ color: 'var(--color-text-faint)', borderColor: 'var(--color-border)', background: 'var(--color-surface-offset)' }}>
      —
    </span>
  )

  const sizes = { sm: 'text-xs px-1.5 py-0.5', md: 'text-sm px-2.5 py-0.5', lg: 'text-base px-3 py-1' }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded border font-mono font-bold',
      sizes[size],
      gradeColor(grade)
    )}>
      {grade}
      {score !== undefined && (
        <span className="font-sans font-normal text-xs opacity-70">{score.toFixed(1)}</span>
      )}
    </span>
  )
}
