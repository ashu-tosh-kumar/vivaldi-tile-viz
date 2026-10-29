/**
 * When a Vivaldi layout/version has no `.tab-wrapper` around a tab, the bar
 * must fall back to the tab element itself instead of silently rendering nothing.
 */

import { describe, it, expect } from 'vitest';
import { loadModule } from './helpers/extract.js';

function fakeEl(classes = []) {
    const set = new Set(classes);
    return {
        classes: set,
        classList: {
            add: (...c) => c.forEach(x => set.add(x)),
            remove: (...c) => c.forEach(x => set.delete(x)),
            contains: (x) => set.has(x),
            toggle: (c, force) => { if (force) set.add(c); else set.delete(c); return !!force; },
        },
        props: {},
        style: {
            setProperty(k, v) { this.owner.props[k] = v; },
            removeProperty(k) { delete this.owner.props[k]; },
        },
    };
}

function fakeTab(chromeId, wrapper = null) {
    const el = fakeEl(['tab']);
    el.style.owner = el;
    el.dataset = {};
    el.getAttribute = () => null;
    el.querySelector = () => ({ id: `tab-${chromeId}-favicon` });
    el.closest = () => wrapper;
    el.getBoundingClientRect = () => ({ left: 0, right: 10, width: 10 });
    return el;
}

function fakeWrapper() {
    const el = fakeEl(['tab-wrapper']);
    el.style.owner = el;
    el.getBoundingClientRect = () => ({ left: 0, right: 10, width: 10 });
    return el;
}

const tiled = (id) => ({ id, vivExtData: JSON.stringify({ tiling: { id: 't1' } }) });

function load(tabs, chromeTabs) {
    return loadModule({
        document: { querySelectorAll: () => tabs },
        window: {
            getComputedStyle: () => ({
                getPropertyValue: () => '',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
            }),
        },
        chrome: { tabs: { query: (_, cb) => cb(chromeTabs.value) } },
    });
}

describe('tab without a .tab-wrapper', () => {
    it('hosts the bar on the tab element itself', async () => {
        const tabs = [fakeTab(1), fakeTab(2)];
        const m = load(tabs, { value: [tiled(1), tiled(2)] });
        await m.updateTiledTabs();
        for (const t of tabs) {
            expect(t.classes.has('tab-tiled-link')).toBe(true);
            expect(t.classes.has('tab-tiled-self')).toBe(true);
            expect(t.props['--tile-group-color']).toMatch(/^#/);
        }
    });

    it('removes the self-hosted bar when the tab is no longer tiled', async () => {
        const tabs = [fakeTab(1), fakeTab(2)];
        const chromeTabs = { value: [tiled(1), tiled(2)] };
        const m = load(tabs, chromeTabs);
        await m.updateTiledTabs();
        chromeTabs.value = [{ id: 1 }, { id: 2 }];
        await m.updateTiledTabs();
        for (const t of tabs) {
            expect(t.classes.has('tab-tiled-self')).toBe(false);
            expect(t.classes.has('tab-tiled-link')).toBe(false);
            expect(t.props['--tile-group-color']).toBeUndefined();
        }
    });
});

describe('tab with a .tab-wrapper', () => {
    it('keeps using the wrapper and does not self-host', async () => {
        const w1 = fakeWrapper(), w2 = fakeWrapper();
        const tabs = [fakeTab(1, w1), fakeTab(2, w2)];
        const m = load(tabs, { value: [tiled(1), tiled(2)] });
        await m.updateTiledTabs();
        expect(w1.classes.has('tab-tiled-wrapper')).toBe(true);
        expect(tabs[0].classes.has('tab-tiled-self')).toBe(false);
    });
});
