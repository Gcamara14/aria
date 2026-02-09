# Accessibility Audit Bookmarklets

This suite of JavaScript bookmarklets is designed to help developers and QA engineers audit web pages for common accessibility issues that automated tools often miss. They focus on complex ARIA rules, accessible name computation, and structural validity.

## The Bookmarklets

### 1. AccName Audit (`accname.js`)
**Purpose:** The "One Stop Shop" for accessible name validation. It computes the "Accessible Name" for every element and validates it against ARIA 1.2 rules.

**Key Features:**
*   **Computation:** Shows exactly what screen readers will announce (handling `aria-labelledby`, `aria-label`, native labels, and recursion).
    *   *Update:* Correctly handles empty `aria-label`/`aria-labelledby` by falling back to inner content.
*   **Smart Filtering:**
    *   Focuses on interactive elements and specific roles. Excludes static content (like `p` tags) unless they are explicitly interactive or labeled.
    *   **Excludes Icons:** Defers icon validation to `svg-audit.js` to avoid overlapping reports.
*   **Validation:** Flags issues like:
    *   Empty accessible names.
    *   **Prohibited Names (Rule ACC-NAME-010):** Flags `aria-label` or `aria-labelledby` on generic elements (`div`, `span`) or other prohibited tags (`label`, `p`, `strong`).
    *   **Duplicate Names:** Flags identical names on different elements. *Update:* Now strictly compares elements of the same role/type (e.g., won't flag a "Search" button against a "Search" input).
*   **Report Header:** Includes a "Recommended Fixes" section with clear, actionable advice (e.g., prioritizing visible text, explicit attribute removal).

### 2. SVG & Icon Audit (`svg-audit.js`)
**Purpose:** Audits all SVGs and Icon Fonts (e.g., `<i>`, `<span class="icon">`) to ensure they are either properly hidden or properly labeled.

**Key Rules Enforced:**
*   **Decorative Icons:** MUST have `aria-hidden="true"` (or have a parent with `aria-hidden="true"`).
*   **Meaningful Icons:** MUST have **BOTH** `role="img"` **AND** a valid Accessible Name (`aria-label`).
*   **No Title Attributes:** Flags the use of `title="..."` as insufficient, as it often computes to a Description rather than a Name. Enforces `aria-label` instead.

**Recommended Fixes:**
*   Target the SVG element directly to avoid hiding sibling content.
*   Use `focusable="false"` on SVGs to prevent IE tab stops.

### 3. Interactive Nesting Audit (`interactive-nesting.js`)
**Purpose:** Detects invalid nesting of interactive controls, which breaks accessibility APIs and keyboard navigation.

**Common Scenarios Caught:**
*   `<button>` inside an `<a>` tag.
*   `<a>` inside a `<button>`.
*   Interactive elements inside `role="button"` (e.g., `<button>` inside `<div role="button">`).

**Reporting Improvements:**
*   Clearly identifies parent roles (e.g., `<div role="button">`) to help pinpoint the issue.
*   Provides specific, actionable fix recommendations for layout refactoring and tab stop simplification.

**Fix Recommendations:**
*   **Refactor Layout:** Move elements to be siblings and use CSS/z-index to overlay them visually.
*   **Remove Redundancy:** If a card is clickable, don't nest another button inside it; use an icon instead.
*   **Simplify Tab Stops:** Consolidate nested controls to avoid "tab traps".

---

## Implementation Plan

### Phase 1: Manual Testing & Adoption
*   **Distribution:** Share these bookmarklet scripts with the engineering and QA teams.
*   **Workflow:** Developers should run these bookmarklets locally during feature development to catch issues before code review.
*   **Feedback:** Gather feedback on false positives or missed scenarios to refine the logic.

### Phase 2: CI/CD Integration
*   **Goal:** Automate these checks to prevent regression.
*   **Integration:** Port the logic from these JavaScript bookmarklets into the **Wal-E AI A11Y PR Checks** pipeline.
*   **Enforcement:**
    *   **Block** PRs on "Critical" failures (e.g., Nested Interactive Controls, Prohibited Names).
    *   **Warn** on "Moderate" issues (e.g., Duplicate Names requiring review).
