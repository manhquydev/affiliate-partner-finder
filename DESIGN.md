---
name: Affiliate Partner Finder
description: Linear × Explorer job workspace for local Trustpilot affiliate scans
colors:
  accent: "#005fb8"
  accent-hover: "#0050a0"
  accent-fill: "#cce4f7"
  on-accent: "#ffffff"
  mica: "#f3f3f3"
  layer: "#ffffff"
  layer-hover: "#f6f6f6"
  ink: "#1a1a1a"
  muted: "#4a4a4a"
  hairline: "rgba(0, 0, 0, 0.09)"
  verdict-true: "#0b5e38"
  verdict-true-bg: "#e6f4ec"
  verdict-false: "#3d3d3d"
  verdict-false-bg: "#f1f1f1"
  verdict-unknown: "#7a4e0a"
  verdict-unknown-bg: "#f8eedb"
  error: "#c42b1c"
  error-bg: "#fde7e9"
  running-bg: "#e8f3fc"
  caution-bg: "#fff4ce"
  caution-line: "#c19c00"
typography:
  headline:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  control:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "normal"
  mono:
    fontFamily: '"Cascadia Mono", "Segoe UI Mono", ui-monospace, monospace'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "normal"
rounded:
  control: "6px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "6px"
  md: "8px"
  control: "10px"
  lg: "12px"
  xl: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.layer}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.layer-hover}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.layer}"
    textColor: "{colors.error}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-danger-hover:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  input:
    backgroundColor: "{colors.layer}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  input-readonly:
    backgroundColor: "{colors.mica}"
    textColor: "{colors.muted}"
    typography: "{typography.mono}"
    rounded: "{rounded.control}"
    padding: "6px 10px"
    height: "32px"
  search:
    backgroundColor: "{colors.layer}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  pill:
    backgroundColor: "{colors.verdict-false-bg}"
    textColor: "{colors.verdict-false}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  pill-running:
    backgroundColor: "{colors.running-bg}"
    textColor: "{colors.accent}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  pill-done:
    backgroundColor: "{colors.verdict-true-bg}"
    textColor: "{colors.verdict-true}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  pill-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  count-true:
    backgroundColor: "{colors.verdict-true-bg}"
    textColor: "{colors.verdict-true}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  count-false:
    backgroundColor: "{colors.verdict-false-bg}"
    textColor: "{colors.verdict-false}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  count-unknown:
    backgroundColor: "{colors.verdict-unknown-bg}"
    textColor: "{colors.verdict-unknown}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "24px"
  file-row:
    backgroundColor: "{colors.layer}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    width: "100%"
  job-row-selected:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.ink}"
  empty:
    backgroundColor: "{colors.mica}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "16px"
  caution-panel:
    backgroundColor: "{colors.caution-bg}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
---

# Design System: Affiliate Partner Finder

## Overview

**Creative North Star: "Category-standard desktop workspace at Linear × Windows 11 Explorer craft"**

This is an Operate window, not a landing page. It plays the category-standard desktop workspace straight: Linear’s hairline chrome and quiet hierarchy, Windows 11 Explorer’s job-as-folder list, command bar, and details pane. Mica fills the frame; a white list pane holds runs; a mica preview holds the selected job’s work. There is no smuggled metaphor, no cream stationery, and no terminal chrome.

Density is Fluent. The UI face is Segoe UI Variable Text at 13px, controls are 32px tall, command-bar gaps are 6px, and corners are 6px. Fluent-stroke icons sit at 16px in `currentColor`. The accent is scarce: it marks selection, focus, the two primary actions (Job mới on the bar, Bắt đầu on the preview), and live progress. Run state and the three classifications (Có chương trình / Không có / Chưa rõ) are compact pills, not lifted scoreboards.

The memorable beat is Explorer-like: scan the job table, select a folder-run, configure and start from the preview, watch the three verdicts and ETA, then open CSV. Vietnamese copy stays sentence-case and plain.

**Key Characteristics:**
- Mica workspace (`mica`) with a white list pane (`layer`) and 1px hairline dividers (`hairline`)
- Segoe UI Variable Text as the only UI face; Cascadia Mono only for filesystem paths
- Accent rarity: selection, focus, primary actions, progress fill
- 6px rectangles, fully rounded pills, 16px Fluent stroke icons
- Command bar plus two-pane list/preview; Bắt đầu lives on the preview

## Colors

A cool Windows 11 mica field, white panes, near-black ink, and one Fluent blue used sparingly. Semantic greens, grays, ambers, and reds stay on pills and alerts — they are not a second brand.

### Primary
- **Fluent Accent** (`accent`): The only brand color. Fills Job mới and Bắt đầu, the selected-row rail, focus rings, progress fills, live-running dots, and the “Mở CSV” action word.
- **Accent Hover** (`accent-hover`): Primary-button hover. One step darker, still the same blue family.
- **Accent Wash** (`accent-fill`): Selected job-row background. A light veil, never a pane fill.
- **On Accent** (`on-accent`): Label and icon color on filled primary buttons.

