export type VerificationStatus = 'VERIFIED' | 'AI-INFERRED' | 'UNKNOWN' | 'REJECTED';

export type SourceType =
  | 'issue_body'
  | 'issue_comment'
  | 'readme'
  | 'contributing'
  | 'manifest'
  | 'code'
  | 'test'
  | 'config';

export interface SourceEvidence {
  source_id: string;
  canonical_url: string;
  path: string;
  source_type: SourceType;
  excerpt: string;
  line_reference?: string;
  verified_exists: boolean;
  verification_status: VerificationStatus;
  rejection_reason?: string;
}

export type CriterionType = 'EXPLICIT' | 'AI-PROPOSED';
export type CriterionStatus = 'ACTIONABLE' | 'AMBIGUOUS' | 'NOT_SPECIFIED' | 'EVIDENCE_LIMITED';

export type TestEvidenceStatus =
  | 'TEST EVIDENCE FOUND'
  | 'POSSIBLE TEST CANDIDATE'
  | 'NO TEST EVIDENCE FOUND IN SCANNED FILES'
  | 'SCAN INCOMPLETE / UNKNOWN';

export type CommandLabel = 'DOCUMENTED' | 'PROPOSED' | 'UNKNOWN';

export type AnalysisEngine = 'gemma' | 'baseline';
export type AnalysisStatus = 'gemma_success' | 'baseline_fallback' | 'analysis_failed' | 'idle' | 'running';
export type ConfigStatus = 'checking' | 'configured' | 'missing' | 'unavailable';

export interface CandidateFile {
  path: string;
  relevance_rationale: string;
  source_id: string;
  verified_exists: boolean;
  relevance_status: 'AI-INFERRED' | 'VERIFIED' | 'UNKNOWN';
}

export type RelevanceVerdict =
  | 'CONFIRMED_RELEVANT'
  | 'POTENTIALLY_RELEVANT'
  | 'RELEVANT'
  | 'RELATED'
  | 'UNCONFIRMED'
  | 'UNRELATED'
  | 'UNKNOWN';

export interface CandidateTestFile {
  path: string;
  source_id: string;
  verified_exists: boolean;
  assertions_inspected?: boolean;
  is_automated_test?: boolean;
  relevance_verdict?: RelevanceVerdict;
  relevance_rationale?: string;
  test_runner_detected?: string;
  test_executed?: boolean;
}

export interface ReproductionStep {
  step_number: number;
  instruction: string;
  command?: string;
  is_validation_scenario?: boolean;
  provenance?: string;
}

export interface ReproductionEnvironment {
  reproduction_repo_url?: string;
  reproduction_steps: ReproductionStep[];
  reproduction_commands: (string | CommandInfo)[];
  manual_validation_scenarios: string[];
  notes?: string;
}

export interface TestEvidenceInfo {
  status: TestEvidenceStatus;
  candidate_test_files: CandidateTestFile[];
  rationale: string;
  proposed_manual_validation?: string;
  assertions_inspected?: boolean;
  test_executed?: boolean;
}

export interface CommandInfo {
  command: string;
  label: CommandLabel;
  source_id?: string;
  source_url?: string;
  provenance?: string;
  path?: string;
}

export interface AcceptanceCriterion {
  id: string; // e.g. "AC-01"
  description: string;
  criterion_type: CriterionType;
  exact_quote?: string;
  source_url?: string;
  status: CriterionStatus;
  status_rationale: string;
  needs_maintainer_clarification: boolean;
  candidate_implementation_files: CandidateFile[];
  test_evidence: TestEvidenceInfo;
  test_command?: CommandInfo;
  user_edited?: boolean;
}

export interface SetupTruth {
  install_command?: CommandInfo;
  test_command?: CommandInfo;
  run_command?: CommandInfo;
  has_readme: boolean;
  has_contributing: boolean;
  package_manager?: 'pnpm' | 'yarn' | 'npm' | 'bun' | 'cargo' | 'go' | 'pip' | 'poetry' | 'unknown';
  manifest_file?: string;
  inspected_files?: string[];
  notes: string;
}

export interface MaintainerHandoff {
  clarification_question: string;
  triggering_ambiguity: string;
  exact_issue_quote?: string;
  proposed_criteria_addition?: string;
  suggested_validation_scenario?: string;
  user_edited?: boolean;
}

export type ReadinessVerdict = 'ACTIONABLE' | 'CLARIFY FIRST' | 'EVIDENCE-LIMITED';

export interface ReadinessGate {
  verdict: ReadinessVerdict;
  reasons: string[];
}

export interface ScanBoundaries {
  total_files_in_tree: number;
  scanned_files_count: number;
  is_tree_truncated: boolean;
  checked_at: string;
  api_rate_limit_remaining?: number;
  api_rate_limit_reset?: string;
}

export interface GitHubIssueMetadata {
  url: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
  labels: Array<{
    name: string;
    color: string;
    description?: string;
  }>;
  comments_count: number;
  comments?: Array<{
    author: string;
    body: string;
    created_at: string;
    html_url: string;
  }>;
  has_linked_pr_signal: boolean;
  linked_pr_reference?: string;
  default_branch: string;
  checked_at: string;
}

export interface ContributionContract {
  issue_metadata: GitHubIssueMetadata;
  issue_summary: string;
  expected_outcome: string;
  readiness_gate: ReadinessGate;
  criteria: AcceptanceCriterion[];
  setup_truth: SetupTruth;
  reproduction_environment?: ReproductionEnvironment;
  maintainer_handoff: MaintainerHandoff;
  sources: SourceEvidence[];
  first_hour_route: string[];
  pr_checklist: string[];
  scan_boundaries: ScanBoundaries;
  model_id?: string;
  ai_configured: boolean;
  engine: AnalysisEngine;
  analysis_status: AnalysisStatus;
  engine_details?: {
    model_id?: string;
    configured: boolean;
    fallback_reason?: string;
    guardrails_passed: boolean;
  };
  claim_gate_audit: {
    rejected_paths_count: number;
    rejected_source_ids_count: number;
    warnings: string[];
  };
}

export interface ProofBenchFixture {
  id: string;
  title: string;
  description: string;
  invariant_tested: string;
  input: {
    issue_metadata: Partial<GitHubIssueMetadata>;
    repository_files: string[];
    is_tree_truncated?: boolean;
    untrusted_issue_text?: string;
    raw_ai_response?: any;
  };
  expected_outcome: {
    verdict?: ReadinessVerdict;
    has_rejected_paths?: boolean;
    has_rejected_ids?: boolean;
    test_evidence_status?: TestEvidenceStatus;
    criteria_types?: Record<string, CriterionType>;
    setup_command_label?: CommandLabel;
    untrusted_text_neutralized?: boolean;
  };
}

export interface ProofBenchRunResult {
  fixture_id: string;
  title: string;
  invariant_tested: string;
  passed: boolean;
  observed: string;
  details?: string;
}
