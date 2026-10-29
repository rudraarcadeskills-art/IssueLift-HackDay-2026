import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-midnight-700/80 bg-white/80 dark:bg-midnight-950/80 py-12 mt-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center text-white shadow-sm dark:shadow-glow">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 dark:text-slate-100 tracking-tight">IssueLift</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30">
                Hacktoberfest 2026
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
              Before a newcomer edits code, IssueLift converts a real GitHub issue into an evidence-backed
              Contribution Contract, maps criteria to test evidence, and produces a reviewable Maintainer Handoff.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong className="text-slate-800 dark:text-slate-300">Core Invariant:</strong> Gemma proposes; deterministic code verifies. Never executes scanned repository code.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">Product & Engine</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/" className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors">
                  Issue Scanner
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors">
                  How It Works Guide
                </Link>
              </li>
              <li>
                <Link href="/proofbench" className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  ProofBench Suite (7 Fixtures)
                </Link>
              </li>
              <li>
                <a href="/api/health" target="_blank" className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors font-mono text-xs">
                  Engine Health (/api/health)
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Open Innovation</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <a href="https://github.com/google/gemma" target="_blank" rel="noopener noreferrer" className="hover:text-violet-300 transition-colors">
                  Gemma 4 Open Weights
                </a>
              </li>
              <li>
                <a href="https://hacktoberfest.com" target="_blank" rel="noopener noreferrer" className="hover:text-violet-300 transition-colors">
                  Hacktoberfest 2026
                </a>
              </li>
              <li>
                <span className="inline-block px-2.5 py-1 text-xs rounded-lg bg-teal-950/60 text-teal-300 font-medium border border-teal-500/40">
                  MIT License (100% Original Code)
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-midnight-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© 2026 IssueLift Contributors. Open-source contribution verification architecture.</p>
          <p className="flex items-center gap-1">
            Built with Next.js, Tailwind, and Gemma 4
          </p>
        </div>
      </div>
    </footer>
  );
}
