import { describe, it, expect, vi } from 'vitest';
import {
  extractExplicitCriteria,
  compileDeterministicBaselineContract,
  compileContributionContract,
} from '../src/lib/contract-compiler';
import { runDeterministicClaimGate } from '../src/lib/claim-gate';
import {
  isLikelyTestFile,
  isTestOrFixturePath,
  inspectTestContent,
  evaluateTestRelevance,
  extractReproductionEnvironment,
  rankRepositoryPaths,
} from '../src/lib/github';
import { deriveTestEvidenceSummary, formatCandidateTestFileSummary } from '../src/lib/test-evidence';
import { generateProofBundleMarkdown, generateProofBundleJson } from '../src/lib/proof-bundle';
import { ISSUELIFT_REPO_URL } from '../src/lib/config';
import {
  AcceptanceCriterion,
  CandidateTestFile,
  ContributionContract,
  GitHubIssueMetadata,
  ScanBoundaries,
  SetupTruth,
  SourceEvidence,
} from '../src/lib/types';

// Fixture of actual issue text for Next.js #100596
const NEXTJS_100596_BODY = `### Verify canary release

- [X] Yes, I have confirmed that the bug still exists in the latest canary release.

### Provide environment information

\`\`\`bash
Operating System:
  Platform: darwin
  Arch: arm64
  Version: Darwin Kernel Version 24.6.0
Binaries:
  Node: 20.19.0
  npm: 10.8.2
  Yarn: N/A
  pnpm: 9.15.5
Relevant Packages:
  next: 15.6.0-canary.7
  eslint-config-next: N/A
  react: 19.1.0-canary-22eed2bf-20250604
  react-dom: 19.1.0-canary-22eed2bf-20250604
  typescript: 5.8.3
\`\`\`

### What browser are you using?

Chrome 138.0.7204.184

### Which area(s) are affected? (Select all that apply)

App Router

### Which stage(s) are affected? (Select all that apply)

next build (static), next start (server)

### Link to reproduction - MUST be a GitHub repository

https://github.com/molovo/next-notfound-empty-body

### To Reproduce

1. Clone the repo, then run \`npm install && npm run build && npm run start\`.
2. Run \`curl -s http://localhost:3000/nope\`. You'll see that the body is completely empty, and the content length is 0.
3. For comparison, run \`curl -s http://localhost:3000/this/does/not/exist\`. You'll see the 404 response has the full HTML for the not found page.

### Current vs. Expected behavior

**Current:**
When \`notFound()\` is thrown during the render of a dynamic segment, the boundary is rendered as a standalone page without any layout, and no HTML is sent to the client.

**Expected:**
When \`notFound()\` is thrown during the render of a dynamic segment, the boundary should be rendered inside of the layout (like an unmatched route), so the not-found content is present in the initial HTML for JS-disabled users and crawlers.

### Provide a reproduction demo

_No response_

### Additional information

_No response_`;

const ACTUAL_NEXTJS_100596_BODY = `### Link to the code that reproduces this issue

https://github.com/molovo/next-notfound-empty-body

### To Reproduce

1. Clone the repo, then run \`npm install && npm run build && npm run start\`.
2. Run \`curl -s http://localhost:3000/nope\`. \`app/[slug]/page.tsx\` calls \`notFound()\` for any slug other than \`known\`, the one \`generateStaticParams\` returns.
3. For comparison, run \`curl -s http://localhost:3000/this/does/not/exist\`, which matches no route.

The repro is \`create-next-app@16.3.8\` (first commit) plus \`app/[slug]/page.tsx\` and \`app/not-found.tsx\` (second commit).

### Current vs. Expected behavior

**Current:** \`/nope\` responds \`404\` with:

\`\`\`html
<html id="__next_error__"><head>…</head><body><div hidden=""><!--$--><!--/$--></div><script>…</script></body></html>
\`\`\`

The root layout and \`app/not-found.tsx\` (\`<h1>Custom not-found copy</h1>\`) appear only inside the inline RSC payload, so they render only after hydration. With JavaScript disabled, the page is blank.

\`/this/does/not/exist\` responds \`404\` with the root layout's \`<html lang="en" …>\` and \`<h1>Custom not-found copy</h1>\` in \`<body>\`, as expected.

**Expected:** a \`notFound()\` thrown while rendering a dynamic segment should server-render the not-found boundary inside the layout, the same as an unmatched route, so the 404 copy is in the initial HTML for no-JS visitors and crawlers.

The same happens with \`cacheComponents: true\`, and with the root layout under a dynamic \`[lang]\` segment, which is where we first saw it on a production site. It reproduces on \`16.3.8\` and on \`16.5.0-canary.23\`.

### Provide environment information

\`\`\`bash
Operating System:
  Platform: darwin
  Arch: arm64
  Version: Darwin Kernel Version 25.6.0
Binaries:
  Node: 20.20.2
  npm: 10.8.2
Relevant Packages:
  next: 16.3.8 (also 16.5.0-canary.23)
  react: 19.2.8
  react-dom: 19.2.8
  typescript: 5.9.3
\`\`\`

### Which area(s) are affected? (Select all that apply)

Error Handling, Not Found

### Which stage(s) are affected? (Select all that apply)

next build (local), next start (local)

### Additional context

The response looks like Next's error-recovery shell (<html id="__next_error__">, as produced by getErrorRSCPayload in app-render). That suggests the notFound() thrown during SSR isn't caught by the HTTP access fallback boundary in the shell, so the whole shell falls back to the error document. Only the RSC payload gets the not-found tree.`;

const mockMetadata: GitHubIssueMetadata = {
  url: 'https://github.com/vercel/next.js/issues/100596',
  owner: 'vercel',
  repo: 'next.js',
  number: 100596,
  title: 'notFound() in dynamic segment renders empty body on initial request',
  body: NEXTJS_100596_BODY,
  state: 'open',
  created_at: '2026-03-01T12:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  author: { login: 'molovo', avatar_url: '', html_url: 'https://github.com/molovo' },
  assignees: [],
  labels: [{ name: 'template: bug', color: 'd73a4a' }, { name: 'area: app', color: 'bfdadc' }],
  comments_count: 0,
  has_linked_pr_signal: false,
  default_branch: 'canary',
  checked_at: '2026-03-01T12:05:00Z',
};

const mockSetupTruth: SetupTruth = {
  install_command: { command: 'pnpm install', label: 'DOCUMENTED', provenance: 'package.json' },
  test_command: { command: 'pnpm test', label: 'DOCUMENTED', provenance: 'package.json' },
  run_command: { command: 'pnpm dev', label: 'DOCUMENTED', provenance: 'package.json' },
  has_readme: true,
  has_contributing: true,
  notes: 'Next.js monorepo uses pnpm workspaces.',
};

const mockScanBoundaries: ScanBoundaries = {
  total_files_in_tree: 1500,
  scanned_files_count: 4,
  is_tree_truncated: false,
  checked_at: '2026-03-01T12:05:00Z',
};

const mockSources: SourceEvidence[] = [
  {
    source_id: 'pkg-manifest',
    canonical_url: 'https://github.com/vercel/next.js/blob/canary/package.json',
    path: 'package.json',
    source_type: 'manifest',
    excerpt: '{"scripts":{"test":"pnpm test"}}',
    verified_exists: true,
    verification_status: 'VERIFIED',
  },
];

