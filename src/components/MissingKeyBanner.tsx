'use client';

import React, { useState } from 'react';
import { KeyRound, ChevronDown, ChevronUp, Copy, Check, ExternalLink, X } from 'lucide-react';

interface MissingKeyBannerProps {
  onDismiss?: () => void;
}

export function MissingKeyBanner({ onDismiss }: MissingKeyBannerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const envLine = 'GEMMA_API_KEY=your_api_key_here';

  const handleCopy = () => {
    navigator.clipboard.writeText(envLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/30">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-amber-950 dark:text-amber-200">
              Gemma 4 API Key Pending — Baseline Compiler Active
            </h4>
            <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Deterministic GitHub intake, Claim Gate, TraceMap, and ProofBundle run offline. Configure your free key to activate Gemma 4 reasoning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
          >
            <span>Setup Guide</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-400/80 hover:text-amber-950 dark:hover:text-amber-200 transition-colors"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-amber-300 dark:border-amber-500/20 text-xs space-y-2.5 animate-in fade-in">
          <p className="text-amber-900 dark:text-amber-200 text-[11px] sm:text-xs">
            Add your Google AI Studio free-tier key to <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-midnight-900 font-mono text-[11px] text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-midnight-700">.env.local</code> in the IssueLift project root:
          </p>

          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-100/70 dark:bg-midnight-900/90 border border-amber-300 dark:border-midnight-700 font-mono text-xs text-amber-900 dark:text-amber-300">
            <span>{envLine}</span>
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-amber-200/60 dark:hover:bg-midnight-800 text-amber-800 dark:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy snippet"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px] font-sans font-medium">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-amber-800 dark:text-amber-400/90">
            <span>• Free tier on Google AI Studio.</span>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-violet-700 dark:text-violet-400 hover:text-violet-900 dark:hover:text-violet-300 underline"
            >
              Get Free Gemma Key <ExternalLink className="w-3 h-3" />
            </a>
            <span>• Kept server-side; never committed to git.</span>
          </div>
        </div>
      )}
    </div>
  );
}
