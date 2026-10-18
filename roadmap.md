# Roadmap

## School resource workspace
- [ ] Add signed-in school resource matches using existing organization offers
- [ ] Add read-only resource tracker for current requests and recorded review updates
- [ ] Verify school isolation, navigation, updates and record preservation

## Simplify School Information and submission history
- [x] Remove power questions and their submission dependencies while retaining hidden legacy data
- [x] Show compact, collapsed Previous Submissions scoped to the signed-in school, excluding the active version
- [x] Verified draft save/restore, two real submissions, earlier-only history, refresh, school isolation, desktop/mobile fit and unchanged legacy infrastructure/unrelated schools; 197 tests pass, build clean, no page errors

## Add About Us
- [x] Add editorial About Us page with mission, three steps and honest team placeholders
- [x] Move How CamNexus Works off Home and update main navigation only
- [x] Verified desktop/mobile navigation and direct refresh, generated illustrative image, three steps, preserved homepage map/buttons, Community Needs, simulator availability and unchanged browser data; routing test passes, build clean, no page errors

## Improve Community Needs
- [x] Add live community criticality counts and top-five current resource quantities
- [x] Compact community rows and keep one unverified-needs statement inside the collapsed explanation
- [x] Verified real updated submissions, replacement totals, refresh, collapsed details, desktop/mobile fit and preserved history/unrelated schools; 191 tests pass, build clean, no page errors

## Simplify administrator dashboard
- [x] Replace the administrator workspace with three compact, single-section views and collapsed details
- [x] Read current school requests, proposed demo contributions and chronological history without altering stored records
- [x] Verified real contribution saving and administrator readback, entry/exit, collapsed details, history, desktop screen fit and mobile layout; saved records unchanged, 187 tests pass and build clean

## Sponsor dropdown and popup labels
- [x] Isolate sponsor map layering so the portalled region menu stays above it without changing the homepage
- [x] Resolve Solar Panels through the existing catalogue alias, retaining IDs, other names, quantities and community popup layout
- [x] Verified all ten region options above the map and selectable on desktop/mobile, saved community popups and isolated homepage interactions; Solar Panels factory checked without storage writes; 40 regression tests pass and build clean

## Sponsor map popups and Preferred Location
- [x] Add isolated sponsor-only popups using current submitted requests and quantities
- [x] Restore compact location controls and preserve selection across Review and Back
- [x] 182 tests pass; verified desktop/mobile popups, unchanged homepage interactions, Critical → Low submission updates on both maps, review/back location retention and contribution saving; preview healthy

## Highest-category criticality
- [x] Use the highest category in current submitted needs; preserve resources and history
- [x] Update existing Community Needs and homepage scoring explanations and displays
- [x] 179 tests pass; verified Critical → Low submissions, history, quantities, refresh and both maps with no page errors; administrator and partner workflows unchanged

## One active assessment per school
- [x] Replace active needs on submission and normalize older versions without losing history
- [x] Use only the latest submitted assessment in criticality and shared community projections
- [x] 172 tests pass; verified two school submissions (High → Low), removed needs, history, refresh, both map tooltips and unchanged other schools; preview healthy

## Review screen demo autofill
- [x] Small "Use Demo Information" button above Organization Name fills the demo partner name and email; both stay editable
- [x] Validation, estimated value, Finish Contribution and saved records unchanged; 165 tests pass and the full flow was verified in the browser


## Finish Resource Partner demo contribution
- [x] Add Continue, editable review, validated contact fields and success on the existing partner page
- [x] Append validated contributions to isolated browser-local demo storage without changing existing records
- [x] Test validation/preservation and verify the complete workflow and home navigation; 43 tests passed, desktop/mobile review checked, saved append/readback verified, no browser errors, build clean

## Resource Partner criticality map
- [x] Add compact shared Cameroon map below Preferred Location with saved assessment markers and community selection
- [x] Preserve existing controls and data; verify map updates and partner interactions (23 tests passed; marker selection, saved-assessment readback, CAD estimate and location checked; build clean)