describe('BUG 1 — Acceptance Criteria are not Reproduction Steps', () => {
  it('does NOT label the three reproduction steps from issue #100596 as explicit acceptance criteria', () => {
    const criteria = extractExplicitCriteria(NEXTJS_100596_BODY, mockMetadata.url, mockSetupTruth.test_command);

    // Confirm reproduction steps are NOT in criteria
    const reproStep1 = 'Clone the repo, then run';
    const reproStep2 = 'curl -s http://localhost:3000/nope';
    const reproStep3 = 'curl -s http://localhost:3000/this/does/not/exist';

    expect(criteria.some((c) => c.description.includes(reproStep1))).toBe(false);
    expect(criteria.some((c) => c.description.includes(reproStep2))).toBe(false);
    expect(criteria.some((c) => c.description.includes(reproStep3))).toBe(false);
    expect(criteria.some((c) => c.exact_quote?.includes(reproStep1))).toBe(false);
  });

  it('extracts expected-behaviour requirement and preserves exact verbatim source quote', () => {
    const criteria = extractExplicitCriteria(NEXTJS_100596_BODY, mockMetadata.url, mockSetupTruth.test_command);

    expect(criteria.length).toBeGreaterThan(0);
    const expectedCrit = criteria.find((c) =>
      c.description.toLowerCase().includes('notfound()') && c.description.toLowerCase().includes('layout')
    );
    expect(expectedCrit).toBeDefined();
    expect(expectedCrit?.criterion_type).toBe('EXPLICIT');
    expect(expectedCrit?.exact_quote).toBeDefined();
    expect(NEXTJS_100596_BODY).toContain(expectedCrit!.exact_quote!);
    expect(expectedCrit?.exact_quote).toContain(
      'When `notFound()` is thrown during the render of a dynamic segment, the boundary should be rendered inside of the layout'
    );
  });

  it('classifies setup commands and repro commands as separate reproduction instructions, not criteria', () => {
    const reproEnv = extractReproductionEnvironment(NEXTJS_100596_BODY);
    expect(reproEnv).toBeDefined();
    expect(reproEnv?.reproduction_repo_url).toBe('https://github.com/molovo/next-notfound-empty-body');
    expect(reproEnv?.reproduction_commands).toContain('npm install && npm run build && npm run start');
    expect(reproEnv?.manual_validation_scenarios.some((s) => s.includes('curl -s http://localhost:3000/nope'))).toBe(true);
    expect(reproEnv?.manual_validation_scenarios.some((s) => s.includes('curl -s http://localhost:3000/this/does/not/exist'))).toBe(true);
  });

  it('handles a vague issue with no expected behaviour by creating inferred criteria only', () => {
    const vagueBody = '### Description\nSomething is broken please check.\n### Logs\nError: unexpected';
    const criteria = extractExplicitCriteria(vagueBody, 'https://github.com/org/repo/issues/1', undefined);
    expect(criteria.length).toBe(0);

    const contract = compileDeterministicBaselineContract(
      { ...mockMetadata, body: vagueBody },
      mockSources,
      ['src/index.ts'],
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.criteria.length).toBe(1);
    expect(contract.criteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(contract.criteria[0].exact_quote).toBeUndefined();
    expect(contract.criteria[0].status).toBe('AMBIGUOUS');
  });

  it('validates exact-quote provenance against the original issue text in claim gate', () => {
    const fabricatedCriterion: AcceptanceCriterion = {
      id: 'AC-01',
      description: 'Fabricated criterion that does not exist in body',
      criterion_type: 'EXPLICIT',
      exact_quote: 'This sentence is not anywhere in the issue text at all.',
      status: 'ACTIONABLE',
      status_rationale: 'Testing gate',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: {
        status: 'NO TEST EVIDENCE FOUND IN SCANNED FILES',
        candidate_test_files: [],
        rationale: 'None',
      },
    };

    const gateResult = runDeterministicClaimGate(
      [fabricatedCriterion],
      mockSources,
      ['package.json'],
      mockMetadata,
      mockScanBoundaries,
      mockSetupTruth
    );

    // Demoted to AI-PROPOSED because quote does not exist in body
    expect(gateResult.validatedCriteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(gateResult.audit.warnings.some((w) => w.includes('not found in issue text'))).toBe(true);
  });
});

describe('BUG 1B — Actual Next.js Issue #100596 Structure with Inline Expected: Label', () => {
  it('correctly recognizes inline **Expected:** label and extracts expected-behaviour text from real issue #100596', () => {
    const criteria = extractExplicitCriteria(ACTUAL_NEXTJS_100596_BODY, mockMetadata.url, mockSetupTruth.test_command);

    expect(criteria.length).toBeGreaterThan(0);
    const crit = criteria[0];

    // Description is the expected-behaviour text
    expect(crit.description).toContain('a `notFound()` thrown while rendering a dynamic segment should server-render the not-found boundary inside the layout');
    // Does NOT contain trailing reproduction text
    expect(crit.description).not.toContain('The same happens with');
    expect(crit.description).not.toContain('It reproduces on');

    // Classified as EXPLICIT with verbatim quote in original text
    expect(crit.criterion_type).toBe('EXPLICIT');
    expect(crit.exact_quote).toBeDefined();
    expect(ACTUAL_NEXTJS_100596_BODY).toContain(crit.exact_quote!);
    expect(crit.exact_quote).toContain('a `notFound()` thrown while rendering a dynamic segment should server-render the not-found boundary inside the layout');

    // Never extracts Current: description or commands as criteria
    expect(criteria.some((c) => c.description.includes('/nope responds 404'))).toBe(false);
    expect(criteria.some((c) => c.description.includes('__next_error__'))).toBe(false);
    expect(criteria.some((c) => c.description.includes('curl -s'))).toBe(false);
    expect(criteria.some((c) => c.description.includes('npm install'))).toBe(false);
  });

  it('compiles contract with explicit expected-behaviour criterion and validates claim gate verdict', () => {
    const contract = compileDeterministicBaselineContract(
      { ...mockMetadata, body: ACTUAL_NEXTJS_100596_BODY },
      mockSources,
      ['packages/next/src/server/app-render/app-render.tsx'],
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.criteria.length).toBeGreaterThan(0);
    const primaryCrit = contract.criteria[0];
    expect(primaryCrit.criterion_type).toBe('EXPLICIT');
    expect(primaryCrit.exact_quote).toBeDefined();
    expect(ACTUAL_NEXTJS_100596_BODY).toContain(primaryCrit.exact_quote!);
    expect(primaryCrit.description).toContain('server-render the not-found boundary inside the layout');

    // None of the criteria are Current: or reproduction commands
    for (const c of contract.criteria) {
      expect(c.description).not.toContain('/nope responds 404');
      expect(c.description).not.toContain('curl -s');
      expect(c.description).not.toContain('npm install');
    }
  });

  it('handles missing Expected sections by keeping criteria AI-PROPOSED without forcing EXPLICIT', () => {
    const missingExpectedBody = `### Description
The server crashes when an invalid query parameter is provided.

### Current behavior
The process terminates with an unhandled rejection.

### Environment
Node 20.x, Next.js 15.0.0`;

    const criteria = extractExplicitCriteria(missingExpectedBody, 'https://github.com/vercel/next.js/issues/99999', undefined);
    expect(criteria.length).toBe(0);

    const contract = compileDeterministicBaselineContract(
      { ...mockMetadata, body: missingExpectedBody },
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.criteria.length).toBe(1);
    expect(contract.criteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(contract.criteria[0].exact_quote).toBeUndefined();
    // Does not force to EXPLICIT
    expect(contract.criteria.every((c) => c.criterion_type === 'AI-PROPOSED')).toBe(true);
  });

  it('handles reproduction-only issues without extracting reproduction steps, setup commands, or curl commands', () => {
    const reproOnlyBody = `### Steps to Reproduce
1. Clone the repository with \`git clone https://github.com/example/repro\`
2. Run \`npm install\` to install dependencies
3. Run \`npm run build && npm run start\`
4. Execute \`curl -s http://localhost:3000/api/test\`
5. Notice that error code 500 is returned`;

    const criteria = extractExplicitCriteria(reproOnlyBody, 'https://github.com/vercel/next.js/issues/88888', undefined);
    expect(criteria.length).toBe(0);

    const contract = compileDeterministicBaselineContract(
      { ...mockMetadata, body: reproOnlyBody },
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    // Baseline creates AI-PROPOSED criterion from title
    expect(contract.criteria.length).toBe(1);
    expect(contract.criteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(contract.criteria[0].exact_quote).toBeUndefined();
    expect(contract.criteria.some((c) => c.description.includes('git clone'))).toBe(false);
    expect(contract.criteria.some((c) => c.description.includes('curl -s'))).toBe(false);
  });

  it('demotes criterion to AI-PROPOSED when verbatim quote cannot be validated or is from Current section', () => {
    const issueWithCurrent = `### Current vs. Expected behavior
**Current:**
When notFound() is thrown, the boundary is rendered as a standalone page without any layout.`;

    const criterionWithCurrentQuote: AcceptanceCriterion = {
      id: 'AC-01',
      description: 'The boundary is rendered as a standalone page without any layout',
      criterion_type: 'EXPLICIT',
      exact_quote: 'the boundary is rendered as a standalone page without any layout',
      status: 'ACTIONABLE',
      status_rationale: 'Testing current behavior rejection',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: {
        status: 'NO TEST EVIDENCE FOUND IN SCANNED FILES',
        candidate_test_files: [],
        rationale: 'None',
      },
    };

    const gateResult = runDeterministicClaimGate(
      [criterionWithCurrentQuote],
      mockSources,
      ['package.json'],
      { ...mockMetadata, body: issueWithCurrent },
      mockScanBoundaries,
      mockSetupTruth
    );

    // Demoted because quote is from Current: section
    expect(gateResult.validatedCriteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(gateResult.audit.warnings.some((w) => w.includes('current behavior description') || w.includes('demoted to AI-PROPOSED'))).toBe(true);
  });
});

describe('BUG 2 — False-Positive Test Evidence Detection', () => {
  it('does not classify fixture/application React components under test/ as automated tests', () => {
    const fixture1 = 'test/e2e/app-dir/global-not-found/no-root-layout/app/global-not-found.tsx';
    const fixture2 = 'test/development/app-dir/segment-explorer-globals/app/global-not-found.tsx';
    const fixture3 = 'test/e2e/app-dir/initial-css-order/app/global-not-found.tsx';

    expect(isLikelyTestFile(fixture1)).toBe(false);
    expect(isLikelyTestFile(fixture2)).toBe(false);
    expect(isLikelyTestFile(fixture3)).toBe(false);

    const inspection1 = inspectTestContent(
      'export default function GlobalNotFound() { return <div>Not Found</div>; }',
      fixture1
    );
    expect(inspection1.isAutomatedTest).toBe(false);
    expect(inspection1.testRunner).toBe('fixture_component');
  });

  it('rejects components named page.tsx, layout.tsx, or not-found.tsx as tests even inside test directories', () => {
    expect(isLikelyTestFile('test/e2e/app-dir/dynamic-route/app/page.tsx')).toBe(false);
    expect(isLikelyTestFile('test/fixtures/app/layout.tsx')).toBe(false);
    expect(isLikelyTestFile('test/e2e/app-dir/not-found/app/not-found.tsx')).toBe(false);
  });

  it('identifies genuine test suites with test runner calls and assertions', () => {
    const realTestPath = 'test/e2e/app-dir/not-found/not-found.test.ts';
    expect(isLikelyTestFile(realTestPath)).toBe(true);

    const realContent = `
      import { nextTestSetup } from 'e2e-utils'
      describe('app dir not-found', () => {
        const { next } = nextTestSetup({ files: __dirname })
        it('should render not-found in dynamic segment layout with status 404', async () => {
          const $ = await next.render$('/dynamic/nope')
          expect($('body').text()).toContain('Not Found')
          expect($('header').text()).toContain('Root Layout')
        })
      })
    `;
    const inspection = inspectTestContent(realContent, realTestPath);
    expect(inspection.isAutomatedTest).toBe(true);
    expect(inspection.assertionsFound).toBe(true);
    expect(inspection.testRunner).toBe('describe/it');
  });

  it('does not count an assertion in an unrelated test as evidence for the current criterion', () => {
    const unrelatedTestPath = 'test/e2e/app-dir/css-chunks/css-chunks.test.ts';
    const unrelatedContent = `
      describe('css chunks order', () => {
        it('renders css in correct order', async () => {
          expect(1 + 1).toBe(2);
        })
      })
    `;
    const relevance = evaluateTestRelevance(
      unrelatedTestPath,
      unrelatedContent,
      'When notFound() is thrown during dynamic segment render, layout should render',
      'When notFound() is thrown'
    );
    expect(relevance.isRelevant).toBe(false);
    expect(relevance.verdict).toBe('UNRELATED');
  });

  it('marks relevant inspected tests as "inspected" and "not executed"', () => {
    const relevantPath = 'test/e2e/app-dir/not-found/dynamic-not-found.test.ts';
    const relevantContent = `
      describe('dynamic notFound()', () => {
        it('renders notFound inside layout for initial HTML', async () => {
          expect(response.status).toBe(404);
        })
      })
    `;
    const relevance = evaluateTestRelevance(
      relevantPath,
      relevantContent,
      'When notFound() is thrown during dynamic segment render, layout should render',
      'When notFound() is thrown'
    );
    expect(relevance.isRelevant).toBe(true);
    expect(relevance.verdict).toBe('CONFIRMED_RELEVANT');

    const testFiles = [
      {
        path: relevantPath,
        source_id: 'test-1',
        verified_exists: true,
        assertions_inspected: true,
        is_automated_test: true,
        relevance_verdict: 'CONFIRMED_RELEVANT' as const,
        test_executed: false as const,
      },
    ];

    const crit: AcceptanceCriterion = {
      id: 'AC-01',
      description: 'notFound() in dynamic segment should render inside layout',
      criterion_type: 'EXPLICIT',
      exact_quote: 'boundary should be rendered inside of the layout',
      status: 'ACTIONABLE',
      status_rationale: 'Valid',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: {
        status: 'TEST EVIDENCE FOUND',
        candidate_test_files: testFiles,
        rationale: 'Relevant test inspected',
        assertions_inspected: true,
        test_executed: false,
      },
    };

    const result = runDeterministicClaimGate(
      [crit],
      mockSources,
      [relevantPath, 'package.json'],
      mockMetadata,
      mockScanBoundaries,
      mockSetupTruth
    );

    const valEvidence = result.validatedCriteria[0].test_evidence;
    expect(valEvidence.status).toBe('TEST EVIDENCE FOUND');
    expect(valEvidence.test_executed).toBe(false);
    expect(valEvidence.rationale).toContain('NOT executed');
  });

  it('rejects fabricated candidate test paths not in repository tree', () => {
    const fakeTest: AcceptanceCriterion = {
      id: 'AC-01',
      description: 'Check notFound',
      criterion_type: 'AI-PROPOSED',
      status: 'ACTIONABLE',
      status_rationale: '',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: {
        status: 'POSSIBLE TEST CANDIDATE',
        candidate_test_files: [{ path: 'test/non-existent/fake.test.ts', source_id: 'src-1', verified_exists: false }],
        rationale: '',
      },
    };

    const result = runDeterministicClaimGate(
      [fakeTest],
      mockSources,
      ['package.json'],
      mockMetadata,
      mockScanBoundaries,
      mockSetupTruth
    );

    expect(result.audit.rejected_paths_count).toBeGreaterThan(0);
    expect(result.validatedCriteria[0].test_evidence.candidate_test_files.length).toBe(0);
    expect(result.validatedCriteria[0].test_evidence.status).toBe('NO TEST EVIDENCE FOUND IN SCANNED FILES');
  });
});

describe('BUG 3 — Gemma Fails But UI/Proof-Bundle Claims Success', () => {
  it('sets engine to baseline and analysis_status to baseline_fallback when fallback is used', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries,
      'Internal error encountered (HTTP 500)',
      false
    );

    expect(contract.engine).toBe('baseline');
    expect(contract.analysis_status).toBe('baseline_fallback');
    expect(contract.engine_details?.fallback_reason).toContain('HTTP 500');
    expect(contract.engine_details?.guardrails_passed).toBe(true);
  });

  it('does NOT report "Key Missing" when key is configured but inference fails', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries,
      '500 Internal error encountered',
      false // isMissingKey is false!
    );

    const markdown = generateProofBundleMarkdown(contract);
    expect(markdown).toContain('Gemma request failed — Baseline fallback used');
    expect(markdown).not.toContain('GEMMA_API_KEY pending');
  });

  it('ensures exported Proof Bundle JSON and Markdown serialize consistent engine and fallback state', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries,
      'Model service quota exceeded',
      false
    );

    const markdown = generateProofBundleMarkdown(contract);
    const jsonStr = generateProofBundleJson(contract);
    const parsedJson = JSON.parse(jsonStr);

    expect(markdown).toContain('Baseline fallback used');
    expect(parsedJson.engine).toBe('baseline');
    expect(parsedJson.analysis_status).toBe('baseline_fallback');
    expect(parsedJson.engine_details.guardrails_passed).toBe(true);
  });
});

