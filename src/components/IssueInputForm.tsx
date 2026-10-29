'use client';

import React, { useState } from 'react';
import { Search, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface IssueInputFormProps {
  onScan: (url: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export function IssueInputForm({ onScan, isLoading, error }: IssueInputFormProps) {
  const [url, setUrl] = useState('');

  const [clientWarning, setClientWarning] = useState<string | null>(null);

  const sampleIssues = [
    { label: 'React #1000 (Milestone)', url: 'https://github.com/facebook/react/issues/1000' },
    { label: 'Next.js #50000 (App Router)', url: 'https://github.com/vercel/next.js/issues/50000' },
    { label: 'TypeScript #45000 (Compiler)', url: 'https://github.com/microsoft/TypeScript/issues/45000' },
  ];

  const handleInputChange = (val: string) => {
    setUrl(val);
    if (val.includes('/pull/')) {
      setClientWarning('Pull Request URLs are not supported. IssueLift analyzes public GitHub Issues (e.g., /issues/123).');
    } else if (val.trim() && !val.includes('github.com') && (val.startsWith('http://') || val.startsWith('https://'))) {
      setClientWarning('Only public GitHub repositories (github.com) are currently supported.');
    } else {
      setClientWarning(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    if (cleanUrl.includes('/pull/')) {
      setClientWarning('Cannot scan a Pull Request. Please provide a GitHub Issue URL.');
      return;
    }
    setClientWarning(null);
    onScan(cleanUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSelectSample = (sampleUrl: string) => {
    setUrl(sampleUrl);
    setClientWarning(null);
    onScan(sampleUrl);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/20 shadow-card dark:shadow-card-dark transition-all p-2">
          <div className="pl-4 pr-2 text-violet-500 dark:text-violet-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={url}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="GitHub Issue URL"
            placeholder="Paste public GitHub issue URL (e.g. https://github.com/owner/repo/issues/123)"
            className="w-full py-3 px-2 text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-sky-500 hover:from-violet-500 hover:to-sky-400 text-white font-semibold text-xs sm:text-sm shadow-glow hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Compiling...</span>
              </>
            ) : (
              <>
                <span>Scan Issue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Preset sample buttons */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 justify-center text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px] uppercase tracking-wider">Quick Presets:</span>
        {sampleIssues.map((sample) => (
          <button
            key={sample.url}
            type="button"
            disabled={isLoading}
            onClick={() => handleSelectSample(sample.url)}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-midnight-800 hover:bg-slate-200 dark:hover:bg-midnight-750 border border-slate-200 dark:border-midnight-700 hover:border-violet-500/40 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 transition-all cursor-pointer font-mono text-[11px]"
          >
            {sample.label}
          </button>
        ))}
      </div>

      {/* Real-time client-side warning */}
      {clientWarning && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-500/50 text-amber-800 dark:text-amber-200 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-xs sm:text-sm">
            <strong className="font-semibold block mb-0.5 text-amber-900 dark:text-amber-100">URL Input Notice:</strong>
            <p className="leading-relaxed">{clientWarning}</p>
          </div>
        </div>
      )}

      {/* Error state alert */}
      {error && !clientWarning && (
        <div className="mt-4 p-4 rounded-xl bg-coral-50 dark:bg-coral-950/80 border border-coral-200 dark:border-coral-500/50 text-coral-800 dark:text-coral-300 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-coral-600 dark:text-coral-400" />
          <div className="text-xs sm:text-sm">
            <strong className="font-semibold block mb-0.5 text-coral-900 dark:text-coral-200">Scan Notice:</strong>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
