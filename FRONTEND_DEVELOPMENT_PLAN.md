# FRONTEND_DEVELOPMENT_PLAN

Version: `1.0`  
Date: `2026-03-15`  
Scope: `Competitive Funnel Intelligence SaaS`  
Audience: `Frontend Engineers, Product Designers, Product Managers, Engineering Managers`

---

## 1. Product UX Analysis

### 1.1 Primary User Personas

1. `Head of Growth (In-house)`
- Goal: detect competitor strategic moves early and convert insights into experiments.
- Behavior: checks dashboard daily, needs high-signal alerts and concise executive summaries.
- Pain points: fragmented tooling, too much noisy data, low trust in scraped signals.

2. `Performance Marketing Manager`
- Goal: monitor ad/funnel creative trends and quickly adapt campaigns.
- Behavior: compares ads, landing pages, hooks, offers, and email copy.
- Pain points: manual monitoring is slow; no source-of-truth timeline across channels.

3. `Agency Analyst / Strategist`
- Goal: monitor many competitors across many client accounts.
- Behavior: multi-workspace usage, heavy report export, frequent client-facing summaries.
- Pain points: repetitive analysis workflows, difficult to standardize deliverables.

4. `Revenue Operations / Product Marketing`
- Goal: identify pricing and packaging changes, upsell/downsell patterns, and stack shifts.
- Behavior: weekly review cadence, deep-dive sessions before planning cycles.
- Pain points: no connected view of pricing, funnel architecture, and campaign cadence.

### 1.2 UX Success Criteria

- User can add first competitor and see first meaningful insight in under `15 minutes`.
- Core workflows should require fewer than `5 clicks` from dashboard entry point.
- Every major insight must be traceable to evidence (URL, timestamp, snapshot source).
- Data-heavy screens remain readable without overwhelming cognitive load.

### 1.3 Main User Workflows

#### Workflow A: Add Competitor
1. User opens `Competitors` section.
2. Clicks `Add Competitor`.
3. Inputs domain + social profile URLs.
4. Chooses monitoring cadence and priority profile.
5. Saves target and sees ingestion progress.
6. Receives first crawl status and initial funnel map.

#### Workflow B: Analyze Funnel
1. User opens competitor detail page.
2. Lands on `Funnel Overview` tab with reconstructed flow graph.
3. Switches between graph, timeline, and evidence panels.
4. Inspects node details (stage type, confidence, linked assets).
5. Opens associated pages/emails/ads.
6. Pins observations and creates action items.

#### Workflow C: Monitor Changes
1. User opens `Monitoring` feed.
2. Filters by severity, competitor, change type, date window.
3. Reviews diffs (before/after copy, pricing, structural changes).
4. Marks alert as reviewed or escalates to team channel.
5. Optionally triggers report generation.

#### Workflow D: Analyze Ads
1. User opens competitor `Ads` tab.
2. Sorts by recency, platform, CTA patterns, hook clusters.
3. Opens ad detail with landing association and funnel node context.
4. Compares competitor ad patterns against cohort benchmark.

#### Workflow E: Review Email Sequences
1. User opens competitor `Email` tab.
2. Sees sequence timeline and cadence.
3. Opens each email with extracted CTA/offer metadata.
4. Compares sequence structure vs funnel stage transitions.

#### Workflow F: Generate Intelligence Report
1. User selects competitor or cohort.
2. Chooses date range and report template.
3. Reviews generated brief and recommended actions.
4. Exports PDF/link and shares with stakeholders.

---

## 2. Application Structure

### 2.1 High-Level Information Architecture

- `Dashboard`: global health, top alerts, trending competitors, quick actions.
- `Competitors`: portfolio management and onboarding of monitored targets.
- `Funnels`: funnel graph, stage timeline, node evidence, confidence views.
- `Ads`: ad creative intelligence with linked funnel entry points.
- `Emails`: captured email timeline, sequence analysis, CTA extraction.
- `Technologies`: detected stack and tracking scripts by competitor/time.
- `Monitoring`: unified change feed across pages/offers/ads/emails/stack.
- `Reports`: report builder, generated reports, export/share center.
- `Settings`: workspace config, alert rules, users/roles, preferences, API keys.

### 2.2 Global UI Shell