describe('BUG 4 — Target Repo Commands and Reproduction-App Commands are Distinct', () => {
  it('does not conflate reproduction repo commands with target repository package scripts', () => {
    const reproEnv = extractReproductionEnvironment(NEXTJS_100596_BODY);
    expect(reproEnv).toBeDefined();

    // Reproduction commands use npm
    expect(reproEnv?.reproduction_commands).toContain('npm install && npm run build && npm run start');

    // Target repo setup truth uses pnpm
    expect(mockSetupTruth.install_command?.command).toBe('pnpm install');
    expect(mockSetupTruth.test_command?.command).toBe('pnpm test');
    expect(mockSetupTruth.run_command?.command).toBe('pnpm dev');

    // Contract preserves both distinctly
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.setup_truth.install_command?.command).toBe('pnpm install');
    expect(contract.reproduction_environment?.reproduction_commands).toContain(
      'npm install && npm run build && npm run start'
    );
  });

  it('keeps localhost curl requests as manual validation scenarios', () => {
    const reproEnv = extractReproductionEnvironment(NEXTJS_100596_BODY);
    expect(reproEnv?.manual_validation_scenarios).toHaveLength(2);
    expect(reproEnv?.manual_validation_scenarios[0]).toBe('curl -s http://localhost:3000/nope');
    expect(reproEnv?.manual_validation_scenarios[1]).toBe('curl -s http://localhost:3000/this/does/not/exist');
  });

  it('formats target repository setup and reproduction project commands in separate sections in Markdown export', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    const md = generateProofBundleMarkdown(contract);
    expect(md).toContain('### A. Target Repository Setup (vercel/next.js)');
    expect(md).toContain('`pnpm install` (DOCUMENTED)');
    expect(md).toContain('### B. Issue Reproduction Environment');
    expect(md).toContain('https://github.com/molovo/next-notfound-empty-body');
    expect(md).toContain('`npm install && npm run build && npm run start`');
    expect(md).toContain('`curl -s http://localhost:3000/nope`');
  });
});

