# Accessibility Audit Bookmarklets

This suite of JavaScript bookmarklets is designed to help developers and QA engineers audit web pages for common accessibility issues that automated tools often miss. They focus on complex ARIA rules, accessible name computation, and structural validity.

## The Bookmarklets

### 1. AccName Audit (`accname.js`)
**Purpose:** Computes the "Accessible Name" for every interactive element on the page using the full [W3C AccName Computation Algorithm](https://www.w3.org/TR/accname-1.2/).

**Key Features:**
*   **Computation:** Shows exactly what screen readers will announce (handling `aria-labelledby`, `aria-label`, native labels, and recursion).
*   **Validation:** Flags issues like:
    *   Empty accessible names.
    *   **Prohibited Names:** `aria-label` on generic elements like `div` or `span` (Rule `ACC-NAME-010`).
    *   **Duplicate Names:** Flags identical names on different elements.
*   **Review Mode:** Adds a **"Needs Human/AI Review"** badge for duplicate names, helping you decide if the context justifies the duplication or if it's an error.

### 2. SVG & Icon Audit (`svg-audit.js`)
**Purpose:** Audits all SVGs and Icon Fonts (e.g., `<i>`, `<span class="icon">`) to ensure they are either properly hidden or properly labeled.

**Key Rules Enforced:**
*   **Decorative Icons:** MUST have `aria-hidden="true"` (or have a parent with `aria-hidden="true"`).
*   **Meaningful Icons:** MUST have `role="img"` AND a valid Accessible Name (`aria-label`).
*   **No Title Attributes:** Flags the use of `title="..."` as insufficient, as it often computes to a Description rather than a Name. Enforces `aria-label` instead.

**Recommended Fixes:**
*   Target the SVG element directly to avoid hiding sibling content.
*   Use `focusable="false"` on SVGs to prevent IE tab stops.

### 3. Interactive Nesting Audit (`interactive-nesting.js`)
**Purpose:** Detects invalid nesting of interactive controls, which breaks accessibility APIs and keyboard navigation.

**Common Scenarios Caught:**
*   `<button>` inside an `<a>` tag.
*   `<a>` inside a `<button>`.
*   Interactive elements inside `role="button"`.

**Fix Recommendations:**
*   **Refactor Layout:** Move elements to be siblings and use CSS/z-index to overlay them visually.
*   **Remove Redundancy:** If a card is clickable, don't nest another button inside it; use an icon instead.

### 4. Prohibited Names Audit (`prohibited-names.js`)
**Purpose:** A dedicated, lightweight tool specifically for finding `aria-label` or `aria-labelledby` on elements where they are prohibited by the ARIA spec.

**Key Features:**
*   **Targeted Checks:** Flags `div`, `span`, `label`, `p`, `strong`, etc., that have naming attributes.
*   **Smart Suggestions:**
    *   If the container has an input/button, it suggests: **"Move aria-label to `<input>` child"**.
    *   If it's a `<label>`, it suggests: **"Remove (use visible text)"**.

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
