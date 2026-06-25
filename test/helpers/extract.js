/**
 * Dynamically extracts testable internals from the Vivaldi mod IIFE without
 * touching the original source. It works by:
 *   1. Patching the IIFE's closing line to inject an export block that assigns
 *      all testable functions/accessors onto a __TEST_EXPORTS__ global.
 *   2. Running the patched source in a Node vm sandbox that supplies the
 *      minimum browser-API surface needed for the script to initialise without
 *      crashing (document, window, chrome, etc.).
 *
 * Call loadModule() once per test (or in beforeEach) to get a fresh, isolated
 * instance with its own color-pool state.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, '../../assets/custom.js'), 'utf8');

// Injected at the end of the IIFE body (before `})()`) so it has closure
// access to all of the module's private let/const bindings.
const EXPORT_BLOCK = `
    if (typeof __TEST_EXPORTS__ !== 'undefined') {
        // Pure functions
        __TEST_EXPORTS__.hexToRgb          = hexToRgb;
        __TEST_EXPORTS__.colorDistance     = colorDistance;
        __TEST_EXPORTS__.buildTilingGroups = buildTilingGroups;
        __TEST_EXPORTS__.getTabIdentifier  = getTabIdentifier;

        // Color-pool state machine
        __TEST_EXPORTS__.assignColorToGroup = assignColorToGroup;
        __TEST_EXPORTS__.releaseGroupColor  = releaseGroupColor;
        __TEST_EXPORTS__.flushPendingColors = flushPendingColors;

        // State readers (return copies so tests can snapshot without aliasing)
        __TEST_EXPORTS__.getColorPool    = () => [...colorPool];
        __TEST_EXPORTS__.getPendingPool  = () => [...pendingPool];
        __TEST_EXPORTS__.getGroupColorMap = () => new Map(groupColorMap);

        // Hard reset between tests — restores the same initial state the
        // module has on first load. TILE_PALETTE is const so it's safe to
        // spread; colorPool/pendingPool/groupColorMap/assignCount are let.
        __TEST_EXPORTS__.resetState = () => {
            colorPool     = [...TILE_PALETTE];
            pendingPool   = [];
            groupColorMap = new Map();
            assignCount   = 0;
        };
    }
`;

// Replace the very last `})();` in the file (the IIFE call site) so the
// export block lands inside the function scope.
const patched = src.replace(/\}\)\(\);\s*$/, `${EXPORT_BLOCK}\n})();`);

if (patched === src) {
    throw new Error(
        'extract.js: failed to patch custom.js — regex did not match the IIFE end. ' +
        'The source format may have changed.'
    );
}

/**
 * Returns a fresh module instance with all testable internals exposed.
 * @param {object} overrides  Optional per-key mock overrides for the vm
 *   sandbox.  Supported keys: `document`, `window`, `chrome`.  Each value is
 *   shallow-merged over the default mock so you only need to supply what you
 *   want to change.
 */
export function loadModule(overrides = {}) {
    const __TEST_EXPORTS__ = {};

    const context = vm.createContext({
        // Minimal DOM: getElementById returns null so init() bails early
        // (schedules a retry via setTimeout which we no-op below).
        document: Object.assign(
            {
                getElementById: () => null,
                querySelector: () => null,
                querySelectorAll: () => [],
                addEventListener: () => { },
                readyState: 'complete', // triggers `else init()` branch
            },
            overrides.document || {}
        ),
        window: Object.assign(
            {
                getComputedStyle: () => ({ getPropertyValue: () => '' }),
            },
            overrides.window || {}
        ),
        chrome: Object.assign(
            {
                tabs: {
                    query: (_, cb) => cb([]),
                    onUpdated: { addListener: () => { } },
                    onRemoved: { addListener: () => { } },
                    onAttached: { addListener: () => { } },
                    onDetached: { addListener: () => { } },
                },
            },
            overrides.chrome || {}
        ),
        // No-op lifecycle hooks so the IIFE can bootstrap without side effects
        console: { log: () => { } },
        setTimeout: () => { },
        setInterval: () => { },
        MutationObserver: class { observe() { } },

        __TEST_EXPORTS__,
    });

    vm.runInContext(patched, context);
    return __TEST_EXPORTS__;
}
