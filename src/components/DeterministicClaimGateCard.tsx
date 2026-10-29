'use client';

import React from 'react';
import { ContributionContract } from '@/lib/types';
import { ShieldCheck, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

interface DeterministicClaimGateCardProps {
  contract: ContributionContract;
}

export function DeterministicClaimGateCard({ contract }: DeterministicClaimGateCardProps) {
  const audit = contract.claim_gate_audit;
  const boundaries = contract.scan_boundaries;

  // Truthful metrics distinction
  const inspectedSourcesCount = contract.sources.filter(
    (s) => s.verified_exists && s.source_id !== 'repo-tree'
  ).length;

  const candidateSourcePaths = new Set(
    contract.criteria.flatMap((c) => c.candidate_implementation_files.map((f) => f.path))
  );

  const testEvidencePaths = new Set(
    contract.criteria.flatMap((c) => c.test_evidence.candidate_test_files.map((t) => t.path))
  );

  const manifestCommandsCount = [
    contract.setup_truth.install_command,
    contract.setup_truth.test_command,
    contract.setup_truth.run_command,
  ].filter(Boolean).length;

  return (
    <div className="w-full bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700 rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-midnight-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Deterministic Claim Gate & Truth Ledger
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-semibold">
              Guardrails Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gemma proposes candidate files and criteria; deterministic code validates paths against GitHub tree.
          </p>
        </div>

        <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-midnight-900 border border-slate-200 dark:border-midnight-700 text-slate-700 dark:text-slate-300">
          Engine: {contract.analysis_status === 'gemma_success' ? `Gemma 4 (${contract.model_id})` : contract.analysis_status === 'baseline_fallback' ? 'Baseline Compiler (Gemma Fallback)' : 'Baseline Compiler'}
        </div>
      </div>

      {/* Truthful Metrics Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Repo Tree Files</p>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {boundaries.total_files_in_tree.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {boundaries.is_tree_truncated ? 'Truncated by API' : 'Indexed in tree'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Inspected Sources</p>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
            <span>{inspectedSourcesCount}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Contents fetched</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Candidate Sources</p>
          <p className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
            {candidateSourcePaths.size}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Inferred relevant</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Test Candidates</p>
          <p className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400 mt-1">
            {testEvidencePaths.size}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Automated tests</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Manifest Cmds</p>
          <p className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400 mt-1">
            {manifestCommandsCount} / 3
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Substantiated</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Rejected Paths</p>
          <p className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-1.5">
            <span>{audit.rejected_paths_count}</span>
            {audit.rejected_paths_count > 0 ? (
              <XCircle className="w-3.5 h-3.5 text-coral-500 dark:text-coral-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
            )}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Hallucinations blocked</p>
        </div>
      </div>

      {/* Warnings & Audit Log */}
      {audit.warnings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Claim Gate Audit Log:</span>
          </div>
          <ul className="space-y-1 list-disc pl-4 text-amber-800/90 dark:text-amber-300/90 font-mono text-[11px]">
            {audit.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Security statement */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/80 border border-slate-200 dark:border-midnight-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800 dark:text-slate-200">Security Guarantee:</strong> IssueLift treats scanned repository content as untrusted input. No arbitrary code, installation scripts, or tests from the target repository are executed on the server.
        </p>
      </div>
    </div>
  );
}
