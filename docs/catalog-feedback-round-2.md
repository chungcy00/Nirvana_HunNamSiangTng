# Confirmed catalog feedback — 2026-10-23

Scope: category overflow hint and loading/error feedback only. Existing photos, placeholders, card styling, fonts, colors, filtering, sorting and navigation rules remain unchanged. Funeral services remain photo-free. No database or product changes.

- When the category strip overflows, an existing-color text hint explains horizontal swiping. Direction arrows reflect available content before/after the viewport. The hint disappears when all categories fit. Scroll/resize measurement and cleanup use native browser APIs. Selected categories retain the existing scroll-into-view behavior and keyboard access.
- Loading shows a small spinner, heading and explanatory text. The spinner stops with reduced motion enabled.
- Failure shows a distinct heading, network guidance and the existing retry action. Errors are announced; loading is marked busy. Transport errors never render the empty-category action or a misleading zero-product count.
- Ready states retain the accepted empty-category/contact behavior and filtered-result reset behavior.

Validation: 77 frontend tests, type checking and production build passed. Browser checks covered desktop loading and 390px-frame mobile error/hint states. Desktop categories fit without a hint; mobile scroll width was 636px versus 375px visible. Keyboard navigation selected the final category and kept it fully visible without document overflow. In an isolated test fixture, retry changed error → loading → ready with three category products; no production data was created or published. Screenshot error/loading states are controlled local UI examples, not evidence of a live outage. The public API, Auth and database policies were not changed.