describe('BUG 5 — Repository URL and Duplicate Numbering', () => {
  it('points project-owned repository link to rudraarcadeskills-art/IssueLift and not issuelift/issuelift', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    const md = generateProofBundleMarkdown(contract);
    expect(md).not.toContain('github.com/issuelift/issuelift');
    expect(md).toContain(`[IssueLift](${ISSUELIFT_REPO_URL})`);
    expect(ISSUELIFT_REPO_URL).toBe('https://github.com/rudraarcadeskills-art/IssueLift-HackDay-2026');
  });

  it('does NOT produce duplicate numbers like "1. 1." in First-Hour Route serialization', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    // Pass items that might already have "1. " or "2. "
    contract.first_hour_route = [
      '1. Clone vercel/next.js and checkout a new branch',
      '2. Run documented setup',
      '3. Execute test suite',
    ];

    const md = generateProofBundleMarkdown(contract);

    expect(md).not.toMatch(/\d+\.\s+\d+\./);
    expect(md).toContain('1. Clone vercel/next.js and checkout a new branch');
    expect(md).toContain('2. Run documented setup');
    expect(md).toContain('3. Execute test suite');
  });

  it('serializes matching project URL metadata and engine status in both Markdown and JSON bundles', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json'],
      mockSetupTruth,
      mockScanBoundaries
    );

    const md = generateProofBundleMarkdown(contract);
    const jsonStr = generateProofBundleJson(contract);
    const parsed = JSON.parse(jsonStr);

    expect(md).toContain(ISSUELIFT_REPO_URL);
    expect(md).not.toContain('github.com/issuelift/issuelift');
    expect(parsed.issuelift_project_url).toBe(ISSUELIFT_REPO_URL);
    expect(parsed.issuelift_canonical_url).toBe('https://issue-lift.vercel.app/');
    expect(parsed.issuelift_project_url).not.toContain('issuelift/issuelift');
  });
});

describe('BUG 6 — Test Evidence Normalization & Serialization Consistency', () => {
  it('correctly aggregates mixed relevant and unrelated candidates without contradiction', () => {
    const candidates: CandidateTestFile[] = [
      {
        path: 'test/e2e/app-dir/not-found/not-found.test.ts',
        source_id: 'repo-tree',
        verified_exists: true,
        assertions_inspected: true,
        is_automated_test: true,
        relevance_verdict: 'CONFIRMED_RELEVANT',
        test_executed: false,
      },
      {
        path: 'test/e2e/app-dir/css-chunks/css-chunks.test.ts',
        source_id: 'repo-tree',
        verified_exists: true,
        assertions_inspected: true,
        is_automated_test: true,
        relevance_verdict: 'UNRELATED',
        test_executed: false,
      },
    ];

    const summary = deriveTestEvidenceSummary(candidates, {
      isTreeTruncated: false,
      criterionDescription: 'notFound() in dynamic segment renders not-found copy inside layout',
    });

    expect(summary.status).toBe('TEST EVIDENCE FOUND');
    expect(summary.assertions_inspected).toBe(true);
    expect(summary.test_executed).toBe(false);
    expect(summary.rationale).toContain('Located relevant automated test file(s)');
    expect(summary.rationale).toContain('not-found.test.ts');
    expect(summary.rationale).toContain('css-chunks.test.ts');
    expect(summary.rationale).toContain('unrelated');
    expect(summary.rationale).not.toContain('Assertions not inspected');
    expect(summary.rationale).toContain('NOT executed (security guardrail');
  });

  it('correctly reports all-unrelated candidates as inspected without claiming assertions were not inspected', () => {
    const candidates: CandidateTestFile[] = [
      {
        path: 'test/e2e/app-dir/css-chunks/css-chunks.test.ts',
        source_id: 'repo-tree',
        verified_exists: true,
        assertions_inspected: true,
        is_automated_test: true,
        relevance_verdict: 'UNRELATED',
        test_executed: false,
      },
    ];

    const summary = deriveTestEvidenceSummary(candidates, {
      isTreeTruncated: false,
      criterionDescription: 'notFound() in dynamic segment renders not-found copy inside layout',
    });

    expect(summary.status).toBe('NO TEST EVIDENCE FOUND IN SCANNED FILES');
    // Individual child had assertions inspected, so aggregate assertions_inspected MUST be true
    expect(summary.assertions_inspected).toBe(true);
    expect(summary.test_executed).toBe(false);
    expect(summary.rationale).toContain('do not verify criterion requirements');
    expect(summary.rationale).toContain('Test assertions were inspected');
    expect(summary.rationale).not.toContain('Assertions not inspected');
    expect(summary.rationale).toContain('tests were NOT executed');
  });

  it('honestly reports unavailable content or uninspected candidates', () => {
    const candidates: CandidateTestFile[] = [
      {
        path: 'test/e2e/app-dir/not-found/uninspected.test.ts',
        source_id: 'repo-tree',
        verified_exists: true,
        assertions_inspected: false,
        is_automated_test: true,
        relevance_verdict: 'POTENTIALLY_RELEVANT',
        test_executed: false,
      },
    ];

    const summary = deriveTestEvidenceSummary(candidates, {
      isTreeTruncated: false,
      criterionDescription: 'notFound() in dynamic segment renders not-found copy inside layout',
    });

    expect(summary.status).toBe('POSSIBLE TEST CANDIDATE');
    expect(summary.assertions_inspected).toBe(false);
    expect(summary.test_executed).toBe(false);
    expect(summary.rationale).toContain('File content was unavailable or assertions were not inspected');
    expect(summary.rationale).toContain('test execution has NOT occurred');
  });

  it('guarantees test_executed is strictly false and third-party tests are never executed', () => {
    const candidates: CandidateTestFile[] = [
      {
        path: 'test/e2e/app-dir/not-found/not-found.test.ts',
        source_id: 'repo-tree',
        verified_exists: true,
        assertions_inspected: true,
        is_automated_test: true,
        relevance_verdict: 'CONFIRMED_RELEVANT',
        test_executed: true as any, // hostile input attempting to claim execution
      },
    ];

    const summary = deriveTestEvidenceSummary(candidates, { isTreeTruncated: false });

    // Invariant: test_executed is reset to false on both child and aggregate
    expect(summary.test_executed).toBe(false);
    expect(summary.candidate_test_files[0].test_executed).toBe(false);
  });

  it('ensures consistent UI, Markdown, and JSON evidence summaries without contradiction', () => {
    const candidate: CandidateTestFile = {
      path: 'test/e2e/app-dir/not-found/not-found.test.ts',
      source_id: 'repo-tree',
      verified_exists: true,
      assertions_inspected: true,
      is_automated_test: true,
      relevance_verdict: 'CONFIRMED_RELEVANT',
      test_executed: false,
    };

    const evidenceSummary = deriveTestEvidenceSummary([candidate], {
      isTreeTruncated: false,
      criterionDescription: 'Sample requirement',
    });

    const mockCriterion: AcceptanceCriterion = {
      id: 'AC-01',
      description: 'Sample requirement',
      criterion_type: 'EXPLICIT',
      status: 'ACTIONABLE',
      status_rationale: 'Verified',
      needs_maintainer_clarification: false,
      candidate_implementation_files: [],
      test_evidence: evidenceSummary,
    };

    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      ['package.json', candidate.path],
      mockSetupTruth,
      mockScanBoundaries
    );
    contract.criteria = [mockCriterion];

    const md = generateProofBundleMarkdown(contract);
    const jsonStr = generateProofBundleJson(contract);
    const parsed = JSON.parse(jsonStr);

    // Formatted candidate summary matches Markdown
    const formatted = formatCandidateTestFileSummary(candidate);
    expect(md).toContain(formatted.fullSummary);
    expect(md).toContain('[Verified Relevant Automated Test]');
    expect(md).toContain('Inspected: Yes');
    expect(md).toContain('Executed: No');

    // JSON export agrees exactly with Markdown and child candidate record
    expect(parsed.criteria[0].test_evidence.status).toBe('TEST EVIDENCE FOUND');
    expect(parsed.criteria[0].test_evidence.assertions_inspected).toBe(true);
    expect(parsed.criteria[0].test_evidence.test_executed).toBe(false);
    expect(parsed.criteria[0].test_evidence.candidate_test_files[0].assertions_inspected).toBe(true);
    expect(parsed.criteria[0].test_evidence.candidate_test_files[0].test_executed).toBe(false);
  });
});

