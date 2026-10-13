// gxt NATIVE layer — the host hooks gxt calls (scheduling, backtracking,
// attribute writes). Registered once by native/install.ts.
//
// SCHEDULING. gxt calls `scheduleRevalidate` for every cell change and for
// every Ember tag dirty (gxt `dirtyCell` is the single DIRTY_TAG path), so it
// IS Glimmer's global-context `scheduleRevalidate`. Like classic
// environment.ts it ensures a backburner instance (async observers flush at the
// end of that (auto)run loop; `settled()` waits for it) and, like the classic
// renderer's `scheduleRevalidate`, it schedules ONE render pass into the
// backburner `render` queue (pending flag + `scheduleOnce`). The pass is gxt
// `flushRevalidation()` — the host-driven variant of `syncDom()` that keeps
// cells dirtied DURING the pass queued: such a write re-enters this hook, which
// re-schedules the pass, and backburner re-flushes the render queue in the same
// run loop (a write in `afterRender` loops back too). Passes per run loop are
// capped by `ENV._RERENDER_LOOP_LIMIT` (classic loopEnd parity). There is no
// timer pump and no out-of-band sync flush.
//
// RENDER SETTLED. `renderSettled()` resolves in the backburner `end` event once
// no pass is pending (classic renderer parity, including the "no run loop →
// schedule one" kick).
//
// BACKTRACKING (DEV). Every render — the initial render of a root and every
// pass — runs inside the validator's `runInTrackingTransaction`, so
// `trackedData` / `dirtyTagFor` assert "You attempted to update X, but it had
// already been used previously in the same computation".
import { DEBUG } from '@glimmer/env';
import { ENV } from '@ember/-internals/environment';
import { constructStyleDeprecationMessage } from '@ember/-internals/views/lib/system/utils';
import { warn } from '@ember/debug';
import { _backburner, _getCurrentRunLoop } from '@ember/runloop';
import toBool from '@ember/-internals/glimmer/lib/utils/to-bool';
import { flushRevalidation } from '@lifeart/gxt';
import { commitModifiers } from './modifier-manager';
import { commitComponents, updateComponents } from './component-lifecycle';
import { debug } from './validator';

export { toBool };

const RENDER_LABEL = '- While rendering:';

// ---------------------------------------------------------------- transactions
/** Run `fn` as one render transaction (DEV backtracking assertion scope). */
export function renderTransaction<T>(fn: () => T): T {
  if (!DEBUG) return fn();
  let didError = true;
  try {
    const value = debug.runInTrackingTransaction!(fn, RENDER_LABEL);
    didError = false;
    return value;
  } finally {
    // A throw leaves the transaction open (Glimmer keeps it for the error
    // stack); close it so the next render does not inherit stale consumption.
    if (didError) debug.resetTrackingTransaction!();
  }
}

// ---------------------------------------------------------------- scheduling
let pending = false;
let passesThisLoop = 0;

/** True while a render pass is scheduled but has not run yet. */
export function hasPendingRender(): boolean {
  return pending;
}

/** gxt `scheduleRevalidate` host hook. */
export function scheduleRevalidate(): void {
  _backburner.ensureInstance();
  if (!pending) {
    pending = true;
    _backburner.scheduleOnce('render', null, renderPass);
  }
}

function renderPass(): void {
  pending = false;
  if (++passesThisLoop > ENV._RERENDER_LOOP_LIMIT) {
    passesThisLoop = 0;
    throw new Error('infinite rendering invalidation detected');
  }
  renderTransaction(renderPassBody);
  // Glimmer's environment commit: install / update the modifiers the pass
  // created or invalidated, now that the pass's DOM is in place (outside the
  // render transaction — a modifier writing tracked state schedules a new pass,
  // it does not trip the backtracking assertion). Custom-manager component
  // callbacks (didCreate / didUpdate) commit first, as in Glimmer.
  commitComponents();
  commitModifiers();
}

function renderPassBody(): void {
  // Glimmer's UpdateComponentOpcode: custom managers with `updateHook` see
  // `updateComponent` on every pass, before the pass re-renders.
  updateComponents();
  flushRevalidation();
}

// ---------------------------------------------------------------- renderSettled
interface RenderSettledDeferred {
  promise: Promise<void>;
  resolve: () => void;
}

let renderSettledDeferred: RenderSettledDeferred | null = null;

/*
  Returns a promise which resolves when rendering has settled: at the end of
  the run loop, once no render pass is pending.
*/
export function renderSettled(): Promise<void> {
  if (renderSettledDeferred === null) {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => (resolve = r));
    renderSettledDeferred = { promise, resolve };
    // Without a current run loop the promise could never resolve (it resolves
    // in backburner's `end` event): start one.
    if (!_getCurrentRunLoop()) {
      _backburner.schedule('actions', null, NO_OP);
    }
  }
  return renderSettledDeferred.promise;
}

function NO_OP() {}

function onRunLoopEnd(): void {
  passesThisLoop = 0;
  if (pending) {
    // A dirty landed after the render queue drained (an earlier `end`
    // listener) or the pass was skipped because another render job threw:
    // run it in a fresh (auto)run loop instead of losing it.
    _backburner.scheduleOnce('render', null, renderPass);
    return;
  }
  if (renderSettledDeferred !== null) {
    const { resolve } = renderSettledDeferred;
    renderSettledDeferred = null;
    _backburner.join(null, resolve);
  }
}

let listening = false;
/** Hook the backburner `end` event once (native/install.ts). */
export function installRenderLoop(): void {
  if (listening) return;
  listening = true;
  _backburner.on('end', onRunLoopEnd);
}

