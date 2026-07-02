'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Server,
  Link2,
  Globe,
  Bell,
  Clock,
  Send,
  Radar,
  Users,
  Settings,
  ScrollText,
} from 'lucide-react';

export const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/servers', label: 'Servers', icon: Server },
  { href: '/admin/chains', label: 'Chains', icon: Link2 },
  { href: '/admin/services', label: 'Services', icon: Globe },
  { href: '/admin/alerts', label: 'Alerts', icon: Bell },
  { href: '/admin/cron', label: 'Cron Tasks', icon: Clock },
  { href: '/admin/notifications', label: 'Notifications', icon: Send },
  { href: '/admin/probes', label: 'Probes', icon: Radar },
  { href: '/admin/users', label: 'Users & Tokens', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-2">
      {adminNavItems.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
