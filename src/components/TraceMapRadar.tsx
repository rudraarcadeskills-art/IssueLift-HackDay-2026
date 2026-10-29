'use client';

import React, { useState } from 'react';
import { AcceptanceCriterion, CommandInfo } from '@/lib/types';
import { formatCandidateTestFileSummary } from '@/lib/test-evidence';
import {
  Network,
  FileCode,
  FlaskConical,
  Terminal,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

interface TraceMapRadarProps {
  criteria: AcceptanceCriterion[];
  defaultBranch: string;
  owner: string;
  repo: string;
  globalTestCommand?: CommandInfo;
}

export function TraceMapRadar({
  criteria,
  defaultBranch,
  owner,
  repo,
  globalTestCommand,
}: TraceMapRadarProps) {
  const [expandedCriterionId, setExpandedCriterionId] = useState<string | null>(
    criteria[0]?.id || null
  );

  return (
    <div className="w-full bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700 rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-midnight-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Network className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Acceptance-to-Test TraceMap & Test Gap Radar
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Conservative evidence chains linking requirement → candidate source → test evidence → test command.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            <span>Verified in Tree</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
            <span>AI-Inferred Relevance</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-coral-500" />
            <span>Test Gap</span>
          </span>
        </div>
      </div>

      {/* Criteria TraceMap rows */}
      <div className="space-y-4">
        {criteria.map((c) => {
          const isExpanded = expandedCriterionId === c.id;
          const hasTestEvidence = c.test_evidence.status === 'TEST EVIDENCE FOUND';
          const isGap = c.test_evidence.status === 'NO TEST EVIDENCE FOUND IN SCANNED FILES';

          return (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 dark:border-midnight-700 bg-slate-50/60 dark:bg-midnight-900/40 overflow-hidden transition-all"
            >
              {/* Row header */}
              <button
                onClick={() => setExpandedCriterionId(isExpanded ? null : c.id)}
                className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-slate-100/70 dark:hover:bg-midnight-750/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-600 text-white shrink-0">
                    {c.id}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {c.description}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-medium ${
                      hasTestEvidence
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                        : isGap
                        ? 'bg-coral-500/10 text-coral-700 dark:text-coral-300 border border-coral-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {c.test_evidence.status}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Trace chain detail */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-200 dark:border-midnight-700 bg-slate-100/60 dark:bg-midnight-950/60 space-y-6 animate-in fade-in duration-150">
                  {/* Visual Node Flow */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                    {/* Node 1: Requirement */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-midnight-700 bg-white dark:bg-midnight-800/80 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        <span>1. Criterion</span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">{c.description}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-midnight-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-midnight-700">
                        Type: {c.criterion_type}
                      </span>
                    </div>

                    {/* Node 2: Candidate Source Files */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-midnight-700 bg-white dark:bg-midnight-800/80 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                        <FileCode className="w-3.5 h-3.5" />
                        <span>2. Candidate File</span>
                      </div>
                      {c.candidate_implementation_files.length > 0 ? (
                        <div className="space-y-1.5">
                          {c.candidate_implementation_files.map((file, i) => (
                            <div key={i} className="text-xs">
                              <a
                                href={`https://github.com/${owner}/${repo}/blob/${defaultBranch}/${file.path}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sky-600 dark:text-sky-300 hover:text-sky-800 dark:hover:text-sky-200 hover:underline flex items-center gap-1 text-[11px]"
                              >
                                <span className="truncate">{file.path}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                {file.verified_exists ? '✓ In repository tree' : '✗ Unverified'} • {file.relevance_status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No candidate file in bounded scan.</p>
                      )}
                    </div>

                    {/* Node 3: Test Evidence */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-midnight-700 bg-white dark:bg-midnight-800/80 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>3. Test Candidate</span>
                      </div>
                      {c.test_evidence.candidate_test_files.length > 0 ? (
                        <div className="space-y-1.5">
                          {c.test_evidence.candidate_test_files.map((tFile, i) => {
                            const summary = formatCandidateTestFileSummary(tFile);
                            return (
                              <div key={i} className="text-xs">
                                <a
                                  href={`https://github.com/${owner}/${repo}/blob/${defaultBranch}/${tFile.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-teal-600 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 hover:underline flex items-center gap-1 text-[11px]"
                                >
                                  <span className="truncate">{tFile.path}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                                <span className="text-[10px] block mt-0.5">
                                  {summary.badgeType === 'fixture' ? (
                                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                                      ⚠️ {summary.badge}
                                    </span>
                                  ) : summary.badgeType === 'verified' ? (
                                    <span className="text-teal-700 dark:text-teal-300 font-medium">
                                      ✓ {summary.badge} ({summary.inspectionText}, not executed)
                                    </span>
                                  ) : summary.badgeType === 'unrelated' ? (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      ⚠️ {summary.badge} ({summary.inspectionText}, does not cover criterion)
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 dark:text-slate-400">
                                      ✓ {summary.badge} ({summary.inspectionText}, not executed)
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                          <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-midnight-700/60 flex items-center justify-between">
                            <span>Execution status:</span>
                            <span className="font-mono text-amber-700 dark:text-amber-300 font-semibold">
                              {c.test_evidence.test_executed ? 'Executed' : 'Not run (security invariant)'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-coral-600 dark:text-coral-400 font-medium">
                          No test evidence found in scanned files.
                        </p>
                      )}
                    </div>

                    {/* Node 4: Test Command */}
                    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-midnight-700 bg-white dark:bg-midnight-800/80 space-y-1.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>4. Test Command</span>
                      </div>
                      {globalTestCommand?.command ? (
                        <div>
                          <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block p-1.5 rounded bg-slate-100 dark:bg-midnight-900 border border-slate-200 dark:border-midnight-700">
                            {globalTestCommand.command}
                          </code>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                            Label: {globalTestCommand.label}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          No test command in inspected files.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Test Gap Card if evidence is missing or uncertain */}
                  {isGap && (
                    <div className="p-4 rounded-xl bg-coral-50/70 dark:bg-coral-950/40 border border-coral-200 dark:border-coral-500/40 text-coral-900 dark:text-coral-200 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-coral-700 dark:text-coral-400 uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4" />
                        <span>Test Gap Radar: Absence of Test Evidence</span>
                      </div>
                      <p className="text-xs leading-relaxed text-coral-900 dark:text-coral-200">
                        <strong>Checked Evidence:</strong> Bounded scan of repository tree located no automated test file referencing this criterion.
                      </p>
                      <p className="text-xs leading-relaxed text-coral-800 dark:text-coral-300">
                        <strong>Reason for Uncertainty:</strong> The repository may place tests in another directory, test externally via CI, or lack automated regression tests for this path.
                      </p>
                      <div className="p-2.5 rounded-lg bg-white dark:bg-midnight-900/80 border border-coral-200 dark:border-coral-500/30 text-xs">
                        <strong className="text-coral-700 dark:text-coral-300">Proposed Manual Validation Scenario:</strong>
                        <p className="mt-0.5 text-slate-700 dark:text-slate-300">
                          {c.test_evidence.proposed_manual_validation ||
                            'Reproduce the issue locally before editing; write a localized test case covering this exact acceptance criterion.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
