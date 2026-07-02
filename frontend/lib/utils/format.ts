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

// Get color based on usage percentage
export function getUsageColor(value: number): string {
  if (value >= 80) return 'text-red-500';
  if (value >= 60) return 'text-yellow-500';
  return 'text-green-500';
}

// Get role badge color
export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    entry: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    relay: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    main: 'bg-green-500/10 text-green-500 border-green-500/20',
    standalone: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };
  return colors[role] || colors.standalone;
}

// Get status badge color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    online: 'bg-green-500/10 text-green-500 border-green-500/20',
    offline: 'bg-red-500/10 text-red-500 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };
  return colors[status] || colors.offline;
}