'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Terminal, BookOpen, HelpCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ConfigStatus, AnalysisStatus } from '@/lib/types';

export type ActiveView = 'scanner' | 'how-it-works' | 'proofbench' | 'playbook';

export type EngineStatus =
  | 'checking'
  | 'live'
  | 'ready'
  | 'missing_key'
  | 'fallback'
  | 'analysis_failed'
  | 'running'
  | 'server_error';

interface HeaderProps {
  activeView?: ActiveView;
  onSelectView?: (view: ActiveView) => void;
  configStatus?: ConfigStatus;
  analysisStatus?: AnalysisStatus;
  fallbackReason?: string;
  isGemmaActive?: boolean;
}

export function Header({
  activeView = 'scanner',
  onSelectView,
  configStatus: propConfigStatus,
  analysisStatus = 'idle',
  fallbackReason,
  isGemmaActive = false,
}: HeaderProps) {
  const [internalConfigStatus, setInternalConfigStatus] = useState<ConfigStatus>('checking');
  const [modelName, setModelName] = useState<string>('gemma-4-26b-a4b-it');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error('Health check error');
        return res.json();
      })
      .then((data) => {
        if (data?.gemma?.model) {
          setModelName(data.gemma.model);
        }
        if (data?.gemma?.configured) {
          setInternalConfigStatus('configured');
        } else {
          setInternalConfigStatus('missing');
        }
      })
      .catch(() => {
        setInternalConfigStatus('unavailable');
      });
  }, []);

  const configStatus = propConfigStatus || internalConfigStatus;

  // Determine truthful engine display status
  let engineStatus: EngineStatus = 'checking';

  if (analysisStatus === 'gemma_success') {
    engineStatus = 'live';
  } else if (analysisStatus === 'baseline_fallback') {
    engineStatus = 'fallback';
  } else if (analysisStatus === 'analysis_failed') {
    engineStatus = 'analysis_failed';
  } else if (analysisStatus === 'running') {
    engineStatus = 'running';
  } else if (isGemmaActive) {
    engineStatus = 'live';
  } else {
    // Idle / pre-scan state: show configuration reality
    if (configStatus === 'configured') {
      engineStatus = 'ready';
    } else if (configStatus === 'missing') {
      engineStatus = 'missing_key';
    } else if (configStatus === 'unavailable') {
      engineStatus = 'server_error';
    } else {
      engineStatus = 'checking';
    }
  }

  const handleNav = (view: ActiveView) => {
    if (onSelectView) {
      onSelectView(view);
    } else {
      if (view === 'scanner') {
        window.location.href = '/';
      } else if (view === 'how-it-works') {
        window.location.href = '/how-it-works';
      } else if (view === 'proofbench') {
        window.location.href = '/proofbench';
      } else if (view === 'playbook') {
        window.location.href = '/#how-it-works';
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-midnight-900/90 backdrop-blur-md border-b border-slate-200 dark:border-midnight-700/80 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNav('scanner')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-sky-500 to-teal-400 p-[1px] shadow-sm dark:shadow-glow">
              <div className="w-full h-full bg-slate-50 dark:bg-midnight-900 rounded-[11px] flex items-center justify-center text-teal-600 dark:text-teal-300 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                  IssueLift
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                  v1.3
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* View Switcher Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleNav('scanner')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeView === 'scanner'
                ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
            }`}
          >
            Scanner
          </button>

          <Link
            href="/how-it-works"
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'how-it-works'
                ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-violet-500" />
            <span>How It Works</span>
          </Link>

          <button
            onClick={() => handleNav('proofbench')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'proofbench'
                ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
            <span>ProofBench</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-500/30">
              7
            </span>
          </button>

          <button
            onClick={() => handleNav('playbook')}
            className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer hidden md:flex items-center gap-1.5 ${
              activeView === 'playbook'
                ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/30 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Playbook</span>
          </button>
        </nav>

        {/* Right side controls: Engine Status & Theme Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Engine Status Badge */}
          {engineStatus === 'checking' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-slate-100 dark:bg-midnight-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-midnight-700">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
              <span className="hidden sm:inline">Checking Engine...</span>
            </span>
          )}

          {engineStatus === 'live' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/40 shadow-sm dark:shadow-glow-teal">
              <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse" />
              <span className="hidden sm:inline">Gemma 4 Live</span>
              <span className="sm:hidden font-mono text-[10px]">Live</span>
            </span>
          )}

          {engineStatus === 'ready' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-500/40">
              <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400" />
              <span className="hidden sm:inline">Gemma 4 Ready</span>
              <span className="sm:hidden font-mono text-[10px]">Ready</span>
            </span>
          )}

          {engineStatus === 'fallback' && (
            <span
              title={fallbackReason || 'Gemma inference unavailable; deterministic baseline compiler used'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span className="hidden sm:inline">Baseline Fallback</span>
              <span className="sm:hidden font-mono text-[10px]">Fallback</span>
            </span>
          )}

          {engineStatus === 'missing_key' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" />
              <span className="hidden sm:inline">Baseline Active</span>
              <span className="sm:hidden font-mono text-[10px]">Baseline</span>
            </span>
          )}

          {engineStatus === 'running' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-500/40">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-spin" />
              <span className="hidden sm:inline">Analyzing...</span>
              <span className="sm:hidden font-mono text-[10px]">Scan</span>
            </span>
          )}

          {engineStatus === 'analysis_failed' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-coral-50 dark:bg-coral-950/60 text-coral-800 dark:text-coral-300 border border-coral-300 dark:border-coral-500/40">
              <span className="w-2 h-2 rounded-full bg-coral-500" />
              <span className="hidden sm:inline">Analysis Failed</span>
              <span className="sm:hidden font-mono text-[10px]">Failed</span>
            </span>
          )}

          {engineStatus === 'server_error' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-midnight-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-midnight-700">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="hidden sm:inline">Status Unavailable</span>
              <span className="sm:hidden font-mono text-[10px]">Unavailable</span>
            </span>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
