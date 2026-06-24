# Vivaldi Tiled Tabs Dynamic Color-Linking Mod

This modification implements a "Dynamic Color-Linking" system within the Vivaldi browser architecture. It provides a clear visual relationship between tabs that are part of the same tiled grid, regardless of their position in the linear tab bar.

## Features

- **Primary Visual Cue:** A 3px horizontal accent bar appears at the top edge of tabs that are tiled together.
- **Dynamic Palettes:** Automatically cycles through a high-contrast palette of 8 Vivaldi-friendly colors for new tile groups.
- **Hover Glow:** Secondary visual indicator glows lightly over all linked tabs when hovering over one of them.
- **Active vs. Background:** The active tab in a tiled group shows vibrant colors, while background tiled tabs have a 50% opacity appearance.
- **Edge Cases Handled:** Handles private window muting, and applies a striped pattern if the user exceeds the 8-color palette pool.

## Installation Instructions

Because Vivaldi's proprietary Tab and Tiling state isn't exposed to standard Chrome Extension APIs, this feature is implemented as a **Vivaldi Mod**.

### Step 1: Prepare the Files
1. Download `custom.js` and `custom.css` from this repository.

### Step 2: Install the CSS Mod (Visuals)
1. Open Vivaldi and navigate to `vivaldi://experiments/` (or `chrome://flags/#vivaldi-css-mods` for newer versions).
2. Enable **"Allow for using CSS modifications"**.
3. Restart Vivaldi.
4. Open Vivaldi Settings (`Ctrl+F12` / `Cmd+,`) and go to **Appearance**.
5. Scroll down to **Custom UI Modifications**.
6. Select a folder on your computer (e.g., `C:\VivaldiMods\` or `~/VivaldiMods/`).
7. Place the `custom.css` file into this folder.

### Step 3: Install the JavaScript Mod (Logic)
*Note: Modifying `window.html` or `browser.html` involves changing Vivaldi's core UI files. These files are overwritten when Vivaldi updates, so you will need to re-apply this step after browser updates.*

1. Locate your Vivaldi application directory:
   - **Windows:** `C:\Users\<YourUser>\AppData\Local\Vivaldi\Application\<Version>\resources\vivaldi\`
   - **macOS:** `/Applications/Vivaldi.app/Contents/Frameworks/Vivaldi Framework.framework/Versions/A/Resources/vivaldi/`
   - **Linux:** `/opt/vivaldi/resources/vivaldi/`
2. **Important:** Make a backup copy of `window.html` (or `browser.html`, depending on your Vivaldi version).
3. Place `custom.js` inside this folder (alongside `window.html`).
4. Open `window.html` in a text editor.
5. Right before the closing `</body>` tag, add the following line:
   ```html
   <script src="custom.js"></script>
   ```
6. Save the file.

### Step 4: Restart Vivaldi
Completely restart your Vivaldi browser. Once restarted, tiling tabs will now dynamically link with corresponding color cues!

## Troubleshooting
- If changes don't appear, ensure you have correctly pointed the Custom UI Modifications setting to the folder containing `custom.css`.
- If the JS logic isn't running, open Vivaldi UI Developer Tools (`vivaldi://inspect/#apps` -> inspect Vivaldi) and check the console for errors. Make sure the script tag was placed correctly in `window.html`.
