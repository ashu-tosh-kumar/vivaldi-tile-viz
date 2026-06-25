/**
 * Tests for the pure / stateless functions extracted from the Vivaldi mod.
 *
 * Functions under test:
 *   hexToRgb         — hex string → [r, g, b]
 *   colorDistance    — Euclidean RGB distance between two hex colours
 *   buildTilingGroups — chrome tab list → Map<tilingId, Set<tabIdString>>
 *   getTabIdentifier — DOM tab element → { id, isStack } | null
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from './helpers/extract.js';

// Load once — these functions carry no shared state.
let mod;
beforeAll(() => { mod = loadModule(); });

// ── hexToRgb ─────────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
    it('parses a full 7-char hex colour', () => {
        expect(mod.hexToRgb('#ff0000')).toEqual([255, 0, 0]);
        expect(mod.hexToRgb('#00ff00')).toEqual([0, 255, 0]);
        expect(mod.hexToRgb('#0000ff')).toEqual([0, 0, 255]);
        expect(mod.hexToRgb('#ffffff')).toEqual([255, 255, 255]);
        expect(mod.hexToRgb('#000000')).toEqual([0, 0, 0]);
    });

    it('parses a 4-char shorthand hex by doubling each nibble', () => {
        expect(mod.hexToRgb('#fff')).toEqual([255, 255, 255]);
        expect(mod.hexToRgb('#000')).toEqual([0, 0, 0]);
        expect(mod.hexToRgb('#f00')).toEqual([255, 0, 0]);
        // #abc → #aabbcc → [170, 187, 204]
        expect(mod.hexToRgb('#abc')).toEqual([170, 187, 204]);
    });

    it('handles colours from the actual palette without error', () => {
        // Spot-check a few palette entries to ensure no off-by-one in slice
        expect(mod.hexToRgb('#ef3939')).toEqual([239, 57, 57]);
        expect(mod.hexToRgb('#00b0ff')).toEqual([0, 176, 255]);
        expect(mod.hexToRgb('#d500f9')).toEqual([213, 0, 249]);
    });
});

// ── colorDistance ─────────────────────────────────────────────────────────────

describe('colorDistance', () => {
    it('returns 0 for identical colours', () => {
        expect(mod.colorDistance('#ff0000', '#ff0000')).toBe(0);
        expect(mod.colorDistance('#ffffff', '#ffffff')).toBe(0);
        expect(mod.colorDistance('#000000', '#000000')).toBe(0);
    });

    it('returns ~441.67 for black vs white (maximum possible distance)', () => {
        // sqrt(255² + 255² + 255²) ≈ 441.67
        expect(mod.colorDistance('#000000', '#ffffff')).toBeCloseTo(441.67, 1);
    });

    it('returns correct distance for a known pair (red vs blue)', () => {
        // red=[255,0,0] blue=[0,0,255] → sqrt(255²+0+255²) ≈ 360.62
        expect(mod.colorDistance('#ff0000', '#0000ff')).toBeCloseTo(360.62, 1);
    });

    it('is symmetric', () => {
        const d1 = mod.colorDistance('#ef3939', '#00b0ff');
        const d2 = mod.colorDistance('#00b0ff', '#ef3939');
        expect(d1).toBeCloseTo(d2, 10);
    });

    it('palette colours are sufficiently distant from each other (>50)', () => {
        // The clash threshold is 50; all palette pairs should exceed it so they
        // are not skipped when assigned as tile-group colours.
        const PALETTE = [
            '#ef3939', '#00b0ff', '#00e676', '#ff9100',
            '#d500f9', '#ffea00', '#1de9b6', '#f50057',
        ];
        for (let i = 0; i < PALETTE.length; i++) {
            for (let j = i + 1; j < PALETTE.length; j++) {
                const d = mod.colorDistance(PALETTE[i], PALETTE[j]);
                expect(d, `${PALETTE[i]} vs ${PALETTE[j]}`).toBeGreaterThan(50);
            }
        }
    });
});

// ── buildTilingGroups ─────────────────────────────────────────────────────────

describe('buildTilingGroups', () => {
    it('returns an empty map for an empty tab list', () => {
        // Cross-vm-realm Map instances can't be compared with toEqual; check size.
        expect(mod.buildTilingGroups([]).size).toBe(0);
    });

    it('ignores tabs that have no vivExtData field', () => {
        const tabs = [{ id: 1 }, { id: 2 }];
        expect(mod.buildTilingGroups(tabs).size).toBe(0);
    });

    it('ignores tabs with falsy vivExtData', () => {
        const tabs = [{ id: 1, vivExtData: null }, { id: 2, vivExtData: '' }];
        expect(mod.buildTilingGroups(tabs).size).toBe(0);
    });

    it('ignores tabs with malformed (non-JSON) vivExtData', () => {
        const tabs = [
            { id: 1, vivExtData: '{invalid json' },
            { id: 2, vivExtData: 'undefined' },
        ];
        expect(mod.buildTilingGroups(tabs).size).toBe(0);
    });

    it('ignores tabs where vivExtData has no tiling property', () => {
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ group: 'stack-1' }) },
            { id: 2, vivExtData: JSON.stringify({ group: 'stack-1' }) },
        ];
        expect(mod.buildTilingGroups(tabs).size).toBe(0);
    });

    it('filters out tile groups with only one member', () => {
        // A lone tiled tab can't form a tile group — needs at least two.
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
        ];
        expect(mod.buildTilingGroups(tabs).size).toBe(0);
    });

    it('groups two tabs that share a tiling.id', () => {
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 2, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
        ];
        const groups = mod.buildTilingGroups(tabs);
        expect(groups.size).toBe(1);
        // Cross-realm Set: compare via .has() + .size rather than toEqual.
        const members = groups.get('tile-a');
        expect(members.size).toBe(2);
        expect(members.has('1')).toBe(true);
        expect(members.has('2')).toBe(true);
    });

    it('stores chrome tab IDs as strings, not numbers', () => {
        const tabs = [
            { id: 42, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 99, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
        ];
        const members = mod.buildTilingGroups(tabs).get('tile-a');
        expect(members.has('42')).toBe(true);
        expect(members.has('99')).toBe(true);
        expect(members.has(42)).toBe(false); // must not be a numeric key
    });

    it('creates separate groups for distinct tiling.ids', () => {
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 2, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 3, vivExtData: JSON.stringify({ tiling: { id: 'tile-b' } }) },
            { id: 4, vivExtData: JSON.stringify({ tiling: { id: 'tile-b' } }) },
        ];
        const groups = mod.buildTilingGroups(tabs);
        expect(groups.size).toBe(2);
        const a = groups.get('tile-a');
        expect(a.size).toBe(2);
        expect(a.has('1')).toBe(true);
        expect(a.has('2')).toBe(true);
        const b = groups.get('tile-b');
        expect(b.size).toBe(2);
        expect(b.has('3')).toBe(true);
        expect(b.has('4')).toBe(true);
    });

    it('tracks tiling correctly when tabs also belong to stacks (group field)', () => {
        // Tiling is keyed on tiling.id, not group — tabs from different stacks
        // or no stack can share a tile group.
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' }, group: 'stack-1' }) },
            { id: 2, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' }, group: 'stack-1' }) },
            { id: 3, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' }, group: 'stack-2' }) },
        ];
        const groups = mod.buildTilingGroups(tabs);
        expect(groups.size).toBe(1);
        expect(groups.get('tile-a')?.size).toBe(3);
    });

    it('ignores the one-member orphan group when other valid groups exist', () => {
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 2, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 3, vivExtData: JSON.stringify({ tiling: { id: 'tile-orphan' } }) }, // lone
        ];
        const groups = mod.buildTilingGroups(tabs);
        expect(groups.size).toBe(1);
        expect(groups.has('tile-orphan')).toBe(false);
    });

    it('handles a mix of tiled, stacked-only, and bare tabs', () => {
        const tabs = [
            { id: 1, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 2, vivExtData: JSON.stringify({ tiling: { id: 'tile-a' } }) },
            { id: 3, vivExtData: JSON.stringify({ group: 'g1' }) },
            { id: 4 },
        ];
        const groups = mod.buildTilingGroups(tabs);
        expect(groups.size).toBe(1);
        expect(groups.get('tile-a')?.size).toBe(2);
    });
});

// ── getTabIdentifier ──────────────────────────────────────────────────────────

describe('getTabIdentifier', () => {
    /**
     * Minimal mock of a .tab DOM element. The real Vivaldi tab element has a
     * favicon child whose id encodes the chrome tab ID.
     */
    function makeTabEl({ faviconId, dataTabId } = {}) {
        return {
            querySelector: (sel) =>
                sel === '[id$="-favicon"]' && faviconId ? { id: faviconId } : null,
            dataset: { tabId: dataTabId },
            getAttribute: (attr) => (attr === 'data-tab-id' ? (dataTabId ?? null) : null),
        };
    }

    it('returns numeric id with isStack=false for a normal individual tab', () => {
        const tab = makeTabEl({ faviconId: 'tab-12345-favicon' });
        expect(mod.getTabIdentifier(tab)).toEqual({ id: '12345', isStack: false });
    });

    it('returns isStack=true when the favicon id contains a UUID (stack tab)', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const tab = makeTabEl({ faviconId: `tab-${uuid}-favicon` });
        expect(mod.getTabIdentifier(tab)).toEqual({ id: uuid, isStack: true });
    });

    it('falls back to data-tab-id attribute when no favicon id is present', () => {
        const tab = makeTabEl({ dataTabId: '99' });
        expect(mod.getTabIdentifier(tab)).toEqual({ id: '99', isStack: false });
    });

    it('returns null when neither favicon id nor data-tab-id is available', () => {
        const tab = makeTabEl();
        expect(mod.getTabIdentifier(tab)).toBeNull();
    });

    it('prefers favicon id over data-tab-id when both are present', () => {
        const tab = makeTabEl({ faviconId: 'tab-42-favicon', dataTabId: '99' });
        expect(mod.getTabIdentifier(tab)).toEqual({ id: '42', isStack: false });
    });

    it('returns null when favicon id does not match the expected pattern', () => {
        // An element with [id$="-favicon"] but the wrong format
        const tab = makeTabEl({ faviconId: 'something-else-favicon' });
        // Pattern: /^tab-(.+)-favicon$/ — "something-else-favicon" has no
        // "tab-" prefix, so the regex won't match.
        expect(mod.getTabIdentifier(tab)).toBeNull();
    });
});
