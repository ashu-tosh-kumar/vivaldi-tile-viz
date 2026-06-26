# Workspace Rules for Vivaldi Tile Viz Mod

This file contains rules and guidelines for AI agents when developing, refactoring, or verifying code inside the **Vivaldi Tiled Tabs Dynamic Color-Linking Mod** repository.

---

## Behavioral Constraints

1. **Maintain Code Style**:
   - Use 4-space indentation.
   - Use semicolons.
   - Do not remove existing JSDoc comments or parameter details unless explicitly requested.
   - Enforce `'use strict';` and keep all logic within the Immediately Invoked Function Expression (IIFE) in `assets/custom.js`.
2. **Security Restrictions**:
   - **Zero Network Interaction**: Never make HTTP calls or fetch resources.
   - **Zero Dynamic Execution**: Do not use `eval()`, `new Function()`, or inject raw HTML using `innerHTML`.
   - **Privacy Preservation**: Never access web page content or tab URLs. Only query Vivaldi tab structure variables (`vivExtData.tiling.id`) and DOM UI elements.
3. **Performance Safeguards**:
   - Tab updates must be debounced via the existing `scheduleUpdate()` queue to prevent browser lag.
   - Minimize DOM lookups. Use weak maps and class-based caching where possible.

---

## Architectural Context

- **Vivaldi DOM specifics**: Tab bar elements (`.tab`) do not contain unique IDs. Map them to Chrome tab IDs using the favicon ID matching pattern `tab-{ID}-favicon` or the `data-tab-id` attribute.
- **Tiling state**: Extracted by parsing `vivExtData` (`JSON.parse(tab.vivExtData)`) and checking `ext.tiling.id`.
- **Clash Detection**: Palette colors must have a calculated Euclidean RGB color distance of at least 50 from Vivaldi's theme background (`--colorAccentBg` or `--colorBg`) to avoid visibility collisions.

---

## Verification Protocol

- Run `pnpm exec eslint assets/custom.js` to ensure zero linting errors are present.
- Verify that changes are fully compatible with Vivaldi's custom React-based UI architecture.
