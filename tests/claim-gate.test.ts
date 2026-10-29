import { describe, it, expect } from 'vitest';
import { runDeterministicClaimGate } from '../src/lib/claim-gate';
import { AcceptanceCriterion, GitHubIssueMetadata, ScanBoundaries, SetupTruth, SourceEvidence } from '../src/lib/types';
import { generateProofBundleMarkdown } from '../src/lib/proof-bundle';
import { compileDeterministicBaselineContract } from '../src/lib/contract-compiler';

describe('Deterministic Claim Gate & Truth Ledger', () => {
  const mockMetadata: GitHubIssueMetadata = {
    url: 'https://github.com/mock/repo/issues/10',
    owner: 'mock',
    repo: 'repo',
    number: 10,
    title: 'Support CSV download in analytics view',
    body: '- [ ] CSV export button must include active filters\n- [ ] File name must have timestamp',
    state: 'open',
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T10:00:00Z',
    author: { login: 'contributor1', avatar_url: '', html_url: '' },
    assignees: [],
    labels: [{ name: 'feature', color: '123456' }],
    comments_count: 0,
    has_linked_pr_signal: false,
    default_branch: 'main',
    checked_at: '2026-10-26T10:00:00Z',
  };

  const mockSources: SourceEvidence[] = [
    {
      source_id: 'src-1',
      canonical_url: 'https://github.com/mock/repo/blob/main/src/table.ts',
      path: 'src/table.ts',
      source_type: 'code',
      excerpt: 'export class TableView {}',
      verified_exists: true,
      verification_status: 'VERIFIED',
    },
  ];

  const repoFiles = ['src/table.ts', 'src/table.test.ts', 'package.json'];

  const scanBoundaries: ScanBoundaries = {
    total_files_in_tree: 3,
    scanned_files_count: 1,
    is_tree_truncated: false,
    checked_at: '2026-10-26T10:00:00Z',
  };

  const setupTruth: SetupTruth = {
    install_command: { command: 'npm install', label: 'DOCUMENTED' },
    test_command: { command: 'npm test', label: 'DOCUMENTED' },
    has_readme: true,
    has_contributing: false,
    notes: 'Standard setup',
  };

  it('rejects hallucinated candidate file paths not in repo tree', () => {
    const rawCriteria: AcceptanceCriterion[] = [
      {
        id: 'AC-01',
        description: 'CSV export button must include active filters',
        criterion_type: 'EXPLICIT',
        exact_quote: '- [ ] CSV export button must include active filters',
        status: 'ACTIONABLE',
        status_rationale: 'Clear explicit quote',
        needs_maintainer_clarification: false,
        candidate_implementation_files: [
          {
            path: 'src/hallucinated/exporter.ts', // DOES NOT EXIST
            relevance_rationale: 'Candidate',
            source_id: 'src-1',
            verified_exists: false,
            relevance_status: 'AI-INFERRED',
          },
        ],
        test_evidence: {
          status: 'TEST EVIDENCE FOUND',
          candidate_test_files: [{ path: 'src/table.test.ts', source_id: 'src-1', verified_exists: false }],
          rationale: 'Found test',
        },
      },
    ];

    const result = runDeterministicClaimGate(
      rawCriteria,
      mockSources,
      repoFiles,
      mockMetadata,
      scanBoundaries,
      setupTruth
    );

    expect(result.audit.rejected_paths_count).toBeGreaterThan(0);
    expect(result.validatedCriteria[0].candidate_implementation_files[0].verified_exists).toBe(false);
    expect(result.validatedCriteria[0].candidate_implementation_files[0].relevance_status).toBe('UNKNOWN');
  });

  it('sets status to NO TEST EVIDENCE FOUND IN SCANNED FILES when no tests match', () => {
    const filesWithoutTests = ['src/table.ts', 'package.json'];
    const rawCriteria: AcceptanceCriterion[] = [
      {
        id: 'AC-01',
        description: 'Test something',
        criterion_type: 'EXPLICIT',
        status: 'ACTIONABLE',
        status_rationale: '',
        needs_maintainer_clarification: false,
        candidate_implementation_files: [],
        test_evidence: {
          status: 'NO TEST EVIDENCE FOUND IN SCANNED FILES',
          candidate_test_files: [],
          rationale: 'None found',
        },
      },
    ];

    const result = runDeterministicClaimGate(
      rawCriteria,
      mockSources,
      filesWithoutTests,
      mockMetadata,
      scanBoundaries,
      setupTruth
    );

    expect(result.validatedCriteria[0].test_evidence.status).toBe('NO TEST EVIDENCE FOUND IN SCANNED FILES');
  });

  it('marks closed issue as CLARIFY FIRST', () => {
    const closedMeta = { ...mockMetadata, state: 'closed' as const };
    const rawCriteria: AcceptanceCriterion[] = [];
    const result = runDeterministicClaimGate(
      rawCriteria,
      mockSources,
      repoFiles,
      closedMeta,
      scanBoundaries,
      setupTruth
    );

    expect(result.readinessGate.verdict).toBe('CLARIFY FIRST');
    expect(result.readinessGate.reasons.some((r) => r.includes('CLOSED'))).toBe(true);
  });

  it('generates consistent Contribution Proof Bundle Markdown', () => {
    const contract = compileDeterministicBaselineContract(
      mockMetadata,
      mockSources,
      repoFiles,
      setupTruth,
      scanBoundaries
    );

    const markdown = generateProofBundleMarkdown(contract);
    expect(markdown).toContain('# ISSUELIFT CONTRIBUTION PROOF BUNDLE');
    expect(markdown).toContain('AC-01');
    expect(markdown).toContain('Readiness Gate Verdict:');
    expect(markdown).toContain('npm test');
  });
});
