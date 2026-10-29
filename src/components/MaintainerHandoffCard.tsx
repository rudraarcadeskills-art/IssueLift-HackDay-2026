'use client';

import React, { useState } from 'react';
import { MaintainerHandoff } from '@/lib/types';
import { MessageSquareText, Copy, Check, Edit3, AlertCircle } from 'lucide-react';

import { ISSUELIFT_REPO_URL } from '@/lib/config';

interface MaintainerHandoffCardProps {
  handoff: MaintainerHandoff;
  issueNumber: number;
  onUpdateHandoff: (updated: MaintainerHandoff) => void;
}

export function MaintainerHandoffCard({
  handoff,
  issueNumber,
  onUpdateHandoff,
}: MaintainerHandoffCardProps) {
  const [copiedQuestion, setCopiedQuestion] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [question, setQuestion] = useState(handoff.clarification_question);
  const [proposedCriteria, setProposedCriteria] = useState(
    handoff.proposed_criteria_addition || ''
  );
  const [validationPlan, setValidationPlan] = useState(
    handoff.suggested_validation_scenario || ''
  );

  const fullCommentText = `${question}\n\n${
    proposedCriteria ? `### Proposed Acceptance Criteria:\n${proposedCriteria}\n\n` : ''
  }${
    validationPlan ? `### Verification Plan:\n${validationPlan}\n\n` : ''
  }_Note: Prepared with [IssueLift](${ISSUELIFT_REPO_URL}) (pre-contribution evidence check)._`;

  const copyQuestion = () => {
    navigator.clipboard.writeText(question);
    setCopiedQuestion(true);
    setTimeout(() => setCopiedQuestion(false), 2000);
  };

  const copyFullComment = () => {
    navigator.clipboard.writeText(fullCommentText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleSave = () => {
    onUpdateHandoff({
      ...handoff,
      clarification_question: question,
      proposed_criteria_addition: proposedCriteria,
      suggested_validation_scenario: validationPlan,
      user_edited: true,
    });
    setIsEditing(false);
  };

  return (
    <div className="w-full bg-white dark:bg-midnight-800/90 rounded-2xl border border-slate-200 dark:border-midnight-700/80 shadow-card dark:shadow-card-dark p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-midnight-700/70">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Maintainer Handoff (Copy-Ready)</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-semibold">
                  Never Auto-Posts
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Grounded clarification comment citing the exact ambiguity before anyone starts editing code.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-midnight-700 hover:border-violet-500/50 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-slate-50 dark:bg-midnight-900/80 hover:bg-slate-100 dark:hover:bg-midnight-800"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Draft</span>
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-glow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Triggering Ambiguity explanation */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/70 border border-slate-200 dark:border-midnight-700/70 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900 dark:text-slate-100">Triggering Ambiguity in Issue #{issueNumber}:</strong>{' '}
          {handoff.triggering_ambiguity}
        </div>
      </div>

      {/* Editable or display area */}
      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Clarification Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full text-sm p-3 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-300 dark:border-midnight-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Proposed Acceptance Criteria Bullet(s)
            </label>
            <textarea
              value={proposedCriteria}
              onChange={(e) => setProposedCriteria(e.target.value)}
              rows={2}
              className="w-full text-sm p-3 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-300 dark:border-midnight-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Suggested Local Validation Scenario
            </label>
            <textarea
              value={validationPlan}
              onChange={(e) => setValidationPlan(e.target.value)}
              rows={2}
              className="w-full text-sm p-3 rounded-xl bg-slate-50 dark:bg-midnight-950 border border-slate-300 dark:border-midnight-700 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/70 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Drafted Comment for Maintainer:
            </span>
            <p className="text-sm text-slate-900 dark:text-slate-200 font-medium leading-relaxed">{question}</p>
          </div>

          {proposedCriteria && (
            <div className="pt-3 border-t border-slate-200 dark:border-midnight-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Suggested Criteria Addition:
              </span>
              <p className="text-xs text-slate-800 dark:text-slate-300 font-mono bg-slate-100 dark:bg-midnight-950 p-3 rounded-lg border border-slate-200 dark:border-midnight-800 whitespace-pre-wrap leading-relaxed select-all">
                {proposedCriteria}
              </p>
            </div>
          )}

          {validationPlan && (
            <div className="pt-3 border-t border-slate-200 dark:border-midnight-700/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                Suggested Validation Scenario:
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{validationPlan}</p>
            </div>
          )}
        </div>
      )}

      {/* Copy Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={copyQuestion}
          className="px-4 py-2 rounded-xl border border-slate-300 dark:border-midnight-700 bg-slate-100 dark:bg-midnight-900/80 hover:bg-slate-200 dark:hover:bg-midnight-800 text-slate-800 dark:text-slate-200 font-medium text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          {copiedQuestion ? (
            <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copiedQuestion ? 'Copied Question!' : 'Copy Question Only'}</span>
        </button>

        <button
          onClick={copyFullComment}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-sky-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white font-medium text-xs flex items-center gap-2 shadow-glow hover:opacity-95 transition-all cursor-pointer"
        >
          {copiedFull ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white" />
          )}
          <span>{copiedFull ? 'Copied Full Markdown!' : 'Copy Full Formatted Comment'}</span>
        </button>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          *Review and paste manually in GitHub issue thread. Never auto-posted.
        </span>
      </div>
    </div>
  );
}
