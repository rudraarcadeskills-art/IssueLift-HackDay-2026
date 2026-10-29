'use client';

import React, { useState } from 'react';
import { AcceptanceCriterion, CriterionStatus } from '@/lib/types';
import { FileCheck, Edit3, Check, Quote, Plus, AlertCircle } from 'lucide-react';

interface ContributionContractCardProps {
  criteria: AcceptanceCriterion[];
  onUpdateCriteria: (updated: AcceptanceCriterion[]) => void;
}

export function ContributionContractCard({ criteria, onUpdateCriteria }: ContributionContractCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<CriterionStatus>('ACTIONABLE');

  const startEdit = (c: AcceptanceCriterion) => {
    setEditingId(c.id);
    setEditDesc(c.description);
    setEditStatus(c.status);
  };

  const saveEdit = (id: string) => {
    const updated = criteria.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          description: editDesc,
          status: editStatus,
          user_edited: true,
        };
      }
      return c;
    });
    onUpdateCriteria(updated);
    setEditingId(null);
  };

  const toggleNeedsClarification = (id: string) => {
    const updated = criteria.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          needs_maintainer_clarification: !c.needs_maintainer_clarification,
          status: !c.needs_maintainer_clarification ? ('AMBIGUOUS' as CriterionStatus) : ('ACTIONABLE' as CriterionStatus),
          user_edited: true,
        };
      }
      return c;
    });
    onUpdateCriteria(updated);
  };

  const handleAddCriterion = () => {
    const newId = `AC-${String(criteria.length + 1).padStart(2, '0')}`;
    const newCriterion: AcceptanceCriterion = {
      id: newId,
      description: 'New proposed acceptance criterion',
      criterion_type: 'AI-PROPOSED',
      status: 'ACTIONABLE',
      status_rationale: 'User added criterion to contract.',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: {
        status: 'NO TEST EVIDENCE FOUND IN SCANNED FILES',
        candidate_test_files: [],
        rationale: 'Newly added criterion requires test mapping.',
      },
      user_edited: true,
    };
    onUpdateCriteria([...criteria, newCriterion]);
  };

  return (
    <div className="w-full bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700 rounded-2xl shadow-card dark:shadow-card-dark p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-midnight-700/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Contribution Contract</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-midnight-900 border border-slate-200 dark:border-midnight-700 text-slate-600 dark:text-slate-400 font-mono font-medium">
              {criteria.length} Criteria
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explicit issue quotes remain verbatim. Inferred criteria are isolated and editable before handoff.
          </p>
        </div>

        <button
          onClick={handleAddCriterion}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-slate-300 dark:border-midnight-700 hover:border-violet-500/50 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-50 dark:bg-midnight-900 hover:bg-slate-100 dark:hover:bg-midnight-850"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Criterion</span>
        </button>
      </div>

      <div className="space-y-3.5">
        {criteria.map((c) => {
          const isEditing = editingId === c.id;

          return (
            <div
              key={c.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all ${
                c.needs_maintainer_clarification
                  ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'
                  : c.criterion_type === 'EXPLICIT'
                  ? 'border-slate-200 dark:border-midnight-700 bg-slate-50/70 dark:bg-midnight-900/50'
                  : 'border-dashed border-violet-300 dark:border-violet-500/30 bg-violet-50/40 dark:bg-violet-950/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-violet-600 text-white shadow-sm">
                    {c.id}
                  </span>

                  {c.criterion_type === 'EXPLICIT' ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                      Explicit Quote
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                      AI-Proposed (Inferred)
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      c.status === 'ACTIONABLE'
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30'
                        : c.status === 'AMBIGUOUS'
                        ? 'bg-coral-500/10 text-coral-700 dark:text-coral-300 border border-coral-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {c.status}
                  </span>

                  {c.needs_maintainer_clarification && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      ⚠️ Needs Clarification
                    </span>
                  )}
                </div>

                {/* Edit & Clarify actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => toggleNeedsClarification(c.id)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                      c.needs_maintainer_clarification
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30'
                        : 'bg-slate-100 dark:bg-midnight-900 border-slate-200 dark:border-midnight-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {c.needs_maintainer_clarification ? 'Flagged for Maintainer' : 'Flag Question'}
                  </button>

                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(c)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-midnight-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Edit criterion"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Criterion description or inline edit form */}
              {isEditing ? (
                <div className="mt-3 space-y-3 p-3 rounded-lg bg-slate-100 dark:bg-midnight-900 border border-violet-400 dark:border-violet-500/40 shadow-sm">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-xs sm:text-sm font-medium p-2.5 rounded-lg border border-slate-300 dark:border-midnight-700 bg-white dark:bg-midnight-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500"
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as CriterionStatus)}
                      className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-midnight-700 bg-white dark:bg-midnight-800 text-slate-900 dark:text-slate-200"
                    >
                      <option value="ACTIONABLE">ACTIONABLE</option>
                      <option value="AMBIGUOUS">AMBIGUOUS</option>
                      <option value="NOT_SPECIFIED">NOT_SPECIFIED</option>
                      <option value="EVIDENCE_LIMITED">EVIDENCE_LIMITED</option>
                    </select>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3 h-3" /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-midnight-800 text-slate-600 dark:text-slate-400 text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 mt-1.5 leading-relaxed">
                  {c.description}
                </p>
              )}

              {/* Exact quote citation if available */}
              {c.exact_quote && (
                <div className="mt-2.5 p-2 rounded-lg bg-slate-100 dark:bg-midnight-950/70 border border-slate-200 dark:border-midnight-700/60 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <Quote className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <span className="italic leading-relaxed font-mono text-[11px]">"{c.exact_quote}"</span>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Rationale:</span> {c.status_rationale}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
