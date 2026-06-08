'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, CloudLightning, HelpCircle } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    if (pathname === '/') return 'Overview Analytics';
    if (pathname === '/students') return 'Student Directory';
    if (pathname === '/students/register') return 'Register New Student';
    if (pathname.startsWith('/students/') && pathname.endsWith('/edit')) return 'Edit Student Profile';
    if (pathname.startsWith('/students/')) return 'Student Master Profile';
    if (pathname === '/verification') return 'Verification Workflow Queue';
    return 'DocElex Admin Console';
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-background px-8 shadow-xs">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">{getPageTitle()}</h2>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-6">
        {/* System Time */}
        <div className="hidden text-sm font-semibold text-muted-foreground md:block bg-muted px-3 py-1 rounded-md border border-border">
          System Time: <span className="font-mono text-foreground">{time}</span>
        </div>

        {/* Database status */}
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Atlas Cloud Sync
        </div>

        {/* Help and Notifications */}
        <div className="flex items-center gap-2 border-l border-border pl-6">
          <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200">
            <HelpCircle className="h-5 w-5" />
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