describe('BUG 7 — Implementation File Ranking & Fixture Separation', () => {
  it('correctly classifies fixture application components as fixtures, not primary implementation sources', () => {
    const fixture1 = 'test/e2e/app-dir/fixtures/dynamic-not-found/not-found.tsx';
    const fixture2 = 'test/development/app-dir/segment-explorer-globals/app/global-not-found.tsx';
    const prodFile1 = 'packages/next/src/server/app-render/app-render.tsx';
    const prodFile2 = 'packages/next/src/client/components/not-found.tsx';

    expect(isTestOrFixturePath(fixture1)).toBe(true);
    expect(isTestOrFixturePath(fixture2)).toBe(true);
    expect(isTestOrFixturePath(prodFile1)).toBe(false);
    expect(isTestOrFixturePath(prodFile2)).toBe(false);
  });

  it('ranks genuine production implementation files in app-render above fixture application files for issue #100596', () => {
    const fileList = [
      'test/e2e/app-dir/fixtures/dynamic-not-found/not-found.tsx',
      'test/development/app-dir/segment-explorer-globals/app/global-not-found.tsx',
      'packages/next/src/server/app-render/app-render.tsx',
      'packages/next/src/client/components/not-found.tsx',
      'test/e2e/app-dir/not-found/index.test.ts',
      'package.json',
    ];

    const ranked = rankRepositoryPaths(
      fileList,
      mockMetadata.title,
      ACTUAL_NEXTJS_100596_BODY,
      ['area: app', 'template: bug']
    );

    // Primary production implementation file ranked #1 in sourceCandidates
    expect(ranked.sourceCandidates.length).toBeGreaterThan(0);
    expect(ranked.sourceCandidates[0]).toBe('packages/next/src/server/app-render/app-render.tsx');

    // Fixture files are separated into fixtureCandidates and not in top sourceCandidates
    expect(ranked.fixtureCandidates).toContain('test/e2e/app-dir/fixtures/dynamic-not-found/not-found.tsx');
    expect(ranked.sourceCandidates.includes('test/e2e/app-dir/fixtures/dynamic-not-found/not-found.tsx')).toBe(false);

    // Test file is in testCandidates
    expect(ranked.testCandidates).toContain('test/e2e/app-dir/not-found/index.test.ts');
  });

  it('maintains strict separation between the five evidence states and reports limitations honestly', () => {
    const fileList = [
      'packages/next/src/server/app-render/app-render.tsx',
      'test/e2e/app-dir/not-found/not-found.test.ts',
      'package.json',
    ];

    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      fileList,
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.criteria.length).toBeGreaterThan(0);
    const criterion = contract.criteria[0];

    // State 1: path exists in tree
    expect(criterion.candidate_implementation_files[0].path).toBe('packages/next/src/server/app-render/app-render.tsx');
    expect(criterion.candidate_implementation_files[0].verified_exists).toBe(true);

    // State 2 & 3: relevance inferred from content/tree, not claimed as maintainer-verified
    expect(criterion.candidate_implementation_files[0].relevance_status).toBe('AI-INFERRED');

    // State 4: test assertions inspected
    expect(criterion.test_evidence.assertions_inspected).toBe(false); // content was uninspected in this tree

    // State 5: test actually executed (must ALWAYS be false)
    expect(criterion.test_evidence.test_executed).toBe(false);
  });
});

describe('BUG 8 — Grouping Example Snippets into Meaningful Acceptance Criteria', () => {
  const TS_63380_BODY = `### TypeScript Version

5.8.0-dev.20250212

### Search Terms

default generic, nested call, generic inference

### Expected Behavior

I would expect that both of these approaches would compile:

\`\`\`ts
const join = <TDelimiter extends string = ',', TParts extends string[] = string[]>(
  ...parts: TParts
): Join<TParts, TDelimiter> => parts.join(',') as any

type Join<THead, TTail> = any

expect(join('Hello', 'World')).toBe('HelloWorld') // bad

const withoutSeparator = join('Hello', 'World')
expect(withoutSeparator).toBe("HelloWorld") // good
\`\`\`

### Actual Behavior

Type inference fails for the first approach.`;

  it('groups example snippets into ONE meaningful EXPLICIT criterion for TypeScript issue #63380', () => {
    const criteria = extractExplicitCriteria(
      TS_63380_BODY,
      'https://github.com/microsoft/TypeScript/issues/63380'
    );

    // Must NOT fragment one expected-behaviour requirement into 4 standalone criteria
    expect(criteria.length).toBe(1);

    const criterion = criteria[0];
    expect(criterion.criterion_type).toBe('EXPLICIT');
    expect(criterion.description).toBe(
      'Both the nested generic call and the variable-assigned approach should compile with the expected inferred type.'
    );
    expect(criterion.exact_quote).toBe('I would expect that both of these approaches would compile:');
    expect(TS_63380_BODY).toContain(criterion.exact_quote!);

    // Code snippets retained as supporting validation examples, not promoted to independent criteria
    expect(criterion.test_evidence.proposed_manual_validation).toContain("join('Hello', 'World')");
    expect(criterion.test_evidence.proposed_manual_validation).toContain('withoutSeparator');
  });

  it('groups code examples under Expected behavior into a single EXPLICIT criterion for another issue', () => {
    const DATE_ISSUE_BODY = `### Description
The date formatting utility behaves unexpectedly when timezone is UTC.

### Expected Behavior
The date formatting helper should return ISO 8601 strings when timezone is specified:

\`\`\`ts
formatDate(new Date('2026-01-01'), 'UTC') // => '2026-01-01T00:00:00.000Z'
\`\`\`

### Steps to Reproduce
Call formatDate with UTC.`;

    const criteria = extractExplicitCriteria(
      DATE_ISSUE_BODY,
      'https://github.com/example/date-utils/issues/42'
    );

    expect(criteria.length).toBe(1);
    const criterion = criteria[0];
    expect(criterion.criterion_type).toBe('EXPLICIT');
    expect(criterion.description).toBe(
      'The date formatting helper should return ISO 8601 strings when timezone is specified'
    );
    expect(criterion.exact_quote).toBe(
      'The date formatting helper should return ISO 8601 strings when timezone is specified:'
    );
    expect(DATE_ISSUE_BODY).toContain(criterion.exact_quote!);

    // Code example is in proposed manual validation, NOT an independent criterion
    expect(criterion.test_evidence.proposed_manual_validation).toContain("formatDate(new Date('2026-01-01'), 'UTC')");
  });

  it('does NOT fabricate explicit criteria when the issue has no explicit expected behavior', () => {
    const BUG_ONLY_BODY = `### Problem
The application crashes with segmentation fault on launch.

### Stack Trace
\`\`\`
error: crash at 0xdeadbeef
\`\`\``;

    const criteria = extractExplicitCriteria(
      BUG_ONLY_BODY,
      'https://github.com/example/repo/issues/99'
    );

    expect(criteria.length).toBe(0);

    const contract = compileDeterministicBaselineContract(
      {
        url: 'https://github.com/example/repo/issues/99',
        owner: 'example',
        repo: 'repo',
        number: 99,
        title: 'Crash on launch',
        body: BUG_ONLY_BODY,
        state: 'open',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        author: { login: 'user', avatar_url: '', html_url: '' },
        assignees: [],
        labels: [{ name: 'bug', color: 'red' }],
        comments_count: 0,
        has_linked_pr_signal: false,
        default_branch: 'main',
        checked_at: '2026-01-01T00:00:00Z',
      },
      [],
      ['src/index.ts'],
      mockSetupTruth,
      mockScanBoundaries
    );

    // Fallback creates AI-PROPOSED criterion with AMBIGUOUS status, not EXPLICIT
    expect(contract.criteria.length).toBe(1);
    expect(contract.criteria[0].criterion_type).toBe('AI-PROPOSED');
    expect(contract.criteria[0].exact_quote).toBeUndefined();
    expect(contract.criteria[0].status).toBe('AMBIGUOUS');
  });
});

