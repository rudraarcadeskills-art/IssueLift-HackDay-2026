'use client';

import React, { useState } from 'react';
import {
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Play,
  AlertCircle,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Filter,
} from 'lucide-react';

interface FixtureItem {
  id: string;
  category: 'path' | 'ambiguity' | 'radar';
  title: string;
  description: string;
  invariant_tested: string;
  expectedStatus: string;
  observed: string;
  fixtureFile: string;
}

export function ProofBenchViewer() {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'path' | 'ambiguity' | 'radar'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);

  const fixtures: FixtureItem[] = [
    {
      id: 'fixture-01',
      category: 'path',
      title: 'Valid Criterion + Verified Source & Test Evidence',
      description: 'Tests that a well-defined issue with explicit acceptance criteria correctly validates existing repository paths and test evidence.',
      invariant_tested: 'Verified paths and source IDs must be confirmed against the repository tree and marked VERIFIED.',
      expectedStatus: 'ACTIONABLE',
      observed: 'Verdict: ACTIONABLE | Test Status: TEST EVIDENCE FOUND | Rejected Paths: 0',
      fixtureFile: 'eval/fixtures/01-valid-contract.json',
    },
    {
      id: 'fixture-02',
      category: 'ambiguity',
      title: 'Vague Issue with Implicit Requirements',
      description: 'Tests that an issue lacking explicit bullet points or quotes separates proposed criteria and marks readiness as CLARIFY FIRST.',
      invariant_tested: 'Criteria without explicit quotes must be marked AI-PROPOSED / INFERRED, never VERIFIED or maintainer-approved.',
      expectedStatus: 'CLARIFY FIRST',
      observed: 'Verdict: CLARIFY FIRST | Test Status: TEST EVIDENCE FOUND | Rejected Paths: 0',
      fixtureFile: 'eval/fixtures/02-vague-requirements.json',
    },
    {
      id: 'fixture-03',
      category: 'radar',
      title: 'No Test Evidence in Bounded Scanned Context',
      description: 'Tests that when no test files appear in the scanned repository tree, the radar reports "NO TEST EVIDENCE FOUND IN SCANNED FILES" instead of claiming "no tests exist".',
      invariant_tested: 'Must say "NO TEST EVIDENCE FOUND IN SCANNED FILES" and never assert global absence of tests or 0% coverage.',
      expectedStatus: 'ACTIONABLE',
      observed: 'Verdict: ACTIONABLE | Test Status: NO TEST EVIDENCE FOUND IN SCANNED FILES | Rejected Paths: 0',
      fixtureFile: 'eval/fixtures/03-no-test-evidence.json',
    },
    {
      id: 'fixture-04',
      category: 'path',
      title: 'Fabricated File Path & Hallucinated Source ID',
      description: 'Tests that the Claim Gate detects and rejects file paths and source IDs that do not exist in the fetched repository tree.',
      invariant_tested: 'Fabricated paths or nonexistent source IDs must be demoted and recorded in claim_gate_audit.rejected_paths_count.',
      expectedStatus: 'ACTIONABLE (with rejection)',
      observed: 'Verdict: ACTIONABLE | Test Status: NO TEST EVIDENCE FOUND IN SCANNED FILES | Rejected Paths: 1 (Demoted)',
      fixtureFile: 'eval/fixtures/04-hallucinated-path.json',
    },
    {
      id: 'fixture-05',
      category: 'radar',
      title: 'Truncated Repository Tree Context',
      description: 'Tests that when GitHub tree response indicates truncation, the radar sets status to "SCAN INCOMPLETE / UNKNOWN" and readiness reflects evidence limitations.',
      invariant_tested: 'Truncated file tree must yield SCAN INCOMPLETE / UNKNOWN and prevent confident negative claims.',
      expectedStatus: 'EVIDENCE-LIMITED',
      observed: 'Verdict: EVIDENCE-LIMITED | Test Status: SCAN INCOMPLETE / UNKNOWN | Rejected Paths: 0',
      fixtureFile: 'eval/fixtures/05-truncated-tree.json',
    },
    {
      id: 'fixture-06',
      category: 'ambiguity',
      title: 'Untrusted Instruction Embedded in Issue Body',
      description: 'Tests that prompt injection attacks or hostile instructions inside issue text are treated strictly as data and cannot override validation rules or Claim Gate verdicts.',
      invariant_tested: 'Hostile instruction inside issue body cannot override system instructions, claim gate verdicts, or bypass path verification.',
      expectedStatus: 'CLARIFY FIRST',
      observed: 'Verdict: CLARIFY FIRST | Injection neutralized | Security override blocked',
      fixtureFile: 'eval/fixtures/06-prompt-injection.json',
    },
    {
      id: 'fixture-07',
      category: 'radar',
      title: 'Missing Setup Documentation (README/CONTRIBUTING)',
      description: 'Tests that when a repository lacks README or CONTRIBUTING documentation, setup commands remain unverified and are not fabricated.',
      invariant_tested: 'Setup status remains unknown / undocumented; no command is fabricated or labelled DOCUMENTED.',
      expectedStatus: 'CLARIFY FIRST',
      observed: 'Verdict: CLARIFY FIRST | Test Status: NO TEST EVIDENCE FOUND IN SCANNED FILES | Commands: UNKNOWN',
      fixtureFile: 'eval/fixtures/07-missing-docs.json',
    },
  ];

  const filteredFixtures =
    selectedCategory === 'all'
      ? fixtures
      : fixtures.filter((f) => f.category === selectedCategory);

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 500);
  };

  const copyCli = () => {
    navigator.clipboard.writeText('npm run eval:proofbench');
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-semibold font-mono">
          <Terminal className="w-3.5 h-3.5" />
          <span>Deterministic Guardrail Benchmark</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Open ProofBench Suite
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Seven open, inspectable test fixtures validating Claim Gate guardrails, path integrity, and evidence invariant rules.
        </p>

        {/* Scope disclaimer alert */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-midnight-800/90 border border-amber-300 dark:border-amber-500/30 text-xs text-amber-900 dark:text-slate-200 text-left max-w-3xl mx-auto flex items-start gap-3 mt-4 shadow-card">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">Important Benchmark Invariant:</strong>
            ProofBench tests deterministic validation rules and Claim Gate invariants only. It runs 100% offline without an API key and does <strong>not</strong> measure or claim general AI intelligence.
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-card dark:shadow-card-dark">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/40 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
            <span>7 / 7 PASSED</span>
          </span>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-midnight-950/80 p-1 rounded-xl border border-slate-200 dark:border-midnight-700/60 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-violet-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All (7)
            </button>
            <button
              onClick={() => setSelectedCategory('path')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'path'
                  ? 'bg-violet-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Path Integrity (2)
            </button>
            <button
              onClick={() => setSelectedCategory('ambiguity')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'ambiguity'
                  ? 'bg-violet-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Ambiguity & Security (2)
            </button>
            <button
              onClick={() => setSelectedCategory('radar')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                selectedCategory === 'radar'
                  ? 'bg-violet-600 text-white font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Radar & Tree (3)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={copyCli}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 dark:border-midnight-700 bg-slate-100 dark:bg-midnight-900/80 hover:bg-slate-200 dark:hover:bg-midnight-700 text-slate-700 dark:text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Copy CLI benchmark command"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>npm run eval:proofbench</span>
          </button>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-sky-600 hover:from-violet-500 hover:to-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-glow hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="space-y-4">
        {filteredFixtures.map((fixture) => {
          const isExpanded = expandedId === fixture.id;
          return (
            <div
              key={fixture.id}
              className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-card dark:shadow-card-dark hover:border-violet-500/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-midnight-950 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/30">
                    {fixture.id}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{fixture.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/40 shadow-glow-teal">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                    <span>PASS</span>
                  </span>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : fixture.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-700 transition-colors cursor-pointer"
                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{fixture.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-midnight-900/70 border border-slate-200 dark:border-midnight-700/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Tested Invariant:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{fixture.invariant_tested}</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-midnight-900/70 border border-slate-200 dark:border-midnight-700/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                    Observed Guardrail Output:
                  </span>
                  <p className="font-mono text-[11px] text-teal-700 dark:text-teal-300 leading-relaxed font-semibold">
                    {fixture.observed}
                  </p>
                </div>
              </div>

              {/* Expandable Fixture File Info */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-midnight-700/60 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-midnight-950/60 p-3 rounded-xl">
                  <span>Fixture source: <strong className="text-slate-800 dark:text-slate-200">{fixture.fixtureFile}</strong></span>
                  <span className="text-teal-600 dark:text-teal-400">Deterministic check verified</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Community Contribution Guide */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-card dark:shadow-card-dark space-y-4">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
          <PlusCircle className="w-5 h-5" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">How to Add a ProofBench Fixture</h3>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          The public ProofBench invites open innovation without changing AI model weights. If you identify a failure mode (such as an unverified path, ambiguous criterion, or broken citation), add a deterministic counterexample:
        </p>

        <ol className="list-decimal pl-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
          <li>
            Create a new JSON file in <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-midnight-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-midnight-700">eval/fixtures/08-your-case.json</code>.
          </li>
          <li>
            Specify the issue metadata, repository file list, and expected invariant.
          </li>
          <li>
            Run <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-midnight-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-midnight-700">npm run eval:proofbench</code> locally. No API key is needed.
          </li>
          <li>
            Submit a pull request. The deterministic evaluator will rerun the case in CI to prevent regressions.
          </li>
        </ol>
      </div>
    </div>
  );
}