/** Test isolation (`_resetRenderers`): forget per-run-loop bookkeeping. */
export function resetRenderLoop(): void {
  passesThisLoop = 0;
}

// ---------------------------------------------------------------- attributes
// Ember/Glimmer attribute write semantics at gxt's single attr/prop write seam
// (`$attr` / `$prop`, initial write AND every reactive re-apply; gxt
// WITH_EMBER_INTEGRATION builds only). Ported from Glimmer's
// `vm/attributes/dynamic.ts` normalizeValue + `dom/sanitized-values.ts`.
// On the attribute side, returning `undefined` makes gxt remove the attribute.
const BAD_PROTOCOLS = ['javascript:', 'vbscript:'];
const BAD_TAGS = ['A', 'AREA', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM', 'BUTTON', 'INPUT'];
const BAD_TAGS_FOR_DATA_URI = ['EMBED'];
const BAD_TAGS_FOR_DATA_PROTOCOL = ['IFRAME', 'OBJECT'];
const BAD_ATTRIBUTES = ['href', 'src', 'background', 'action', 'formaction', 'xlink:href'];
const BAD_ATTRIBUTES_FOR_DATA_URI = ['src'];
const BAD_ATTRIBUTES_FOR_DATA_PROTOCOL = ['src', 'data'];

function protocolForUrl(url: string): string {
  try {
    return new URL(url).protocol;
  } catch {
    // Not an absolute URL: there is no scheme, so it cannot be one of the bad
    // protocols (none of them can be a base URI either) — Glimmer parity.
    return ':';
  }
}

function sanitize(element: Element, name: string, value: string): string {
  const tagName = element.tagName.toUpperCase();
  if (BAD_TAGS.includes(tagName) && BAD_ATTRIBUTES.includes(name)) {
    if (BAD_PROTOCOLS.includes(protocolForUrl(value))) return `unsafe:${value}`;
  }
  if (
    BAD_TAGS_FOR_DATA_PROTOCOL.includes(tagName) &&
    BAD_ATTRIBUTES_FOR_DATA_PROTOCOL.includes(name)
  ) {
    const protocol = protocolForUrl(value);
    if (protocol === 'data:' || BAD_PROTOCOLS.includes(protocol)) return `unsafe:${value}`;
  }
  if (BAD_TAGS_FOR_DATA_URI.includes(tagName) && BAD_ATTRIBUTES_FOR_DATA_URI.includes(name)) {
    return `unsafe:${value}`;
  }
  return value;
}

function isSafeString(value: unknown): value is { toHTML(): string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toHTML?: unknown }).toHTML === 'function'
  );
}

// Glimmer's `normalizeStringValue` (dom/normalize.ts).
function normalizeStringValue(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    typeof (value as { toString?: unknown }).toString !== 'function'
  ) {
    return '';
  }
  return String(value);
}

// A trusting attribute value (`style={{{value}}}`: gxt `$_trustAttr` → the
// `trustedAttrValue` hook, registered in DEBUG only — install.ts), unwrapped by
// normalizeAttrValue below.
class TrustedAttrValue {
  constructor(readonly value: unknown) {}
}

/** gxt `trustedAttrValue` host hook (DEBUG): mark a trusting binding's value. */
export function trustedAttrValue(value: unknown): unknown {
  return value === null || value === undefined ? value : new TrustedAttrValue(value);
}

// classic environment.ts `warnIfStyleNotTrusted` (Glimmer's
// DebugStyleAttributeManager calls it on every set / update of a non-trusting
// `style` binding).
function warnIfStyleNotTrusted(value: unknown): void {
  warn(
    constructStyleDeprecationMessage(String(value)),
    value === null || value === undefined || isSafeString(value),
    { id: 'ember-htmlbars.style-xss-warning' }
  );
}

/** gxt `normalizeAttrValue` host hook. */
export function normalizeAttrValue(
  name: string,
  value: unknown,
  element: Element,
  isProp: boolean
): unknown {
  if (DEBUG) {
    // A trusting binding (`style={{{value}}}`) arrives wrapped (see
    // trustedAttrValue). Every other bound `style` is Glimmer's
    // DebugStyleAttributeManager: the gxt compiler writes a bound `style`
    // through the property side (`isProp`) and a static `style="…"` through
    // the attribute side, which Glimmer never warns about.
    if (value instanceof TrustedAttrValue) {
      value = value.value;
    } else if (isProp && name === 'style') {
      warnIfStyleNotTrusted(value);
    }
  }
  if (isProp) {
    // Glimmer InputValueDynamicAttribute: an <input> / <textarea> `value`
    // is the string `normalizeStringValue` gives (null, undefined, a value
    // without `toString` → '').
    if (name === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      return normalizeStringValue(value);
    }
    // Glimmer DefaultDynamicProperty assigns the value as-is (SafeStrings
    // become their HTML); URL-bearing properties are sanitized.
    const resolved = isSafeString(value) ? value.toHTML() : value;
    return typeof resolved === 'string' && BAD_ATTRIBUTES.includes(name)
      ? sanitize(element, name, resolved)
      : resolved;
  }
  if (
    value === false ||
    value === undefined ||
    value === null ||
    typeof value === 'function' ||
    typeof (value as { toString?: unknown }).toString !== 'function'
  ) {
    return undefined; // remove the attribute
  }
  if (value === true) return '';
  const str = isSafeString(value) ? value.toHTML() : String(value);
  return sanitize(element, name, str);
}
