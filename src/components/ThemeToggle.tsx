'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

export type ThemeMode = 'dark' | 'light' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  const applyTheme = (mode: ThemeMode) => {
    const root = document.documentElement;
    if (mode === 'system') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isSystemDark);
      root.classList.toggle('light', !isSystemDark);
    } else if (mode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('issuelift-theme') as ThemeMode;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setTheme(stored);
        applyTheme(stored);
      } else {
        setTheme('dark');
        applyTheme('dark');
      }
    } catch (_) {}

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const current = localStorage.getItem('issuelift-theme') as ThemeMode;
      if (current === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const handleSetTheme = (newMode: ThemeMode) => {
    setTheme(newMode);
    applyTheme(newMode);
    try {
      localStorage.setItem('issuelift-theme', newMode);
    } catch (_) {}
  };

  return (
    <div
      role="group"
      aria-label="Theme mode switcher"
      className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-midnight-800 border border-slate-200 dark:border-midnight-700 text-xs shadow-inner"
    >
      <button
        type="button"
        onClick={() => handleSetTheme('light')}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-amber-600 shadow-sm font-semibold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Light theme"
        aria-label="Select Light theme"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleSetTheme('dark')}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-midnight-950 text-violet-300 shadow-sm font-semibold border border-violet-500/30'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="Dark theme"
        aria-label="Select Dark theme"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => handleSetTheme('system')}
        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
          theme === 'system'
            ? 'bg-white dark:bg-midnight-950 text-sky-600 dark:text-sky-300 shadow-sm font-semibold'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
        }`}
        title="System preference"
        aria-label="Select System theme"
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
