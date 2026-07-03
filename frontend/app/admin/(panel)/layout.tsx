'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { SidebarNav } from '@/components/admin/sidebar-nav';
import { ChangePasswordDialog } from '@/components/admin/change-password-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeToggle } from '@/components/theme-toggle';
import { Activity, KeyRound, LogOut, Menu, UserCircle, ExternalLink } from 'lucide-react';

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-4 border-b">
      <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
        <Activity className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="font-semibold leading-none">XMonitor</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Admin Panel
        </p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r bg-background shrink-0">
        <SidebarHeader />
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav />
        </div>
        <div className="border-t p-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View public status page
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 gap-2 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarHeader />
                <div className="py-3">
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <UserCircle className="w-5 h-5" />
                    <span className="text-sm">{user?.username ?? '—'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Signed in as {user?.username} ({user?.role})
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setPwOpen(true)}>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Change password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="text-red-500 focus:text-red-500"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-auto">{children}</main>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}
