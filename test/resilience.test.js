/**
 * Tests for update-pipeline resilience: failed chrome.tabs queries must not
 * wipe existing tile state, and concurrent updates must be serialised.
 */

import { describe, it, expect } from 'vitest';
import { loadModule } from './helpers/extract.js';

describe('queryChromeTabs', () => {
    it('resolves null when chrome.runtime.lastError is set', async () => {
        const m = loadModule({
            chrome: {
                runtime: { lastError: { message: 'boom' } },
                tabs: { query: (_, cb) => cb(undefined) },
            },
        });
        expect(await m.queryChromeTabs()).toBeNull();
    });

    it('resolves null when the callback gets no array', async () => {
        const m = loadModule({ chrome: { tabs: { query: (_, cb) => cb(undefined) } } });
        expect(await m.queryChromeTabs()).toBeNull();
    });

    it('resolves null when chrome.tabs is unavailable', async () => {
        const m = loadModule({ chrome: { tabs: undefined } });
        expect(await m.queryChromeTabs()).toBeNull();
    });

    it('resolves the tab list on success', async () => {
        const tabs = [{ id: 1 }];
        const m = loadModule({ chrome: { tabs: { query: (_, cb) => cb(tabs) } } });
        expect(await m.queryChromeTabs()).toBe(tabs);
    });
});

describe('updateTiledTabs when the tab query fails', () => {
    it('keeps existing group colours instead of releasing them', async () => {
        const m = loadModule({ chrome: { tabs: { query: (_, cb) => cb(undefined) } } });
        m.assignColorToGroup('g1');
        await m.updateTiledTabs();
        expect(m.getGroupColorMap().has('g1')).toBe(true);
        expect(m.getPendingPool()).toEqual([]);
    });

    it('still releases groups that genuinely disappeared', async () => {
        const m = loadModule({
            chrome: { tabs: { query: (_, cb) => cb([{ id: 1 }, { id: 2 }]) } },
        });
        m.assignColorToGroup('g1');
        await m.updateTiledTabs();
        expect(m.getGroupColorMap().has('g1')).toBe(false);
    });
});
