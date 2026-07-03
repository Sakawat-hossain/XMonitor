'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Activity, Server, Zap, Globe, Map, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const links = [
    { href: '/', label: t('servers'), icon: Server },
    { href: '/chains', label: t('chains'), icon: Zap },
    { href: '/service-status', label: t('services'), icon: Globe },
    { href: '/map', label: t('map'), icon: Map },
  ];

  return (
    <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold leading-none">XMonitor</h1>
            <p className="text-[11px] text-muted-foreground">{t('tagline')}</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-sm mr-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">{t('live')}</span>
          </div>
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-muted-foreground"
            title={t('admin')}
          >
            <Lock className="w-4 h-4" />
            <span className="hidden md:inline">{t('admin')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
