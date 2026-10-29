'use client';

import React from 'react';
import { ContributionContract } from '@/lib/types';
import { ExternalLink, Clock, GitBranch, User, Tag, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface IssueOverviewCardProps {
  contract: ContributionContract;
}

export function IssueOverviewCard({ contract }: IssueOverviewCardProps) {
  const meta = contract.issue_metadata;
  const gate = contract.readiness_gate;

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'ACTIONABLE':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/60',
          border: 'border-teal-300 dark:border-teal-500/40',
          text: 'text-teal-900 dark:text-teal-200',
          badge: 'bg-teal-600 text-white dark:bg-teal-500 dark:text-midnight-950',
          icon: CheckCircle,
        };
      case 'CLARIFY FIRST':
        return {
          bg: 'bg-coral-50 dark:bg-coral-950/60',
          border: 'border-coral-300 dark:border-coral-500/40',
          text: 'text-coral-900 dark:text-coral-200',
          badge: 'bg-coral-600 text-white dark:bg-coral-500 dark:text-white',
          icon: AlertTriangle,
        };
      case 'EVIDENCE-LIMITED':
      default:
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          border: 'border-amber-300 dark:border-amber-500/40',
          text: 'text-amber-900 dark:text-amber-200',
          badge: 'bg-amber-500 text-slate-950 dark:bg-amber-500 dark:text-midnight-950',
          icon: ShieldAlert,
        };
    }
  };

  const style = getVerdictStyle(gate.verdict);
  const VerdictIcon = style.icon;

  return (
    <div className="w-full bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700 rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-7 space-y-6">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-midnight-700/80">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                meta.state === 'open'
                  ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                  : 'bg-coral-500/10 text-coral-700 dark:text-coral-300 border border-coral-500/30'
              }`}
            >
              {meta.state}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {meta.owner}/{meta.repo} #{meta.number}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Checked {new Date(meta.checked_at).toLocaleTimeString()}
            </span>
          </div>

          <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <a
              href={meta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors flex items-center gap-1.5"
            >
              <span>{meta.title}</span>
              <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
            </a>
          </h2>
        </div>

        {/* Readiness Gate Badge */}
        <div className={`p-4 rounded-xl border ${style.bg} ${style.border} ${style.text} max-w-sm shrink-0`}>
          <div className="flex items-center gap-2 mb-1.5">
            <VerdictIcon className="w-4 h-4 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Readiness Gate:</span>
            <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${style.badge}`}>
              {gate.verdict}
            </span>
          </div>
          <ul className="text-xs space-y-1 mt-2">
            {gate.reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-1.5 leading-snug">
                <span className="text-slate-400 dark:text-slate-500">•</span>
                <span className="text-slate-700 dark:text-slate-300">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Meta tags and signals */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Author:</span>
          <a
            href={meta.author.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-800 dark:text-slate-200 hover:text-violet-600 dark:hover:text-violet-300"
          >
            @{meta.author.login}
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Assignee:</span>
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {meta.assignees.length > 0
              ? meta.assignees.map((a) => `@${a.login}`).join(', ')
              : 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Branch:</span>
          <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">{meta.default_branch}</span>
        </div>

        {meta.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            {meta.labels.map((l) => (
              <span
                key={l.name}
                className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 dark:bg-midnight-900 border border-slate-200 dark:border-midnight-700 text-slate-700 dark:text-slate-300"
              >
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Executive Summary & Expected Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/80">
          <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Issue Summary
          </h4>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{contract.issue_summary}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/80">
          <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Expected Outcome (Definition of Done)
          </h4>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{contract.expected_outcome}</p>
        </div>
      </div>
    </div>
  );
}