- Left navigation rail (section-based, persistent context).
- Top workspace bar (search, filters, date range, notifications, user menu).
- Main content area with flexible layouts.
- Right contextual drawer (optional) for evidence, notes, and quick compare.

### 2.3 Product Navigation Principles

- Navigation prioritizes analytical tasks, not entities only.
- Every section supports cross-links into competitor detail context.
- Breadcrumb + context chips preserve location in deep analytical flows.

---

## 3. Page and Route Architecture

### 3.1 Core Route Map

- `/login`
- `/dashboard`
- `/competitors`
- `/competitors/new`
- `/competitors/:competitorId`
- `/competitors/:competitorId/overview`
- `/competitors/:competitorId/funnels`
- `/competitors/:competitorId/funnels/:funnelVersionId`
- `/competitors/:competitorId/pages`
- `/competitors/:competitorId/ads`
- `/competitors/:competitorId/emails`
- `/competitors/:competitorId/technologies`
- `/competitors/:competitorId/monitoring`
- `/monitoring`
- `/alerts`
- `/reports`
- `/reports/new`
- `/reports/:reportId`
- `/settings/profile`
- `/settings/workspace`
- `/settings/alerts`
- `/settings/integrations`
- `/settings/team`

### 3.2 Page Responsibilities

- `/dashboard`: KPIs, recent high-priority changes, onboarding checklist, quick actions.
- `/competitors`: searchable portfolio, statuses, last sync, data quality indicators.
- `/competitors/:id/overview`: summary cards and intelligence snapshot.
- `/funnels*`: interactive graph, stage timeline, diff between versions, confidence overlays.
- `/ads`: creative library with funnel linkage and filters.
- `/emails`: sequence timeline and per-message detail.
- `/technologies`: stack matrix over time + script-level evidence.
- `/monitoring` and `/alerts`: triage interface for operational review.
- `/reports*`: report generation, review, and distribution.
- `/settings*`: admin controls and notification policy management.

---

## 4. Funnel Visualization UX

### 4.1 Visualization Model

Use a multi-view system:
- `Graph View` (primary): node-based flow diagram (stage transitions).
- `Timeline View`: chronological event view of funnel evolution.
- `Stage Table View`: high-density tabular node/edge data.
- `Diff View`: compare two funnel versions with additions/removals/changed nodes.

### 4.2 Recommended Interaction Pattern

- Click node -> opens detail side panel with evidence:
  - source URLs
  - snapshots
  - linked ads/emails
  - confidence score
- Hover edge -> show transition metadata and inferred path confidence.
- Toggle overlays:
  - confidence heat
  - change highlights
  - channel-origin markers (ad/email/web)

### 4.3 UX Rules for Readability

- Default to a simplified graph (group repeated patterns).
- Allow drill-down to full technical path.
- Keep labels concise; long text in side panel.
- Use color + icon + text for stage type (not color alone).

---

## 5. Component Architecture

### 5.1 Layout Components

- `AppShell`
- `SidebarNav`
- `TopBar`
- `PageHeader`
- `ContextPanel`
- `FilterBar`

### 5.2 Core UI Components

- `Button`, `IconButton`, `Badge`, `Tag`, `Avatar`
- `Input`, `Select`, `DateRangePicker`, `SearchInput`
- `Tabs`, `Accordion`, `Popover`, `Dropdown`, `Tooltip`
- `Modal`, `Drawer`, `CommandPalette`

### 5.3 Data Components

- `DataTable` (sorting, filtering, pagination, column pinning)
- `VirtualList` (for large feeds)
- `MetricCard`
- `InsightCard`
- `DiffCard`
- `EvidenceCard`

### 5.4 Visualization Components

- `FunnelGraph`
- `FunnelTimeline`
- `ChangeTimeline`
- `AdCreativeGallery`
- `SequenceTimeline`
- `StackMatrix`
- `Sparkline`, `BarChart`, `Heatmap`, `TrendChart`

### 5.5 Workflow Components

- `CompetitorOnboardingForm`
- `AlertTriagePanel`
- `ReportBuilder`
- `ReportPreview`

### 5.6 States and Feedback Components

- `EmptyState`
- `LoadingSkeleton`
- `InlineError`
- `Toast`
- `StatusPill`

