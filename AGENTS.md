<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- School access is an explicitly fictional, client-only simulation with in-memory sessions and fixed registry assignments; it does not claim production security or require hosted authentication.
- Enforce demo school assignments and administrator review in shared assessment mutation helpers so every ordinary submission preserves registry identity and cannot duplicate records.
- Preserve the existing browser storage keys and persist assessment history with school records; submissions and reviews must retain earlier snapshots.
- Resolve active assessment versions in the shared browser-safe assessment projection and normalize duplicate school rows at storage/submission boundaries, so only the latest submission supplies needs while earlier records remain history.
- Keep the store context in a dedicated non-component module and preserve its identity through hot updates so existing providers and refreshed consumers remain connected without resetting data.
- Keep resource taxonomy, lossless legacy migration and submission validation in a browser-safe shared request module so forms, review mutations and planning tools agree without hosted services.
- Compact assessment cards project canonical catalogue entries and retain extra saved requests; explicit compact-format validation omits uncollected per-request details without weakening legacy detailed assessment validation.
- Store unfinished assessments separately from submitted school records; restoring drafts must never change priority, map data or review history before submission.
- Use the shared school-information projection to preserve hidden legacy infrastructure and store binary electricity/solar preferences separately from resource requests; binary power answers must not invent outage severity or quantities.
- The school-form-only projection preserves removed power answers and filters read-only previous submission snapshots by signed-in school and active timestamp; keep shared administrator history and scoring unchanged.
- School and partner selection views share an ordered canonical catalogue projection and one ResourceSelectionCard component; presentation aliases keep stored IDs/names intact and legacy school requests stay separately editable.
- Resource Partner preferences use shared catalogue IDs and a separate illustrative price list without store mutations, so selection never changes school/organization records or allocation calculations.
- Demo partner contributions use a separately validated, append-only browser-local journal; keep it isolated from organization accounts, offers and allocation logic so finishing a contribution cannot trigger distribution or change existing records.
- Resource Partner and homepage maps reuse CommunityMap and buildCommunities from the school store; optional compact sizing preserves homepage presentation and keeps assessment projections consistent without allocation side effects.
- Sponsor marker details are opt-in through a page-specific popup factory using safe DOM text and shared active-request projections; the default shared map path has no sponsor interactions.
- Keep criticality as a read-only shared projection with one score-to-level mapping reused by calculations and explanations, so maps and Community Needs stay consistent without altering assessments or administrator planning logic.
- Keep Community Needs summaries in a read-only browser-safe page projection using shared communities and active requests; aggregate recorded quantities by catalogue identity without changing storage, maps or scoring.
- Keep the informational About Us content in its own public route with no store dependencies; the shared Shell owns main navigation so every page stays consistent without removing tool routes.
- Canonical demo school display names are resolved by stable school ID in shared normalization so legacy saved records and registry-derived views agree without modifying historical snapshots or assessment data.
- Administrator navigation selects one compact read-only view in the existing management route; admin-dashboard projects current submitted requests, validates the isolated contribution journal without writes, and combines timestamped submissions for history while keeping legacy review/matching helpers intact.
- Gate the administrator page with AdministratorAccess before mounting dashboard projections; reuse the in-memory demo session and clear it on logout so direct visits and refreshes show login without changing browser-local records.
- School resource pages use a shared read-only session-scoped projection of active submitted requests and existing organization recommendations; keep contribution journals isolated and never infer school allocations or deliveries from offers.
