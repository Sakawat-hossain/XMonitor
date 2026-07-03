// Format uptime seconds to readable string
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Format network speed
export function formatNetwork(mbps: number): string {
  if (mbps >= 1000) return `${(mbps / 1000).toFixed(2)} Gbps`;
  return `${mbps.toFixed(1)} Mbps`;
}

// Usage-threshold text color for a metric value (data viz, on-palette)
export function getUsageColor(value: number): string {
  if (value >= 80) return 'text-red-600 dark:text-red-500';
  if (value >= 60) return 'text-amber-600 dark:text-amber-500';
  return 'text-foreground';
}

// Usage-threshold bar fill color
export function getUsageBar(value: number): string {
  if (value >= 80) return 'bg-red-500';
  if (value >= 60) return 'bg-amber-500';
  return 'bg-emerald-500';
}

// Role → subtle text accent (metadata, not status)
export function getRoleAccent(role: string): string {
  const colors: Record<string, string> = {
    entry: 'text-blue-600 dark:text-blue-500',
    relay: 'text-violet-600 dark:text-violet-500',
    main: 'text-emerald-600 dark:text-emerald-500',
    standalone: 'text-muted-foreground',
  };
  return colors[role] || colors.standalone;
}