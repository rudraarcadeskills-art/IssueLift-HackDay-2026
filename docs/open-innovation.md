# Why Open Innovation Matters: The IssueLift Playbook

## 1. The Core Philosophy

> *"IssueLift turns an open issue into a reviewable Contribution Contract and evidence-to-test map before coding begins. The deterministic Claim Gate can be inspected and improved; the public ProofBench lets contributors add counterexamples whenever a path, citation, requirement or test-evidence label is wrong. This makes reliability rules—not only UI code—open to community inspection and extension. We claim no impact numbers until measured."*

In modern open source, AI coding tools have often exacerbated maintainer burnout: automated agents generate thousands of speculative pull requests with high superficial confidence but zero alignment with maintainer intent or existing test architectures.

**Open innovation must mean higher signal, not higher noise.**

IssueLift rethinks the contribution loop by giving newcomers and maintainers an **open, inspectable, and reproducible contract engine** before any code changes are committed.

---

## 2. Inspectable Reliability vs. Opaque AI

Traditional AI developer assistants treat intelligence as a proprietary black box:
- You paste a prompt into a chat window.
- The model outputs a suggested file or code snippet.
- If the path is hallucinated or the test is missing, there is no mechanism to catch the error or inspect why the claim was made.

IssueLift decouples **reasoning** from **verification**:
1. **Gemma 4 proposes** candidate criteria, semantic relevance, and maintainer clarification questions.
2. **Deterministic code verifies** that paths exist in the fetched tree, that quotes match issue text verbatim, and that test commands come from real documentation.
3. **The ProofBench suite** exposes these verification rules as plain JSON fixtures in `eval/fixtures/`.

Any contributor can inspect the Claim Gate code in `src/lib/claim-gate.ts`, identify where a false claim could slip through, and propose an invariant test.

---

## 3. How Newcomers Contribute Without Touching Model Weights

Open-weight models like Google Gemma 4 provide accessible reasoning for everyone. But you don't need machine learning expertise or GPU clusters to contribute to IssueLift:

### Way 1: Add a ProofBench Counterexample Fixture
Found a public issue where candidate test files were misclassified or an edge case wasn't recognized? Add a new fixture file to `eval/fixtures/`:
- Create `eval/fixtures/08-your-case.json`
- Define the input issue metadata and repository tree
- Specify the expected guardrail outcome (e.g. `verdict: "CLARIFY FIRST"`)
- Run `npm run eval:proofbench` locally with zero API key required
- Send a Pull Request!

### Way 2: Improve Setup Command Extraction Patterns
In `src/lib/github.ts`, regex patterns extract documented setup and test commands from `README.md` and `CONTRIBUTING.md`. Contributors can add recognition for new package ecosystems (e.g., Elixir `mix test`, Zig `zig build test`, Gradle, or Swift).

### Way 3: Enhance Test Gap Scenarios
Improve the manual verification suggestions generated when automated tests are absent in scanned files, helping newcomers write their very first unit tests.
