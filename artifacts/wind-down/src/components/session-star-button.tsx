import { Star } from 'lucide-react';

export function SessionStarButton({
  sessionId,
  isStarred,
  disabled = false,
  showLabel = false,
  onToggle,
}: {
  sessionId: string;
  isStarred: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  onToggle: () => void;
}) {
  const label = isStarred ? 'Remove star from session' : 'Star session';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isStarred}
      title={label}
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-50 ${
        isStarred
          ? 'border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]'
          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]'
      }`}
      data-testid={`button-star-session-${sessionId}`}
    >
      <Star size={17} fill={isStarred ? 'currentColor' : 'none'} />
      {showLabel && <span>{isStarred ? 'Starred' : 'Star'}</span>}
    </button>
  );
}
