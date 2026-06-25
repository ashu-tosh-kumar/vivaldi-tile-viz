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
    let groupColorMap = new Map();
    let groupCount = 0;
    let tabStateMap = new WeakMap();

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
        if (!found) { color = TILE_PALETTE[groupCount % TILE_PALETTE.length]; isPattern = true; }
        const d = { color, pattern: isPattern };
        groupColorMap.set(groupId, d);
        groupCount++;
        return d;
    }

    function releaseGroupColor(groupId) {
        if (!groupColorMap.has(groupId)) return;
        const d = groupColorMap.get(groupId);
        if (!d.pattern) colorPool.push(d.color);
        groupColorMap.delete(groupId);
        groupCount--;
    }

    // ── Tab bar helpers ──────────────────────────────────────────────

    function getAllTabElements() {
        // Query the whole tab bar root so we catch second-level tabs in an
        // expanded stack (which render in their own substack strip), not just
        // the top-level strip.
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
     * Extract identifier from a tab element's favicon span.
     * Returns { id: string, isStack: boolean } or null.
     */
    function getTabIdentifier(tabEl) {
        const fav = tabEl.querySelector('[id$="-favicon"]');
        if (!fav || !fav.id) return null;
        const m = fav.id.match(/^tab-(.+)-favicon$/);
        if (!m) return null;
        const id = m[1];
        return { id, isStack: !/^\d+$/.test(id) };
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
     * All tabs sharing a tiling.id are tiled together = one group.
     * Only groups with >= 2 members are kept (a tile of one isn't a tile —
     * e.g. leftover tiling data after a tile-mate was closed).
     *
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
        const chromeTabs = await queryChromeTabs();
        const groups = buildTilingGroups(chromeTabs);

        // Invert: tabId -> tilingId
        const tabToGroup = new Map();
        groups.forEach((members, tilingId) => {
            members.forEach(id => tabToGroup.set(id, tilingId));
        });

        getAllTabElements().forEach(tabEl => {
            // Issue 3: never color a stack ("tab-group") tab. Color only the
            // individual member tabs (second level) or standalone tiled tabs.
            if (tabEl.classList.contains('tab-group')) { cleanupTab(tabEl); return; }

            const ident = getTabIdentifier(tabEl);
            if (!ident || ident.isStack) { cleanupTab(tabEl); return; }

            const tilingId = tabToGroup.get(ident.id);
            if (tilingId) {
                const style = assignColorToGroup(tilingId);
                tabEl.classList.add('tab-tiled-link');
                tabEl.style.setProperty('--tile-group-color', style.color);
                tabEl.classList.toggle('pattern-stripe', style.pattern);
                tabStateMap.set(tabEl, tilingId);
            } else {
                cleanupTab(tabEl);
            }
        });

        // Release colors for tile groups that no longer exist. Keyed off the
        // tiling data (not DOM visibility) so a collapsed stack's tiled tabs
        // keep their color when the stack is expanded again.
        for (const [gid] of groupColorMap.entries()) {
            if (!groups.has(gid)) releaseGroupColor(gid);
        }
    }

    function cleanupTab(tab) {
        if (tab.classList.contains('tab-tiled-link')) {
            tab.classList.remove('tab-tiled-link', 'pattern-stripe', 'tiled-group-hover');
            tab.style.removeProperty('--tile-group-color');
            tabStateMap.delete(tab);
        }
    }

    // ── Hover glow ───────────────────────────────────────────────────

    document.addEventListener('mouseover', e => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (!tab) return;
        const gid = tabStateMap.get(tab);
        if (gid) document.querySelectorAll('.tab.tab-tiled-link').forEach(t => {
            if (tabStateMap.get(t) === gid) t.classList.add('tiled-group-hover');
        });
    });

    document.addEventListener('mouseout', e => {
        const tab = e.target.closest('.tab.tab-tiled-link');
        if (!tab) return;
        const gid = tabStateMap.get(tab);
        if (gid) document.querySelectorAll('.tab.tab-tiled-link').forEach(t => {
            if (tabStateMap.get(t) === gid) t.classList.remove('tiled-group-hover');
        });
    });

    // ── Lifecycle ────────────────────────────────────────────────────

    let updateTimeout = null;
    function scheduleUpdate() {
        if (updateTimeout) return;
        updateTimeout = setTimeout(() => { updateTiledTabs(); updateTimeout = null; }, 150);
    }

    function init() {
        const browser = document.getElementById('browser');
        if (!browser) { setTimeout(init, 500); return; }
        log('TileViz initialized');
        new MutationObserver(scheduleUpdate).observe(browser, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['class', 'style']
        });
        setTimeout(updateTiledTabs, 1000);
        setInterval(updateTiledTabs, 2000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

})();
