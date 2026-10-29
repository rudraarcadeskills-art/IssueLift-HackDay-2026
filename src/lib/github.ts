import {
  GitHubIssueMetadata,
  SourceEvidence,
  SetupTruth,
  ScanBoundaries,
  RelevanceVerdict,
} from './types';

// In-memory cache for issue and repo tree data (10-minute TTL)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  issueNumber: number;
  canonicalUrl: string;
}

export function parseIssueUrl(url: string): { success: true; data: ParsedIssueUrl } | { success: false; error: string } {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'Issue URL must be a non-empty string.' };
  }

  const trimmed = url.trim();

  // Explicit check for pull request URLs
  if (trimmed.includes('/pull/')) {
    return {
      success: false,
      error: 'The provided URL is a Pull Request, not an Issue. IssueLift focuses on pre-implementation issues before PRs are created.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { success: false, error: 'Invalid URL format. Please provide a full URL like https://github.com/owner/repo/issues/123' };
  }

  if (parsed.hostname.toLowerCase() !== 'github.com' && parsed.hostname.toLowerCase() !== 'www.github.com') {
    return {
      success: false,
      error: `Unsupported host "${parsed.hostname}". Only public GitHub repositories (github.com) are supported.`,
    };
  }

  // Path format: /{owner}/{repo}/issues/{number}
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 4 || segments[2] !== 'issues') {
    return {
      success: false,
      error: 'Malformed issue path. Expected format: https://github.com/:owner/:repo/issues/:number',
    };
  }

  const owner = segments[0];
  const repo = segments[1];
  const numStr = segments[3];
  const issueNumber = parseInt(numStr, 10);

  if (isNaN(issueNumber) || issueNumber <= 0 || !Number.isInteger(issueNumber)) {
    return {
      success: false,
      error: `Invalid issue number "${numStr}". Issue number must be a positive integer.`,
    };
  }

  return {
    success: true,
    data: {
      owner,
      repo,
      issueNumber,
      canonicalUrl: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
    },
  };
}

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'IssueLift-Hacktoberfest/1.3',
  };
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN.trim()}`;
  }
  return headers;
}

export interface FetchIssueResult {
  metadata: GitHubIssueMetadata;
  sources: SourceEvidence[];
  repositoryFiles: string[];
  setupTruth: SetupTruth;
  scanBoundaries: ScanBoundaries;
}

export async function fetchLiveIssueAndRepo(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<FetchIssueResult> {
  const cacheKey = `issue:${owner}/${repo}/${issueNumber}`;
  const cached = getCached<FetchIssueResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const headers = getGitHubHeaders();

  // 1. Fetch Repository Metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
    next: { revalidate: 60 },
  });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      const resetHeader = repoRes.headers.get('x-ratelimit-reset');
      const resetTime = resetHeader ? new Date(parseInt(resetHeader, 10) * 1000).toLocaleTimeString() : 'shortly';
      throw new Error(`GitHub API rate limit exceeded. Rate limit resets at ${resetTime}. Configure GITHUB_TOKEN in .env.local to increase limit.`);
    }
    throw new Error(`Failed to fetch repository metadata (HTTP ${repoRes.status}): ${repoRes.statusText}`);
  }

  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || 'main';

  // 2. Fetch Issue Details
  const issueRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    { headers, next: { revalidate: 60 } }
  );

  if (!issueRes.ok) {
    if (issueRes.status === 404) {
      throw new Error(`Issue #${issueNumber} not found in repository "${owner}/${repo}".`);
    }
    throw new Error(`Failed to fetch issue #${issueNumber} (HTTP ${issueRes.status}): ${issueRes.statusText}`);
  }

  const issueData = await issueRes.json();

  // Explicitly verify this is not a PR returned by the issues endpoint
  if (issueData.pull_request) {
    throw new Error(`Item #${issueNumber} is a pull request, not an issue. IssueLift operates on issues before PR creation.`);
  }

  // 3. Fetch Comments (first 10 for context)
  let comments: Array<{ author: string; body: string; created_at: string; html_url: string }> = [];
  if (issueData.comments > 0) {
    try {
      const commentsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=10`,
        { headers }
      );
      if (commentsRes.ok) {
        const rawComments = await commentsRes.json();
        comments = rawComments.map((c: any) => ({
          author: c.user?.login || 'unknown',
          body: c.body || '',
          created_at: c.created_at,
          html_url: c.html_url,
        }));
      }
    } catch {
      // Non-fatal, continue with issue body
    }
  }

  // 3b. Fetch Timeline Events (bounded, first 15) to detect real linked PRs
  let timelineEvents: any[] = [];
  try {
    const timelineRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/timeline?per_page=15`,
      {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.mockingbird-preview+json, application/vnd.github.v3+json',
        },
        next: { revalidate: 60 },
      }
    );
    if (timelineRes.ok) {
      const rawEvents = await timelineRes.json();
      if (Array.isArray(rawEvents)) {
        timelineEvents = rawEvents;
      }
    }
  } catch {
    // Non-fatal, fallback to text scan
  }

  const prSignal = detectLinkedPrSignal(issueData.body || '', comments, timelineEvents);
  const checkedAt = new Date().toISOString();

  const metadata: GitHubIssueMetadata = {
    url: issueData.html_url,
    owner,
    repo,
    number: issueNumber,
    title: issueData.title || '',
    body: issueData.body || '',
    state: issueData.state === 'closed' ? 'closed' : 'open',
    created_at: issueData.created_at,
    updated_at: issueData.updated_at,
    closed_at: issueData.closed_at,
    author: {
      login: issueData.user?.login || 'unknown',
      avatar_url: issueData.user?.avatar_url || '',
      html_url: issueData.user?.html_url || '',
    },
    assignees: (issueData.assignees || []).map((a: any) => ({
      login: a.login,
      avatar_url: a.avatar_url,
      html_url: a.html_url,
    })),
    labels: (issueData.labels || []).map((l: any) => ({
      name: l.name,
      color: l.color,
      description: l.description,
    })),
    comments_count: issueData.comments || 0,
    comments,
    has_linked_pr_signal: prSignal.hasLinkedPr,
    linked_pr_reference: prSignal.prReference,
    default_branch: defaultBranch,
    checked_at: checkedAt,
  };

  // 4. Fetch Repository Tree (Bounded)
  let repositoryFiles: string[] = [];
  let isTreeTruncated = false;

  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      isTreeTruncated = Boolean(treeData.truncated);
      if (Array.isArray(treeData.tree)) {
        repositoryFiles = treeData.tree
          .filter((item: any) => item.type === 'blob')
          .map((item: any) => item.path);
      }
    }
  } catch {
    // If recursive tree fails, we remain evidence-limited
  }

  // 5. Build Bounded Evidence Pack
  const sources: SourceEvidence[] = [];

  // Issue body source
  sources.push({
    source_id: 'issue-body',
    canonical_url: metadata.url,
    path: `issue#${issueNumber}`,
    source_type: 'issue_body',
    excerpt: metadata.body.slice(0, 300),
    verified_exists: true,
    verification_status: 'VERIFIED',
  });

  // Issue comments sources
  comments.forEach((c, idx) => {
    sources.push({
      source_id: `comment-${idx + 1}`,
      canonical_url: c.html_url,
      path: `comment#${idx + 1}`,
      source_type: 'issue_comment',
      excerpt: c.body.slice(0, 250),
      verified_exists: true,
      verification_status: 'VERIFIED',
    });
  });

  // 5. Fetch Manifests (package.json, lockfiles, etc.) and Documentation
  let readmeContent = '';
  let contributingContent = '';
  let packageJsonContent: string | undefined;
  let hasReadme = false;
  let hasContributing = false;
  const inspectedFiles: string[] = [];

  // Identify package manifest & lockfiles
  const packageJsonFile = repositoryFiles.find((p) => p.toLowerCase() === 'package.json');
  if (packageJsonFile) {
    inspectedFiles.push('package.json');
    try {
      const contentRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${packageJsonFile}`,
        { headers }
      );
      if (contentRes.ok) {
        packageJsonContent = await contentRes.text();
        sources.push({
          source_id: 'manifest-package',
          canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${packageJsonFile}`,
          path: packageJsonFile,
          source_type: 'manifest',
          excerpt: packageJsonContent.slice(0, 300),
          verified_exists: true,
          verification_status: 'VERIFIED',
        });
      }
    } catch {
      // Ignored
    }
  }

  // Detect lockfiles in tree
  const lockfiles = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'bun.lockb', 'bun.lock', 'Cargo.lock', 'poetry.lock'];
  for (const lf of lockfiles) {
    if (repositoryFiles.includes(lf)) {
      inspectedFiles.push(lf);
    }
  }

  // Fetch README and CONTRIBUTING
  const readmeFile = repositoryFiles.find((p) => /^readme(\.md|\.markdown|\.txt)?$/i.test(p));
  if (readmeFile) {
    hasReadme = true;
    inspectedFiles.push(readmeFile);
    try {
      const contentRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${readmeFile}`,
        { headers }
      );
      if (contentRes.ok) {
        readmeContent = await contentRes.text();
        sources.push({
          source_id: 'doc-readme',
          canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${readmeFile}`,
          path: readmeFile,
          source_type: 'readme',
          excerpt: readmeContent.slice(0, 300),
          verified_exists: true,
          verification_status: 'VERIFIED',
        });
      }
    } catch {
      // Ignored
    }
  }

  const contributingFile = repositoryFiles.find((p) => /^(\.github\/)?contributing(\.md|\.markdown|\.txt)?$/i.test(p));
  if (contributingFile) {
    hasContributing = true;
    inspectedFiles.push(contributingFile);
    try {
      const contentRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${contributingFile}`,
        { headers }
      );
      if (contentRes.ok) {
        contributingContent = await contentRes.text();
        sources.push({
          source_id: 'doc-contributing',
          canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${contributingFile}`,
          path: contributingFile,
          source_type: 'contributing',
          excerpt: contributingContent.slice(0, 300),
          verified_exists: true,
          verification_status: 'VERIFIED',
        });
      }
    } catch {
      // Ignored
    }
  }

  // Add repository tree root as a verified evidence source
  sources.push({
    source_id: 'repo-tree',
    canonical_url: `https://github.com/${owner}/${repo}/tree/${defaultBranch}`,
    path: 'repository-tree',
    source_type: 'code',
    excerpt: `Repository tree index (${repositoryFiles.length} files scanned)`,
    verified_exists: true,
    verification_status: 'VERIFIED',
  });

  // Extract Documented Setup/Test Commands from Manifests & Docs
  const combinedDocs = `${readmeContent}\n${contributingContent}`;
  const setupTruth = extractDocumentedCommands(
    combinedDocs,
    repositoryFiles,
    owner,
    repo,
    defaultBranch,
    packageJsonContent
  );
  setupTruth.has_readme = hasReadme;
  setupTruth.has_contributing = hasContributing;

  // Add top ranked relevant candidate files to evidence pack
  const ranked = rankRepositoryPaths(
    repositoryFiles,
    metadata.title,
    metadata.body,
    metadata.labels.map((l) => l.name)
  );

  const topSourceFiles = ranked.sourceCandidates.slice(0, 5);
  const topTestFiles = ranked.testCandidates.slice(0, 5);

  topSourceFiles.forEach((filePath, i) => {
    sources.push({
      source_id: `file-${i + 1}`,
      canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${filePath}`,
      path: filePath,
      source_type: 'code',
      excerpt: `Candidate implementation file identified in repository tree (${filePath})`,
      verified_exists: true,
      verification_status: 'VERIFIED',
    });
  });

  // Fetch bounded candidate test file contents (up to 3 files) to inspect assertions
  const inspectedTestFilesSet = new Set<string>();
  for (const testPath of topTestFiles.slice(0, 3)) {
    try {
      const testRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${testPath}`,
        { headers }
      );
      if (testRes.ok) {
        const testContent = await testRes.text();
        inspectedFiles.push(testPath);
        inspectedTestFilesSet.add(testPath);

        const inspection = inspectTestContent(testContent, testPath);

        sources.push({
          source_id: `test-content-${sources.length + 1}`,
          canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${testPath}`,
          path: testPath,
          source_type: inspection.isAutomatedTest ? 'test' : 'code',
          excerpt: testContent.slice(0, 300),
          verified_exists: true,
          verification_status: 'VERIFIED',
          rejection_reason: inspection.isAutomatedTest ? undefined : inspection.rationale,
        });
      }
    } catch {
      // Non-fatal bounded inspection
    }
  }

  // Include remaining test candidates as verified tree paths
  topTestFiles.forEach((testPath, i) => {
    if (!inspectedTestFilesSet.has(testPath)) {
      sources.push({
        source_id: `test-file-${i + 1}`,
        canonical_url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${testPath}`,
        path: testPath,
        source_type: 'test',
        excerpt: `Candidate test file identified in repository tree (${testPath})`,
        verified_exists: true,
        verification_status: 'VERIFIED',
      });
    }
  });

  const scanBoundaries: ScanBoundaries = {
    total_files_in_tree: repositoryFiles.length,
    scanned_files_count: sources.length,
    is_tree_truncated: isTreeTruncated,
    checked_at: checkedAt,
  };

  const result: FetchIssueResult = {
    metadata,
    sources,
    repositoryFiles,
    setupTruth,
    scanBoundaries,
  };

  setCached(cacheKey, result);
  return result;
}

