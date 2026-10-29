import { CandidateTestFile, TestEvidenceInfo, TestEvidenceStatus } from './types';

export interface EvidenceSummaryOptions {
  isTreeTruncated?: boolean;
  criterionDescription?: string;
  proposedManualValidation?: string;
}

export function formatCandidateTestFileSummary(t: CandidateTestFile): {
  badge: string;
  badgeType: 'verified' | 'unrelated' | 'fixture' | 'candidate';
  inspectionText: string;
  executionText: string;
  fullSummary: string;
} {
  const isFixture = t.is_automated_test === false;
  const isRelevant = t.relevance_verdict === 'CONFIRMED_RELEVANT' || t.relevance_verdict === 'RELEVANT';
  const isUnrelated = t.relevance_verdict === 'UNRELATED';
  const isUnconfirmed = t.relevance_verdict === 'UNCONFIRMED' || t.relevance_verdict === 'RELATED';

  let badge = '[Automated Test Candidate]';
  let badgeType: 'verified' | 'unrelated' | 'fixture' | 'candidate' = 'candidate';

  if (isFixture) {
    badge = '[Fixture/Sample Component - Not a Test Suite]';
    badgeType = 'fixture';
  } else if (isRelevant) {
    badge = '[Verified Relevant Automated Test]';
    badgeType = 'verified';
  } else if (isUnrelated) {
    badge = '[Unrelated Test Suite]';
    badgeType = 'unrelated';
  } else if (isUnconfirmed) {
    badge = '[Related / Unconfirmed Test Candidate]';
    badgeType = 'candidate';
  }

  const inspectionText = t.assertions_inspected
    ? 'Inspected: Yes'
    : 'Inspected: No (content unavailable)';
  const executionText = 'Executed: No (untrusted code is never executed)';

  const fullSummary = `\`${t.path}\` ${badge} (${inspectionText}, ${executionText})`;

  return { badge, badgeType, inspectionText, executionText, fullSummary };
}

