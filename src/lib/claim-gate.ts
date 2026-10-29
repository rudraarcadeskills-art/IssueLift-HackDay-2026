import {
  AcceptanceCriterion,
  CandidateFile,
  CandidateTestFile,
  ContributionContract,
  GitHubIssueMetadata,
  ReadinessGate,
  ReadinessVerdict,
  ScanBoundaries,
  SetupTruth,
  SourceEvidence,
  TestEvidenceStatus,
} from './types';
import { deriveTestEvidenceSummary } from './test-evidence';
import { evaluateTestRelevance, isInspectedTestSource, isLikelyTestFile } from './github';

export interface ClaimGateValidationResult {
  validatedCriteria: AcceptanceCriterion[];
  validatedSources: SourceEvidence[];
  readinessGate: ReadinessGate;
  audit: {
    rejected_paths_count: number;
    rejected_source_ids_count: number;
    warnings: string[];
  };
}

export function runDeterministicClaimGate(
  rawCriteria: AcceptanceCriterion[],
  sources: SourceEvidence[],
  repositoryFiles: string[],
  metadata: GitHubIssueMetadata,
  scanBoundaries: ScanBoundaries,
  setupTruth: SetupTruth
): ClaimGateValidationResult {
  const fileSet = new Set(repositoryFiles);
  const sourceIdSet = new Set(sources.map((s) => s.source_id));
  const sourcePathSet = new Set(sources.map((s) => s.path));

  let rejectedPathsCount = 0;
  let rejectedSourceIdsCount = 0;
  const warnings: string[] = [];

  // 1. Validate Sources
  const validatedSources: SourceEvidence[] = sources.map((source) => {
    if (source.source_id === 'repo-tree') {
      return {
        ...source,
        verified_exists: true,
        verification_status: 'VERIFIED',
      };
    }

    if (source.source_type === 'code' || source.source_type === 'test' || source.source_type === 'config' || source.source_type === 'manifest') {
      const exists = fileSet.has(source.path);
      if (!exists) {
        rejectedPathsCount++;
        warnings.push(`Claim Gate: Source path "${source.path}" not found in fetched repository tree. Demoted.`);
        return {
          ...source,
          verified_exists: false,
          verification_status: 'UNKNOWN',
          rejection_reason: 'Path not found in scanned repository tree.',
        };
      }
      return {
        ...source,
        verified_exists: true,
        verification_status: 'VERIFIED',
      };
    }
    return source;
  });

  function isReproductionOrCommandQuote(quote: string, issueBody: string): boolean {
    const q = quote.trim().toLowerCase();
    if (!q) return true;

    // Reject reproduction / setup command patterns
    if (
      /^(?:npm|pnpm|yarn|bun|npx|curl|git clone|git\s|cd\s)\b/i.test(quote.trim()) ||
      /^clone the repo/i.test(quote.trim()) ||
      /npm install/i.test(quote.trim()) ||
      /npm run/i.test(quote.trim()) ||
      /curl\s+-s/i.test(quote.trim())
    ) {
      return true;
    }

    // Check if quote originates from reproduction sections
    const reproSectionRegex = /(?:###?\s*(?:to reproduce|steps to reproduce|how to reproduce)[\s\S]*?)(?:###?\s*(?:current|expected|additional|environment|version)|$)/i;
    const match = issueBody.match(reproSectionRegex);
    if (match) {
      const reproText = match[0].toLowerCase();
      const bodyWithoutRepro = issueBody.toLowerCase().replace(reproText, '');
      if (reproText.includes(q) && !bodyWithoutRepro.includes(q)) {
        return true;
      }
    }

    // Check if quote originates from Current / Actual behavior descriptions (and does not appear elsewhere)
    const currentSectionRegex = /(?:(?:\*{1,2}|_{1,2})?\s*(?:current|actual)(?:\s+(?:behavior|result|outcome|behaviour))?\s*(?:[:\-](?:\*{1,2}|_{1,2})|(?:\*{1,2}|_{1,2})?[:\-])|(?:^|\n)#{1,4}\s*(?:current|actual)\s*(?:behavior|result|outcome|behaviour)?\s*\n)([\s\S]*?)(?:(?:\*{1,2}|_{1,2})?\s*expected(?:\s+(?:behavior|result|outcome|behaviour))?\s*(?:[:\-](?:\*{1,2}|_{1,2})|(?:\*{1,2}|_{1,2})?[:\-])|(?:^|\n)#{1,4}\s+|$)/i;
    const currentMatch = issueBody.match(currentSectionRegex);
    if (currentMatch) {
      const currentText = currentMatch[1].toLowerCase();
      const bodyWithoutCurrent = issueBody.toLowerCase().replace(currentText, '');
      if (currentText.includes(q) && !bodyWithoutCurrent.includes(q)) {
        return true;
      }
    }

    return false;
  }

  // 2. Validate Criteria & TraceMap
  const validatedCriteria: AcceptanceCriterion[] = rawCriteria.map((criterion, idx) => {
    const id = criterion.id || `AC-${String(idx + 1).padStart(2, '0')}`;

    // Explicit vs Inferred: ensure exact quote actually exists in issue body or comments, and is NOT a repro step, command, or current description
    const allIssueText = `${metadata.body}\n${(metadata.comments || []).map((c) => c.body).join('\n')}`.toLowerCase();
    const quoteInBody = Boolean(
      criterion.exact_quote &&
      criterion.exact_quote.trim().length > 0 &&
      allIssueText.includes(criterion.exact_quote.trim().toLowerCase())
    );
    const isReproOrCommand = criterion.exact_quote ? isReproductionOrCommandQuote(criterion.exact_quote, metadata.body) : false;
    const isExplicit = criterion.criterion_type === 'EXPLICIT' && quoteInBody && !isReproOrCommand;
    const criterion_type = isExplicit ? 'EXPLICIT' : 'AI-PROPOSED';

    if (criterion.criterion_type === 'EXPLICIT' && !isExplicit) {
      if (isReproOrCommand) {
        warnings.push(`Claim Gate: Criterion "${id}" quote is derived from current behavior description, reproduction steps, or setup commands; demoted to AI-PROPOSED.`);
      } else if (!quoteInBody) {
        warnings.push(`Claim Gate: Criterion "${id}" verbatim quote not found in issue text; demoted to AI-PROPOSED.`);
      }
    }

    // Validate Candidate Implementation Files
    const validatedImplFiles: CandidateFile[] = (criterion.candidate_implementation_files || []).map((file) => {
      const existsInTree = fileSet.has(file.path);
      const validSourceId = file.source_id === 'repo-tree' || sourceIdSet.has(file.source_id);

      if (!existsInTree) {
        rejectedPathsCount++;
        warnings.push(`Claim Gate: Candidate path "${file.path}" in ${id} does not exist in repository files.`);
      }

      if (!validSourceId) {
        rejectedSourceIdsCount++;
        warnings.push(`Claim Gate: Fabricated source_id "${file.source_id}" in ${id} rejected.`);
      }

      return {
        ...file,
        verified_exists: existsInTree,
        source_id: validSourceId ? file.source_id : 'unverified',
        relevance_status: existsInTree ? 'AI-INFERRED' : 'UNKNOWN',
      };
    });

    // Validate Test Evidence
    const validatedTestFiles: CandidateTestFile[] = [];

    for (const tFile of criterion.test_evidence?.candidate_test_files || []) {
      const existsInTree = fileSet.has(tFile.path);
      const existsInSources = sourcePathSet.has(tFile.path);

      if (!existsInTree && !existsInSources) {
        if (!scanBoundaries.is_tree_truncated) {
          rejectedPathsCount++;
          warnings.push(`Claim Gate: Candidate test path "${tFile.path}" in ${id} not found in tree.`);
          continue;
        }
      }

      const isAutomatedTest = tFile.is_automated_test !== false;
      const inspectedSource = sources.find(
        (s) => s.path === tFile.path && isInspectedTestSource(s)
      );
      const hasInspectedSourcesInPack = sources.some(isInspectedTestSource);
      const isActuallyInspected = hasInspectedSourcesInPack
        ? Boolean(inspectedSource)
        : Boolean(tFile.assertions_inspected);

      let relevance = tFile.relevance_verdict;
      if (inspectedSource) {
        const evaluated = evaluateTestRelevance(
          tFile.path,
          inspectedSource.excerpt,
          criterion.description,
          criterion.exact_quote
        );
        relevance = evaluated.isRelevant
          ? (tFile.relevance_verdict === 'CONFIRMED_RELEVANT' ? 'CONFIRMED_RELEVANT' : 'RELEVANT')
          : evaluated.verdict;
      } else if (!isActuallyInspected) {
        if (tFile.assertions_inspected) {
          warnings.push(
            `Claim Gate: Demoted assertions_inspected for uninspected test "${tFile.path}" in ${id}.`
          );
        }
        relevance = isAutomatedTest ? 'UNKNOWN' : 'UNRELATED';
      }

      validatedTestFiles.push({
        ...tFile,
        verified_exists: existsInTree || existsInSources,
        assertions_inspected: isActuallyInspected,
        is_automated_test: isAutomatedTest,
        relevance_verdict: relevance,
        test_executed: false,
      });
    }

    // Reconcile fetched test-file sources if validated candidate list is empty
    if (validatedTestFiles.length === 0) {
      const fetchedTestSources = sources.filter(isInspectedTestSource);
      for (const tSource of fetchedTestSources) {
        const relevance = evaluateTestRelevance(
          tSource.path,
          tSource.excerpt,
          criterion.description,
          criterion.exact_quote
        );

        validatedTestFiles.push({
          path: tSource.path,
          source_id: tSource.source_id,
          verified_exists: true,
          assertions_inspected: true,
          is_automated_test: true,
          relevance_verdict: (relevance.isRelevant ? 'RELEVANT' : relevance.verdict) as CandidateTestFile['relevance_verdict'],
          test_executed: false,
        });
      }
    }

    const testEvidence = deriveTestEvidenceSummary(validatedTestFiles, {
      isTreeTruncated: scanBoundaries.is_tree_truncated,
      criterionDescription: criterion.description,
      proposedManualValidation: criterion.test_evidence?.proposed_manual_validation,
    });

    return {
      ...criterion,
      id,
      criterion_type,
      candidate_implementation_files: validatedImplFiles,
      test_evidence: testEvidence,
    };
  });

  // 3. Compute Deterministic Readiness Gate
  const reasons: string[] = [];
  let verdict: ReadinessVerdict = 'ACTIONABLE';

  if (metadata.state === 'closed') {
    verdict = 'CLARIFY FIRST';
    reasons.push('Issue is marked CLOSED on GitHub. Confirm with maintainer before investing time.');
  }

  if (metadata.assignees && metadata.assignees.length > 0) {
    verdict = 'CLARIFY FIRST';
    const names = metadata.assignees.map((a) => `@${a.login}`).join(', ');
    reasons.push(`Issue is currently assigned to ${names}. Verify with maintainer if contribution is open.`);
  }

  if (metadata.has_linked_pr_signal) {
    verdict = 'CLARIFY FIRST';
    reasons.push('Linked pull request or active PR reference detected. An implementation may already be in flight.');
  }

  // Check for target repository / architecture ambiguity (e.g. between legacy TypeScript compiler and TypeScript-Go)
  const allCommentsText = (metadata.comments || []).map((c) => c.body).join('\n');
  const hasTargetAmbiguity =
    /(?:should this fix target|target the main|target.*(?:typescript-go|legacy|different repo)|accepting community contributions)/i.test(allCommentsText) ||
    /(?:target.*(?:repository|architecture|repo)|clarif(?:y|ication).*(?:target|repo|architecture))/i.test(allCommentsText) ||
    metadata.labels.some((l) => /needs clarification|ambiguous/i.test(l.name));

  if (hasTargetAmbiguity) {
    verdict = 'CLARIFY FIRST';
    reasons.push('Implementation target is ambiguous between legacy TypeScript compiler and TypeScript-Go; maintainer clarification is required before submitting PR.');
  }

  const hasAmbiguousCriteria = validatedCriteria.some((c) => c.status === 'AMBIGUOUS' || c.needs_maintainer_clarification);
  if (hasAmbiguousCriteria) {
    if (verdict === 'ACTIONABLE') verdict = 'CLARIFY FIRST';
    reasons.push('One or more acceptance criteria are ambiguous or require maintainer confirmation.');
  }

  if (scanBoundaries.is_tree_truncated) {
    if (verdict === 'ACTIONABLE') verdict = 'EVIDENCE-LIMITED';
    reasons.push('Repository file tree scan was truncated by GitHub API size limits. Context is bounded.');
  }

  if (validatedCriteria.length === 0) {
    if (verdict === 'ACTIONABLE') verdict = 'EVIDENCE-LIMITED';
    reasons.push('No acceptance criteria could be derived from the issue description.');
  }

  if (reasons.length === 0) {
    reasons.push('Issue is open, unassigned, has verified candidate files, and clear acceptance criteria.');
  }

  return {
    validatedCriteria,
    validatedSources,
    readinessGate: {
      verdict,
      reasons,
    },
    audit: {
      rejected_paths_count: rejectedPathsCount,
      rejected_source_ids_count: rejectedSourceIdsCount,
      warnings,
    },
  };
}
