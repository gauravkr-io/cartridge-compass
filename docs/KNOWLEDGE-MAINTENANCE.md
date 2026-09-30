# Knowledge maintenance

## What belongs in the knowledge base

Apply one filter: **what does an agent need to know that it cannot reliably infer from the project or look up with official tooling?**

| Include | Exclude |
|---|---|
| Resolution rules, execution order, cross-architecture behavior | Script API signatures (`b2c docs read`) |
| Signatures that identify an architecture | XML schemas (`b2c docs schema`) |
| Deprecations and platform changes that affect code | Copies of official guides |
| Tool behavior that affects safety | Anything project-specific |
| Discrepancies between sources | Interesting but unused trivia |
| Open questions | Guesses written to fill a gap |

## Rules for every change

1. Every fact carries a label and a source ID: `[FACT S08]`. Add new sources to `knowledge/sources.md` first.
2. Prefer official Salesforce documentation (`S`), then official repositories and bundled data (`R`). Community sources (`X`) can support, never establish, a fact.
3. Update the file's `last_verified` date when you re-check it.
4. When a source changes its answer, move the old statement to `maintenance/discrepancies.md` with both versions and a date. Do not silently overwrite.
5. When you cannot establish something, add it to `maintenance/open-questions.md` with why it matters and what would resolve it.
6. Keep project facts out. They belong in a project's `docs/ai/`.
7. Run `npm run validate`. It checks links, source IDs and frontmatter.

## Periodic review

No scraper is used. Salesforce pages change layout often, and a scraper that silently fails is worse than a manual check.

B2C Commerce ships a major release roughly every four to five weeks `[FACT S15]`, and the B2C Developer Tooling and Claude Code release even more often. The kit does not follow that pace. It publishes in fixed **release windows**, reviewing everything that changed since the previous window in one pass.

| Window | Status | Work |
|---|---|---|
| March and September | Always | Read the release notes of every B2C Commerce release since the last window, the B2C Developer Tooling releases and the Claude Code changelog. Re-verify every `[FACT]` older than six months (`npm run validate` lists them) and confirm source URLs still resolve. Review open questions and the roadmap. Rerun the evaluation tasks. Publish a release |
| June and December | Optional | Publish only if fixes or features have accumulated. Same review, without the full re-verification |
| Any time | Only when urgent | A security issue in the kit, a breaking change in the B2C CLI or MCP server that affects kit commands or permission rules, a Claude Code change to permissions or plugins, or a deprecation that makes kit guidance wrong. Publish a patch release for that item alone |

Between windows, nothing needs to be checked by hand. Keep a running list of findings (for example as GitHub issues labeled `next-window`) and let notifications surface urgent items:

- GitHub: Watch, then Custom, then Releases on `SalesforceCommerceCloud/b2c-developer-tooling`.
- Salesforce: the B2C Commerce release notes and Trust notifications your organization already receives.
- An agent mistake traced to the kit: record it as a `next-window` issue, or treat it as urgent if it risks unsafe actions.

Useful offline checks: the B2C CLI bundles the Script API, XSDs and an index of official guides. `b2c docs search "<topic>"` and `b2c docs read <Class>` confirm many facts without a browser.

## Source registry fields

| Field | Meaning |
|---|---|
| ID | `S` official docs, `R` official repository or bundled data, `C` Claude Code docs, `X` secondary, `E` experiment |
| Title and URL | Where to re-check |
| Establishes | Which facts depend on it |
| Applies to | Architectures or versions |
| Access | Full page, search excerpt, or repository commit |
| Last verified | Date |
