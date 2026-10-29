'use client';

import React from 'react';
import { CheckCircle2, Loader2, GitPullRequest, FileCode, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { AnalysisStatus } from '@/lib/types';

export type ScanStage = 'idle' | 'fetching_issue' | 'inspecting_repo' | 'reasoning_gemma' | 'claim_gate' | 'complete';

interface ScanProgressBarProps {
  currentStage: ScanStage;
  analysisStatus?: AnalysisStatus;
  fallbackReason?: string;
}

export function ScanProgressBar({
  currentStage,
  analysisStatus = 'idle',
  fallbackReason,
}: ScanProgressBarProps) {
  if (currentStage === 'idle') return null;

  const isFallback = analysisStatus === 'baseline_fallback';

  const stages = [
    {
      id: 'fetching_issue',
      label: 'Fetch Issue',
      desc: 'Live metadata & comments',
      icon: GitPullRequest,
    },
    {
      id: 'inspecting_repo',
      label: 'Inspect Repo',
      desc: 'Bounded tree & setup docs',
      icon: FileCode,
    },
    {
      id: 'reasoning_gemma',
      label: isFallback ? 'Baseline Fallback' : 'Gemma 4 Reasoning',
      desc: isFallback ? (fallbackReason ? 'Fallback applied' : 'Deterministic derivation') : 'Contract & trace derivation',
      icon: isFallback ? AlertCircle : Sparkles,
      fallback: isFallback,
    },
    {
      id: 'claim_gate',
      label: 'Claim Gate',
      desc: 'Deterministic path validation',
      icon: ShieldCheck,
    },
  ];

  const getStageStatus = (stageId: string) => {
    const stageOrder = ['fetching_issue', 'inspecting_repo', 'reasoning_gemma', 'claim_gate', 'complete'];
    const currentIndex = stageOrder.indexOf(currentStage);
    const targetIndex = stageOrder.indexOf(stageId);

    if (currentIndex > targetIndex) return 'complete';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  const getHeaderBadge = () => {
    if (currentStage !== 'complete') {
      return (
        <span className="text-[11px] font-mono font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 rounded-full">
          Executing Scan...
        </span>
      );
    }

    if (isFallback) {
      return (
        <span className="text-[11px] font-mono font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Baseline result — guardrails passed</span>
        </span>
      );
    }

    return (
      <span className="text-[11px] font-mono font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        <span>Gemma 4 Live — Analysis Verified</span>
      </span>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 p-5 sm:p-6 rounded-2xl bg-midnight-800/90 border border-midnight-700 shadow-card-dark">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Autonomous Analysis Pipeline
        </h3>
        {getHeaderBadge()}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stages.map((stage) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isStageFallback = stage.fallback && status === 'complete';

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border transition-all ${
                isStageFallback
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  : status === 'complete'
                  ? 'bg-teal-950/40 border-teal-500/40 text-teal-300'
                  : status === 'active'
                  ? 'bg-midnight-750 border-violet-500 shadow-glow text-slate-100 ring-2 ring-violet-500/20'
                  : 'bg-midnight-900/40 border-midnight-700/50 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon
                  className={`w-4 h-4 ${
                    isStageFallback
                      ? 'text-amber-400'
                      : status === 'complete'
                      ? 'text-teal-400'
                      : status === 'active'
                      ? 'text-violet-400'
                      : 'text-slate-600'
                  }`}
                />
                {isStageFallback ? (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Fallback
                  </span>
                ) : status === 'complete' ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                ) : status === 'active' ? (
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                ) : null}
              </div>
              <p className="font-semibold text-xs sm:text-sm">{stage.label}</p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight mt-0.5">{stage.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