describe('BUG 9 — TypeScript Source Ranking & Test-File Surfacing', () => {
  const tsIssueMetadata: GitHubIssueMetadata = {
    url: 'https://github.com/microsoft/TypeScript/issues/63380',
    owner: 'microsoft',
    repo: 'TypeScript',
    number: 63380,
    title: 'Wrong inference for defaulted generic in nested call',
    body: `I would expect that both of these approaches would compile:

\`\`\`ts
const join = <TDelimiter extends string = ',', TParts extends string[] = string[]>(
  ...parts: TParts
): Join<TParts, TDelimiter> => parts.join(',') as any

type Join<THead, TTail> = any

expect(join('Hello', 'World')).toBe('HelloWorld') // bad

const withoutSeparator = join('Hello', 'World')
expect(withoutSeparator).toBe("HelloWorld") // good
\`\`\``,
    state: 'open',
    created_at: '2025-02-12T12:00:00Z',
    updated_at: '2025-02-13T12:00:00Z',
    author: { login: 'alex', avatar_url: '', html_url: '' },
    assignees: [],
    labels: [
      { name: 'Bug', color: 'd73a4a' },
      { name: 'Domain: check: Type Inference', color: 'bfdadc' },
    ],
    comments_count: 1,
    comments: [
      {
        author: 'Hamzaa6296',
        body: 'Should this fix target the main `microsoft/TypeScript` repo, or `microsoft/typescript-go`? From my trace, the problem relates to `inferTypeArguments` inside `checker.ts`.',
        created_at: '2025-02-13T00:00:00Z',
        html_url: '',
      },
    ],
    has_linked_pr_signal: false,
    default_branch: 'main',
    checked_at: '2025-02-13T00:00:00Z',
  };

  const tsRepoFiles = [
    'src/compiler/checker.ts',
    'src/compiler/parser.ts',
    'src/compiler/binder.ts',
    'src/compiler/types.ts',
    'packages/typescript/src/api/fsCallbacks.ts',
    'packages/typescript/src/api/prepareCompilerOptions.generated.ts',
    'package.json',
  ];

  it('ranks src/compiler/checker.ts above fsCallbacks.ts and prepareCompilerOptions for issue #63380', () => {
    const ranked = rankRepositoryPaths(
      tsRepoFiles,
      tsIssueMetadata.title,
      tsIssueMetadata.body,
      tsIssueMetadata.labels.map((l) => l.name),
      ['Both the nested generic call and the variable-assigned approach should compile with the expected inferred type.'],
      tsIssueMetadata.comments || []
    );

    expect(ranked.sourceCandidates.length).toBeGreaterThan(0);
    expect(ranked.sourceCandidates[0]).toBe('src/compiler/checker.ts');

    // fsCallbacks.ts and prepareCompilerOptions.generated.ts should not be top candidates
    expect(ranked.sourceCandidates[0]).not.toBe('packages/typescript/src/api/fsCallbacks.ts');
    expect(ranked.sourceCandidates[0]).not.toBe('packages/typescript/src/api/prepareCompilerOptions.generated.ts');
  });

  it('does NOT hardcode checker.ts for all TypeScript issues and ranks parser.ts when appropriate', () => {
    const parserIssueMetadata: GitHubIssueMetadata = {
      ...tsIssueMetadata,
      number: 63400,
      title: 'Syntax error recovery in decorator expression parser',
      body: 'Parser fails to recover after syntax error inside decorator.',
      labels: [{ name: 'Bug', color: 'd73a4a' }, { name: 'Domain: Parser', color: 'bfdadc' }],
      comments: [{ author: 'user', body: 'Investigating parser recovery in parser.ts', created_at: '', html_url: '' }],
    };

    const ranked = rankRepositoryPaths(
      tsRepoFiles,
      parserIssueMetadata.title,
      parserIssueMetadata.body,
      parserIssueMetadata.labels.map((l) => l.name),
      ['Parser should recover after syntax error'],
      parserIssueMetadata.comments || []
    );

    expect(ranked.sourceCandidates[0]).toBe('src/compiler/parser.ts');
  });

  it('preserves CLARIFY FIRST when target repository is ambiguous between legacy TypeScript and TypeScript-Go', () => {
    const contract = compileDeterministicBaselineContract(
      tsIssueMetadata,
      [],
      tsRepoFiles,
      mockSetupTruth,
      mockScanBoundaries
    );

    expect(contract.readiness_gate.verdict).toBe('CLARIFY FIRST');
    expect(
      contract.readiness_gate.reasons.some((r) =>
        r.toLowerCase().includes('typescript-go') || r.toLowerCase().includes('legacy')
      )
    ).toBe(true);
    expect(contract.maintainer_handoff.clarification_question).toContain('TypeScript-Go');
  });

  it('surfaces inspected test files under tsc/internal/fourslash/tests/ when tree is truncated and retains SCAN INCOMPLETE / UNKNOWN', () => {
    const truncatedScanBoundaries: ScanBoundaries = {
      total_files_in_tree: 50000,
      scanned_files_count: 500,
      is_tree_truncated: true,
      checked_at: '2026-03-01T00:00:00Z',
    };

    const testSources: SourceEvidence[] = [
      {
        source_id: 'test-content-fourslash-1',
        canonical_url: 'https://github.com/microsoft/TypeScript/blob/main/tsc/internal/fourslash/tests/genericInferenceNested.ts',
        path: 'tsc/internal/fourslash/tests/genericInferenceNested.ts',
        source_type: 'test',
        excerpt: `// FourSlash test for generic type inference in nested call
/// <reference path="../fourslash.ts" />
const join = <TDelimiter extends string = ',', TParts extends string[] = string[]>(...parts: TParts): any => {};
// verify inference and type resolution
verify.quickInfoAt("1", "string");`,
        verified_exists: true,
        verification_status: 'VERIFIED',
      },
    ];

    // Truncated repo tree that did not reach test directories
    const truncatedRepoFiles = [
      'src/compiler/checker.ts',
      'src/compiler/types.ts',
      'package.json',
    ];

    const contract = compileDeterministicBaselineContract(
      tsIssueMetadata,
      testSources,
      truncatedRepoFiles,
      mockSetupTruth,
      truncatedScanBoundaries
    );

    expect(contract.criteria.length).toBe(1);
    const criterion = contract.criteria[0];

    // Must surface the inspected test file instead of showing an empty list
    expect(criterion.test_evidence.candidate_test_files.length).toBeGreaterThan(0);
    const candidateTest = criterion.test_evidence.candidate_test_files.find(
      (t) => t.path === 'tsc/internal/fourslash/tests/genericInferenceNested.ts'
    );
    expect(candidateTest).toBeDefined();
    expect(candidateTest?.assertions_inspected).toBe(true);
    expect(candidateTest?.relevance_verdict).toBe('RELEVANT');
    expect(candidateTest?.test_executed).toBe(false);

    // Tree truncation honestly reported as SCAN INCOMPLETE / UNKNOWN
    expect(criterion.test_evidence.status).toBe('SCAN INCOMPLETE / UNKNOWN');
    expect(criterion.test_evidence.test_executed).toBe(false);
    expect(criterion.test_evidence.rationale).toContain('truncated');
  });
});

