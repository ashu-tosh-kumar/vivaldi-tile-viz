# Vivaldi Tiled Tabs Visualizer Mod

[![License: MIT](https://img.shields.io/github/license/ashu-tosh-kumar/vivaldi-tile-viz?style=flat-square&color=blue)](LICENSE)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/ashu-tosh-kumar/vivaldi-tile-viz?style=flat-square&label=openssf%20scorecard)](https://scorecard.dev/viewer/?uri=github.com/ashu-tosh-kumar/vivaldi-tile-viz)
<!-- OpenSSF Best Practices: register at https://www.bestpractices.dev/en/projects/new then add: [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/PROJECT_ID/badge)](https://www.bestpractices.dev/projects/PROJECT_ID) -->
[![Release](https://img.shields.io/github/v/release/ashu-tosh-kumar/vivaldi-tile-viz?style=flat-square&color=blue)](https://github.com/ashu-tosh-kumar/vivaldi-tile-viz/releases)
[![CI](https://github.com/ashu-tosh-kumar/vivaldi-tile-viz/actions/workflows/ci.yml/badge.svg)](https://github.com/ashu-tosh-kumar/vivaldi-tile-viz/actions/workflows/ci.yml)
[![Vivaldi Forum Thread](https://img.shields.io/badge/Vivaldi%20Forum-Discussion-006ee6?style=flat-square&logo=discourse)](https://forum.vivaldi.net/topic/119265/vivaldi-mod-adding-a-missing-visual-cue-for-tiled-tabs)

<img width="1438" height="73" alt="Screenshot 2026-06-26 at 11 56 50 PM" src="https://github.com/user-attachments/assets/329fa19d-8fd1-4f82-ac24-5e3ed203bd37" />

<br/><br/>

<!--
<img width="1440" height="808" alt="Screenshot 2026-06-26 at 5 36 38 AM" src="https://github.com/user-attachments/assets/d6fb8973-6df8-4ee6-bcae-83a28d2a3bfe" />
-->

A visual enhancements mod for Vivaldi browser that dynamically color-codes tiled tabs. It places a clean, colorful accent bar at the edge of tabs that are part of the same split-screen tiled layout, giving you instant visual context on how your workspace is grouped.

## Features

- **Instant Accent Bars**: A slim, clean color bar marks tabs that are currently tiled together in a split-screen layout.
- **Flexible Tab Bar Positions**: Full native support across **Top**, **Bottom**, **Left**, and **Right** (vertical) tab strip layouts.
- **Smart Color Selection**: Automatically assigns a unique color to each new group of tiled tabs, cycling through a harmonious, high-contrast palette of 8 colors.
- **Theme Clash & WCAG Contrast Prevention**: Detects Vivaldi's current active theme background color, evaluating Euclidean color distance and WCAG relative luminance contrast to automatically skip colors that would blend into the theme.
- **Interactive Hover Glow**: Hovering your mouse cursor over any tiled tab brightens the accent bars across all tabs in that same group, giving you an instant visual cue of which tabs are linked together.
- **Active vs. Background Contrast**: The active tab in a tiled group shines in full color, while background tiled tabs are slightly dimmed so they don't distract you.
- **Private Browsing Mode**: Automatically reduces the brightness and saturation of color cues in Private Windows to blend in with Vivaldi's private mode.
- **Infinite Group Support**: If you exceed the 8-color palette limit, the mod automatically switches to a beautiful striped pattern to continue identifying groups.
- **Customizable Appearance**: Easily adjust indicator thickness via CSS custom variables (e.g. `--tile-viz-thickness: 4px;`) without touching JavaScript logic.

## Installation

Since Vivaldi's tab tiling engine is built into its custom browser interface, this enhancement is installed as a standard **Vivaldi Mod**.

### Step 1: Download the Files

Save both files from the [assets](assets/) directory on your computer:

- [custom.css](assets/custom.css) (Controls the visual accents)
- [custom.js](assets/custom.js) (Controls the connection logic)

### Step 2: Install the CSS Style Mod

1. Open Vivaldi and type `vivaldi://experiments/` in the address bar (or search for `chrome://flags/#vivaldi-css-mods` if you are on an older version).
2. Enable the checkbox for **"Allow for using CSS modifications"**.
3. Restart Vivaldi.
4. Open Vivaldi Settings (`Ctrl+F12` on Windows/Linux or `Cmd+,` on macOS) and go to **Appearance**.
5. Scroll down to the **Custom UI Modifications** section.
6. Click **Select Folder** and choose a dedicated folder where you will keep your mods (e.g., a folder named `VivaldiMods` on your computer).
7. Place the downloaded `custom.css` file into that folder.

### Step 3: Install the JavaScript Logic Mod

*Note: The **Custom UI Modifications** folder from Step 2 only loads `.css` files. `custom.js` is **not** picked up from there; it must live next to `window.html` and be referenced from it. Each Vivaldi update installs into a new version folder, so you must **repeat this whole step (copy `custom.js` and re-add the script tag) after every Vivaldi update**.*

1. Locate your Vivaldi application directory on your computer:
   - **Windows:** `C:\Users\<YourUser>\AppData\Local\Vivaldi\Application\<Version>\resources\vivaldi\`
   - **macOS:** `/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/<Version>/Resources/vivaldi/` (`<Version>` is the folder named after your installed Vivaldi version, e.g. `8.2.4133.94`)
   - **Linux:** `/opt/vivaldi/resources/vivaldi/`
2. **Back up** the existing `window.html` file in that folder (just in case).
3. Place the downloaded `custom.js` file into that same folder (right next to `window.html`).
4. Open `window.html` in any text editor.
5. Scroll to the bottom and find the closing `</body>` tag. Right before it, insert the following script tag:

   ```html
   <script src="custom.js"></script>
   ```

6. Save and close the file.

### Step 4: Restart Vivaldi

Completely close and restart Vivaldi. Open a few tabs, select two or more, right-click, and choose **Tile Tabs** to see the dynamic color-linking in action!

For more detail on Vivaldi mods and community help, check out the [Official Vivaldi Modding Guide](https://forum.vivaldi.net/topic/10549/modding-vivaldi) or join our [Vivaldi Forum Discussion Thread](https://forum.vivaldi.net/topic/119265/vivaldi-mod-adding-a-missing-visual-cue-for-tiled-tabs).

### Customization

You can adjust visual variables in your custom CSS setup or within Vivaldi's theme settings:

```css
:root {
    /* Adjust indicator bar thickness (default: 3px) */
    --tile-viz-thickness: 4px;
}
```

### Troubleshooting: no colored bars at all

Both files are required, and they are installed in different places. Check them in this order:

1. **`custom.js` is next to `window.html`** in the folder for your *current* Vivaldi version, and `window.html` contains `<script src="custom.js"></script>`. A script tag without the file (common right after a Vivaldi update) fails silently.
2. **`custom.css` is in the folder chosen under Settings → Appearance → Custom UI Modifications**, and "Allow for using CSS modifications" is enabled.
3. You fully quit and reopened Vivaldi.
4. Still nothing? Open `vivaldi://inspect/#apps`, click **Inspect** on the main Vivaldi entry (`browser.html` / `window.html`), switch to the **Console** tab, and enter:

   ```javascript
   window.__TILE_VIZ_DEBUG__ = true;
   ```

   (Alternatively, toggle `TILE_DEBUG = true` at the top of `custom.js`). Look for `[TileViz]` trace logs. No lines mean the script isn't loading; include the console output if you open an issue.

## Development

The mod itself has no runtime dependencies or build step. [Node.js](https://nodejs.org/) 22+ and [pnpm](https://pnpm.io/) are only needed to run the linter and tests.

```bash
pnpm install        # install dev dependencies (eslint, vitest)
pnpm lint           # lint assets/custom.js with ESLint (neostandard + eslint.config.js)
pnpm test           # run the test suite once
pnpm test:watch     # re-run tests on file changes
```

Notes:

- The tests load `assets/custom.js` into a Node `vm` sandbox with stubbed browser APIs (see `test/helpers/extract.js`), so no browser is required. If you add an internal function that tests need, expose it in that helper's `EXPORT_BLOCK`.
- CI runs `pnpm lint` and `pnpm test` on every pull request. Run both before opening one.
- The tests cannot confirm compatibility with Vivaldi's UI. To try changes live, copy `assets/custom.js` and `assets/custom.css` into your mods setup (see [Installation](#installation)), restart Vivaldi, then debug via `vivaldi://inspect/#apps` and set `TILE_DEBUG = true` in `custom.js` for console logs. See [CONTRIBUTING.md](CONTRIBUTING.md).
- If `pnpm install` misbehaves because a parent directory contains a `pnpm-workspace.yaml`, use `pnpm install --ignore-workspace`.

---

## Documentation & Policies

We are committed to maintaining a secure, lightweight, and private tool:

- **[Privacy Policy](PRIVACY.md)**: Zero network calls, zero data collection, and fully stateless local processing.
- **[Security Policy](SECURITY.md)**: Secure browser UI coding practices and safety standards.
- **[Contributing Guidelines](CONTRIBUTING.md)**: Instructions on how to report issues or suggest improvements.
- **[Credits](CREDITS.md)**: Attributions for design, development tools, and security reviewers.
- **[Changelog](CHANGELOG.md)**: History of releases and updates.
- **[Standards & Codification (`ai-docs`)](https://github.com/ashu-tosh-kumar/ai-docs)**: Complies with the standards detailed in `ai-docs`.
- **[Vivaldi Forum Thread](https://forum.vivaldi.net/topic/119265/vivaldi-mod-adding-a-missing-visual-cue-for-tiled-tabs)**: Community feedback and discussion.
- **[License](LICENSE)**: Open-sourced under the MIT License.

## Standards & Agentic Readiness

This project adheres to the standards codified in [`ai-docs`](https://github.com/ashu-tosh-kumar/ai-docs) — a repository-independent, agent-independent, and cross-platform place to document, codify, and enforce software engineering standards, CI/CD security baselines, and agentic workflows. Instructions for AI coding assistants are centralized in the vendor-neutral [`AGENTS.md`](AGENTS.md), while tool-specific adapters (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursorrules`, `.continue/rules/vivaldi-tile-viz.md`) serve as lightweight pointers.