### Neutral
- **Mica** (`mica`): Window chrome, preview gutter, empty-state well, and read-only path field. The “desk” the panes sit on.
- **White Pane** (`layer`): Job table surface, resting buttons, editable fields, search, and the CSV file row.
- **Pane Hover** (`layer-hover`): Hover wash for secondary buttons, table rows, and the file row.
- **Ink** (`ink`): Primary text and resting control labels.
- **Quiet Ink** (`muted`): Secondary copy, table headers, hints, timestamps, idle badges, and icons in the list.
- **Hairline** (`hairline`): Every divider, button stroke, field stroke, and table rule. One pixel, 9% black.

### Status
These are classification and machine-state inks, not extra brand colors.
- **Verdict True** (`verdict-true` on `verdict-true-bg`): Có chương trình pills, done-state pills, and the in-run progress fill.
- **Verdict False** (`verdict-false` on `verdict-false-bg`): Không có pills and the idle/default pill. Quiet gray — not error red.
- **Verdict Unknown** (`verdict-unknown` on `verdict-unknown-bg`): Chưa rõ pills.
- **Running Wash** (`running-bg`): Đang chạy / Tiếp tục pills and the preview state badge while live.
- **Error** (`error` on `error-bg`): Stop outline, error pills, invalid fields, and error messages.
- **Caution** (`caution-bg` with `caution-line`): Cloudflare panel and stopping/stalled caution. Gold, not accent blue.

**The Accent Rarity Rule.** Fluent Accent appears only on selection, focus, primary actions, and live progress. It is never a pane, wallpaper, or table zebra.

**The Verdict Ink Rule.** Có is forest, Không is quiet gray, Chưa rõ is amber. Error red is reserved for failures and Stop — never for a false classification.

## Typography

**Display Font:** none (this window has no display role)
**Body Font:** Segoe UI Variable Text (with Segoe UI, system-ui)
**Label/Mono Font:** Cascadia Mono (with Segoe UI Mono) for paths only

**Character:** A single Windows UI face at Linear density. Headings are semibold with a hair of negative tracking; body is 13px and untracked; labels stay sentence-case Vietnamese. The optical size is Variable *Text*, not a display cut.

### Hierarchy
- **Headline** (600, 20px, 1.2, −0.02em): The window title only — “Trình dò Affiliate/Partner”.
- **Title** (600, 16px, ~1.25, −0.015em): Preview job name beside the live dot.
- **Body** (400, 13px, 1.45): Default copy, table cells, messages, live domains, field values.
- **Control** (600, 13px, 1.45): Buttons, field labels, ETA, count-pill type. Same size as body, heavier.
- **Label** (600, 11px, 1.35): Sticky table headers, status pills, mini fractions, live-row captions. Never uppercase, never tracked.
- **Mono** (400, 12px; 11px inside the read-only path field): Folder paths and `results.csv` only. Tabular numerals (`font-variant-numeric: tabular-nums`) on the table, fractions, ETA, and count numbers.

### Named Rules
**The One Face Rule.** Segoe UI Variable Text is the only UI face. Cascadia Mono is filesystem-only. Do not add a display serif, a second sans, or an icon font.

## Layout

A column app: mica command chrome on top, then a two-pane workspace. The job table is the left column (`minmax(0, 1.35fr)`); the preview is the right (`minmax(20rem, 0.9fr)`), about 58% / 42%. The list pane is a white sheet with a hairline on its right edge; the preview is mica, padded 12px 14px 20px, and scrolls as one details column.

Rhythm is 4 / 6 / 8 / 10 / 12 / 16. The 6px step is the command-bar and action-row gap. Controls are 32px tall with 10px horizontal padding. Table headers pad 6×12; body cells pad 8×12. Field clusters use a 1.4 / 0.55 grid (keyword + company count). Below 960px the workspace stacks: list on top at ~38% height, preview below, and the hairline moves to the bottom of the list. The window must stay readable at 720×640.

**The Two-Pane Rule.** The window is a job table plus a live preview, not a stacked utility form. Job mới is the command-bar primary. Bắt đầu, Tiếp tục, and Dừng live on the preview.

## Elevation & Depth

Depth is tonal, not cast. Mica chrome and mica preview sit behind a flat white list pane. Resting controls do not drop a shadow. The selected row is a wash of Accent Wash plus a 1px inset accent rail on the leading edge — a selection mark, not a lifted card. Focus is a 2px accent ring with a 2px offset on buttons, fields, and focused rows.

Progress motion is the only structural animation: the preview fill scales on X over 0.35s with `cubic-bezier(0.16, 1, 0.3, 1)`. A running state badge pulses opacity over 1.6s. Both stop under `prefers-reduced-motion`. While a matching job is running, the preview fill switches from accent to verdict-true.

### Shadow Vocabulary
- **Selection rail** (`box-shadow: inset 1px 0 0 {accent}`): Selected job row only.
- **Focus ring** (`outline: 2px solid {accent}; outline-offset: 2px`): Keyboard focus on controls and rows.

**The Hairline Layer Rule.** Surfaces stay flat at rest. Separate layers with mica vs white and 1px hairlines. Do not introduce drop shadows to fake cards.

## Shapes