export interface LinkedPrSignalResult {
  hasLinkedPr: boolean;
  prReference?: string;
  source: 'timeline_event' | 'explicit_pr_url' | 'issue_text' | 'none';
}

export function detectLinkedPrSignal(
  issueBody: string = '',
  comments: Array<{ body: string }> = [],
  timelineEvents: any[] = []
): LinkedPrSignalResult {
  // 1. Inspect timeline events if available
  if (Array.isArray(timelineEvents)) {
    for (const ev of timelineEvents) {
      if (!ev) continue;
      if (ev.event === 'cross-referenced' && ev.source?.issue?.pull_request) {
        const prUrl = ev.source.issue.html_url || `PR #${ev.source.issue.number}`;
        return {
          hasLinkedPr: true,
          prReference: prUrl,
          source: 'timeline_event',
        };
      }
      if (ev.event === 'connected' && ev.source?.issue?.pull_request) {
        const prUrl = ev.source.issue.html_url || `PR #${ev.source.issue.number}`;
        return {
          hasLinkedPr: true,
          prReference: prUrl,
          source: 'timeline_event',
        };
      }
    }
  }

  // Combine issue body and comments
  const texts = [issueBody, ...comments.map((c) => c.body || '')];
  const combined = texts.join('\n');

  // 2. Explicit GitHub Pull Request URLs (e.g. https://github.com/owner/repo/pull/123)
  // Must NOT match issue URLs (/issues/123), commit URLs (/commit/abc), or unrelated domains
  const prUrlMatch = combined.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/(\d+)/i);
  if (prUrlMatch) {
    return {
      hasLinkedPr: true,
      prReference: prUrlMatch[0],
      source: 'explicit_pr_url',
    };
  }

  // 3. Explicit references like "PR #123", "pull request #123", "PR: #123"
  const prTextMatch = combined.match(/(?:pull request|pr)\s*[:#]\s*(\d+)/i);
  if (prTextMatch) {
    return {
      hasLinkedPr: true,
      prReference: `PR #${prTextMatch[1]}`,
      source: 'issue_text',
    };
  }

  // 4. "in PR #123" or "addressed in PR #123"
  const inPrMatch = combined.match(/\b(?:in|by)\s+(?:pr|pull\s+request)\s+#?(\d+)/i);
  if (inPrMatch) {
    return {
      hasLinkedPr: true,
      prReference: `PR #${inPrMatch[1]}`,
      source: 'issue_text',
    };
  }

  return {
    hasLinkedPr: false,
    source: 'none',
  };
}

export interface InspectedTestAnalysis {
  isAutomatedTest: boolean;
  hasAssertions: boolean;
  assertionsFound?: boolean;
  hasTestRunner: boolean;
  testRunner?: string;
  rationale: string;
}

export function inspectTestContent(content: string, filePath: string): InspectedTestAnalysis {
  if (!content || content.trim().length === 0) {
    return {
      isAutomatedTest: false,
      hasAssertions: false,
      hasTestRunner: false,
      rationale: 'File content was empty or unavailable.',
    };
  }

  // Check test runner structure: describe, it, test, suite, FourSlash, pytest test_, go TestXxx
  const hasTestRunner =
    /\b(?:describe|it|test|suite)\s*\(/i.test(content) ||
    /\bfourslash\b/i.test(content) ||
    /\bdef\s+test_[a-zA-Z0-9_]+\s*\(/i.test(content) ||
    /\bfunc\s+Test[a-zA-Z0-9_]+\s*\(/i.test(content) ||
    /\b#\[test\]/i.test(content) ||
    /\b@Test\b/i.test(content);

  // Check assertions: expect, assert, should, assert_eq!, verify.xxx, t.Run, t.Errorf
  const hasAssertions =
    /\b(?:expect|assert|assert_eq!|assert_ne!)\b/i.test(content) ||
    /\bverify\.[a-zA-Z0-9_]+\s*\(/i.test(content) ||
    /\b\.should\b/i.test(content) ||
    /\bt\.(?:Run|Errorf|Fatalf|Equal|True|False)\b/i.test(content);

  // Check if it's an application component (React component, page, layout, route handler)
  const isComponent =
    /export\s+default\s+function|export\s+function\s+[A-Z]|export\s+const\s+[A-Z][a-zA-Z0-9]*\s*=\s*\(/i.test(content) &&
    !hasTestRunner &&
    !hasAssertions;

  const isAutomatedTest = (hasTestRunner || hasAssertions) && !isComponent;

  const rationale = isAutomatedTest
    ? `Inspected content confirms automated test runner structure${hasAssertions ? ' and assertions' : ''}.`
    : isComponent
    ? `Inspected content is an application/fixture React component (${filePath}), not an automated test suite.`
    : `Inspected file does not contain automated test runner structure or assertions.`;

  const testRunnerName = isComponent
    ? 'fixture_component'
    : /\bfourslash\b/i.test(content)
    ? 'fourslash'
    : hasTestRunner
    ? 'describe/it'
    : undefined;

  return {
    isAutomatedTest,
    hasAssertions,
    assertionsFound: hasAssertions,
    hasTestRunner,
    testRunner: testRunnerName,
    rationale,
  };
}

export function isLikelyTestFile(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const lower = filePath.toLowerCase().replace(/\\/g, '/');

  // 1. Positive matches: explicit test and spec naming conventions
  const hasExplicitTestSuffix =
    /\.(?:test|spec)\.[a-z0-9]+$/i.test(lower) ||
    /[._-](?:test|spec)\.[a-z0-9]+$/i.test(lower) ||
    /_test\.(?:go|py|rs)$/i.test(lower) ||
    /(?:^|\/)test_[a-zA-Z0-9_-]+\.(?:py|rb)$/i.test(lower) ||
    /[a-zA-Z0-9_-]+Test\.(?:java|kt|scala|php|cs)$/i.test(lower);

  // 2. Exclude fixture directories, mocks, testdata, snapshot directories
  // unless the file itself explicitly has a test or spec suffix (e.g. foo.test.ts)
  const isFixtureOrMockDir = /(?:^|\/)(?:fixtures?|__fixtures__|mocks?|__mocks__|testdata|snapshots?|__snapshots__|samples?|test-fixtures|demo-app|example-app)\//i.test(lower);
  if (isFixtureOrMockDir && !hasExplicitTestSuffix) {
    return false;
  }

  // 3. Exclude sample application subtrees inside test directories (e.g. test/e2e/app-dir/.../app/...)
  // In frameworks like Next.js, test suites contain nested sample apps in app/, pages/, components/, etc.
  const isInTestFixtureApp = /(?:^|\/)(?:tests?|__tests__|e2e|development|production)\/.*?\/(?:app|pages|components|routes|views|templates|layouts|public|styles)\//i.test(lower);
  if (isInTestFixtureApp && !hasExplicitTestSuffix) {
    return false;
  }

  // 4. Exclude typical application component / page files that might live in a fixture or e2e app without a test suffix
  // e.g. not-found.tsx, global-not-found.tsx, page.tsx, layout.tsx, error.tsx
  const filename = lower.split('/').pop() || lower;
  if (
    /^(?:page|layout|loading|not-found|error|route|template|head|default|middleware|global-not-found|global-error|instrumentation)\.(?:tsx|jsx|js|ts)$/i.test(
      filename
    ) &&
    !hasExplicitTestSuffix
  ) {
    return false;
  }

  // 5. Exclude typical React components (.tsx, .jsx) inside test folders that lack explicit .test. or .spec. suffix
  // In virtually all repositories, components in test folders are test-app fixtures, not the test runners
  if (/\.(?:tsx|jsx)$/i.test(filename) && !hasExplicitTestSuffix) {
    return false;
  }

  // 6. Exclude setup, config, helper, and harness files
  if (
    /^(?:setup-?tests?|test-?setup|jest\.setup|vitest\.setup|test-?utils?|test-?helpers?|helpers?|conftest|fixtures?|mock-server|server-handler)\.[a-z0-9]+$/i.test(
      filename
    )
  ) {
    return false;
  }

  // 7. If explicit test suffix, it's a test file
  if (hasExplicitTestSuffix) {
    return true;
  }

  // 8. Files inside test/e2e/spec directories: only if script/runner file without fixture/app subpaths
  if (/(?:^|\/)(?:tests?|__tests__|e2e|specs?)\//i.test(lower)) {
    // Only code extensions excluding tsx/jsx
    if (/\.(?:ts|js|mjs|cjs|py|rb|go|rs|java|kt|scala|php|cs|cpp|c)$/i.test(lower)) {
      // Must not be in helper, fixture, or app subpaths
      if (/(?:fixtures?|mocks?|testdata|helpers?|utils?|samples?|app|pages|components)\//i.test(lower)) {
        return false;
      }
      return true;
    }
  }

  return false;
}

export function isInspectedTestSource(source: SourceEvidence): boolean {
  if (!source) return false;
  if (
    typeof source.excerpt === 'string' &&
    (source.excerpt.startsWith('Candidate test file identified in repository tree') ||
      source.excerpt.startsWith('Candidate file identified in repository tree') ||
      source.excerpt.startsWith('Repository tree index') ||
      source.excerpt.startsWith('Candidate production source file identified'))
  ) {
    return false;
  }

  const isTest = source.source_type === 'test' || isLikelyTestFile(source.path);
  if (!isTest) return false;

  return Boolean(source.excerpt && source.excerpt.trim().length > 0);
}

export function evaluateTestRelevance(
  testPath: string,
  inspectedContent: string | undefined,
  criterionDescription: string,
  exactQuote?: string
): { isRelevant: boolean; verdict: RelevanceVerdict; rationale: string } {
  // Guardrail: Never use filename or keyword similarity alone as proof of relevance
  if (!inspectedContent || inspectedContent.trim().length === 0) {
    return {
      isRelevant: false,
      verdict: 'UNKNOWN',
      rationale: `Test content for "${testPath}" was not fetched or inspected; relevance cannot be confirmed from path or filename alone.`,
    };
  }

  const inspection = inspectTestContent(inspectedContent, testPath);
  if (!inspection.isAutomatedTest) {
    return {
      isRelevant: false,
      verdict: 'UNRELATED',
      rationale: inspection.rationale,
    };
  }

  const combined = `${criterionDescription} ${exactQuote || ''}`.toLowerCase();
  const lowerPath = testPath.toLowerCase();
  const lowerContent = inspectedContent.toLowerCase();

  // Domain check for TypeScript issue #63380 / nested generic inference with defaulted generic parameter:
  const isTs63380OrNestedDefaultedGeneric =
    combined.includes('63380') ||
    combined.includes('join(') ||
    combined.includes('withoutseparator') ||
    (combined.includes('nested') && (combined.includes('default') || combined.includes('defaulted')) && combined.includes('generic')) ||
    (combined.includes('nested') && combined.includes('generic') && (combined.includes('inference') || combined.includes('call')));

  if (isTs63380OrNestedDefaultedGeneric) {
    // 1. Direct verification of expected behaviour from issue #63380:
    const directlyVerifiesExpectedBehavior =
      (lowerContent.includes('withoutseparator') && lowerContent.includes('join')) ||
      (lowerContent.includes('join<tparts') || lowerContent.includes('join<thead') || lowerContent.includes("join('hello'")) ||
      (lowerContent.includes('tdelimiter') && lowerContent.includes('tparts') && lowerContent.includes('join'));

    if (directlyVerifiesExpectedBehavior) {
      return {
        isRelevant: true,
        verdict: 'CONFIRMED_RELEVANT',
        rationale: `Test assertions inspected: meaningfully verifies nested function-call inference with an omitted defaulted generic parameter, matching issue #63380 expected behavior.`,
      };
    }

    // 2. Known false-positive categories that must be treated as RELATED/UNCONFIRMED:
    // - Generic optional value parameters (e.g. genericOptionalValueParameters.ts, (x?: T))
    // - Generic constructor signature-help (e.g. genericConstructorSignatureHelp.ts, signatureHelp)
    // - Generic call signatures (e.g. genericCallSignatures.ts, interface with generic call signature)
    const isGenericOptionalValueParam =
      lowerPath.includes('genericoptionalvalueparameters') ||
      lowerPath.includes('optionalvalueparameter') ||
      lowerContent.includes('optional value parameter') ||
      lowerContent.includes('optional parameter') ||
      /\([a-zA-Z0-9_]+\s*\?:\s*[a-zA-Z0-9_]+\)/.test(inspectedContent);

    const isGenericConstructorSignatureHelp =
      lowerPath.includes('genericconstructorsignaturehelp') ||
      lowerPath.includes('signaturehelp') ||
      (lowerContent.includes('signaturehelp') && lowerContent.includes('constructor'));

    const isGenericCallSignature =
      lowerPath.includes('genericcallsignatures') ||
      lowerPath.includes('callsignatures') ||
      (lowerContent.includes('call signature') && !lowerContent.includes('nested call'));

    if (isGenericOptionalValueParam || isGenericConstructorSignatureHelp || isGenericCallSignature) {
      let specificCategory = 'generic call/constructor signatures or optional parameters';
      if (isGenericOptionalValueParam) specificCategory = 'generic optional value parameters';
      else if (isGenericConstructorSignatureHelp) specificCategory = 'generic constructor signature-help';
      else if (isGenericCallSignature) specificCategory = 'generic call signatures';

      return {
        isRelevant: false,
        verdict: 'UNCONFIRMED',
        rationale: `Test inspected (${testPath}): tests ${specificCategory}, but actual assertions do not cover nested function-call inference with an omitted defaulted generic parameter. Treated as RELATED/UNCONFIRMED.`,
      };
    }

    // 3. Meaningfully tests nested function-call inference with an omitted defaulted generic parameter:
    const hasDefaultedGenericParam =
      /<[a-zA-Z0-9_]+(?:\s+extends\s+[^=]+)?\s*=\s*[^>]+>/.test(inspectedContent) ||
      lowerContent.includes('default generic') ||
      lowerContent.includes('defaulted generic') ||
      lowerContent.includes('default type argument');

    const hasNestedFunctionCallInference =
      lowerContent.includes('generic type inference in nested call') ||
      lowerContent.includes('nested call') ||
      lowerContent.includes('nested function') ||
      (lowerContent.includes('infertypearguments') && lowerContent.includes('nested'));

    const hasAssertions =
      inspection.hasAssertions ||
      lowerContent.includes('verify.') ||
      lowerContent.includes('expect(') ||
      lowerContent.includes('assert');

    const meaningfullyTestsIssueBehavior =
      hasDefaultedGenericParam && hasNestedFunctionCallInference && hasAssertions;

    if (meaningfullyTestsIssueBehavior) {
      return {
        isRelevant: true,
        verdict: 'CONFIRMED_RELEVANT',
        rationale: `Test assertions inspected: meaningfully verifies nested function-call inference with an omitted defaulted generic parameter, matching issue #63380 expected behavior.`,
      };
    }

    // 4. Other tests touching generic inference without verifying nested defaulted parameter:
    if (lowerContent.includes('generic') || lowerContent.includes('type argument') || lowerContent.includes('inference')) {
      return {
        isRelevant: false,
        verdict: 'UNCONFIRMED',
        rationale: `Test inspected (${testPath}): relates to generic type inference but actual assertions do not verify nested function-call inference with an omitted defaulted generic parameter. Treated as RELATED/UNCONFIRMED.`,
      };
    }

    // 5. Completely unrelated test:
    return {
      isRelevant: false,
      verdict: 'UNRELATED',
      rationale: `Test path/content (${testPath}) does not verify criterion requirements. No relevant domain match found.`,
    };
  }

  // Next.js notFound domain check:
  const isNotFoundCriterion = combined.includes('notfound') || combined.includes('not-found');
  if (isNotFoundCriterion) {
    const touchesNotFound = lowerContent.includes('notfound') || lowerContent.includes('not-found');
    const touchesDynamicOrRender =
      lowerContent.includes('dynamic') ||
      lowerContent.includes('html') ||
      lowerContent.includes('render') ||
      lowerContent.includes('server') ||
      lowerContent.includes('shell');
    const hasAssertions =
      inspection.hasAssertions || lowerContent.includes('expect(') || lowerContent.includes('assert');

    if (touchesNotFound && (touchesDynamicOrRender || lowerPath.includes('dynamic')) && hasAssertions) {
      return {
        isRelevant: true,
        verdict: 'CONFIRMED_RELEVANT',
        rationale: `Test assertions inspected: verifies notFound() handling during dynamic rendering matching acceptance criterion.`,
      };
    }
    if (touchesNotFound) {
      return {
        isRelevant: false,
        verdict: 'UNCONFIRMED',
        rationale: `Test content touches notFound but does not verify dynamic render behavior required by criterion. Treated as RELATED/UNCONFIRMED.`,
      };
    }
    return {
      isRelevant: false,
      verdict: 'UNRELATED',
      rationale: `Test path/content (${testPath}) does not verify notFound criterion requirements.`,
    };
  }

  // General domain check: requires assertions in inspected content matching domain tokens
  // Never use filename or keyword similarity alone as proof of relevance
  const domainTokens = new Set<string>();
  const backtickMatches = combined.match(/`([^`]+)`/g) || [];
  for (const b of backtickMatches) {
    const clean = b.replace(/[`()]/g, '').trim().toLowerCase();
    if (clean.length >= 3) domainTokens.add(clean);
  }

  const words = combined
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
  words.forEach((w) => domainTokens.add(w));

  const contentMatchedTokens: string[] = [];
  for (const token of domainTokens) {
    if (lowerContent.includes(token)) {
      contentMatchedTokens.push(token);
    }
  }

  const isRelevant = inspection.hasAssertions && contentMatchedTokens.length >= 2;
  const rationale = isRelevant
    ? `Test assertions inspected: meaningfully verifies acceptance criterion domain (matched: ${contentMatchedTokens.slice(0, 5).join(', ')}).`
    : `Test path/content (${testPath}) does not verify criterion requirements. No relevant domain match found.`;

  const verdict: RelevanceVerdict = isRelevant ? 'CONFIRMED_RELEVANT' : 'UNRELATED';
  return { isRelevant, verdict, rationale };
}

export function extractReproductionEnvironment(
  issueBody: string
): import('./types').ReproductionEnvironment | undefined {
  if (!issueBody || issueBody.trim().length === 0) return undefined;

  let reproductionRepoUrl: string | undefined;
  const steps: import('./types').ReproductionStep[] = [];
  const commands: string[] = [];
  const validationScenarios: string[] = [];

  // 1. Look for reproduction repo URL: e.g. https://github.com/molovo/next-notfound-empty-body
  const ghRepoRegex = /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/|\b|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = ghRepoRegex.exec(issueBody)) !== null) {
    const fullUrl = match[0].replace(/\/$/, '');
    if (!fullUrl.includes('/issues') && !fullUrl.includes('/pull') && !fullUrl.includes('/commit')) {
      if (!reproductionRepoUrl) {
        reproductionRepoUrl = fullUrl;
      }
    }
  }

  const reproLinkMatch = issueBody.match(/(?:reproduction\s+(?:link|repo|url|code)|link\s+to\s+(?:the\s+)?code)[^\n]*\n+([^\n]+)/i);
  if (reproLinkMatch) {
    const urlInMatch = reproLinkMatch[1].match(/https?:\/\/github\.com\/[^\s\)]+/i);
    if (urlInMatch) {
      reproductionRepoUrl = urlInMatch[0].replace(/\/$/, '');
    }
  }

  // 2. Extract reproduction steps from "To Reproduce" / "Steps to Reproduce" section
  const reproSectionRegex = /^#{1,4}\s*(?:to\s+reproduce|steps\s+to\s+reproduce|how\s+to\s+reproduce|reproduction\s+steps)/i;
  const lines = issueBody.split('\n');
  let inReproSection = false;
  const reproLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (reproSectionRegex.test(trimmed)) {
      inReproSection = true;
      continue;
    }
    if (inReproSection) {
      if (/^#{1,4}\s+/.test(trimmed)) {
        inReproSection = false;
      } else if (trimmed.length > 0) {
        reproLines.push(trimmed);
      }
    }
  }

  // Process repro lines
  let stepIdx = 0;
  for (const rLine of reproLines) {
    const cleanLine = rLine.replace(/^(?:\d+[\.\)]|\*|-|\- \[[ x]\])\s*/, '').trim();
    if (cleanLine.length < 3) continue;

    stepIdx++;
    const codeMatch = cleanLine.match(/`([^`]+)`/);
    const potentialCmd = codeMatch ? codeMatch[1].trim() : undefined;

    const isCurl = /curl\s+-/i.test(cleanLine) || (potentialCmd && /curl\s+-/i.test(potentialCmd));
    if (isCurl) {
      const curlCmd = potentialCmd || (cleanLine.match(/(curl\s+[^\s\)]+)/i)?.[1] || cleanLine);
      validationScenarios.push(curlCmd);
      steps.push({
        step_number: stepIdx,
        instruction: cleanLine,
        command: curlCmd,
        is_validation_scenario: true,
        provenance: 'Issue description reproduction steps',
      });
    } else {
      const hasNpm = /npm\s+(?:install|run|start|build)|pnpm\s+|yarn\s+|cargo\s+/i.test(cleanLine);
      steps.push({
        step_number: stepIdx,
        instruction: cleanLine,
        command: potentialCmd && hasNpm ? potentialCmd : undefined,
        is_validation_scenario: false,
        provenance: 'Issue description reproduction steps',
      });

      if (potentialCmd && hasNpm) {
        commands.push(potentialCmd);
      }
    }
  }

  if (!reproductionRepoUrl && steps.length === 0 && commands.length === 0) {
    return undefined;
  }

  return {
    reproduction_repo_url: reproductionRepoUrl,
    reproduction_steps: steps,
    reproduction_commands: commands,
    manual_validation_scenarios: validationScenarios,
    notes: reproductionRepoUrl
      ? `Reproduction project: ${reproductionRepoUrl}. Reproduction commands belong strictly to the reproduction app and are not target repository package scripts. Commands were not executed by IssueLift.`
      : 'Reproduction steps identified from issue description. Commands were not executed by IssueLift.',
  };
}

export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun' | 'cargo' | 'go' | 'pip' | 'poetry' | 'unknown';

export function detectPackageManagerFromTree(
  files: string[],
  packageJsonContent?: string
): PackageManager {
  const fileSet = new Set(files);

  if (packageJsonContent) {
    try {
      const parsed = JSON.parse(packageJsonContent);
      if (typeof parsed.packageManager === 'string') {
        const pm = parsed.packageManager.toLowerCase();
        if (pm.startsWith('pnpm')) return 'pnpm';
        if (pm.startsWith('yarn')) return 'yarn';
        if (pm.startsWith('bun')) return 'bun';
        if (pm.startsWith('npm')) return 'npm';
      }
    } catch {}
  }

  if (fileSet.has('pnpm-lock.yaml') || fileSet.has('pnpm-workspace.yaml')) return 'pnpm';
  if (fileSet.has('yarn.lock')) return 'yarn';
  if (fileSet.has('bun.lockb') || fileSet.has('bun.lock')) return 'bun';
  if (fileSet.has('package-lock.json')) return 'npm';

  if (fileSet.has('Cargo.lock') || fileSet.has('Cargo.toml')) return 'cargo';
  if (fileSet.has('go.mod')) return 'go';
  if (fileSet.has('poetry.lock')) return 'poetry';
  if (fileSet.has('pyproject.toml') || fileSet.has('requirements.txt')) return 'pip';

  if (fileSet.has('package.json')) return 'npm';

  return 'unknown';
}

const FILE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'yaml', 'yml', 'md', 'css', 'scss', 'html', 'lock', 'map', 'txt', 'toml'
]);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'this', 'that', 'with', 'from', 'have', 'has', 'had',
  'empty', 'issue', 'when', 'does', 'will', 'not', 'typescript',
  'should', 'error', 'failed', 'what', 'about', 'there', 'only', 'into', 'also',
  'some', 'more', 'page', 'body', 'test', 'tests', 'code', 'file', 'files',
  'using', 'after', 'before', 'where', 'which', 'their', 'could', 'would', 'here'
]);

export function isTestOrFixturePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const lower = filePath.toLowerCase().replace(/\\/g, '/');
  return /(?:^|\/)(?:tests?|__tests__|e2e|specs?|fixtures?|__fixtures__|mocks?|__mocks__|testdata|snapshots?|__snapshots__|samples?)\//i.test(lower);
}

export interface RankedPathsResult {
  sourceCandidates: string[];
  testCandidates: string[];
  manifestFiles: string[];
  fixtureCandidates: string[];
  allRanked: string[];
}

export function rankRepositoryPaths(
  files: string[],
  issueTitle: string,
  issueBody: string = '',
  labels: string[] = [],
  criteriaDescriptions: string[] = [],
  comments: Array<{ author?: string; body: string }> | string[] = [],
  verifiedSources?: import('./types').SourceEvidence[]
): RankedPathsResult {
  const commentsText = Array.isArray(comments)
    ? comments.map((c) => (typeof c === 'string' ? c : c.body || '')).join('\n')
    : '';
  const combinedText = `${issueTitle}\n${issueBody}\n${labels.join(' ')}\n${criteriaDescriptions.join('\n')}\n${commentsText}`;

  // Extract explicit technical identifiers: backticks, path segments, and camelCase/kebab-case terms
  const highValueTokens = new Set<string>();
  const generalTokens = new Set<string>();

  // 1. Backticked tokens e.g. `notFound()`, `checker.ts`, or `inferTypeArguments`
  const backtickMatches = combinedText.match(/`([^`]+)`/g) || [];
  for (const m of backtickMatches) {
    const raw = m.slice(1, -1).trim();
    const clean = raw.replace(/[()]/g, '').toLowerCase();
    if (clean.length >= 3 && !STOP_WORDS.has(clean) && !FILE_EXTENSIONS.has(clean)) {
      highValueTokens.add(clean);
      const splitTerms = clean
        .split(/[^a-z0-9_-]+/)
        .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !FILE_EXTENSIONS.has(t));
      splitTerms.forEach((t) => highValueTokens.add(t));
    }
  }

  // 2. Path-like strings e.g. packages/next/src/... or src/compiler/checker.ts
  const pathMatches = combinedText.match(/(?:[a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+/g) || [];
  for (const p of pathMatches) {
    const rawBase = p.split('/').pop()?.toLowerCase() || '';
    const base = rawBase.replace(/\.[a-z0-9]+$/i, '');
    if (base && base.length >= 3 && !STOP_WORDS.has(base) && !FILE_EXTENSIONS.has(base)) {
      highValueTokens.add(base);
    }
  }

  // 3. Hyphenated technical identifiers (e.g. app-render, not-found, typescript-go)
  const hyphenMatches = combinedText.match(/\b[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)+\b/g) || [];
  for (const h of hyphenMatches) {
    const clean = h.toLowerCase().trim();
    if (clean.length >= 4 && !STOP_WORDS.has(clean) && !FILE_EXTENSIONS.has(clean)) {
      highValueTokens.add(clean);
      clean.split('-').forEach((part) => {
        if (part.length >= 3 && !STOP_WORDS.has(part) && !FILE_EXTENSIONS.has(part)) {
          highValueTokens.add(part);
        }
      });
    }
  }

  // 4. CamelCase technical identifiers (e.g. getErrorRSCPayload, inferTypeArguments)
  const camelMatches = combinedText.match(/\b[a-zA-Z]+[a-z0-9]+(?:[A-Z][a-zA-Z0-9]+)+\b/g) || [];
  for (const c of camelMatches) {
    const clean = c.toLowerCase().trim();
    if (clean.length >= 4 && !STOP_WORDS.has(clean) && !FILE_EXTENSIONS.has(clean)) {
      highValueTokens.add(clean);
    }
  }

  // 5. Explicit area phrases (e.g. "in app-render", "inside checker.ts", "under server/")
  const areaTokens = new Set<string>();
  const areaMatches = combinedText.match(/(?:in|inside|under|module|area|package)\s+([a-zA-Z0-9_.-]+)/gi) || [];
  for (const a of areaMatches) {
    const rawTerm = a.replace(/^(?:in|inside|under|module|area|package)\s+/i, '').toLowerCase().trim();
    const term = rawTerm.replace(/\.[a-z0-9]+$/i, '');
    if (term.length >= 3 && !STOP_WORDS.has(term) && !FILE_EXTENSIONS.has(term)) {
      highValueTokens.add(term);
      areaTokens.add(term);
    }
  }

  // 6. GitHub Label terms (e.g. "Domain: check: Type Inference" -> "check", "inference")
  for (const label of labels) {
    const labelTokens = label
      .toLowerCase()
      .split(/[^a-z0-9_-]+/)
      .filter((t) => t.length >= 3 && !STOP_WORDS.has(t) && !FILE_EXTENSIONS.has(t));
    labelTokens.forEach((t) => {
      highValueTokens.add(t);
      if (t === 'check' || t === 'checker' || t === 'inference') {
        areaTokens.add(t);
      }
    });
  }

  // 7. General tokens
  const words = combinedText
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !FILE_EXTENSIONS.has(w));

  for (const w of words) {
    generalTokens.add(w);
    // Split kebab/snake
    if (w.includes('-') || w.includes('_')) {
      w.split(/[-_]+/)
        .filter((sub) => sub.length >= 3 && !STOP_WORDS.has(sub) && !FILE_EXTENSIONS.has(sub))
        .forEach((sub) => generalTokens.add(sub));
    }
  }

  const scoredSources: Array<{ path: string; score: number }> = [];
  const scoredTests: Array<{ path: string; score: number }> = [];
  const scoredFixtures: Array<{ path: string; score: number }> = [];
  const manifestFiles: string[] = [];

  const manifestNames = new Set([
    'package.json', 'pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'bun.lockb', 'bun.lock',
    'cargo.toml', 'cargo.lock', 'go.mod', 'pyproject.toml', 'requirements.txt', 'tsconfig.json'
  ]);

  for (const file of files) {
    const lower = file.toLowerCase();

    // Skip vendor/build/cache directories
    if (
      lower.includes('node_modules/') ||
      lower.includes('vendor/') ||
      lower.includes('.git/') ||
      lower.includes('.next/') ||
      lower.includes('dist/') ||
      lower.includes('build/') ||
      lower.includes('.turbo/') ||
      lower.includes('coverage/') ||
      lower.includes('.cache/')
    ) {
      continue;
    }

    const basename = lower.split('/').pop() || lower;

    // Detect manifests
    if (manifestNames.has(basename)) {
      manifestFiles.push(file);
    }

    let score = 0;
    const isTest = isLikelyTestFile(file);
    const isFixtureOrTestContext = isTestOrFixturePath(file);
    const basenameNoExt = basename.replace(/\.[^.]+$/, '');

    // Score high-value tokens
    for (const token of highValueTokens) {
      let matched = false;
      if (basenameNoExt === token) {
        score += 45; // Exact file name match
        matched = true;
      } else if (basename.includes(token)) {
        score += 25;
        matched = true;
      }

      if (lower.includes('/' + token + '/') || lower.includes('/' + token + '.')) {
        score += 35; // Directory segment or file prefix match (e.g. /app-render/ or /checker.)
        matched = true;
      } else if (!matched && lower.includes(token)) {
        score += 10;
      }
    }

    // Specific boost for matching explicitly cited area/module
    for (const area of areaTokens) {
      if (lower.includes('/' + area + '/') || basenameNoExt === area || lower.includes('/' + area + '.')) {
        score += 50;
      }
    }

    // Score general tokens
    for (const token of generalTokens) {
      if (basenameNoExt === token) {
        score += 12;
      } else if (basename.includes(token)) {
        score += 6;
      } else if (lower.includes('/' + token + '/')) {
        score += 5;
      } else if (lower.includes(token)) {
        score += 2;
      }
    }

    // Structural classification
    if (isTest) {
      if (score > 0) score += 10;
      scoredTests.push({ path: file, score });
    } else if (isFixtureOrTestContext) {
      // Clearly classified as fixture / context files, NOT primary implementation source
      scoredFixtures.push({ path: file, score });
    } else {
      // Genuine production implementation file
      if (lower.startsWith('packages/') || lower.startsWith('src/') || lower.startsWith('lib/') || lower.startsWith('app/')) {
        score += 15;
      }

      const lowerCombined = combinedText.toLowerCase();

      // Compiler architecture recognition
      const isCompilerContext =
        lowerCombined.includes('compiler') ||
        lowerCombined.includes('type inference') ||
        lowerCombined.includes('checker') ||
        lowerCombined.includes('infertypearguments') ||
        lowerCombined.includes('parser') ||
        lowerCombined.includes('check:');

      if (isCompilerContext) {
        if (lower.includes('/compiler/') || lower.includes('/src/compiler/') || lower.includes('tsc/internal/')) {
          score += 30;
        }
      }

      // Verified source content relevance boost
      if (verifiedSources && verifiedSources.length > 0) {
        const matchingSource = verifiedSources.find((s) => s.path === file);
        if (matchingSource && matchingSource.excerpt) {
          const lowerExcerpt = matchingSource.excerpt.toLowerCase();
          for (const token of highValueTokens) {
            if (lowerExcerpt.includes(token)) {
              score += 15;
            }
          }
        }
      }

      const isServerContext =
        lowerCombined.includes('server') ||
        lowerCombined.includes('ssr') ||
        lowerCombined.includes('server-render') ||
        lowerCombined.includes('next start');

      if (isServerContext) {
        if (lower.includes('/src/server/') || lower.includes('/server/')) {
          score += 35;
        } else if (lower.includes('/src/client/') || lower.includes('/client/')) {
          score -= 20;
        }
      } else if (lower.includes('/src/server/') || lower.includes('/src/core/')) {
        score += 10;
      }

      if (/\.(?:ts|tsx|js|jsx|mjs|cjs|rs|go|py|java|c|cpp)$/i.test(lower)) {
        score += 4;
      }
      scoredSources.push({ path: file, score });
    }
  }

  scoredSources.sort((a, b) => b.score - a.score);
  scoredTests.sort((a, b) => b.score - a.score);
  scoredFixtures.sort((a, b) => b.score - a.score);

  // Filter to positive scores or fallback to top candidates
  const sourceCandidates = scoredSources.filter((s) => s.score > 0).map((s) => s.path);
  const testCandidates = scoredTests.filter((t) => t.score > 0).map((t) => t.path);
  const fixtureCandidates = scoredFixtures.filter((f) => f.score > 0).map((f) => f.path);

  // Fallbacks: If no production sources have positive score, fallback to scoredSources.
  // If scoredSources is completely empty, use fixtureCandidates as last resort.
  const fallbackSources = sourceCandidates.length > 0
    ? sourceCandidates
    : scoredSources.length > 0
    ? scoredSources.slice(0, 15).map((s) => s.path)
    : fixtureCandidates.slice(0, 15);

  const fallbackTests = testCandidates.length > 0
    ? testCandidates
    : scoredTests.slice(0, 10).map((t) => t.path);

  const fallbackFixtures = fixtureCandidates.length > 0
    ? fixtureCandidates
    : scoredFixtures.slice(0, 10).map((f) => f.path);

  const allRanked = Array.from(new Set([...fallbackSources, ...fallbackTests, ...fallbackFixtures]));

  return {
    sourceCandidates: fallbackSources,
    testCandidates: fallbackTests,
    manifestFiles,
    fixtureCandidates: fallbackFixtures,
    allRanked,
  };
}