describe('BUG 10 — Test Evidence Relevance & Provenance for TypeScript Issue #63380', () => {
  const tsCriterionDescription =
    'Both the nested generic call and the variable-assigned approach should compile with the expected inferred type.';
  const tsExactQuote = 'I would expect that both of these approaches would compile:';

  const tsMetadata: GitHubIssueMetadata = {
    url: 'https://github.com/microsoft/TypeScript/issues/63380',
    owner: 'microsoft',
    repo: 'TypeScript',
    number: 63380,
    title: 'Wrong inference for defaulted generic in nested call',
    body: `### Expected Behavior\n\nI would expect that both of these approaches would compile:\n\n\`\`\`ts\nconst join = <TDelimiter extends string = ',', TParts extends string[] = string[]>(\n  ...parts: TParts\n): Join<TParts, TDelimiter> => parts.join(',') as any\n\nexpect(join('Hello', 'World')).toBe('HelloWorld')\n\`\`\``,
    state: 'open',
    created_at: '2025-02-12T12:00:00Z',
    updated_at: '2025-02-13T12:00:00Z',
    author: { login: 'alex', avatar_url: '', html_url: '' },
    assignees: [],
    labels: [{ name: 'Bug', color: 'd73a4a' }],
    comments_count: 0,
    has_linked_pr_signal: false,
    default_branch: 'main',
    checked_at: '2025-02-13T12:00:00Z',
  };

  it('treats generic optional value parameters as RELATED/UNCONFIRMED false positive for issue #63380', () => {
    const testPath = 'tests/cases/compiler/genericOptionalValueParameters.ts';
    const content = `
      function foo<T = string>(x?: T) { return x; }
      foo();
      foo('hello');
      expect(foo()).toBeUndefined();
    `;

    const relevance = evaluateTestRelevance(testPath, content, tsCriterionDescription, tsExactQuote);

    // Must NOT be labeled RELEVANT
    expect(relevance.isRelevant).toBe(false);
    expect(relevance.verdict).toBe('UNCONFIRMED');
    expect(relevance.rationale).toContain('generic optional value parameters');
    expect(relevance.rationale).toContain('RELATED/UNCONFIRMED');
  });

  it('treats generic constructor signature-help as RELATED/UNCONFIRMED false positive for issue #63380', () => {
    const testPath = 'tests/cases/fourslash/genericConstructorSignatureHelp.ts';
    const content = `
      /// <reference path="fourslash.ts" />
      class Box<T = number> {
        constructor(public val?: T) {}
      }
      new Box/*1*/();
      verify.signatureHelpPresent();
    `;

    const relevance = evaluateTestRelevance(testPath, content, tsCriterionDescription, tsExactQuote);

    // Must NOT be labeled RELEVANT
    expect(relevance.isRelevant).toBe(false);
    expect(relevance.verdict).toBe('UNCONFIRMED');
    expect(relevance.rationale).toContain('generic constructor signature-help');
    expect(relevance.rationale).toContain('RELATED/UNCONFIRMED');
  });

  it('treats generic call signatures as RELATED/UNCONFIRMED false positive for issue #63380', () => {
    const testPath = 'tests/cases/compiler/genericCallSignatures.ts';
    const content = `
      interface Callable<T> {
        (arg: T): T;
      }
      declare const c: Callable<number>;
      expect(c(42)).toBe(42);
    `;

    const relevance = evaluateTestRelevance(testPath, content, tsCriterionDescription, tsExactQuote);

    // Must NOT be labeled RELEVANT
    expect(relevance.isRelevant).toBe(false);
    expect(relevance.verdict).toBe('UNCONFIRMED');
    expect(relevance.rationale).toContain('generic call signatures');
    expect(relevance.rationale).toContain('RELATED/UNCONFIRMED');
  });

  it('never uses filename or keyword similarity alone as proof of relevance', () => {
    const candidatePath = 'tests/cases/compiler/nestedGenericCallInference.ts';

    // 1. Uninspected / unavailable content returns UNKNOWN
    const uninspectedRelevance = evaluateTestRelevance(
      candidatePath,
      undefined,
      tsCriterionDescription,
      tsExactQuote
    );
    expect(uninspectedRelevance.isRelevant).toBe(false);
    expect(uninspectedRelevance.verdict).toBe('UNKNOWN');
    expect(uninspectedRelevance.rationale).toContain('not fetched or inspected');

    // 2. Inspected content without assertions or relevant testing returns UNRELATED
    const unrelatedContent = `
      // nested generic call inference file
      const x = 1;
    `;
    const unrelatedRelevance = evaluateTestRelevance(
      candidatePath,
      unrelatedContent,
      tsCriterionDescription,
      tsExactQuote
    );
    expect(unrelatedRelevance.isRelevant).toBe(false);
    expect(unrelatedRelevance.verdict).toBe('UNRELATED');
  });

  it('labels test RELEVANT only when inspected content meaningfully tests nested call inference with omitted defaulted generic', () => {
    const testPath = 'tests/cases/compiler/nestedDefaultedGenericInference.ts';
    const relevantContent = `
      // Meaningful test for nested function-call inference with omitted defaulted generic parameter
      /// <reference path="fourslash.ts" />
      const join = <TDelimiter extends string = ',', TParts extends string[] = string[]>(
        ...parts: TParts
      ): Join<TParts, TDelimiter> => parts.join(',') as any;
      type Join<THead, TTail> = any;
      expect(join('Hello', 'World')).toBe('HelloWorld');
    `;

    const relevance = evaluateTestRelevance(testPath, relevantContent, tsCriterionDescription, tsExactQuote);

    expect(relevance.isRelevant).toBe(true);
    expect(relevance.verdict).toBe('CONFIRMED_RELEVANT');
    expect(relevance.rationale).toContain('meaningfully verifies nested function-call inference');
  });

  it('ensures assertions_inspected: true is emitted ONLY when source contents were actually fetched and inspected', () => {
    // Repo tree has test files, but sources contains only uninspected tree references
    const treeOnlySources: SourceEvidence[] = [
      {
        source_id: 'test-file-1',
        canonical_url: 'https://github.com/microsoft/TypeScript/blob/main/tests/cases/compiler/genericCallSignatures.ts',
        path: 'tests/cases/compiler/genericCallSignatures.ts',
        source_type: 'test',
        excerpt: 'Candidate test file identified in repository tree (tests/cases/compiler/genericCallSignatures.ts)',
        verified_exists: true,
        verification_status: 'VERIFIED',
      },
    ];

    const repoFiles = [
      'src/compiler/checker.ts',
      'tests/cases/compiler/genericCallSignatures.ts',
      'package.json',
    ];

    const boundaries: ScanBoundaries = {
      total_files_in_tree: 50,
      scanned_files_count: 3,
      is_tree_truncated: false,
      checked_at: '2026-03-01T00:00:00Z',
    };

    const setupTruth: SetupTruth = {
      has_readme: false,
      has_contributing: false,
      notes: '',
    };

    const contract = compileDeterministicBaselineContract(
      tsMetadata,
      treeOnlySources,
      repoFiles,
      setupTruth,
      boundaries
    );

    const criterion = contract.criteria[0];
    const candidate = criterion.test_evidence.candidate_test_files[0];

    // Must be uninspected because source content was not fetched
    expect(candidate.assertions_inspected).toBe(false);
    expect(candidate.relevance_verdict).toBe('UNKNOWN');
    expect(criterion.test_evidence.assertions_inspected).toBe(false);
    expect(criterion.test_evidence.status).toBe('POSSIBLE TEST CANDIDATE');

    // UI summary reflects uninspected state
    const summary = formatCandidateTestFileSummary(candidate);
    expect(summary.inspectionText).toBe('Inspected: No (content unavailable)');
    expect(summary.executionText).toBe('Executed: No (untrusted code is never executed)');
  });

  it('ensures exported source inventory, candidate records, Markdown, and JSON agree', () => {
    const testSources: SourceEvidence[] = [
      {
        source_id: 'test-content-1',
        canonical_url: 'https://github.com/microsoft/TypeScript/blob/main/tests/cases/compiler/genericOptionalValueParameters.ts',
        path: 'tests/cases/compiler/genericOptionalValueParameters.ts',
        source_type: 'test',
        excerpt: `function foo<T = string>(x?: T) { return x; }\nfoo();\nexpect(foo()).toBeUndefined();`,
        verified_exists: true,
        verification_status: 'VERIFIED',
      },
    ];

    const repoFiles = [
      'src/compiler/checker.ts',
      'tests/cases/compiler/genericOptionalValueParameters.ts',
      'package.json',
    ];

    const boundaries: ScanBoundaries = {
      total_files_in_tree: 50,
      scanned_files_count: 3,
      is_tree_truncated: false,
      checked_at: '2026-03-01T00:00:00Z',
    };

    const setupTruth: SetupTruth = {
      has_readme: false,
      has_contributing: false,
      notes: '',
    };

    const contract = compileDeterministicBaselineContract(
      tsMetadata,
      testSources,
      repoFiles,
      setupTruth,
      boundaries
    );

    const criterion = contract.criteria[0];
    const candidate = criterion.test_evidence.candidate_test_files[0];

    // Candidate was fetched and inspected
    expect(candidate.assertions_inspected).toBe(true);
    expect(candidate.relevance_verdict).toBe('UNCONFIRMED');
    expect(candidate.test_executed).toBe(false);

    // Formatted summary
    const formatted = formatCandidateTestFileSummary(candidate);
    expect(formatted.badge).toBe('[Related / Unconfirmed Test Candidate]');
    expect(formatted.inspectionText).toBe('Inspected: Yes');
    expect(formatted.executionText).toBe('Executed: No (untrusted code is never executed)');

    // Markdown export agrees
    const markdown = generateProofBundleMarkdown(contract);
    expect(markdown).toContain('`tests/cases/compiler/genericOptionalValueParameters.ts` [Related / Unconfirmed Test Candidate] (Inspected: Yes, Executed: No (untrusted code is never executed))');
    expect(markdown).toContain('Test execution has NOT occurred');

    // JSON export agrees
    const jsonStr = generateProofBundleJson(contract);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.criteria[0].test_evidence.assertions_inspected).toBe(true);
    expect(parsed.criteria[0].test_evidence.candidate_test_files[0].assertions_inspected).toBe(true);
    expect(parsed.criteria[0].test_evidence.candidate_test_files[0].relevance_verdict).toBe('UNCONFIRMED');
    expect(parsed.criteria[0].test_evidence.candidate_test_files[0].test_executed).toBe(false);
    expect(parsed.sources[0].source_id).toBe('test-content-1');
  });

  it('keeps SCAN INCOMPLETE / UNKNOWN when repository tree is truncated and does not invent missing files or claim execution', () => {
    const truncatedScanBoundaries: ScanBoundaries = {
      total_files_in_tree: 50000,
      scanned_files_count: 500,
      is_tree_truncated: true,
      checked_at: '2026-03-01T00:00:00Z',
    };

    // Sources contains only non-test or uninspected files
    const repoFiles = ['src/compiler/checker.ts', 'src/compiler/parser.ts', 'package.json'];
    const setupTruth: SetupTruth = {
      has_readme: false,
      has_contributing: false,
      notes: '',
    };

    const contract = compileDeterministicBaselineContract(
      tsMetadata,
      [],
      repoFiles,
      setupTruth,
      truncatedScanBoundaries
    );

    const criterion = contract.criteria[0];
    expect(criterion.test_evidence.status).toBe('SCAN INCOMPLETE / UNKNOWN');
    expect(criterion.test_evidence.test_executed).toBe(false);
    expect(criterion.test_evidence.rationale).toContain('truncated');
    // Does not invent phantom test files
    expect(criterion.test_evidence.candidate_test_files.length).toBe(0);
  });
});

