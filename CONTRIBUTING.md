# Contributing

Thank you for your interest in improving the Vivaldi Tiled Tabs Visualizer Mod! We welcome feedback, bug reports, and contributions from the Vivaldi fanbase.

## How to Contribute

1. **Submit Bug Reports & Suggestions**: Open a GitHub issue detailing what you observed, what you expected, and steps to reproduce.
2. **Submit a Pull Request**:
   - Fork the repository.
   - Create a feature branch (`git checkout -b feature/amazing-feature`).
   - Implement your changes.
   - **Review Changes**: Run a review of your modifications and the final code using the **Qodo** (formerly Codium) extension in VS Code. Address any security vulnerabilities, memory leak alerts, or performance bottlenecks identified.
   - Commit your changes clearly.
   - Push your branch and open a Pull Request.

## Development & Debugging Guidelines

Because Vivaldi mods execute in a highly privileged context, any modifications must meet strict standards.

### 1. Code Guidelines

- **Privacy First**: Never introduce external dependencies, analytics, telemetry, or network-bound calls.
- **Strict Scope**: Keep all script code wrapped inside the Immediate Invoked Function Expression (IIFE) and enforce `'use strict';`.
- **Safe DOM Manipulation**: Avoid using unsafe APIs like `innerHTML` or `eval`. Prefer classes, styles, and safe DOM traversal methods.
- **Minimize Performance Impact**: Vivaldi's UI frame handles thousands of operations. Use debouncing/throttling (like `scheduleUpdate` in `custom.js`) to limit layout calculations and prevent tab-switching lag.

### 2. Inspecting and Debugging

To debug the mod inside Vivaldi's UI:

1. Open Vivaldi.
2. Navigate to `vivaldi://inspect/#apps`.
3. Locate the row for **Vivaldi** (usually the first main application entry containing `browser.html` or `window.html`).
4. Click **Inspect** to launch the Vivaldi UI Developer Tools.
5. In the DevTools window:
   - Check the **Console** tab for logs/errors (you can toggle `TILE_DEBUG = true` in `custom.js` to enable console tracing).
   - Use the **Elements** tab to inspect `.tab` and `.tab-wrapper` elements to ensure the custom classes (`.tab-tiled-link`, `.tab-tiled-wrapper`) and CSS variables (`--tile-group-color`) are applied correctly.

Thank you for helping make Vivaldi modding even better!
