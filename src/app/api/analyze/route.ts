import { NextRequest, NextResponse } from 'next/server';
import { parseIssueUrl, fetchLiveIssueAndRepo } from '@/lib/github';
import { compileContributionContract } from '@/lib/contract-compiler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a valid GitHub issue URL.' },
        { status: 400 }
      );
    }

    const parsed = parseIssueUrl(url);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { owner, repo, issueNumber } = parsed.data;

    // 1. Fetch live issue and repository evidence
    let intakeResult;
    try {
      intakeResult = await fetchLiveIssueAndRepo(owner, repo, issueNumber);
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || 'Failed to fetch GitHub issue metadata.' },
        { status: err.message?.includes('not found') ? 404 : 502 }
      );
    }

    // 2. Compile Contribution Contract via Gemma and Claim Gate
    const contract = await compileContributionContract(
      intakeResult.metadata,
      intakeResult.sources,
      intakeResult.repositoryFiles,
      intakeResult.setupTruth,
      intakeResult.scanBoundaries
    );

    return NextResponse.json(contract, { status: 200 });
  } catch (error: any) {
    console.error('API /api/analyze error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected internal error occurred.' },
      { status: 500 }
    );
  }
}
