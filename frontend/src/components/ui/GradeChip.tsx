import { cn } from '@/lib/utils';
import { getGradeConfig } from '@/lib/utils';
import type { JobGrade } from '@/types';

interface GradeChipProps {
  grade: JobGrade;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function GradeChip({ grade, score, size = 'md', showScore = false }: GradeChipProps) {
  const cfg = getGradeConfig(grade);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn(
          'flex items-center justify-center rounded-lg font-bold ring-1 font-display shrink-0',
          cfg.color,
          cfg.bg,
          cfg.ring,
          sizes[size]
        )}
        title={`Grade ${cfg.label}${score != null ? ` — Score: ${score.toFixed(1)}/5` : ''}`}
      >
        {cfg.label}
      </div>
      {showScore && score != null && (
        <span className="text-xs text-[var(--color-text-faint)] tabular-nums">
          {score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
