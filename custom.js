/**
 * Vivaldi Tiled Tabs Dynamic Color-Linking Mod
 *
 * Logic for detecting tiled groups via Vivaldi's proprietary DOM structure
 * and injecting CSS variables and classes to visually link them.
 */

(function () {
    // 4.2. Color Assignment Logic: Pre-defined palette of 8 high-contrast, Vivaldi-friendly colors
    const TILE_PALETTE = [
        "#ef3939", // Vivaldi Red
        "#00b0ff", // Cyan
        "#00e676", // Lime
        "#ff9100", // Orange
        "#d500f9", // Purple
        "#ffea00", // Yellow
        "#1de9b6", // Teal
        "#f50057"  // Pink
    ];

    let colorPool = [...TILE_PALETTE];
    let groupColorMap = new Map(); // Map TileGroupID -> { color: string, pattern: boolean }
    let groupCount = 0;

    // A mapping from tab DOM element to its current assigned TileGroupID (if any)
    let tabStateMap = new WeakMap();

    /**
     * Helper to calculate color distance to detect theme clashes.
     * Simplistic RGB distance.
     */
    function hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return [r, g, b];
    }

    function colorDistance(hex1, hex2) {
        const [r1, g1, b1] = hexToRgb(hex1);
        const [r2, g2, b2] = hexToRgb(hex2);
        // Simple Euclidean distance
        return Math.sqrt(Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2));
    }

    function getThemeColor() {
        const browser = document.getElementById('browser');
        if (!browser) return null;
        const style = window.getComputedStyle(browser);
        // Vivaldi often uses --colorAccentBg or --colorWindowBg
        let rgbString = style.getPropertyValue('--colorAccentBg').trim() || style.getPropertyValue('--colorBg').trim();
        if (!rgbString) return null;

        // Convert rgb(r, g, b) or #hex to a consistent format.
        // For simplicity, we just assume hex or a parseable rgb/rgba if the browser returns it.
        // Vivaldi usually returns hex or rgb() from computed styles.
        if (rgbString.startsWith('#')) return rgbString;

        const match = rgbString.match(/\d+/g);
        if (match && match.length >= 3) {
            const hex = "#" + match.slice(0,3).map(x => {
                const hexVal = parseInt(x).toString(16);
                return hexVal.length === 1 ? "0" + hexVal : hexVal;
            }).join("");
            return hex;
        }
        return null;
    }

    /**
     * Get a color for a new tile group.
     * Recycles colors if the pool is empty, and applies a pattern if we exceed the palette.
     */
    function assignColorToGroup(groupId) {
        const themeColor = getThemeColor();
        if (groupColorMap.has(groupId)) {
            return groupColorMap.get(groupId);
        }

        let isPattern = false;
        let assignedColor;

        // If we have available colors, find one that doesn't clash with the theme
        let foundColor = false;
        let clashedColors = [];

        while (colorPool.length > 0) {
            assignedColor = colorPool.shift();

            // Check for theme clash (distance < 50 is a reasonable threshold for "too similar")
            if (themeColor && colorDistance(assignedColor, themeColor) < 50) {
                // Color clashes. Save it to be pushed back to the pool later.
                clashedColors.push(assignedColor);
                continue;
            }

            foundColor = true;
            break;
        }

        // Push any skipped/clashed colors back to the end of the pool so they aren't permanently lost
        if (clashedColors.length > 0) {
            colorPool.push(...clashedColors);
        }

        if (!foundColor) {
            // Edge case: Too many groups, or all remaining colors clashed.
            // Recycle colors but add a pattern flag
            assignedColor = TILE_PALETTE[groupCount % TILE_PALETTE.length];
            isPattern = true;
        }

        const colorData = { color: assignedColor, pattern: isPattern };
        groupColorMap.set(groupId, colorData);
        groupCount++;

        return colorData;
    }

    /**
     * Return a color back to the pool when a group is dissolved.
     */
    function releaseGroupColor(groupId) {
        if (groupColorMap.has(groupId)) {
            const data = groupColorMap.get(groupId);
            if (!data.pattern) {
                // Only return to pool if it wasn't a recycled patterned color
                colorPool.push(data.color);
            }
            groupColorMap.delete(groupId);
            groupCount--;
        }
    }

    /**
     * Vivaldi identifies tabs via `.tab` elements in `#tabs-container`.
     * Tiling is technically managed in the webview container (`#webview-container`),
     * where tiled pages often exist inside `vivaldi-tree` or specific flex layouts.
     * Another approach: Vivaldi often adds a class or grouping ID to tabs that are grouped or tiled.
     * We'll map DOM state from the inner webviews/tiling grid to the tabs.
     */
    function updateTiledTabs() {
        // Vivaldi 6+ uses a class like `.mosaic` or `.tiled` on the tab or stack,
        // or uses a specific layout in the inner webview wrapper.
        // We will look for elements representing tiled views. Vivaldi wraps tiled pages in elements
        // often having classes like `tiled`, `mosaic`, or inline grid styles.

        // Let's assume Vivaldi's React state exposes tile groupings via data-attributes or classes on the tabs.
        // E.g., `data-tiled-id="group_1"` or by checking `.tab-group-indicator` for tiled stacks.
        // Since Vivaldi's exact proprietary class for "isTiled" changes, the most robust way in the UI
        // is finding tabs that share a specific grid parent or have a `.tiled` class if applied.

        // *Mocking standard Vivaldi behavior*:
        // Vivaldi tabs have an `id` like `tab-123`.
        // If they are in a tiled group, there is typically a shared identifier or they are part of a stack that is marked as tiled.

        const tabs = document.querySelectorAll('#tabs-container .tab');
        if (!tabs.length) return;

        let activeGroups = new Set();
        let tabsToProcess = Array.from(tabs);

        // Heuristic: Vivaldi dynamically adds `.tiled` to `.tab-group` and often to `.tab` elements
        // when they are part of a tiled stack.
        // We check if the tab itself is tiled, or if it belongs to a tiled stack.

        tabsToProcess.forEach(tab => {
            const isTiled = tab.classList.contains('tiled') ||
                            (tab.closest('.tab-group') && tab.closest('.tab-group').classList.contains('tiled'));

            let groupId = null;

            if (isTiled) {
                // Attempt to get a group ID. It could be the ID of the parent tab-group,
                // or a data attribute Vivaldi uses.
                const groupParent = tab.closest('.tab-group');
                if (groupParent) {
                    groupId = groupParent.id || 'group_' + groupParent.getAttribute('data-id');
                } else {
                    // Fallback: If no explicit group parent, but tabs are tiled,
                    // we might group them by the current window's active tiling grid.
                    groupId = 'global_tile_group_1';
                }

                activeGroups.add(groupId);

                // Assign Color
                const groupStyle = assignColorToGroup(groupId);

                // Apply DOM updates
                tab.classList.add('tab-tiled-link');
                tab.style.setProperty('--tile-group-color', groupStyle.color);

                if (groupStyle.pattern) {
                    tab.classList.add('pattern-stripe');
                } else {
                    tab.classList.remove('pattern-stripe');
                }

                // Update state map
                tabStateMap.set(tab, groupId);

            } else {
                // Not tiled, ensure visual cues are removed
                cleanupTab(tab);
            }
        });

        // 4.4 Dissolution: Cleanup colors for groups that no longer exist
        for (let [groupId, colorData] of groupColorMap.entries()) {
            if (!activeGroups.has(groupId)) {
                releaseGroupColor(groupId);
            }
        }
    }

    function cleanupTab(tab) {
        tab.classList.remove('tab-tiled-link', 'pattern-stripe');
        tab.style.removeProperty('--tile-group-color');
        tabStateMap.delete(tab);
        tab.classList.remove('tiled-group-hover');
    }

    function handleGroupHover(groupId, isHovering) {
        const tabs = document.querySelectorAll('.tab.tab-tiled-link');
        tabs.forEach(tab => {
            if (tabStateMap.get(tab) === groupId) {
                if (isHovering) {
                    tab.classList.add('tiled-group-hover');
                } else {
                    tab.classList.remove('tiled-group-hover');
                }
            }
        });
    }

    // Performance Constraint: <100ms. MutationObserver allows near-instant localized updates.
    let updateTimeout = null;
    const observer = new MutationObserver((mutations) => {
        // Debounce updates slightly to avoid layout thrashing during heavy DOM changes (like opening 10 tabs)
        if (updateTimeout) return;
        updateTimeout = setTimeout(() => {
            updateTiledTabs();
            updateTimeout = null;
        }, 50); // 50ms is well under the 100ms constraint
    });

    // Use Event Delegation for the hover glow effect to avoid memory leaks
    document.addEventListener('mouseover', (e) => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (tab) {
            const groupId = tabStateMap.get(tab);
            if (groupId) handleGroupHover(groupId, true);
        }
    });

    document.addEventListener('mouseout', (e) => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (tab) {
            const groupId = tabStateMap.get(tab);
            if (groupId) handleGroupHover(groupId, false);
        }
    });

    // Start observer once the browser UI is loaded
    function init() {
        const browserContainer = document.getElementById('browser');
        if (browserContainer) {
            observer.observe(browserContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-tiled-id', 'style'] // Watch for class/style changes that indicate tiling
            });
            // Initial run
            updateTiledTabs();
        } else {
            setTimeout(init, 500);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
