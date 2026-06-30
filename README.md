# Vivaldi Tiled Tabs Visualizer Mod

[![License: MIT](https://img.shields.io/github/license/ashu-tosh-kumar/vivaldi-tile-viz?style=flat-square&color=blue)](LICENSE)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/ashu-tosh-kumar/vivaldi-tile-viz?style=flat-square&label=openssf%20scorecard)](https://scorecard.dev/viewer/?uri=github.com/ashu-tosh-kumar/vivaldi-tile-viz)
<!-- OpenSSF Best Practices: register at https://www.bestpractices.dev/en/projects/new then add: [![OpenSSF Best Practices](https://www.bestpractices.dev/projects/PROJECT_ID/badge)](https://www.bestpractices.dev/projects/PROJECT_ID) -->

<img width="1438" height="73" alt="Screenshot 2026-06-26 at 11 56 50 PM" src="https://github.com/user-attachments/assets/329fa19d-8fd1-4f82-ac24-5e3ed203bd37" />

<br/><br/>

<!--
<img width="1440" height="808" alt="Screenshot 2026-06-26 at 5 36 38 AM" src="https://github.com/user-attachments/assets/d6fb8973-6df8-4ee6-bcae-83a28d2a3bfe" />
-->

A visual enhancements mod for Vivaldi browser that dynamically color-codes tiled tabs. It places a clean, colorful accent bar at the top edge of tabs that are part of the same split-screen tiled layout, giving you instant visual context on how your workspace is grouped.

## Features

- **Instant Accent Bars**: A slim, clean 3px color bar marks the top edge of tabs that are currently tiled together in a split-screen layout.
- **Smart Color Selection**: Automatically assigns a unique color to each new group of tiled tabs, cycling through a harmonious, high-contrast palette of 8 colors.
- **Theme Clash Prevention**: Detects Vivaldi's current active theme background color and automatically skips colors that would be hard to see against it.
- **Interactive Hover Glow**: Hovering your mouse cursor over any tiled tab brightens the accent bars across all tabs in that same group, giving you an instant visual cue of which tabs are linked together.
- **Active vs. Background Contrast**: The active tab in a tiled group shines in full color, while background tiled tabs are slightly dimmed so they don't distract you.
- **Private Browsing Mode**: Automatically reduces the brightness and saturation of color cues in Private Windows to blend in with Vivaldi's private mode.
- **Infinite Group Support**: If you exceed the 8-color palette limit, the mod automatically switches to a beautiful striped pattern to continue identifying groups.

## Installation

Since Vivaldi's tab tiling engine is built into its custom browser interface, this enhancement is installed as a standard **Vivaldi Mod**.

### Step 1: Download the Files

Save both files from the [assets](assets/) directory on your computer:

- [custom.css](file:///Users/ashutosh/projects/My/vivaldi-tile-viz/assets/custom.css) (Controls the visual accents)
- [custom.js](file:///Users/ashutosh/projects/My/vivaldi-tile-viz/assets/custom.js) (Controls the connection logic)

### Step 2: Install the CSS Style Mod

1. Open Vivaldi and type `vivaldi://experiments/` in the address bar (or search for `chrome://flags/#vivaldi-css-mods` if you are on an older version).
2. Enable the checkbox for **"Allow for using CSS modifications"**.
3. Restart Vivaldi.
4. Open Vivaldi Settings (`Ctrl+F12` on Windows/Linux or `Cmd+,` on macOS) and go to **Appearance**.
5. Scroll down to the **Custom UI Modifications** section.
6. Click **Select Folder** and choose a dedicated folder where you will keep your mods (e.g., a folder named `VivaldiMods` on your computer).
7. Place the downloaded `custom.css` file into that folder.

### Step 3: Install the JavaScript Logic Mod

*Note: This step requires adding the script reference to Vivaldi's core UI launcher. You may need to repeat this step after Vivaldi performs major browser updates.*

1. Locate your Vivaldi application directory on your computer:
   - **Windows:** `C:\Users\<YourUser>\AppData\Local\Vivaldi\Application\<Version>\resources\vivaldi\`
   - **macOS:** `/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/A/Resources/vivaldi/`
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

For more detail on Vivaldi mods and community help, check out the [Official Vivaldi Modding Guide](https://forum.vivaldi.net/topic/10549/modding-vivaldi).

---

## Documentation & Policies

We are committed to maintaining a secure, lightweight, and private tool:

- **[Privacy Policy](PRIVACY.md)**: Zero network calls, zero data collection, and fully stateless local processing.
- **[Security Policy](SECURITY.md)**: Secure browser UI coding practices and safety standards.
- **[Contributing Guidelines](CONTRIBUTING.md)**: Instructions on how to report issues or suggest improvements.
- **[Credits](CREDITS.md)**: Attributions for design, development tools, and security reviewers.
- **[Changelog](CHANGELOG.md)**: History of releases and updates.
- **[License](LICENSE)**: Open-sourced under the MIT License.
