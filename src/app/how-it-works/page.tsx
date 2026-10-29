import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  Terminal,
  FileCode,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  GitPullRequest,
  Search,
  Cpu,
  Layers,
  FileText,
  Copy,
  Info,
} from 'lucide-react';

export const metadata = {
  title: 'How It Works — IssueLift v1.3',
  description:
    'Comprehensive guide to the 5-step pre-implementation contribution engine, evidence status legends, readiness gates, and troubleshooting.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Paste Any Public GitHub Issue URL',
      badge: 'Step 1 • Intake',
      desc: 'Enter a public GitHub issue link (e.g. https://github.com/facebook/react/issues/1000). IssueLift validates the URL structure, ensures it is an open issue rather than a pull request, and initializes a bounded scan context.',
      icon: Search,
    },
    {
      num: '02',
      title: 'Fetch Issue & Bounded Repository Context',
      badge: 'Step 2 • Context Assembly',
      desc: 'IssueLift connects to public GitHub REST endpoints to retrieve issue title, body, state, assignees, author, comments, default branch, repository tree manifest, and setup documentation (README.md, CONTRIBUTING.md).',
      icon: Layers,
    },
    {
      num: '03',
      title: 'Gemma 4 Proposes Criteria & Explanations',
      badge: 'Step 3 • AI Reasoning',
      desc: 'Google Gemma 4 (gemma-4-26b-a4b-it) processes the untrusted issue body, extracts verbatim acceptance quotes, identifies implicit ambiguities, and synthesizes candidate criteria and maintainer questions conforming to a strict Zod schema.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Deterministic Claim Gate Verifies Path Integrity',
      badge: 'Step 4 • Guardrail Audit',
      desc: 'Deterministic code validates that every file path suggested by Gemma 4 actually exists in the fetched repository tree. Nonexistent paths are rejected, and TraceMap maps criteria to verified source files, candidate tests, and commands.',
      icon: ShieldCheck,
    },
    {
      num: '05',
      title: 'Review, Edit Contract & Export Proof Bundle',
      badge: 'Step 5 • Contributor Empowerment',
      desc: 'You inspect the compiled Contribution Contract, edit criteria in-memory, copy a respectful maintainer clarification comment, and download a verifiable Proof Bundle (.md or .json) before writing a single line of code.',
      icon: FileText,
    },
  ];

  const legends = [
    {
      label: 'VERIFIED',
      pillClass: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-500/40',
      definition: 'Directly verified against the fetched repository file tree or documentation manifests.',
      example: 'File exists in git tree: `src/renderers/dom/fiber/ReactDOMFiberComponent.js`',
      caveat: 'Existence confirms the file is real; it does NOT prove semantic correctness or test coverage.',
    },
    {
      label: 'AI-PROPOSED',
      pillClass: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-500/40',
      definition: 'Inferred by Google Gemma 4 from issue context or comments when explicit quotes are missing.',
      example: 'Inferred requirement: "Add regression unit test covering invalid prop warning"',
      caveat: 'Must be reviewed by the contributor and blessed by maintainers before coding.',
    },
    {
      label: 'UNKNOWN',
      pillClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      definition: 'Information could not be established from the bounded scan context.',
      example: 'Test command missing: README and CONTRIBUTING do not mention test scripts.',
      caveat: 'IssueLift never fabricates commands or coverage numbers when data is absent.',
    },
    {
      label: 'REJECTED',
      pillClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-coral-300 dark:border-coral-500/40',
      definition: 'Hallucinated path or invalid source ID detected and blocked by the deterministic Claim Gate.',
      example: 'Nonexistent path: `src/components/FakeHelper.ts` rejected (0/1 found in tree).',
      caveat: 'Demoted to UNKNOWN and logged in the audit ledger to protect maintainer goodwill.',
    },
  ];

  const readinessVerdicts = [
    {
      verdict: 'ACTIONABLE',
      badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-500/40',
      meaning: 'Issue is open, requirements are well-defined, and candidate source/test files exist in the repository tree.',
      action: 'Review the TraceMap and proceed with local reproduction following the First-Hour Route.',
    },
    {
      verdict: 'CLARIFY FIRST',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/40',
      meaning: 'Requirements are ambiguous, the issue is closed or already assigned, or explicit maintainer approval is needed.',
      action: 'Copy the drafted Maintainer Handoff comment and post it in the GitHub issue thread to align on "done".',
    },
    {
      verdict: 'EVIDENCE-LIMITED',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-500/40',
      meaning: 'The repository tree was truncated by GitHub API limits or setup documentation is missing.',
      action: 'Inspect the repository locally using git clone to locate additional test files not visible in bounded tree.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 selection:bg-violet-500 selection:text-white transition-colors">
      <Header activeView="how-it-works" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
        {/* SECTION 1: PURPOSE STATEMENT */}
        <section className="text-center space-y-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-500/10 dark:text-violet-300 border border-violet-300 dark:border-violet-500/20 text-xs font-semibold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Product Guide & Methodology</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            How IssueLift Works
          </h1>

          <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            IssueLift prepares a contributor <strong className="text-violet-600 dark:text-violet-400 font-semibold">before</strong> they touch code.
            It does not write code, auto-generate pull requests, or flood maintainers with bot comments.
          </p>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            By compiling an open issue into an evidence-backed Contribution Contract and Acceptance-to-Test TraceMap, newcomers know exactly what "done" means before spending hours coding.
          </p>
        </section>

        {/* SECTION 2: 5-STEP JOURNEY */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              The 5-Step Pre-Implementation Journey
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              A transparent workflow bridging GitHub discussions to verified test evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((s) => {
              const IconComp = s.icon;
              return (
                <div
                  key={s.num}
                  className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card flex flex-col justify-between space-y-4 hover:border-violet-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-midnight-950 dark:text-violet-400 border border-violet-200 dark:border-midnight-700">
                        {s.num}
                      </span>
                      <IconComp className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      {s.badge}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {s.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: COMPACT ARCHITECTURE DIAGRAM */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-midnight-800/80 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-midnight-700/70">
            <div>
              <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                System Topology
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Data Flow: From Untrusted Input to Verified Proof
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-500/40 font-medium self-start sm:self-auto">
              100% Free Tier • Zero Code Execution
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/80 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <strong className="text-slate-900 dark:text-slate-200 block text-sm">1. Intake Layer</strong>
              <p className="text-slate-600 dark:text-slate-400 font-sans">
                Validates public issue URL. Rejects PRs and invalid hosts. Queries GitHub REST API for issue + repo tree.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/80 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <strong className="text-slate-900 dark:text-slate-200 block text-sm">2. AI Synthesis</strong>
              <p className="text-slate-600 dark:text-slate-400 font-sans">
                Gemma 4 processes issue text with prompt-injection defense. Proposes criteria and maintainer questions via Zod schema.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/80 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <strong className="text-slate-900 dark:text-slate-200 block text-sm">3. Deterministic Gate</strong>
              <p className="text-slate-600 dark:text-slate-400 font-sans">
                Claim Gate checks every path against git tree. Drops hallucinated paths to UNKNOWN and logs rejected count.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-midnight-900/80 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <strong className="text-slate-900 dark:text-slate-200 block text-sm">4. Evidence Output</strong>
              <p className="text-slate-600 dark:text-slate-400 font-sans">
                Generates interactive TraceMap, honest Test Gap Radar, Maintainer Handoff, and exportable Proof Bundle.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 4: REAL EVIDENCE LEGEND */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Evidence Status Legend & Caveats
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              IssueLift enforces honest labels. We never masquerade an AI guess as a verified fact.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {legends.map((l) => (
              <div
                key={l.label}
                className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${l.pillClass}`}>
                    {l.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100">
                  {l.definition}
                </p>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-midnight-950 font-mono text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-midnight-800">
                  <strong>Example:</strong> {l.example}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  <strong>Caveat:</strong> {l.caveat}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: READINESS GATE & TEST RADAR CAVEAT */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Readiness Gate Verdicts
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Before anyone begins writing code, IssueLift assigns a clear readiness state based on concrete evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {readinessVerdicts.map((rv) => (
              <div
                key={rv.verdict}
                className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-3"
              >
                <span className={`text-xs font-bold px-3 py-1 rounded-full border inline-block ${rv.badgeClass}`}>
                  {rv.verdict}
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {rv.meaning}
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-midnight-700/60 text-xs">
                  <strong className="text-slate-900 dark:text-slate-200 block mb-1">Recommended Action:</strong>
                  <span className="text-slate-600 dark:text-slate-400">{rv.action}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Test Gap Radar Caveat Box */}
          <div className="p-6 rounded-2xl bg-amber-50 dark:bg-midnight-800/90 border border-amber-200 dark:border-amber-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Bounded Scan Honesty: What "No test evidence found" Really Means</span>
            </div>
            <p className="leading-relaxed">
              When the Test Gap Radar reports <strong className="text-amber-900 dark:text-amber-300">"NO TEST EVIDENCE FOUND IN SCANNED FILES"</strong>, IssueLift is describing only the files present in GitHub's bounded tree scan. It means no test file matching the candidate source path pattern was detected in the inspected context. IssueLift <strong>never</strong> claims "the repository has no tests," nor does it invent false test coverage percentages.
            </p>
          </div>
        </section>

        {/* SECTION 6: WHAT ISSUELIFT DOES NOT DO */}
        <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 shadow-sm dark:shadow-card space-y-4">
          <div className="flex items-center gap-2 text-rose-600 dark:text-coral-400 font-bold text-sm uppercase tracking-wider">
            <XCircle className="w-5 h-5" />
            <span>Strict Operational Boundaries</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            What IssueLift Does NOT Do
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/70 space-y-1">
              <strong className="text-slate-900 dark:text-slate-100 block">No Autonomous Code Writing</strong>
              <p className="text-slate-600 dark:text-slate-400">
                IssueLift does not write implementation code or submit speculative PRs. Its goal is human contributor alignment.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/70 space-y-1">
              <strong className="text-slate-900 dark:text-slate-100 block">No Automated GitHub Commenting</strong>
              <p className="text-slate-600 dark:text-slate-400">
                Maintainer questions are copy-ready for you to review and post manually. IssueLift never spams issue threads.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/70 space-y-1">
              <strong className="text-slate-900 dark:text-slate-100 block">No Private Repository Access</strong>
              <p className="text-slate-600 dark:text-slate-400">
                Only public GitHub repositories are supported. No authentication tokens or repository credentials are stored.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-midnight-900/60 border border-slate-200 dark:border-midnight-700/70 space-y-1">
              <strong className="text-slate-900 dark:text-slate-100 block">No Arbitrary Code Execution</strong>
              <p className="text-slate-600 dark:text-slate-400">
                IssueLift inspects static manifests and trees; it never executes repository scripts or installs dependencies.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 7: CHECKLIST & TROUBLESHOOTING */}
        <section className="space-y-6">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              First-Scan Checklist & Troubleshooting
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Common scenarios encountered during real GitHub scans and how IssueLift handles them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>Invalid URL or PR Link</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                If a Pull Request URL (`/pull/`) is entered, IssueLift rejects it with an explanatory note. Only pre-implementation issue URLs (`/issues/123`) are supported.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>GitHub Rate Limiting (403)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Unauthenticated GitHub REST requests share an hourly limit of 60 calls per IP. When hit, IssueLift reports the reset time and serves cached trees when available.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-midnight-800/90 border border-slate-200 dark:border-midnight-700/80 space-y-2">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold">
                <HelpCircle className="w-4 h-4" />
                <span>Gemma Key Missing</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                If `GEMMA_API_KEY` is not configured, IssueLift automatically engages the deterministic baseline compiler. The app continues to operate without mock failures.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 8: START YOUR FIRST SCAN CTA */}
        <section className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-600 text-white text-center space-y-6 shadow-xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Align on Your First Issue?
            </h2>
            <p className="text-sm sm:text-base text-violet-100 leading-relaxed">
              Scan a real GitHub issue now. Examine the compiled criteria, inspect candidate tests in TraceMap, and export your Contribution Proof Bundle.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-violet-950 font-bold text-sm shadow-lg hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>Start Your First Scan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/proofbench"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-violet-800/60 hover:bg-violet-800 text-white font-semibold text-sm border border-violet-400/40 transition-colors flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4 text-teal-300" />
              <span>Inspect ProofBench Guardrails</span>
            </Link>
          </div>

          <div className="pt-2 text-xs text-violet-200">
            <span>Verified Live Example Presets Available on Home: </span>
            <strong className="text-white">React #1000</strong> •{' '}
            <strong className="text-white">Next.js #50000</strong> •{' '}
            <strong className="text-white">TypeScript #45000</strong>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
