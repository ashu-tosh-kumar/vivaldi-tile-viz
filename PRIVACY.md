# Privacy Policy

Your privacy is our absolute priority. This Vivaldi modification is designed to be fully transparent, local-first, and non-intrusive.

## Data Accessed

This mod only accesses the following structural information in the Vivaldi UI window context:

- **Tab Tiling Identifiers**: The mod queries Vivaldi's internal `chrome.tabs` API to check the `vivExtData` field on active tabs. It reads `vivExtData.tiling.id` to identify which tabs belong to the same tiled grid layout.
- **Tab Bar DOM Elements**: The mod reads IDs from tab favicons (`tab-{ID}-favicon`) and `data-tab-id` attributes on tab list elements. This is used solely to link browser tab elements in the DOM to their respective Chrome tab IDs.
- **Theme Color Properties**: The mod queries browser CSS variables (like `--colorAccentBg` and `--colorBg`) to determine Vivaldi's current active theme background. It uses this to calculate color distances and prevent tiled tab markers from clashing with or becoming invisible against the active browser theme.

## Data Storage

This modification is completely **stateless**:

- **No Settings Storage**: All tab linkages and color mappings are computed dynamically in-memory and are not persisted.
- **No Cookies or LocalStorage**: The mod does not write to `localStorage`, `sessionStorage`, IndexedDB, cookies, or browser storage APIs.
- When Vivaldi is restarted or reloaded, the mod restarts with a clean memory state.

## No-Network Guarantee

We guarantee that this modification makes **zero network requests**.

- No telemetry or telemetry trackers.
- No analytics or crash reports.
- No remote script inclusion.
- No data aggregation or transmission.

All color mapping and layout calculations happen entirely within your local browser process.

## Transparency

To maintain transparency about development:

- **Design Inspiration**: Built to mirror the native visual cohesion found in tiling window managers.
- **Development**: Developed in collaboration with AI assistants (Google AI Studio, Google Jules, Google Antigravity, Claude Code) and hardened with security analysis via Qodo.

## Contact

If you have any questions or feedback, please open an issue in the GitHub repository.
