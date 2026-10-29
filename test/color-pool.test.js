/**
 * Tests for the color-pool state machine extracted from the Vivaldi mod.
 *
 * The state machine manages a finite set of palette colours assigned to
 * tile groups.  Key invariants it must preserve:
 *
 *   - Each active group holds exactly one colour.
 *   - A released colour is NOT immediately available for reassignment
 *     (anti-thrash: it sits in pendingPool until the next cycle flush).
 *   - Once flushed, the colour re-enters the pool and can be reused.
 *   - When the pool is exhausted, groups fall back to a striped pattern.
 *   - Pattern colours are never staged to pendingPool on release (they were
 *     never taken from the pool, so they must not be returned to it).
 *
 * Each test gets a fresh module instance (fresh pool, no prior assignments).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { loadModule } from './helpers/extract.js';

const PALETTE = [
    '#ef3939', '#00b0ff', '#00e676', '#d500f9',
    '#ff9100', '#ffea00', '#1de9b6', '#f50057',
];

let mod;
beforeEach(() => { mod = loadModule(); });

// ── assignColorToGroup ────────────────────────────────────────────────────────

describe('assignColorToGroup', () => {
    it('assigns a colour from the palette to a new group', () => {
        const result = mod.assignColorToGroup('group-1');
        expect(PALETTE).toContain(result.color);
        expect(result.pattern).toBe(false);
    });

    it('is idempotent — returns the same descriptor for the same group id', () => {
        const first = mod.assignColorToGroup('group-1');
        const second = mod.assignColorToGroup('group-1');
        expect(first).toEqual(second);
    });

    it('assigns different colours to different groups', () => {
        const a = mod.assignColorToGroup('group-a');
        const b = mod.assignColorToGroup('group-b');
        expect(a.color).not.toBe(b.color);
    });

    it('removes the assigned colour from the available pool', () => {
        const before = mod.getColorPool().length;
        mod.assignColorToGroup('group-1');
        expect(mod.getColorPool().length).toBe(before - 1);
    });

    it('assigns colours in palette order (first-come, first-served)', () => {
        expect(mod.assignColorToGroup('a').color).toBe(PALETTE[0]);
        expect(mod.assignColorToGroup('b').color).toBe(PALETTE[1]);
        expect(mod.assignColorToGroup('c').color).toBe(PALETTE[2]);
    });

    it('does not deplete the pool for a group that already has a colour', () => {
        mod.assignColorToGroup('group-1'); // consumes 1
        const poolSize = mod.getColorPool().length;
        mod.assignColorToGroup('group-1'); // idempotent — should consume 0 more
        expect(mod.getColorPool().length).toBe(poolSize);
    });

    it('falls back to pattern mode (isPattern=true) when the pool is exhausted', () => {
        PALETTE.forEach((_, i) => mod.assignColorToGroup(`group-${i}`));
        expect(mod.getColorPool().length).toBe(0);

        const overflow = mod.assignColorToGroup('group-overflow');
        expect(overflow.pattern).toBe(true);
        expect(PALETTE).toContain(overflow.color);
    });

    it('does not consume pool slots for pattern-mode assignments', () => {
        PALETTE.forEach((_, i) => mod.assignColorToGroup(`group-${i}`));
        const poolSize = mod.getColorPool().length; // 0
        mod.assignColorToGroup('overflow-1');
        mod.assignColorToGroup('overflow-2');
        expect(mod.getColorPool().length).toBe(poolSize); // still 0
    });
});

// ── releaseGroupColor ─────────────────────────────────────────────────────────

describe('releaseGroupColor', () => {
    it('removes the group from the colour map', () => {
        mod.assignColorToGroup('group-1');
        mod.releaseGroupColor('group-1');
        expect(mod.getGroupColorMap().has('group-1')).toBe(false);
    });

    it('stages the colour to pendingPool rather than directly to colorPool', () => {
        mod.assignColorToGroup('group-1');
        const poolSizeBefore = mod.getColorPool().length;

        mod.releaseGroupColor('group-1');

        expect(mod.getColorPool().length).toBe(poolSizeBefore); // pool unchanged
        expect(mod.getPendingPool().length).toBe(1);             // staged here
    });

    it('stages the colour with the correct value', () => {
        const assigned = mod.assignColorToGroup('group-1');
        mod.releaseGroupColor('group-1');
        expect(mod.getPendingPool()).toContain(assigned.color);
    });

    it('does NOT stage pattern colours (they were never taken from the pool)', () => {
        PALETTE.forEach((_, i) => mod.assignColorToGroup(`group-${i}`));
        mod.assignColorToGroup('overflow'); // isPattern = true

        mod.releaseGroupColor('overflow');

        expect(mod.getPendingPool().length).toBe(0);
    });

    it('is a no-op for an unknown group id', () => {
        const poolSize = mod.getColorPool().length;
        const pendingSize = mod.getPendingPool().length;

        mod.releaseGroupColor('does-not-exist');

        expect(mod.getColorPool().length).toBe(poolSize);
        expect(mod.getPendingPool().length).toBe(pendingSize);
    });

    it('handles releasing multiple groups independently', () => {
        mod.assignColorToGroup('g1');
        mod.assignColorToGroup('g2');
        mod.releaseGroupColor('g1');
        mod.releaseGroupColor('g2');

        expect(mod.getPendingPool().length).toBe(2);
        expect(mod.getGroupColorMap().size).toBe(0);
    });
});

// ── flushPendingColors ────────────────────────────────────────────────────────

describe('flushPendingColors', () => {
    it('moves all staged colours from pendingPool back into colorPool', () => {
        mod.assignColorToGroup('g1');
        mod.assignColorToGroup('g2');
        const poolAfterAssign = mod.getColorPool().length;

        mod.releaseGroupColor('g1');
        mod.releaseGroupColor('g2');
        expect(mod.getPendingPool().length).toBe(2);

        mod.flushPendingColors();

        expect(mod.getPendingPool().length).toBe(0);
        expect(mod.getColorPool().length).toBe(poolAfterAssign + 2);
    });

    it('is a no-op when pendingPool is already empty', () => {
        const poolBefore = mod.getColorPool().length;
        mod.flushPendingColors();
        expect(mod.getColorPool().length).toBe(poolBefore);
    });

    it('does not flush the same pending colour twice if called twice', () => {
        mod.assignColorToGroup('g1');
        mod.releaseGroupColor('g1');
        mod.flushPendingColors();
        const poolAfterFirstFlush = mod.getColorPool().length;

        mod.flushPendingColors(); // second call with empty pendingPool
        expect(mod.getColorPool().length).toBe(poolAfterFirstFlush);
    });
});

// ── Anti-thrash: colour reassignment timing ───────────────────────────────────

describe('colour thrash prevention', () => {
    it('a released colour is NOT available for immediate reassignment', () => {
        const first = mod.assignColorToGroup('g1');
        mod.releaseGroupColor('g1');

        // The colour is in pendingPool, not in colorPool — the next group
        // assigned within the same cycle must receive a different colour.
        const second = mod.assignColorToGroup('g2');
        expect(second.color).not.toBe(first.color);
    });

    it('the released colour IS available again after a flush', () => {
        // Fill the entire pool so we can observe exactly which colour returns.
        PALETTE.forEach((_, i) => mod.assignColorToGroup(`group-${i}`));
        expect(mod.getColorPool().length).toBe(0);

        // Release the first group → PALETTE[0] enters pendingPool.
        mod.releaseGroupColor('group-0');
        expect(mod.getPendingPool()).toContain(PALETTE[0]);

        // Flush simulates the start of the next update cycle.
        mod.flushPendingColors();
        expect(mod.getColorPool()).toContain(PALETTE[0]);

        // A new group should now receive the recycled colour.
        const reused = mod.assignColorToGroup('group-new');
        expect(reused.color).toBe(PALETTE[0]);
        expect(reused.pattern).toBe(false);
    });

    it('a reassigned-then-released colour does not double-add to the pool', () => {
        const c = mod.assignColorToGroup('g1');
        mod.releaseGroupColor('g1');
        mod.flushPendingColors();

        // Re-assign the same colour to a new group, then release it.
        mod.assignColorToGroup('g2'); // gets c.color (first in pool)
        mod.releaseGroupColor('g2');
        mod.flushPendingColors();

        // Pool should contain exactly one copy of the colour, not two.
        expect(mod.getColorPool().filter(x => x === c.color).length).toBe(1);
    });
});

// ── Theme-colour clash avoidance ──────────────────────────────────────────────

describe('theme colour clash avoidance', () => {
    it('skips a palette colour that is too close to the browser theme colour', () => {
        // Simulate getThemeColor() returning PALETTE[0] by wiring the DOM mock
        // to return a browser element whose computed style exposes the colour.
        const themeColor = PALETTE[0]; // '#ef3939'
        const m = loadModule({
            document: {
                getElementById: (id) => (id === 'browser' ? {} : null),
            },
            window: {
                getComputedStyle: () => ({
                    getPropertyValue: (prop) =>
                        prop === '--colorAccentBg' ? themeColor : '',
                }),
            },
        });

        const result = m.assignColorToGroup('group-1');

        // PALETTE[0] clashes (distance = 0 < threshold 50) and must be skipped.
        expect(result.color).not.toBe(PALETTE[0]);
        // PALETTE[1] ('#00b0ff') is far enough away and should be chosen next.
        expect(result.color).toBe(PALETTE[1]);
        expect(result.pattern).toBe(false);
    });

    it('puts clashed colours back into the pool for future use', () => {
        const themeColor = PALETTE[0];
        const m = loadModule({
            document: { getElementById: (id) => (id === 'browser' ? {} : null) },
            window: {
                getComputedStyle: () => ({
                    getPropertyValue: (prop) =>
                        prop === '--colorAccentBg' ? themeColor : '',
                }),
            },
        });

        m.assignColorToGroup('g1'); // skips PALETTE[0], assigns PALETTE[1]

        // PALETTE[0] was clashed and re-appended to the pool, so the pool
        // should still contain it (at the end, after the non-clashed entries).
        expect(m.getColorPool()).toContain(PALETTE[0]);
    });
});

// ── Stale clash re-check (theme changes after assignment) ────────────────────

function loadWithTheme(initial) {
    const theme = { value: initial };
    const m = loadModule({
        document: { getElementById: (id) => (id === 'browser' ? {} : null) },
        window: {
            getComputedStyle: () => ({
                getPropertyValue: (prop) =>
                    prop === '--colorAccentBg' ? theme.value : '',
            }),
        },
    });
    return { m, theme };
}

describe('recheckGroupColor', () => {
    it('reassigns a group whose cached colour now clashes with the theme', () => {
        const { m, theme } = loadWithTheme('#000000');
        const before = m.assignColorToGroup('g1');
        expect(before.color).toBe(PALETTE[0]);

        // Accent colour changes (e.g. active tab switched) to match the bar.
        theme.value = PALETTE[0];
        m.recheckGroupColor('g1');

        const after = m.getGroupColorMap().get('g1');
        expect(after.color).not.toBe(PALETTE[0]);
        expect(m.colorDistance(after.color, PALETTE[0])).toBeGreaterThanOrEqual(50);
    });

    it('keeps the cached colour when it still contrasts with the theme', () => {
        const { m, theme } = loadWithTheme('#000000');
        const before = m.assignColorToGroup('g1');
        theme.value = '#ffffff';
        m.recheckGroupColor('g1');
        expect(m.getGroupColorMap().get('g1')).toBe(before);
    });

    it('does not hand the clashed colour to another group at the same time', () => {
        const { m, theme } = loadWithTheme('#000000');
        m.assignColorToGroup('g1');
        theme.value = PALETTE[0];
        m.recheckGroupColor('g1');
        const other = m.assignColorToGroup('g2');
        expect(other.color).not.toBe(PALETTE[0]);
        expect(other.color).not.toBe(m.getGroupColorMap().get('g1').color);
    });

    it('is a no-op for an unknown group or an unreadable theme', () => {
        const { m, theme } = loadWithTheme('#000000');
        m.recheckGroupColor('missing');
        m.assignColorToGroup('g1');
        theme.value = '';
        const before = m.getGroupColorMap().get('g1');
        m.recheckGroupColor('g1');
        expect(m.getGroupColorMap().get('g1')).toBe(before);
    });
});

describe('getThemeColor parsing', () => {
    it.each([
        ['#112233', '#112233'],
        ['rgb(17, 34, 51)', '#112233'],
        ['rgba(17, 34, 51, 0.5)', '#112233'],
        ['#112233cc', '#112233'],
    ])('parses %s', (input, expected) => {
        expect(loadWithTheme(input).m.getThemeColor()).toBe(expected);
    });

    it('returns null for formats it cannot parse instead of a wrong colour', () => {
        expect(loadWithTheme('hsl(210 50% 40%)').m.getThemeColor()).toBeNull();
    });
});