export function deriveTestEvidenceSummary(
  candidates: CandidateTestFile[],
  options?: EvidenceSummaryOptions
): TestEvidenceInfo {
  const isTreeTruncated = Boolean(options?.isTreeTruncated);

  // Normalize candidate records so no child record claims executed = true
  const normalizedCandidates: CandidateTestFile[] = candidates.map((t) => ({
    ...t,
    assertions_inspected: Boolean(t.assertions_inspected),
    is_automated_test: t.is_automated_test !== false,
    test_executed: false,
    relevance_verdict: t.is_automated_test === false
      ? 'UNRELATED'
      : (t.relevance_verdict || (t.assertions_inspected ? 'UNKNOWN' : 'POTENTIALLY_RELEVANT')),
  }));

  const anyInspected = normalizedCandidates.some((t) => t.assertions_inspected);

  let status: TestEvidenceStatus;
  let rationale: string;

  if (isTreeTruncated) {
    status = 'SCAN INCOMPLETE / UNKNOWN';
    if (normalizedCandidates.length > 0 && anyInspected) {
      const paths = normalizedCandidates.map((t) => t.path).join(', ');
      const relevant = normalizedCandidates.filter(
        (t) => t.is_automated_test && t.assertions_inspected && (t.relevance_verdict === 'CONFIRMED_RELEVANT' || t.relevance_verdict === 'RELEVANT')
      );
      const unrelated = normalizedCandidates.filter(
        (t) => t.is_automated_test && t.assertions_inspected && (t.relevance_verdict === 'UNRELATED' || t.relevance_verdict === 'UNCONFIRMED' || t.relevance_verdict === 'RELATED')
      );
      if (relevant.length > 0 && unrelated.length > 0) {
        const relPaths = relevant.map((t) => t.path).join(', ');
        const unrelPaths = unrelated.map((t) => t.path).join(', ');
        rationale = `Repository tree was truncated by GitHub API size limits; test evidence scan is incomplete. Inspected test file(s) (${relPaths}) verified relevant to criterion from content, while additional candidate(s) (${unrelPaths}) were unconfirmed or unrelated. Exhaustive test coverage cannot be confirmed across full repository. Tests were NOT executed (security guardrail).`;
      } else if (relevant.length > 0) {
        const relPaths = relevant.map((t) => t.path).join(', ');
        rationale = `Repository tree was truncated by GitHub API size limits; test evidence scan is incomplete. Inspected test file(s) (${relPaths}) verified relevant to criterion from content, but exhaustive test coverage cannot be confirmed across full repository. Tests were NOT executed (security guardrail).`;
      } else if (unrelated.length > 0) {
        const unrelPaths = unrelated.map((t) => t.path).join(', ');
        rationale = `Repository tree was truncated by GitHub API size limits; test evidence scan is incomplete. Inspected candidate test file(s) in bounded scan (${unrelPaths}) do not verify criterion requirements. Exhaustive test coverage cannot be confirmed across full repository. Tests were NOT executed (security guardrail).`;
      } else {
        rationale = `Repository tree was truncated by GitHub API size limits; test evidence scan is incomplete. Inspected candidate(s) (${paths}) surfaced from verified source content with relevance verdicts. Tests were NOT executed (security guardrail).`;
      }
    } else if (normalizedCandidates.length > 0) {
      const candPaths = normalizedCandidates.map((t) => t.path).join(', ');
      rationale = `Repository tree was truncated by GitHub API size limits; test evidence scan is incomplete. Candidate test path(s) (${candPaths}) surfaced but complete scan could not finish. Tests were NOT executed (security guardrail).`;
    } else {
      rationale = 'Repository tree was truncated by GitHub API limit; test evidence scan is incomplete.';
    }
  } else if (normalizedCandidates.length === 0) {
    status = 'NO TEST EVIDENCE FOUND IN SCANNED FILES';
    rationale = 'No test evidence found in scanned files. Test coverage cannot be established from bounded context.';
  } else {
    const relevantInspected = normalizedCandidates.filter(
      (t) => t.is_automated_test && t.assertions_inspected && (t.relevance_verdict === 'CONFIRMED_RELEVANT' || t.relevance_verdict === 'RELEVANT')
    );
    const unrelatedInspected = normalizedCandidates.filter(
      (t) => t.is_automated_test && t.assertions_inspected && t.relevance_verdict === 'UNRELATED'
    );
    const unconfirmedInspected = normalizedCandidates.filter(
      (t) => t.is_automated_test && t.assertions_inspected && (t.relevance_verdict === 'UNCONFIRMED' || t.relevance_verdict === 'RELATED' || t.relevance_verdict === 'POTENTIALLY_RELEVANT')
    );
    const uninspected = normalizedCandidates.filter(
      (t) => t.is_automated_test && !t.assertions_inspected
    );
    const fixtures = normalizedCandidates.filter((t) => !t.is_automated_test);

    if (relevantInspected.length > 0) {
      status = 'TEST EVIDENCE FOUND';
      const relPaths = relevantInspected.map((t) => t.path).join(', ');
      if (unrelatedInspected.length > 0 || unconfirmedInspected.length > 0) {
        const otherPaths = [...unrelatedInspected, ...unconfirmedInspected].map((t) => t.path).join(', ');
        rationale = `Located relevant automated test file(s) in repository tree (${relPaths}). Test assertions inspected in bounded scan and verified relevant to criterion. Additional inspected candidate(s) (${otherPaths}) were unconfirmed or unrelated. Candidate tests were inspected but NOT executed (security guardrail; untrusted code is never run).`;
      } else {
        rationale = `Located relevant automated test file(s) in repository tree (${relPaths}). Test assertions inspected in bounded scan and verified relevant to acceptance criterion. Candidate tests were inspected but NOT executed (security guardrail; untrusted code is never run).`;
      }
    } else if (unconfirmedInspected.length > 0) {
      status = 'POSSIBLE TEST CANDIDATE';
      const uncPaths = unconfirmedInspected.map((t) => t.path).join(', ');
      rationale = `Candidate test path(s) found in repository (${uncPaths}). Inspected test assertions cover related constructs but do not verify the specific requirements of this acceptance criterion. Tests were NOT executed.`;
    } else if (unrelatedInspected.length > 0 && uninspected.length === 0) {
      status = 'NO TEST EVIDENCE FOUND IN SCANNED FILES';
      const unrelPaths = unrelatedInspected.map((t) => t.path).join(', ');
      rationale = `Inspected candidate test file(s) in bounded scan (${unrelPaths}) do not verify criterion requirements. No relevant automated test evidence confirmed in scanned files. Test assertions were inspected; tests were NOT executed (security guardrail).`;
    } else if (unrelatedInspected.length > 0 && uninspected.length > 0) {
      status = 'POSSIBLE TEST CANDIDATE';
      const unrelPaths = unrelatedInspected.map((t) => t.path).join(', ');
      const candPaths = normalizedCandidates.map((t) => t.path).join(', ');
      rationale = `Candidate test path(s) found in repository tree (${candPaths}). Inspected test(s) (${unrelPaths}) were unrelated; remaining candidate(s) have uninspected assertions or unavailable content. Tests were NOT executed.`;
    } else if (uninspected.length > 0) {
      status = 'POSSIBLE TEST CANDIDATE';
      const uninspectedPaths = uninspected.map((t) => t.path).join(', ');
      rationale = `Candidate test path(s) found in repository tree (${uninspectedPaths}). File content was unavailable or assertions were not inspected; test execution has NOT occurred (security guardrail).`;
    } else if (fixtures.length > 0) {
      status = 'NO TEST EVIDENCE FOUND IN SCANNED FILES';
      const fixturePaths = fixtures.map((t) => t.path).join(', ');
      rationale = `Candidate file(s) in test tree (${fixturePaths}) are fixture or sample application components, not automated test suites with assertions. No automated test evidence found.`;
    } else {
      status = 'NO TEST EVIDENCE FOUND IN SCANNED FILES';
      rationale = 'No relevant automated test evidence confirmed in scanned files.';
    }
  }

  const defaultValidation = options?.criterionDescription
    ? `Verify "${options.criterionDescription}" locally before opening pull request.`
    : 'Verify behavior locally before opening pull request.';

  return {
    status,
    candidate_test_files: normalizedCandidates,
    rationale,
    proposed_manual_validation: options?.proposedManualValidation || defaultValidation,
    assertions_inspected: anyInspected,
    test_executed: false,
  };
}