---

## 6. State Management Strategy

### 6.1 State Domains

1. `Server State`
- Competitors, funnels, ads, emails, technologies, alerts, reports.
- Managed via `TanStack Query` with cache keys per module.

2. `Global Client State`
- UI preferences, selected workspace, global filters, panel visibility.
- Managed via `Zustand` (or Redux Toolkit if org standard requires).

3. `Local View State`
- Form fields, modal state, temporary selections.
- Managed with component state and local reducers.

### 6.2 Cache and Invalidation

- Query keys include tenant/workspace and date range.
- Event-driven invalidation after actions (create competitor, run monitoring, generate report).
- Stale-while-revalidate for high-frequency monitoring feeds.

### 6.3 Real-Time Update Strategy

- `SSE` for alerts/change feed updates.
- Fallback polling for unstable networks.
- Optional WebSocket channel for future interactive collaboration features.

---

## 7. Data Visualization Strategy

### 7.1 Funnel Structures

- Node-link graph for topology.
- Stage funnel bars for high-level stage distribution.
- Timeline for evolution over time.

### 7.2 Marketing Stack

- `StackMatrix` (rows: technologies, columns: time snapshots).
- Confidence color gradients + evidence drill-down.

### 7.3 Competitor Comparison

- Side-by-side KPI cards + normalized chart axes.
- Comparative funnel stage coverage heatmap.

### 7.4 Monitoring Changes

- Change timeline with severity encoding.
- Before/after text diff components for offers and copy.

### 7.5 Ads and Email Intelligence

- Ad gallery with hook clusters and CTA tags.
- Email sequence timeline with cadence bands and CTA categories.

### 7.6 Visual Standards

- Consistent axis behavior across charts.
- Tooltips must always show source metadata and timestamp.
- Every visual should support table fallback for dense analysis.

---

## 8. Design System

### 8.1 Visual Direction

Target style: premium modern SaaS with calm density and analytical clarity.  
References: `Linear`, `Vercel`, `Stripe Dashboard`, `Notion`, `Supabase`.

### 8.2 Typography

- Primary UI font: `Plus Jakarta Sans` (or `Sora` as alternative).
- Data font: `IBM Plex Mono` for numeric/readout alignment.
- Type scale:
  - Display: 32/40
  - H1: 24/32
  - H2: 20/28
  - Body: 14/22
  - Meta: 12/18

### 8.3 Spacing System

- Base unit: `4px`.
- Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Rule: all paddings/margins align to this scale.

### 8.4 Color Palette

- Neutral foundation:
  - `--bg-canvas`
  - `--bg-surface-1`
  - `--bg-surface-2`
  - `--border-subtle`
  - `--text-primary`, `--text-secondary`, `--text-muted`
- Brand accent:
  - `--brand-500` (deep cyan/blue)
  - `--brand-600`
- Semantic:
  - success, warning, danger, info with accessible contrast.

### 8.5 Depth and Layering

- Primary strategy: subtle layered shadows + low-contrast borders.
- Elevation levels:
  - `surface-0` canvas
  - `surface-1` cards
  - `surface-2` popovers/modals

### 8.6 Component Rules

- Buttons: clear hierarchy (primary, secondary, ghost).
- Inputs: clear focus rings and error messaging.
- Tables: sticky headers, row hover highlight, dense but readable.
- Cards: consistent radius, border, and padding.

### 8.7 Motion

- Micro-interactions: 120-180ms.
- Entry transitions: 220-280ms.
- Easing: `ease-out` for UI transitions, no bounce animations.

### 8.8 Data Readability Standards

- Monospace for numeric KPIs.
- Right alignment for numeric table columns.
- Visible source/timestamp metadata in all intelligence cards.

---

## 9. Frontend Technology Stack

### 9.1 Recommended Stack

- Framework: `Next.js (App Router) + React + TypeScript`
- Styling: `Tailwind CSS + CSS variables + design tokens`
- Component primitives: `Radix UI`
- Data/state: `TanStack Query + Zustand`
- Forms: `React Hook Form + Zod`
- Charts: `Recharts` for standard charts, `Visx` for custom visuals
- Graph visualization: `React Flow` (+ `dagre` for layout)
- Tables: `TanStack Table`
- Auth integration: JWT/session with API gateway middleware
- Testing:
  - Unit/component: `Vitest + Testing Library`
  - E2E: `Playwright`
