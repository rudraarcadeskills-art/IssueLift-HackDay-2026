# IssueLift Newcomer Roadmap: Curated First Tasks

*These tasks are derived directly from inspecting the real IssueLift codebase. They represent real, actionable improvements suitable for first-time contributors.*

---

## Task 1: Expand Ecosystem Command Parsers in `src/lib/github.ts`
- **Location:** `src/lib/github.ts` (`extractDocumentedCommands` function)
- **Difficulty:** Good First Issue (Beginner)
- **Description:** Currently, `extractDocumentedCommands` includes regex extractors for `npm`, `yarn`, `pnpm`, `pytest`, `cargo`, and `go`. We want to expand support for additional language ecosystems commonly found in open-source projects:
  - Python: `poetry run pytest`, `uv run test`
  - Java/Kotlin: `./gradlew test`, `mvn test`
  - Ruby: `bundle exec rspec`, `rake test`
  - Elixir: `mix test`
- **Verification:** Run `npm test` to verify parser tests pass without regressions.

---

## Task 2: Add Monorepo Subpackage Test Fixture in `eval/fixtures/`
- **Location:** `eval/fixtures/08-monorepo-subpackage.json`
- **Difficulty:** Intermediate
- **Description:** Large monorepos (e.g. Next.js, Babel, React) place tests inside subpackages such as `packages/compiler/tests/*.test.ts`. Create a deterministic fixture that verifies that IssueLift maps a criterion referencing a subpackage to tests located in that specific subpackage rather than top-level tests.
- **Verification:** Run `npm run eval:proofbench` to confirm the fixture passes offline.

---

## Task 3: Add Keyboard Shortcuts for Scanner Intake & Export
- **Location:** `src/components/IssueInputForm.tsx` & `src/components/ProofBundleExportModal.tsx`
- **Difficulty:** Beginner (Frontend)
- **Description:** Enhance accessibility and developer speed by adding standard keyboard navigation:
  - Press `Ctrl + Enter` (or `Cmd + Enter`) inside the issue URL input to immediately trigger scan.
  - Press `Escape` to close the Proof Bundle Export modal.
  - Ensure focus returns to the primary action button after modal dismissal.
- **Verification:** Test keyboard interactions and confirm focus states meet WCAG AA standards.
