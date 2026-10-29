/**
 * Tests that MutationObservers follow the tab bar when Vivaldi's UI replaces
 * the container element (an observer on a detached node never fires again).
 */

import { describe, it, expect } from 'vitest';
import { loadModule } from './helpers/extract.js';

function setup() {
    const observed = [];
    const disconnected = [];
    class FakeObserver {
        constructor() { this.targets = []; }
        observe(el) { this.targets.push(el); observed.push(el); }
        disconnect() { disconnected.push(...this.targets); }
    }
    const dom = { bar: { id: 'bar', isConnected: true }, browser: { id: 'browser', isConnected: true } };
    const m = loadModule({
        document: {
            getElementById: (id) => (id === 'browser' ? dom.browser : null),
            querySelector: (sel) => (sel === '#tabs-tabbar-container' ? dom.bar : null),
        },
        globals: { MutationObserver: FakeObserver },
    });
    return { m, dom, observed, disconnected };
}

describe('ensureObservers', () => {
    it('observes the tab bar container and #browser on first call', () => {
        const { m, dom, observed } = setup();
        m.ensureObservers();
        expect(observed).toContain(dom.bar);
        expect(observed).toContain(dom.browser);
    });

    it('does not attach a second observer to an element it already watches', () => {
        const { m, observed } = setup();
        m.ensureObservers();
        const n = observed.length;
        m.ensureObservers();
        expect(observed.length).toBe(n);
    });

    it('re-attaches to a replacement container and drops the detached one', () => {
        const { m, dom, observed, disconnected } = setup();
        m.ensureObservers();
        const old = dom.bar;
        old.isConnected = false;
        dom.bar = { id: 'bar2', isConnected: true };
        m.ensureObservers();
        expect(observed).toContain(dom.bar);
        expect(disconnected).toContain(old);
    });
});
