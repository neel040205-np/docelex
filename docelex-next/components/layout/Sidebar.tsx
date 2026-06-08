'use strict';
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  School, 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileCheck,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Student Directory', href: '/students', icon: Users },
    { label: 'Register Student', href: '/students/register', icon: UserPlus },
    { label: 'Verification Queue', href: '/verification', icon: FileCheck },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r border-border bg-card text-card-foreground">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <School className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">DocElex</h1>
          <span className="text-xs text-muted-foreground font-medium">School ERP System</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/10"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors duration-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            AD
          </div>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-xs font-bold leading-none truncate">Administrator</h4>
            <span className="text-[10px] text-muted-foreground truncate">admin@docelex.com</span>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
        </div>
      </div>
    </aside>
  );
}
