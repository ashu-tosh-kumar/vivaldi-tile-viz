# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0]

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
