# Design System Specification: The Kinetic Minimalist

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Curator."**

Moving beyond the rigid, boxy constraints of traditional SaaS, this system treats the dashboard as a high-end editorial gallery. We achieve a "Linear-meets-Stripe" aesthetic not through standard components, but through **intentional atmospheric depth**. By prioritizing white space as a functional element and utilizing tonal layering over structural lines, we create an interface that feels engineered yet organic. The goal is to eliminate visual noise so that data becomes the hero, supported by a "ghost" infrastructure that guides the eye without demanding attention.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a sophisticated range of cool grays and deep blues, designed to create a calm, high-trust environment.

*   **Primary Identity:** The `primary` (#005ac2) is our surgical tool—used sparingly for high-intent actions.
*   **The "No-Line" Rule:** To achieve a premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background shifts. For example, a `surface_container_low` sidebar sitting against a `surface` main content area creates a natural, soft-edge distinction that feels more modern than a hard line.
*   **Surface Hierarchy & Nesting:** Treat the UI as physical layers of frosted glass.
    *   **Base:** `surface` (#faf8ff)
    *   **In-Page Sections:** `surface_container_low` (#f2f3ff)
    *   **High-Priority Cards:** `surface_container_lowest` (#ffffff)
*   **The Glass & Gradient Rule:** For floating modals or navigation overlays, use `surface_container_low` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** Main CTAs should utilize a subtle linear gradient from `primary` (#005ac2) to `primary_dim` (#004fab) at a 145-degree angle to provide "soul" and tactile depth.

---

## 3. Typography
We utilize **Inter** to bridge the gap between technical precision and readability. The hierarchy is designed to feel editorial, using drastic scale shifts to define importance.

*   **Display & Headline:** Use `display-md` (2.75rem) for empty states or hero metrics. The letter-spacing should be set to `-0.02em` to create a "tight," custom-font feel typical of premium brands.
*   **Title & Body:** `title-sm` (1rem) serves as our primary header for cards. `body-md` (0.875rem) is the workhorse for all data and descriptions.
*   **Labels:** `label-sm` (0.6875rem) should be set in **All Caps** with `+0.05em` letter-spacing when used for table headers or category tags to distinguish them from interactive text.

---

## 4. Elevation & Depth
Depth in this system is a result of **Tonal Layering**, not structural shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card (Pure White) on a `surface_container_low` background. This creates a "natural lift" that is easier on the eyes than high-contrast drop shadows.
*   **Ambient Shadows:** When an element must "float" (e.g., a dropdown or a dragged card), use a shadow color tinted with `on_surface` (#113069) at 4% opacity with a `32px` blur and `16px` Y-offset. This mimics a soft, natural overhead light.
*   **The "Ghost Border":** For interactive elements like input fields, if a border is required, use `outline_variant` (#98b1f2) at **15% opacity**. This provides a guide for the user without breaking the "No-Line" rule.

---

## 5. Components

### Sidebars & Navigation
*   **Sidebar:** Use `surface_container_low`. Active states should not use a background fill; instead, use a `primary` vertical "pill" (2px wide) on the left and transition the text color to `on_surface`.
*   **Top Nav:** A transparent `surface` with a 15px backdrop-blur.

### Cards & Lists
*   **The "Zero-Divider" Rule:** Never use `<hr>` or border-bottom to separate list items. Use the **Spacing Scale `4` (0.9rem)** to create breathing room between items, or alternate subtle background tints (`surface_container` vs `surface_container_low`).
*   **Corner Radius:** All cards must use `xl` (0.75rem / 12px) for a soft, approachable feel. Small components (buttons, chips) use `lg` (0.5rem / 8px).

### Data Tables
*   **Headers:** `label-md` in `on_surface_variant` (#445d99).
*   **Rows:** On hover, change the background to `surface_container_highest` (#d9e2ff) with a transition speed of `150ms`. No vertical lines; only horizontal alignment defines the columns.

### Buttons & Inputs
*   **Primary Button:** Gradient-filled (`primary` to `primary_dim`). `lg` corner radius.
*   **Inputs:** `surface_container_lowest` background. No border. On focus, a subtle `2px` glow using `primary` at 20% opacity.
*   **Status Indicators:** Use `error_container` for high-alert items, but always pair with `on_error_container` text to ensure AA accessibility.

---

## 6. Do's and Don’ts

### Do:
*   **Do** use asymmetrical white space. If a card has 32px padding on the left, try 40px on the right to create an editorial flow.
*   **Do** use `surface_dim` (#cdd9ff) for background areas that need to feel "recessed" or secondary.
*   **Do** rely on typography weight (Semi-Bold vs Regular) rather than color to create hierarchy within a single component.

### Don't:
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#113069) to maintain the sophisticated blue-gray tone.
*   **Don't** use 1px borders to separate the sidebar from the main content. Use the color shift between `surface_container_low` and `surface`.
*   **Don't** use standard "Drop Shadows." If it doesn't look like it's glowing or naturally catching light, it's too heavy.

