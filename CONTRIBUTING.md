# Contributing to IssueLift

Thank you for your interest in contributing to IssueLift! IssueLift is built to make open-source contributions more verifiable, reliable, and respectful of maintainer time.

## Code of Conduct
All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

### Prerequisites
- **Node.js:** v18.17+ or v20+ (tested on Node.js v24)
- **npm:** v9+ or v10+
- **Git**

### Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/issuelift.git
   cd issuelift
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   *(Optional)* Add your free-tier Google AI Studio API key to `.env.local` to enable live Gemma 4 calls:
   ```bash
   GEMMA_API_KEY=your_key_here
   ```
   *Note: If you do not have an API key, IssueLift still runs 100% of its deterministic workflows, GitHub intake, Claim Gate, TraceMap, and ProofBench evaluation using the baseline compiler.*
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

Before submitting a Pull Request, please run our verification suite:

```bash
# 1. Run unit tests
npm test

# 2. Run deterministic ProofBench evaluation suite (no API key needed)
npm run eval:proofbench

# 3. Verify TypeScript types and production build
npm run build
```

---

## How to Contribute

### 1. Add a ProofBench Fixture (No Machine Learning Required!)
If you find a public issue where IssueLift misclassifies evidence, invents a path, or lacks clear criteria, you can contribute a deterministic counterexample:
1. Create a new JSON file in `eval/fixtures/` (e.g. `eval/fixtures/08-your-case.json`).
2. Follow the schema defined in existing fixtures.
3. Run `npm run eval:proofbench` to ensure it passes.
4. Submit your PR!

### 2. Improve Parser & Setup Truth Extractors
Check `src/lib/github.ts` to add command recognition for new package ecosystems (e.g. Gradle, Mix, Bundler).

### 3. Check our Newcomer Roadmap
See [docs/newcomer-roadmap.md](docs/newcomer-roadmap.md) for pre-scoped first issues.

---

## Pull Request Checklist
- [ ] Code adheres to existing TypeScript and Tailwind styling conventions
- [ ] `npm test` passes with zero failures
- [ ] `npm run eval:proofbench` passes with 100% invariant compliance
- [ ] `npm run build` succeeds without type errors or warnings
- [ ] No secrets or `.env` files are committed
