# IssueLift 3–4 Minute Live Hackathon Demonstration Script

*A practical, judge-friendly walkthrough for the Hacktoberfest Hack Day (October 30, 2026).*<br>
*Track: Google Gemma 4 Open Weights Track*<br>
*Total Target Duration: ~3 minutes 30 seconds (180–240 seconds window)*

---

## 1. Demo Parameters & Setup Checklist

- **Live Application URL:** [https://issue-lift.vercel.app/](https://issue-lift.vercel.app/)
- **Local Fallback URL:** `http://localhost:3000`
- **Public GitHub Repository:** [https://github.com/rudraarcadeskills-art/IssueLift-HackDay-2026](https://github.com/rudraarcadeskills-art/IssueLift-HackDay-2026)
- **Primary Verified Demo Issue:** `https://github.com/facebook/react/issues/1000` (available via the built-in 1-click sample button)
- **Secondary Code-Centric Issue:** `https://github.com/microsoft/TypeScript/issues/63380` (nested function-call inference regression)
- **Offline Backup Assets (Genuine UI Captures):**
  - Hero & Intake: [`docs/screenshots/01-landing-hero.jpg`](../docs/screenshots/01-landing-hero.jpg)
  - Contract & TraceMap: [`docs/screenshots/02-tracemap-results.jpg`](../docs/screenshots/02-tracemap-results.jpg)
  - ProofBench Console: [`docs/screenshots/03-proofbench-suite.jpg`](../docs/screenshots/03-proofbench-suite.jpg)
- **Test Baseline:** 78 unit tests (`npm test` in `tests/`) + 7 deterministic evaluation fixtures (`npm run eval:proofbench` in `eval/fixtures/`).

### Presenter Pre-Flight Checklist
- [ ] Open [https://issue-lift.vercel.app/](https://issue-lift.vercel.app/) (or `http://localhost:3000` if offline) in a clean browser tab.
- [ ] Ensure browser zoom is 100% and dark/midnight theme is selected.
- [ ] Verify header status badge displays **Gemma 4 Live** (or **Deterministic Baseline** if API key is omitted).
- [ ] Open a second tab to `/proofbench` to demonstrate guardrails without waiting.
- [ ] Have terminal ready with `npm test` and `npm run eval:proofbench` for technical QA.

---

## 2. Act-by-Act Walkthrough (3:30 Total)

```
00:00 ─── 00:45 │ ACT 1: The Pre-Implementation Alignment Gap
00:45 ─── 01:30 │ ACT 2: Issue Intake, Manifests & Bounded Tree Indexing
01:30 ─── 02:15 │ ACT 3: Contribution Contract & Gemma 4's Actual Role
02:15 ─── 03:00 │ ACT 4: TraceMap, Claim Gate & Honest Uncertainty
03:00 ─── 03:30 │ ACT 5: Proof Bundle, ProofBench & Open Innovation
```

---

### ACT 1: The Pre-Implementation Alignment Gap (00:00 – 00:45 | 45s)

| Time | On-Screen Action | Presenter Narration |
| :--- | :--- | :--- |
| **00:00** | Start on the homepage at `https://issue-lift.vercel.app/`. Hover cursor over the hero headline and status badges. | *"Every Hacktoberfest, enthusiastic contributors find an open issue, spend days writing code, and excitedly submit a pull request—only to get rejected or ignored.*<br><br>*Why? Because their definition of 'done' differed from maintainer intent, or because they never verified how the project tests that requirement.* |
| **00:25** | Point to the search bar and the three quick-sample buttons (`React #1000`, `Next.js #50000`, `TypeScript #45000`). | *Maintainers end up drowning in speculative PRs and generic comments like 'Can I work on this?'.*<br><br>*IssueLift solves this by starting **before** anyone edits code. You paste any public GitHub issue URL, and IssueLift extracts an evidence-backed Contribution Contract, maps criteria to real test files, and drafts a copy-ready question."* |

---

### ACT 2: Issue Intake, Manifests & Bounded Tree Indexing (00:45 – 01:30 | 45s)

| Time | On-Screen Action | Presenter Narration |
| :--- | :--- | :--- |
| **00:45** | Click the **"React #1000 (Milestone)"** quick sample chip (or paste `https://github.com/facebook/react/issues/1000`). Click **"Scan Issue"**. | *"Let's analyze a real public GitHub issue: React #1000. When I click 'Scan Issue', notice the animated four-stage verification pipeline:*<br><br>*1. **Intake Validation**: It checks the URL, blocks Pull Request links, and confirms public repository availability.* |
| **01:10** | Watch the progress bar advance through *Inspecting Repo* and *Gemma 4 Reasoning*. | *2. **Bounded Tree Indexing**: IssueLift fetches the repository tree within bounded API limits—here inspecting over 7,200 tree entries safely.*<br><br>*3. **Manifest Ledger**: It extracts verified build and test commands directly from `package.json` and lockfiles with exact file provenance citations. Notice: zero untrusted repository code is ever executed on our server."* |

---

### ACT 3: The Contribution Contract & Gemma 4's Role (01:30 – 02:15 | 45s)

| Time | On-Screen Action | Presenter Narration |
| :--- | :--- | :--- |
| **01:30** | Scroll to the **Setup Truth Ledger** card, then to the **Contribution Contract Card**. Point out the **Readiness Gate** badge (`CLARIFY FIRST`). | *"Here is the compiled Contribution Contract. Notice our Readiness Gate immediately flags this as **CLARIFY FIRST** because the issue is historically closed and involves ambiguous milestone discussion rather than a direct reproducible bug.*<br><br>*Look at the requirement rows: explicit requirements retain verbatim issue quotes linking directly back to GitHub.* |
| **01:55** | Highlight the `AI-PROPOSED` / `AI-INFERRED` badge on proposed criteria. | *Now, what is Google Gemma 4's actual role?*<br><br>*Server-side Gemma 4 (`gemma-4-26b-a4b-it` via official `@google/genai`) deconstructs ambiguous discussions into discrete acceptance criteria (`AC-01`, `AC-02`). Any proposed requirement is quarantined with an `AI-INFERRED` badge—it never masquerades as maintainer-approved.*<br><br>*And if the Gemma API key is ever absent or exhausted, IssueLift gracefully defaults to an internal deterministic baseline compiler. Zero crashes, zero dummy screens."* |

---

### ACT 4: TraceMap, Claim Gate & Honest Uncertainty (02:15 – 03:00 | 45s)

| Time | On-Screen Action | Presenter Narration |
| :--- | :--- | :--- |
| **02:15** | Scroll down to the **Acceptance-to-Test TraceMap** and **Test Gap Radar**. Expand a criterion row to reveal the 4-node evidence chain. | *"This is our signature feature: the Acceptance-to-Test TraceMap. Every criterion is mapped through a 4-node evidence chain:*<br><br>`Criterion → Candidate Source File → Candidate Test File → Documented Test Command`*.*<br><br>*Solid links indicate verified-existence files in the repository tree; dashed links indicate inferred relevance.* |
| **02:40** | Point out the **Claim Gate Audit Ledger** (0 hallucinated paths) and the **Test Gap Radar** card. | *Crucially: **how does IssueLift handle uncertainty?**<br><br>*Our deterministic Claim Gate verifies every candidate path against the fetched repository tree. Hallucinated paths are rejected and demoted to `UNKNOWN`.*<br><br>*Because scans are bounded by API limits, IssueLift **never** falsely claims 'no tests exist in the repository' or invents fake 0% coverage numbers. When candidate relevance cannot be definitively proven from scanned files, it honestly reports `SCAN INCOMPLETE / UNKNOWN` or `NO TEST EVIDENCE FOUND IN SCANNED FILES`, and suggests a manual reproduction scenario.* |
| **02:55** | Scroll to the **Maintainer Handoff Card**. Click "Edit Draft" and "Copy Full Comment". | *And before a contributor touches code, we draft a concise, respectful question citing the exact ambiguity for maintainer approval. It never auto-posts—human review is mandatory."* |

---

### ACT 5: Proof Bundle, ProofBench & Open Innovation Closing (03:00 – 03:30+ | 30s)

| Time | On-Screen Action | Presenter Narration |
| :--- | :--- | :--- |
| **03:00** | Click **"Download Proof Bundle"**. Show the structured Markdown export modal. | *"Contributors can export a verifiable Markdown or JSON Proof Bundle representing their pre-edit contract.* |
| **03:12** | Click **"ProofBench"** in the top navigation bar to display `/proofbench`. Point to the 7 passed fixtures. | *Finally, under `/proofbench`, we provide 7 offline, deterministic evaluation fixtures validating path verification, injection defense, and bounded scan honesty.*<br><br>*These 7 fixtures are distinct from our 78 Vitest unit tests in `tests/`—they allow any open-source contributor to submit an adversarial edge case without touching ML weights or training infrastructure.* |
| **03:25** | Return to the top of the page. Highlight live links. | *IssueLift turns open issues into proven contracts before anyone edits code. Open innovation means our reliability rules are open to everyone to inspect and extend. Thank you!"* |

---

## 3. Presenter Contingency & Fallback Protocol

If network disruptions, GitHub API rate limits, or AI provider latency occur during the live presentation, follow these verified fallback paths:

### Scenario A: GitHub API Rate Limit or Network Hiccup During Scan
- **Immediate Action:** Do not wait or retry repeatedly.
- **Presenter Narration:** *"The public unauthenticated GitHub REST API has a strict 60 req/hr rate limit. Let's switch to our verified cached intake capture from this morning."*
- **Visual Action:** Open [`docs/screenshots/01-landing-hero.jpg`](../docs/screenshots/01-landing-hero.jpg) and [`docs/screenshots/02-tracemap-results.jpg`](../docs/screenshots/02-tracemap-results.jpg) in the browser. Walk through the identical 4-node TraceMap, Claim Gate rejection metrics, and Maintainer Handoff card shown in the capture.

### Scenario B: Gemma 4 API Key Limit or Cold Start
- **Immediate Action:** The application handles this automatically. Notice the status badge switches to **Deterministic Baseline**.
- **Presenter Narration:** *"Notice our two-tier reliability architecture: when Gemma 4 is unreachable or keys are omitted, IssueLift automatically activates its offline deterministic baseline compiler (`src/lib/contract-compiler.ts`). The contract, test ranking, and Claim Gate continue working without disruption."*

### Scenario C: Complete Offline Emergency (No Internet in Venue)
- **Immediate Action:** Run local ProofBench from the terminal:
  ```bash
  npm run eval:proofbench
  ```
- **Presenter Narration:** *"Because IssueLift is built with deterministic guardrails, our evaluation suite runs 100% offline. In 2 seconds, all 7 fixtures pass against `eval/fixtures/`, proving prompt injection defense, hallucination rejection, and honest bounded scan reporting."*

---

## 4. Key Takeaways for Judges

1. **Pre-Implementation Focus:** Solves the alignment gap *before* code is written, saving maintainers from unsolicited PRs and newcomers from wasted effort.
2. **Two-Tier Architecture:** Server-side Google Gemma 4 (`gemma-4-26b-a4b-it`) proposes semantic contracts; a deterministic TypeScript Claim Gate verifies every candidate path against the real repository tree.
3. **Honest Uncertainty:** Bounded context is disclosed openly. IssueLift never claims "no tests exist" or invents synthetic coverage numbers.
4. **Verifiable Quality:** 78 passing unit tests across 4 test suites + 7/7 passing ProofBench guardrail fixtures (100% deterministic compliance).
5. **Zero-Budget Invariant:** Free-tier unauthenticated GitHub API + Google AI Studio free tier + zero server-side code execution.
