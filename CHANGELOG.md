# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **CI**: GitHub Actions workflow running lint and tests on every pull request and push to `main`.
- **Lint script**: `pnpm lint` (ESLint 8 with `standard`) is now a declared dev dependency and script.
- **Supply-chain checks**: Dependency Review and OpenSSF Scorecard workflows, grouped Dependabot updates for npm and GitHub Actions, and status/security badges in the README.
- **AI agent instructions**: A single vendor-neutral `AGENTS.md`, with thin `CLAUDE.md`, `GEMINI.md` and `.github/copilot-instructions.md` wrappers pointing to it. Replaces `.agents/AGENTS.md` and `.cursorrules`.
- **Lockfile**: `pnpm-lock.yaml` for reproducible installs.

### Fixed

- **Indicator blending into the theme (#8)**: A tile group's color was checked against the theme color only once, when first assigned. If the theme or accent color changed afterwards (for example accent color following the active tab), the bar could end up the same color as the tab behind it and appear to vanish. Colors are now re-validated on every update and reassigned on clash, and changes to `#browser`'s class/style trigger an update.
- **Indicators wiped by a failed tab query**: A failed `chrome.tabs.query` was treated as "no tabs", removing every bar and releasing all colors. The update is now skipped and current state kept.
- **Overlapping updates**: Bursts of tab events could run two update passes at once. Updates are now serialised, and a request arriving mid-update is re-run afterwards.
- **Observers lost on UI re-mount**: Observers are re-attached whenever Vivaldi replaces the tab bar (e.g. toggling vertical tabs), instead of staying on a detached node.
- **`vivExtData` shape**: An already-parsed `vivExtData` object is accepted instead of silently yielding no tile groups.
- **Layouts without `.tab-wrapper`**: The bar is hosted on the tab itself when no wrapper exists, instead of rendering nothing. (Untested in a live Vivaldi.)
- **Slow activation**: The first update runs ~150ms after init (was 1s), and tab activation, creation, move and replacement now trigger updates.
- **Theme color parsing**: `#rrggbbaa`/`#rgba` and `rgb()`/`rgba()` theme values are read correctly; unsupported formats (e.g. `hsl()`) now skip clash detection instead of producing a wrong color.

### Changed

- **Code formatting**: Reformatted one destructuring in `assets/custom.js` to satisfy ESLint. No behavior change.
- **Dev dependencies**: Bumped `vitest` to v5.

---

## [v1.1.0] - 2026-06-27

### Added

- **Active vs. Background Contrast**: The active tab in a tiled group now displays the accent bar at full brightness. All other tabs in the same group are subtly dimmed to 65% opacity, making it immediately clear which tiled tab is in focus without losing the group context.

### Changed

- **Hover glow**: Hovering any tab in a group now brightens the accent bars of all peers to full opacity, replacing the previous full-tab gradient overlay. The effect is more focused and less visually intrusive.

### Fixed

- **Color adjacency**: Red and orange are now separated by the maximum distance in the assignment queue, so they can no longer be assigned to adjacent tile groups.
- **Tab corner rounding**: The accent bar now correctly conforms to Vivaldi's tab corner rounding setting across all values (0–14). Previously, high rounding values caused the bar to visually extend beyond the rounded tab corners.
- **DPI scaling**: On systems with non-integer display scaling (e.g. 125%, 150%), the accent bar no longer bleeds into the gap between tabs.

---

## [v1.0.0] - 2026-06-26

### Added

- **Dynamic Color Accent Bar**: Adds a 3px horizontal accent line at the top edge of tabs that are tiled together.
- **Auto Palette Cycling**: Automatically assigns one of 8 Vivaldi-friendly, high-contrast palette colors to each new tile group.
- **Theme Clash Avoidance**: Measures the contrast color distance between palette colors and the current Vivaldi theme background, automatically skipping colors that would be hard to see.
- **Hover Glow Highlighting**: Hovering over any tab in a tiled group highlights all linked tabs in that group with a subtle gradient backdrop.
- **Active vs. Background Contrast**: The active tab in a tiled group receives full vibrant color cues, while background tiled tabs feature a 50% muted appearance.
- **Private Window Muting**: Automatically dampens accent bar brightness and saturation in private windows.
- **Palette Overflow Fallback**: Implements a high-contrast repeating stripe pattern if the user exceeds the 8-color pool.
- **Memory & Lifecycle Safety**:
  - Implements cycle-safe pending color releases to prevent immediate color reassignments.
  - Cleans up CSS rules and states cleanly when tabs are untiled or closed.
  - Leverages throttle-debounced `MutationObserver` and `chrome.tabs` listeners to minimize browser UI performance overhead.
