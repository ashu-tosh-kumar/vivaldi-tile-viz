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

describe('runUpdate serialisation', () => {
    it('never runs two updates concurrently and re-schedules a queued one', async () => {
        let inFlight = 0, maxInFlight = 0, calls = 0;
        const releases = [];
        const timers = [];
        const m = loadModule({
            chrome: {
                tabs: {
                    query: (_, cb) => {
                        calls++; inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
                        releases.push(() => { inFlight--; cb([{ id: 1 }]); });
                    },
                },
            },
            globals: { setTimeout: (fn) => { timers.push(fn); return timers.length; } },
        });

        const first = m.runUpdate();
        const second = m.runUpdate(); // arrives while first is awaiting the query
        await second;
        expect(calls).toBe(1);

        releases.shift()();
        await first;
        expect(maxInFlight).toBe(1);
        // The overlapping request must not be dropped: a follow-up is scheduled.
        expect(timers.length).toBeGreaterThan(0);
    });

    it('releases the lock even if the update throws', async () => {
        let n = 0;
        const m = loadModule({
            chrome: { tabs: { query: (_, cb) => { n++; if (n === 1) throw new Error('x'); cb([{ id: 1 }]); } } },
        });
        await m.runUpdate();
        await m.runUpdate();
        expect(n).toBe(2);
    });
});