## Synchronize school and sponsor resource cards
- [x] Share seven canonical options, names, icons and two-column card styling
- [x] Preserve legacy IDs, Stationery requests, custom names, history, estimates and location choices
- [x] Test compatibility and verify both selection flows and school submission; 138 tests passed, desktop/mobile checked

## Simplified school resource cards
- [x] Replace detailed resource/evidence/review sections with catalogue-based multi-select quantity cards and optional overall explanation
- [x] Preserve School Information, drafts, records, history and other pages; safely validate without invented priority values
- [x] Test multi-selection, Other, deselection, submission and refresh readback; 133 tests passed and desktop/mobile flow verified

## Resource Partner resource preferences
- [x] Requested-resource cards, custom Other and quantities; one illustrative CAD estimate list
- [x] Preserve location choices and all stored school/organization history; no submissions or matching
- [x] Test selection totals, source filtering and page interactions; 125 tests passed and desktop/mobile flow verified

## Combined School Information
- [x] Combine assessment sections 1–2 with registry name/town, students, Yes/No reliable electricity and optional solar request
- [x] Preserve registry location, legacy infrastructure and history; validate missing data safely without zero assumptions
- [x] Verify drafts, submission and scoring; keep resource requests and other pages unchanged

## Simplified Resource Partner page (done)
- [x] "Become a Resource Partner" on the homepage still leads to /partners, now titled "Find a School to Support"
- [x] Single compact preference card: Budget (CAD, $5,000 placeholder) + Preferred Location ("Anywhere in Cameroon" default / "Specific Region" reveals a region dropdown); no submission button
- [x] Old sponsor login, registration and resource-offering pages removed; matching, auth and payments intentionally not built yet
- [x] All stored organization records, offers and history preserved; school assessment, administrator, dashboard and simulator untouched



## Simplified school assessment form (done)
- [x] "Number of Teachers" and "Usable Classrooms" removed from the needs assessment; "Students" stays required
- [x] Draft and infrastructure validation no longer require the removed fields; drafts saved with them still restore
- [x] Priority scoring untouched: missing counts are excluded and re-scaled, never counted as zero or as the worst case
- [x] Existing submissions, history snapshots and administrator review keep earlier teacher/classroom values; 111 tests pass

## Compact administrator dashboard
- [x] Overview and five single-section navigation views
- [x] Compact school and organization lists with focused collapsible reviews
- [x] Compact matching filters, explanations and empty state; calculations unchanged
- [x] Unified activity history from existing stored events
- [x] Verified review safeguards, saved review readback, filters, allocation comparisons, public pages and desktop/mobile navigation; 108 tests passed and build clean

## Standardize demo school names
- [x] Rename five schools by stable ID; simplify selector and administrator labels; retain demo disclosure
- [x] Verified saved assessment preservation, all five assigned-school sign-ins, community labels and planning/admin views; 98 tests passed

## Final school assessment refinement (done)
- [x] Collapsible resource-request cards with compact summary, Incomplete indicator, auto-expand for new/incomplete
- [x] Category-specific labels (teacher training, construction scope + affected count, connectivity limitations)
- [x] Prominent "Mark as Highest Priority Need" with card indicator; required at submit, not for drafts
- [x] Legacy migration: urgency left unrecorded (no auto-Medium), missing values highlighted, never treated as zero
- [x] Per-request verification retention: unchanged verified requests keep status; material changes return to Pending Review with reassessment note; removed requests persist in history snapshots
- [x] Submission history actions: View Current Assessment / Update Assessment / View Submission History
- [x] Drafts: per-registry-ID storage, unsaved-changes beforeunload warning, device-specific storage note
- [x] Single concise demo notice + collapsible "About This Demo" (the separate demo-credential panel was later dropped; "Use Demo Account" covers it)
- [x] Review & Submit summary with Edit actions, scroll-to-error, funding disclaimer, confirmation with reference/date/status
- [x] Shared scoreSchool unchanged; simulator keeps "additional planning required" fallback
- [x] Tests: 52 passing incl. scenarios C (unchanged verified retained) and D (material change → pending)

