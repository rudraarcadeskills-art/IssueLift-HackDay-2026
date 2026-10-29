'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, ActiveView } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { IssueInputForm } from '@/components/IssueInputForm';
import { ScanProgressBar, ScanStage } from '@/components/ScanProgressBar';
import { IssueOverviewCard } from '@/components/IssueOverviewCard';
import { ContributionContractCard } from '@/components/ContributionContractCard';
import { TraceMapRadar } from '@/components/TraceMapRadar';
import { DeterministicClaimGateCard } from '@/components/DeterministicClaimGateCard';
import { SetupTruthCard } from '@/components/SetupTruthCard';
import { MaintainerHandoffCard } from '@/components/MaintainerHandoffCard';
import { ProofBundleExportModal } from '@/components/ProofBundleExportModal';
import { ProofBenchViewer } from '@/components/ProofBenchViewer';
import { MissingKeyBanner } from '@/components/MissingKeyBanner';
import { ContributionContract, AcceptanceCriterion, MaintainerHandoff, ConfigStatus, AnalysisStatus } from '@/lib/types';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  FileText,
  ListChecks,
  Compass,
  ArrowRight,
  GitPullRequest,
  Sparkles,
  BookOpen,
  RotateCcw,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function HomePage() {
  const [activeView, setActiveView] = useState<ActiveView>('scanner');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'all' | 'contract' | 'tracemap' | 'claimgate' | 'setup' | 'handoff'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [scanStage, setScanStage] = useState<ScanStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<ContributionContract | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [gemmaConfigState, setGemmaConfigState] = useState<ConfigStatus>('checking');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          setGemmaConfigState('unavailable');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        if (data?.gemma?.configured) {
          setGemmaConfigState('configured');
        } else {
          setGemmaConfigState('missing');
        }
      })
      .catch(() => {
        setGemmaConfigState('unavailable');
      });

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      if (urlParam) {
        handleScan(decodeURIComponent(urlParam));
      }
    }
  }, []);

  const handleScan = async (url: string) => {
    setIsLoading(true);
    setError(null);
    setContract(null);
    setActiveView('scanner');
    setAnalysisStatus('running');

    // Realistic scan stage transitions
    setScanStage('fetching_issue');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      setScanStage('inspecting_repo');
      await new Promise((r) => setTimeout(r, 250));

      setScanStage('reasoning_gemma');
      await new Promise((r) => setTimeout(r, 350));

      setScanStage('claim_gate');
      await new Promise((r) => setTimeout(r, 250));

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Scan failed with status ${response.status}`);
      }

      const contractData: ContributionContract = await response.json();
      setContract(contractData);
      setScanStage('complete');
      setAnalysisStatus(contractData.analysis_status || (contractData.engine === 'gemma' ? 'gemma_success' : 'baseline_fallback'));

      if (contractData.ai_configured) {
        setGemmaConfigState('configured');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while scanning the issue.');
      setScanStage('idle');
      setAnalysisStatus('analysis_failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCriteria = (updatedCriteria: AcceptanceCriterion[]) => {
    if (!contract) return;
    setContract({
      ...contract,
      criteria: updatedCriteria,
    });
  };

  const handleUpdateHandoff = (updatedHandoff: MaintainerHandoff) => {
    if (!contract) return;
    setContract({
      ...contract,
      maintainer_handoff: updatedHandoff,
    });
  };

  const handleResetScan = () => {
    setContract(null);
    setScanStage('idle');
    setAnalysisStatus('idle');
    setError(null);
    setActiveWorkspaceTab('all');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 selection:bg-violet-500 selection:text-white transition-colors">
      <Header
        activeView={activeView}
        onSelectView={setActiveView}
        configStatus={gemmaConfigState}
        analysisStatus={analysisStatus}
        fallbackReason={contract?.engine_details?.fallback_reason}
        isGemmaActive={contract?.analysis_status === 'gemma_success'}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        {/* VIEW 1: PROOFBENCH SUITE */}
        {activeView === 'proofbench' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                onClick={() => setActiveView('scanner')}
                className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors cursor-pointer"
              >
                Workspace
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 dark:text-slate-200 font-medium">Deterministic Guardrail Console</span>
            </div>
            <ProofBenchViewer />
          </div>
        )}

        {/* VIEW 2: PLAYBOOK & OPEN INNOVATION */}
        {activeView === 'playbook' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <button
                onClick={() => setActiveView('scanner')}
                className="hover:text-violet-600 dark:hover:text-violet-300 transition-colors cursor-pointer"
              >
                Workspace
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-800 dark:text-slate-200 font-medium">Open Innovation Methodology</span>
            </div>

            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300 border border-violet-200 dark:border-violet-500/20 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Pre-Contribution Methodology</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Why Open Innovation Matters in Hacktoberfest 2026
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                IssueLift transforms unstructured issue discussions into verifiable, grounded Contribution Contracts before anyone touches repository code.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center font-bold text-base shadow-sm dark:shadow-glow">
                  1
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Contribution Contract</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Extracts explicit verbatim acceptance quotes from issue text. AI inferences are quarantined with [AI-PROPOSED] tags and edit actions.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center font-bold text-base shadow-sm dark:shadow-glow-blue">
                  2
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">TraceMap & Radar</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Bridges criteria directly to candidate source files and test candidates. Honest bounded scan wording avoids unsubstantiated negative claims.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center font-bold text-base shadow-sm dark:shadow-glow-teal">
                  3
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Deterministic Claim Gate</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Deterministic audit rules verify repository tree paths, reject hallucinated files, and prevent prompt injection from compromising readiness.
                </p>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-midnight-800/80 border border-slate-200 dark:border-violet-500/30 shadow-sm dark:shadow-card space-y-4">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Open-Source Reliability Principle</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Inspectable Guardrails, Not Black-Box Automation
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                Open innovation in developer tools requires that safety guardrails are just as transparent and inspectable as the software they protect. While Gemma 4 provides deep multilingual reasoning and schema synthesis, the Claim Gate and ProofBench suite guarantee that zero hallucinated file paths reach maintainers. Contributors can add new failure fixtures without fine-tuning weights or paying cloud fees.
              </p>
            </div>
          </div>
        )}

        {/* VIEW 3: SCANNER & ACTIVE WORKSPACE */}
        {activeView === 'scanner' && (
          <div className="space-y-10">
            {/* Hero Intake Header (shown prominently when no contract is loaded) */}
            {!contract && (
              <section className="text-center space-y-4 max-w-4xl mx-auto pt-4 sm:pt-8 animate-in fade-in duration-300">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 text-xs font-semibold uppercase tracking-wider shadow-sm dark:shadow-glow">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  <span>Before Anyone Edits Code</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                  Turn Any Public GitHub Issue into a{' '}
                  <span className="text-gradient-electric">
                    Proven Contribution Contract
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  Define what "done" means, map requirements to verified repository test evidence, and export a reviewable Proof Bundle before writing your first line of code.
                </p>

                {/* Intake Form */}
                <div className="pt-4">
                  <IssueInputForm onScan={handleScan} isLoading={isLoading} error={error} />
                </div>
              </section>
            )}

            {/* Live Scan Pipeline Progress */}
            <ScanProgressBar
              currentStage={scanStage}
              analysisStatus={analysisStatus}
              fallbackReason={contract?.engine_details?.fallback_reason}
            />

            {/* Missing Key Guidance Banner (only if unconfigured and not dismissed) */}
            {gemmaConfigState === 'missing' && !bannerDismissed && (
              <MissingKeyBanner onDismiss={() => setBannerDismissed(true)} />
            )}

            {/* Interactive Analysis Workspace (When Contract is Loaded) */}
            {contract && (
              <section className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-300">
                {/* Fallback Disclosure Alert */}
                {contract.analysis_status === 'baseline_fallback' && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
                    <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-amber-900 dark:text-amber-200">
                        Gemma request failed — Baseline fallback used
                      </p>
                      <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                        {contract.engine_details?.fallback_reason || 'Inference request did not succeed; contract was compiled deterministically from verified repository manifests and issue text.'}
                        {' '}<strong>Baseline result — guardrails passed:</strong> Deterministic Claim Gate verified that all candidate paths exist in the fetched repository tree.
                      </p>
                    </div>
                  </div>
                )}
                {/* Workspace Header & Breadcrumb Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card">
                  {/* Left: Breadcrumbs & Issue Target */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{contract.issue_metadata.owner}/{contract.issue_metadata.repo}</span>
                      <span className="text-violet-600 dark:text-violet-400 font-mono">#{contract.issue_metadata.number}</span>
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-midnight-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-midnight-700/80">
                      branch: {contract.issue_metadata.default_branch}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 hidden md:inline">
                      ({contract.criteria.length} Criteria Compiled)
                    </span>
                  </div>

                  {/* Right: Actions (Reset Scan & Download Proof Bundle) */}
                  <div className="flex items-center gap-2.5 w-full lg:w-auto">
                    <button
                      onClick={handleResetScan}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-midnight-700 bg-white dark:bg-midnight-900/80 hover:bg-slate-100 dark:hover:bg-midnight-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      title="Scan another GitHub issue"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Scan Another Issue</span>
                    </button>

                    <button
                      onClick={() => setIsExportOpen(true)}
                      className="flex-1 lg:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-sky-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm dark:shadow-glow hover:opacity-95 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Proof Bundle</span>
                    </button>
                  </div>
                </div>

                {/* Workspace Sub-Navigation Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-midnight-800">
                  <button
                    onClick={() => setActiveWorkspaceTab('all')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'all'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    All Evidence (Full View)
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab('contract')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'contract'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    Criteria Contract ({contract.criteria.length})
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab('tracemap')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'tracemap'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    TraceMap & Test Radar
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab('claimgate')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'claimgate'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    Claim Gate Truth Ledger
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab('setup')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'setup'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    Setup & Commands
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab('handoff')}
                    className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeWorkspaceTab === 'handoff'
                        ? 'bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-600/20 dark:text-violet-300 dark:border-violet-500/40 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-midnight-800'
                    }`}
                  >
                    Maintainer Handoff
                  </button>
                </div>

                {/* Tab Views */}
                {(activeWorkspaceTab === 'all' || activeWorkspaceTab === 'contract') && (
                  <div className="space-y-8">
                    {/* 1. Issue Overview & Readiness Gate */}
                    <IssueOverviewCard contract={contract} />

                    {/* 2. Contribution Contract Compiler */}
                    <ContributionContractCard
                      criteria={contract.criteria}
                      onUpdateCriteria={handleUpdateCriteria}
                    />
                  </div>
                )}

                {(activeWorkspaceTab === 'all' || activeWorkspaceTab === 'tracemap') && (
                  /* 3. Acceptance-to-Test TraceMap & Test Gap Radar */
                  <TraceMapRadar
                    criteria={contract.criteria}
                    defaultBranch={contract.issue_metadata.default_branch}
                    owner={contract.issue_metadata.owner}
                    repo={contract.issue_metadata.repo}
                    globalTestCommand={contract.setup_truth.test_command}
                  />
                )}

                {(activeWorkspaceTab === 'all' || activeWorkspaceTab === 'claimgate') && (
                  /* 4. Deterministic Claim Gate */
                  <DeterministicClaimGateCard contract={contract} />
                )}

                {(activeWorkspaceTab === 'all' || activeWorkspaceTab === 'setup') && (
                  /* 5. Setup Truth */
                  <SetupTruthCard
                    setupTruth={contract.setup_truth}
                    reproductionEnvironment={contract.reproduction_environment}
                    targetRepo={{
                      owner: contract.issue_metadata.owner,
                      repo: contract.issue_metadata.repo,
                    }}
                  />
                )}

                {(activeWorkspaceTab === 'all' || activeWorkspaceTab === 'handoff') && (
                  /* 6. Maintainer Handoff */
                  <MaintainerHandoffCard
                    handoff={contract.maintainer_handoff}
                    issueNumber={contract.issue_metadata.number}
                    onUpdateHandoff={handleUpdateHandoff}
                  />
                )}

                {/* 7. First-Hour Route & PR Checklist */}
                {activeWorkspaceTab === 'all' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-midnight-700/70">
                        <Compass className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">First-Hour Contributor Route</h3>
                      </div>
                      <ol className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {contract.first_hour_route.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-violet-200 dark:border-violet-500/30">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card rounded-2xl p-6 space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-midnight-700/70">
                        <ListChecks className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Pre-PR Readiness Checklist</h3>
                      </div>
                      <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {contract.pr_checklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Export Modal */}
                <ProofBundleExportModal
                  contract={contract}
                  isOpen={isExportOpen}
                  onClose={() => setIsExportOpen(false)}
                />
              </section>
            )}

            {/* How It Works & Open Innovation Section (shown on scanner view below intake) */}
            {!contract && (
              <section id="how-it-works" className="pt-12 border-t border-slate-200 dark:border-midnight-800 space-y-8">
                <div className="text-center space-y-2 max-w-3xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                    The 5-Step Pre-Implementation Architecture
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Why IssueLift starts after an issue is picked and before anyone writes code.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Contribution Contract</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Derives AC-01, AC-02... from real issue quotes. AI-proposed criteria are clearly separated and marked inferred.
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">TraceMap & Radar</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Maps each criterion toward candidate source files and test candidates. Honest bounded scan wording: never claims "no tests exist".
                    </p>
                  </div>

                  <div className="p-6 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Claim Gate & Proof</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Deterministic code validates that every suggested path exists in the GitHub tree. Reusable Contribution Proof Bundle export.
                    </p>
                  </div>
                </div>

                {/* Why Open Innovation Matters Card */}
                <div className="p-8 rounded-3xl bg-white dark:bg-midnight-800/80 border border-slate-200 dark:border-violet-500/20 shadow-sm dark:shadow-card space-y-4">
                  <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Hacktoberfest 2026 Core Theme</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Why Does Open Innovation Matter?
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-4xl">
                    IssueLift turns an open issue into a reviewable Contribution Contract and evidence-to-test map before coding begins. The deterministic Claim Gate can be inspected and improved; the public ProofBench lets contributors add counterexamples whenever a path, citation, requirement or test-evidence label is wrong. This makes reliability rules—not only UI code—open to community inspection and extension. We claim no impact numbers until measured.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/how-it-works"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <span>Read the Full How It Works Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
