import { cn } from '@/lib/utils';

// Every status string in the app maps to one of four semantic colors.
// Dot + text is the only status indicator pattern — never a colored badge.
const STATUS_COLOR: Record<string, string> = {
  online: 'bg-emerald-500',
  up: 'bg-emerald-500',
  healthy: 'bg-emerald-500',
  reachable: 'bg-emerald-500',
  connected: 'bg-emerald-500',
  warning: 'bg-amber-500',
  degraded: 'bg-amber-500',
  pending: 'bg-amber-500',
  connecting: 'bg-amber-500',
  offline: 'bg-red-500',
  down: 'bg-red-500',
  error: 'bg-red-500',
  blocked: 'bg-red-500',
  disconnected: 'bg-red-500',
};

const TEXT_COLOR: Record<string, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-500',
  amber: 'text-amber-600 dark:text-amber-500',
  red: 'text-red-600 dark:text-red-500',
  zinc: 'text-zinc-500',
};

function toneFor(status: string): keyof typeof TEXT_COLOR {
  const c = STATUS_COLOR[status.toLowerCase()];
  if (c === 'bg-emerald-500') return 'emerald';
  if (c === 'bg-amber-500') return 'amber';
  if (c === 'bg-red-500') return 'red';
  return 'zinc';
}

interface StatusDotProps {
  status: string;
  /** Show the status text next to the dot (default true) */
  label?: boolean;
  /** Override the displayed text; defaults to the status string */
  text?: string;
  /** Pulse the dot (use for "live"/"online" only) */
  pulse?: boolean;
  /** Color the label to match the dot (default true) */
  colorText?: boolean;
  className?: string;
}

export function StatusDot({
  status,
  label = true,
  text,
  pulse = false,
  colorText = true,
  className,
}: StatusDotProps) {
  const dot = STATUS_COLOR[status.toLowerCase()] ?? 'bg-zinc-400';
  const tone = toneFor(status);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
              dot
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', dot)} />
      </span>
      {label && (
        <span
          className={cn(
            'text-sm capitalize',
            colorText ? TEXT_COLOR[tone] : 'text-foreground'
          )}
        >
          {text ?? status}
        </span>
      )}
    </span>
  );
}