## Searchable school selection (done)
- [x] One searchable dropdown replaces the separate "Search schools" input and the "Registered school" select
- [x] Case-insensitive partial match on school name, community, region and registration ID; each result shows name, community and region
- [x] "No registered schools found." empty state; "Continue to School Login" stays disabled until a school is picked
- [x] Login, needs assessment and verification workflow untouched; five fictional schools and registration IDs preserved
- [x] Tests: 59 passing; browser-checked typed searches for Kousseri, Mbalmayo, Centre and a no-match term

## Simplified school login (done)
- [x] "Hackathon Demo Access" expandable section removed from the login step
- [x] School name, email/account ID, password, Sign In, Use Demo Account and Back all kept
- [x] "Use Demo Account" signs straight in to the selected school's fictional account with no typing
- [x] School-specific access restriction, manual sign-in, Back and drafts unchanged

## Dropdown chevron on the school field (done)
- [x] Chevron icon inside the right edge of the searchable school field; flips to point up while the list is open
- [x] Search, filtering, selection and login flow untouched

## "How CamNexus Works" back at the bottom (done)
- [x] Six-step section moved below the Community Needs Map so page order is hero → involvement → stats → map → how-it-works
- [x] Section markup, wording and styling unchanged; no other page touched

## Resource Partner workflow (done)
- /partners landing (Sign In / Register Organization) + matches; nav item removed
- /partners/login (searchable org dropdown, Use Demo Account), /partners/register (Pending Verification), /partners/dashboard (collapsible offers, drafts, submit, history)
- Shared catalogue src/lib/catalog.ts (stable IDs); admin org+offer review in assessment-management; 71 tests pass

## Resource Partner refinement (done)
- One searchable org combobox on login; 2-step registration + review; RegionMultiSelect chips w/ Nationwide
- Compact offer cards; available = total - reserved - delivered (>=0); requires-repair flagged
- Matches moved off public landing into admin "Resource Matching & Allocation" (Eligible vs Requires Further Verification; school verification required)
- 74 tests pass; build OK

## Intelligent Resource Matching (done)
- src/lib/matching.ts: rule-based engine (4 categories, 5-factor rank, qty caps, Priority First vs Balanced comparison, community aggregation)
- Admin: IntelligentMatching component w/ tabs, filters, Why This Match / Before Deployment; map panel shows aggregated matches + View Potential Matches
- Sample schools gained concrete resource requests; 92 tests pass

## Category-grouped resource cards (done)
- [x] Seven shared expandable category cards (Building & Safety, Water & Sanitation, Electricity, Classroom Furniture, Learning Materials, Technology, Other) on both the School Needs Request and Become a Resource Partner pages
- [x] New Water and sanitation catalogue category (Toilets, Water Fountains, Water Tanks); all other resources reuse existing IDs; compact requests use quantities for repairs (no scope text)
- [x] Partner estimates updated: repairs/toilets/custom show "Estimate unavailable"; 140 tests pass; school submission verified end to end
- [x] Criticality scoring (0-16 by category group) + Community Needs map/list/dashboard presentation, collapsible explainer

## Homepage statistics removed (done)
- [x] Deleted the four statistic cards (Communities assessed, High & critical-priority communities, Schools assessed, Students represented in assessments) and their explanatory line from src/routes/index.tsx; hero, both involvement cards with buttons, and the Cameroon map untouched; no content moved to About Us; 191 tests pass, build OK, verified in browser

## About Us hero caption removed (done)
- [x] Deleted the visible "AI-generated classroom illustration · not a participating school." line from the About Us hero; classroom photo, dark green overlay, heading and description unchanged; the image alt text still states it is illustrative and not a participating school; build OK, verified in browser

## Demo banner removed, footer sentence added (done)
- [x] Deleted the yellow "Demo Environment" strip from src/components/Shell.tsx so main content sits directly under the header on every page; footer keeps the PS43 hackathon acknowledgment and now carries one added sentence: "CamNexus is a prototype using illustrative data. No real donations are processed."; no duplicate disclaimer added anywhere