describe('BUG 11 — Proof Bundle Export Candidate Implementation Provenance Mapping', () => {
  it('maps each criterion candidate implementation file to an accurate source record in top-level sources', () => {
    const fileList = [
      'packages/next/src/server/app-render/app-render.tsx',
      'packages/next/src/client/components/not-found.tsx',
      'packages/next/src/shared/lib/router.ts',
    ];

    // mockSources initially contains only issue-body and repo-tree (no file-specific source records)
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      fileList,
      mockSetupTruth,
      mockScanBoundaries
    );

    const ac01 = contract.criteria[0];
    expect(ac01.id).toBe('AC-01');
    expect(ac01.candidate_implementation_files.length).toBeGreaterThan(0);

    const exportedJsonStr = generateProofBundleJson(contract);
    const parsed = JSON.parse(exportedJsonStr);

    const exportedAc01 = parsed.criteria.find((c: any) => c.id === 'AC-01');
    expect(exportedAc01).toBeDefined();
    expect(exportedAc01.candidate_implementation_files.length).toBeGreaterThan(0);

    // Each candidate path in AC-01 must have a corresponding source record in top-level sources
    for (const candFile of exportedAc01.candidate_implementation_files) {
      const matchingSource = parsed.sources.find((s: any) => s.path === candFile.path);
      expect(matchingSource).toBeDefined();
      expect(candFile.source_id).toBe(matchingSource.source_id);
      expect(matchingSource.verified_exists).toBe(candFile.verified_exists);
      expect(matchingSource.verification_status).toBe('VERIFIED');
      // Inferred relevance is strictly preserved on candidate file; not promoted to verified relevance
      expect(candFile.relevance_status).toBe('AI-INFERRED');
    }
  });

  it('preserves existing source IDs when matching path is present and handles unverified paths without promoting relevance', () => {
    const preExistingSource: SourceEvidence = {
      source_id: 'file-1',
      canonical_url: 'https://github.com/vercel/next.js/blob/canary/src/index.ts',
      path: 'src/index.ts',
      source_type: 'code',
      excerpt: 'Existing candidate file',
      verified_exists: true,
      verification_status: 'VERIFIED',
    };

    const initialSources: SourceEvidence[] = [...mockSources, preExistingSource];

    const contract: ContributionContract = {
      ...compileDeterministicBaselineContract(
        mockMetadata,
        initialSources,
        ['src/index.ts', 'src/missing.ts'],
        mockSetupTruth,
        mockScanBoundaries
      ),
      criteria: [
        {
          id: 'AC-01',
          description: 'Ensure implementation paths map to sources',
          criterion_type: 'EXPLICIT',
          exact_quote: 'Existing candidate file',
          status: 'ACTIONABLE',
          status_rationale: 'Verified',
          needs_maintainer_clarification: false,
          candidate_implementation_files: [
            {
              path: 'src/index.ts',
              relevance_rationale: 'Mapped to existing source',
              source_id: 'repo-tree', // Disconnected source_id before export
              verified_exists: true,
              relevance_status: 'AI-INFERRED',
            },
            {
              path: 'src/unverified.ts',
              relevance_rationale: 'Nonexistent file rejected by claim gate',
              source_id: 'unverified',
              verified_exists: false,
              relevance_status: 'UNKNOWN',
            },
          ],
          test_evidence: {
            status: 'NO TEST EVIDENCE FOUND IN SCANNED FILES',
            candidate_test_files: [],
            rationale: 'None',
          },
        },
      ],
      sources: initialSources,
    };

    const exportedJsonStr = generateProofBundleJson(contract);
    const parsed = JSON.parse(exportedJsonStr);

    const exportedAc01 = parsed.criteria[0];
    const indexCandidate = exportedAc01.candidate_implementation_files[0];
    const unverifiedCandidate = exportedAc01.candidate_implementation_files[1];

    // Reconciled with existing source record 'file-1'
    expect(indexCandidate.source_id).toBe('file-1');
    const indexSource = parsed.sources.find((s: any) => s.source_id === 'file-1');
    expect(indexSource?.path).toBe('src/index.ts');
    expect(indexSource?.verified_exists).toBe(true);
    expect(indexCandidate.relevance_status).toBe('AI-INFERRED');

    // Unverified candidate added as unverified source without promoting status
    expect(unverifiedCandidate.source_id).toBeDefined();
    expect(unverifiedCandidate.source_id).not.toBe('unverified');
    const unverifiedSource = parsed.sources.find((s: any) => s.source_id === unverifiedCandidate.source_id);
    expect(unverifiedSource?.path).toBe('src/unverified.ts');
    expect(unverifiedSource?.verified_exists).toBe(false);
    expect(unverifiedSource?.verification_status).toBe('UNKNOWN');
    expect(unverifiedCandidate.relevance_status).toBe('UNKNOWN');
  });
});
