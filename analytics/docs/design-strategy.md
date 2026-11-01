# Premium analytics UI strategy

The implementation keeps the API and fixture contracts intact and treats their values as deterministic demo data. The visual direction is a dense, editorial FirstLine command center: midnight ink navigation, warm coral and mint data accents, rounded ivory surfaces, concise operational typography, and an intentionally compact mobile composition.

- Establish CSS tokens and reusable shell, panel, metric, badge, chart, and table primitives before page-specific styling.
- Present aggregate sessions/page views as compatible property totals and retain the explicit non-aggregation caveat for users.
- Derive clearly labeled visual distributions from the existing deterministic fixture values; line-chart points are a fixture-only proportional rendering of the selected-period total, not claimed historical provider data.
- Keep reports based on immutable backend snapshots and provide print-safe numeric summaries rather than relying on charts in print.
- Make fixture state, availability, coverage, source, and measurement limits visible at the decision point without technical implementation noise.
- Implement a real responsive navigation drawer with focus-visible controls and explicit dismissal paths, plus compact card/table layouts at small widths.
- Keep Google Search Console landing-page clicks as a separate, explicitly labeled surface from GA4 Popular pages; both use existing provider-specific fixture rows and do not extend the API contract.
