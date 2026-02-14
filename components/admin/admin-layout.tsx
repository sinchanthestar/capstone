'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Users,
  Clock,
  LogOut,
  Menu,
  Home,
  CheckCircle2,
  ChevronDown,
  Settings,
  Bell,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { SidebarItem } from './sidebar-item';
import { NotificationsPanel } from '@/components/shared/notifications-panel';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error('Session error:', error);
        router.push('/login');
      }
    };

    fetchSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-flex gap-2 mb-4">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-muted-foreground">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-20'
          } bg-gradient-to-b from-sidebar to-sidebar/95 text-sidebar-foreground transition-all duration-300 border-r border-sidebar-border hidden md:flex flex-col justify-between shadow-xl`}
      >
        <div>
          <div className="p-6 border-b border-sidebar-border/50 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sidebar-primary/30">
              <Clock className="h-6 w-6 text-sidebar-primary" />
            </div>
            <h1 className={`font-bold text-lg tracking-tight ${!sidebarOpen && 'hidden'}`}>
              Shift Manager
            </h1>
          </div>

          <nav className="flex-1 space-y-0 mt-6">
            <div className={`px-6 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 ${sidebarOpen ? '' : 'hidden'}`}>
              Menu
            </div>
            <SidebarItem icon={Home} label="Beranda" href="/admin" open={sidebarOpen} />
            <SidebarItem icon={Clock} label="Shift" href="/admin/shifts" open={sidebarOpen} />
            <SidebarItem icon={Users} label="Karyawan" href="/admin/employees" open={sidebarOpen} />
            <SidebarItem icon={Calendar} label="Jadwal" href="/admin/schedule" open={sidebarOpen} />
            <SidebarItem icon={CheckCircle2} label="Kehadiran" href="/admin/attendance" open={sidebarOpen} />
            <SidebarItem icon={FileText} label="Pengajuan Izin" href="/admin/leave-requests" open={sidebarOpen} />
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-2 hover:bg-sidebar-accent/20 rounded-lg transition-colors text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            <Menu size={20} className="mx-auto" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border/50 h-16 flex items-center justify-between px-6 sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors md:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold">Dashboard Admin</h2>
              <p className="text-xs text-muted-foreground">Selamat datang, {user.fullName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationsPanel />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 hover:bg-muted">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{user.fullName}</span>
                    <span className="text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrator' : user.role}</span>
                  </div>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm font-semibold">{user.fullName}</div>
                <div className="px-2 py-1 text-xs text-muted-foreground">{user.email}</div>
                <div className="my-2 border-t border-border"></div>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Pengaturan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-background to-accent/5">
          {children}
        </main>
      </div>
    </div>
  );
}