- Monitoring:
  - Runtime errors: `Sentry`
  - Product analytics: `PostHog` or equivalent

### 9.2 Rationale

- Next.js supports large-scale modular routing and performance primitives.
- TanStack ecosystem gives flexible, high-performance data handling.
- React Flow is suitable for funnel topology and interactive node inspection.
- Tokenized design system ensures scalability and visual consistency.

---

## 10. Performance Strategy

### 10.1 Large Dataset Handling

- Virtualization for long tables and alert feeds.
- Cursor-based pagination for API-heavy lists.
- Progressive rendering for large competitor portfolios.

### 10.2 Visualization Performance

- Lazy-load heavy graph/chart modules.
- Memoized transforms for graph layouts.
- Debounced filters and search.

### 10.3 Caching and Network Efficiency

- Smart query stale times by data type:
  - dashboard KPIs: short stale time
  - historical reports: long stale time
- Background refresh for monitoring pages.
- Prefetch next likely views based on navigation.

### 10.4 Runtime Optimizations

- Route-based code splitting.
- Suspense boundaries around expensive widgets.
- Avoid full re-render through fine-grained selectors and memoization.

### 10.5 Real-Time Strategy

- SSE channel updates only active panels.
- Batched UI updates to avoid render storms during high event throughput.

---

## 11. Project Structure

```text
src/
  app/
    (auth)/
    (dashboard)/
      dashboard/
      competitors/
      monitoring/
      reports/
      settings/
  components/
    ui/
    layout/
    data-display/
    visualizations/
  features/
    competitors/
    funnels/
    ads/
    emails/
    technologies/
    monitoring/
    reports/
  hooks/
  services/
    api-client/
    query/
    realtime/
  store/
  styles/
    tokens/
    globals/
  types/
  utils/
  tests/
```

### 11.1 Organization Rules

- `features/*` owns business logic per domain.
- `components/ui` stays domain-agnostic.
- API contracts and query keys are centralized.
- Shared types mirror backend DTO contracts.

---

## 12. Frontend Development Roadmap

### Phase 0 (`Week 1`)
- Define product UX flows and route map.
- Freeze design direction and token architecture.
- Set up frontend repo structure and CI checks.

### Phase 1 (`Weeks 2-3`) Foundation
- Auth flows and protected routes.
- App shell (sidebar, topbar, page layout).
- Base design system primitives and core components.

### Phase 2 (`Weeks 4-5`) Competitors + Dashboard
- Competitor CRUD UI.
- Dashboard KPIs, onboarding checklist, and global filters.
- Initial monitoring feed.

### Phase 3 (`Weeks 6-7`) Funnel Intelligence
- Funnel graph view (React Flow).
- Funnel timeline + evidence side panel.
- Funnel version diff interface.

### Phase 4 (`Weeks 8-9`) Ads/Emails/Technologies
- Ad library and linked funnel context.
- Email sequence timeline and detail view.
- Tech stack matrix with confidence overlays.

### Phase 5 (`Weeks 10-11`) Monitoring + Alerts
- Advanced filtering and triage UX.
- Alert workflow states and collaboration hooks.
- Real-time feed updates (SSE).

### Phase 6 (`Weeks 12-13`) Reports + AI Briefs
- Report builder and preview UX.
- Export flows and sharing UX.
- AI insight cards with source traceability.

### Phase 7 (`Weeks 14-15`) Quality and Scale
- Performance passes (virtualization, lazy loading, memoization).
- Accessibility audit and keyboard-first navigation.
- E2E coverage for critical workflows.

### Phase 8 (`Week 16`) Production Readiness
- Error monitoring, product analytics, UX telemetry dashboards.
- Final visual polish, micro-interaction tuning, and design QA.
- Release checklist and handoff documentation.

---

## Delivery Notes

- This plan assumes a feature-team model with parallel tracks:
  - `Design System + Platform`
  - `Intelligence Feature Pods`
  - `Frontend Performance + Quality`
- Every feature should ship with:
  - loading/empty/error states
  - evidence traceability
  - interaction accessibility
  - instrumentation for adoption and quality metrics

