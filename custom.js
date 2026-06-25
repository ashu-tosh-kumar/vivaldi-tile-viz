/**
 * Vivaldi Tiled Tabs Dynamic Color-Linking Mod
 *
 * Detects tiled tab groups from each tab's vivExtData.tiling.id (the
 * authoritative tile-group identifier), then maps them to tab elements
 * in the tab bar and colors the individual member tabs.
 *
 * Key Vivaldi 8.x DOM facts:
 *   - Tab bar `.tab` elements do NOT have an `id` attribute.
 *   - Each tab's favicon span has id="tab-{ID}-favicon" where ID is either
 *     a numeric chrome tab ID (individual) or UUID (tab stack).
 *   - Tiled tabs carry vivExtData.tiling = { id, index, layout, type }.
 *     All tabs sharing the same tiling.id form ONE tile group, regardless
 *     of whether they also belong to a tab stack (vivExtData.group).
 *   - A single stack can hold multiple distinct tile groups, and tiled
 *     tabs need not be in any stack — so tiling.id, not group, is the key.
 *   - Stack ("tab-group") tabs are never colored; only the individual
 *     member tabs (second level) or standalone tiled tabs are.
 */

(function () {
    'use strict';

    const TILE_DEBUG = false;
    function log(...args) {
        if (TILE_DEBUG) console.log('[TileViz]', ...args);
    }

    const TILE_PALETTE = [
        "#ef3939", "#00b0ff", "#00e676", "#ff9100",
        "#d500f9", "#ffea00", "#1de9b6", "#f50057"
    ];

    let colorPool = [...TILE_PALETTE];
    // Colors released this cycle; flushed back to colorPool at the START of the
    // next cycle so they can't be immediately reassigned in the same pass.
    let pendingPool = [];
    let groupColorMap = new Map();
    // Monotonic counter used only for overflow pattern index — never decremented,
    // so it can't drift negative the way groupCount-- could.
    let assignCount = 0;
    let tabStateMap = new WeakMap();
    // groupId -> Set<tabEl>: rebuilt each update cycle for O(1) hover lookup.
    let groupTabsMap = new Map();
    let chromeTabsListenersAttached = false;

    // ── Color assignment ─────────────────────────────────────────────

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
        return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
    }

    function getThemeColor() {
        const browser = document.getElementById('browser');
        if (!browser) return null;
        const s = window.getComputedStyle(browser);
        let v = s.getPropertyValue('--colorAccentBg').trim() || s.getPropertyValue('--colorBg').trim();
        if (!v) return null;
        if (v.startsWith('#')) return v;
        const m = v.match(/\d+/g);
        if (m && m.length >= 3)
            return "#" + m.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join("");
        return null;
    }

    function flushPendingColors() {
        if (pendingPool.length > 0) {
            colorPool.push(...pendingPool);
            pendingPool = [];
        }
    }

    function assignColorToGroup(groupId) {
        if (groupColorMap.has(groupId)) return groupColorMap.get(groupId);
        const theme = getThemeColor();
        let isPattern = false, color, found = false, clashed = [];
        while (colorPool.length > 0) {
            color = colorPool.shift();
            if (theme && colorDistance(color, theme) < 50) { clashed.push(color); continue; }
            found = true; break;
        }
        if (clashed.length) colorPool.push(...clashed);
        if (!found) { color = TILE_PALETTE[assignCount % TILE_PALETTE.length]; isPattern = true; }
        const d = { color, pattern: isPattern };
        groupColorMap.set(groupId, d);
        assignCount++;
        return d;
    }

    function releaseGroupColor(groupId) {
        if (!groupColorMap.has(groupId)) return;
        const d = groupColorMap.get(groupId);
        // Stage to pendingPool so the color isn't immediately available for
        // reassignment in this same update cycle (prevents color thrash).
        if (!d.pattern) pendingPool.push(d.color);
        groupColorMap.delete(groupId);
    }

    // ── Tab bar helpers ──────────────────────────────────────────────

    function getTabBarContainers() {
        const selectors = [
            '#tabs-tabbar-container',
            '#tabs-container',
            '.tabbar-wrapper',
            '.tab-strip',
        ];
        const found = selectors.map(s => document.querySelector(s)).filter(Boolean);
        return found.length > 0 ? found : [document.getElementById('browser')].filter(Boolean);
    }

    function getAllTabElements() {
        for (const sel of [
            '#tabs-tabbar-container .tab', '#tabs-container .tab',
            '.tabbar-wrapper .tab', '.tab-strip .tab',
        ]) {
            const t = document.querySelectorAll(sel);
            if (t.length > 0) return Array.from(t);
        }
        return Array.from(document.querySelectorAll('#browser .tab'));
    }

    /**
     * Extract identifier from a tab element.
     * Tries the favicon id pattern first, then data-tab-id as fallback.
     * Returns { id: string, isStack: boolean } or null if not yet available.
     */
    function getTabIdentifier(tabEl) {
        const fav = tabEl.querySelector('[id$="-favicon"]');
        if (fav && fav.id) {
            const m = fav.id.match(/^tab-(.+)-favicon$/);
            if (m) {
                const id = m[1];
                return { id, isStack: !/^\d+$/.test(id) };
            }
        }
        const dataId = tabEl.dataset.tabId || tabEl.getAttribute('data-tab-id');
        if (dataId) return { id: dataId, isStack: false };
        return null;
    }

    // ── chrome.tabs API bridge ───────────────────────────────────────

    function queryChromeTabs() {
        return new Promise(resolve => {
            if (typeof chrome === 'undefined' || !chrome.tabs) { resolve([]); return; }
            chrome.tabs.query({ currentWindow: true }, tabs => resolve(tabs || []));
        });
    }

    /**
     * Build tile groups from each tab's vivExtData.tiling.id.
     * Returns Map<tilingId, Set<tabIdString>>
     */
    function buildTilingGroups(chromeTabs) {
        const groups = new Map();
        chromeTabs.forEach(ct => {
            if (!ct.vivExtData) return;
            let ext;
            try { ext = JSON.parse(ct.vivExtData); } catch { return; }
            const tilingId = ext.tiling && ext.tiling.id;
            if (!tilingId) return;
            if (!groups.has(tilingId)) groups.set(tilingId, new Set());
            groups.get(tilingId).add(ct.id.toString());
        });
        for (const [tilingId, members] of groups) {
            if (members.size < 2) groups.delete(tilingId);
        }
        log(`Found ${groups.size} tile group(s)`);
        groups.forEach((members, id) => log(`  ${id}: [${Array.from(members).join(', ')}]`));
        return groups;
    }

    // ── Main update ──────────────────────────────────────────────────

    async function updateTiledTabs() {
        // Flush colors released last cycle back into the pool now that a full
        // cycle has passed — prevents immediate reassignment of the same color.
        flushPendingColors();

        const chromeTabs = await queryChromeTabs();
        const groups = buildTilingGroups(chromeTabs);

        const tabToGroup = new Map();
        groups.forEach((members, tilingId) => {
            members.forEach(id => tabToGroup.set(id, tilingId));
        });

        // Rebuild hover cache each cycle
        groupTabsMap.clear();

        getAllTabElements().forEach(tabEl => {
            if (tabEl.classList.contains('tab-group')) { cleanupTab(tabEl); return; }

            const ident = getTabIdentifier(tabEl);
            // Don't clean up tabs we can't identify — the favicon may be
            // temporarily absent during load or animation. Skip instead.
            if (!ident) return;
            if (ident.isStack) { cleanupTab(tabEl); return; }

            const tilingId = tabToGroup.get(ident.id);
            if (tilingId) {
                const style = assignColorToGroup(tilingId);
                tabEl.classList.add('tab-tiled-link');
                tabEl.classList.toggle('pattern-stripe', style.pattern);
                tabStateMap.set(tabEl, tilingId);

                if (!groupTabsMap.has(tilingId)) groupTabsMap.set(tilingId, new Set());
                groupTabsMap.get(tilingId).add(tabEl);

                const wrapper = tabEl.closest('.tab-wrapper');
                if (wrapper) {
                    wrapper.classList.add('tab-tiled-wrapper');
                    wrapper.style.setProperty('--tile-group-color', style.color);
                    wrapper.classList.toggle('tab-tiled-wrapper-stripe', style.pattern);
                }
            } else {
                cleanupTab(tabEl);
            }
        });

        for (const [gid] of groupColorMap.entries()) {
            if (!groups.has(gid)) releaseGroupColor(gid);
        }
    }

    function cleanupTab(tab) {
        if (tab.classList.contains('tab-tiled-link')) {
            tab.classList.remove('tab-tiled-link', 'pattern-stripe', 'tiled-group-hover');
            tabStateMap.delete(tab);
            const wrapper = tab.closest('.tab-wrapper');
            if (wrapper) {
                wrapper.classList.remove('tab-tiled-wrapper', 'tab-tiled-wrapper-stripe');
                wrapper.style.removeProperty('--tile-group-color');
            }
        }
    }

    // ── Hover glow ───────────────────────────────────────────────────

    document.addEventListener('mouseover', e => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (!tab) return;
        const gid = tabStateMap.get(tab);
        if (!gid) return;
        const peers = groupTabsMap.get(gid);
        if (peers) peers.forEach(t => t.classList.add('tiled-group-hover'));
    });

    document.addEventListener('mouseout', e => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (!tab) return;
        const gid = tabStateMap.get(tab);
        if (!gid) return;
        const peers = groupTabsMap.get(gid);
        if (peers) peers.forEach(t => t.classList.remove('tiled-group-hover'));
    });

    // ── Lifecycle ────────────────────────────────────────────────────

    let updateTimeout = null;
    function scheduleUpdate() {
        if (updateTimeout) return;
        updateTimeout = setTimeout(() => { updateTiledTabs(); updateTimeout = null; }, 150);
    }

    function attachTabBarObservers() {
        const containers = getTabBarContainers();
        containers.forEach(container => {
            new MutationObserver(scheduleUpdate).observe(container, {
                childList: true, subtree: true,
                attributes: true,
                // vivExtData changes reach us via chrome.tabs events, not DOM attrs.
                // Observe class/style for tab state, and data-tab-id as fallback id.
                attributeFilter: ['class', 'style', 'data-tab-id'],
            });
        });
        log(`TileViz: observing ${containers.length} tab bar container(s)`);
    }

    function attachChromeTabEvents() {
        if (chromeTabsListenersAttached) return;
        if (typeof chrome === 'undefined' || !chrome.tabs) return;
        // These fire when vivExtData (tiling) changes, tabs open/close, or move.
        ['onUpdated', 'onRemoved', 'onAttached', 'onDetached'].forEach(evt => {
            if (chrome.tabs[evt]) chrome.tabs[evt].addListener(scheduleUpdate);
        });
        chromeTabsListenersAttached = true;
        log('TileViz: chrome.tabs events attached');
    }

    function init() {
        const browser = document.getElementById('browser');
        if (!browser) { setTimeout(init, 500); return; }
        log('TileViz initialized');
        attachTabBarObservers();
        attachChromeTabEvents();
        setTimeout(updateTiledTabs, 1000);
        // Infrequent safety net — covers edge cases MutationObserver may miss
        // (e.g. theme color changes that affect clash detection).
        setInterval(updateTiledTabs, 15000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
