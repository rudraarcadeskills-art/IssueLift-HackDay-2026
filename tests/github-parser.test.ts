import { describe, it, expect } from 'vitest';
import { parseIssueUrl, selectBoundedRelevantFiles, isLikelyTestFile } from '../src/lib/github';

describe('GitHub Intake & Parser Logic', () => {
  it('successfully parses valid public GitHub issue URLs', () => {
    const res = parseIssueUrl('https://github.com/facebook/react/issues/12345');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.owner).toBe('facebook');
      expect(res.data.repo).toBe('react');
      expect(res.data.issueNumber).toBe(12345);
      expect(res.data.canonicalUrl).toBe('https://github.com/facebook/react/issues/12345');
    }
  });

  it('rejects Pull Request URLs with helpful explanatory message', () => {
    const res = parseIssueUrl('https://github.com/vercel/next.js/pull/9999');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Pull Request');
    }
  });

  it('rejects unsupported hosts like gitlab.com', () => {
    const res = parseIssueUrl('https://gitlab.com/owner/project/issues/1');
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('Unsupported host');
    }
  });

  it('rejects malformed URLs and non-integer issue IDs', () => {
    const res1 = parseIssueUrl('not-a-url');
    expect(res1.success).toBe(false);

    const res2 = parseIssueUrl('https://github.com/owner/repo/issues/abc');
    expect(res2.success).toBe(false);
  });

  it('identifies likely test files correctly', () => {
    expect(isLikelyTestFile('src/__tests__/app.test.tsx')).toBe(true);
    expect(isLikelyTestFile('tests/unit/logger.spec.ts')).toBe(true);
    expect(isLikelyTestFile('pkg/handler_test.go')).toBe(true);
    expect(isLikelyTestFile('src/components/Button.tsx')).toBe(false);
  });

  it('selects bounded relevant files favoring manifests and test files', () => {
    const files = [
      'package.json',
      'README.md',
      'src/components/Table.tsx',
      'src/components/Table.test.tsx',
      'node_modules/dep/index.js',
    ];
    const selected = selectBoundedRelevantFiles(files, 'Table component export', ['bug']);
    expect(selected).toContain('package.json');
    expect(selected).toContain('src/components/Table.test.tsx');
    expect(selected).not.toContain('node_modules/dep/index.js');
  });
});