Rectangles share one corner: a gentle 6px radius on buttons, fields, search, empty state, file row, and the Cloudflare panel. Pills, count chips, and progress tracks are fully rounded (99px). The live-state dot is an 8px circle. Icons are 16×16 SVG strokes at 1.5, round caps/joins, `currentColor` — never glyphs, never filled 24px pictograms.

Preview form and dashboard blocks are unboxed: no card radius, no extra stroke, no extra fill. They inherit the mica gutter so the preview reads as one Explorer details pane.

**The Six-Pixel Rule.** If it is a rectangle control or a well, it is 6px. If it is a status or a track, it is a capsule. Do not mix 8px/12px cards into this window.

## Components

Quiet Fluent controls. Everything is 32px or a 22–24px pill, hairline-stroked, 6px (or capsule), with a 2px accent focus ring.

### Buttons
- **Shape:** 6px radius, 32px tall, 10px horizontal padding, 6px gap to a 16px stroke icon, weight 600.
- **Primary:** Accent fill, accent border, on-accent label. Used twice only: Job mới in the command bar, Bắt đầu on the preview. Hover uses Accent Hover; disabled is 45% opacity.
- **Secondary:** White pane, hairline border, ink label. Hover is Pane Hover. Chọn thư mục, Mở thư mục runs, Tiếp tục, Mở thư mục job.
- **Danger:** White pane, error border and label (Dừng). Hover washes Error background. Outline, not a filled red brick.
- **Focus:** 2px accent ring, 2px offset, all variants.

### Chips
- **Status pills:** 22px capsule, 11px/600, 8px padding. Default quiet gray; running/resume use running wash + accent; done uses true pair; error uses error pair; stopping uses caution wash.
- **Count pills:** 24px capsule, 12px/600 with a 13px tabular strong. True / false / unknown pairs only. They sit in a 6px-gap row under progress — compact counts, not hero metrics.
- **State badge:** Same capsule geometry at 12px, top-right of the preview. Running may pulse; it is still a pill.

### Cards / Containers
- **Job pane:** White, no radius, hairline on the trailing edge. The table *is* the surface.
- **Preview:** Mica, no card chrome. Form and dashboard reset to transparent, unpadded blocks.
- **Empty well:** Mica fill, dashed hairline, 6px radius, 16px padding, quiet ink.
- **CSV file row:** Full-width white row, hairline, 6px, 8×10 padding, mono filename, accent “Mở CSV”.
- **Cloudflare panel:** Caution wash, 1px caution line, 6px, 10×12 padding.

### Inputs / Fields
- **Style:** White pane, hairline, 6px, 32px, 10px padding, inherited 13px.
- **Search:** Same control, wrapped with a quiet-ink search stroke and 12rem–22rem width, pushed to the trailing edge of the command bar (`margin-left: auto`).
- **Read-only path:** Mica fill, quiet ink, Cascadia 11px, wraps long paths. Not an editable text box that happens to be locked.
- **Focus:** 2px accent ring, 2px offset. No glow, no thickness change on the hairline.
- **Error:** Hairline swaps to error; the message uses error on error-bg with 6px padding.
- **Checkboxes:** Accent on the native control (`accent-color`). Labels are 500, 8px below each other.

### Navigation
- **Command bar:** Mica header, 12px 16px 10px, hairline under the title. Title then a wrapping 6px-gap toolbar. Job mới is the leading primary; folder actions are secondary; filter is trailing.
- **Job table:** Sticky 11px quiet-ink headers, tabular nums, folder stroke + 600 name, ellipsized keyword, 4px mini-track, status pill, 12px relative time. Hover Pane Hover; selected Accent Wash + 1px inset accent rail. Rows are keyboard-activable.

### Progress
- **List mini-track:** 4px capsule well (`#e6e6e6`), accent fill, 11px quiet fraction.
- **Preview track:** 6px capsule, the same well, fill scaled from the left. Meta is a 13px fraction, 12px hint, 13px/600 ETA (500 and quiet when low-confidence). Stalled ETA uses caution ink.

## Do's and Don'ts

### Do:
- **Do** keep mica chrome, a white job list, and a mica preview — Explorer details, not a stacked form.
- **Do** use Job mới as the command-bar primary and Bắt đầu as the preview primary.
- **Do** mark the selected run with Accent Wash and a 1px inset accent rail.
- **Do** keep controls at 32px × 6px radius with 6px command-bar gaps and 16px Fluent stroke icons.
- **Do** render run state and Có / Không / Chưa rõ as 22–24px capsules in their semantic pairs.
- **Do** keep visible 2px accent focus rings and live progress semantics (`aria-live`, progressbar).

### Don't:
- **Don't** fill panes, the mica desk, or table zebra stripes with Fluent Accent.
- **Don't** introduce a second UI typeface, a display serif, or an icon font; Cascadia Mono stays on paths.
- **Don't** color Không có as error red, or use error red for anything but failures and Stop.
- **Don't** lift resting surfaces with drop shadows or wrap preview sections in extra cards.
- **Don't** revive the retired cream / panel / red-accent stationery look, or terminal chrome.
- **Don't** replace 16px `currentColor` strokes with emoji, icon fonts, or filled pictograms.