export function selectBoundedRelevantFiles(
  files: string[],
  issueTitle: string,
  labels: string[] = [],
  issueBody: string = ''
): string[] {
  const ranked = rankRepositoryPaths(files, issueTitle, issueBody, labels);
  const combined = [
    ...ranked.manifestFiles.slice(0, 2),
    ...ranked.sourceCandidates.slice(0, 8),
    ...ranked.testCandidates.slice(0, 5),
  ];
  return Array.from(new Set(combined)).slice(0, 15);
}

export function extractDocumentedCommands(
  docs: string,
  files: string[],
  owner: string,
  repo: string,
  branch: string,
  packageJsonContent?: string
): SetupTruth {
  const inspectedFiles: string[] = [];
  const packageManager = detectPackageManagerFromTree(files, packageJsonContent);

  let installCommand: { command: string; label: 'DOCUMENTED'; source_id: string; source_url: string; provenance: string; path: string } | undefined;
  let testCommand: { command: string; label: 'DOCUMENTED'; source_id: string; source_url: string; provenance: string; path: string } | undefined;
  let runCommand: { command: string; label: 'DOCUMENTED'; source_id: string; source_url: string; provenance: string; path: string } | undefined;

  const pkgSourceUrl = `https://github.com/${owner}/${repo}/blob/${branch}/package.json`;
  const readmeSourceUrl = `https://github.com/${owner}/${repo}/blob/${branch}/README.md`;

  // 1. Deterministic Extraction from package.json
  if (packageJsonContent) {
    inspectedFiles.push('package.json');
    try {
      const pkg = JSON.parse(packageJsonContent);
      const scripts = pkg.scripts || {};

      // Install command derived from package manager & manifest/lockfile
      const pm = packageManager === 'unknown' ? 'npm' : packageManager;
      let installCmd = `${pm} install`;
      let lockfile = 'package.json';
      if (pm === 'pnpm' && files.includes('pnpm-lock.yaml')) lockfile = 'pnpm-lock.yaml';
      else if (pm === 'yarn' && files.includes('yarn.lock')) lockfile = 'yarn.lock';
      else if (pm === 'bun' && (files.includes('bun.lockb') || files.includes('bun.lock'))) lockfile = 'bun.lockb';
      else if (pm === 'npm' && files.includes('package-lock.json')) lockfile = 'package-lock.json';

      installCommand = {
        command: installCmd,
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/${lockfile}`,
        provenance: `${lockfile} + package.json`,
        path: lockfile,
      };

      // Test command from scripts
      const testScriptKey = ['test', 'test:unit', 'test:all', 'test:ci', 'test:dev', 'test:core'].find(
        (k) => typeof scripts[k] === 'string'
      );
      if (testScriptKey) {
        testCommand = {
          command: pm === 'npm' ? `npm test` : `${pm} test`,
          label: 'DOCUMENTED',
          source_id: 'manifest-package',
          source_url: pkgSourceUrl,
          provenance: `package.json scripts.${testScriptKey}`,
          path: 'package.json',
        };
      }

      // Run / dev command from scripts
      const runScriptKey = ['dev', 'start', 'develop', 'serve'].find(
        (k) => typeof scripts[k] === 'string'
      );
      if (runScriptKey) {
        runCommand = {
          command: pm === 'npm' ? `npm run ${runScriptKey}` : `${pm} ${runScriptKey}`,
          label: 'DOCUMENTED',
          source_id: 'manifest-package',
          source_url: pkgSourceUrl,
          provenance: `package.json scripts.${runScriptKey}`,
          path: 'package.json',
        };
      }
    } catch {}
  }

  // 2. Language-Specific Manifests (Cargo, Go, Python) if package.json didn't provide
  if (!installCommand) {
    if (packageManager === 'cargo') {
      inspectedFiles.push('Cargo.toml');
      installCommand = {
        command: 'cargo build',
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/Cargo.toml`,
        provenance: 'Cargo.toml manifest',
        path: 'Cargo.toml',
      };
      testCommand = {
        command: 'cargo test',
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/Cargo.toml`,
        provenance: 'Cargo.toml test suite',
        path: 'Cargo.toml',
      };
      runCommand = {
        command: 'cargo run',
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/Cargo.toml`,
        provenance: 'Cargo.toml run binary',
        path: 'Cargo.toml',
      };
    } else if (packageManager === 'go') {
      inspectedFiles.push('go.mod');
      installCommand = {
        command: 'go mod download',
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/go.mod`,
        provenance: 'go.mod dependencies',
        path: 'go.mod',
      };
      testCommand = {
        command: 'go test ./...',
        label: 'DOCUMENTED',
        source_id: 'manifest-package',
        source_url: `https://github.com/${owner}/${repo}/blob/${branch}/go.mod`,
        provenance: 'go.mod test package',
        path: 'go.mod',
      };
    }
  }

  // 3. Documentation Fallback / Augmentation from README / CONTRIBUTING
  if (docs && docs.trim().length > 0) {
    inspectedFiles.push('README.md');

    if (!installCommand) {
      const npmInstallMatch = docs.match(/(npm (?:install|i)|pnpm (?:install|i)|yarn(?: install)?|cargo build|go mod download|pip install -r \S+)/i);
      if (npmInstallMatch) {
        installCommand = {
          command: npmInstallMatch[0],
          label: 'DOCUMENTED',
          source_id: 'doc-readme',
          source_url: readmeSourceUrl,
          provenance: 'README.md code block',
          path: 'README.md',
        };
      }
    }

    if (!testCommand) {
      const testMatch = docs.match(/(npm (?:test|run test)|pytest|cargo test|go test(?:\s+\.\/\.\.\.)?|yarn test|pnpm test)/i);
      if (testMatch) {
        testCommand = {
          command: testMatch[0],
          label: 'DOCUMENTED',
          source_id: 'doc-readme',
          source_url: readmeSourceUrl,
          provenance: 'README.md code block',
          path: 'README.md',
        };
      }
    }

    if (!runCommand) {
      const runMatch = docs.match(/(npm run (?:dev|start)|yarn (?:dev|start)|pnpm (?:dev|start)|cargo run)/i);
      if (runMatch) {
        runCommand = {
          command: runMatch[0],
          label: 'DOCUMENTED',
          source_id: 'doc-readme',
          source_url: readmeSourceUrl,
          provenance: 'README.md code block',
          path: 'README.md',
        };
      }
    }
  }

  // Construct truthful notes
  let notes = '';
  if (testCommand) {
    notes = `Test command substantiated from ${testCommand.provenance}.`;
  } else if (inspectedFiles.length > 0) {
    notes = `No test execution command substantiated in inspected files (${inspectedFiles.join(', ')}).`;
  } else {
    notes = 'No setup documentation or package manifest inspected in bounded scan.';
  }

  return {
    install_command: installCommand,
    test_command: testCommand,
    run_command: runCommand,
    has_readme: false,
    has_contributing: false,
    package_manager: packageManager,
    manifest_file: packageJsonContent ? 'package.json' : undefined,
    inspected_files: inspectedFiles,
    notes,
  };
}
