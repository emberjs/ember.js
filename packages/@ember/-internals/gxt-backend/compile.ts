/**
 * GXT-compatible @ember/template-compilation implementation
 *
 * This module provides runtime template compilation using the GXT runtime compiler.
 * It implements the same interface as @ember/template-compilation but uses GXT
 * for template compilation instead of Glimmer VM.
 */

// Import Ember debug utilities for attrs assertion/deprecation
import { assert as emberAssert } from '@ember/debug';
import { deprecate as emberDeprecate } from '@ember/debug';
import { getDebugFunction } from '@ember/debug';
import {
  pascalToKebab,
  isAllDigits,
  constructStyleDeprecationMessage as _constructStyleDeprecationMessage,
  isAssertionLike as _isAssertionLike,
  protectGlobal,
  isPlainHtmlTagFastPath,
  createFnHelperValue,
  MUT_CELL_SOURCE,
} from './utils';
import {
  initChildViews as _emberInitChildViews,
  getElementView as _emberGetElementView,
} from '@ember/-internals/views/lib/system/utils';
import { DEBUG } from '@glimmer/env';

// Utility functions (regex-free)

/**
 * Normalize any value to a string for DOM text/attribute rendering.
 *
 * Matches Glimmer's `normalizeStringValue` semantics (see
 * packages/@glimmer/runtime/lib/dom/normalize.ts):
 *   - null/undefined    -> ''
 *   - objects without a .toString method (e.g. Object.create(null)) -> ''
 *   - Symbol            -> 'Symbol(desc)'  (explicit String() call, not coercion)
 *   - anything else     -> String(value)
 *
 * Critically: we must use `String(value)` rather than string concatenation
 * (`'' + value`) because concatenation throws `TypeError: Cannot convert a
 * Symbol value to a string` for Symbol values, while `String(symbol)` is
 * defined to return the symbol's description in `Symbol(...)` form.
 */
function _normalizeStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  // Objects with no toString method (e.g. Object.create(null)) would throw
  // "Cannot convert object to primitive value" when stringified.
  if (typeof (value as any).toString !== 'function') return '';
  try {
    return String(value);
  } catch {
    // Defensive: an overridden toString that throws shouldn't crash render.
    return '';
  }
}

// Quoted attribute values with interpolation (`src='{{this.src}}'`) get Ember
// semantics from gxt itself: under the EMBER_ATTR_CONCAT flag its serializer
// emits `$_qStr([...])` (all-nullish parts mean the attribute is absent;
// Symbols and objects without toString coerce safely).

// `{{#in-element}}`'s insertBefore semantics arrive as the 4th MODE argument of
// `$_inElement` (gxt's EMBER_IN_ELEMENT flag).

// The in-element deferred-render drain, assigned by the `_inElementDeferQueue`
// setup block below and called by `_gxtSetIsRendering`'s end-of-pass gate and
// the `afterFlushAfterInsertQueue` host hook. Readers keep a
// `typeof === 'function'` guard: the slot is `undefined` until that block runs
// at module load.
let _drainInElementDeferQueue: (() => void) | undefined;

/** Replace all hyphens with underscores without regex */
function hyphenToUnderscore(str: string): string {
  return str.split('-').join('_');
}

/**
 * Module-local counter for fallback render-context IDs, used by
 * managers.component.handle and template.render() when no `gxtRoot` id is
 * available. The first id is 101.
 */
let _contextId = 100;

/**
 * Deep-snapshot a value returned from the `unbound` helper. `(unbound (hash
 * foo=this.x))` compiles to `unbound($__hash({ foo: () => this.x }))`: the
 * GXT `hash` builtin returns an object whose values are live getter
 * functions, not resolved primitives. To give Ember's frozen-at-first-read
 * semantics we replace those getters with their snapshot values before the
 * caching wrapper stores the result.
 */
function _unboundSnapshot(value: any): any {
  if (value == null) return value;
  const t = typeof value;
  if (t !== 'object') return value;
  if (Array.isArray(value)) return value.map(_unboundSnapshot);
  // Leave non-plain objects alone — we must not mutate component instances,
  // iterators, DOM nodes, GXT cells, helper results, etc.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return value;
  const out: any = {};
  for (const key of Object.keys(value)) {
    const v = (value as any)[key];
    // If the raw property is a zero-arg getter (e.g. `() => this.x`),
    // call it to capture the current value. Plain functions passed as
    // user callbacks must not be invoked — GXT getters are arrow-style
    // (no prototype) and are what `$__hash` emits for bindings.
    if (typeof v === 'function' && !(v as any).prototype) {
      try {
        out[key] = _unboundSnapshot((v as any)());
      } catch {
        out[key] = v;
      }
    } else {
      out[key] = _unboundSnapshot(v);
    }
  }
  return out;
}

/**
 * Touch every sub-value of a `{{hash}}` / `{{array}}` so each member's source
 * cell is captured by the surrounding tracker frame. MUST be called while a
 * tracker is active (see the capture-replay block in `itemToNode`).
 *
 * `$__hash` (glimmer-next helpers/hash.ts) returns a plain object whose keys
 * are lazy getters; reading a key invokes the underlying `() => this.x`
 * getter and reads its cell. A consumer that references only some keys leaves
 * the sibling keys' cells unsubscribed, so when a sibling's source changes the
 * effect never re-fires. Reading EVERY key here registers all of their cells
 * into the active tracker.
 *
 * `$__array` (helpers/array.ts) eagerly `unwrap`s its members at construction
 * (no lazy getters survive), so an already-built array of primitives can't be
 * re-read to recapture cells; that case (array sub-values consumed by
 * `{{#each}}`) is not handled here, pending a reactive-array source. The Array
 * branch here still captures any live member getters (when present) and
 * recurses into nested hashes inside an array.
 *
 * Read-only and defensive: any getter throw is swallowed (the value will be
 * recomputed by the effect anyway). Bounded depth guards against cycles.
 */
function _gxtCaptureHashArrayDeps(value: any, depth = 0): void {
  if (value == null || depth > 4) return;
  const t = typeof value;
  if (t !== 'object') return;
  if (value instanceof Node) return;
  if (Array.isArray(value)) {
    for (const member of value) {
      // A live member getter (kept by the $_array wrapper) — invoke to read
      // its cell; otherwise recurse into nested hashes.
      if (typeof member === 'function' && !(member as any).prototype) {
        try {
          _gxtCaptureHashArrayDeps((member as any)(), depth + 1);
        } catch {
          /* getter threw — effect will recompute */
        }
      } else {
        _gxtCaptureHashArrayDeps(member, depth + 1);
      }
    }
    return;
  }
  // Only walk plain hash-shaped objects ($__hash output). Never touch
  // component instances, DOM, cells, curried components, etc.
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return;
  if ((value as any).__isCurriedComponent) return;
  for (const key of Object.keys(value)) {
    try {
      // Reading the key invokes the $__hash lazy getter → reads the source
      // cell → captured by the active tracker. Recurse for nested hashes.
      const sub = (value as any)[key];
      _gxtCaptureHashArrayDeps(sub, depth + 1);
    } catch {
      /* getter threw — effect will recompute */
    }
  }
}

/** Replace all double-dashes with forward slashes without regex */
function doubleDashToSlash(str: string): string {
  return str.split('--').join('/');
}

/** Check if a string contains a word (surrounded by non-word-char boundaries) without regex */
function containsWord(text: string, word: string): boolean {
  let idx = 0;
  while (idx <= text.length - word.length) {
    const found = text.indexOf(word, idx);
    if (found === -1) return false;
    const before = found > 0 ? text[found - 1]! : ' ';
    const after = found + word.length < text.length ? text[found + word.length]! : ' ';
    const isWordCharBefore =
      (before >= 'a' && before <= 'z') ||
      (before >= 'A' && before <= 'Z') ||
      (before >= '0' && before <= '9') ||
      before === '_';
    const isWordCharAfter =
      (after >= 'a' && after <= 'z') ||
      (after >= 'A' && after <= 'Z') ||
      (after >= '0' && after <= '9') ||
      after === '_';
    if (!isWordCharBefore && !isWordCharAfter) return true;
    idx = found + 1;
  }
  return false;
}

/** Generate a UUID string (starts with letter, valid CSS selector / HTML ID) without regex */
function generateUUID(): string {
  const hex = '0123456789abcdef';
  // Template: 30000000-1000-4000-2000-100000000000
  const template = '30000000-1000-4000-2000-100000000000';
  let result = '';
  for (let i = 0; i < template.length; i++) {
    const ch = template[i]!;
    if (ch === '-') {
      result += '-';
    } else if (ch === '4') {
      result += '4'; // version 4
    } else if (ch >= '0' && ch <= '3') {
      const a = parseInt(ch, 10);
      result += hex[(a * 4) ^ ((Math.random() * 16) >> (a & 2))]!;
    } else {
      result += hex[Math.floor(Math.random() * 16)]!;
    }
  }
  return result;
}

/** Extract property path from getter toString that starts with 'this.' without regex */
function extractThisPath(getterStr: string): string | null {
  const marker = 'this.';
  const idx = getterStr.indexOf(marker);
  if (idx === -1) return null;
  let end = idx + marker.length;
  // Scan valid identifier chars: a-zA-Z0-9_$?.
  while (end < getterStr.length) {
    const c = getterStr[end]!;
    if (
      (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9') ||
      c === '_' ||
      c === '$' ||
      c === '?' ||
      c === '.'
    ) {
      end++;
    } else {
      break;
    }
  }
  if (end === idx + marker.length) return null;
  return getterStr.slice(idx + marker.length, end);
}

// Coerce a value to its text-node string for the reactive update path. The
// text effect is the sole updater here, so a reactive update back to a value
// with no usable toString (`Object.create(null)`, the dynamic-content "no
// toString" case) must clear the node rather than throw.
function _gxtCoerceText(v: any): string {
  if (v == null) return '';
  if (typeof v === 'object' && typeof v.toString !== 'function') return '';
  try {
    return String(v);
  } catch {
    return '';
  }
}

/**
 * Find all `as |...|` block param sections in a string, returning the names.
 * Replaces regex /as\s+\|([^|]+)\|/g
 */
function findBlockParamNames(str: string): Set<string> {
  const names = new Set<string>();
  let idx = 0;
  while (idx < str.length) {
    const asIdx = str.indexOf('as', idx);
    if (asIdx === -1) break;
    // Check that 'as' is preceded by whitespace or start, and followed by whitespace then |
    if (asIdx > 0) {
      const before = str[asIdx - 1]!;
      if (before !== ' ' && before !== '\t' && before !== '\n' && before !== '\r') {
        idx = asIdx + 2;
        continue;
      }
    }
    // Skip whitespace after 'as'
    let pos = asIdx + 2;
    while (
      pos < str.length &&
      (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')
    )
      pos++;
    if (pos >= str.length || str[pos] !== '|') {
      idx = asIdx + 2;
      continue;
    }
    // Found 'as' followed by '|', find closing '|'
    const pipeStart = pos + 1;
    const pipeEnd = str.indexOf('|', pipeStart);
    if (pipeEnd === -1) break;
    const content = str.slice(pipeStart, pipeEnd).trim();
    // Split on whitespace
    const parts = splitOnWhitespace(content);
    for (const p of parts) {
      if (p) names.add(p);
    }
    idx = pipeEnd + 1;
  }
  return names;
}

/** Split a string on whitespace without regex */
function splitOnWhitespace(str: string): string[] {
  const result: string[] = [];
  let current = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += c;
    }
  }
  if (current) result.push(current);
  return result;
}

/**
 * Find all `<lowercase.Something>` dotted tag patterns in a string.
 * Returns array of [head, tail] pairs.
 * Replaces regex /<([a-z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)\s/g
 */
function findDottedTags(str: string): Array<[string, string]> {
  const results: Array<[string, string]> = [];
  let idx = 0;
  while (idx < str.length) {
    const ltIdx = str.indexOf('<', idx);
    if (ltIdx === -1) break;
    let pos = ltIdx + 1;
    // First char must be lowercase
    if (pos >= str.length || str[pos]! < 'a' || str[pos]! > 'z') {
      idx = ltIdx + 1;
      continue;
    }
    // Read head identifier: [a-zA-Z0-9]*
    const headStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9'))
    )
      pos++;
    const head = str.slice(headStart, pos);
    // Next must be '.'
    if (pos >= str.length || str[pos] !== '.') {
      idx = ltIdx + 1;
      continue;
    }
    pos++; // skip dot
    // Next must start with [a-zA-Z]
    if (
      pos >= str.length ||
      !((str[pos]! >= 'a' && str[pos]! <= 'z') || (str[pos]! >= 'A' && str[pos]! <= 'Z'))
    ) {
      idx = ltIdx + 1;
      continue;
    }
    const tailStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9'))
    )
      pos++;
    const tail = str.slice(tailStart, pos);
    // Must be followed by whitespace
    if (
      pos < str.length &&
      (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')
    ) {
      results.push([head, tail]);
    }
    idx = pos;
  }
  return results;
}

/**
 * Find all {{attrs.X}} patterns in a string.
 * Returns array of { propName, index } objects.
 * Replaces regex /\{\{attrs\.([a-zA-Z0-9_]+)/g
 */
function findAttrsPatterns(str: string): Array<{ propName: string; index: number }> {
  const results: Array<{ propName: string; index: number }> = [];
  const marker = '{{attrs.';
  let idx = 0;
  while (idx < str.length) {
    const found = str.indexOf(marker, idx);
    if (found === -1) break;
    let pos = found + marker.length;
    const nameStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9') ||
        str[pos] === '_')
    )
      pos++;
    if (pos > nameStart) {
      results.push({ propName: str.slice(nameStart, pos), index: found });
    }
    idx = pos;
  }
  return results;
}

/**
 * Find all {{this.attrs.X}} patterns in a string.
 * Returns array of { propName, index } objects.
 * Replaces regex /\{\{this\.attrs\.([a-zA-Z0-9_]+)/g
 */
function findThisAttrsPatterns(str: string): Array<{ propName: string; index: number }> {
  const results: Array<{ propName: string; index: number }> = [];
  const marker = '{{this.attrs.';
  let idx = 0;
  while (idx < str.length) {
    const found = str.indexOf(marker, idx);
    if (found === -1) break;
    let pos = found + marker.length;
    const nameStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9') ||
        str[pos] === '_')
    )
      pos++;
    if (pos > nameStart) {
      results.push({ propName: str.slice(nameStart, pos), index: found });
    }
    idx = pos;
  }
  return results;
}

/**
 * Check if 'as |...|' block contains the word 'attrs'.
 * Replaces regex /as\s*\|[^|]*\battrs\b[^|]*\|/
 */
function hasAttrsInBlockParams(str: string): boolean {
  let idx = 0;
  while (idx < str.length) {
    const asIdx = str.indexOf('as', idx);
    if (asIdx === -1) return false;
    // 'as' can be preceded by any char (the regex has no lookbehind requirement except implicitly)
    let pos = asIdx + 2;
    // Skip optional whitespace
    while (
      pos < str.length &&
      (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')
    )
      pos++;
    if (pos >= str.length || str[pos] !== '|') {
      idx = asIdx + 2;
      continue;
    }
    const pipeStart = pos + 1;
    const pipeEnd = str.indexOf('|', pipeStart);
    if (pipeEnd === -1) return false;
    const content = str.slice(pipeStart, pipeEnd);
    // Check if 'attrs' appears as a word in this content
    if (containsWord(content, 'attrs')) return true;
    idx = pipeEnd + 1;
  }
  return false;
}

import { buildUntouchableThis } from '@glimmer/debug-util';
import { isProxy } from '@ember/-internals/utils';
// The key of a classic `Helper` instance's recompute tag.
import { RECOMPUTE_TAG } from '@ember/-internals/glimmer/lib/helper';
// The class of `templateOnly()` component definitions.
import { TemplateOnlyComponentDefinition } from '@glimmer/runtime/lib/component/template-only';
// Glimmer's URL sanitization (which tag/attribute pairs need it, and how).
import type { SimpleElement } from '@glimmer/interfaces';
import {
  requiresSanitization,
  sanitizeAttributeValue,
} from '@glimmer/runtime/lib/dom/sanitized-values';
// Import the GXT runtime compiler
// @ts-ignore - direct path to avoid GXT Babel plugin
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
  GXT_RUNTIME_SYMBOLS,
} from '@lifeart/gxt/runtime-compiler';
// The GXT Ember-dialect AST transforms live in ./ast-transforms.
// `precompileTemplate` calls `buildGxtDialectTransforms` and annotates its
// findings object with `GxtAssertFindings`; the `__gxtCommentLookup` resolver
// reads the HTML-comment registry (owned there) via `lookupGxtComment`.
import {
  buildGxtDialectTransforms,
  lookupGxtComment,
  _GXT_ON_EXT_ALIAS,
  type GxtAssertFindings,
} from './ast-transforms';

// GXT's reactive tracker (setTracker/getTracker) is needed for {{unbound}}.

// Use direct path to avoid GXT Babel plugin processing (which injects duplicate declarations)
// @ts-ignore - direct path import
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  $_GET_ARGS as _gxtGetArgs,
  $_MANAGERS,
  RENDERED_NODES_PROPERTY,
  COMPONENT_ID_PROPERTY,
  RENDERING_CONTEXT_PROPERTY,
  setIsRendering as gxtSetIsRendering,
  syncDom as _syncDomFromDirectImport,
  cellFor as _cellForFromDirectImport,
  effect as _effectFromDirectImport,
  formula as _formulaFromDirectImport,
  // GXT symbols used directly by compile.ts (DOM api patching + parent-context plumbing).
  HTMLBrowserDOMApi as _GXT_HTMLBrowserDOMApi,
  getParentContext as _gxtGetParentContext,
  // Teardown of reactive {{{trusted}}} content — see the HtmlRaw
  // cleanup-destructor site.
  registerDestructor as _gxtRegisterDestructor,
  // Namespace providers for SVG/MathML rendering
  $_SVGProvider as _gxtSVGProvider,
  $_HTMLProvider as _gxtHTMLProvider,
  $_MathMLProvider as _gxtMathMLProvider,
  // @ts-ignore - patched export for {{unbound}} helper support
  setTracker as _gxtSetTracker,
  // @ts-ignore
  getTracker as _gxtGetTracker,
  resolveRenderable as _gxtResolveRenderable,
  // Per-render-root state: `createRenderRootState` mints an isolated
  // RenderRootState and `withRenderRoot` runs a callback with gxt's
  // node-counter / parent-context / rendering-context globals swapped to it
  // (and restored after). Only `_gxtWithRootContext` (SSR) uses them.
  withRenderRoot as _gxtWithRenderRoot,
  createRenderRootState as _gxtCreateRenderRootState,
  $SLOTS_SYMBOL,
  $PROPS_SYMBOL,
  // Set by gxt on its native block wrappers ($_ucw / $_inElement); the $_tag
  // root-id re-stamp skips contexts that carry it (see the guard's use site).
  $BLOCK_WRAPPER_SYMBOL,
} from '@lifeart/gxt';
// Host hooks: the gxt runtime calls the hooks registered here.
// `registerHostHooks`, the named-block marker predicate and the each-in
// key-set signals are named exports of the pinned gxt; a dist without them
// fails at import time.
import {
  registerHostHooks as _gxtRegisterHostHooks,
  getNamedBlockName as _gxtGetNamedBlockName,
  // Native each-in key-set reactivity: gxt owns the per-object key-set
  // revision cell; ember forwards the two signals it has.
  entangleObjectKeys as _gxtEntangleObjectKeys,
  notifyObjectKeyAdded as _gxtNotifyObjectKeyAdded,
} from '@lifeart/gxt';
// Module-local seam for Ember truthiness: the canonical `emberToBool` is
// defined inside the wrapper-installer scope below; this ref lets other
// compile.ts scopes (the {{#if}}-helper cleanup paths) reach it.
let _emberToBoolRef: ((predicate: unknown) => boolean) | null = null;
// Runtime-compiled template Function() bodies reference `$_tag` /
// `$_maybeHelper` / … as free identifiers. They are bound as Function
// parameters (a snapshot of the ember-wrapped globals at compile time; module
// init runs setupGlobalScope + installEmberWrappers before any compile, so the
// snapshot is deterministic) instead of resolving through globalThis on every
// render. Build-time-compiled (.gjs) template bodies still resolve via
// globalThis, so the globals stay published.
const _GXT_SYMBOL_PARAM_NAMES = Object.keys(GXT_RUNTIME_SYMBOLS);

const cellFor = _cellForFromDirectImport;
const gxtEffect = _effectFromDirectImport;
const gxtSyncDom = _syncDomFromDirectImport;
const gxtFormula = _formulaFromDirectImport;

// `patchedEachSync` (further down in this module) wraps each-getter functions
// in reactive MergedCells using the directly-imported `gxtFormula` binding
// above. (The bundled @lifeart/gxt runtime independently writes its own
// `globalThis.__gxtFormula` slot via `setupGlobalScope`; we do not.)

// Stale-aware GXT root context isolation.
//
// A single shared root is created lazily on first render and reused for every
// subsequent render. That breaks the moment test cleanup tears down the shared
// root's rendering context: any later render would try to use the stale
// (null-element) root and crash inside GXT's DOM API with "Cannot read
// properties of null (reading 'element')".
//
// We cannot trivially per-parent isolate roots because nested renders (outlet
// re-renders, component mounts, manager.ts container renders) happen into
// DIFFERENT parent elements and still need to share the same parent-context
// chain. So instead of partitioning by parent, we keep a single ambient root
// (held in the module-local `_gxtRootContext` binding below, exposed to
// cross-file consumers via `compilePipeline.getRootContext` / `setRootContext`)
// and transparently rebuild it when the previous root has been torn down.
//
// A root is considered stale if:
//   - its RENDERING_CONTEXT slot is null/undefined (test cleanup wiped it), OR
//   - its RENDERING_CONTEXT.roots list is empty / points at a detached element.
//
// On detection, we create a fresh root via `gxtCreateRoot(document)` and
// publish it.
//
// TODO: replace the ambient root with an explicit per-app root lifetime once
// all consumers read the root through an explicit API (e.g. a second argument
// to template.render).
function _gxtRootIsStale(root: any): boolean {
  if (!root || typeof root !== 'object') return true;
  try {
    const rcProp = RENDERING_CONTEXT_PROPERTY as any;
    if (!rcProp) return false;
    const rc = root[rcProp];
    if (rc == null) return true;
    // GXT stores the DOM-attachment node on the rendering context; if its
    // element back-reference has been nulled by destroyElementSync (the path
    // test cleanup walks), the root can no longer be used for new renders.
    const anyRc: any = rc;
    if (anyRc.element === null) return true;
    if (anyRc.roots && Array.isArray(anyRc.roots) && anyRc.roots.length > 0) {
      const first = anyRc.roots[0];
      if (first && first.element === null) return true;
    }
  } catch {
    return true;
  }
  return false;
}

// The ambient GXT root context. Other modules read and replace it through
// `compilePipeline.getRootContext` / `setRootContext`.
let _gxtRootContext: any = null;
function _getGxtRootContext(): any {
  return _gxtRootContext;
}
function _setGxtRootContext(value: any): void {
  _gxtRootContext = value;
}

function _getOrCreateGxtRoot(_parentElement: Element): any {
  let root = _gxtRootContext;
  if (!root || _gxtRootIsStale(root)) {
    root = gxtCreateRoot(document);
    _gxtRootContext = root;
  }
  return root;
}

// Canonical state for the GXT component-context registry, owned by this file.
// The map is a `WeakMap` keyed by component / controller instances (or their
// prototypes for the manager.ts proto-keyed entries) whose values are a `Set`
// of every render-context that wraps the keyed object. The map underpins
// cross-cell dirtying: when a value is `set()` on a component instance, we
// walk every render-context derived from that component (which holds its own
// GXT cells installed during the initial render) and dirty the matching cell
// so `gxtEffect` re-runs and the DOM updates.
//
// Other modules fetch the map through `compilePipeline.getComponentContextsMap()`
// on every access, so the fresh WeakMap `_resetGxtComponentContexts` allocates
// at test teardown takes effect immediately.
let _gxtComponentContexts: WeakMap<object, Set<object>> | null = null;
function _getOrCreateGxtComponentContexts(): WeakMap<object, Set<object>> {
  let map = _gxtComponentContexts;
  if (!map) {
    map = new WeakMap<object, Set<object>>();
    _gxtComponentContexts = map;
  }
  return map;
}
function _resetGxtComponentContexts(): void {
  _gxtComponentContexts = new WeakMap<object, Set<object>>();
}

// Ensure the validator compat module is loaded (registers backtracking detection
// functions on globalThis that ember-gxt-wrappers.ts needs at runtime).
import '@glimmer/validator';
// `dirtyTagFor` invalidates the Ember property tag a classic `@computed`
// chain-key consumes (`tagForProperty`). The `(hash)`/`(array)` CP propagation
// in `_notifyPropertiesChanged` calls it to bump `tagFor(hashObject, member)`
// so a stable-identity memoized hash arg's `@computed('hash.member')` recomputes.
import { dirtyTagFor as _gxtDirtyTagFor } from '@glimmer/validator';

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';
import { defineEmberMountElement } from './mount-element';
// Also installs the route-outlet hooks route.ts / router.ts call (gxt-bridge).
import { defineEmberOutletElement } from './outlet';

// Typed capabilities bridge for destruction hooks. Populated by manager.ts at
// its module init time.
import {
  getGxtRenderer,
  getCurrentOutletState,
  getAmbientOwner,
  setAmbientOwner,
  setDcComponentGetter,
  getControllerOutletRerender,
  getCreateCurriedComponent,
  GXT_ARGS_SYMBOL,
} from './gxt-bridge';

// `peekInstanceCapture` exposes the last-created Ember instance, used by the
// $_tag component thunk's template-only-detection snapshots. The writer
// (`setInstanceCapture` in `./manager`) stores into a module-local.
import { peekInstanceCapture, getOwnerWithFallback, isTrackedAccessor } from './manager';

// JS reserved words cannot be used as JS variable names, so scope-binding
// injection (strict-mode templates with scopeValues) prefixes any binding
// whose normalized name collides with one of these.
const JS_RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'finally',
  'for',
  'function',
  'if',
  'in',
  'instanceof',
  'new',
  'return',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'class',
  'const',
  'enum',
  'export',
  'extends',
  'import',
  'super',
  'implements',
  'interface',
  'let',
  'package',
  'private',
  'protected',
  'public',
  'static',
  'yield',
  'await',
]);

// The Ember keyword helpers implemented by `_emberBuiltinHelpers` below. The
// keyword-name sets that follow are views of this one list.
const EMBER_KEYWORD_HELPER_NAMES: readonly string[] = [
  'array',
  'hash',
  'concat',
  'fn',
  'get',
  'mut',
  'readonly',
  'unique-id',
  'unbound',
  'helper',
  'modifier',
  '__mutGet',
];

// Built-in keyword helpers that may be passed as a named argument as-is: the
// named-arg resolved-helper guard (see the `maybeHelperInNamedArgPosition`
// rewrite in precompileTemplate) skips them.
const _GXT_NAMED_ARG_SAFE_BUILTINS = new Set([...EMBER_KEYWORD_HELPER_NAMES, 'component']);

// Built-in helpers that cannot be overridden by an owner-registered helper of
// the same name (the `helper` and `modifier` keywords are not in the list).
// Checked in this order at the two override-assert sites.
const BUILTIN_HELPER_NAMES: readonly string[] = EMBER_KEYWORD_HELPER_NAMES.filter(
  (name) => name !== 'helper' && name !== 'modifier'
);

/**
 * Build the Ember named-args object from a GXT `$_args`-shaped `args` value:
 * copy every own descriptor whose key is not `args`/`$`-prefixed (see
 * `copyOwnNamedArgs` for `unwrap`), merge the nested `args.args` bag as it is,
 * and alias the gxt-slots symbol bag as `$slots`.
 */
function buildNamedArgs(args: any, unwrap: NamedArgUnwrap = 'none'): any {
  const namedArgs: any = {};
  if (args) {
    copyOwnNamedArgs(args, namedArgs, unwrap);
    const argsObj = args['args'];
    if (argsObj && typeof argsObj === 'object') {
      for (const key of Object.keys(argsObj)) {
        if (!key.startsWith('$')) {
          const desc = Object.getOwnPropertyDescriptor(argsObj, key);
          if (desc) {
            Object.defineProperty(namedArgs, key, desc);
          }
        }
      }
    }
    const gxtSlots = args?.[$SLOTS_SYMBOL] || args?.args?.[$SLOTS_SYMBOL];
    if (gxtSlots && typeof gxtSlots === 'object') {
      _setInternalProp(namedArgs, '$slots', gxtSlots);
    }
  }
  return namedArgs;
}

/**
 * How `copyOwnNamedArgs` copies a descriptor:
 * - `'none'`: as it is;
 * - `'getters'`: a getter is wrapped so that a read resolves argument thunks
 *   and curried `(helper)` values (`resolveNamedArgValue`);
 * - `'all'`: also a value: a thunk becomes such a getter, anything else is
 *   unwrapped once (`unwrapCurriedHelper`).
 */
type NamedArgUnwrap = 'none' | 'getters' | 'all';

/** Copy `args`' own descriptors, except `args` and `$`-prefixed keys, onto `namedArgs`. */
function copyOwnNamedArgs(args: any, namedArgs: any, unwrap: NamedArgUnwrap): void {
  for (const key of Object.keys(args)) {
    if (key === 'args' || key.startsWith('$')) continue;
    const desc = Object.getOwnPropertyDescriptor(args, key);
    if (!desc) continue;
    if (unwrap !== 'none' && desc.get) {
      const origGet = desc.get;
      Object.defineProperty(namedArgs, key, {
        get() {
          return resolveNamedArgValue(origGet.call(args));
        },
        enumerable: desc.enumerable,
        configurable: desc.configurable,
      });
    } else if (unwrap === 'all' && 'value' in desc) {
      const v = desc.value;
      if (isNamedArgThunk(v)) {
        Object.defineProperty(namedArgs, key, {
          get() {
            return resolveNamedArgValue(v);
          },
          enumerable: desc.enumerable,
          configurable: desc.configurable,
        });
      } else {
        Object.defineProperty(namedArgs, key, {
          value: unwrapCurriedHelper(v),
          writable: desc.writable,
          enumerable: desc.enumerable,
          configurable: desc.configurable,
        });
      }
    } else {
      Object.defineProperty(namedArgs, key, desc);
    }
  }
}

// A plain arrow/getter function standing for an argument value. Curried
// helpers and components, `fn` helpers, mut cells and classes are values.
function isNamedArgThunk(v: any): boolean {
  return (
    typeof v === 'function' &&
    !v.__isEmberCurriedHelper &&
    !v.__isCurriedComponent &&
    !v.__isFnHelper &&
    !v.__isMutCell &&
    !v.prototype
  );
}

// Call argument thunks until a value comes out, then unwrap a curried
// `(helper)` value: `{{helper foo "..."}}` in an argument position yields the
// curried helper (or a thunk returning it), which must reach the component as
// its result, not as a function to stringify.
function resolveNamedArgValue(v: any): any {
  while (isNamedArgThunk(v)) {
    try {
      v = v();
    } catch {
      break;
    }
  }
  return unwrapCurriedHelper(v);
}

function unwrapCurriedHelper(v: any): any {
  let out = v;
  let guard = 8;
  while (typeof out === 'function' && out.__isEmberCurriedHelper && guard-- > 0) {
    try {
      out = out();
    } catch {
      break;
    }
  }
  return out;
}

// GXT passes component args either as a `$_args` object or, from `$_dc`, as a
// tagProps tuple `[props, attrs, events]` (which is then also the fw).
function isTagPropsTuple(args: any): boolean {
  return Array.isArray(args) && args.length >= 2 && Array.isArray(args[1]);
}

/**
 * Named args from a tagProps tuple: each `[name, value]` attrs entry becomes a
 * named arg (`@` stripped; a function value without a prototype becomes the
 * getter), and the tuple's gxt-slots bag becomes `$slots`.
 */
function namedArgsFromTagProps(tagProps: any): any {
  const namedArgs: any = {};
  for (const entry of tagProps[1]) {
    if (Array.isArray(entry) && entry.length >= 2) {
      let key = entry[0];
      const val = entry[1];
      if (typeof key === 'string' && key.startsWith('@')) {
        key = key.slice(1);
      }
      if (typeof val === 'function' && !val.prototype) {
        Object.defineProperty(namedArgs, key, {
          get: val,
          enumerable: true,
          configurable: true,
        });
      } else {
        namedArgs[key] = val;
      }
    }
  }
  const gxtSlots = tagProps[$SLOTS_SYMBOL];
  if (gxtSlots && typeof gxtSlots === 'object') {
    _setInternalProp(namedArgs, '$slots', gxtSlots);
  }
  return namedArgs;
}

// Parents whose HTML parsing context decides which children of raw HTML
// survive (`<tr>` in a `<table>`, `<option>` in a `<select>`); triple-stache
// content inside them is parsed in a scratch element of the same tag.
const _GXT_CONTEXTUAL_PARSE_TAGS: ReadonlySet<string> = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'colgroup',
  'select',
  'optgroup',
]);

/**
 * Render raw HTML that `getHtml()` returns (any value; falsy renders nothing)
 * as a fragment of parsed nodes followed by a `/htmlRaw` end anchor, and keep
 * it live with an effect that re-parses on change. While the HTML is empty an
 * empty `<!---->` comment stands in for it, as in the Glimmer VM.
 */
function renderReactiveHtml(getHtml: () => any): DocumentFragment {
  const placeholder = document.createComment('');
  const fragment = document.createDocumentFragment();
  // The end anchor stays in the DOM as the stable insertion point.
  const endAnchor = document.createComment('/htmlRaw');
  let contentNodes: Node[] = [];
  let isEmpty = true;

  const initialHtml = getHtml();
  if (initialHtml) {
    isEmpty = false;
    const tpl = document.createElement('template');
    tpl.innerHTML = initialHtml;
    while (tpl.content.firstChild) {
      const child = tpl.content.firstChild;
      contentNodes.push(child);
      fragment.appendChild(child);
    }
  } else {
    fragment.appendChild(placeholder);
  }
  fragment.appendChild(endAnchor);

  // Unchanged HTML keeps its nodes (DOM stability).
  let lastHtml = initialHtml;
  try {
    gxtEffect(() => {
      const html = getHtml();
      const parent = endAnchor.parentNode;
      if (!parent) return;
      if (html === lastHtml) return;
      lastHtml = html;
      if (html) {
        if (isEmpty && placeholder.parentNode === parent) {
          parent.removeChild(placeholder);
        }
        for (const n of contentNodes) {
          if (n.parentNode === parent) parent.removeChild(n);
        }
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const newNodes: Node[] = [];
        while (tpl.content.firstChild) {
          const child = tpl.content.firstChild;
          newNodes.push(child);
          parent.insertBefore(child, endAnchor);
        }
        contentNodes = newNodes;
        isEmpty = false;
      } else {
        for (const n of contentNodes) {
          if (n.parentNode === parent) parent.removeChild(n);
        }
        contentNodes = [];
        if (!isEmpty || !placeholder.parentNode) {
          parent.insertBefore(placeholder, endAnchor);
        }
        isEmpty = true;
      }
    });
  } catch {
    /* effect setup may fail */
  }
  return fragment;
}

// Render `comp` through the Ember component manager; `handle` returns either
// the rendered nodes or a thunk producing them.
function handleEmberComponent(managers: any, comp: any, namedArgs: any, fw: any, ctx: any): any {
  const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
  return typeof handleResult === 'function' ? handleResult() : handleResult;
}

/**
 * Set a GXT-internal property on an object as non-enumerable so it doesn't
 * leak into user-visible iteration (Object.keys, each-in, etc.).
 *
 * For the `$slots` key we also set the `$SLOTS_SYMBOL` alias so
 * downstream consumers that prefer the symbol lookup (e.g. the template-only
 * component render path in manager.ts, which reads `args?.[$SLOTS]`) still
 * find the slots. Without this, block-form scope-bound component calls like
 * `<Foo>body</Foo>` (where `Foo` is a strict-mode scope binding returned by
 * `template(...)`) render an empty fragment because `{{yield}}` has no slot
 * function to invoke.
 */
function _setInternalProp(obj: any, key: string, value: any): void {
  Object.defineProperty(obj, key, {
    value,
    writable: true,
    enumerable: false,
    configurable: true,
  });
  if (key === '$slots') {
    const sym = $SLOTS_SYMBOL;
    try {
      Object.defineProperty(obj, sym, {
        value,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    } catch {
      /* ignore frozen obj */
    }
  }
}

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Install Ember-aware wrappers for $_maybeHelper on globalThis
installEmberWrappers();

// Override the GXT-shipped $__and / $__or / $__not / $__eq with Ember-spec
// implementations. Build-time-compiled template Function() bodies read these
// as bare identifiers (resolved via globalThis), so the override must be
// installed on globalThis after `setupGlobalScope` (which copies the GXT
// originals onto globalThis).
//
// Semantics:
//   - and: short-circuit; return first falsy value, else last value;
//     throw if <2 args
//   - or:  short-circuit; return first truthy value, else last value;
//     throw if <2 args
//   - not: throw if !=1 arg; return boolean negation
//   - eq:  throw if !=2 args; return strict-equality boolean
//
// Empty-array-as-falsy mirrors Ember's conditional semantics so that
// `{{if (and a []) ...}}` evaluates correctly.
{
  const g = globalThis as any;
  const _unwrap = (v: any): any => {
    if (typeof v === 'function' && !v.prototype) v = v();
    if (v && typeof v === 'object' && !Array.isArray(v) && '__isCell' in v) return (v as any).value;
    return v;
  };
  const _toBool = (v: any): boolean => {
    if (Array.isArray(v) && v.length === 0) return false;
    return !!v;
  };
  const _throwArgCount = (name: string, expected: string, received: number): never => {
    const msg = `\`${name}\` expects ${expected}, received ${received}`;
    const _assert = getDebugFunction('assert');
    if (_assert) _assert(msg, false);
    throw new Error(msg);
  };
  const $__and_ember = function (...args: any[]): any {
    if (args.length < 2) _throwArgCount('and', 'at least two arguments', args.length);
    let last: any;
    for (const a of args) {
      last = _unwrap(a);
      if (!_toBool(last)) return last;
    }
    return last;
  };
  const $__or_ember = function (...args: any[]): any {
    if (args.length < 2) _throwArgCount('or', 'at least two arguments', args.length);
    let last: any;
    for (const a of args) {
      last = _unwrap(a);
      if (_toBool(last)) return last;
    }
    return last;
  };
  const $__not_ember = function (...args: any[]): any {
    if (args.length !== 1) _throwArgCount('not', 'exactly one argument', args.length);
    return !_toBool(_unwrap(args[0]));
  };
  const $__eq_ember = function (...args: any[]): any {
    if (args.length !== 2) _throwArgCount('eq', 'exactly two arguments', args.length);
    return _unwrap(args[0]) === _unwrap(args[1]);
  };
  // Installed as plain writable data properties (not protected like the
  // helpers that use `protectGlobal`).
  for (const [name, fn] of [
    ['$__and', $__and_ember],
    ['$__or', $__or_ember],
    ['$__not', $__not_ember],
    ['$__eq', $__eq_ember],
  ] as const) {
    try {
      Object.defineProperty(g, name, {
        value: fn,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } catch {
      g[name] = fn;
    }
  }
}

// Strict-mode resolver injection. Templates compiled with `strictMode: true`
// shadow the global `$_maybeHelper` with a wrapper that throws "not in
// scope" for free identifiers instead of falling back to owner.lookup. The
// shadow is installed at the OUTER (factory) scope of the emitted template
// Function() so it survives across all reactive getter closures produced by
// the compiled template — including closures invoked long after the
// enclosing `template.render()` call returns. A plain global flag would
// race here: reactive getters produced by a strict template are typically
// invoked inside a loose parent's rendering context, where a global flag
// would have already been reset.
//
// Scope-bound helpers compile to a variable reference (e.g.
// `$_maybeHelper(a_helper, ...)`) — NOT a string — so this guard only fires
// for names that were NOT resolved at compile time, i.e. genuine strict-mode
// free references. Built-in keyword helpers (fn, hash, array, get, concat,
// mut, readonly, unbound, unique-id, helper, modifier, on, __mutGet) are
// still allowed because `$_maybeHelper_ember`'s BUILTIN_HELPERS check runs
// inside the original delegate.
//
// The strict shadow is inlined directly into the emitted Function() body. It
// closes over the `$_maybeHelper` symbol parameter (the ember-wrapped
// delegate) and an inline object-literal allow-list, and uses the
// `__gxtBuiltinHelpers` parameter (`_emberBuiltinHelpers`) for the
// built-in-keyword bypass. The Function() body is cached (see
// `_functionCodeCache`), so per-template overhead is paid once.
//
// The allow-list's JS literal is built once, below.
const _GXT_STRICT_ALLOWED_NAMES = new Set<string>([
  ...EMBER_KEYWORD_HELPER_NAMES,
  'unique_id',
  'on',
  // gxtEntriesOf is injected by our each-in transform; safe in any mode.
  'gxtEntriesOf',
  // gxtGetOutletState is injected by our -get-dynamic-var transform; safe in any mode.
  'gxtGetOutletState',
]);
// Precomputed JS object literal of the allowed-names set, suitable for
// direct splicing into the emitted strict-shadow Function() body. Built
// once at module load.
const _GXT_STRICT_ALLOWED_NAMES_JS_LITERAL: string =
  '{' +
  Array.from(_GXT_STRICT_ALLOWED_NAMES)
    .map((n) => `${JSON.stringify(n)}:1`)
    .join(',') +
  '}';

// NOTE: Curried component reactive rendering is handled by itemToNode's
// __isCurriedComponent check (see below in the compile function), not by $_TO_VALUE.

// Render-pass depth counter, so $_inElement below can tell "inside an active
// GXT template.render() pass" from a top-level synchronous render entry (e.g.
// this.render in expectAssertion tests). templateFactory.render() and the
// renderer's renderComponent wraps (through `compilePipeline.withRendering`)
// bump it; `compilePipeline.isRendering()` reads it.
let _renderPassDepth = 0;
function _gxtIsRendering(): boolean {
  return _renderPassDepth > 0;
}
function _gxtSetIsRendering(on: boolean): void {
  if (on) _renderPassDepth++;
  else if (_renderPassDepth > 0) {
    _renderPassDepth--;
    // When the top-level render pass ends (depth 1 → 0) the parent's
    // DOM fragment has been committed to its target. Drain any
    // in-element deferred renders that were queued during this pass —
    // by now their compile-time literal id targets are resolvable via
    // document.getElementById. This is the synchronous drain point for
    // the renderComponent strict-mode path, which does not go through
    // the after-insert flush.
    if (_renderPassDepth === 0) {
      try {
        // The guard handles the pointer being undefined until module-load runs
        // the in-element-defer setup block below.
        const drain = _drainInElementDeferQueue;
        if (typeof drain === 'function') drain();
      } catch {
        /* ignore */
      }
    }
  }
}

// Save-restore wrapper around the render-pass depth counter, contributed to
// the bridge as `compilePipeline.withRendering`. Used by the cross-package
// renderComponent wraps in `glimmer/lib/renderer.ts`.
//
// Balanced semantics: increment on entry, decrement on exit. The in-element
// deferred-render drain is already gated on the depth-1→0 TRANSITION inside
// `_gxtSetIsRendering(false)`, so a nested renderComponent exit (2→1) never
// drains mid-parent-render — only the outermost frame's exit does.
//
// The decrement is unconditional: skipping it for nested calls (to keep
// nested exits from draining) inflated the counter permanently, leaving
// isRendering() true for every later test; the depth-gated drain already
// protects the drain timing.
function _gxtWithRendering<T>(fn: () => T): T {
  _gxtSetIsRendering(true);
  try {
    return fn();
  } finally {
    _gxtSetIsRendering(false);
  }
}

// Deferred in-element render queue. When $_inElement encounters a null
// destination during an active render pass — which happens when a nested
// component's template evaluates `{{#in-element (getElement "id")}}`
// before the outer parent's DocumentFragment has been committed to the
// live document — the block body render is queued here and run after the
// parent commit: at the end of the outermost render pass (`_gxtSetIsRendering`)
// or by the `afterFlushAfterInsertQueue` host hook that manager.ts runs after
// its after-insert flush, the earliest synchronous points at which the
// parent's DOM is in the live document.
const _inElementDeferQueue: Array<() => void> = [];
{
  const _drainImpl = () => {
    while (_inElementDeferQueue.length > 0) {
      const cb = _inElementDeferQueue.shift()!;
      try {
        cb();
      } catch (e) {
        throw e;
      }
    }
  };
  _drainInElementDeferQueue = _drainImpl;
}

// Host hook contributed via `installViewUtilsPart` (see module bottom). Runs
// AFTER manager.ts's `flushAfterInsertQueue` body completes, dispatched by the
// `_gxtBridgeFlushAfterInsertQueue` adapter in manager.ts. Drains the in-element
// deferred-render queue via the module-local `_drainInElementDeferQueue`
// pointer (assigned in the in-element block above).
function _afterFlushAfterInsertQueue(): void {
  const drain = _drainInElementDeferQueue;
  if (typeof drain === 'function') drain();
}

// Override GXT's $_inElement with an Ember-compatible version.
// GXT's native $_inElement uses GXT's component tree (addToTree/getParentContext)
// which doesn't work for Ember rendering contexts. Our version:
// 1. Returns a comment node placeholder for the main render location
// 2. Renders block content into the external element
// 3. Handles insertBefore=null (append) vs insertBefore=undefined (replace)
// 4. Defers the body render when the destination resolves to null during
//    an active render pass (render-order timing fix — the outer fragment
//    hasn't been committed yet, so document.getElementById returns null).
{
  // Track in-element rendered nodes for cleanup. WeakMap<Element, Node[]>
  const _inElementRenderedNodes = new Map<Element, Node[]>();
  // Track which elements are in append mode (insertBefore=null)
  const _inElementAppendModeElements = new WeakSet<Element>();

  (globalThis as any).$_inElement = function _emberInElement(
    elementRef: any,
    roots: (ctx: any) => any[],
    ctx: any,
    insertBeforeRef?: any
  ) {
    // Resolve the target element
    let appendRef: HTMLElement | null = null;
    if (typeof elementRef === 'function') {
      let result = elementRef();
      if (typeof result === 'function') result = result();
      if (result && typeof result === 'object' && 'value' in result) {
        appendRef = result.value;
      } else {
        appendRef = result;
      }
    } else if (elementRef && typeof elementRef === 'object' && 'value' in elementRef) {
      appendRef = elementRef.value;
    } else {
      appendRef = elementRef;
    }

    // Resolve insertBefore
    // insertBefore=null means "append" (don't clear existing content)
    // insertBefore=undefined/omitted means "replace" (clear existing first)
    //
    // gxt passes these semantics as `$_inElement`'s 4th MODE argument
    // (EMBER_IN_ELEMENT): 1 = CLEAR (default/undefined), 0 = APPEND
    // (insertBefore=null), any other literal = the Ember dev assert.
    let insertBefore: any = undefined; // undefined = replace (default)
    if (insertBeforeRef === 0) {
      insertBefore = null; // append mode
    } else if (insertBeforeRef !== undefined && insertBeforeRef !== 1) {
      emberAssert(
        `Can only pass null to insertBefore in in-element, received: ${insertBeforeRef}`,
        false
      );
    }

    // Also check if this element was previously used in append mode
    if (appendRef && appendRef instanceof Element && _inElementAppendModeElements.has(appendRef)) {
      insertBefore = null;
    }

    // Create a placeholder comment for the main render location
    const placeholder = document.createComment('');

    // Render-order timing fix: when `{{#in-element (getElement "id")}}`
    // appears inside a child component rendered from a parent template
    // whose outer DOM fragment hasn't been committed to the live document
    // yet, `document.getElementById` returns null even though the target
    // element exists in the pending parent fragment. Detect this by
    // checking _gxtIsRendering() — if true, we're mid-render and should
    // defer the block body render until after the parent commits.
    //
    // Outside of an active render pass (classic `this.render` assertion
    // tests that pass `this.someElement = null`), fall through to the
    // synchronous assertion so expectAssertion() still catches the throw.
    const _insideRenderPass = _gxtIsRendering();
    // Only defer if we have a compile-time literal id fallback to
    // re-resolve with. Without one, we cannot distinguish "render-order
    // timing bug" from "user actually passed null" — and deferring
    // would break expectAssertion tests that pass a literal null
    // destination via `{{#in-element this.someElement}}`.
    let _fallbackId = '';
    {
      if (_inElementFallbackIds.length > 0) {
        // Peek — only consume if we actually take the defer path.
        _fallbackId = _inElementFallbackIds[0] || '';
      }
    }
    if ((appendRef === null || appendRef === undefined) && _insideRenderPass && _fallbackId) {
      // Consume the peeked id.
      _inElementFallbackIds.shift();
      // Snapshot the block-body closure state so the deferred callback
      // can execute the render after the parent fragment commits.
      const _deferredInsertBefore = insertBefore;
      const _deferredCtx = ctx;
      const _deferredRoots = roots;
      // Eagerly compute the block body nodes now — the render context
      // may be torn down by the time the deferred queue drains, so we
      // materialize the DOM synchronously and just re-parent it later.
      let _eagerNodes: any[] = [];
      try {
        _eagerNodes = roots(ctx);
      } catch {
        /* fall through */
      }
      const _deferredRender = () => {
        // Re-resolve the destination. Prefer the compile-time literal id
        // (a direct document.getElementById lookup) since the reactive
        // ref we were originally given has typically cached its null
        // result and won't re-evaluate.
        let retryRef: HTMLElement | null = null;
        if (_fallbackId) {
          retryRef = document.getElementById(_fallbackId);
        }
        if (retryRef === null || retryRef === undefined || !(retryRef instanceof Element)) {
          // Genuinely unresolvable — surface the same assertion the
          // synchronous path would have thrown.
          throw new Error(
            'Assertion Failed: You cannot pass a null or undefined destination element to in-element'
          );
        }

        // Remove previously rendered in-element nodes for this target.
        const prevNodes = _inElementRenderedNodes.get(retryRef);
        if (prevNodes) {
          for (const n of prevNodes) {
            try {
              if (n.parentNode) n.parentNode.removeChild(n);
            } catch {
              /* ignore */
            }
          }
          _inElementRenderedNodes.delete(retryRef);
        }

        const deferredRenderedNodes: Node[] = [];
        if (_deferredInsertBefore === null) {
          _inElementAppendModeElements.add(retryRef);
        }
        if (_deferredInsertBefore === undefined) {
          retryRef.innerHTML = '';
        }

        // Prefer the eagerly-computed nodes; if that list is empty (e.g.
        // reactive text hadn't initialized yet), fall back to invoking
        // _deferredRoots now.
        let deferredNodes: any[] = _eagerNodes;
        if (!deferredNodes || deferredNodes.length === 0) {
          try {
            deferredNodes = _deferredRoots(_deferredCtx);
          } catch {
            /* ignore */
          }
        }
        const deferredFragment = document.createDocumentFragment();
        for (const node of deferredNodes) {
          if (node instanceof Node) {
            deferredRenderedNodes.push(node);
            deferredFragment.appendChild(node);
          } else if (typeof node === 'function') {
            const textNode = document.createTextNode('');
            const getValue = () => {
              let v = (node as any)();
              if (typeof v === 'function') v = v();
              return v == null ? '' : String(v);
            };
            textNode.textContent = getValue();
            try {
              gxtEffect(() => {
                textNode.textContent = getValue();
              });
            } catch {
              /* effect setup may fail */
            }
            deferredRenderedNodes.push(textNode);
            deferredFragment.appendChild(textNode);
          } else if (typeof node === 'string') {
            const tn = document.createTextNode(node);
            deferredRenderedNodes.push(tn);
            deferredFragment.appendChild(tn);
          } else if (typeof node === 'number' || typeof node === 'boolean') {
            const tn = document.createTextNode(String(node));
            deferredRenderedNodes.push(tn);
            deferredFragment.appendChild(tn);
          }
        }

        retryRef.appendChild(deferredFragment);
        _inElementRenderedNodes.set(retryRef, deferredRenderedNodes);
      };

      // Enqueue into the module-local queue declared adjacent to the drain
      // helper above; drained after the parent fragment commits.
      _inElementDeferQueue.push(_deferredRender);

      // Return the placeholder synchronously.
      return placeholder;
    }

    // Validate: destination must be an Element
    // Ember asserts that the destination is a DOM element (not null/undefined)
    emberAssert(
      'You cannot pass a null or undefined destination element to in-element',
      appendRef !== null && appendRef !== undefined
    );

    if (!appendRef || !(appendRef instanceof Element)) {
      // No target element or invalid — just return the placeholder
      return placeholder;
    }

    // Remove previously rendered in-element nodes for this target.
    //
    // Self-target re-render detection: a previously-issued in-element
    // placeholder marker living as a direct child of `appendRef` proves
    // that `appendRef` IS the render-pass parent element (the outer
    // template commits into it). When we're inside an active render pass
    // and that marker is present, the outer commit is about to replace
    // `appendRef`'s contents — direct insertion below would be lost.
    // Signal the self-insert path further down to re-emit
    // [content, placeholder] as a wrapper fragment so the parent commit
    // re-seats them alongside the surrounding literal siblings (e.g. the
    // "Before" / "After" text in the `appending to the root element`
    // public-in-element test).
    //
    // For an EXTERNAL target (e.g. `document.createElement('div')` outside
    // the render flow), no placeholder marker exists in `appendRef` (the
    // prior render placed it in the render-pass parent, not the external
    // div), so the direct-insert path is preserved.
    let __outerRerenderInFlight = false;
    const prevNodes = _inElementRenderedNodes.get(appendRef);
    if (prevNodes && prevNodes.length > 0 && _gxtIsRendering()) {
      const hasPrevMarker = Array.from(appendRef.childNodes).some(
        (n: any) => (n as any).__gxtInElementMarkerFor === appendRef
      );
      if (hasPrevMarker) {
        __outerRerenderInFlight = true;
      }
    }
    if (prevNodes) {
      for (const node of prevNodes) {
        try {
          if (node.parentNode) node.parentNode.removeChild(node);
        } catch {
          /* ignore */
        }
      }
      _inElementRenderedNodes.delete(appendRef);
    }
    // Also remove the prior placeholder marker so future lookups don't
    // mis-attach to a stale comment (the wrapper-fragment path emits a
    // fresh placeholder each call).
    if (__outerRerenderInFlight) {
      const stale = Array.from(appendRef.childNodes).filter(
        (n: any) => (n as any).__gxtInElementMarkerFor === appendRef
      );
      for (const n of stale) {
        try {
          (n as ChildNode).remove();
        } catch {
          /* ignore */
        }
      }
    }

    // Track rendered nodes so they can be cleaned up when the in-element is destroyed
    const renderedNodes: Node[] = [];

    // Mark the in-element destination as a "live host". The destination may be
    // a DETACHED element (e.g. `document.createElement('div')` that's never
    // appended to the document), in which case components rendered inside it
    // report `el.isConnected === false`. The manager's after-insert flush and
    // unclaimed-pool sweep treat that as "never inserted / dead" and skip
    // didInsertElement / fire spurious willDestroyElement. Tag the host so
    // those checks recognize the element as live. See the `getRootNode()`
    // host check in manager.ts (renderClassicComponent after-insert callback).
    try {
      (appendRef as any).__gxtIsInElementHost = true;
    } catch {
      /* read-only host — ignore */
    }

    // Mark element for append mode tracking
    if (insertBefore === null) {
      _inElementAppendModeElements.add(appendRef);
    }

    // Clear existing content if insertBefore is undefined (replace mode)
    if (insertBefore === undefined) {
      appendRef.innerHTML = '';
    }

    // Render block content into the external element.
    //
    // Stable component-pool parent: components rendered inside the
    // `{{#in-element}}` block (e.g. `{{modal-display}}`) must pool under a
    // parent identity that is STABLE across re-renders. Without this, the
    // initial render pools the block's components under the ambient parent
    // (often ROOT) while later re-renders push a fresh re-render context, so
    // the pool lookup misses, a brand-new instance is created, and the prior
    // one is swept as unclaimed — firing willDestroyElement on every reactive
    // change and never firing didInsertElement. The target element
    // (`appendRef`) is stable across renders, so use it as the block's
    // pool-parent key.
    const _ieRenderRoots = () => {
      const _push = getGxtRenderer()?.viewUtils?.pushParentView;
      const _pop = getGxtRenderer()?.viewUtils?.popParentView;
      if (typeof _push === 'function' && typeof _pop === 'function') {
        _push(appendRef as any);
        try {
          return roots(ctx);
        } finally {
          _pop();
        }
      }
      return roots(ctx);
    };
    const nodes = _ieRenderRoots();
    const fragment = document.createDocumentFragment();
    for (const node of nodes) {
      if (node instanceof Node) {
        renderedNodes.push(node);
        fragment.appendChild(node);
      } else if (typeof node === 'function') {
        // Dynamic content — create a reactive text node
        const textNode = document.createTextNode('');
        const getValue = () => {
          let v = node();
          if (typeof v === 'function') v = v();
          return v == null ? '' : String(v);
        };
        textNode.textContent = getValue();
        // Set up reactive tracking
        try {
          gxtEffect(() => {
            textNode.textContent = getValue();
          });
        } catch {
          /* effect setup may fail */
        }
        renderedNodes.push(textNode);
        fragment.appendChild(textNode);
      } else if (typeof node === 'string') {
        const tn = document.createTextNode(node);
        renderedNodes.push(tn);
        fragment.appendChild(tn);
      } else if (typeof node === 'number' || typeof node === 'boolean') {
        const tn = document.createTextNode(String(node));
        renderedNodes.push(tn);
        fragment.appendChild(tn);
      }
    }

    // Self-insertion detection: when appendRef is the element currently
    // being rendered (empty, not yet connected OR not yet flushed), the
    // block's placeholder will be appended to `appendRef` AS PART OF the
    // surrounding template's fragment commit. In that case, naïvely
    // appending our content to appendRef lands it BEFORE the surrounding
    // siblings (e.g. "Before"/"After" literal text), producing
    // "Whoop!BeforeAfter" instead of "BeforeWhoop!After".
    //
    // Solution: wrap our content together with the placeholder comment in
    // a DocumentFragment and return that fragment. GXT will insert the
    // whole fragment wherever `{{#in-element}}` appears in the parent
    // template, keeping the content and placeholder co-located at the
    // block's tree position — matching Glimmer VM's "appending to the
    // root element should not cause double clearing" semantics.
    //
    // We detect self-insertion heuristically: the target is empty AND we
    // are currently inside a render pass. Standard `{{#in-element
    // externalTarget}}` into a non-rendering target is unaffected.
    // Self-insert applies in two cases:
    //   (a) appendRef is empty AND we're inside an active render pass —
    //       classic first-render of a self-targeted in-element block. We
    //       return [content, placeholder] so the outer commit lands them
    //       together at the block's tree position (rather than at the head
    //       of appendRef, which would produce "Whoop!BeforeAfter").
    //   (b) The previously-rendered in-element nodes for this target were
    //       just detected as fully detached (parent re-render wiped the
    //       outer DOM via `parentElement.innerHTML = ''`). In that case
    //       direct-insertion into appendRef is futile — the parent's
    //       fragment commit follows our call and replaces everything.
    //       Returning [content, placeholder] lets the outer commit re-seat
    //       our content alongside the surrounding literal siblings.
    const isSelfInsert =
      insertBefore === null &&
      _gxtIsRendering() &&
      (appendRef.childNodes.length === 0 || __outerRerenderInFlight);
    if (isSelfInsert) {
      // Return a fragment containing [content..., placeholder]. GXT's
      // outer-template commit will insert this whole fragment at the
      // `{{#in-element}}` position in the parent tree, landing content
      // adjacent to the placeholder rather than at the head of appendRef.
      const wrapperFragment = document.createDocumentFragment();
      wrapperFragment.appendChild(fragment);
      wrapperFragment.appendChild(placeholder);
      _inElementRenderedNodes.set(appendRef, renderedNodes);
      // Tag the placeholder so future `insertBefore=null` updates know where
      // to insert — see the matching lookup in the non-self-insert path.
      (placeholder as any).__gxtInElementMarkerFor = appendRef;
      return wrapperFragment;
    }
    // For subsequent updates to a self-inserted block (same target, block
    // placeholder already in the DOM tree), insert new content BEFORE the
    // existing placeholder so the content lands at the block's position
    // rather than at the end of appendRef. This preserves the semantics
    // established by the initial self-insert path above and keeps the
    // surrounding literal siblings (e.g. "Before"/"After") intact.
    const placeholderInAppendRef = Array.from(appendRef.childNodes).find(
      (n: any) => (n as any).__gxtInElementMarkerFor === appendRef
    ) as ChildNode | undefined;
    if (insertBefore === null && placeholderInAppendRef) {
      appendRef.insertBefore(fragment, placeholderInAppendRef);
    } else {
      // Always append (for both append mode and replace mode — already cleared)
      appendRef.appendChild(fragment);
    }

    // Store rendered nodes for cleanup
    _inElementRenderedNodes.set(appendRef, renderedNodes);
    // Back-link the host → its current block placeholder. The placeholder is
    // inserted into the LIVE template tree at the `{{#in-element}}` position
    // (by the enclosing {{#if}} branch / outer commit). When the enclosing
    // `{{#if}}` collapses, that placeholder is torn out of the live DOM —
    // giving the unclaimed-pool sweep a reliable "is this in-element block
    // still active?" signal that the host DOM (which lingers until the
    // component is actually destroyed) does not provide.
    try {
      (appendRef as any).__gxtInElementPlaceholder = placeholder;
    } catch {
      /* read-only host — ignore */
    }

    return placeholder;
  };
  const _emberInElement = (globalThis as any).$_inElement;
  // Protect from setupGlobalScope overwrite using a non-writable getter
  Object.defineProperty(globalThis, '$_inElement', {
    get() {
      return _emberInElement;
    },
    set(_v: any) {
      /* ignore GXT overwrite */
    },
    configurable: false,
    enumerable: true,
  });
}

// The SafeString.toString() patch below writes the last converted SafeString
// result here; the style warn decision in `_styleEmptyGuard` (the `$_tag_ember`
// style getter) reads and clears it to tell SafeString-derived strings from
// plain strings.
let _gxtLastSafeStringResult: string | undefined;

// Patch SafeString.toString() to track when a SafeString is being converted to
// a string during GXT's quoted attribute concatenation, so the style warning
// can tell a plain string (warn) from a SafeString-derived one (no warn).
// Deferred to avoid circular deps — patches after modules are loaded.
// DEBUG-only: the sole consumer is that warning (a getDebugFunction('warn')
// channel, stripped in prod), so the prototype patch stays out of production
// bundles.
if (DEBUG) {
  setTimeout(() => {
    try {
      // Use dynamic import to avoid circular dependency during static init
      import('@ember/-internals/glimmer/lib/utils/string')
        .then((mod) => {
          const SafeString = mod.SafeString;
          if (SafeString?.prototype?.toString) {
            const origToString = SafeString.prototype.toString;
            SafeString.prototype.toString = function () {
              const result = origToString.call(this);
              _gxtLastSafeStringResult = result;
              return result;
            };
          }
        })
        .catch(() => {});
    } catch {}
  }, 0);
}

// URL sanitization is Glimmer's own (`@glimmer/runtime/lib/dom/sanitized-values`,
// imported above): `requiresSanitization` picks the tag/attribute pairs and
// `sanitizeAttributeValue` prefixes a dangerous URL with `unsafe:`. The
// `normalizeAttrValue` host hook below applies it to every gxt attribute and
// property write, and the SVG/MathML element path (`applyNsAttr`) to its bound
// values.
//
// DEBUG-only fallback: the compat layer also writes some forwarded attributes
// with a plain `setAttribute` (`...attributes` on component elements, curly
// component wrappers), outside the host hook. In development this patch runs
// those writes through the same sanitizer. Every write the hook made reaches
// this patch too; a value that already has the `unsafe:` protocol is left as
// it is, so `<embed src>` (which Glimmer always prefixes) is not prefixed twice.
if (
  DEBUG &&
  typeof Element !== 'undefined' &&
  Element.prototype &&
  (Element.prototype as any).setAttribute &&
  !(Element.prototype as any).__gxtSanitizePatched
) {
  const _origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: any): void {
    if (
      typeof value === 'string' &&
      !value.startsWith('unsafe:') &&
      requiresSanitization(this.tagName, name)
    ) {
      const sanitized = sanitizeAttributeValue(this as unknown as SimpleElement, name, value);
      return _origSetAttribute.call(this, name, sanitized as string);
    }
    return _origSetAttribute.call(this, name, value);
  };
  (Element.prototype as any).__gxtSanitizePatched = true;
}
// HTML boolean attributes — when the template writes `<option selected>` the
// GXT compiler emits `["selected", true]` (literal boolean). Browser DOM
// accepts `setAttribute("selected", "true")` which serializes as
// `selected="true"`, but tests and HTML semantics expect a bare `selected`
// (i.e. `setAttribute("selected", "")`). Same for `checked`, `disabled`,
// `multiple`, `readonly`, `autofocus`, etc. Normalize `value === true` to
// empty string for known boolean attrs so the round-tripped innerHTML
// matches Ember/Glimmer semantics.
const _HTML_BOOLEAN_ATTRS = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'readonly',
  'required',
  'reversed',
  'selected',
]);
// Ember attribute write-time semantics, registered as gxt's
// `normalizeAttrValue` host hook. It runs at gxt's $attr/$prop choke points
// (the first write and every reactive re-apply) for all namespace APIs
// (HTML/SVG/MathML), in WITH_EMBER_INTEGRATION builds. On the attr side,
// returning `undefined` removes the attribute. The style warning comes from
// `_styleEmptyGuard` in the `$_tag_ember` wrapper instead (earlier in the
// pipeline, so it is not emitted twice). A URL-bearing attribute or property
// is sanitized first, on both sides, as Glimmer's SafeDynamicAttribute /
// SafeDynamicProperty do; props need no other Ember normalization.
_gxtRegisterHostHooks({
  normalizeAttrValue: (name: string, value: any, element: any, isProp: boolean) => {
    if (typeof element?.tagName === 'string' && requiresSanitization(element.tagName, name)) {
      value = sanitizeAttributeValue(element, name, value);
    }
    if (isProp) return value;
    if (value === undefined || value === false) {
      // Ember removes the attribute entirely for undefined/false bound values.
      return undefined; // gxt remove sentinel
    }
    if (value === true && typeof name === 'string' && _HTML_BOOLEAN_ATTRS.has(name.toLowerCase())) {
      // HTML boolean attribute — write bare (empty string value) so the
      // serialized innerHTML reads `<option selected>` instead of
      // `<option selected="true">`. Non-boolean attrs with `true` still go
      // through the normal path (becoming the literal string "true"), which
      // preserves current behavior for attributes that legitimately carry
      // stringified booleans (e.g. `aria-pressed="true"`).
      return '';
    }
    if (
      typeof value === 'symbol' ||
      (value !== null && typeof value === 'object' && typeof (value as any).toString !== 'function')
    ) {
      // Symbol values throw on implicit string coercion inside setAttribute.
      // Objects with no toString method (e.g. Object.create(null)) likewise
      // throw "Cannot convert object to primitive value". Normalize these
      // explicitly to match Glimmer's normalizeStringValue semantics:
      //   Symbol(debug) -> "Symbol(debug)"
      //   Object.create(null) -> ""
      return _normalizeStringValue(value);
    }
    return value;
  },
});

// Override GXT's $__fn to support mut cells.
// GXT's $__fn unwraps function args by calling them with no args, which breaks
// mut cells (calling mutCell() returns the current value instead of the setter).
// The value is a utils.ts `createFnHelperValue` (marked `__isFnHelper`, so the
// compat layer can tell fn-helper results from GXT reactive getters, which are
// arrow fns too). It records the callback it binds, so a component argument
// holding an `(fn …)` keeps one function while the callback stays the same
// (`keepFnHelperValue`, manager.ts arg slots): Glimmer's `fn` is one function
// per call site, while the compiler re-evaluates the call on every read.
//
// The callback must run with stock fn's `this` contract: an access-asserting
// proxy in DEBUG and literal `null` in production (strict-mode callers observe
// `this === null`, asserted by the prod-only "{{fn}}: there is no `this`
// context within the callback" test). buildUntouchableThis encodes exactly
// that mode split.
const _fnHelperThis = buildUntouchableThis('`fn` helper');
{
  const g = globalThis as any;
  const originalFn = g.$__fn;
  if (originalFn) {
    g.$__fn = function $__fn_ember(fn: any, ...partialArgs: any[]) {
      const resolvePartials = () =>
        partialArgs.map((a: any) => (typeof a === 'function' && !a.__isMutCell ? a() : a));
      // If the first arg is a mut cell, don't unwrap it
      if (fn && fn.__isMutCell) {
        return createFnHelperValue(fn, (...callArgs: any[]) =>
          fn(...resolvePartials(), ...callArgs)
        );
      }
      // The callback this call binds, as far as it is known now: what a
      // 0-arg getter resolves to, else the function itself.
      let target: unknown = fn;
      // Also check if the first arg is a function that, when called, returns a mut cell
      // GXT wraps helper results in getters. ONLY probe 0-arg functions — a
      // function with declared parameters (like `handleClick = (v) => {}`) is a
      // direct handler, NOT a GXT-generated getter; probing would fire side
      // effects (e.g. test assertions) at install time, causing double-invoke
      // in {{on "click" (fn handleClick 123)}}. Getters are always 0-arg arrows.
      if (
        typeof fn === 'function' &&
        !fn.__isMutCell &&
        !fn.prototype &&
        !fn.__isFnHelper &&
        fn.length === 0
      ) {
        let fnResult: any;
        try {
          fnResult = fn();
        } catch {
          // The getter throws now; the call resolves it again (and throws there).
          fnResult = fn;
        }
        if (fnResult && fnResult.__isMutCell) {
          return createFnHelperValue(fnResult, (...callArgs: any[]) => {
            const resolvedArgs = resolvePartials();
            // Re-evaluate the getter to get the current mut cell
            const currentMut = fn();
            return currentMut(...resolvedArgs, ...callArgs);
          });
        }
        target = fnResult;
      }
      // Create a partially-applied function that resolves all getters at call time.
      // The fn arg may be a getter (arrow fn wrapping this.X) — we wrapped it
      // in compile.ts to support reactive function swaps.
      // Partial args are also getters from GXT for reactive arg updates.
      //
      // STRICT MODE FIX: scope-bound functions (e.g. `fn(handleClick, 123)` in
      // strict-mode templates where `handleClick` is a direct JS function) must
      // NOT be called as getters. A GXT-generated getter is `() => ctx.X` — it
      // takes 0 args AND returns the underlying value (possibly another function).
      // A direct handler like `handleClick = (v) => {}` may also have length 0,
      // but calling it produces a side effect and returns whatever the body
      // returns (often undefined). Only treat a 0-arg function as a getter when
      // calling it returns a *different* function or non-undefined value — and
      // even then, only if the returned value is a function (the intended
      // callable). Functions with `length >= 1` are never getters.
      const isArgGetter = (v: any) =>
        typeof v === 'function' && !v.prototype && !v.__isFnHelper && !v.__isMutCell;
      const resolveFirstArg = (v: any): any => {
        if (!isArgGetter(v)) return v;
        // Functions with declared parameters are never GXT-generated getters.
        if (v.length >= 1) return v;
        // 0-arg function: try calling. If it returns a function, treat it as a
        // getter. If it returns undefined/non-function, treat as a direct
        // handler and return the function itself (side effects are unfortunate
        // but consistent with prior behavior when the template used `this.x`).
        let produced: any;
        try {
          produced = v();
        } catch {
          return v;
        }
        if (typeof produced === 'function') return produced;
        return v;
      };
      return createFnHelperValue(target, function $__fn_partial(...callArgs: any[]) {
        // Resolve fn: detect GXT-generated getters vs direct scope handlers.
        const resolvedFn = resolveFirstArg(fn);
        // Resolve partial args: if they're getters (arrow fns), call them
        const resolvedPartials = partialArgs.map((a: any) => (isArgGetter(a) ? a() : a));
        if (typeof resolvedFn !== 'function') {
          return resolvedFn;
        }
        return resolvedFn.call(_fnHelperThis, ...resolvedPartials, ...callArgs);
      });
    };
  }
}

// NOTE: $_if reactivity is limited by GXT's async branch rendering.
// When the condition changes, GXT's IfCondition.renderBranch calls
// destroyBranch() (async) before rendering the new branch. This means
// synchronous test assertions won't see the updated DOM immediately.
// This affects tests like "yield to inverse", "isStream", etc.

// Helper: resolve all curried arg values (evaluating getters) into a snapshot.
function _resolveCurriedArgs(curried: any): {
  name: any;
  args: Record<string, any>;
  positionals: any[];
} {
  const cArgs = curried.__curriedArgs || {};
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(cArgs)) {
    resolved[key] =
      typeof value === 'function' &&
      !(value as any).__isCurriedComponent &&
      !(value as any).prototype
        ? (value as any)()
        : value;
  }
  const cPos = curried.__curriedPositionals || [];
  const resolvedPos: any[] = [];
  for (const val of cPos) {
    resolvedPos.push(
      typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype
        ? val()
        : val
    );
  }
  return { name: curried.__name, args: resolved, positionals: resolvedPos };
}

// Render infos of the curried-component marker regions that `_gxtSyncDomNow`
// re-renders (pushed by itemToNode's getter-based curried renderer, cleared at
// test cleanup).
const _curriedRenderInfos: any[] = [];

// Helper: snapshot curried args on a render info for later comparison.
function _snapshotCurriedArgs(info: any, curried: any) {
  const snap = _resolveCurriedArgs(curried);
  info.__lastSnapshot = snap;
}

// Helper: check if curried component has changed compared to last snapshot.
function _curriedComponentChanged(info: any, curried: any): boolean {
  const last = info.__lastSnapshot;
  if (!last) return true; // No previous snapshot — treat as changed
  const current = _resolveCurriedArgs(curried);
  if (last.name !== current.name) return true;
  // Compare named args
  const lastKeys = Object.keys(last.args);
  const currentKeys = Object.keys(current.args);
  if (lastKeys.length !== currentKeys.length) return true;
  for (const key of currentKeys) {
    if (last.args[key] !== current.args[key]) return true;
  }
  // Compare positionals
  if (last.positionals.length !== current.positionals.length) return true;
  for (let i = 0; i < current.positionals.length; i++) {
    if (last.positionals[i] !== current.positionals[i]) return true;
  }
  return false;
}

// Read a curried component's argument getters (named and positional) so the
// running effect depends on them.
function _touchCurriedArgGetters(curried: any): void {
  if (curried.__curriedArgs) {
    for (const val of Object.values(curried.__curriedArgs)) {
      if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
        try {
          val();
        } catch {
          /* ignore */
        }
      }
    }
  }
  if (curried.__curriedPositionals) {
    for (const val of curried.__curriedPositionals) {
      if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
        try {
          val();
        } catch {
          /* ignore */
        }
      }
    }
  }
}

// Append a template child value to `target`, flattening the shapes that the
// custom-element and namespaced-element `$_tag` fallbacks share: `null`/`false`
// render nothing, a node is appended, an array is flattened, an argument thunk
// is called (its errors, and errors appending its result, are ignored), and a
// primitive becomes a text node. Other objects go to the caller's
// `appendObject`, which gets the recursive append for nested values.
function _appendChildValue(
  target: Node,
  value: any,
  appendObject: (obj: any, append: (v: any) => void) => void
): void {
  const append = (v: any): void => _appendChildValue(target, v, appendObject);
  if (value == null || value === false) return;
  if (value instanceof Node) {
    target.appendChild(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) append(item);
    return;
  }
  if (typeof value === 'function') {
    try {
      append(value());
    } catch {
      /* ignore errors in child evaluation */
    }
    return;
  }
  if (typeof value === 'object') {
    appendObject(value, append);
    return;
  }
  target.appendChild(document.createTextNode(String(value)));
}

// Remove the nodes strictly between two sibling markers; returns them in order.
function _removeNodesBetween(parent: Node, start: Node, end: Node): Node[] {
  const removed: Node[] = [];
  let node = start.nextSibling;
  while (node && node !== end) {
    const next = node.nextSibling;
    removed.push(node);
    parent.removeChild(node);
    node = next;
  }
  return removed;
}

// Render a curried component through the Ember component manager. A reactive
// re-render runs outside the original render, so the owner captured at template
// evaluation is restored when no owner is ambient. Non-node results go through
// `toNode` (itemToNode at the next depth).
function _renderCurriedNode(
  managers: any,
  curried: any,
  capturedOwner: any,
  toNode: (value: any, depth: number) => Node | null,
  depth: number
): Node | null {
  if (capturedOwner && !getAmbientOwner()) {
    setAmbientOwner(capturedOwner);
  }
  const handleResult = managers.component.handle(curried, {}, null, null);
  if (typeof handleResult === 'function') {
    const rendered = handleResult();
    if (rendered instanceof Node) return rendered;
    return toNode(rendered, depth);
  }
  if (handleResult instanceof Node) return handleResult;
  return toNode(handleResult, depth);
}

// Override $__log with Ember-compatible version.
// Resolves GXT getter args and calls console.log. The compile-time transform
// (above) ensures $__log calls are eager (not inside reactive getters), so
// this only fires once per render.
{
  const g = globalThis as any;
  if (g.$__log) {
    // Deduplicate using call-site IDs injected by the compile-time transform.
    // The first arg is "__logSite:N" which uniquely identifies the {{log}} call
    // in the template. We track which site IDs have fired in the current sync
    // frame and skip duplicates (caused by root.ts + manager.ts double-rendering).
    const _loggedSites = new Set<string>();
    let _logClearTimer: any = null;

    g.$__log = function $__log_ember(...args: any[]) {
      // Check for call-site ID prefix
      let siteId: string | null = null;
      let actualArgs = args;
      if (args.length > 0 && typeof args[0] === 'string' && args[0].startsWith('__logSite:')) {
        siteId = args[0];
        actualArgs = args.slice(1);
      }

      // Resolve GXT getters in args
      const resolved = actualArgs.map((a: any) => {
        if (typeof a === 'function' && !a.prototype) {
          try {
            return a();
          } catch {
            return a;
          }
        }
        return a;
      });

      // Deduplicate: skip if this site already logged in the current sync frame
      if (siteId) {
        if (_loggedSites.has(siteId)) {
          return ''; // Skip duplicate
        }
        _loggedSites.add(siteId);
        // Clear tracked sites after the current sync frame
        if (!_logClearTimer) {
          _logClearTimer = setTimeout(() => {
            _loggedSites.clear();
            _logClearTimer = null;
          }, 0);
        }
      }

      console.log(...resolved);
      return '';
    };

    protectGlobal('$__log', g.$__log);
  }
}

// Extract EVERY `this.<path>` substring from a getter's source (e.g.
// `() => this.model?.firstName` → ["model?.firstName"], `() =>
// $__array(this.model?.x, this.y)` → ["model?.x", "y"]). Used by the
// `$__hash`/`$__array` member-getter wrapper to find the classic/plain-object
// paths a member reads so their `cellFor` cells can be entangled. Single-path
// `extractThisPath` only finds the first; a `(hash)`/`(array)` member can read
// several sources.
function _gxtExtractAllThisPaths(src: string): string[] {
  const paths: string[] = [];
  const marker = 'this.';
  let from = 0;
  for (;;) {
    const idx = src.indexOf(marker, from);
    if (idx === -1) break;
    let end = idx + marker.length;
    while (end < src.length) {
      const c = src[end]!;
      if (
        (c >= 'a' && c <= 'z') ||
        (c >= 'A' && c <= 'Z') ||
        (c >= '0' && c <= '9') ||
        c === '_' ||
        c === '$' ||
        c === '?' ||
        c === '.'
      ) {
        end++;
      } else {
        break;
      }
    }
    if (end > idx + marker.length) paths.push(src.slice(idx + marker.length, end));
    from = end;
  }
  return paths;
}

// Walk a `this.<path>` on `ctx` through `cellFor` so each segment's source cell
// entangles into the ambient tracker. Reading `cellFor(obj,key).value` records
// the cell and installs a cell-backed accessor on `obj[key]`, so a later
// `set(obj,'key',v)` (Ember `set` → `notifyPropertyChange` → dirty
// `cellFor(obj,'key')`) re-runs any consumer that captured it. Best-effort and
// read-only on values (only intermediate accessor install is a side effect,
// matching the empty-capture materialization already used in `itemToNode`).
function _gxtWalkThisPathCells(path: string, ctx: any): void {
  if (!ctx || typeof ctx !== 'object') return;
  let cur: any = ctx;
  const segs = path.split('.');
  for (let i = 0; i < segs.length; i++) {
    let seg = segs[i]!;
    // Strip optional-chaining markers (`this.model?.firstName`).
    while (seg.length > 0 && seg.charCodeAt(seg.length - 1) === 63 /* '?' */) {
      seg = seg.slice(0, -1);
    }
    if (!seg) continue;
    if (!cur || typeof cur !== 'object') break;
    try {
      const cell = cellFor(cur, seg, /* skipDefine */ false);
      cur = cell ? cell.value : cur[seg];
    } catch {
      try {
        cur = cur[seg];
      } catch {
        break;
      }
    }
  }
}

// Register every object on a `{{hash}}`/`{{array}}` member getter's
// `this.<path>` as a VALUE-OWNER of `(hashObj, hashKey)` (see
// `registerObjectValueOwner` / `_objectValueCellMap`). This is the dependency
// link the `untrack`ed read path can't establish: an Ember `@computed('hash.x')`
// runs its getter under `untrack` (metal/computed.ts), so reading `this.hash.x`
// there can't entangle the source cell — the computed relies purely on its
// chain-tag `tagFor(hashObj,'x')` bumping. With this link a `set(source,'x',…)`
// (→ `notifyPropertyChange(source,'x')`) reaches `(hashObj,'x')` in the
// `_objectValueCellMap` reverse-lookup, where the `(hash)`/`(array)` CP
// propagation block calls `dirtyTagFor(hashObj,'x')` (invalidating the computed's
// chain-tag) and recomputes the consuming component's CPs. Harmless for the
// other consumer shapes: they subscribe to the source cell directly, not to
// this one.
function _gxtLinkHashMemberSources(getter: any, ctx: any, hashObj: any, hashKey: string): void {
  if (!ctx || typeof ctx !== 'object') return;
  let paths = getter.__gxtHashPaths as string[] | undefined;
  if (paths === undefined) {
    paths = _gxtExtractAllThisPaths(String(getter));
    try {
      getter.__gxtHashPaths = paths;
    } catch {
      /* getter frozen — re-parse next time */
    }
  }
  for (let p = 0; p < paths.length; p++) {
    let cur: any = ctx;
    const segs = paths[p]!.split('.');
    for (let i = 0; i < segs.length; i++) {
      let seg = segs[i]!;
      while (seg.length > 0 && seg.charCodeAt(seg.length - 1) === 63 /* '?' */) {
        seg = seg.slice(0, -1);
      }
      if (!seg) continue;
      if (!cur || typeof cur !== 'object') break;
      registerObjectValueOwner(cur, hashObj, hashKey);
      try {
        const c = cellFor(cur, seg, /* skipDefine */ true);
        cur = c ? c.value : cur[seg];
      } catch {
        try {
          cur = cur[seg];
        } catch {
          break;
        }
      }
    }
  }
}

// Walk all of a `{{hash}}`/`{{array}}` member getter's `this.<path>` reads
// through `cellFor` on `ctx`, caching the parsed path list on the getter.
function _gxtWalkHashGetterPaths(getter: any, ctx: any): void {
  let paths = getter.__gxtHashPaths as string[] | undefined;
  if (paths === undefined) {
    paths = _gxtExtractAllThisPaths(String(getter));
    try {
      getter.__gxtHashPaths = paths;
    } catch {
      /* getter frozen — re-parse next time */
    }
  }
  for (let i = 0; i < paths.length; i++) {
    _gxtWalkThisPathCells(paths[i]!, ctx);
  }
}

// Wrap $__hash so member getters do TWO things beyond plain `$__hash`:
//
// (1) Parent-context capture for `mut` (the original reason this wrapper
//     exists): while a getter runs, expose the HASH-CONSTRUCTION render
//     context via `_gxtHashGetterCtx` so `$_componentHelper_ember` recovers the
//     OUTER scope for a contextual component embedded in a nested-component
//     hash (`{{my-comp (hash comp=(component "foo" this.model.x))}}`).
//
// (2) Classic/plain-object dependency entanglement (the `(hash)`/`(array)`
//     stale-value fix): a `(hash)` member getter such as
//     `() => this.model.firstName` (or a hash-nested `() => $__array(this.x)`)
//     reads PLAIN object properties — no gxt Cell is touched, so a consumer
//     that reads the member (e.g. a yielded `{{values.firstName}}` across a
//     component boundary) subscribes to nothing and never re-pulls when
//     `set(model,'firstName',…)` runs. gxt's `cachedHelper` memoizes the hash
//     identity (correctly — that fixed the over-invalidation), which means the
//     consumer is the ONLY thing that could re-pull, and it doesn't. So on each
//     member read we walk the member's `this.<path>` through `cellFor` on the
//     construction context, entangling the leaf + intermediate cells into the
//     ambient tracker (the consumer's capture/effect frame). `set` then dirties
//     a captured cell and the consumer re-runs with the live value, while gxt's
//     identity memoization is left intact.
{
  const g = globalThis as any;
  if (g.$__hash && !g.$__hash.__emberHashWrapped) {
    const origHash = g.$__hash;
    g.$__hash = function $__hash_ember(inputObj: Record<string, any>) {
      // The render context the hash is being constructed in. The producer
      // template's `this` is the active template-this here (verified: a yielded
      // `(hash firstName=this.model.firstName)` is built while the producer
      // component is the current template-this), which is exactly the `this`
      // the member getters close over. Prefer it for the path walk; fall back
      // to the last render context.
      const pathCtx = _gxtCurrentTemplateThis || _gxtLastRenderContext;
      // The outer render context for `mut` parent-scope recovery (unchanged).
      const mutCtx = _gxtLastRenderContext;
      if ((pathCtx || mutCtx) && inputObj && typeof inputObj === 'object') {
        const wrappedObj: Record<string, any> = {};
        for (const key of Object.keys(inputObj)) {
          const val = inputObj[key];
          if (
            typeof val === 'function' &&
            !val.prototype &&
            !val.__isCurriedComponent &&
            !(val as any).__emberHashGetterWrapped
          ) {
            const wrappedGetter = function (this: any) {
              const prev = _gxtHashGetterCtx;
              if (mutCtx) _gxtHashGetterCtx = mutCtx;
              try {
                const out = val.call(this);
                // Read-time entanglement: walk this member's `this.<path>`
                // through `cellFor` so a consumer reading the member directly
                // under its OWN tracker frame (the same-context `{{#let}}` case)
                // subscribes to the source cells.
                if (pathCtx && _gxtGetTracker() !== null) {
                  _gxtWalkHashGetterPaths(val, pathCtx);
                }
                return out;
              } finally {
                _gxtHashGetterCtx = prev;
              }
            };
            wrappedGetter.toString = () => val.toString();
            (wrappedGetter as any).__origHashGetter = val;
            (wrappedGetter as any).__hashConstructionCtx = mutCtx;
            (wrappedGetter as any).__emberHashGetterWrapped = true;
            wrappedObj[key] = wrappedGetter;
          } else {
            wrappedObj[key] = val;
          }
        }
        const result = origHash.call(this, wrappedObj);
        // Mark the produced object so `$__cellFor_ember` knows to read members
        // through their (live, source-entangling) getters instead of snapshotting
        // a `cellFor(hashObject,key)` cell. Stamp the construction context so the
        // marker survives `cellFor` defining a cell-backed accessor over it.
        try {
          Object.defineProperty(result, '__emberHashObject', {
            value: pathCtx || true,
            enumerable: false,
            configurable: true,
          });
        } catch {
          /* frozen — $__cellFor_ember falls back to the snapshot path */
        }
        // Link each member's source objects to `(result, key)` so an Ember
        // `@computed('hash.key')` (whose getter runs under `untrack`) re-fires
        // when the source changes — its chain-tag watches `tagFor(result,key)`.
        if (pathCtx) {
          for (const key of Object.keys(inputObj)) {
            const val = inputObj[key];
            if (typeof val === 'function' && !val.prototype && !val.__isCurriedComponent) {
              _gxtLinkHashMemberSources(val, pathCtx, result, key);
            }
          }
        }
        return result;
      }
      return origHash.call(this, inputObj);
    };
    g.$__hash.__emberHashWrapped = true;
  }
}

// Wrap $__cellFor for the cross-component `(hash)`/`(array)` reactivity fix.
//
// The compiler lowers a yielded-then-read hash member (`{{values.firstName}}`
// where `values` is a `{{yield (hash firstName=this.model.firstName)}}` block
// param) to `$__cellFor(values, "firstName")`. gxt's `$__cellFor` returns
// `cellFor(hashObject, "firstName").value` — a cell keyed on the HASH OBJECT
// that snapshots the member value ONCE at creation (the accessor it would
// install over the member is rejected because `$__hash`'s getter is
// non-configurable, so the cell never updates) and is entirely decoupled from
// the real source `this.model.firstName`. So `set(model,'firstName',…)` dirties
// `cellFor(model,'firstName')`, never the snapshot, and the consumer stays
// stale.
//
// For an Ember hash object we instead read the member THROUGH its live getter
// (`hashObject[key]`), which runs `$__hash_ember`'s wrapped member getter: it
// returns the current value AND walks the member's `this.<path>` through
// `cellFor` on the construction context, entangling the source cells into the
// ambient tracker — the consumer's own capture/effect frame at read time. The
// consumer then subscribes to `cellFor(model,'firstName')` and re-pulls the live
// value when `set` dirties it. Non-hash objects keep gxt's `cellFor(obj,key)`
// path unchanged (that one IS the right reactive cell for a real object).
// `$__cached`: the reference behind a `(hash)` / `(array)` value.
//
// The compat compiler emits every `(hash)` / `(array)` helper value as
// `$__cached(() => $__hash({...}))` / `$__cached(() => $__array(...))`. In
// Glimmer these helpers are compute references: the value is re-computed only
// when a tag the computation consumed has changed, and is the same object
// otherwise. gxt's `cachedHelper` differs for a computation that read no
// cell: it re-runs it after ANY revision change anywhere. A `(hash)` factory
// never reads a cell (its members are lazy getters), and when a member is
// itself built afresh on each read — a `(component …)`, a nested `(hash)` /
// `(array)` — gxt's shallow-equal identity check fails too, so such a
// `(hash)` / `(array)` got a new identity on every read after any change.
// As a component argument, that identity churn reads as an argument change on
// every sync: the change is written back to the component, which dirties
// classic tags, which schedules the next sync (and, in a `renderComponent`
// root, fires its re-render reactor), which reads a new identity again — the
// renderer never settles (`<X @stuff={{hash Foo=(component "foo")}} />`).
//
// So the getter follows the reference semantics instead: it re-runs the
// factory only when a cell the factory read has changed (a factory that read
// none is constant), and after a re-run it keeps the previous object when the
// new one is shallow-equal (gxt's rule: same keys / length, members compared
// with `Object.is`). A hash's members stay live getters, so readers still see
// the current member values. The cells the factory read are forwarded to the
// reading frame, as `cachedHelper` does.
//
// The getter is also tagged `__isCachedHelper` so the helper-arg unwrappers can
// fully resolve it: reading `this.args.data` / `@data` for a `(hash)` / `(array)`
// arg yields this GETTER, so a functional-helper arg `[() => $a.data]` unwraps
// ONE level to it (gxt's `F` / Ember's `unwrapArgs` only unwrap once) and the
// tag lets `unwrapArgs` / `unwrapHash` (ember-gxt-wrappers.ts) unwrap the extra
// cached level.
function _gxtShallowEqualCachedValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
      if (!Object.is((a as any)[key], (b as any)[key])) return false;
    }
    return true;
  }
  return false;
}
function _gxtCachedReference(factory: () => unknown): () => unknown {
  let initialized = false;
  let value: unknown;
  // The cells the last run of `factory` read, with their revisions then.
  let deps = new Map<any, unknown>();
  const getter = function cachedReference(): unknown {
    const outer = _gxtGetTracker() as Set<any> | null;
    if (initialized) {
      // forEach, NOT for…of: gxt's reactive Map.prototype iterator patch would
      // register this bookkeeping Map with the reading formula.
      let current = true;
      deps.forEach((revision, cell) => {
        if (cell._revision !== revision) current = false;
      });
      if (current) {
        if (outer !== null) deps.forEach((_revision, cell) => outer.add(cell));
        return value;
      }
    }
    const frame = new Set<any>();
    _gxtSetTracker(frame);
    let next: unknown;
    try {
      next = factory();
    } finally {
      _gxtSetTracker(outer);
    }
    const nextDeps = new Map<any, unknown>();
    frame.forEach((cell) => {
      nextDeps.set(cell, cell._revision);
      if (outer !== null) outer.add(cell);
    });
    deps = nextDeps;
    if (!initialized || !_gxtShallowEqualCachedValue(next, value)) value = next;
    initialized = true;
    return value;
  };
  (getter as any).__isCachedHelper = true;
  return getter;
}
{
  const g = globalThis as any;
  if (g.$__cached && !g.$__cached.__emberCachedWrapped) {
    g.$__cached = function $__cached_ember(factory: () => unknown) {
      return _gxtCachedReference(factory);
    };
    g.$__cached.__emberCachedWrapped = true;
  }
}
{
  const g = globalThis as any;
  if (g.$__cellFor && !g.$__cellFor.__emberCellForWrapped) {
    const origCellFor = g.$__cellFor;
    g.$__cellFor = function $__cellFor_ember(target: any, key: any) {
      if (target != null) {
        const t = typeof target;
        if (t === 'object' || t === 'function') {
          if ((target as any).__emberHashObject) {
            // Read through the live, source-entangling member getter.
            return target[key];
          }
          // A `@tracked` key reads through its accessor, which reads (and
          // subscribes to) the same gxt cell; gxt's `cellFor` would define its
          // own cell accessor on `target` over it (`isTrackedAccessor`).
          if (typeof key === 'string' && isTrackedAccessor(target, key)) {
            return target[key];
          }
        }
      }
      return origCellFor.call(this, target, key);
    };
    g.$__cellFor.__emberCellForWrapped = true;
  }
}

// Override $_componentHelper with Ember-aware version that creates CurriedComponent.
// Uses lazy lookup of CurriedComponent class because manager.ts may load after compile.ts.
{
  const g = globalThis as any;

  if (g.$_componentHelper) {
    const unwrapArg = (v: any) => (typeof v === 'function' && !v.prototype ? v() : v);
    // Cache the last known owner so re-evaluations during reactive updates
    // (when the ambient owner may be null) can still resolve components.
    let _cachedOwner: any = null;
    // Track which component names we've resolved per owner. Used to detect
    // stale-formula re-evaluations: if a component lookup fails in the current
    // owner but the name was previously resolved in a DIFFERENT owner, the
    // $_componentHelper call is from a prior test's reactive formula still
    // firing against the current owner. In that case we silently return an
    // empty marker instead of throwing (the stale DOM is detached anyway).
    const _ownerNameCache = new WeakMap<object, Set<string>>();
    // Also remember names ever registered by ANY owner (across tests). Used
    // to identify stale-context re-evaluations without keeping references to
    // destroyed owners.
    const _seenNames = new Set<string>();

    g.$_componentHelper = function $_componentHelper_ember(
      params: any[],
      hash: Record<string, any>
    ) {
      const createCurried = getCreateCurriedComponent();
      if (!createCurried) {
        // Fallback: no createCurriedComponent available yet, return the original behavior
        return params[0];
      }

      // Resolve the first arg (component name/ref)
      const first = unwrapArg(params[0]);

      // If the component name is undefined/null, return a special empty
      // CurriedComponent marker. This ensures that when used in a mustache
      // rendering context ({{component (component this.componentName ...)}})
      // the itemToNode function enters the CurriedComponent reactive rendering
      // path — which handles the undefined→component transition. Without this,
      // returning plain undefined would cause GXT to treat the value as text
      // with no reactive tracking (GXT skips opcodes for empty text values).
      if (first == null || first === '') {
        const emptyMarker = {
          __isCurriedComponent: true,
          __name: null,
          __curriedArgs: {},
          __curriedPositionals: [],
          __isEmpty: true,
        };
        return emptyMarker;
      }

      // Track the owner — prefer the ambient owner, fall back to cached.
      // Also use the shared getOwnerWithFallback from manager.ts which has
      // a more robust cache that survives across reactive re-evaluations.
      const currentOwner = getAmbientOwner();
      if (currentOwner && !currentOwner.isDestroyed && !currentOwner.isDestroying) {
        _cachedOwner = currentOwner;
      }
      if (_cachedOwner && (_cachedOwner.isDestroyed || _cachedOwner.isDestroying)) {
        _cachedOwner = null;
      }
      const sharedOwner = getOwnerWithFallback();
      const owner = currentOwner || _cachedOwner || sharedOwner;

      // Capture the parent render context for two-way binding via mut.
      // Prefer __hashGetterCtx (set while a hash-constructed getter runs) so
      // `(component "foo" this.model.x)` inside
      // `{{my-comp (hash comp=(component ...))}}` captures the OUTER context
      // (where `model` lives), not the my-comp inner render context. Without
      // this, mut can't walk the path back to set this.model.x when the inner
      // component's click handler calls (mut this.val).
      const parentRenderCtx = _gxtHashGetterCtx || _gxtLastRenderContext;

      // Collect named args from hash (keep getters for reactivity).
      // Also eagerly evaluate each getter to establish GXT cell tracking
      // in the calling formula's context — this ensures the parent template
      // re-evaluates when curried arg dependencies change.
      const namedArgs: Record<string, any> = {};
      if (hash) {
        for (const key of Object.keys(hash)) {
          const val = hash[key];
          namedArgs[key] = val;
          // Annotate hash getter functions with parent context for mut support
          if (typeof val === 'function' && !val.prototype && parentRenderCtx) {
            (val as any).__mutParentCtx = parentRenderCtx;
          }
          // Touch the value to track the cell dependency
          if (typeof val === 'function' && !val.prototype) {
            try {
              val();
            } catch {
              /* ignore */
            }
          }
        }
      }

      // Collect remaining positional params (after the first which is the component ref)
      // For each positional getter, also store a setter if derivable (for mut support).
      const positionals: any[] = [];
      for (let i = 1; i < params.length; i++) {
        const p = params[i];
        // Annotate getter functions with the parent context for mut support
        if (typeof p === 'function' && !p.prototype && parentRenderCtx) {
          (p as any).__mutParentCtx = parentRenderCtx;
        }
        positionals.push(p);
        // Touch positional values to track cell dependencies
        if (typeof p === 'function' && !p.prototype) {
          try {
            p();
          } catch {
            /* ignore */
          }
        }
      }

      // Validate that a string component name can be resolved.
      // This throws eagerly during template evaluation (matching Ember's behavior
      // of asserting during render for non-existent components).
      // IMPORTANT: Only validate with the CURRENT ambient owner (not cached fallback)
      // because cached owners may be from a different test and won't have the
      // component registered. Skipping validation during reactive re-evaluations
      // (when the ambient owner is null) is safe — the manager will handle resolution.
      if (typeof first === 'string' && first.length > 0) {
        const validationOwner = getAmbientOwner();
        if (validationOwner && !validationOwner.isDestroyed && !validationOwner.isDestroying) {
          const factory = validationOwner.factoryFor?.(`component:${first}`);
          const template = validationOwner.lookup?.(`template:components/${first}`);
          // Also check via lookup (resolver-based registrations may not show via factoryFor)
          const looked = !factory ? validationOwner.lookup?.(`component:${first}`) : factory;
          if (!factory && !template && !looked) {
            // Stale-formula discriminator: if this name was previously resolved
            // (by some earlier owner in this runtime) and the CURRENT owner has
            // no record of it, the call is a reactive re-evaluation leaking from
            // a destroyed test. Silently return an empty marker so the stale
            // DOM subtree renders nothing, instead of tearing down the current
            // test by throwing a resolution error that didn't originate from
            // the current render tree.
            let ownerSeen = _ownerNameCache.get(validationOwner);
            if (!ownerSeen) {
              ownerSeen = new Set<string>();
              _ownerNameCache.set(validationOwner, ownerSeen);
            }
            if (!ownerSeen.has(first) && _seenNames.has(first)) {
              // Stale formula — return empty marker (no throw, no capture).
              return {
                __isCurriedComponent: true,
                __name: null,
                __curriedArgs: {},
                __curriedPositionals: [],
                __isEmpty: true,
              };
            }

            const err = new Error(
              `Attempted to resolve \`${first}\`, which was expected to be a component, but nothing was found. ` +
                `Could not find component named "${first}" (no component or template with that name was found)`
            );
            throw err;
          }
          // Resolution succeeded — mark this name as seen for both the current
          // owner and the global registry of names ever resolved.
          let ownerSeen = _ownerNameCache.get(validationOwner);
          if (!ownerSeen) {
            ownerSeen = new Set<string>();
            _ownerNameCache.set(validationOwner, ownerSeen);
          }
          ownerSeen.add(first);
          _seenNames.add(first);
        }
      }

      // Temporarily set the ambient owner for createCurriedComponent to capture
      const prevOwner = getAmbientOwner();
      if (!prevOwner && owner) {
        setAmbientOwner(owner);
      }
      try {
        // Create a curried component
        return createCurried(first, namedArgs, positionals);
      } finally {
        if (!prevOwner && owner) {
          setAmbientOwner(prevOwner);
        }
      }
    };
  }
}

// Override GXT's $__if with Ember-aware truthiness rules.
// Ember considers empty arrays, proxy objects with isTruthy=false, and
// empty HTMLSafe strings as falsy, unlike JavaScript's standard truthiness.
{
  const g = globalThis as any;
  const _isArray = Array.isArray;

  function emberToBool(predicate: unknown): boolean {
    if (predicate && typeof predicate === 'object') {
      // Native Array: empty is falsy
      if (_isArray(predicate)) {
        return (predicate as any[]).length !== 0;
      }
      // ObjectProxy: Ember's proxy brand (classic `toBool` uses the same
      // `isProxy`), not duck typing — a plain object with a `content` key or an
      // object implementing `unknownProperty` is an ordinary truthy object.
      if (isProxy(predicate)) {
        // Distinguish ArrayProxy from ObjectProxy:
        // ArrayProxy has `objectAt` on its OWN prototype chain (from EmberArray).
        // ObjectProxy DELEGATES property access through unknownProperty, so
        // `predicate.objectAt` would return the content's objectAt, not its own.
        // Check if `objectAt` is an OWN or INHERITED property (not delegated).
        let hasOwnObjectAt = false;
        let proto = Object.getPrototypeOf(predicate);
        while (proto && proto !== Object.prototype) {
          if (typeof Object.getOwnPropertyDescriptor(proto, 'objectAt')?.value === 'function') {
            hasOwnObjectAt = true;
            break;
          }
          proto = Object.getPrototypeOf(proto);
        }
        // ArrayProxy: use length-based truthiness (empty content = falsy)
        if (hasOwnObjectAt) {
          return ((predicate as any).length ?? 0) !== 0;
        }
        // ObjectProxy: `isTruthy` is a computed based on content.
        // If `isTruthy` is defined (not undefined), use it directly.
        const truthVal = (predicate as any).isTruthy;
        if (truthVal !== undefined) return Boolean(truthVal);
        // Fall back to content — but if content is array-like, check length
        const content = (predicate as any).content;
        if (content && typeof content === 'object') {
          if (_isArray(content)) return content.length !== 0;
          if (typeof content.objectAt === 'function') return (content.length ?? 0) !== 0;
        }
        return Boolean(content);
      }
      // Ember array (e.g., objects with objectAt from EmberArray mixin)
      if (typeof (predicate as any).objectAt === 'function') {
        return ((predicate as any).length ?? 0) !== 0;
      }
      // HTMLSafe: check toString()
      if (typeof (predicate as any).toHTML === 'function') {
        return Boolean((predicate as any).toString());
      }
    }
    return Boolean(predicate);
  }

  // Register Ember truthiness for GXT's $_if (block control flow)
  // GXT's IfCondition.setupCondition checks the toBool host hook before its
  // own !!v
  _emberToBoolRef = emberToBool;
  _gxtRegisterHostHooks({ toBool: emberToBool });

  // Replace $__if on globalThis with Ember-aware version.
  // Use a persistent property trap so GXT's setupGlobalScope cannot overwrite.
  const _ember$__if = function $__if_ember(
    condition: unknown,
    ifTrue: unknown,
    ifFalse: unknown = ''
  ) {
    const rawCond =
      typeof condition === 'function' && !(condition as any).prototype
        ? (condition as any)()
        : condition;
    const cond = emberToBool(rawCond);
    const result = cond ? ifTrue : ifFalse;
    return typeof result === 'function' && !(result as any).prototype ? (result as any)() : result;
  };
  g.$__if = _ember$__if;

  protectGlobal('$__if', _ember$__if);
}

// GXT external schedule hook: GXT's cell.update() calls scheduleRevalidate()
// which consults the scheduleRevalidate host hook before using queueMicrotask.
// We set it to a no-op so GXT doesn't auto-schedule DOM sync — instead we
// control when gxtSyncDom() is called (after runTask, or via setTimeout fallback).
// The canonical pending-sync state is the module-local `_gxtFlags.pendingSync`
// boolean (defaults to `false` at module init).
const _gxtExternalScheduleHook = function () {
  _gxtSetPendingSync(true);
  // Note: this is from cell/effect scheduling, NOT from a property change; the
  // property-change flag is set separately (`_gxtSetPendingSyncFromPropertyChange`,
  // or `compilePipeline.setPendingSyncFromPropertyChange` from other modules).
};
_gxtRegisterHostHooks({ scheduleRevalidate: _gxtExternalScheduleHook });

// Reverse mapping: array/object -> Set<{ obj, key }> for dirty propagation.
// When cellFor installs a cell and the value is an array, register a mapping.
// Used to dirty component cells when KVO arrays mutate in-place.
const _arrayOwnerMap = new WeakMap<object, Set<{ obj: object; key: string }>>();

// Reverse mapping: object VALUE -> Set<{ obj, key }> for computed property propagation.
// When a cell holds an object as its value (e.g., renderContext['m'] = emberObj),
// and a property changes on that object (e.g., set(emberObj, 'message', ...)),
// we need to dirty the cell that holds the object so formulas re-evaluate.
// This handles the case where {{this.m.formattedMessage}} needs to update
// when m.message changes — the formula only tracks cell(renderContext, 'm'),
// not cell(m, 'formattedMessage').
const _objectValueCellMap = new WeakMap<object, Set<{ obj: object; key: string }>>();

function registerObjectValueOwner(value: any, ownerObj: object, ownerKey: string) {
  if (!value || typeof value !== 'object') return;
  let owners = _objectValueCellMap.get(value);
  if (!owners) {
    owners = new Set();
    _objectValueCellMap.set(value, owners);
  }
  // Avoid duplicates
  for (const entry of owners) {
    if (entry.obj === ownerObj && entry.key === ownerKey) return;
  }
  owners.add({ obj: ownerObj, key: ownerKey });
}
// Exposed via the gxt-bridge as `compilePipeline.registerObjectValueOwner`.
// The function definition stays here because it closes over
// `_objectValueCellMap` (also read below). See `installCompilePipelinePart`
// call at module bottom.

function registerArrayOwner(array: any, ownerObj: object, ownerKey: string) {
  if (!array || typeof array !== 'object') return;
  let owners = _arrayOwnerMap.get(array);
  if (!owners) {
    owners = new Set();
    _arrayOwnerMap.set(array, owners);
  }
  owners.add({ obj: ownerObj, key: ownerKey });
}
// Exposed via the gxt-bridge as `compilePipeline.registerArrayOwner`. Closure
// over `_arrayOwnerMap` is read below — relocation would fragment the map's
// call sites. See `installCompilePipelinePart` call at module bottom.

// Pending if-watcher notifications accumulated during `_gxtTriggerReRender`.
// Flushed in _gxtSyncDomNow after all cells have been updated atomically.
// This prevents IfCondition branch switching during batched property changes
// (e.g., set(cond2, true); set(cond1, false) in a single runTask), which
// could create components in branches that will be removed when the outer
// conditional is updated.
let _pendingIfWatcherNotifications: Array<{ obj: object; keyName: string }> = [];

// Deferred cascade queue infrastructure.
//
// The trigger body is split into `_gxtTriggerReRenderSyncCore`
// (synchronous-mandatory) + `_gxtTriggerReRenderDeferred` (deferrable cascade
// work: modifier-install watcher, array-owner fan-out, objectValueCellMap
// fan-out, syncWrapper). This queue/dedupe/drain plumbing batches the deferred
// work.
//
// Dedupe shape: WeakMap<obj, Set<keyName>>. The Set lives only for the duration
// of a single drain pass (cleared in the finally of the outer trigger call).
// Re-entrant enqueues during a drain pass land in the SAME queue (cursor-loop
// drain at `_drainCascadeQueue`) so we never lose a trigger; the Set dedupes
// within the pass to prevent the same (obj, keyName) from running the Deferred
// body twice.
let _deferredCascadeQueue: Array<{ obj: object; keyName: string }> = [];
let _deferredCascadeIndex: WeakMap<object, Set<string>> = new WeakMap();
const _MAX_DRAIN = 1000;

// Liveness guard for drain entries. `_arrayOwnerMap` can retain stale
// `{obj, key}` owner references from previous tests; if drain ran the Deferred
// body for `(array, '[]')` after `afterEach` nulled the test controllers, the
// cellFor propagation would hit a dead context. The guard skips entries whose
// owner is destroyed before the deferred body runs.
function _isOwnerAlive(obj: object): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if ((obj as any).isDestroyed === true) return false;
  if ((obj as any).isDestroying === true) return false;
  return true;
}

// Cursor-loop drain (NOT `.splice(0)`). Re-entrant enqueues during a Deferred
// body run land at the queue tail; the cursor loop picks them up in the SAME
// pass. `_MAX_DRAIN=1000` is a defensive cap that bounds runaway cascades.
function _drainCascadeQueue(): void {
  let i = 0;
  while (i < _deferredCascadeQueue.length && i < _MAX_DRAIN) {
    const entry = _deferredCascadeQueue[i++]!;
    const { obj, keyName } = entry;
    // Liveness guard — skip dead owners (handles the array-owner-fan-out case
    // where `_arrayOwnerMap` retains stale {obj, key} from afterEach-nulled
    // controllers).
    if (!_isOwnerAlive(obj)) continue;
    try {
      _gxtWithInTriggerReRender(() => _gxtTriggerReRenderDeferred(obj, keyName));
    } catch (drainErr) {
      // Surface drain errors rather than swallowing them.
      console.warn('[gxt] Phase 2b drain entry failed', { keyName, drainErr });
    }
  }
  if (i >= _MAX_DRAIN) {
    console.warn('[gxt] Phase 2b drain hit MAX_DRAIN cap', _deferredCascadeQueue.length);
  }
}

// Helper for pushing an if-watcher notification. Called synchronously from
// `_gxtTriggerReRender`'s enqueue path so multi-click-in-one-runtask ordering
// on different keys is preserved (each click must register its if-watcher entry
// before the pre-flush drains the pending list), while the rest of the cascade
// body is deferred.
function _pushIfWatcherNotification(obj: object, keyName: string): void {
  _pendingIfWatcherNotifications.push({ obj, keyName });
}

// Host-hook chains around the canonical re-render trigger
// (`_gxtTriggerReRender`, reached as `compilePipeline.triggerReRender` from
// Ember's notifyPropertyChange), so other modules can run code before or after
// it without wrapping it:
//   - `_beforeTriggerReRender`: manager.ts (dirtied-objects set) and
//     ember-gxt-wrappers.ts (tracked-set-since-rerender flag);
//   - `_afterTriggerReRender`: glimmer/lib/renderer.ts (ArrayProxy
//     content-array owner dirtying).
// An empty chain costs one length check per call.
type _TriggerReRenderHook = (obj: object, keyName: string) => void;
const _beforeTriggerReRender: _TriggerReRenderHook[] = [];
const _afterTriggerReRender: _TriggerReRenderHook[] = [];

function _gxtAddBeforeTriggerReRender(fn: _TriggerReRenderHook): () => void {
  _beforeTriggerReRender.push(fn);
  let removed = false;
  return function off(): void {
    if (removed) return;
    removed = true;
    const idx = _beforeTriggerReRender.indexOf(fn);
    if (idx >= 0) _beforeTriggerReRender.splice(idx, 1);
  };
}

function _gxtAddAfterTriggerReRender(fn: _TriggerReRenderHook): () => void {
  _afterTriggerReRender.push(fn);
  let removed = false;
  return function off(): void {
    if (removed) return;
    removed = true;
    const idx = _afterTriggerReRender.indexOf(fn);
    if (idx >= 0) _afterTriggerReRender.splice(idx, 1);
  };
}

// The module's boolean state flags. They are read and written only through
// the accessor functions below, most of which compile.ts also installs on the
// bridge's `compilePipeline` (under the same names without `_gxt`), so
// manager.ts, glimmer's renderer/root/outlet, the runloop and the test helpers
// share this one state.
const _gxtFlags = {
  // Inside the canonical `_gxtTriggerReRender` body (`metal/computed.ts`'s
  // CP.get re-entrance guard reads it).
  inTriggerReRender: false,
  // Inside a render pass or a wrapped event handler: @tracked setters skip the
  // cross-object trigger fan-out, which would dirty cells mid-render.
  currentlyRendering: false,
  // A tracked write happened since the last `UpdatingVM.execute` (the
  // test-harness VM patch in ember-gxt-wrappers.ts forces a revalidation).
  trackedSetSinceRerender: false,
  // Inside the post-`runTask` DOM sync, `_gxtSyncDomNow` (its re-entrancy guard).
  syncing: false,
  // manager.ts arg write-backs: validator.ts dirties the classic tag without
  // scheduling another sync (prevents a backburner re-entry loop).
  suppressDirtyInRcSet: false,
  // The current sync was driven by a property change. Unlike `hadPendingSync`
  // it survives the force-rerender's clear; it gates destroy-error capture.
  syncIsPropertyDriven: false,
  // A sync was pending when `_gxtSyncDomNow` started; cleared by the
  // force-rerender's `finally`.
  hadPendingSync: false,
  // `_gxtTriggerReRender` saw a nested-object change; gates the force-rerender
  // full-tree fallback.
  hadNestedObjectChange: false,
  // Inside root.ts's route-template render (the render tree's outlet hierarchy).
  inOutletRender: false,
  // Inside renderer.ts's forced `classicRoot.render()`.
  forceRerender: false,
  // Nested `renderComponent` calls render text nodes without effects (set by
  // renderer.ts, which owns the save/restore).
  skipTextEffects: false,
  // A DOM sync is scheduled.
  pendingSync: false,
  // Inside `runTask`/`runAppend`, which sync themselves: the runloop end
  // listeners skip their flush.
  runTaskActive: false,
  // A property change happened inside an `afterRender` callback (`runAppend`
  // reads and clears it).
  afterRenderPropertyChange: false,
  // Inside a `schedule('afterRender', cb)` callback (set by the runloop wrapper).
  inAfterRender: false,
  // A teardown re-attaches removed component elements so `willDestroyElement`
  // sees them connected; `<ember-outlet>` must not render meanwhile.
  destroyReattachInProgress: false,
  // The pending sync comes from a real property change, not from cells created
  // during the initial render.
  pendingSyncFromPropertyChange: false,
  // `_gxtTriggerReRender` is a no-op (`withTriggerSuppressed`).
  triggerSuppressed: false,
};
type GxtFlag = keyof typeof _gxtFlags;

// Run `fn` with `flag` set to `value`, then restore the value it had before
// (also when `fn` throws), so nested frames stack correctly.
function _gxtWithFlag<T>(flag: GxtFlag, value: boolean, fn: () => T): T {
  const prev = _gxtFlags[flag];
  _gxtFlags[flag] = value;
  try {
    return fn();
  } finally {
    _gxtFlags[flag] = prev;
  }
}

// The render context (`this`) the current template body is being `.call`ed
// with. itemToNode's capture frame consults this to materialize a leaf cell
// when a bound path resolves off an ABSENT property (initial-undefined paths
// read no cell, so the effect would subscribe to nothing). Set/cleared around
// `templateFn.call(renderContext)`.
let _gxtCurrentTemplateThis: any = null;
// Accessor bound into compiled template Function() bodies (the {{unbound}}
// live/deferred detection) and registered as the `getCurrentTemplateThis`
// host hook, through which gxt reads the module-local.
const _gxtGetTemplateThisFn = () => _gxtCurrentTemplateThis;
_gxtRegisterHostHooks({ getCurrentTemplateThis: _gxtGetTemplateThisFn });

// Shared subscription-recovery for non-text effect sites ($_attr attribute
// effect, {{{html-raw}}} effect): run `getter` under a capture tracker frame
// and, for every cell it reads, register the LEAF object it holds as a
// value-owner of its source cell (so `set(leafObj,'k',...)` reaches the cell —
// the null-object fix), AND if the getter touched NO cell while resolving a
// simple `this.<path>` off an ABSENT property, materialize the leaf cell on the
// current template `this` so the effect (registered immediately after this
// call, capturing the same tracker state) subscribes to a cell that `set()`
// will dirty (the initial-undefined fix). Mirrors the text-effect
// capture-replay block in `itemToNode`.
function _gxtCaptureLeafOwnersForGetter(getter: any): void {
  if (typeof getter !== 'function') return;
  const ambient = _gxtGetTracker();
  const frame = new Set<any>();
  _gxtSetTracker(frame);
  try {
    let v = getter();
    // Mirror downstream read shape: unwrap nested getter / cell wrappers.
    let guard = 0;
    while (typeof v === 'function' && guard++ < 8) v = v();
    if (v && typeof v === 'object' && (v as any).__isCell) v = (v as any).value;
    _gxtCaptureHashArrayDeps(v);
    // Empty-capture path materialization (initial-undefined).
    if (frame.size === 0) {
      const path = extractThisPath(String(getter));
      const pc = _gxtCurrentTemplateThis;
      if (path && pc && typeof pc === 'object') {
        let cur: any = pc;
        for (const seg of path.split('.')) {
          if (!cur || typeof cur !== 'object') break;
          try {
            const segCell = cellFor(cur, seg, /* skipDefine */ false);
            cur = segCell ? segCell.value : cur[seg];
          } catch {
            cur = cur[seg];
          }
        }
      }
    }
  } catch {
    /* best-effort */
  } finally {
    _gxtSetTracker(ambient);
    frame.forEach((c) => {
      if (ambient) ambient.add(c);
      try {
        const _v = (c as any)._value;
        const _ro = (c as any)._relatedObj;
        const _rk = (c as any)._relatedKey;
        if (
          _v &&
          typeof _v === 'object' &&
          _ro &&
          typeof _ro === 'object' &&
          typeof _rk === 'string'
        ) {
          registerObjectValueOwner(_v, _ro, _rk);
        }
      } catch {
        /* registration is best-effort */
      }
    });
  }
}

function _gxtIsInTriggerReRender(): boolean {
  return _gxtFlags.inTriggerReRender;
}
function _gxtWithInTriggerReRender<T>(fn: () => T): T {
  return _gxtWithFlag('inTriggerReRender', true, fn);
}

function _gxtIsCurrentlyRendering(): boolean {
  return _gxtFlags.currentlyRendering;
}
function _gxtSetCurrentlyRendering(on: boolean): void {
  _gxtFlags.currentlyRendering = on;
}
function _gxtWithCurrentlyRendering<T>(fn: () => T): T {
  return _gxtWithFlag('currentlyRendering', true, fn);
}

function _gxtMarkTrackedSetSinceRerender(): void {
  _gxtFlags.trackedSetSinceRerender = true;
}
// Returns the flag and clears it.
function _gxtConsumeTrackedSetSinceRerender(): boolean {
  const prev = _gxtFlags.trackedSetSinceRerender;
  _gxtFlags.trackedSetSinceRerender = false;
  return prev;
}

// Monotonic sync-cycle counter. `_gxtSyncDomNow` bumps it once per sync (the
// only writer); other modules read it through `compilePipeline.getSyncCycleId()`
// and treat a missing bridge as cycle 0.
let _gxtSyncCycleId = 0;
function _gxtIncrementSyncCycleId(): number {
  _gxtSyncCycleId = _gxtSyncCycleId + 1;
  return _gxtSyncCycleId;
}
function _gxtGetSyncCycleId(): number {
  return _gxtSyncCycleId;
}

function _gxtIsSyncing(): boolean {
  return _gxtFlags.syncing;
}
function _gxtSetSyncing(on: boolean): void {
  _gxtFlags.syncing = on;
}
// manager.ts's post-render hooks call this with `false` so the nested
// `_gxtSyncDomNow` passes the re-entrancy guard.
function _gxtWithSyncing<T>(value: boolean, fn: () => T): T {
  return _gxtWithFlag('syncing', value, fn);
}

function _gxtIsDirtyInRcSetSuppressed(): boolean {
  return _gxtFlags.suppressDirtyInRcSet;
}
function _gxtWithSuppressDirtyInRcSet<T>(fn: () => T): T {
  return _gxtWithFlag('suppressDirtyInRcSet', true, fn);
}

function _gxtIsSyncIsPropertyDriven(): boolean {
  return _gxtFlags.syncIsPropertyDriven;
}
function _gxtSetSyncIsPropertyDriven(on: boolean): void {
  _gxtFlags.syncIsPropertyDriven = on;
}

function _gxtGetHadPendingSync(): boolean {
  return _gxtFlags.hadPendingSync;
}
function _gxtSetHadPendingSync(on: boolean): void {
  _gxtFlags.hadPendingSync = on;
}

function _gxtGetHadNestedObjectChange(): boolean {
  return _gxtFlags.hadNestedObjectChange;
}
function _gxtSetHadNestedObjectChange(on: boolean): void {
  _gxtFlags.hadNestedObjectChange = on;
}

function _gxtIsInOutletRender(): boolean {
  return _gxtFlags.inOutletRender;
}
function _gxtWithInOutletRender<T>(fn: () => T): T {
  return _gxtWithFlag('inOutletRender', true, fn);
}

// Captured top-level outlet ref, exposed via a paired set/get bridge surface
// (`setTopOutletRef` / `getTopOutletRef`). Written after the outlet-render
// block in `glimmer/lib/templates/root.ts` (capturing the freshly-created
// top-level outlet ref so downstream consumers can walk the outlet hierarchy on
// demand). Two readers:
//
//   - `gxt-backend/manager.ts` (`_buildRenderTree` outlet-hierarchy branch —
//     walks `outlets.main.outlets.main...` to emit `{{outlet}} for X / X`
//     entries matching Glimmer VM's render-tree output);
//   - `glimmer/lib/renderer.ts` (OutletView re-render fallback — uses the
//     captured ref when `(gxtRoot as any).ref` is missing, on the
//     property-driven re-render path).
//
// Both treat `undefined` as "no captured ref yet" and short-circuit
// accordingly. The flag and this ref are read by the SAME `_buildRenderTree`
// outlet branch and form one coherent outlet-render state cluster.
let _gxtTopOutletRef: any = null;
function _gxtGetTopOutletRef(): any {
  return _gxtTopOutletRef;
}
function _gxtSetTopOutletRef(ref: any): void {
  _gxtTopOutletRef = ref;
}

// Captured "current helper scope": `patchGlobalIf`/`wrapBranch` set it (with
// save-restore) to a per-branch `Set` around branch evaluation, so class-based
// helper instances created inside the branch join that `{{#if}}` branch's
// teardown scope (destroy/willDestroy fire on branch swap, as in classic
// Ember). Readers: the `$_tag` class-helper creation path here, and
// ember-gxt-wrappers.ts's `$_maybeHelper` paths via `getCurrentHelperScope`.
let _gxtCurrentHelperScope: any = null;
function _gxtGetCurrentHelperScope(): any {
  return _gxtCurrentHelperScope;
}

function _gxtIsForceRerender(): boolean {
  return _gxtFlags.forceRerender;
}
function _gxtWithForceRerender<T>(fn: () => T): T {
  return _gxtWithFlag('forceRerender', true, fn);
}

function _gxtGetSkipTextEffects(): boolean {
  return _gxtFlags.skipTextEffects;
}
function _gxtSetSkipTextEffects(value: boolean): void {
  _gxtFlags.skipTextEffects = value;
}

// Root outlet-rerender dispatcher. root.ts registers the `(outletRef) => void`
// dispatcher (`setRootOutletRerender`) and manager.ts a `render.outlet`
// instrumentation wrap (`setRootOutletRerenderWrap`), applied when the
// dispatcher is set; readers fetch it with `getRootOutletRerender()`. The wrap
// defaults to identity, and manager.ts's wrap is idempotent
// (`__gxtInstrumented`), so re-wrapping is harmless.
let _gxtRootOutletRerenderRaw: ((ref: any) => void) | null = null;
let _gxtRootOutletRerenderWrap: (fn: any) => any = (fn) => fn;
function _gxtSetRootOutletRerender(fn: ((ref: any) => void) | null): void {
  if (fn === null) {
    _gxtRootOutletRerenderRaw = null;
    return;
  }
  _gxtRootOutletRerenderRaw = _gxtRootOutletRerenderWrap(fn);
}
function _gxtGetRootOutletRerender(): ((ref: any) => void) | null {
  return _gxtRootOutletRerenderRaw;
}
function _gxtSetRootOutletRerenderWrap(wrap: (fn: any) => any): void {
  _gxtRootOutletRerenderWrap = wrap;
  // Re-wrap the currently stored dispatcher so a late-registered wrap applies
  // to an already-set dispatcher. In practice manager.ts's IIFE registers the
  // wrap BEFORE root.ts ever registers a dispatcher (manager.ts loads as part of
  // gxt-backend index init; root.ts only writes during first `factory.render`),
  // so this branch is dead in practice — it exists to cover the late-wrap order.
  if (_gxtRootOutletRerenderRaw !== null) {
    _gxtRootOutletRerenderRaw = wrap(_gxtRootOutletRerenderRaw);
  }
}

// Holds an error captured during `_gxtSyncDomNow`'s force-rerender phase (the
// rerender error and the `destroyUnclaimedPoolEntries` destroy error) so that it
// is re-thrown AFTER the `finally`-block sync-state cleanup
// (`_gxtSetSyncing(false)` + `_gxtSetSyncIsPropertyDriven(false)`). Throwing
// earlier would skip that reset and leave `_gxtFlags.syncing` true, turning
// every later `_gxtSyncDomNow` into a no-op through its re-entrancy guard.
//
// The two writers keep the first error (`existing || newErr`), so the rerender
// throw isn't shadowed by a later destroy throw; after the `finally` the slot
// is cleared and the error re-thrown to `runTask`'s caller (typically
// `assert.throws` in tests). `unknown`, because any value can be thrown.
let _gxtDeferredSyncError: unknown = null;

function _gxtGetPendingSync(): boolean {
  return _gxtFlags.pendingSync;
}
function _gxtSetPendingSync(on: boolean): void {
  _gxtFlags.pendingSync = on;
}

function _gxtGetRunTaskActive(): boolean {
  return _gxtFlags.runTaskActive;
}
function _gxtSetRunTaskActive(on: boolean): void {
  _gxtFlags.runTaskActive = on;
}

function _gxtGetAfterRenderPropertyChange(): boolean {
  return _gxtFlags.afterRenderPropertyChange;
}
function _gxtSetAfterRenderPropertyChange(on: boolean): void {
  _gxtFlags.afterRenderPropertyChange = on;
}

function _gxtGetInAfterRender(): boolean {
  return _gxtFlags.inAfterRender;
}
function _gxtSetInAfterRender(on: boolean): void {
  _gxtFlags.inAfterRender = on;
}

function _gxtGetDestroyReattachInProgress(): boolean {
  return _gxtFlags.destroyReattachInProgress;
}
function _gxtSetDestroyReattachInProgress(on: boolean): void {
  _gxtFlags.destroyReattachInProgress = on;
}

// Engine-instance cache: one engine instance per `{{mount "engine-name"}}`
// invocation, reused across re-renders of the parent template so that
// `<ember-mount>` elements recreated by a force-rerender don't instantiate the
// engine again. mount-element.ts adds engines on first connection (through
// `compilePipeline.getEngineInstances()`), and `_gxtClearOnSetup` destroys them
// between tests — both the inner `__gxtOriginalEngine` (which `init`-ed itself
// into `Namespace.NAMESPACES`) and the cached instance, so the "Should not have
// any NAMESPACES" assertion passes. Only a getter is exposed: the Map identity
// never changes.
const _gxtEngineInstances: Map<string, any> = new Map<string, any>();
function _gxtGetEngineInstances(): Map<string, any> {
  return _gxtEngineInstances;
}

// `withRootContext(ctx, fn)` runs `fn` against an isolated render root (the SSR
// entry point; nothing in the browser render path calls it). It snapshots the
// ember-side root-scoped singletons (`_gxtRootContext`, `_gxtTopOutletRef`,
// `_gxtEngineInstances`), installs the per-root state carried by `ctx` (a fresh
// root by default), wraps the body in gxt's
// `withRenderRoot(createRenderRootState(), …)` so gxt's own module globals are
// swapped as well, and restores the outer state on exit (also on throw),
// writing the per-root state back into `ctx`.
//
// It is synchronous only: `fn` must create all DOM before returning, or the
// swapped globals leak across requests. `_gxtEngineInstances` keeps its
// identity (other modules hold the reference), so its contents are swapped.
interface GxtRootContextState {
  rootContext?: any;
  topOutletRef?: any;
  engineInstances?: Map<string, any>;
}
function _gxtWithRootContext<T>(ctx: GxtRootContextState | null | undefined, fn: () => T): T {
  // Snapshot the outer (ambient) ember-side root state.
  const _prevRootContext = _gxtRootContext;
  const _prevTopOutletRef = _gxtTopOutletRef;
  const _prevEngineEntries: Array<[string, any]> = Array.from(_gxtEngineInstances.entries());
  // Install the per-root ember state (a fresh, empty root by default).
  _gxtRootContext = ctx?.rootContext ?? null;
  _gxtTopOutletRef = ctx?.topOutletRef ?? null;
  _gxtEngineInstances.clear();
  if (ctx?.engineInstances) {
    for (const [k, v] of ctx.engineInstances) _gxtEngineInstances.set(k, v);
  }
  try {
    // Wrap the body in the upstream render root so the node-counter / parent-context
    // / rendering-context module-globals are swapped for a fresh isolated set and
    // restored on exit (also on throw) by `withRenderRoot`'s own `finally`. The
    // ember-side root state swap (above/below) applies in addition.
    return _gxtWithRenderRoot(_gxtCreateRenderRootState(), fn);
  } finally {
    // Checkpoint the (possibly mutated) per-root ember state back into `ctx` so the
    // caller can reuse it for a subsequent pass on the same root, then restore the
    // outer ambient state. Runs on the throw path too, so a failed render never
    // leaks its root into the ambient globals.
    if (ctx) {
      ctx.rootContext = _gxtRootContext;
      ctx.topOutletRef = _gxtTopOutletRef;
      ctx.engineInstances = new Map(_gxtEngineInstances);
    }
    _gxtRootContext = _prevRootContext;
    _gxtTopOutletRef = _prevTopOutletRef;
    _gxtEngineInstances.clear();
    for (const [k, v] of _prevEngineEntries) _gxtEngineInstances.set(k, v);
  }
}

function _gxtGetPendingSyncFromPropertyChange(): boolean {
  return _gxtFlags.pendingSyncFromPropertyChange;
}
function _gxtSetPendingSyncFromPropertyChange(on: boolean): void {
  _gxtFlags.pendingSyncFromPropertyChange = on;
}

// Bounded depth counter for the inner sibling-getter rescan inside
// `_walkRenderContexts` (on render-context wrappers via `cellTarget`). That
// rescan covers the legitimate aliased-getter case but is vulnerable to an
// identity-churn pattern in user code — a `get prop() { return new ... }` getter
// causes unbounded queue growth. We bound it defensively: increment on entry,
// decrement in finally, and skip the rescan (with a warn) once depth exceeds the
// limit. The limit of 3 matches the prototype-chain walk depth used elsewhere in
// the body and is comfortably above any reasonable wrapper-aliased-getter chain.
let _innerSiblingRescanDepth = 0;
const _INNER_SIBLING_RESCAN_MAX_DEPTH = 3;

const _gxtTriggerReRender = function (obj: object, keyName: string, value?: unknown) {
  // The optional `value` (passed through `notifyPropertyChange(obj, keyName,
  // _meta, value)`) lets SyncCore's `cellFor(obj, keyName).update(value)` skip
  // reading `obj[keyName]`.
  //
  // Suppression (`_gxtWithTriggerSuppressed`) is checked here, at the single
  // entry point every caller, including `compilePipeline.triggerReRender`,
  // goes through.
  if (_gxtFlags.triggerSuppressed) return;
  // Detect whether the caller passed a value so SyncCore can skip the
  // `(obj as any)[keyName]` getter read on the value-passing paths.
  const hasValueArg = arguments.length >= 3;
  // Dispatch the BEFORE-chain (empty-chain check is a length-zero short-circuit
  // so per-call overhead stays at one cmp + one branch when nothing is
  // registered).
  if (_beforeTriggerReRender.length > 0) {
    for (let i = 0; i < _beforeTriggerReRender.length; i++) {
      try {
        _beforeTriggerReRender[i]!(obj, keyName);
      } catch {
        /* ignore — host hook must not break canonical body */
      }
    }
  }
  // Run SyncCore with the in-trigger-rerender flag set
  // (`_gxtWithInTriggerReRender`); the flag is restored before the AFTER-hook
  // chain runs.
  //
  // The body is split into SyncCore (synchronous-mandatory cell/flag work, run
  // immediately) and Deferred (deferrable cascade work, enqueued into
  // `_deferredCascadeQueue` with WeakMap+Set dedupe and drained in
  // `_gxtSyncDomNow`).
  //
  // Re-entrancy: if a Deferred body run calls `_gxtTriggerReRender` recursively,
  // the inner call's SyncCore fires immediately (read-after-set contract), the
  // inner call's Deferred is enqueued (dedupe may catch it); the drain only runs
  // from `_gxtSyncDomNow`, so the cursor loop in `_drainCascadeQueue` picks up
  // the new tail entry in the SAME pass (bounded by `_MAX_DRAIN`).
  try {
    _gxtWithInTriggerReRender(() => {
      _gxtTriggerReRenderSyncCore(obj, keyName, value, hasValueArg);
    });

    // Enqueue the Deferred half with dedupe.
    let seen = _deferredCascadeIndex.get(obj);
    if (!seen) {
      seen = new Set();
      _deferredCascadeIndex.set(obj, seen);
    }
    if (!seen.has(keyName)) {
      seen.add(keyName);
      _deferredCascadeQueue.push({ obj, keyName });
    }

    // Contract: every `_gxtTriggerReRender` call enqueues exactly one pending
    // if-watcher notification (drained by `_gxtSyncDomNow`).
    _pushIfWatcherNotification(obj, keyName);

    // The Deferred half is drained in `_gxtSyncDomNow` (between the pre-flush
    // FALSE-flip and `gxtSyncDom()`); the queue + index are reset in finally
    // inside that drain so dedupe remains per-sync-pass.
    //
    // The three cell.update fan-outs (_arrayOwnerMap Array branch +
    // _arrayOwnerMap non-Array wrapper branch + _objectValueCellMap
    // reverse-lookup) belong to SyncCore — they must run synchronously because
    // template formulas in the same runtask read those owner cells. Only the
    // modifier-install watcher and syncWrapper side-effects are deferred.

    // Controller-set outlet rerender bridge.
    // When `obj` is a Controller (marker `isController === true`) AND the
    // changed key is `model`, run the outlet rerender registered for it
    // (`getControllerOutletRerender()`, installed by root.ts). This closes the
    // cell→DOM propagation gap for `set(controller, 'model', x)`: SyncCore +
    // _walkRenderContexts update the cells on the renderContext
    // (Object.create(controller)), but the outlet template's text-binding
    // effects don't always flush on their own.
    //
    // The hook is narrowed to `keyName === 'model'`: firing it for ALL
    // controller properties (e.g. `@tracked isExpanded`) destroys the view tree
    // on every tracked write (the View tree test) — the cell-based cascade
    // handles tracked props; only `model` writes need the outlet re-evaluation,
    // because outletState's model reference is unchanged so the natural
    // setOutletState rerender path doesn't fire.
    //
    // It also fires for QP-tracked properties (keys in the controller's
    // `queryParams` configuration): after such a write and `route.refresh()`
    // the outletState model reference is unchanged too. QP keys are an
    // explicitly declared set, so generic `@tracked` properties stay out.
    //
    // The hook itself contains the re-entrancy guard (toggled in root.ts),
    // so nested `set()` calls inside the rerender body don't re-trigger.
    const _isControllerKey = obj && typeof obj === 'object' && (obj as any).isController === true;
    let _isQpKey = false;
    if (_isControllerKey && keyName !== 'model' && typeof keyName === 'string') {
      // Detect QP-tracked property: scan controller.queryParams (array form,
      // string entries or object entries — see normalizeControllerQueryParams
      // in @ember/routing/lib/utils.ts for the three legal shapes).
      try {
        const qp = (obj as any).queryParams;
        if (Array.isArray(qp)) {
          for (let i = 0; i < qp.length; i++) {
            const entry = qp[i];
            if (typeof entry === 'string') {
              if (entry === keyName) {
                _isQpKey = true;
                break;
              }
            } else if (entry && typeof entry === 'object') {
              if (Object.prototype.hasOwnProperty.call(entry, keyName)) {
                _isQpKey = true;
                break;
              }
            }
          }
        }
      } catch (e) {
        // Accessing .queryParams on an arbitrary controller-shaped object
        // should never throw, but if a getter rejects, warn and fall through.
        console.warn('[gxt] QP-key detection on controller failed', e);
      }
    }
    if (_isControllerKey && (keyName === 'model' || _isQpKey)) {
      const _ctrlHook = getControllerOutletRerender();
      if (typeof _ctrlHook === 'function') {
        try {
          // Pass the changed key: the outlet-rerender hook takes the cell-only
          // fast path for it (a route MODEL identity swap keeps the route
          // template's components, so `didInsertElement` fires once, while
          // `{{@model.…}}` bindings still re-evaluate).
          _ctrlHook(obj, keyName);
        } catch (e) {
          // Match the existing post-trigger error handling shape — warn but
          // don't break the canonical trigger body.
          console.warn('[gxt] controller-set outlet rerender hook failed', e);
        }
      }
    } else if (obj && typeof obj === 'object' && !_gxtIsCurrentlyRendering()) {
      // Interior model mutation bridge: if `obj` is registered as the VALUE
      // of `(*, 'model')` via _objectValueCellMap and the owner traces
      // back to a controller, fire the outlet rerender hook for that
      // controller, as the direct controller-model branch above does. Guard
      // against firing during an active render pass (component init
      // `this.set(...)` writes go through this path — those should hit the
      // classic backtracking-re-render assertion, not get re-rendered into a
      // green test).
      try {
        const owners = _objectValueCellMap.get(obj);
        if (owners) {
          const _ctrlHook = getControllerOutletRerender();
          if (typeof _ctrlHook === 'function') {
            const seen = new Set<object>();
            for (const { obj: ownerObj, key: ownerKey } of owners) {
              if (ownerKey !== 'model') continue;
              if (!ownerObj || typeof ownerObj !== 'object') continue;
              // ownerObj may be:
              //   (a) the renderContext (Object.create(controller)) — its
              //       prototype IS the controller, OR
              //   (b) the argsObj — has a `controller` data property that
              //       points to the controller, OR
              //   (c) the controller itself (unusual but possible).
              // In each case extract the controller and fire the hook.
              let candidate: object | null = null;
              const proto = Object.getPrototypeOf(ownerObj);
              if (proto && (proto as any).isController === true) {
                candidate = proto;
              } else if ((ownerObj as any).isController === true) {
                candidate = ownerObj;
              } else {
                const ac = (ownerObj as any).controller;
                if (ac && typeof ac === 'object' && (ac as any).isController === true) {
                  candidate = ac;
                }
              }
              if (candidate && !seen.has(candidate)) {
                seen.add(candidate);
                try {
                  _ctrlHook(candidate);
                } catch (e) {
                  console.warn('[gxt] controller-set outlet rerender (interior) hook failed', e);
                }
              }
            }
          }
        }
      } catch (e) {
        // _objectValueCellMap.get on an arbitrary object should never throw,
        // but if WeakMap rejects (non-object key), fall through quietly, as
        // SyncCore's reverse lookup does.
        console.warn('[gxt] interior-mutation bridge owner walk failed', e);
      }
    }
  } finally {
    if (_afterTriggerReRender.length > 0) {
      for (let i = 0; i < _afterTriggerReRender.length; i++) {
        try {
          _afterTriggerReRender[i]!(obj, keyName);
        } catch {
          /* ignore */
        }
      }
    }
  }
};

// Exposed on the bridge as `compilePipeline.withTriggerSuppressed`, for
// validator.ts's track() re-entrancy guard and manager.ts's first-render
// suppression of new classic components.
function _gxtWithTriggerSuppressed<T>(fn: () => T): T {
  return _gxtWithFlag('triggerSuppressed', true, fn);
}

// Proto-walk + COMPONENT_MANAGERS lookup for the `hadNestedObjectChange`
// decision. Returns `true` iff `obj` is itself a root-component OR a
// custom-managed component instance (registered via `setComponentManager` →
// COMPONENT_MANAGERS). Classic Ember Components (registered via
// setInternalComponentManager → INTERNAL_MANAGERS) are deliberately treated as
// NOT custom-managed — their `set()` depends on the force-rerender to pick up
// alias / CP changes reliably. The 8-deep prototype-chain bound guards against
// pathological chains.
function _isCustomManagedComponent(obj: object): boolean {
  // Read via the gxt-bridge `rootComponent` namespace; the writer is
  // `glimmer/lib/renderer.ts`.
  const isRoot = getGxtRenderer()?.rootComponent.isRootComponent;
  if (typeof isRoot === 'function' && isRoot(obj)) {
    return true;
  }
  const compMgrs = getGxtRenderer()?.registries.componentManagers;
  if (compMgrs && typeof compMgrs.has === 'function') {
    let proto: any = Object.getPrototypeOf(obj);
    let depth = 0;
    while (proto && proto !== Object.prototype && depth < 8) {
      const ctor = proto.constructor;
      if (compMgrs.has(ctor) || compMgrs.has(proto)) {
        return true;
      }
      proto = Object.getPrototypeOf(proto);
      depth++;
    }
  }
  return false;
}

// Candidates-list + ctxsMap walk. Invokes `fn(ctx, isProto)` for each
// registered render context derived from `obj` (and from its prototype, where
// contexts are aggregated per prototype for classic-Ember components sharing a
// base class). `isProto` is `true` iff the context was found under the prototype
// bucket rather than under `obj` itself — callers use this to apply the
// cell-aliasing filter that prevents `obj`'s new value from leaking into
// sibling-instance cells under the same prototype.
//
// `_getOrCreateGxtComponentContexts` is always non-null (lazy-init), so callers
// do NOT need a truthy guard on the returned map.
function _walkRenderContexts(obj: object, fn: (ctx: object, isProto: boolean) => void): void {
  const ctxsMap = _getOrCreateGxtComponentContexts();
  if (!ctxsMap) return;
  // Check both the object itself and its prototype as keys.
  const candidates: object[] = [obj];
  try {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) candidates.push(proto);
  } catch {
    /* ignore */
  }

  for (const candidate of candidates) {
    const ctxs = ctxsMap.get(candidate);
    if (!ctxs) continue;
    const isProto = candidate !== obj;
    for (const ctx of ctxs) {
      try {
        fn(ctx, isProto);
      } catch {
        /* ignore */
      }
    }
  }
}

// The trigger-rerender body is split into `_gxtTriggerReRenderSyncCore`
// (synchronous-mandatory: cell.update, recomputeDependents, prototype-chain
// cell, render-context fan-out with bounded inner sibling-getter rescan,
// nested-path root, all flag-sets, hadNestedObjectChange decision) and
// `_gxtTriggerReRenderDeferred` (deferrable: modifier-install watcher,
// array-owner fan-out, objectValueCellMap fan-out, syncWrapper).
//
// SyncCore deliberately does NOT do an outer-obj sibling-getter rescan
// (`Object.getOwnPropertyNames(obj)` + prototype-getter walk on `obj` itself):
// that pattern caused unbounded queue growth via identity-churn from
// `get prop() { return new ... }` getters. The inner sibling-getter rescan on
// render-context wrappers (`cellTarget`) IS kept because it covers the
// legitimate aliased-getter case (controller `model` +
// `get derived() { return this.model + 1 }`), and is bounded by
// `_innerSiblingRescanDepth` against the same hazard.
function _gxtTriggerReRenderSyncCore(
  obj: object,
  keyName: string,
  value: unknown,
  hasValueArg: boolean
): void {
  // Primary cell.update on `obj` itself. Use the passed `value` directly when
  // `hasValueArg` is true (the ~85% of write traffic through set() / @tracked
  // setter), eliminating the getter call. The fallback getter read preserves
  // correctness for callers that don't pass `value` (notifyPropertyChange
  // invocations that omit the value argument).
  const newValue = hasValueArg ? value : (obj as any)[keyName];
  try {
    // Use skipDefine=true to avoid replacing tracked setters on the object.
    // The tracked setter calls dirtyTagFor which bumps the global revision
    // counter, which is essential for track()/validateTag() to work.
    // Using skipDefine=true still creates the cell in GXT's internal storage,
    // ensuring formula tracking works, without installing a getter/setter
    // that would shadow the tracked descriptor.
    const c = cellFor(obj, keyName, /* skipDefine */ true);
    if (c) c.update(newValue);
  } catch {
    try {
      const c = cellFor(obj, keyName, /* skipDefine */ true);
      if (c) c.update(newValue);
    } catch {
      /* ignore */
    }
  }
  // If a NEW key was added to an object an each-in source has iterated, bump
  // its key-SET revision so the source re-iterates. No-op when the key was
  // already observed (value-only change) or no each-in tracks `obj`.
  _gxtNotifyObjectKeyAdded(obj, keyName);
  // Collect owners that need their Ember tag dirtied for force-rerender.
  // The actual dirtying is deferred to AFTER gxtSyncDom + updateRootTagValues.
  // The OWNER COUNT decision here drives the `_gxtSetHadNestedObjectChange(true)`
  // flag-set below (SyncCore), but the actual `cellFor(...).update(obj)` fan-out
  // on the owners is performed by `_gxtTriggerReRenderDeferred`.
  let _deferredTagDirties: Array<{ obj: object; key: string }> | null = null;
  try {
    const owners = _objectValueCellMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        // Defer markObjectAsDirty to after gxtSyncDom + updateRootTagValues
        if (!_deferredTagDirties) _deferredTagDirties = [];
        _deferredTagDirties.push({ obj: ownerObj, key: ownerKey });
      }
    }
  } catch {
    /* ignore */
  }
  // Recompute computed properties that depend on the changed key.
  // Ember computed properties (e.g., @computed('message') get formattedMessage())
  // are replaced by cell-backed getters when cellFor is called. When the underlying
  // dependency changes, we need to re-evaluate the computed getter and update its cell.
  //
  // Routes through `getGxtRenderer()?.compilePipeline.recomputeDependents?.(obj,
  // keyName)`; state home is `metal/property_events.ts`.
  try {
    const dependents = getGxtRenderer()?.compilePipeline.recomputeDependents?.(obj, keyName);
    if (dependents) {
      for (const { key, value: depValue } of dependents) {
        try {
          const dc = cellFor(obj, key, /* skipDefine */ true);
          if (dc) dc.update(depValue);
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  // The `_arrayOwnerMap` fan-out (both branches — Array-typed and non-Array
  // wrapper) and the `_objectValueCellMap` reverse-lookup fan-out below MUST run
  // synchronously in SyncCore: template formulas in the SAME runtask read those
  // owner cells, so deferring their `cell.update` would create a read-after-set
  // inconsistency where the formula observes stale state (it regressed the
  // "considers array proxies with empty arrays falsy" cases). Per-owner
  // `_isOwnerAlive(ownerObj)` checks are a cheap defensive measure.
  if (keyName === '[]' || keyName === 'length') {
    if (Array.isArray(obj)) {
      const owners = _arrayOwnerMap.get(obj);
      if (owners) {
        for (const { obj: ownerObj, key: ownerKey } of owners) {
          if (!_isOwnerAlive(ownerObj)) continue;
          try {
            // Use skipDefine=true to avoid overwriting custom getters on renderContext
            // that were set up during createRenderContext. The custom getter reads
            // from the Ember instance via a getter function, while cellFor's default
            // getter reads from cell._value which may be stale for same-ref arrays.
            const c = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
            if (c) c.update(obj);
          } catch {
            /* ignore */
          }
        }
      }
    } else if (obj && typeof obj === 'object') {
      // Non-Array iterable wrappers (ArrayDelegate / ArrayProxy / Set / etc.)
      // — `arrayContentDidChange` notifies '[]'/'length' on the wrapper itself.
      // Look up registered owners for the WRAPPER and dirty their cells.
      const owners = _arrayOwnerMap.get(obj);
      if (owners) {
        for (const { obj: ownerObj, key: ownerKey } of owners) {
          if (!_isOwnerAlive(ownerObj)) continue;
          try {
            const c = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
            if (c) c.update(obj);
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
  // Reverse-lookup fan-out: dirty cells that hold `obj` as their VALUE.
  // This handles the case where a template reads {{this.m.formattedMessage}} —
  // the formula tracks cell(renderContext, 'm'), and when m.message changes,
  // we need to dirty that cell so the formula re-evaluates with the new
  // computed property result. Same-runtask template formulas read these
  // owner cells, so the cell.update must run synchronously.
  try {
    const owners = _objectValueCellMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        if (!_isOwnerAlive(ownerObj)) continue;
        try {
          const oc = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
          if (oc) oc.update(obj);
        } catch {
          /* ignore */
        }
        // Nested-args computed propagation: when the dirtied owner is a
        // component args-proxy carrying a back-reference to its component (set in
        // manager.ts createRenderContext), the component may have
        // `@computed('args.<ownerKey>.<keyName>')` getters that must recompute.
        // The arg reference itself didn't change (only a nested property on the
        // held object), so the dependent-CP loop above keyed on `obj` never
        // matched. Re-run recomputeDependents on the COMPONENT with the full
        // chain path so its arg-derived CPs (and their cells) refresh.
        try {
          const ownerComp = (ownerObj as any).__gxtOwnerComponent;
          if (ownerComp) {
            const chainKey = 'args.' + ownerKey + '.' + keyName;
            const deps = getGxtRenderer()?.compilePipeline.recomputeDependents?.(
              ownerComp,
              chainKey
            );
            if (deps) {
              for (const { key: depKey, value: depVal } of deps) {
                try {
                  const dcell = cellFor(ownerComp, depKey, /* skipDefine */ true);
                  if (dcell) dcell.update(depVal);
                } catch {
                  /* ignore */
                }
              }
            }
          }
        } catch {
          /* ignore — nested-args CP propagation is best-effort */
        }
        // `(hash)`/`(array)` computed propagation: when the dirtied owner cell
        // holds an Ember hash object, a member of it just changed (the hash's
        // source `cellFor` was linked to the hash member by
        // `_gxtLinkHashMemberSources`). gxt's `(hash)` identity is memoized
        // (stable across renders), so the hash arg's reference never changes and
        // a consuming component's `@computed('hash.firstName')` would otherwise
        // never re-fire. Recompute the CPs of every component that holds this
        // hash object as an arg (registered as a value-owner in
        // createRenderContext) keyed on the arg name (`hash`), so
        // `@computed('hash.<member>')` refreshes and its cell — which the
        // template tracks — updates.
        try {
          if ((ownerObj as any).__emberHashObject) {
            // Invalidate the Ember property tag the consumer's `@computed`
            // chain-key watches (`tagForProperty(hashObject, member)`); the
            // `cellFor(...).update` above bumps gxt's cell but not this tag, so
            // without it `CP.get` would serve the cached (stale) value.
            try {
              _gxtDirtyTagFor(ownerObj, ownerKey);
            } catch {
              /* best-effort */
            }
            const hashConsumers = _objectValueCellMap.get(ownerObj);
            if (hashConsumers) {
              for (const { obj: comp, key: argKey } of hashConsumers) {
                if (!_isOwnerAlive(comp)) continue;
                const deps = getGxtRenderer()?.compilePipeline.recomputeDependents?.(comp, argKey);
                if (deps) {
                  for (const { key: depKey, value: depVal } of deps) {
                    try {
                      const dcell = cellFor(comp, depKey, /* skipDefine */ true);
                      if (dcell) dcell.update(depVal);
                    } catch {
                      /* ignore */
                    }
                  }
                }
              }
            }
          }
        } catch {
          /* ignore — (hash) CP propagation is best-effort */
        }
      }
    }
  } catch {
    /* ignore */
  }
  // Also update cells on the prototype chain.
  // cellFor creates cells keyed by object identity. If a cell-backed getter
  // was installed on a prototype (e.g., via Component.extend({foo: true})),
  // the cell is keyed to that prototype, not the instance. We need to update
  // that prototype cell so GXT formulas tracking it will re-evaluate.
  try {
    let proto = Object.getPrototypeOf(obj);
    for (let depth = 0; depth < 5 && proto && proto !== Object.prototype; depth++) {
      const desc = Object.getOwnPropertyDescriptor(proto, keyName);
      if (desc && desc.get) {
        // This prototype has a getter for this key — likely a cell-backed getter
        const protoCell = cellFor(proto, keyName, /* skipDefine */ true);
        if (protoCell) protoCell.update(newValue);
        break; // Only need to update the first matching prototype
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch {
    /* ignore */
  }
  // Also dirty cells on ALL render contexts derived from this component.
  // GXT's $_if formula tracks cells on Object.create(component) wrappers.
  // The contexts map is keyed by prototype, so we check both obj and its
  // prototype. Walk delegated to `_walkRenderContexts`.
  try {
    _walkRenderContexts(obj, (ctx, isProto) => {
      // Use the raw target if ctx is a Proxy — cells are installed on the
      // raw target during initial render, so we must update the SAME cell.
      const cellTarget = (ctx as any).__gxtRawTarget || ctx;
      // For proto-keyed ctxs: only update cells whose raw target IS obj.
      // The prototype bucket aggregates contexts from every instance
      // sharing the prototype (e.g., every x-toggle instance). Without
      // this filter, obj's new value leaks into every sibling instance's
      // cell — the cell-aliasing bug that broke the View tree tests by
      // flipping all x-toggle {{#if}} branches at once whenever one was
      // toggled.
      if (isProto && cellTarget !== obj) return;
      // A context whose target is `obj` itself must not get a cell accessor
      // over a `@tracked` key: it would shadow the tracked accessor
      // (`isTrackedAccessor`), and the next write would render nothing.
      const rc = cellFor(
        cellTarget,
        keyName,
        /* skipDefine */ cellTarget === obj && isTrackedAccessor(obj, keyName)
      );
      if (rc) {
        rc.update(newValue);
      }
      // Also re-evaluate sibling getter cells on the same render context.
      // When a controller's `model` is updated on the renderContext, any
      // plain JS getter on the controller prototype that reads `this.model`
      // (e.g. `get derived() { return this.model + 1 }`) has a cell
      // installed on the renderContext (see root.ts prototype-getter pass),
      // but that cell is static — it captured the initial value and has
      // no declared dependency on `model`. Walk the renderContext's own
      // keys and, for each key whose value comes from a prototype getter,
      // re-read via that getter and refresh the cell so formulas tracking
      // the getter key re-evaluate.
      //
      // Bounded by `_innerSiblingRescanDepth` against identity-churn from
      // wrapper-aliased getters that return new instances per call. Scoped to
      // render-context wrappers, with the same depth limit as the
      // prototype-chain walk.
      if (_innerSiblingRescanDepth >= _INNER_SIBLING_RESCAN_MAX_DEPTH) {
        console.warn('[gxt] inner sibling-getter rescan depth exceeded', {
          keyName,
          depth: _innerSiblingRescanDepth,
        });
        return;
      }
      _innerSiblingRescanDepth++;
      try {
        const ownKeys = Object.getOwnPropertyNames(cellTarget);
        for (const ownKey of ownKeys) {
          if (ownKey === keyName) continue;
          if (ownKey.startsWith('_') || ownKey.startsWith('$')) continue;
          try {
            const ownDesc = Object.getOwnPropertyDescriptor(cellTarget, ownKey);
            if (!ownDesc || !ownDesc.get || !ownDesc.configurable) continue;
            let protoGetter: (() => any) | null = null;
            let p = Object.getPrototypeOf(cellTarget);
            while (p && p !== Object.prototype) {
              const pd = Object.getOwnPropertyDescriptor(p, ownKey);
              if (pd && pd.get) {
                protoGetter = pd.get;
                break;
              }
              p = Object.getPrototypeOf(p);
            }
            if (!protoGetter) continue;
            const freshVal = protoGetter.call(cellTarget);
            const oc = cellFor(cellTarget, ownKey, /* skipDefine */ true);
            if (oc) oc.update(freshVal);
          } catch {
            /* skip */
          }
        }
      } finally {
        _innerSiblingRescanDepth--;
      }
    });
  } catch {
    /* ignore */
  }
  // For nested paths like 'colors.apple', also dirty the root property cell.
  // Templates read `this.colors` which creates a cell for 'colors'. When
  // set(obj, 'colors.apple', val) fires, we need to dirty 'colors' too
  // so the template re-evaluates the full path.
  if (keyName.includes('.')) {
    const rootKey = keyName.split('.')[0]!;
    try {
      const rootCell = cellFor(obj, rootKey, /* skipDefine */ true);
      if (rootCell) rootCell.update((obj as any)[rootKey]);
    } catch {
      /* ignore */
    }
  }

  _gxtSetPendingSync(true);
  _gxtSetPendingSyncFromPropertyChange(true);
  // If this property change originated from a `schedule('afterRender', ...)`
  // callback, record that fact. runAppend uses this to decide whether a
  // property-change flag set during the initial-render runloop should be
  // preserved for the subsequent syncNow() call — property changes from
  // afterRender callbacks are legitimate user sets (the `afterRender set`
  // pattern) and must trigger gxtSyncDom, while property changes from
  // component init (e.g. Textarea's internal bindings) are init artifacts
  // that should not cause a post-runAppend full sync.
  if (_gxtGetInAfterRender()) {
    _gxtSetAfterRenderPropertyChange(true);
  }
  // Tell the force-rerender (`_gxtForceEmberRerender`) that nested object
  // changes occurred. When a property changes on a nested object (e.g.,
  // set(m, 'message', ...) or foo.set('text', ...)), the component's SELF_TAG
  // is NOT dirtied by Ember (only the object's tag is). The hadNestedObjectChange
  // flag lets the force-rerender fall back to rendering all roots so computed
  // properties like {{this.m.formattedMessage}} re-evaluate.
  //
  // Case 1: tag dirtying was reverse-looked-up via _objectValueCellMap
  // (explicit cell registration) — use the pre-computed _deferredTagDirties.
  // Case 2: the mutated object is NOT itself a root component — treat it as
  // a nested object too. This catches external EmberObjects / plain classes
  // passed as @args whose property mutations don't trigger SELF_TAG changes
  // on any component.
  if (_deferredTagDirties && _deferredTagDirties.length > 0) {
    _gxtSetHadNestedObjectChange(true);
  } else if (obj && typeof obj === 'object') {
    // If `obj` is NOT a CUSTOM-managed component instance (root OR child),
    // treat it as a nested-object mutation that needs cross-root propagation
    // via the force-rerender fallback.
    //
    // Custom-managed components (those registered via setComponentManager
    // → COMPONENT_MANAGERS) use their own dependency-tracking semantics
    // (args proxy + explicit @tracked), and their @tracked state changes
    // are handled by the cell-based sync pipeline without the force-all
    // rerender.
    //
    // We deliberately do NOT treat classic Ember Components (registered via
    // setInternalComponentManager → INTERNAL_MANAGERS) the same way —
    // classic components' set() goes through notifyPropertyChange and
    // depends on the force-rerender to pick up alias / computed property
    // changes reliably.
    //
    // The proto-walk + manager lookup is delegated to
    // `_isCustomManagedComponent`; on a caught exception we conservatively
    // treat `obj` as a nested-object.
    try {
      if (!_isCustomManagedComponent(obj)) {
        _gxtSetHadNestedObjectChange(true);
      }
    } catch {
      // If the check fails, be conservative and treat as nested-object.
      _gxtSetHadNestedObjectChange(true);
    }
  }
}

function _gxtTriggerReRenderDeferred(obj: object, keyName: string): void {
  // Only the two side-effects that do NOT participate in same-runtask formula
  // reads are deferred here: the modifier-install watcher dispatch and the
  // wrapper-element sync. (The cell.update fan-outs run synchronously in
  // SyncCore — see the note there.)

  // Custom modifier manager: notify install-phase watcher if this object is a
  // modifier instance whose installModifier is currently running. Classic Ember
  // captures tags dirtied inside the install track frame and schedules an update.
  // We mirror that by calling the registered watcher, which flags the instance
  // for an additional updateModifier call after install returns.
  //
  // The watchers Map lives in `gxt-backend/manager.ts`; this cross-file reader
  // routes through `compilePipeline.getModifierInstallWatchers?.()`.
  const modWatchers = getGxtRenderer()?.compilePipeline.getModifierInstallWatchers?.();
  if (modWatchers instanceof Map && modWatchers.size > 0) {
    const watcher = modWatchers.get(obj);
    if (typeof watcher === 'function') watcher();
  }
  // Sync wrapper element if the object has attribute/class bindings.
  try {
    getGxtRenderer()?.compilePipeline.syncWrapper(obj, keyName);
  } catch {
    /* ignore */
  }
}

// $_if watchers. $_if is patched to capture IfCondition instances and register
// callbacks keyed by (object, property); `_gxtTriggerReRender` calls them to
// sync the IfCondition directly. This keeps `{{#if}}` conditions current when
// Vite serves gxt's internal chunks (vm-*.js, dom-*.js) with different ?v=
// query strings, which creates two instances of the reactive core whose cells
// and opcodes do not see each other.
//
// IfCondition's internal placeholder also gets disconnected when the compat
// layer moves rendered nodes into wrapper divs, so the placeholder and target
// are included in the extracted RENDERED_NODES and itemToNode keeps them.

// Watcher callbacks may optionally carry a `__getNextBool` reader and a
// `__ifCondition` ref so the flush phase can evaluate them in a parent-first
// order (false-flips before true-flips). This avoids inner conditionals
// rendering content during the same batch where their parent goes false —
// regression case: shared "child conditional should not render children if
// parent conditional becomes false".
type IfWatcherCb = ((notifiedTarget: object) => void) & {
  __getNextBool?: (notifiedTarget: object) => boolean;
  __ifCondition?: any;
};
let ifWatchers = new WeakMap<object, Map<string, Set<IfWatcherCb>>>();

// The pre-flush FALSE-flip block in `_gxtSyncDomNow` stashes the set of cbs
// already fired here so the later flush can skip them. Both writer and reader
// live in the same scheduler tick.
let _gxtPreFlushFiredFalse: Set<IfWatcherCb> | undefined;

// Parent-If stack used by the $_if wrapBranch save/restore pattern so nested
// $_if invocations during a parent branch evaluation can record themselves as
// children of the enclosing IfCondition (via its stable ref holder). All
// functional sites — outer wrapBranch save+set, inner wrappedInnerBranch
// save+set, both restores in finally blocks, and the post-origIf reader that
// wires the parent→child relationship — live in this file. Save/restore
// tolerates `undefined`, so no lazy-init is needed.
let _gxtCurrentParentIfRef: any = undefined;

// HTML-comment registry: the `gxtHtmlCommentTransform` AST visitor registers each
// `<!-- ... -->` body under a stable plain-ASCII token and emits
// `(__gxtCommentLookup "<token>")`; the `__gxtCommentLookup` resolver (below) reads
// it back at render time. The registry and its writer live in `ast-transforms.ts`;
// this file only reads it, via `lookupGxtComment`.

// In-element literal-id fallback stack, pushed by the GXT render-template
// wrapper before invoking the template body and consumed by `$_inElement` when
// the destination ref resolves to null/undefined during a render pass: it
// then takes an id (a compile-time literal element id captured from the
// `#in-element` destination expression) off the stack, so the renderer can
// defer the body insertion and re-resolve against the now-attached parent
// fragment. The stack is preserved across nested render passes via the
// `_inElemStackStart` index snapshot at the push site (NOT via array
// replacement), so the shared module-local array is safe under reentrancy.
const _inElementFallbackIds: string[] = [];

// Persistent set of classic-component wrapper DOM ids that the user has
// directly toggled to `false` via a click handler calling set()/toggleProperty.
// `_afterRebuildViewTreeFromDom` resets the view-registry's CHILD_VIEW_IDS for
// those wrappers so getChildViews returns empty (matching the collapsed
// {{#if}} branch) even if GXT's own destroyBranchSync was a no-op for the
// yield-only true branch.
//
// manager.ts reads it through `viewUtils.getWrapperUserFalseSet()` to restore
// `isExpanded = false` on freshly-constructed component instances whose
// wrapper id was user-toggled false (load-bearing for the View tree
// x-toggle/visit() cycle assertions).
const _wrapperIfUserFalse = new Set<string>();
// Map of wrapperId -> Set of {condFn, placeholder} entries. Populated by the
// ifWatcher when the user toggles to false. `_afterRebuildViewTreeFromDom`
// uses it to verify at read time that a LIVE-DOM-connected IfCondition for
// this wrapper still reports false. Needed because pool-reuse creates multiple
// stale IfCondition instances sharing the same wrapperId — only the one
// whose placeholder is currently inside the live #wrapperId element
// represents the user-visible state.
type _IfCondEntry = { condFn: () => any; placeholder: any; ifCondition: any };
const _wrapperIfCondLookup = new Map<string, Set<_IfCondEntry>>();

// Allow clearing ifWatchers between tests to prevent stale callbacks.
function _gxtClearIfWatchers(): void {
  ifWatchers = new WeakMap();
  _wrapperIfUserFalse.clear();
  _wrapperIfCondLookup.clear();
}

// Module-scope helper: is `par` a classic-component wrapper element
// (an element with class="ember-view")?
function _isEmberViewWrapper(par: any): boolean {
  if (!par || par.nodeType !== 1) return false;
  if (!par.getAttribute) return false;
  const cls = par.getAttribute('class');
  if (!cls) return false;
  return /\bember-view\b/.test(cls);
}

function registerIfWatcher(rawTarget: object, key: string, callback: IfWatcherCb) {
  let keyMap = ifWatchers.get(rawTarget);
  if (!keyMap) {
    keyMap = new Map();
    ifWatchers.set(rawTarget, keyMap);
  }
  let watchers = keyMap.get(key);
  if (!watchers) {
    watchers = new Set();
    keyMap.set(key, watchers);
  }
  watchers.add(callback);
}

// Order pending watcher notifications so that watchers becoming FALSE fire
// BEFORE watchers becoming TRUE. This guarantees a parent {{#if}} that toggles
// to false in the same batch tears down its branch BEFORE the inner
// {{#if}} tries to evaluate its true branch — preventing transient component
// instantiation. Returns the ordered list of (cb, obj) tuples to invoke.
function _orderIfWatcherFlush(
  pending: Array<{ obj: object; keyName: string }>
): Array<{ cb: IfWatcherCb; obj: object }> {
  const falseFirst: Array<{ cb: IfWatcherCb; obj: object }> = [];
  const trueLast: Array<{ cb: IfWatcherCb; obj: object }> = [];
  const unknown: Array<{ cb: IfWatcherCb; obj: object }> = [];
  // Track (cb, obj) we've already enqueued to avoid duplicates when a single
  // (obj, key) appears in pending more than once.
  const seen = new Set<string>();
  for (const { obj, keyName } of pending) {
    // Candidate list: obj + its prototype + render-context proxies that wrap
    // obj. Notification fires on each.
    const candidates: object[] = [obj];
    try {
      const proto = Object.getPrototypeOf(obj);
      if (proto && proto !== Object.prototype) candidates.push(proto);
    } catch {
      /* ignore */
    }
    const ctxsMap = _getOrCreateGxtComponentContexts();
    if (ctxsMap) {
      const ctxs = ctxsMap.get(obj);
      if (ctxs) {
        for (const ctx of ctxs) {
          const raw = (ctx as any)?.__gxtRawTarget || ctx;
          if (!candidates.includes(raw)) candidates.push(raw);
        }
      }
    }
    for (const target of candidates) {
      const keyMap = ifWatchers.get(target);
      if (!keyMap) continue;
      const watchers = keyMap.get(keyName);
      if (!watchers) continue;
      for (const cb of watchers) {
        // Stable id per (cb, obj): prefer ifCondition pointer + obj identity.
        const ifc = cb.__ifCondition;
        // Fallback id when ifCondition is missing — use the cb itself.
        const idKey = ifc || cb;
        // Keyed by both the watcher target and the notifying obj so the same
        // watcher may fire once per distinct obj it cares about.
        const slot =
          (idKey as any).__gxtFlushIdSlot ||
          ((idKey as any).__gxtFlushIdSlot = new WeakMap<object, string>());
        let id = slot.get(obj);
        if (!id) {
          id = `${(target as any) === obj ? 'd' : 'p'}-${Math.random()}`;
          slot.set(obj, id);
        }
        if (seen.has(id)) continue;
        seen.add(id);
        let nextBool: boolean | null = null;
        if (typeof cb.__getNextBool === 'function') {
          try {
            nextBool = cb.__getNextBool(obj);
          } catch {
            nextBool = null;
          }
        }
        if (nextBool === false) falseFirst.push({ cb, obj });
        else if (nextBool === true) trueLast.push({ cb, obj });
        else unknown.push({ cb, obj });
      }
    }
  }
  // unknown placed between false-first and true-last so previously-untracked
  // watchers retain their relative ordering vs. the explicit true flips.
  return [...falseFirst, ...unknown, ...trueLast];
}

// ---------------------------------------------------------------------------
// {{#if}}/{{#unless}} branch class-helper teardown (module-level helpers).
//
// Ember's classic `Helper` lifecycle requires `destroy`/`willDestroy` to fire at
// block-teardown time. When a `{{#if}}` branch is torn down (a true↔false swap
// or the whole `{{#if}}` collapsing), any class-based helper instances created
// during that branch's evaluation must be destroyed. `patchGlobalIf`'s
// `wrapBranch` captures those instances into per-branch Sets
// (`trueBranchHelpers` / `falseBranchHelpers`); these functions reap them.
//
// gxt's `onConditionBranchSwap` host hook (registered near
// `registerHostHooks`) runs a fresh per-branch ctx's destructors at the start
// of the outgoing branch's teardown, before its DOM is removed, so the reaping
// runs there. These helpers only close over `getGxtRenderer()` and the
// module-local `_tagHelperInstanceCache` (forward-referenced; the bodies run
// long after module init).
function _gxtDestroyHelperScope(scope: Set<any>): void {
  if (!scope || scope.size === 0) return;
  const copy = Array.from(scope);
  scope.clear();
  const evictFromCache = (cache: any) => {
    try {
      if (cache && typeof cache.forEach === 'function') {
        // Cache values may be a raw instance, a manager-path wrapper
        // `{__managerBucket, bucket:{instance}}`, or a compile-time
        // `{ instance, recomputeTag }` shape.
        const toDelete: any[] = [];
        cache.forEach((v: any, k: any) => {
          let instCandidate: any = v;
          if (v && v.__managerBucket) instCandidate = v.bucket?.instance;
          else if (v && v.instance) instCandidate = v.instance;
          if (instCandidate && copy.indexOf(instCandidate) !== -1) {
            toDelete.push(k);
          }
        });
        for (const k of toDelete) cache.delete(k);
      }
    } catch {
      /* ignore */
    }
  };
  evictFromCache(getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.());
  evictFromCache(_tagHelperInstanceCache);
  for (const inst of copy) {
    try {
      if (inst && typeof inst.destroy === 'function' && !inst.isDestroyed && !inst.isDestroying) {
        inst.destroy();
      }
    } catch {
      /* ignore */
    }
  }
}
// Snapshot the class-helper instance-cache keys BEFORE a branch body renders, so
// the branch-teardown destructor can reap helpers created inside a DEFERRED
// formula (outside `wrapBranch`'s dynamic scope, so absent from the per-branch
// Set). Fallback for the old `snapshotCacheKeys`/`destroyNewCacheEntriesSince`.
function _gxtSnapshotClassHelperCacheKeys(): Set<string> {
  try {
    const cache = getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.();
    if (cache && typeof cache.forEach === 'function') {
      const s = new Set<string>();
      cache.forEach((_v: any, k: string) => s.add(k));
      return s;
    }
  } catch {
    /* ignore */
  }
  return new Set<string>();
}
function _gxtDestroyNewClassHelperCacheEntriesSince(prev: Set<string> | null): void {
  try {
    const cache = getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.();
    if (!cache || typeof cache.forEach !== 'function') return;
    const toDelete: string[] = [];
    cache.forEach((_v: any, k: string) => {
      if (!prev || !prev.has(k)) toDelete.push(k);
    });
    for (const k of toDelete) {
      const entry = cache.get(k);
      cache.delete(k);
      const inst = entry && entry.__managerBucket ? entry.bucket?.instance : entry;
      if (inst && typeof inst.destroy === 'function' && !inst.isDestroyed && !inst.isDestroying) {
        try {
          inst.destroy();
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
}

// Patch $_if to capture IfCondition instances and fix placeholder connectivity.
function patchGlobalIf() {
  const g = globalThis as any;
  if (!g.$_if || g.$_if.__emberPatched) return false;
  const origIf = g.$_if;
  g.$_if = function patchedIf(conditionOrCell: any, trueBranch: any, falseBranch: any, ctx: any) {
    const watchTarget = conditionOrCell?.__gxtWatchTarget;
    const watchKey = conditionOrCell?.__gxtWatchKey;

    // Capture class-based helper instances created during trueBranch/falseBranch
    // evaluation so we can call `destroy()` on them when the branch is torn down
    // (e.g., `{{#if this.show}}{{hello-world}}{{/if}}` with `show` toggled to
    // false). Ember's classic Helper lifecycle requires destroy + willDestroy
    // to fire at block-teardown time, not only on top-level render teardown.
    const trueBranchHelpers = new Set<any>();
    const falseBranchHelpers = new Set<any>();
    // Build a parent-IfCondition link when an outer {{#if}} renders its true
    // branch. Any nested $_if invocation inside that branch evaluation registers
    // the new (inner) IfCondition as a child here. When the outer collapses
    // (syncState(false)), we mark every recorded child with the current sync-
    // cycle id so its own syncState(true) becomes a no-op for that cycle.
    const childIfConditions = new Set<any>();
    // We need a stable handle for the parent-If stack that wrapBranch can push
    // even when called from `origIf`'s constructor (synchronously, BEFORE the
    // outer `const ifCondition = origIf(...)` assignment completes). Use a
    // mutable holder object whose identity is stable; fill in `.ifCondition`
    // after origIf returns so descendants pushed during construction can still
    // reach back to us once we exist.
    const ifConditionRef: any = {
      ifCondition: null,
      childIfConditions,
      lastKnownPlaceholderParent: null as Node | null,
    };
    // Capture the OWNING view at construction time. When this `{{#if}}` lives
    // inside a component's yielded block (e.g.
    // `{{#x-outer}}{{#if showInner}}{{x-inner}}{{/if}}{{/x-outer}}`), the slot
    // fn is rendering during x-outer's `{{yield}}`, so the parent-view stack
    // top is x-outer here. On a later `set(showInner,true)` the GXT-native
    // if-opcode fires the bound original `syncState` (captured at IfCondition
    // construction, BEFORE compile.ts replaced `ifCondition.syncState`), so the
    // syncState wrapper's parentView push is bypassed and the new {{x-inner}}
    // resolves parentView=null. We re-push THIS captured owner around the
    // branch evaluation in `wrappedBranch` (which the opcode path DOES traverse
    // via renderState → trueBranch) so toggled-in sub-components get the right
    // parentView (curly `newly-added sub-components get correct parentView`).
    const _capturedIfParentView: any = (() => {
      try {
        const vu = getGxtRenderer()?.viewUtils;
        const pv = vu?.getCurrentParentView?.();
        if (
          pv &&
          typeof pv === 'object' &&
          ((pv as any).isView === true ||
            'elementId' in (pv as any) ||
            typeof (pv as any).trigger === 'function')
        ) {
          return pv;
        }
      } catch {
        /* viewUtils may be unavailable */
      }
      return null;
    })();
    const wrapBranch = (fn: any, scope: Set<any>) => {
      if (typeof fn !== 'function') return fn;
      return function wrappedBranch(this: any, ...branchArgs: any[]) {
        // Suppress branch evaluation when our parent {{#if}} collapsed earlier
        // in the same sync cycle. GXT calls the bound original syncState from
        // its tag-listener loop, which then calls renderState → trueBranch
        // (= this wrappedBranch). Returning an empty render result here keeps
        // foo-bar et al. from instantiating into a dead subtree (regression:
        // "child conditional should not render children if parent conditional
        // becomes false").
        try {
          const ifc = ifConditionRef.ifCondition;
          const myDeadCycle = ifc && (ifc as any).__gxtParentDeadCycle;
          const cycleId = _gxtGetSyncCycleId();
          // Suppress only the TRUE branch (the only one that can instantiate
          // child components in the regression scenario). The FALSE branch is
          // typically empty content; suppressing it could leave stale DOM.
          if (myDeadCycle === cycleId && fn === trueBranch) {
            // Mirror what GXT's renderState assigns to prevComponent for an
            // empty fragment: an empty array is acceptable here because the
            // node-insertion downstream just appends the children of [].
            return [];
          }
        } catch {
          /* ignore — fall through to normal eval */
        }
        // Save-restore frame on `_gxtCurrentHelperScope` (see its declaration).
        const prev = _gxtCurrentHelperScope;
        _gxtCurrentHelperScope = scope;
        // Push this IfCondition (via a stable ref holder) onto the parent-If
        // stack so nested $_if invocations during fn() can record us as their
        // parent. Using a ref holder is required because origIf may invoke
        // wrapBranch SYNCHRONOUSLY from its constructor (before the outer
        // `const ifCondition` is assigned).
        const prevParentIf = _gxtCurrentParentIfRef;
        _gxtCurrentParentIfRef = ifConditionRef;
        // CRITICAL: On a true→false branch toggle, GXT's internal `TREE` map may
        // have lost the IfCondition's entry (cleared by a destroy-cascade
        // destructor from the previous branch's teardown). Without
        // `TREE.get(ifCondition.Z) === ifCondition`, downstream
        // `setParentContext(ifCondition)` calls result in `getParentContext()`
        // returning `undefined`, which crashes `$_GET_ARGS → addToTree(undefined, ...)`.
        //
        // Fix: re-register the IfCondition in the TREE before evaluating the new
        // branch. Clear the IfCondition's `ADDED_TO_TREE_FLAG` and call
        // `$_GET_ARGS` with the original `ctx` on top of the parent-context
        // stack; that routes through `addToTree(ctx, ifCondition)` which reinstates
        // the TREE entry.
        const ifcRef = ifConditionRef.ifCondition;
        if (ifcRef && ctx) {
          try {
            gxtSetParentContext(ifcRef as any);
            const resolved = _gxtGetParentContext();
            gxtSetParentContext(null);
            if (resolved !== ifcRef) {
              // IfCondition was unregistered — restore TREE entry.
              const attSym = Object.getOwnPropertySymbols(ifcRef).find(
                (s) => (ifcRef as any)[s] === false
              );
              if (attSym) {
                try {
                  delete (ifcRef as any)[attSym];
                } catch {
                  /* ignore */
                }
              }
              try {
                gxtSetParentContext(ctx as any);
                try {
                  (_gxtGetArgs as any)(ifcRef, [] as any);
                } catch {
                  /* ignore */
                }
                gxtSetParentContext(null);
              } catch {
                /* ignore */
              }
            }
          } catch {
            /* ignore */
          }
        }
        // CRITICAL: Re-check placeholder connectivity AFTER destroyBranchSync
        // (which ran just before this function was invoked by renderState).
        // The destroy cascade may have removed the placeholder from its parent
        // when the outgoing branch's RENDERED_NODES snapshot captured the
        // placeholder as a sibling. If the placeholder is disconnected, the
        // downstream `renderElement` call inside renderState falls back to the
        // IfCondition's private `target` DocumentFragment, which is NOT in the
        // live DOM — the newly-rendered component ends up orphaned and fails
        // the `isConnected` check in the deferred didInsertElement callback.
        //
        // Track the placeholder's last known live parent; when the placeholder
        // is disconnected, reattach to that parent. We ONLY reattach when we
        // have a previously-observed live parent — without that evidence, the
        // placeholder may have been intentionally detached (e.g. nested
        // IfCondition teardown under a parent collapse) and reattaching to an
        // unrelated element would leak content into the wrong DOM subtree.
        if (ifcRef) {
          try {
            const ph = (ifcRef as any).placeholder;
            if (ph) {
              if ((ph as any).parentNode && (ph as any).parentNode.isConnected) {
                // Remember the current live parent for future teardown cycles.
                ifConditionRef.lastKnownPlaceholderParent = (ph as any).parentNode;
              } else if (!(ph as any).isConnected) {
                // Disconnected — try to reattach to last known live parent.
                const lkp: Node | null = ifConditionRef.lastKnownPlaceholderParent;
                if (lkp && (lkp as any).isConnected) {
                  try {
                    (lkp as any).appendChild(ph);
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
          } catch {
            /* ignore */
          }
        }
        // Push the captured owning view (fine-grained only) so components
        // created during this branch evaluation — including via the opcode-
        // driven toggle path that bypasses the syncState parentView push —
        // resolve the correct parentView. No-op when nothing was captured or
        // when the same view is already on the stack (initial render).
        const _vuPush = _capturedIfParentView ? getGxtRenderer()?.viewUtils : null;
        let _pushedIfParent = false;
        if (_vuPush && typeof _vuPush.pushParentView === 'function') {
          try {
            _vuPush.pushParentView(_capturedIfParentView);
            _pushedIfParent = true;
          } catch {
            /* ignore */
          }
        }
        try {
          const result = fn.apply(this, branchArgs);
          // If the branch returns a function (common pattern:
          // `ctx0 => $_ucw(ctx1 => [...], ctx0)` where $_ucw may invoke the
          // inner arrow later), wrap the inner call so that scope is active
          // when the nested render runs.
          if (typeof result === 'function') {
            const inner = result;
            const wrappedInner = function wrappedInnerBranch(this: any, ...innerArgs: any[]) {
              // Save-restore frame on `_gxtCurrentHelperScope` (see its declaration).
              const prev2 = _gxtCurrentHelperScope;
              _gxtCurrentHelperScope = scope;
              const prev3 = _gxtCurrentParentIfRef;
              _gxtCurrentParentIfRef = ifConditionRef;
              const ifcRef2 = ifConditionRef.ifCondition;
              let pushedPc2 = false;
              if (ifcRef2) {
                try {
                  gxtSetParentContext(ifcRef2 as any);
                  pushedPc2 = true;
                } catch {
                  /* ignore */
                }
              }
              // Re-push the captured owning view for the DEFERRED branch body
              // (the `$_ucw` inner arrow that actually instantiates the toggled
              // sub-component). See _capturedIfParentView doc above.
              const _vuPush2 = _capturedIfParentView ? getGxtRenderer()?.viewUtils : null;
              let _pushedIfParent2 = false;
              if (_vuPush2 && typeof _vuPush2.pushParentView === 'function') {
                try {
                  _vuPush2.pushParentView(_capturedIfParentView);
                  _pushedIfParent2 = true;
                } catch {
                  /* ignore */
                }
              }
              try {
                return inner.apply(this, innerArgs);
              } finally {
                if (_pushedIfParent2 && _vuPush2) {
                  try {
                    _vuPush2.popParentView();
                  } catch {
                    /* ignore */
                  }
                }
                if (pushedPc2) {
                  try {
                    gxtSetParentContext(null);
                  } catch {
                    /* ignore */
                  }
                }
                _gxtCurrentHelperScope = prev2;
                _gxtCurrentParentIfRef = prev3;
              }
            };
            return wrappedInner;
          }
          return result;
        } finally {
          if (_pushedIfParent && _vuPush) {
            try {
              _vuPush.popParentView();
            } catch {
              /* ignore */
            }
          }
          _gxtCurrentHelperScope = prev;
          _gxtCurrentParentIfRef = prevParentIf;
        }
      };
    };
    const wrappedTrue = wrapBranch(trueBranch, trueBranchHelpers);
    const wrappedFalse = wrapBranch(falseBranch, falseBranchHelpers);

    // Normalize literal `null` conditions — GXT's $_if internals call
    // `.value` or `Symbol()` on the condition and crash when it is raw
    // `null`. Coerce to `false` (Ember's `null` is falsy in {{#if}}).
    // Other primitives (false, 0, '', undefined, true) are handled by
    // the upstream path; only `null` is special-cased here.
    let normalizedCondition = conditionOrCell;
    if (normalizedCondition === null) {
      normalizedCondition = false;
    }

    const ifCondition = origIf(normalizedCondition, wrappedTrue, wrappedFalse, ctx);

    if (ifCondition) {
      // Attach the child-conditional registry to this IfCondition AND to the
      // stable ref holder. The ref holder may already have been pushed onto
      // the parent-If stack by a wrapBranch invocation BEFORE we were assigned
      // — children captured during that synchronous eval are still listed in
      // childIfConditions (the same Set object), so they map to us correctly.
      (ifCondition as any).__gxtChildIfConditions = childIfConditions;
      ifConditionRef.ifCondition = ifCondition;
      // If this $_if invocation happened inside a parent {{#if}}'s true branch
      // evaluation, register us as a child of that parent so the parent can
      // suppress us when it collapses in the same sync cycle.
      const parentIfRef = _gxtCurrentParentIfRef;
      if (parentIfRef && parentIfRef !== ifConditionRef) {
        const parentChildren = parentIfRef.childIfConditions;
        if (parentChildren && typeof parentChildren.add === 'function') {
          parentChildren.add(ifCondition);
        }
      }
    }

    // Branch class-helper teardown. Stash the per-branch helper-capture Sets
    // on the IfCondition so the global `onConditionBranchSwap` hook can reap
    // them on each branch SWAP (gxt fires that hook's per-branch ctx
    // destructor at the start of the outgoing branch's teardown, before DOM
    // removal). Here we additionally register the whole-`{{#if}}` destroy
    // fallback: reap BOTH branches promptly when the IfCondition itself is
    // torn down (whole `{{#if}}` removed with no final swap; gxt fires
    // `registerDestructor` callbacks on the IfCondition synchronously on
    // destroy). `_gxtDestroyHelperScope` is idempotent (clears the Set +
    // guards `isDestroyed`), so a prior swap-time hook teardown makes this a
    // no-op.
    if (ifCondition && !(ifCondition as any).__emberHelperCleanupInstalled) {
      (ifCondition as any).__emberHelperCleanupInstalled = true;
      (ifCondition as any).__gxtTrueBranchHelpers = trueBranchHelpers;
      (ifCondition as any).__gxtFalseBranchHelpers = falseBranchHelpers;
      try {
        _gxtRegisterDestructor(ifCondition as unknown as object, () => {
          _gxtDestroyHelperScope(trueBranchHelpers);
          _gxtDestroyHelperScope(falseBranchHelpers);
        });
      } catch {
        /* ignore — best-effort prompt teardown */
      }
    }

    if (watchTarget && watchKey && ifCondition) {
      // Fix placeholder connectivity: ensure the IfCondition's target
      // (DocumentFragment containing placeholder + rendered content)
      // is returned as a single unit. Replace RENDERED_NODES with the
      // target's childNodes so itemToNode returns the whole fragment.
      if (ifCondition.target && ifCondition.placeholder) {
        const renderedProp = RENDERED_NODES_PROPERTY;
        if (renderedProp) {
          // Replace the RENDERED_NODES with the target itself
          // This ensures itemToNode returns all nodes including placeholder
          const target = ifCondition.target;
          if (target.childNodes) {
            ifCondition[renderedProp] = Array.from(target.childNodes);
          }
        }
      }

      // Track the placeholder's "last known parent" so we can reattach it
      // when it gets orphaned. After the IfCondition is appended to the live
      // DOM, GXT moves children of target (including the placeholder) into
      // the wrapper element. If the wrapper is later force-rerendered or
      // fastCleaned, the placeholder gets disconnected — but the IfCondition
      // still references it for insertBefore() during syncState. We capture
      // the placeholder's parent the first time it becomes connected, and
      // reattach the placeholder there before each syncState call when it's
      // orphaned.
      let lastKnownParent: Node | null = null;
      const repairPlaceholder = () => {
        const ph = ifCondition.placeholder;
        if (!ph) return;
        if (ph.parentNode) {
          // Currently connected — remember the parent
          lastKnownParent = ph.parentNode;
          // Also stash on the shared ref so wrapBranch can reattach the
          // placeholder on a true→false toggle when destroyBranchSync's
          // RENDERED_NODES snapshot destruction detaches it as a side effect.
          try {
            ifConditionRef.lastKnownPlaceholderParent = ph.parentNode;
          } catch {
            /* ignore */
          }
          return;
        }
        // Disconnected — try to reattach
        // Strategy 1: use lastKnownParent if it's still connected
        let parent: Node | null = lastKnownParent;
        if (parent && !(parent as any).isConnected) parent = null;
        // Strategy 2: use the prevComponent's first node's parent
        if (!parent) {
          const prev = ifCondition.prevComponent;
          if (prev) {
            const arr = Array.isArray(prev) ? prev : [prev];
            for (const item of arr) {
              const node =
                item && (item as any).nodeType
                  ? item
                  : item && (item as any)[RENDERED_NODES_PROPERTY!]?.[0];
              if (node && node.parentNode && node.parentNode.isConnected) {
                parent = node.parentNode;
                break;
              }
            }
          }
        }
        // Strategy 3: use the original target if it's connected
        if (!parent && ifCondition.target && (ifCondition.target as any).isConnected) {
          parent = ifCondition.target;
        }
        // Strategy 4: scan ifCondition[RENDERED_NODES] for any live node and use its parent
        if (!parent) {
          const renderedKey = RENDERED_NODES_PROPERTY;
          const rendered = renderedKey ? (ifCondition as any)[renderedKey] : null;
          if (rendered && Array.isArray(rendered)) {
            for (const node of rendered) {
              if (
                node &&
                (node as any).nodeType &&
                (node as any).parentNode &&
                (node as any).parentNode.isConnected
              ) {
                parent = (node as any).parentNode;
                break;
              }
            }
          }
        }
        // Strategy 5: walk up from ctx (the component instance) to find its element
        if (!parent && ctx) {
          try {
            const ctxAny: any = ctx;
            const ctxElem: any = ctxAny.element || ctxAny.__gxtRawTarget?.element;
            if (ctxElem && ctxElem.isConnected) {
              parent = ctxElem;
            }
          } catch {
            /* ignore */
          }
        }
        if (parent) {
          try {
            parent.appendChild(ph);
            lastKnownParent = parent;
          } catch {
            /* ignore */
          }
        }
      };

      // Capture initial parent post-mount via microtask
      queueMicrotask(repairPlaceholder);

      // Resolve the component instance owning this {{#if}} so that any
      // components created by syncState (e.g., {{yield}} block content
      // re-rendered after isExpanded toggles) are registered as children
      // of the correct view via the parentView stack. Without this, the
      // slot fn's captured parentView is the OUTER scope (e.g., the route
      // controller), and re-rendered yield content is added as a child
      // of the controller instead of the component invoking yield.
      const ifOwnerView = (() => {
        try {
          const ctxAny: any = ctx;
          const raw = ctxAny?.__gxtRawTarget || ctxAny;
          // Only treat real Component-like instances as parents (have elementId
          // or are Ember view instances).
          if (raw && (raw.isView || raw.elementId || raw.id)) {
            return raw;
          }
        } catch {
          /* ignore */
        }
        return null;
      })();

      // Register manual watcher for property change notification
      if (typeof ifCondition.syncState === 'function') {
        const emberToBool = _emberToBoolRef || Boolean;
        const origSyncState = ifCondition.syncState.bind(ifCondition);
        ifCondition.syncState = function (v: any) {
          // Suppress mid-sync TRUE renders for an IfCondition whose parent
          // {{#if}} collapsed earlier in the same sync cycle. Without this,
          // GXT's native `dt(condition, syncState)` listener would fire from
          // `gxtSyncDom` and execute the trueBranch — creating transient
          // components that the parent already collapsed (regression: "child
          // conditional should not render children if parent conditional
          // becomes false").
          try {
            const cycleId = _gxtGetSyncCycleId();
            const nextBoolEarly = emberToBool(v);
            const myDeadCycle = (ifCondition as any).__gxtParentDeadCycle;
            // Hard suppression: parent {{#if}} already collapsed this branch
            // earlier in the same sync cycle (set in the parent's syncState
            // wrapper when it received `false`).
            if (nextBoolEarly === true && myDeadCycle === cycleId) {
              return undefined;
            }
            // If we're transitioning to FALSE, mark every recorded child
            // IfCondition as dead-this-cycle so a downstream gxtSyncDom pass
            // (which fires GXT's native syncState listeners on each dirty
            // condition cell, INCLUDING our children) becomes a no-op for them.
            if (nextBoolEarly === false) {
              const children = (ifCondition as any).__gxtChildIfConditions;
              if (children && typeof children.forEach === 'function') {
                children.forEach((child: any) => {
                  try {
                    child.__gxtParentDeadCycle = cycleId;
                  } catch {
                    /* ignore */
                  }
                  // Recurse: a grandchild's parent is this child, but if this
                  // child were already collapsed, GXT may still hold its
                  // syncState listener on a dirty cond cell. Mark grandchildren
                  // too so their TRUE renders are suppressed.
                  const grand = child && child.__gxtChildIfConditions;
                  if (grand && typeof grand.forEach === 'function') {
                    grand.forEach((g2: any) => {
                      try {
                        g2.__gxtParentDeadCycle = cycleId;
                      } catch {
                        /* ignore */
                      }
                    });
                  }
                });
              }
            }
          } catch {
            /* ignore — fall through to legacy path */
          }
          repairPlaceholder();
          // Push the owner view so any components created by syncState's
          // re-render of the trueBranch (typically {{yield}} block content)
          // are registered as children of the correct view via the parentView
          // stack. Without this, slot fns capture parentView from the OUTER
          // scope (e.g., the route controller), and re-rendered yield content
          // is added as a child of the controller instead of the component
          // invoking yield.
          const viewUtils = getGxtRenderer()?.viewUtils;
          let pushed = false;
          if (ifOwnerView && viewUtils) {
            try {
              viewUtils.pushParentView(ifOwnerView);
              pushed = true;
            } catch {
              /* ignore */
            }
          }
          try {
            return origSyncState(v);
          } finally {
            if (pushed && viewUtils) {
              try {
                viewUtils.popParentView();
              } catch {
                /* ignore */
              }
            }
          }
        };
        // (Whole-`{{#if}}`-destroy branch-helper teardown is registered once in
        // `patchGlobalIf`'s scope-stash block above — this KVO-watch path shares
        // the same IfCondition, so a second registration here would be redundant.)
        const _ifWatchCb: IfWatcherCb = (notifiedTarget: object) => {
          try {
            const currentValue = conditionOrCell();
            const boolVal = emberToBool(currentValue);
            // Track the user's toggle-off intent for classic-component
            // wrappers with a yield-only `{{#if}}`. GXT's pooling and
            // force-rerender can cause click-toggle-on events to route
            // through different watcher instances than click-toggle-off,
            // so we widen the "set on false" to direct hits only (to avoid
            // prototype-broadcast false positives) but allow "clear on
            // true" from any hit (so a genuine toggle-on eventually lands).
            //
            // CRITICAL: read the "fresh" branch value from the notifiedTarget
            // (the real live object whose property just changed) rather than
            // exclusively from our captured conditionOrCell closure. Stale
            // IfCondition instances from pool reuse carry closures that point
            // at discarded controllers, so they always report their stale
            // value and never propagate a later true-flip. The notifiedTarget
            // is the live controller that the click-handler's set() hit, so
            // reading watchKey on it gives the real current value.
            let freshBoolVal = boolVal;
            try {
              if (notifiedTarget && watchKey && notifiedTarget !== watchTarget) {
                const v2 = (notifiedTarget as any)[watchKey];
                freshBoolVal = emberToBool(v2);
              }
            } catch {
              /* ignore */
            }
            const ph = ifCondition.placeholder;
            const par: any = ph && (ph as any).parentNode;
            if (par && _isEmberViewWrapper(par) && par.id) {
              if (notifiedTarget === watchTarget && boolVal === false) {
                _wrapperIfUserFalse.add(par.id);
                let s = _wrapperIfCondLookup.get(par.id);
                if (!s) {
                  s = new Set();
                  _wrapperIfCondLookup.set(par.id, s);
                }
                s.add({ condFn: conditionOrCell, placeholder: ph, ifCondition });
              } else if (boolVal === true || freshBoolVal === true) {
                _wrapperIfUserFalse.delete(par.id);
                _wrapperIfCondLookup.delete(par.id);
              }
            }

            ifCondition.syncState(boolVal);
          } catch (e) {
            console.warn('[GXT] syncState error:', e);
          }
        };
        // Provide the flush phase with metadata so it can sort: parent
        // {{#if}} flips going FALSE fire before child {{#if}} flips going
        // TRUE. Reading the next bool prefers the notifiedTarget's own value
        // (live source of truth) and falls back to the captured condition.
        _ifWatchCb.__ifCondition = ifCondition;
        _ifWatchCb.__getNextBool = (notifiedTarget: object) => {
          try {
            if (notifiedTarget && watchKey && notifiedTarget !== watchTarget) {
              const v2 = (notifiedTarget as any)[watchKey];
              return !!emberToBool(v2);
            }
          } catch {
            /* ignore */
          }
          try {
            return !!emberToBool(conditionOrCell());
          } catch {
            return false;
          }
        };
        registerIfWatcher(watchTarget, watchKey, _ifWatchCb);
      }
    }

    return ifCondition;
  };
  g.$_if.__emberPatched = true;

  // Protect $_if from being overwritten by setupGlobalScope()
  protectGlobal('$_if', g.$_if);

  return true;
}
patchGlobalIf();

// Host hook contributed via `installViewUtilsPart` (see module bottom). Runs
// AFTER manager.ts's `_gxtRebuildViewTreeFromDom` body completes, dispatched by
// the `_gxtBridgeRebuildViewTreeFromDom` adapter in manager.ts.
//
// Behavior: after the rebuild repopulates CHILD_VIEW_IDS from live DOM
// ancestry, any wrapper the user has toggled false (via direct click →
// toggleProperty('isExpanded')) has its view-registry children reset. This
// ensures getChildViews(rootWrapper) returns [] even though GXT's
// destroyBranchSync is a no-op for yield-only true branches (the inner DOM
// still contains the yielded nodes because prevComponent was empty).
// View-registry-only cleanup — no DOM mutation, so a subsequent toggle-back-
// to-true still surfaces the same DOM content. Also drains the in-element
// deferred-render queue (see `_drainInElementDeferQueue` block above) since
// this is the earliest synchronous point where the parent fragment is
// committed to the live document.
function _afterRebuildViewTreeFromDom(explicitRegistry?: unknown): void {
  try {
    if (_wrapperIfUserFalse.size > 0) {
      // Collect registries to search: the explicit arg (if any) and the
      // current global owner's view registry.
      const registries: any[] = [];
      if (explicitRegistry) registries.push(explicitRegistry);
      try {
        const go: any = getAmbientOwner();
        const reg2 = go && go.lookup && go.lookup('-view-registry:main');
        if (reg2 && !registries.includes(reg2)) registries.push(reg2);
      } catch {
        /* ignore */
      }
      const staleIds: string[] = [];
      for (const wrapperId of _wrapperIfUserFalse) {
        // Re-check the condition at read time. The ifWatcher may have
        // observed a stale click-false on a pool-reused IfCondition whose
        // closure points at a discarded controller, while the live condition
        // for this wrapper is now true (e.g., after visit('/') recreates the
        // route controller and a subsequent click toggles isExpanded true
        // via a different watcher path). Trust the live condition evaluator.
        // Check whether the branch is ACTUALLY in its "false" state right
        // now. We recorded IfCondition instances when the user toggled
        // false. Pool reuse can leave stale entries whose condFn closures
        // read old controller state. The most reliable signal of the real
        // current state is whether the live DOM between the if-placeholder
        // and the next view element contains any rendered content. Use
        // IfCondition.isTrue/prevComponent if present, else fall back to
        // scanning siblings of the placeholder for non-ancestor view
        // descendants.
        const entries = _wrapperIfCondLookup.get(wrapperId);
        if (entries && entries.size > 0) {
          const liveEl: any = typeof document !== 'undefined' && document.getElementById(wrapperId);
          let anyExpanded = false;
          for (const e of entries) {
            const ph = e.placeholder;
            if (!ph || !ph.parentNode) continue;
            if (!liveEl || !liveEl.contains(ph)) continue;
            const ic = e.ifCondition;
            // IfCondition tracks its currently rendered branch via prevComponent.
            // Non-empty prevComponent => branch currently rendered (true state).
            const pc = ic && (ic.prevComponent ?? ic._prevComponent);
            const pcHasContent = Array.isArray(pc) ? pc.length > 0 : !!pc;
            if (pcHasContent) {
              anyExpanded = true;
              break;
            }
          }
          if (anyExpanded) {
            staleIds.push(wrapperId);
            continue;
          }
        }
        // Candidate views to reset: registry entries + whatever view is
        // currently associated with the live DOM element for this id.
        const views = new Set<any>();
        for (const reg of registries) {
          const v = reg && reg[wrapperId];
          if (v && !v.isDestroyed && !v.isDestroying) views.add(v);
        }
        try {
          const el = typeof document !== 'undefined' && document.getElementById(wrapperId);
          if (el) {
            const v2 = _emberGetElementView(el);
            if (v2 && !v2.isDestroyed && !v2.isDestroying) views.add(v2);
          }
        } catch {
          /* ignore */
        }
        for (const v of views) {
          try {
            _emberInitChildViews(v);
          } catch {
            /* ignore */
          }
        }
      }
      for (const id of staleIds) _wrapperIfUserFalse.delete(id);
    }
  } catch {
    /* ignore */
  }
  // Drain the in-element deferred-render queue now. By the time the
  // manager's flushAfterInsertQueue has processed all didInsertElement
  // hooks and called rebuildViewTreeFromDom, the parent fragment
  // for the outermost render pass has been committed to the live
  // document — so document.getElementById() can finally resolve any
  // in-element targets whose host div was rendered in the same pass.
  //
  // The `_drainInElementDeferQueue` pointer is undefined until the setup block
  // runs at module-load, so the guard is preserved for ordering safety.
  try {
    const drain = _drainInElementDeferQueue;
    if (typeof drain === 'function') drain();
  } catch {
    /* ignore */
  }
}

// ---- $_eachSync: normalize Ember collections for GXT ----
// Converts null/undefined/false/ArrayProxy/Set/ForEachable to native arrays.
// GXT's SyncListComponent already handles empty arrays + inverseFn correctly
// (after the GXT fix for first-render inverse). We just need to ensure
// the value reaching GXT is always a proper array.
// Subscribe the active each-source formula to a collection's backing array `[]`
// cell so in-place mutations re-fire the list opcode — covering block-param
// sources (the inner each in `{{#each foo}}`) that have no parseable owner cell.
// Reads `cellFor(array,'[]').value` to register with GXT's active tracker;
// `notifyPropertyChange(array,'[]')` dirties the same cell. Walks a couple of
// common backing-array fields for non-array wrappers (ArrayProxy.content,
// ArrayDelegate._array).
// Registered Symbol matching validator.ts `GXT_COLLECTION_TAG`. A reactive-
// collection proxy (trackedArray / trackedSet) returns its internal GXT-cell-
// backed `collection` tag when read with this key. `Symbol.for` guarantees the
// SAME symbol identity across modules without importing validator.ts here.
const _GXT_COLLECTION_TAG: unique symbol = Symbol.for('@ember/reactive:gxt-collection-tag');

function _gxtSubscribeBackingArray(raw: any): void {
  if (!raw || typeof raw !== 'object') return;
  const _read = (arr: any) => {
    try {
      const c = cellFor(arr, '[]', /* skipDefine */ true);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      if (c) (c as any).value;
    } catch {
      /* ignore */
    }
  };
  if (Array.isArray(raw)) {
    _read(raw);
    // `@ember/reactive/collections` `trackedArray` is `new Proxy(arr, ...)` so
    // `Array.isArray(proxy) === true` and it lands here. Its reactivity is NOT
    // the SyncCore `cellFor(arr,'[]')` cell `_read` subscribes to — it has its
    // OWN internal `collection` tag (native-GXT-cell-backed,
    // `createUpdatableTagNative`, validator.ts trackedArray), exposed via the
    // `GXT_COLLECTION_TAG` accessor. Reading the inner native cell's `.value`
    // HERE — inside the gxtFormula tracker frame — entangles the each-SOURCE
    // formula (this `$_eachSync` wrappedCell) with the collection. The
    // collection dirties on push/splice/swap (index set) / `length = 0`
    // (validator.ts `dirtyCollection`, fired from the set trap for index AND
    // length writes); that invalidates this formula → the list opcode
    // (glimmer-next list.ts `opcodeFor(tag, syncList)`) re-runs `syncList` →
    // KEYED LIS diff (move/insert/remove by key, reusing row instances) —
    // fine-grained, NOT a full rebuild. The flush is COALESCED by validator.ts
    // `dirtyCollection` (one `flushCellOpcodes()` microtask per mutation burst,
    // so a `push(...1000)` re-renders once). Reading the inner cell directly —
    // not `consumeTag(tag.value)` — is what registers `qt.add(cell)`; the tag's
    // storage-compat wrapper getter does not propagate entanglement. For a
    // PLAIN (non-proxy) array there is no `GXT_COLLECTION_TAG` → no-op →
    // plain-array / ArrayProxy sources unaffected.
    try {
      const _tag = (raw as any)[_GXT_COLLECTION_TAG];
      if (_tag && _tag._innerCell) {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        _tag._innerCell.value;
      }
    } catch {
      /* ignore */
    }
    return;
  }
  // Non-array iterable wrappers: subscribe to the wrapper's own `[]`
  // (ArrayProxy/ArrayDelegate notify on themselves or `_target`) and a couple
  // of well-known backing-array fields. `wrappedItems` is the backing array of
  // the `arrangedContent depends on external content` custom proxy
  // (`arrangedContent` = `this.wrappedItems.slice()`): the in-place mutation
  // (`inner.delegate.replace(...)`, nested-each-over-array-proxy test) fires
  // `arrayContentDidChange(wrappedItems,'[]')` on the BACKING array, not the
  // proxy. A block-param each-source (the inner `{{#each foo as |bar|}}`) has
  // no parseable owner cell, so the `_registerIterableUnderlyingArray`
  // array-owner fan-out can't reach it — reading the backing array's `[]` cell
  // HERE is the only path that subscribes the source formula to that mutation.
  // (`arrangedContent` itself returns a fresh throwaway slice each read, so
  // subscribing to ITS `[]` cell is useless — must reach `wrappedItems`.)
  _read(raw);
  for (const propName of ['content', '_array', 'wrappedItems', '_content', 'arrangedContent']) {
    let val: any;
    try {
      val = raw[propName];
    } catch {
      continue;
    }
    if (Array.isArray(val)) _read(val);
  }
}

// `normalizeEachCollection` materializes a non-Array iterable into a real
// Array. gxt's `$_eachSync` normalizes every iterable shape for ITERATION
// (plain arrays, Symbol.iterator iterables, ArrayProxy via `.content`,
// forEach-delegates, strings-as-falsy), but its `as |item index|` index path
// calls `.indexOf(item)` on the raw value, which is missing or wrong for a Set,
// a Symbol.iterator object or a forEach array-like. So the wrappers below
// materialize an Array only on the `hasIndex` path (real Arrays short-circuit,
// so the no-index and Array cases cost nothing). The KVO subscriptions
// (`_registerIterableUnderlyingArray` / `_gxtSubscribeBackingArray`) and the
// watch-target/id copies are the rest of the bridge.
function normalizeEachCollection(raw: any): any[] {
  if (raw == null || raw === false || raw === '' || raw === 0) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if (typeof raw.toArray === 'function') return raw.toArray();
    if (typeof raw[Symbol.iterator] === 'function') return Array.from(raw);
    if (typeof raw.forEach === 'function' && typeof raw.length === 'number') {
      const arr: any[] = [];
      raw.forEach((item: any) => arr.push(item));
      return arr;
    }
  }
  return [];
}

// Each-body item tracking.
//
// PROBLEM: the each-body `{{item.text}}` binding compiles (in GXT) to
// `formula(() => deepFnValue(() => item.text))`. GXT only treats a formula as
// reactive when its body READS a Cell/MergedCell. When `item` is a plain
// `{ text: 'hello' }` object, `item.text` is a bare property read — it taps no
// cell, so the formula reports `isConst` and is torn down, freezing the row text
// (`set(item,'text','Hello')` leaves the DOM as `hello`).
//
// FIX: wrap each item in a Proxy whose `get` trap reads `cellFor(rawItem, prop)`
// so the body's `item.<prop>` reads register the cell with GXT's tracker, making
// the formula reactive. `set(rawItem, prop, v)` dirties the SAME cell (SyncCore
// `cellFor(obj,key).update`), so the formula re-runs and the text updates.
//
// Identity/keying are unaffected: syncList keys/index work on the RAW items it
// receives from the source array (the wrap happens only at the body callsite, in
// `wrappedEachFn`, AFTER syncList has assigned the row). The proxy is memoized
// per raw object so repeated body reads of the same item return one proxy.
const _eachItemProxies = new WeakMap<object, any>();
const _eachItemProxyToRaw = new WeakMap<object, any>();
// Body-proxy → its mutable holder ({ raw }). The holder lets syncList REBIND a
// reused row's block-param to a NEW source object WITHOUT recreating the row
// (keyed-reuse stale block-param). The proxy reads `holder.raw` (so a
// rebind swaps the underlying object) and subscribes to a per-holder revision
// cell (so a rebind re-fires the body). It ALSO subscribes to
// `cellFor(holder.raw, prop)` so an in-place `set(item, prop)` still re-fires.
//
// Resolve a body proxy's mutable holder from its proxy TARGET (the original raw
// item, which is the first arg the traps receive). This lets the proxy handler
// be a SINGLE module-level object shared by every row instead of a fresh handler
// literal (6 trap closures) per row. The target is stable across rebinds (the
// proxy is created over the ORIGINAL item; rebinds only swap holder.raw), so
// keying by target is sound. There is intentionally no separate proxy→holder
// map: every reader already has the raw item in hand, so the holder is fetched
// via `_eachItemHolderByTarget.get(rawItem)`.
const _eachItemHolderByTarget = new WeakMap<object, _EachItemHolder>();

// Per-row mutable holder. `raw` is the CURRENT source object bound to the row.
// `rebindPossible` records whether the OWNING list can ever stale a key and
// re-bind this row to a DIFFERENT object ref by the same key. It is
// TRUE only for explicit property `key=` lists (where in-place mutation of the
// keyed property can re-bind a stale key to a new object); it is FALSE for
// `@identity`-keyed lists (no `key=` / `key="@identity"` / `key="@index"`),
// where the key IS the object identity (WeakMap) so a given key can NEVER bind
// to a different ref → the `rebindEachItem` host hook never fires for that row.
// When FALSE, the per-row `__gxtRev` revision cell is dead weight (created +
// read + subscribed by every body formula but never bumped), so the proxy
// get-trap SKIPS it entirely.
interface _EachItemHolder {
  raw: any;
  rebindPossible: boolean;
}

// Shared trap skip-list (framework/internal props bypass cell tracking).
function _eachProxySkipProp(prop: string): boolean {
  return (
    prop.charCodeAt(0) === 95 /* _ */ ||
    prop.charCodeAt(0) === 36 /* $ */ ||
    prop === 'constructor' ||
    prop === 'isDestroyed' ||
    prop === 'isDestroying' ||
    prop === 'toString' ||
    prop === 'toJSON' ||
    prop === 'valueOf' ||
    prop === 'then' ||
    prop === 'init' ||
    prop === 'destroy'
  );
}

// Single shared handler for the body proxy. Resolves `holder` from the proxy
// target via `_eachItemHolderByTarget`. Every read goes through holder.raw, the
// per-holder revision cell, and the per-prop cell.
// Cycle-breaking state for the each-item body proxy (see the `get`/`defineProperty`
// traps below). gxt's reactive-property machinery can install an accessor
// (`Object.defineProperty(raw, prop, { get: () => cell.value })`) on the raw item
// whose backing formula reads `proxy[prop]` — i.e. back THROUGH this proxy. The
// first resolution of that cell then recurses without bound:
//   raw[prop] accessor → cell.value → proxy[prop] → raw[prop] accessor → …
// (observed for `{{#link-to … model=person}}` inside `{{#each}}`, where the same
// `person.id` binding is both read via `id={{person.id}}` and serialized by
// link-to, so cellFor reuses the body-reading formula AS the property accessor).
//
// `_eachItemShadowedValue` snapshots the original DATA value at the moment the
// accessor shadows it (captured in the `defineProperty` trap), and
// `_eachItemReadInflight` detects the re-entrant read of the same (raw, prop) so
// the `get` trap can return that snapshot instead of recursing.
const _eachItemShadowedValue = new WeakMap<object, Map<string, any>>();
const _eachItemReadInflight = new WeakMap<object, Set<string>>();
// Shared body of the each-item `get` trap: read `raw[prop]`, entangle the
// per-prop (and, for rebind-capable rows, the per-holder revision) cell, and
// wrap nested objects for sub-path tracking. The `get` trap calls it from both
// the fast path and the re-entrancy-guarded path.
function _eachItemReadProp(raw: any, prop: string, holder: _EachItemHolder | undefined): any {
  const value = Reflect.get(raw, prop, raw);
  if (typeof value === 'function') return value;
  try {
    // Subscribe to the per-holder revision cell so a REBIND (holder.raw swap)
    // re-fires this read even though the new object has different per-prop cells.
    // Only ENTANGLE it when the owning list can ever rebind this row (explicit
    // `key=`); for `@identity`-keyed lists the rev cell is never bumped, so it
    // would be pure dead weight.
    if (holder && holder.rebindPossible) {
      const revCell = cellFor(holder, '__gxtRev', /* skipDefine */ true);
      if (revCell) (revCell as any).value;
    }
    const cell = cellFor(raw, prop, /* skipDefine */ true);
    if (cell) {
      if ((cell as any)._value !== value) {
        (cell as any)._value = value;
      }
      (cell as any).value;
    }
  } catch {
    /* ignore */
  }
  return _wrapNestedEachValue(value);
}
const _eachItemProxyHandler: ProxyHandler<any> = {
  get(target, prop, _receiver) {
    const holder = _eachItemHolderByTarget.get(target);
    const raw = holder ? holder.raw : target;
    if (typeof prop !== 'string') return Reflect.get(raw, prop, raw);
    if (_eachProxySkipProp(prop)) return Reflect.get(raw, prop, raw);
    // Cycle break: only props that gxt has shadowed with a reactive accessor
    // (recorded in `_eachItemShadowedValue` by the `defineProperty` trap) can
    // recurse back through this proxy. For those, guard against a re-entrant read
    // of the same (raw, prop): on re-entry the backing formula is mid-resolution
    // and `raw[prop]` would loop forever, so return the value captured when the
    // accessor shadowed the original data property. Plain (un-shadowed) reads take
    // the untouched fast path below.
    const shadow = _eachItemShadowedValue.get(raw);
    if (shadow !== undefined && shadow.has(prop)) {
      let inflight = _eachItemReadInflight.get(raw);
      if (inflight !== undefined && inflight.has(prop)) {
        return shadow.get(prop);
      }
      if (inflight === undefined) {
        inflight = new Set();
        _eachItemReadInflight.set(raw, inflight);
      }
      inflight.add(prop);
      try {
        return _eachItemReadProp(raw, prop, holder);
      } finally {
        inflight.delete(prop);
      }
    }
    return _eachItemReadProp(raw, prop, holder);
  },
  set(target, prop, value) {
    const holder = _eachItemHolderByTarget.get(target);
    const raw = holder ? holder.raw : target;
    return Reflect.set(raw, prop, value, raw);
  },
  defineProperty(target, prop, descriptor) {
    const holder = _eachItemHolderByTarget.get(target);
    const raw = holder ? holder.raw : target;
    // gxt installs reactive accessors (`{ get: () => cell.value }`) on the raw
    // item via this proxy. When such an accessor REPLACES an existing own data
    // property, snapshot the data value first: the cell it wraps can read back
    // through this proxy, so the `get` trap needs the pre-shadow value to break
    // the resulting read cycle (see `_eachItemShadowedValue`).
    if (typeof prop === 'string' && descriptor && (descriptor.get || descriptor.set)) {
      const existing = Object.getOwnPropertyDescriptor(raw, prop);
      if (existing && 'value' in existing) {
        let shadow = _eachItemShadowedValue.get(raw);
        if (shadow === undefined) {
          shadow = new Map();
          _eachItemShadowedValue.set(raw, shadow);
        }
        shadow.set(prop, existing.value);
      }
    }
    return Reflect.defineProperty(raw, prop, descriptor);
  },
  has(target, prop) {
    const holder = _eachItemHolderByTarget.get(target);
    return Reflect.has(holder ? holder.raw : target, prop);
  },
  getOwnPropertyDescriptor(target, prop) {
    const holder = _eachItemHolderByTarget.get(target);
    return Reflect.getOwnPropertyDescriptor(holder ? holder.raw : target, prop);
  },
  ownKeys(target) {
    const holder = _eachItemHolderByTarget.get(target);
    return Reflect.ownKeys(holder ? holder.raw : target);
  },
  getPrototypeOf(target) {
    const holder = _eachItemHolderByTarget.get(target);
    return Reflect.getPrototypeOf(holder ? holder.raw : target);
  },
};
function wrapEachItemForTracking(item: any, rebindPossible: boolean = false): any {
  if (item === null || typeof item !== 'object') return item;
  // Never wrap arrays/DOM/dates/etc — sub-iteration & node identity must be raw.
  if (
    Array.isArray(item) ||
    item instanceof Node ||
    item instanceof Date ||
    item instanceof RegExp ||
    item instanceof Promise ||
    // Native collections: wrapping in the body-proxy makes internal-slot
    // methods (Set.prototype.values / Map.prototype.entries) throw
    // "called on incompatible receiver" when normalizeEachCollection does
    // Array.from(...), killing a nested {{#each}} over a Set/Map source.
    item instanceof Set ||
    item instanceof Map ||
    item instanceof WeakSet ||
    item instanceof WeakMap
  ) {
    return item;
  }
  // Already a body-proxy we created — return as-is.
  if (_eachItemProxyToRaw.has(item)) return item;
  const existing = _eachItemProxies.get(item);
  if (existing) {
    // Memoized per raw object. If the SAME raw object is also wrapped by an
    // explicit-`key=` list (rebind possible) after first being wrapped by an
    // `@identity` list, upgrade the holder so the rev cell is honored — never
    // downgrade (a row that can rebind must keep the rev-cell subscription).
    if (rebindPossible) {
      // The holder is keyed by raw item (= proxy target); `item` here IS that
      // raw item.
      const h = _eachItemHolderByTarget.get(item);
      if (h) h.rebindPossible = true;
    }
    return existing;
  }
  // Mutable holder — `raw` is the CURRENT source object for this row. On a
  // keyed reuse where the row's source object changed by ref, the
  // `rebindEachItem` host hook swaps `holder.raw` + bumps the revision cell so
  // the body re-reads the new one.
  const holder: _EachItemHolder = { raw: item, rebindPossible };
  // The single shared handler (`_eachItemProxyHandler`) resolves the holder from
  // the proxy target (`item`) via `_eachItemHolderByTarget` — no per-row handler
  // literal / trap-closure allocation.
  _eachItemHolderByTarget.set(item, holder);
  const proxy = new Proxy(item, _eachItemProxyHandler);
  _eachItemProxies.set(item, proxy);
  _eachItemProxyToRaw.set(proxy, item);
  return proxy;
}

// Nested-object tracking for each-body sub-paths.
// `wrapEachItemForTracking` subscribes the immediate `item.<prop>` read; this
// recursively wraps the RETURNED value so a deeper read (`item.v.reports.x`)
// also taps `cellFor(nested, x)`. A `set(nested, x, v)` dirties that same cell
// (SyncCore), so the body re-runs and the sub-path text updates. Memoized per
// raw object (single proxy identity → keying/`===` checks elsewhere stay
// stable). Skips arrays/Node/Date/etc and already-wrapped item proxies.
const _eachNestedProxies = new WeakMap<object, any>();
const _eachNestedProxyToRaw = new WeakMap<object, any>();
// Per-constructor decision cache for the "self-reactive wrapper instance"
// classification (see `_isSelfReactiveWrapper`), keyed by the prototype object
// (one entry per class), not per instance.
const _r6SelfReactiveProtos = new WeakSet<object>();
const _r6PlainProtos = new WeakSet<object>();
// Per-instance positive-decision cache. Without it, `_instanceHasNoOwnDataProps`
// (an `Object.getOwnPropertyNames` array allocation + per-name
// `getOwnPropertyDescriptor`) re-runs on EVERY nested read, even for an instance
// already proven self-reactive. Once an instance is confirmed to expose state
// ONLY through prototype accessors (no own data props), that shape is stable for
// its class, so the positive result is memoized here and subsequent reads skip
// the own-prop scan. Only the POSITIVE (self-reactive) result is cached — an
// instance WITH own data props falls through to the normal nested wrap.
const _r6SelfReactiveInstances = new WeakSet<object>();
// A nested value is a "self-reactive wrapper" when it is a CLASS INSTANCE
// (prototype is not Object.prototype / null) that exposes its state ONLY through
// prototype ACCESSORS (getters) and carries NO own enumerable data properties.
// The reactive `Cell` primitive (`get current()` → native gxt cell `.value`,
// zero own keys) is the canonical case: reading `.current` entangles the Cell's
// OWN native gxt cell, so the nested-proxy's `cellFor(cell,'current')` is pure
// dead weight (created + entangled, NEVER dirtied — `Cell.set()` mutates the
// native cell directly, bypassing `set(cell,'current')`). Generic POJOs (own
// data properties + Object.prototype) and instances WITH own data fields still
// wrap — their `set(nested,prop)` reactivity genuinely needs the per-prop cell
// entanglement.
function _isSelfReactiveWrapper(value: object): boolean {
  // Fast path — instance already proven self-reactive (no own data props).
  // Repeated nested reads of the SAME wrapper skip the per-read
  // `getOwnPropertyNames` scan entirely.
  if (_r6SelfReactiveInstances.has(value)) return true;
  const proto = Object.getPrototypeOf(value);
  // POJO / null-proto: needs normal nested tracking.
  if (proto === null || proto === Object.prototype) return false;
  if (_r6SelfReactiveProtos.has(proto)) {
    // Cached self-reactive class — but an instance may still carry own data
    // properties (state), in which case it must wrap. Check per instance
    // (memoizing the positive result so later reads take the fast path above).
    if (_instanceHasNoOwnDataProps(value)) {
      _r6SelfReactiveInstances.add(value);
      return true;
    }
    return false;
  }
  if (_r6PlainProtos.has(proto)) return false;
  // Classify the prototype once: it is self-reactive iff it declares at least
  // one ACCESSOR (getter) and NO own data methods that would be tracked. We
  // accept any class instance with prototype getters as a candidate; the
  // per-instance own-data-property check below decides the final answer.
  let hasAccessor = false;
  const descs = Object.getOwnPropertyDescriptors(proto);
  for (const k in descs) {
    if (k === 'constructor') continue;
    if (descs[k] && typeof descs[k].get === 'function') {
      hasAccessor = true;
      break;
    }
  }
  if (hasAccessor) {
    _r6SelfReactiveProtos.add(proto);
    if (_instanceHasNoOwnDataProps(value)) {
      _r6SelfReactiveInstances.add(value);
      return true;
    }
    return false;
  }
  _r6PlainProtos.add(proto);
  return false;
}
// True when the instance has no own enumerable string-keyed DATA properties
// (only accessors / private fields). Such an instance exposes all observable
// state through prototype getters that self-entangle, so the nested per-prop
// cell wrap would track nothing that is ever dirtied.
function _instanceHasNoOwnDataProps(value: object): boolean {
  const own = Object.getOwnPropertyNames(value);
  for (let i = 0; i < own.length; i++) {
    const d = Object.getOwnPropertyDescriptor(value, own[i]);
    // An own ACCESSOR is fine (still self-reactive); an own DATA property means
    // mutable instance state that needs the per-prop cell → must wrap.
    if (d && 'value' in d) return false;
  }
  return true;
}
function _wrapNestedEachValue(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (
    Array.isArray(value) ||
    value instanceof Node ||
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof Promise
  ) {
    return value;
  }
  // Skip wrapping self-reactive wrapper instances (e.g. reactive Cell
  // primitives) whose reads entangle their own native reactivity — the nested
  // per-prop cell would never be the dirtied source.
  if ((globalThis as any).__gxtR6SkipSelfReactive === true && _isSelfReactiveWrapper(value)) {
    return value;
  }
  // Don't double-wrap our own proxies (item-body or nested).
  if (_eachItemProxyToRaw.has(value) || _eachNestedProxyToRaw.has(value)) {
    return value;
  }
  const existing = _eachNestedProxies.get(value);
  if (existing) return existing;
  const raw = value;
  // Single shared handler (`_eachNestedProxyHandler`): the nested traps operate
  // on the trap-supplied `target` arg (no closed-over state), so one
  // module-level handler avoids allocating 6 trap closures + a handler object
  // per wrapped nested value.
  const proxy = new Proxy(raw, _eachNestedProxyHandler);
  _eachNestedProxies.set(raw, proxy);
  _eachNestedProxyToRaw.set(proxy, raw);
  return proxy;
}
// Shared nested-proxy handler (closure-free; operates on trap `target`).
const _eachNestedProxyHandler: ProxyHandler<any> = {
  get(target, prop, _receiver) {
    if (typeof prop !== 'string') return Reflect.get(target, prop, target);
    if (_eachProxySkipProp(prop)) return Reflect.get(target, prop, target);
    const v = Reflect.get(target, prop, target);
    if (typeof v === 'function') return v;
    try {
      const cell = cellFor(target, prop, /* skipDefine */ true);
      if (cell) {
        if ((cell as any)._value !== v) (cell as any)._value = v;
        (cell as any).value;
      }
    } catch {
      /* ignore */
    }
    return _wrapNestedEachValue(v);
  },
  set(target, prop, v) {
    return Reflect.set(target, prop, v, target);
  },
  has(target, prop) {
    return Reflect.has(target, prop);
  },
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target);
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target);
  },
};

// Holders whose revision cell must be bumped on the next sync pass (keyed-reuse
// rebind). syncList calls the `rebindEachItem` host hook from INSIDE the first
// `gxtSyncDom()` pass (the each-source opcode → syncList → reuse branch); a
// revision bump there lands in `tagsToRevalidate` but is wiped by that pass's
// terminal `tagsToRevalidate.clear()` before the second pass runs. So we swap
// the holder target immediately (reads are then correct) and DEFER the bump,
// draining it via `_gxtDrainPendingEachRebinds()` BETWEEN the two
// `_gxtSyncDomNow` passes — landing the dirty revision in the second pass's
// revalidation set, which re-executes the row body formula in place.
const _pendingEachRebindHolders: Array<{ raw: any }> = [];
function _gxtDrainPendingEachRebinds(): void {
  if (_pendingEachRebindHolders.length === 0) return;
  const holders = _pendingEachRebindHolders.splice(0);
  for (const holder of holders) {
    try {
      const revCell = cellFor(holder as any, '__gxtRev', /* skipDefine */ true);
      if (revCell) {
        (revCell as any).update(((revCell as any)._value || 0) + 1);
      }
    } catch {
      /* ignore */
    }
  }
}

// Rebind hook invoked by glimmer-next syncList on a KEYED REUSE where the
// row's underlying source object changed by reference. `oldRawItem`
// is the source object syncList originally bound this key's row to; `newRawItem`
// is the new source object for the same key. We locate the body-proxy syncList
// handed the row (memoized by `oldRawItem` in `_eachItemProxies`), swap its
// holder target to `newRawItem` IMMEDIATELY, and QUEUE a revision-cell bump for
// the next pass so the body re-reads the new object's values IN PLACE —
// preserving DOM identity (no row recreate). No-op when no holder-backed proxy
// was created for `oldRawItem`.
const _gxtRebindEachItemHook = function gxtRebindEachItem(oldRawItem: any, newRawItem: any): void {
  if (oldRawItem === newRawItem || !oldRawItem || typeof oldRawItem !== 'object') {
    return;
  }
  // Fetch the holder directly by raw item. A holder exists iff a body-proxy was
  // created for this raw item, so the raw-keyed lookup is the same guard.
  const holder = _eachItemHolderByTarget.get(oldRawItem);
  if (!holder) return;
  if (holder.raw === newRawItem) return;
  holder.raw = newRawItem;
  _pendingEachRebindHolders.push(holder);
  // Ensure a second sync pass runs (the rebind originated inside the first).
  _gxtSetPendingSync(true);
  _gxtSetPendingSyncFromPropertyChange(true);
};
_gxtRegisterHostHooks({ rebindEachItem: _gxtRebindEachItemHook });

// Gated bridge: resolve an each-item body-PROXY back to its RAW source object.
// `wrapEachItemForTracking` (above) is module-local, so `_eachItemProxyToRaw`
// can't be read by manager.ts directly. manager.ts's `_gxtSyncAllWrappersBody`
// nested-arg-mutation check needs this to recognise that an #each-body
// component's `item` arg (a proxy) corresponds to a RAW object recorded in
// `_dirtiedNestedObjectsForHooks` on an in-place `set(item, …)` — so it can
// dispatch the component's `didUpdate`. Returns undefined for non-proxies.
const _gxtEachItemRawFor = function (maybeProxy: any): any {
  if (maybeProxy && typeof maybeProxy === 'object' && _eachItemProxyToRaw.has(maybeProxy)) {
    return _eachItemProxyToRaw.get(maybeProxy);
  }
  return undefined;
};

// ---- each-in key-SET reactivity ----
//
// `{{#each-in obj}}` compiles to `{{#each (gxtEntriesOf obj)}}`. The
// `gxtEntriesOf` source formula does `Object.keys(obj)`, which taps the
// per-VALUE cells (`cellFor(obj, key)`) but NOT the SET of keys, so a
// `set(obj, 'NewKey', v)` that adds a key would not re-iterate. gxt owns the
// key-set reactivity (`entangleObjectKeys` / `notifyObjectKeyAdded`); ember
// forwards the two signals: the keys the each-in source observed, and
// SyncCore's write of a key.

// Exposed so `gxtEntriesOfEmber` (ember-gxt-wrappers.ts) can subscribe the
// active each-in source formula to an intermediate property cell — e.g. an
// ObjectProxy's `content`. `{{#each-in proxy}}` reads `proxy.content` as a
// BARE access inside gxtEntriesOf, so a whole-content ref-swap
// (`set(proxy,'content',newObj)`) dirties `cellFor(proxy,'content')` but the
// source formula never subscribed to it → stale iteration. Reading the cell's
// `.value` here (inside the formula's tracker frame) registers the dep.
const _gxtSubscribeCellFn = function (obj: any, key: string): void {
  if (!obj || typeof obj !== 'object') return;
  try {
    const c = cellFor(obj, key, /* skipDefine */ true);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    if (c) (c as any).value;
  } catch {
    /* ignore */
  }
};
// Lifecycle teardown ORDERING.
//
// When an `{{#each}}` transitions non-empty → empty, the `{{else}}` (inverse)
// branch renders new content. Classic Ember fires the OLD rows' async teardown
// (didDestroyElement → willDestroy) AFTER the NEW content's didInsertElement /
// didRender. `wrappedInverseFn` already fires the old rows' synchronous
// willDestroyElement / willClearRender (re-attach + trigger) and renders the
// inverse content during gxtSyncDom (Phase 1). At that point the NEW content's
// didInsertElement callbacks are NOT yet flushed — Phase 3b
// (`flushAfterInsertQueue`) fires them. So we DEFER the old rows' async
// teardown into this module-level queue, drained by `_gxtSyncDomNow`
// immediately AFTER Phase 3b. The rows are pre-marked
// `__gxtDeferAsyncDestroyCycle` so the Phase 2c `destroyUnclaimedPoolEntries`
// sweep (which runs BEFORE Phase 3b) skips firing their async teardown.
//
// This satisfies BOTH the tagged variant (whose rows the Phase 2c sweep would
// otherwise tear down BEFORE the after-insert flush — inverting the order) and
// the tagless variant (whose DocumentFragment-wrapped rows the Phase 2c sweep /
// _gxtDestroyInstancesInNodes never match, so their teardown otherwise leaks to
// the test afterEach). `rows` is DFS-interleaved (an-item, nested-item, ...)
// matching classic render order, so the manager.ts finalizer reproduces the
// expected hook sequence. The actual teardown (element-clear + didDestroyElement
// + willDestroy) lives in manager.ts (`finalizeInverseOldRows` bridge) where
// `setViewElement` / the view-registry are in scope so `this.element` is null
// during didDestroyElement.
interface _PendingInverseFinalize {
  rows: any[];
  cycle: number;
}
const _pendingInverseOldRowFinalize: _PendingInverseFinalize[] = [];

// Drained by `_gxtSyncDomNow` right after Phase 3b (`flushAfterInsertQueue`).
function _gxtDrainPendingInverseOldRowFinalize(): void {
  if (_pendingInverseOldRowFinalize.length === 0) return;
  const pending = _pendingInverseOldRowFinalize.splice(0);
  for (const { rows, cycle } of pending) {
    try {
      getGxtRenderer()?.destruction.finalizeInverseOldRows?.(rows, cycle);
    } catch {
      /* best-effort */
    }
  }
}

// ─── each-row pre-destroy via gxt host hooks ──────────────────────────────────
// gxt fires `onRowContextCreated(rowCtx)` per `{{#each}}` row (rowCtx is a
// plain object) and per `{{#if}}`/`{{#unless}}` branch (an IfCondition class
// instance), and a `registerDestructor(rowCtx, fn)` runs PRE-DOM-REMOVAL on a
// still-connected element (list.ts `destroyItem` → `destroyRowCtx` precedes
// `destroyElementSync(row)`; the bulk `teardownAllRowCtxs` runs the rowCtx
// destructors before `clearChildren`). We use this to fire each-row
// `willDestroyElement` / `willClearRender` at the Ember-correct moment WITHOUT
// the reattach-to-fixture dance.
//
// `onRowContextCreated(rowCtx)` fires BEFORE the row body renders (no Ember
// instance exists yet). Ember's own each-body wrapper `wrappedEachFn(item,
// index, ctx0)` receives that SAME rowCtx as `ctx0` (gxt threads the row's
// `bodyCtx` through `buildRow`), and synchronously renders the row's entire
// subtree (direct + nested components) inside that call. So we bracket the
// body-fn invocation with `_gxtCurrentRowCtx = ctx0` (save/restore → nest-safe
// for `{{#each}}` inside `{{#each}}`) and associate each Ember instance created
// in that window (`_gxtCaptureRowInstance`, called from manager.ts's
// `renderComponent` right after `_allLiveInstances.add`) with its row.
//
// (The gxt render-scope hooks `onEnterRenderScope`/`onLeaveRenderScope` cannot
// be used for this: rowCtx is never pushed onto gxt's parentContext stack.)

// Ctxs flagged (in `onRowContextCreated`) as `{{#each}}` rows. IfCondition
// branch ctxs are deliberately NOT added. Used to validate `_gxtCurrentRowCtx`
// is a real each-row.
const _gxtEachRowCtxSet = new WeakSet<object>();
// rowCtx → the Ember component instances rendered under it (Set insertion order =
// creation order = parent-first). Read by `_gxtFireRowPreDestroy` at teardown.
const _gxtRowCtxInstances = new WeakMap<object, Set<any>>();
// The rowCtx whose body is currently rendering (set by `wrappedEachFn`). Null
// outside an each-row body render. Save/restore at each nesting level.
let _gxtCurrentRowCtx: object | null = null;

// Associate a freshly-created Ember instance with the `{{#each}}` row whose body
// is currently rendering. No-op when not inside an each-row body.
function _gxtCaptureRowInstance(instance: any): void {
  if (!instance) return;
  const ctx = _gxtCurrentRowCtx;
  if (ctx === null || !_gxtEachRowCtxSet.has(ctx)) return;
  let set = _gxtRowCtxInstances.get(ctx);
  if (set === undefined) {
    set = new Set();
    _gxtRowCtxInstances.set(ctx, set);
  }
  set.add(instance);
}

// Pre-DOM-removal destructor registered on each `{{#each}}` rowCtx. Fires the
// row's Ember instances' synchronous willDestroyElement / willClearRender while
// their elements are still connected.
function _gxtFireRowPreDestroy(rowCtx: object): void {
  const insts = _gxtRowCtxInstances.get(rowCtx);
  _gxtEachRowCtxSet.delete(rowCtx);
  _gxtRowCtxInstances.delete(rowCtx);
  if (insts === undefined || insts.size === 0) return;
  for (const inst of insts) {
    if (!inst || inst.isDestroyed || inst.isDestroying) continue;
    // Only instances that actually reached the live DOM get element lifecycle
    // hooks; `__gxtEverInserted` filters truly-never-inserted transients. We do
    // NOT gate on element connectivity: `trigger` self-gates interactivity (it
    // is a no-op for non-interactive components, whose element hooks are not
    // wired as listeners), and TAGLESS interactive rows have no `HTMLElement`
    // wrapper yet still must fire willDestroyElement. The destructor runs
    // PRE-DOM-removal (teardownAllRowCtxs before clearChildren; destroyRowCtx
    // before destroyElementSync(row)), so the row is still connected here.
    if (!(inst as any).__gxtEverInserted) continue;
    try {
      (inst as any).__gxtWDEFiredCycle = _gxtGetSyncCycleId();
      if (inst._transitionTo && inst._state !== 'inDOM') {
        try {
          inst._transitionTo('inDOM');
        } catch {
          /* ignore */
        }
      }
      if (typeof inst.trigger === 'function') {
        inst.trigger('willDestroyElement');
        inst.trigger('willClearRender');
      }
      // Per-instance trigger gate: a later willDestroyElement/willClearRender
      // trigger in the same sync cycle (e.g. from a reattach path in manager.ts)
      // is a no-op. Other hooks (didDestroyElement, willDestroy) keep flowing.
      if (!(inst as any).__gxtPreDestroyGateInstalled) {
        (inst as any).__gxtPreDestroyGateInstalled = true;
        const origTrigger = inst.trigger;
        Object.defineProperty(inst, 'trigger', {
          value: function (this: any, name: string, ...rest: any[]) {
            if (
              (name === 'willDestroyElement' || name === 'willClearRender') &&
              this.__gxtWDEFiredCycle === _gxtGetSyncCycleId()
            ) {
              return undefined;
            }
            return origTrigger.call(this, name, ...rest);
          },
          writable: true,
          configurable: true,
          enumerable: false,
        });
      }
    } catch {
      /* user override may throw */
    }
  }
}

function patchGlobalEachSync() {
  const g = globalThis as any;
  if (!g.$_eachSync || g.$_eachSync.__emberPatched) return false;
  const origEachSync = g.$_eachSync;

  g.$_eachSync = function patchedEachSync(
    items: any,
    fn: any,
    key: any,
    ctx: any,
    inverseFn?: any,
    hasIndex?: boolean
  ) {
    // The GXT compiler passes a 6th positional `hasIndex` arg to `$_eachSync`
    // when the each-body actually reads the block-param `index` (e.g.
    // `{{#each list as |item index|}}{{index}}`). It MUST be forwarded: without
    // it the list receives `hasIndex=undefined` and skips allocating the per-row
    // REACTIVE index formula, handing the body a raw integer captured at
    // row-creation time. On an in-place `insertAt`/`removeAt` that REUSES an
    // existing row at a new position, that raw integer never recomputes
    // (`[1.world]` stays `[1.world]` instead of `[2.world]`). Forwarding
    // `hasIndex` makes the list build a reactive index MergedCell whose formula
    // re-locates the item in the current source array on every revalidation.
    //
    // Determine whether this list's keying can ever STALE a key and rebind a
    // reused row to a NEW object ref (the `rebindEachItem` host hook).
    // glimmer-next's compiler emits `key` as: `null` (no `key=`), `'@identity'`
    // (each-in / explicit identity), or `'@index'` (rare; compiler warns +
    // downgrades to identity) → ALL of these key by object identity (a stable
    // WeakMap), so a given key can NEVER bind to a different ref → rebind is
    // impossible → the per-row `__gxtRev` cell is dead weight. Only an EXPLICIT
    // property/function `key=` (e.g. `key="id"`) can stale a key (in-place
    // mutate the keyed prop, then a ref-swap reuses the row by the stale key) →
    // rebind possible → KEEP the rev cell. So: rebindPossible = key is
    // non-null, non-identity, non-index.
    const _keyIsIdentity =
      key === null || key === undefined || key === '' || key === '@identity' || key === '@index';
    const _rebindPossible = !_keyIsIdentity;
    // Capture the parent Ember component instance at the time $_eachSync is
    // called from the template body. `ctx` is the GXT render context (which
    // proxies the Ember component instance) — unwrap via __gxtRawTarget.
    // This is needed because on UPDATE (items add/remove) GXT invokes `fn`
    // and `inverseFn` OUTSIDE the render transaction — at which point the
    // parentViewStack is empty and newly-created item components would get
    // parentView = null.
    //
    // During force-rerender (Phase 2b), the renderer builds a `freshContext =
    // Object.create(component)` wrapper to avoid disturbing cell tracking.
    // This wrapper is NOT the same object as the real component, so using it
    // as `capturedParent` produces a DIFFERENT instance-pool key than the one
    // Phase 1 (gxtSyncDom) used during the same sync cycle. The result:
    // inverse-branch components ({{else}}) are created FRESH in Phase 2b,
    // producing duplicate init/on(init)/didReceiveAttrs hooks (see the
    // `components rendered from {{each}} have correct life-cycle hooks`
    // lifecycle test — `reset to empty array` assertion). Walk the prototype
    // chain to resolve to the underlying real component (nearest ancestor
    // with own-`layoutName`) so both phases key into the SAME pool and
    // Phase 2b reuses Phase 1's inverse-branch instances.
    let _initialParent: any = (ctx && (ctx.__gxtRawTarget || ctx)) || null;
    // Detect Phase 2b's `freshContext = Object.create(component)` wrapper:
    // its direct prototype is the REAL component INSTANCE (an Ember View),
    // NOT a class prototype. Class prototypes satisfy
    // `ctor.prototype === proto`; instances do NOT. Prefer the instance-proto
    // in the wrapper case so both phases key into the SAME instance pool.
    if (_initialParent && typeof _initialParent === 'object') {
      const proto: any = Object.getPrototypeOf(_initialParent);
      if (
        proto &&
        typeof proto === 'object' &&
        proto !== Object.prototype &&
        typeof proto.trigger === 'function' &&
        proto.isView === true &&
        !proto.isDestroyed &&
        !proto.isDestroying
      ) {
        const ctor = proto.constructor;
        const protoIsInstance =
          typeof ctor === 'function' && ctor.prototype !== undefined && ctor.prototype !== proto;
        if (protoIsInstance) {
          _initialParent = proto;
        }
      }
    }
    const capturedParent: any = _initialParent;
    const viewUtils = getGxtRenderer()?.viewUtils;
    // Ember View instances have an _isView/isView flag; only push actual
    // view-like instances. Plain objects / GXT contexts without a view
    // identity must not be pushed or they would become bogus parents.
    const isViewInstance = !!(
      capturedParent &&
      typeof capturedParent === 'object' &&
      (capturedParent.isView === true ||
        typeof capturedParent.trigger === 'function' ||
        'elementId' in capturedParent)
    );
    // Only wrap when we have a view instance AND the bridge is available.
    // On initial render, the parent is already on the stack (pushed by
    // renderTemplateWithParentView), so pushing again would merely stack —
    // `getCurrentParentView` still returns the same top. On update, the
    // stack is empty and this push makes the parent resolvable.
    const canWrap = isViewInstance && !!viewUtils;
    const withParent = (cb: any): any => {
      if (!canWrap) return cb();
      viewUtils!.pushParentView(capturedParent);
      try {
        return cb();
      } finally {
        viewUtils!.popParentView();
      }
    };

    // Wrap the callback fn to ensure `index` is always a cell-like object.
    // GXT's compiled code emits `() => index.value` for block params,
    // but in non-dev GXT builds, $SyncListComponent passes `index` as
    // a plain number (no .value property). This causes `() => index.value`
    // to return `undefined`, breaking {{get array index}} patterns.
    const origFn = fn;
    fn = function wrappedEachFn(item: any, index: any, ctx0: any) {
      // Push the captured parent view for the duration of item-body
      // construction. On INITIAL render the parent is already on the stack
      // (renderTemplateWithParentView), but on opcode-driven UPDATE — when the
      // each-source cell changes by REF (`set(this,'items',newArr)`) and the
      // new key set is disjoint from the old — syncList tears down all old rows
      // (fastCleanup + detachTreeChildren) and then re-creates the new rows by
      // invoking `fn` OUTSIDE the render transaction with an EMPTY
      // parentViewStack. Without the captured parent on the stack, the newly
      // constructed row component resolves parentView/rendering-context off
      // `undefined` and throws ("Cannot read properties of undefined (reading
      // 'Symbol()')") inside the row's initDOM/getContext, leaving the list
      // empty. The inverse-branch path already does this (see withParent at the
      // origInverseFn call below); mirror it for the forward item body so
      // ref-swap updates render opcode-driven.
      // `withParent` is a no-op when the parent is already on the stack
      // (initial render) or when no view-instance parent was captured.
      // Wrap the item so `{{item.<prop>}}` reads in the body tap
      // `cellFor(rawItem, <prop>)` and the GXT formula becomes reactive
      // (otherwise it's isConst → torn down → text never updates).
      const bodyItem = wrapEachItemForTracking(item, _rebindPossible);
      // `ctx0` IS the row's gxt rowCtx (the `bodyCtx` gxt threads through
      // `buildRow`), the same object `onRowContextCreated` saw. Mark it current
      // for the duration of the row's synchronous body render so every Ember
      // instance created here (direct + nested) is associated with this row's
      // pre-destroy destructor. Save/restore keeps nested `{{#each}}` correct.
      const _prevRowCtx = _gxtCurrentRowCtx;
      _gxtCurrentRowCtx = ctx0 || null;
      try {
        return withParent(() => {
          // If index is a plain number (not a cell), wrap it in a cell-like object
          if (typeof index === 'number') {
            const cellLike: any = { id: index };
            Object.defineProperty(cellLike, 'value', {
              get() {
                return index;
              },
              enumerable: true,
              configurable: true,
            });
            return origFn(bodyItem, cellLike, ctx0);
          }
          return origFn(bodyItem, index, ctx0);
        });
      } finally {
        _gxtCurrentRowCtx = _prevRowCtx;
      }
    };
    // Wrap inverseFn so components created in the {{else}} branch (rendered
    // when items becomes empty on update) see the captured parent — at that
    // point the parentViewStack is empty and new instances would otherwise
    // have parentView=null, breaking the lifecycle tests.
    //
    // Additionally, when the forward branch items all disappear (items array
    // goes from non-empty → empty), classic Ember lifecycle expects the OLD
    // items' SYNC `willDestroyElement`/`willClearRender` (fired BEFORE the
    // inverse content is constructed) followed by their ASYNC
    // `didDestroyElement`/`willDestroy` (fired AFTER the new content's
    // didInsertElement). The SYNC half is owned by the each-row pre-destroy
    // destructor (`onRowContextCreated` → `_gxtFireRowPreDestroy`, which fires
    // while the row is still connected — pre-`clearChildren`). This wrapper
    // owns only the ASYNC half: it collects the old rows (guarded by
    // `__gxtInverseDestroyFiredCycle` against double-collection) and defers their
    // didDestroyElement/willDestroy into `_pendingInverseOldRowFinalize`, marking
    // each `__gxtDeferAsyncDestroyCycle` so the Phase 2c sweep skips them.
    if (typeof inverseFn === 'function') {
      const origInverseFn = inverseFn;
      inverseFn = function wrappedInverseFn(ctx0: any) {
        // Lifecycle teardown ORDERING: the old each-rows whose
        // willDestroyElement/willClearRender were fired by the per-row
        // pre-destroy delegation need their async teardown (didDestroyElement +
        // willDestroy) fired AFTER the inverse
        // branch's new content has rendered AND its didInsertElement/didRender
        // callbacks have flushed — classic Ember fires new-insert before
        // async-destroy. We collect the ordered old rows here (in BOTH the
        // tagged and tagless cases — `wrappedInverseFn` finds them in
        // `_allPoolArrays` regardless of tagName) and finalize them after
        // `origInverseFn` renders + the after-insert queue drains. Without
        // this, tagged rows are torn down by Phase 2c (destroyUnclaimedPool)
        // which runs BEFORE Phase 3b (flushAfterInsertQueue) — inverting the
        // order — and tagless rows are never swept at all (their
        // DocumentFragment wrapper isn't an Element, so neither Phase 2c nor
        // _gxtDestroyInstancesInNodes matches them) so their willDestroy leaks
        // to the test teardown.
        let _oldRowsToFinalize: any[] | null = null;
        const _finalizeCycle = _gxtGetSyncCycleId();
        try {
          const currentCycle = _gxtGetSyncCycleId();
          const isSyncing = _gxtIsSyncing();
          const alreadyFired =
            capturedParent &&
            (capturedParent as any).__gxtInverseDestroyFiredCycle === currentCycle;
          if (isSyncing && !alreadyFired && capturedParent) {
            (capturedParent as any).__gxtInverseDestroyFiredCycle = currentCycle;
            // Cross-file read of the manager.ts-local `_allPoolArrays` Set via
            // the bridge getter. The optional-chain falls through the
            // `if (allPools)` gate when the bridge is not yet installed (before
            // manager.ts's module init runs).
            const allPools = getGxtRenderer()?.compilePipeline.getAllPoolArrays?.();
            if (allPools) {
              // Collect live instances whose parentView chain includes
              // capturedParent — these are the children torn down by the
              // transition to the inverse branch.
              const candidates: any[] = [];
              for (const poolArr of allPools) {
                for (const entry of poolArr) {
                  const inst = entry && entry.instance;
                  if (!inst || inst.isDestroyed || inst.isDestroying) continue;
                  if (inst === capturedParent) continue;
                  if (!inst.__gxtEverInserted) continue;
                  let pv: any = inst.parentView;
                  let guard = 0;
                  let underParent = false;
                  while (pv && guard++ < 6) {
                    if (pv === capturedParent) {
                      underParent = true;
                      break;
                    }
                    pv = pv.parentView;
                  }
                  if (!underParent) continue;
                  // Rows already fired this cycle by the each-row pre-destroy
                  // destructor are intentionally NOT excluded here: `ordered`
                  // drives only the ASYNC didDestroy/willDestroy finalize (the
                  // sync willDestroyElement/willClearRender is owned by the
                  // per-row destructor), and every row still needs that finalize.
                  candidates.push(inst);
                }
              }
              if (candidates.length > 0) {
                // Order: DFS from each direct child of capturedParent so the
                // emitted hook sequence interleaves (an-item[0], nested[0],
                // an-item[1], nested[1], ...) — matching classic render order.
                const directChildren = candidates.filter(
                  (c: any) => c.parentView === capturedParent
                );
                const ordered: any[] = [];
                const visited = new Set<any>();
                const visit = (inst: any) => {
                  if (!inst || visited.has(inst)) return;
                  visited.add(inst);
                  ordered.push(inst);
                  for (const c of candidates) {
                    if (c.parentView === inst) visit(c);
                  }
                };
                for (const root of directChildren) visit(root);
                for (const c of candidates) if (!visited.has(c)) ordered.push(c);

                // No reattach-to-fixture is needed for these rows: the per-row
                // `onRowContextCreated` destructor (`_gxtFireRowPreDestroy`)
                // fires their sync willDestroyElement/willClearRender
                // PRE-DOM-removal on the still-connected element (during
                // `fastCleanup`→`teardownAllRowCtxs` before `clearChildren`, or
                // per-row `destroyItem`→`destroyRowCtx` before
                // `destroyElementSync(row)`). Interactive each→else rows are
                // always connected at destructor time; non-interactive rows fire
                // no element hooks anyway.
                //
                // Remember the ordered old rows so we can DEFER their async
                // teardown (didDestroyElement + willDestroy) until AFTER the new
                // inverse content + its after-insert callbacks (Phase 3b) have
                // flushed — classic Ember fires new-insert before async-destroy.
                _oldRowsToFinalize = ordered.slice();
                // Pre-mark each old row so the Phase 2c `destroyUnclaimedPool`
                // sweep (which runs BEFORE Phase 3b) skips firing their
                // didDestroyElement / willDestroy — the deferred drain below
                // owns that, in the correct order.
                for (const inst of ordered) {
                  try {
                    (inst as any).__gxtDeferAsyncDestroyCycle = currentCycle;
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
          }
        } catch {
          /* best-effort; never block inverse render */
        }
        // Render the inverse ({{else}}) branch's new content. This enqueues the
        // new components' didInsertElement/didRender into the after-insert
        // queue (interactive mode).
        const _inverseResult = withParent(() => origInverseFn(ctx0));
        // Lifecycle teardown ORDERING: queue the old rows' async teardown so
        // `_gxtSyncDomNow` drains it AFTER Phase 3b (flushAfterInsertQueue)
        // has fired the NEW content's didInsertElement/didRender — matching
        // classic Ember's new-insert-before-async-destroy.
        if (_oldRowsToFinalize && _oldRowsToFinalize.length > 0) {
          _pendingInverseOldRowFinalize.push({
            rows: _oldRowsToFinalize,
            cycle: _finalizeCycle,
          });
        }
        return _inverseResult;
      };
    }

    // Wrap items cell/getter to normalize collection values.
    // CRITICAL: $_eachSync expects a Cell/MergedCell (with .id and .value),
    // NOT a plain getter function. Wrap in the module-local `gxtFormula`
    // binding (directly imported from @lifeart/gxt at the top of this file).
    // Register the underlying array of an iterable wrapper as an "array owner"
    // of (component, propertyName) so that '[]'/'length' KVO notifications on
    // mutations (unshiftObject/pushObject) propagate to the component cell.
    // Without this, mutating an Ember ArrayProxy/ArrayLike/Symbol.iterator/
    // forEach collection would update the underlying array but never dirty
    // the component cell — so the each's syncList listener would never fire,
    // and only the destructive force-rerender would update the DOM, breaking
    // DOM stability for keyed reuse (regression: "it maintains DOM stability
    // for stable keys when list is updated" for non-Array iterables).
    //
    // The compiled template emits `() => this.list` (no metadata). We parse
    // the single property name out of the function body to recover the cell
    // identity (this.<name>), then register the iterable's backing array.
    const _itemsPropName = (() => {
      if (typeof items !== 'function') return null;
      try {
        const src = items.toString();
        const m = src.match(/this\.([A-Za-z_$][A-Za-z0-9_$]*)/);
        return m ? m[1] : null;
      } catch {
        return null;
      }
    })();
    const _itemsOwner = ctx ? ctx.__gxtRawTarget || ctx : null;
    const _registerIterableUnderlyingArray = (rawItems: any) => {
      if (!rawItems || typeof rawItems !== 'object') return;
      if (!_itemsOwner || !_itemsPropName) return;
      // Register the WRAPPER itself first so that `arrayContentDidChange`
      // notifying '[]'/'length' on the wrapper finds the owner. ArrayProxy
      // emits notifications on itself; ArrayDelegate emits on `_target` which
      // defaults to the delegate instance.
      try {
        registerArrayOwner(rawItems, _itemsOwner, _itemsPropName);
      } catch {
        /* ignore */
      }
      // Also register backing arrays so direct array mutations propagate.
      // Walk own + inherited enumerable properties for any value that is an
      // array OR another iterable-like wrapper. This catches:
      //   - ArrayProxy.content
      //   - ArrayDelegate._array
      //   - Custom proxies with `wrappedItems` (arrangedContent depends on
      //     external content) where arrayContentDidChange fires on the
      //     wrapped array, not on the proxy.
      const visited = new Set<any>([rawItems]);
      const queue: any[] = [rawItems];
      let hops = 0;
      while (queue.length > 0 && hops < 8) {
        hops++;
        const cur = queue.shift();
        if (!cur || typeof cur !== 'object' || Array.isArray(cur)) continue;
        for (const propName of [
          'content',
          '_array',
          'wrappedItems',
          '_content',
          'arrangedContent',
        ]) {
          let val: any = undefined;
          try {
            val = (cur as any)[propName];
          } catch {
            continue;
          }
          if (val == null || visited.has(val)) continue;
          visited.add(val);
          if (Array.isArray(val)) {
            try {
              registerArrayOwner(val, _itemsOwner, _itemsPropName);
            } catch {
              /* ignore */
            }
          } else if (typeof val === 'object') {
            try {
              registerArrayOwner(val, _itemsOwner, _itemsPropName);
            } catch {
              /* ignore */
            }
            queue.push(val);
          }
        }
      }
    };
    if (typeof items === 'function' && !items.prototype) {
      const origGetter = items;
      // Wrap in formula → MergedCell so $_eachSync gets a proper reactive tag
      const wrappedCell = gxtFormula(() => {
        const raw = origGetter();
        // Register array-owner mapping on every read so that newly-set
        // collection wrappers (post replaceList) hook their underlying
        // arrays into KVO mutation propagation too.
        _registerIterableUnderlyingArray(raw);
        // Subscribe the source formula DIRECTLY to the backing array's `[]`
        // cell. `arrayContentDidChange` → `notifyPropertyChange(array,'[]')`
        // dirties `cellFor(array,'[]')` (SyncCore primary cell.update). The
        // array-owner fan-out covers `this.<prop>` sources (parseable name),
        // but NOT block-param sources like the INNER each in
        // `{{#each foo as |bar|}}` where `foo` has no owner cell — its in-place
        // mutation (`inner.replace(0,1,['lady'])`, nested-each test) would not
        // re-fire the inner list. Reading the backing array's `[]` cell here
        // makes the formula re-run on any in-place mutation regardless of
        // source shape.
        {
          _gxtSubscribeBackingArray(raw);
        }
        // `as |item index|`: gxt's index path calls `.indexOf(item)` on this
        // cell value, so materialize non-Array iterables here (Arrays no-op).
        return hasIndex ? normalizeEachCollection(raw) : raw;
      });
      return origEachSync(wrappedCell, fn, key, ctx, inverseFn, hasIndex);
    } else if (items && typeof items === 'object' && 'value' in items) {
      const origCell = items;
      const wrappedCell = Object.create(origCell);
      Object.defineProperty(wrappedCell, 'value', {
        get() {
          const raw = origCell.value;
          return hasIndex ? normalizeEachCollection(raw) : raw;
        },
        enumerable: true,
        configurable: true,
      });
      if (origCell.id !== undefined) wrappedCell.id = origCell.id;
      return origEachSync(wrappedCell, fn, key, ctx, inverseFn, hasIndex);
    }
    return origEachSync(
      hasIndex ? normalizeEachCollection(items) : items,
      fn,
      key,
      ctx,
      inverseFn,
      hasIndex
    );
  };
  g.$_eachSync.__emberPatched = true;

  // Protect from setupGlobalScope overwrite
  protectGlobal('$_eachSync', g.$_eachSync);
  return true;
}
patchGlobalEachSync();
queueMicrotask(patchGlobalEachSync);

// Get a getter function for a property on the render context.
(globalThis as any).__gxtGetCellOrFormula = function (obj: any, key: string) {
  const raw = obj?.__gxtRawTarget || obj;
  try {
    cellFor(raw, key, /* skipDefine */ false);
  } catch {
    /* ignore */
  }
  const getter: any = function () {
    return obj[key];
  };
  getter.__gxtWatchTarget = raw;
  getter.__gxtWatchKey = key;
  return getter;
};

// Augment the backtracking assertion's render tree with template-only
// component names. Template-only components have no instance and therefore
// don't appear in the parentView chain that `checkBacktracking` walks;
// without this augmentation, the render-tree message is missing entries like
// `x-inner-template-only` that Glimmer VM would include.
//
// We track active template-only renders via `_gxtTemplateOnlyStack` (pushed
// in the $_tag thunk below) and rewrite the backtracking assertion message
// at report time.
//
// `_rebuildBacktrackingMsgWithTemplateOnly` is published as
// `backtracking.transformBacktrackingMessage` via `installBacktrackingPart` at
// module bottom. Manager.ts's `checkBacktracking` calls the hook (if registered)
// on the assembled assertion message before dispatching to `_assertFn`.
//
// `_gxtTemplateOnlyRenderedSet` / `_gxtTemplateOnlyStack` track the template-only
// components rendered in the current pass (used to rebuild the backtracking
// message tree). All sites live in this file.
//
// `_gxtTemplateOnlyRenderedSetPassId` is a numeric pass-id snapshot that gates
// the Set-clear inside the $_tag thunk. Initialized to `undefined` so the first
// read in any render pass mismatches `_curPass` (a `number | 0` from
// `__emberRenderPassId`) and triggers the initial clear.
const _gxtTemplateOnlyRenderedSet = new Set<string>();
const _gxtTemplateOnlyStack: string[] = [];
let _gxtTemplateOnlyRenderedSetPassId: number | undefined = undefined;
function _rebuildBacktrackingMsgWithTemplateOnly(msg: string): string {
  if (_gxtTemplateOnlyRenderedSet.size === 0) return msg;
  const lines = msg.split('\n');
  let propPathIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = lines[i] || '';
    if (ln.startsWith('Stack trace for the update:')) continue;
    if (ln.trim().startsWith('this.') || ln.trim().startsWith('@model.')) {
      propPathIdx = i;
      break;
    }
  }
  if (propPathIdx <= 0) return msg;
  const existingInTree = new Set<string>();
  for (let i = 0; i < propPathIdx; i++) {
    const ln = lines[i] || '';
    const trimmed = ln.trim();
    if (
      trimmed &&
      !trimmed.startsWith('-top-level') &&
      !trimmed.startsWith('{{outlet}}') &&
      !trimmed.startsWith('- While rendering:') &&
      !trimmed.startsWith('You attempted')
    ) {
      existingInTree.add(trimmed);
    }
  }
  const missingNames: string[] = [];
  for (const n of _gxtTemplateOnlyRenderedSet) {
    if (!existingInTree.has(n)) missingNames.push(n);
  }
  if (missingNames.length === 0) return msg;
  const propLine = lines[propPathIdx] || '';
  const propIndent = propLine.length - propLine.trimStart().length;
  const insertedLines = missingNames.map((n) => ' '.repeat(propIndent) + n);
  const newPropLine = ' '.repeat(propIndent + missingNames.length * 2) + propLine.trimStart();
  const rebuilt = [
    ...lines.slice(0, propPathIdx),
    ...insertedLines,
    newPropLine,
    ...lines.slice(propPathIdx + 1),
  ];
  return rebuilt.join('\n');
}
// `_rebuildBacktrackingMsgWithTemplateOnly` is contributed as a typed
// `transformBacktrackingMessage` host hook on the `backtracking` namespace via
// `installBacktrackingPart` (see module bottom); manager.ts's
// `checkBacktracking` dispatches it before passing the message to `_assertFn`.

// Clear the template-only rendered set at the start of each render pass so the
// backtracking injector only sees components that rendered during the current
// render. Otherwise previous tests leave stale entries (e.g. a `foo-bar` from a
// prior test polluting the next test's render tree). Contributed as the
// `beforeBeginRenderPass` host hook on the `renderPass` namespace via
// `installRenderPassPart` and dispatched by manager.ts's `beginRenderPass`
// before its main work.
function _resetTemplateOnlyState() {
  try {
    _gxtTemplateOnlyRenderedSet.clear();
    _gxtTemplateOnlyStack.length = 0;
  } catch {
    /* ignore */
  }
}

// The in-flight pass-id / cycle-id state and DC-change-listener dispatch live in
// `_gxtSyncAllWrappers` in manager.ts; `_gxtSyncDomNow` (Phase 1 below) calls it
// through `getGxtRenderer()?.compilePipeline.syncAllWrappers?.()`.

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
//
// Exposed through the `compilePipeline.syncDomNow` typed-bridge method
// (registered in `installCompilePipelinePart` at file EOF).
function _gxtSyncDomNow(): void {
  // Re-entrancy guard: prevent infinite sync loops when force-rerender
  // triggers cell updates that schedule additional syncs.
  if (_gxtIsSyncing()) return;
  if (_gxtGetPendingSync()) {
    _gxtSetPendingSync(false);
    // Only signal "had pending sync" to the force-rerender if an actual property
    // change triggered the sync. Cell creation during initial render also sets
    // the pending-sync flag, but that should NOT force a full re-render.
    _gxtSetHadPendingSync(_gxtGetPendingSyncFromPropertyChange());
    // Mirror "had pending sync" into a flag that survives the force-rerender's
    // (`_gxtForceEmberRerender`) finally-block clear, so downstream phases
    // (e.g. `_gxtDestroyUnclaimedPoolEntries` in manager.ts) can still tell
    // whether this sync was driven by a real property change. Used to gate
    // destroy-error capture: spurious unclaimed sweeps from initial-render syncs
    // (where no property change drove the sync) should NOT route user-thrown
    // destroy/lifecycle errors into _renderErrors.
    _gxtSetSyncIsPropertyDriven(_gxtGetPendingSyncFromPropertyChange());
    // Clear the property-change flag after capturing it into the two survivor
    // flags above.
    _gxtSetPendingSyncFromPropertyChange(false);
    // The matching `_gxtSetSyncing(false)` reset lives in the `finally` below.
    _gxtSetSyncing(true);
    // Increment sync cycle ID so modifier update dedup works correctly.
    _gxtIncrementSyncCycleId();
    // Clear modifier update tracking for this new sync cycle
    const modMgr = (globalThis as any).$_MANAGERS?.modifier;
    if (modMgr?._updatedInstances) modMgr._updatedInstances.clear();
    // Wrap ALL phases in try/finally so the syncing flag is ALWAYS reset,
    // even if an unexpected error escapes a catch block.
    try {
      // Start a new render pass to prevent double-firing of lifecycle hooks.
      // Routes through the typed `compilePipeline.newRenderPass` bridge; the
      // optional-chain short-circuits to a no-op when manager.ts has not yet
      // seeded the compilePipeline namespace (e.g. in classic-Ember builds).
      getGxtRenderer()?.compilePipeline.newRenderPass?.();
      // PHASE 0: Pre-flush FALSE-flip if-watchers BEFORE gxtSyncDom. This ensures
      // any outer {{#if}} that toggles to false in the batch tears down its branch
      // FIRST, so when GXT's native sync evaluates inner conditional formulas, the
      // inner branches inside the dead subtree are no longer reachable. Without
      // this pre-flush, gxtSyncDom would observe inner cond=true and synchronously
      // invoke its trueBranch, instantiating transient components that the outer
      // {{#if}} would only later have suppressed.
      if (_pendingIfWatcherNotifications.length > 0) {
        try {
          const pending0 = _pendingIfWatcherNotifications.slice();
          const ordered0 = _orderIfWatcherFlush(pending0);
          const fired0 = new Set<IfWatcherCb>();
          for (const { cb, obj } of ordered0) {
            if (fired0.has(cb)) continue;
            if (typeof cb.__getNextBool !== 'function') continue;
            let next: boolean | null = null;
            try {
              next = cb.__getNextBool(obj);
            } catch {
              /* ignore */
            }
            if (next !== false) continue;
            fired0.add(cb);
            try {
              cb(obj);
            } catch (e) {
              console.warn('[GXT] ifWatcher pre-flush error:', e);
            }
          }
          // Mark fired cbs so the regular Phase 1a flush below doesn't re-fire them.
          _gxtPreFlushFiredFalse = fired0;
        } catch {
          /* ignore */
        }
      }
      // PHASE 0.5: Drain the deferred cascade queue here (rather than at the end
      // of `_gxtTriggerReRender`) so the Deferred half (modifier-install watcher
      // + syncWrapper) batches across every trigger that fired in this runtask.
      // The three cell.update fan-outs (_arrayOwnerMap + _objectValueCellMap)
      // live in SyncCore, so deferring this remaining work does not break
      // same-runtask template reads. Recursive `_gxtTriggerReRender` calls
      // during a Deferred body enqueue at the tail and the cursor loop picks
      // them up in the same pass (bounded by `_MAX_DRAIN`).
      if (_deferredCascadeQueue.length > 0) {
        try {
          _drainCascadeQueue();
        } finally {
          _deferredCascadeQueue.length = 0;
          _deferredCascadeIndex = new WeakMap();
        }
      }
      // Only run gxtSyncDom when a real property change triggered the sync.
      // Cell creation during initial render also sets the pending-sync flag, but
      // those cells may have stale values (e.g., each-formula re-evaluates with []
      // before the correct value propagates). Skipping gxtSyncDom for
      // non-property-change syncs prevents spurious #each inverse rendering on
      // first render.
      if (_gxtGetHadPendingSync()) {
        try {
          gxtSyncDom();
        } catch {
          /* ignore */
        }
      } else {
        // Clear tagsToRevalidate to prevent stale formulas from re-evaluating
        // on the next gxtSyncDom call. These tags were dirtied during component
        // initialization (not from user property changes) and their formulas
        // may produce incorrect values (e.g., each-formula returning []).
        const clearTags = (globalThis as any).__gxtClearTagsToRevalidate;
        if (typeof clearTags === 'function') clearTags();
      }
      // PHASE 1: Update arg cells and fire pre-render lifecycle hooks BEFORE
      // the force-rerender. The force-rerender (innerHTML='' + rebuild) resets
      // arg cells to current values, so changes must be detected first.
      // Typed bridge dispatch via `compilePipeline.syncAllWrappers`; the
      // canonical `_gxtSyncAllWrappers` lives in manager.ts.
      try {
        const syncAll = getGxtRenderer()?.compilePipeline.syncAllWrappers;
        if (typeof syncAll === 'function') {
          syncAll(); // Pre-render hooks + arg cell updates
          // Drain queued each-row rebinds — bump each holder's revision cell so
          // the SECOND gxtSyncDom() pass below re-executes the
          // reused row body formula with the swapped (new) source object. The
          // bump must land HERE (after Phase 0.5's terminal tagsToRevalidate
          // clear, before this pass) or it would be wiped. Inert when no rebinds
          // are queued (no keyed-reuse ref-swap).
          _gxtDrainPendingEachRebinds();
          if (_gxtGetHadPendingSync() || _gxtGetPendingSync()) {
            try {
              gxtSyncDom();
            } catch {
              /* ignore */
            }
          }
          // When STRING-path $_dc change listeners are active (using GXT cells),
          // the second gxtSyncDom pass may have handled dynamic component swaps
          // via cell tracking. Skip the force-rerender morph (Phase 2b) only when
          // cell-based listeners exist. CurriedComponent listeners use manual DOM
          // swap and need the morph for other property changes to propagate.
          if (getGxtRenderer()?.compilePipeline.hasStringDynamicComponentListeners?.()) {
            _gxtSetHadPendingSync(false);
          }
        }
      } catch {
        /* ignore */
      }
      // PHASE 1a: Flush deferred if-watcher notifications. These were accumulated
      // during `_gxtTriggerReRender` calls and are flushed HERE (after all
      // gxtSyncDom calls) so batched property changes are applied atomically —
      // IfConditions see the final state of all conditions, not intermediate
      // states.
      //
      // Watchers are processed in PARENT-FIRST order: those whose IfCondition is
      // about to flip to FALSE fire before those flipping to TRUE. This way, an
      // outer {{#if}} toggling false in the same batch tears down its branch
      // BEFORE an inner {{#if}} would otherwise render new content (and create
      // transient components). Additionally, after all FALSE-flips have fired,
      // any TRUE-flip whose placeholder has been disconnected from the live DOM
      // (because a parent {{#if}} just tore it down) is SUPPRESSED — calling
      // syncState(true) at that point would still execute the true-branch and
      // instantiate components into a dead subtree.
      if (_pendingIfWatcherNotifications.length > 0) {
        const pending = _pendingIfWatcherNotifications.splice(0);
        const ordered = _orderIfWatcherFlush(pending);
        const directlyFiredCbs = new Set<IfWatcherCb>();
        // Pull in cbs already fired in PHASE 0 (pre-flush FALSE-flip) so we don't
        // re-invoke them here. Falls through cleanly when there were none.
        const preFired = _gxtPreFlushFiredFalse;
        if (preFired && preFired.size > 0) {
          for (const cb of preFired) directlyFiredCbs.add(cb);
          _gxtPreFlushFiredFalse = undefined;
        }
        // Phase A: fire all FALSE-flips (outer parents collapse first).
        for (const { cb, obj } of ordered) {
          if (directlyFiredCbs.has(cb)) continue;
          if (typeof cb.__getNextBool !== 'function') continue;
          let next: boolean | null = null;
          try {
            next = cb.__getNextBool(obj);
          } catch {
            /* ignore */
          }
          if (next !== false) continue;
          directlyFiredCbs.add(cb);
          try {
            cb(obj);
          } catch (e) {
            console.warn('[GXT] ifWatcher error:', e);
          }
        }
        // Phase B: fire all TRUE-flips that still have a live placeholder. Skip
        // any TRUE-flip whose IfCondition placeholder was disconnected during
        // Phase A — that means a parent {{#if}} just unrendered its subtree and
        // we must NOT let the inner branch instantiate transient components.
        for (const { cb, obj } of ordered) {
          if (directlyFiredCbs.has(cb)) continue;
          if (typeof cb.__getNextBool !== 'function') continue;
          let next: boolean | null = null;
          try {
            next = cb.__getNextBool(obj);
          } catch {
            /* ignore */
          }
          if (next !== true) continue;
          directlyFiredCbs.add(cb);
          const ifc = cb.__ifCondition;
          const ph = ifc && ifc.placeholder;
          // If the placeholder exists but was just disconnected by a parent
          // teardown, skip the syncState call — `repairPlaceholder` would
          // otherwise reattach it to the body and the true-branch would render
          // into a dead subtree, instantiating components the test never sees.
          if (ph && (ph as any).nodeType && !(ph as any).isConnected) {
            continue;
          }
          try {
            cb(obj);
          } catch (e) {
            console.warn('[GXT] ifWatcher error:', e);
          }
        }
        // Phase C: fire all watchers that have no flip metadata (unknown/legacy)
        // plus any with metadata whose nextBool came back null.
        for (const { cb, obj } of ordered) {
          if (directlyFiredCbs.has(cb)) continue;
          directlyFiredCbs.add(cb);
          try {
            cb(obj);
          } catch (e) {
            console.warn('[GXT] ifWatcher error:', e);
          }
        }
        // Phase D: fan out the remaining (legacy) watchers via the proto/ctx
        // candidate walk so any callbacks not represented in `ordered` (e.g.
        // late-registered ones) still fire.
        for (const { obj, keyName } of pending) {
          try {
            const candidates: object[] = [obj];
            try {
              const proto = Object.getPrototypeOf(obj);
              if (proto && proto !== Object.prototype) candidates.push(proto);
            } catch {
              /* ignore */
            }
            const ctxsMap = _getOrCreateGxtComponentContexts();
            if (ctxsMap) {
              const ctxs = ctxsMap.get(obj);
              if (ctxs) {
                for (const ctx of ctxs) {
                  const raw = (ctx as any)?.__gxtRawTarget || ctx;
                  if (!candidates.includes(raw)) candidates.push(raw);
                }
              }
            }
            for (const target of candidates) {
              const keyMap = ifWatchers.get(target);
              if (!keyMap) continue;
              const watchers = keyMap.get(keyName);
              if (!watchers) continue;
              for (const cb of watchers) {
                if (directlyFiredCbs.has(cb)) continue;
                try {
                  cb(obj);
                } catch (e) {
                  console.warn('[GXT] ifWatcher error:', e);
                }
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
      // PHASE 1b: After gxtSyncDom handled cell-based updates, mark all GXT
      // roots as clean so the force-rerender morph (Phase 2b) is skipped when
      // GXT already applied the DOM changes. Without this, gxtLastTagValue is
      // stale and the morph ALWAYS fires, creating duplicate components/modifiers
      // on temporary elements. Only update root tag values (NOT hadPendingSync)
      // so that property-change-driven syncs still trigger the morph when needed.
      try {
        // Read via the gxt-bridge `rootComponent` namespace; the writer is
        // `glimmer/lib/renderer.ts`.
        const updateRootTags = getGxtRenderer()?.rootComponent.updateRootTagValues;
        if (typeof updateRootTags === 'function') updateRootTags();
      } catch {
        /* ignore */
      }
      // The morph is not skipped when root tags merely look current: Phase 1b
      // above has just updated them, so such a check always passes and would
      // skip the morph for updates gxtSyncDom did not handle (e.g., inline
      // $__if with function values, undefined → truthy transitions). The morph
      // must always run when hadPendingSync is true from a property change.
      // PHASE 2a: Snapshot live instances before force-rerender.
      try {
        getGxtRenderer()?.compilePipeline.snapshotLiveInstances();
      } catch {
        /* ignore */
      }
      // PHASE 2b: With gxtModuleDedup, GXT's native cell tracking handles
      // most DOM updates via gxtSyncDom() in Phase 1. The force-rerender
      // (morph) is kept as fallback for cases where cell tracking doesn't
      // cover the change (computed properties, prototype chain changes).
      // The morph preserves DOM node stability.
      try {
        // The force-rerender state lives in renderer.ts (which owns the
        // `renderers[]` registry); this cross-package reader routes through the
        // bridge method. By the time PHASE 2b's morph fallback fires,
        // renderer.ts's `installCompilePipelinePart` has run and the method is
        // installed, so the optional chain is load-order-safe.
        getGxtRenderer()?.compilePipeline.forceEmberRerender?.();
      } catch (rerenderErr) {
        // Store the error so it can be re-thrown after sync completes.
        // First-error-wins coalescing — a PHASE 2b throw must not be shadowed by
        // a later PHASE 2c throw.
        _gxtDeferredSyncError = _gxtDeferredSyncError || rerenderErr;
      }
      // PHASE 2c: Destroy unclaimed instances — components that were in
      // the old render but not in the new one (e.g., {{each}} items removed).
      try {
        getGxtRenderer()?.destruction.destroyUnclaimedPoolEntries();
      } catch (destroyErr) {
        // Store destroy errors for propagation to assert.throws.
        // First-error-wins coalescing — a PHASE 2b rerender throw wins over this
        // PHASE 2c destroy throw.
        _gxtDeferredSyncError = _gxtDeferredSyncError || destroyErr;
      }
      // PHASE 2c2: Rebuild view-tree parent/child relationships from DOM ancestry.
      // The bridge slot dispatches the `afterRebuildViewTreeFromDom` host hook
      // (contributed by this file via `installViewUtilsPart` at module bottom)
      // AFTER manager.ts's main rebuild body.
      try {
        getGxtRenderer()?.viewUtils.rebuildViewTreeFromDom?.();
      } catch {
        /* ignore */
      }
      // PHASE 2d: Flush pending modifier destroys — call destroyModifier on
      // custom modifier managers whose elements were removed (e.g., by #if toggle).
      // This must happen BEFORE post-render hooks so willDestroyElement fires
      // before didInsertElement of the replacement element.
      // The pending-modifier-destroys queue lives in `gxt-backend/manager.ts`;
      // this cross-file reader routes through the read-only Array-getter
      // `compilePipeline.getPendingModifierDestroys?.()` and mutates the returned
      // array reference directly (`splice(0)` drains here).
      try {
        const pendingDestroys = getGxtRenderer()?.compilePipeline.getPendingModifierDestroys?.();
        if (pendingDestroys && pendingDestroys.length > 0) {
          const toFlush = pendingDestroys.splice(0) as any[];
          for (const entry of toFlush) {
            if (!entry.cached.pendingDestroy) continue; // Already reclaimed by update path
            // Only destroy if the element is actually disconnected from the DOM.
            if (entry.element && entry.element.isConnected) continue;
            try {
              if (
                entry.isCustom &&
                entry.cached.manager?.destroyModifier &&
                !entry.cached.instance?.__gxtModDestroyed
              ) {
                entry.cached.manager.destroyModifier(entry.cached.instance);
                if (entry.cached.instance) entry.cached.instance.__gxtModDestroyed = true;
              }
              if (entry.destroyable) {
                // The destroyable returned from manager.getDestroyable(state) holds
                // the internal manager's destructors (e.g. OnModifierManager's
                // removeEventListener). Use the canonical destroy bridge so that
                // registered destructors fire synchronously when the element has
                // been removed from the DOM.
                getGxtRenderer()?.destruction.destroyDestroyable(entry.destroyable);
              }
            } catch {
              /* ignore individual modifier destroy errors */
            }
            // Remove from cache
            const elCache = entry.cache?.get(entry.element);
            if (elCache) {
              elCache.delete(entry.modKey);
              if (elCache.size === 0) entry.cache.delete(entry.element);
            }
          }
        }
      } catch {
        /* ignore */
      }
      // PHASE 3: Post-render hooks (didUpdate, didRender) — fire after DOM
      // is fully updated by the force-rerender. Routes through the typed
      // `compilePipeline.postRenderHooks` bridge; the optional chain short-
      // circuits to a no-op when manager.ts has not yet seeded the
      // compilePipeline namespace (e.g. in classic-Ember builds).
      try {
        getGxtRenderer()?.compilePipeline.postRenderHooks?.();
      } catch {
        /* ignore */
      }
      // PHASE 3b: Flush pending didInsertElement / didRender callbacks for
      // classic components that were instantiated DURING this sync cycle
      // (e.g., via IfCondition.syncState's branch re-evaluation when a
      // `{{#if cond}}{{my-component}}{{else}}{{other-component}}{{/if}}`
      // toggles cond). These callbacks are pushed to _afterInsertQueue in
      // renderClassicComponent and would otherwise never fire because the
      // outlet-rerender / sync path doesn't call flushAfterInsertQueue().
      //
      // The bridge slot is the adapter `_gxtBridgeFlushAfterInsertQueue`, which
      // also dispatches the `afterFlushAfterInsertQueue` host hook contributed by
      // this file via `installViewUtilsPart` (the in-element deferred-render
      // drain).
      try {
        getGxtRenderer()?.viewUtils.flushAfterInsertQueue?.();
      } catch {
        /* ignore */
      }
      // PHASE 3c: Drain deferred each→empty inverse-branch old-row finalization
      // (didDestroyElement + willDestroy). This runs AFTER Phase 3b so the NEW
      // inverse content's didInsertElement/didRender fire BEFORE the OLD rows'
      // async teardown, matching classic Ember's new-insert-before-async-destroy.
      // Inert (empty queue) on any sync that didn't take an each→empty inverse
      // transition.
      try {
        _gxtDrainPendingInverseOldRowFinalize();
      } catch {
        /* ignore */
      }
      // Re-render CurriedComponent marker regions
      try {
        const infos = _curriedRenderInfos;
        if (infos.length) {
          for (const info of infos) {
            const {
              item: getter,
              startMarker: sm,
              endMarker: em,
              renderCurriedComponent: render,
              managers: mgrs,
            } = info;
            const parent = sm.parentNode;
            if (!parent) continue;
            try {
              const newResult = getter();
              const newFinal =
                typeof newResult === 'function' && !newResult?.__isCurriedComponent
                  ? newResult()
                  : newResult;

              // Skip teardown if same component with unchanged args (preserves DOM stability)
              if (
                newFinal &&
                newFinal.__isCurriedComponent &&
                sm.nextSibling !== em &&
                !_curriedComponentChanged(info, newFinal)
              ) {
                continue;
              }

              const _swapped2 =
                !newFinal ||
                !newFinal.__isCurriedComponent ||
                newFinal.__name !== info.lastRenderedName;
              const _rem2 = _removeNodesBetween(parent, sm, em);
              if (_swapped2 && _rem2.length > 0) {
                getGxtRenderer()?.destruction.destroyInstancesInNodes(_rem2);
              }

              if (newFinal && newFinal.__isCurriedComponent && mgrs.component.canHandle(newFinal)) {
                const newNode = render(newFinal);
                if (newNode) parent.insertBefore(newNode, em);
                _snapshotCurriedArgs(info, newFinal);
              }
            } catch {
              /* ignore render errors */
            }
          }
        }
      } catch {
        /* ignore */
      }
    } finally {
      // CRITICAL: Always reset the syncing flag even if an error escapes.
      // Without this, the flag stays true forever and _gxtSyncDomNow becomes a
      // permanent no-op, causing all subsequent tests to fail.
      _gxtSetSyncing(false);
      // Also reset the property-driven mirror flag so a subsequent
      // initial-render sync starts in a clean state.
      _gxtSetSyncIsPropertyDriven(false);
    }
    // Re-throw any deferred errors from the force-rerender or lifecycle phases
    // so they propagate to assert.throws() in tests. The read happens AFTER the
    // outer try/finally above has already reset `_gxtFlags.syncing` and
    // `_gxtFlags.syncIsPropertyDriven`, so the throw escapes with a clean sync
    // state — the next `_gxtSyncDomNow` call will not short-circuit on the
    // re-entrancy guard. Clear before throwing so the slot starts the next sync
    // cycle empty.
    const deferredSyncErr = _gxtDeferredSyncError;
    if (deferredSyncErr) {
      _gxtDeferredSyncError = null;
      throw deferredSyncErr;
    }
  }
}

// Also schedule a fallback setTimeout flush for non-test scenarios
// where _gxtSyncDomNow isn't called explicitly.
// Guards:
// 1. Skip if no pending sync (`_gxtGetPendingSync()`).
// 2. Skip if the syncing flag is stuck true (prevents piling up on a hung sync).
// 3. Budget: max 3 consecutive interval-triggered syncs without an explicit
//    runTask-triggered sync in between. Prevents the interval from driving
//    an infinite re-render loop when tests produce continuous dirty state.
let _intervalSyncBudget = 3;
// Exposed via the gxt-bridge as `compilePipeline.resetIntervalBudget`. Closes
// over the module-local `_intervalSyncBudget` (also read by the setInterval
// below). The in-package consumers (`runAppend` / `runTask` in
// internal-test-helpers) route through the bridge.
function _gxtResetIntervalBudget(): void {
  _intervalSyncBudget = 3;
}
setInterval(() => {
  if (_gxtGetPendingSync()) {
    // Don't fire if a sync is already in progress (stuck flag).
    if (_gxtIsSyncing()) return;
    // Enforce budget to prevent interval-driven infinite loops
    if (_intervalSyncBudget <= 0) return;
    _intervalSyncBudget--;
    try {
      _gxtSyncDomNow();
    } catch {
      /* ignore - errors will be caught by QUnit */
    }
  } else {
    // No pending sync — reset budget for next burst
    _intervalSyncBudget = 3;
  }
}, 16); // ~60fps

// Cleanup function to reset GXT state between tests. Registered on the typed
// bridge via `installCompilePipelinePart`; cross-package readers (the
// internal-test-helpers test-cases) route through
// `getGxtRenderer()?.compilePipeline.cleanupActiveComponents?.()`.
function _gxtCleanupActiveComponents(): void {
  // Destroy all tracked component instances first (fires willDestroy hooks)
  getGxtRenderer()?.destruction.destroyTrackedInstances();
  // Reset block params stack
  blockParamsStack.length = 0;
  // Reset current slot params
  currentSlotParams = null;
  // Reset slots context stack
  slotsContextStack.length = 0;
  // NOTE: Do NOT clear templateCache between tests. Each clear forces
  // re-compilation via new Function() which leaks V8 code space memory.
  // After ~3000 tests this causes Chromium renderer OOM.
  // Template cache entries are keyed by template string so identical
  // templates safely reuse compiled functions.
  // Clear curried render infos
  _curriedRenderInfos.length = 0;
  // Clear helper instances (already destroyed by destroyTrackedInstances)
  _gxtHelperInstances.length = 0;
  // Clear the helper instance cache used by $_maybeHelper
  getGxtRenderer()?.compilePipeline.clearHelperCache?.();
  // Clear the helper instance cache used by $_tag
  _gxtClearTagHelperCache();
  // Clear component instance pools to prevent stale reuse across tests
  getGxtRenderer()?.compilePipeline.clearInstancePools?.();
  // Clear stale ifWatchers to prevent callbacks from previous tests firing on detached DOM.
  _gxtClearIfWatchers();
  // Destroy cached engine instances from {{mount}} so Namespace.destroy()
  // removes them from NAMESPACES (prevents "Should not have any NAMESPACES" failures).
  if (_gxtEngineInstances.size > 0) {
    for (const [, engineInst] of _gxtEngineInstances) {
      try {
        // Destroy the original engine class instance (its init added it to NAMESPACES)
        const origEngine = engineInst?.__gxtOriginalEngine;
        if (
          origEngine &&
          typeof origEngine.destroy === 'function' &&
          !origEngine.isDestroyed &&
          !origEngine.isDestroying
        ) {
          origEngine.destroy();
        }
        if (
          engineInst &&
          typeof engineInst.destroy === 'function' &&
          !engineInst.isDestroyed &&
          !engineInst.isDestroying
        ) {
          engineInst.destroy();
        }
      } catch {
        /* ignore */
      }
    }
    _gxtEngineInstances.clear();
  }
  // Clear pending if-watcher notifications from the previous test
  _pendingIfWatcherNotifications.length = 0;
  // Clear the deferred-cascade queue + index between tests so queue state
  // never leaks across the test boundary (defensive — the queue should already
  // be drained by `_gxtSyncDomNow`).
  _deferredCascadeQueue.length = 0;
  _deferredCascadeIndex = new WeakMap();
  // Clear dynamic component change listeners and stale getter from $_dc_ember.
  // The Set + string-path counter live in manager.ts behind the bridge's
  // `clearDynamicComponentListeners()`. The clear resets both in lockstep —
  // without that lockstep, an orphaned listener count leaks across tests and
  // makes _gxtSyncDomNow incorrectly clear the had-pending-sync flag in Phase 1,
  // which then causes `_gxtForceEmberRerender` to skip the morph for tests that
  // need it (e.g. classic Component.extend properties changed via set()).
  setDcComponentGetter(null);
  getGxtRenderer()?.compilePipeline.clearDynamicComponentListeners?.();
  // Clear component contexts to prevent stale render contexts accumulating.
  // Resets the binding to a fresh WeakMap; cross-file readers re-fetch through
  // `compilePipeline.getComponentContextsMap?.()` on every access, so the new
  // WeakMap propagates immediately.
  _resetGxtComponentContexts();
  // Reset pending sync flags to prevent timer-based re-renders leaking into next test.
  // The setInterval checks the pending-sync flag and calls _gxtSyncDomNow(), which
  // can trigger `_gxtForceEmberRerender` (innerHTML='' + rebuild) on the next
  // test's DOM.
  _gxtSetPendingSync(false);
  _gxtSetPendingSyncFromPropertyChange(false);
  _gxtSetHadPendingSync(false);
  _gxtSetHadNestedObjectChange(false);
  _gxtSetSyncing(false);
  // Reset module-local rendering state
  _gxtCurrentSlots = undefined;
  _gxtCurrentFw = undefined;
}

// Patch QUnit.equiv and Assert.prototype.deepEqual to tolerate the whitespace
// differences produced by GXT's AST compiler, which strips whitespace-only text
// nodes between element siblings and trims leading/trailing whitespace around
// mustaches within mixed text nodes. Classic Ember/Glimmer preserves all such
// whitespace text nodes verbatim, so assertHTML comparisons over multi-line
// templates (e.g. `<div>A</div>\n      <div>B</div>`) fail on token mismatch
// even when the structural DOM is identical.
//
// equalTokens (packages/internal-test-helpers/lib/equal-tokens.ts) tokenizes
// both sides with simple-html-tokenizer and then compares via QUnit.equiv (and
// assert.deepEqual for the mismatch-display branch). The `stripGxtArtifacts`
// helper collapses `>\s+<` in both actual innerHTML and expected strings, but
// that only handles whitespace between sibling tags — not the leading/trailing
// whitespace inside an element where GXT trims around mustache interpolations.
// Token arrays still differ by Chars tokens whose `chars` are whitespace-only
// or have leading/trailing whitespace around real content.
//
// This patch keeps the original equiv semantics for all non-token-array
// comparisons and narrows the normalization to arrays that look like
// simple-html-tokenizer output (contain StartTag/EndTag/Chars entries):
//   1. Drop whitespace-only Chars tokens (they disappear in GXT's output).
//   2. Trim leading/trailing whitespace on Chars tokens that contain content
//      (GXT trims these when adjacent to a mustache interpolation).
// Internal whitespace inside a text node is left intact, so tests that assert
// on exact content strings are unaffected.
let _qunitWhitespacePatched = false;
(function patchQUnitForGxtWhitespace() {
  // DEBUG-only: QUnit exists only under the test harness — the early return
  // lets the production build drop the entire patch body (DEBUG is
  // define-replaced, the body becomes unreachable, terser removes it).
  if (!DEBUG) return;
  const g: any = globalThis as any;
  if (_qunitWhitespacePatched) return;
  const applyPatch = () => {
    const Q = g.QUnit;
    if (typeof Q === 'undefined' || !Q.equiv || !Q.assert) {
      return false;
    }
    if (_qunitWhitespacePatched) return true;
    const isTokenArray = (x: unknown): boolean => {
      if (!Array.isArray(x)) return false;
      for (let i = 0; i < x.length; i++) {
        const t: any = x[i];
        if (t && typeof t === 'object' && typeof t.type === 'string') {
          if (t.type === 'StartTag' || t.type === 'EndTag' || t.type === 'Chars') {
            return true;
          }
        }
      }
      return false;
    };
    const normalize = (arr: any[]): any[] => {
      const out: any[] = [];
      for (let i = 0; i < arr.length; i++) {
        const t = arr[i];
        if (t && typeof t === 'object' && t.type === 'Chars' && typeof t.chars === 'string') {
          // Skip whitespace-only text tokens (GXT strips them from the AST)
          if (/^\s+$/.test(t.chars)) continue;
          // Trim leading/trailing whitespace on text content tokens
          const trimmed = t.chars.replace(/^\s+|\s+$/g, '');
          if (trimmed !== t.chars) {
            out.push({ ...t, chars: trimmed });
            continue;
          }
        }
        out.push(t);
      }
      return out;
    };
    const origEquiv = Q.equiv;
    Q.equiv = function patchedEquiv(a: any, b: any) {
      if (arguments.length === 2 && isTokenArray(a) && isTokenArray(b)) {
        return origEquiv(normalize(a), normalize(b));
      }
      return origEquiv.apply(this, arguments as any);
    };
    const origDeepEqual = Q.assert.deepEqual;
    if (typeof origDeepEqual === 'function') {
      Q.assert.deepEqual = function patchedDeepEqual(actual: any, expected: any, message?: string) {
        if (isTokenArray(actual) && isTokenArray(expected)) {
          return origDeepEqual.call(this, normalize(actual), normalize(expected), message);
        }
        return origDeepEqual.call(this, actual, expected, message);
      };
    }
    _qunitWhitespacePatched = true;
    return true;
  };
  // QUnit may not be available when this module first evaluates (e.g. in
  // production bundles). Retry with a small backoff until it shows up or we
  // give up. This is a best-effort hook; non-test runs simply no-op.
  if (applyPatch()) return;
  let attempts = 0;
  const poll = () => {
    if (applyPatch()) return;
    attempts++;
    if (attempts > 50) return; // ~5s total, then stop polling
    setTimeout(poll, 100);
  };
  setTimeout(poll, 0);
})();

// Track class-based helper instances for destruction during test teardown.
// The array identity is stable across the module lifetime (contents mutated via
// push + length=0; identity never reassigned).
//
// Pushes are funneled through `_gxtPushHelperInstance(inst)` so the optional
// push-hook (`_gxtHelperInstancePushHook`, set by manager.ts via
// `compilePipeline.setHelperInstancePushHook` to install the
// classic-helper-recompute GXT bridge) fires synchronously BEFORE the array
// push. The hook is null until manager.ts registers it (via queueMicrotask after
// this module's `installCompilePipelinePart` has run); when null the push
// proceeds without the bridge install.
const _gxtHelperInstances: any[] = [];
let _gxtHelperInstancePushHook: ((inst: any) => void) | null = null;
function _gxtPushHelperInstance(inst: any): void {
  if (_gxtHelperInstancePushHook) {
    try {
      _gxtHelperInstancePushHook(inst);
    } catch {
      /* ignore — best-effort */
    }
  }
  _gxtHelperInstances.push(inst);
}
function _gxtGetHelperInstances(): any[] {
  return _gxtHelperInstances;
}
function _gxtSetHelperInstancePushHook(hook: (inst: any) => void): void {
  _gxtHelperInstancePushHook = hook;
}

// Cache for helper instances created in $_tag to prevent re-creation during
// force re-render (which does innerHTML='' + full rebuild). Keyed by helper name.
// Cleared during test teardown via `_gxtClearTagHelperCache`. Exposed to
// ember-gxt-wrappers.ts (the `_tagDirtySentinel.lastArgsSer` setter that
// propagates classic-tag dirties into cached tag-helper instances) via the
// get-only bridge method `compilePipeline.getTagHelperInstanceCache`.
const _tagHelperInstanceCache = new Map<string, { instance: any; recomputeTag: any }>();
function _gxtClearTagHelperCache(): void {
  _tagHelperInstanceCache.clear();
}

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it.
// IMPORTANT: We store the GXT-original reference so that manager.ts can
// later MUTATE it (install Ember's component/helper/modifier handlers
// directly onto this object). GXT's internal functions ($_maybeModifier,
// $_maybeHelper, etc.) close over this same object reference.
(globalThis as any).$_MANAGERS = $_MANAGERS;

// Replace globalThis.$_maybeModifier with a version that delegates to our
// Ember modifier manager. The GXT-original function closes over the module-scope
// $_MANAGERS object which may not have been updated yet (timing issue with imports).
// This ensures that runtime-compiled template functions (which reference
// globalThis.$_maybeModifier via the Function() constructor) use Ember's modifier
// manager for string-based modifier resolution.
// Protect with Object.defineProperty to prevent setupGlobalScope from overwriting.
{
  const origMaybeModifier = (globalThis as any).$_maybeModifier;
  if (origMaybeModifier) {
    const emberMaybeModifier = function (
      modifier: any,
      element: HTMLElement,
      props: any[],
      hashArgs: any
    ) {
      // Always try our manager first
      const mgrs = (globalThis as any).$_MANAGERS;
      if (mgrs?.modifier?.canHandle?.(modifier)) {
        return mgrs.modifier.handle(modifier, element, props, hashArgs);
      }
      // Fall back to GXT's original
      return origMaybeModifier(modifier, element, props, hashArgs);
    };
    protectGlobal('$_maybeModifier', emberMaybeModifier);
  }
}

// Override $_helperHelper to route through Ember's helper manager.
// GXT's native $_helperHelper doesn't understand the "curried helper reference"
// pattern that Ember expects for `{{helper "name"}}` and nested calls like
// `{{helper (helper "name") "extra"}}`. We override it to call
// `$_MANAGERS.helper.handle(definition, positional, named)`, which already
// returns a curried ember helper for subexpression use and the final value
// for content-position use (via the curried helper being invoked automatically
// by the enclosing formula / text serialiser).
{
  const _g = globalThis as any;
  const emberHelperHelper = function (positional: any[], named: any): any {
    const unwrapVal = (v: any) =>
      typeof v === 'function' && !v.prototype && v.length === 0 ? v() : v;
    const head =
      Array.isArray(positional) && positional.length > 0 ? unwrapVal(positional[0]) : undefined;
    const rest = Array.isArray(positional) && positional.length > 1 ? positional.slice(1) : [];
    const managers = _g.$_MANAGERS;
    if (managers?.helper?.handle) {
      return managers.helper.handle(head, rest, named || {});
    }
    return undefined;
  };
  protectGlobal('$_helperHelper', emberHelperHelper);
}

// The body of the `gt`/`gte`/`lt`/`lte`/`neq` keyword helpers (see their use in
// `_emberBuiltinHelpers`). Built under a computed key so the function keeps the
// helper's name.
function _comparisonHelper(name: string, compare: (a: any, b: any) => boolean) {
  return {
    [name]: (...args: any[]) => {
      if (args.length !== 2) {
        const _assert = getDebugFunction('assert');
        const msg = `\`${name}\` expects exactly two arguments, received ${args.length}`;
        if (_assert) _assert(msg, false);
        throw new Error(msg);
      }
      const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
      const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
      return compare(a, b);
    },
  }[name]!;
}

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
// Module-local; other files (ember-gxt-wrappers' helper resolution + entries-of
// patch) reach it by reference through `compilePipeline.getBuiltinHelpers`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _emberBuiltinHelpers: Record<string, any> = {
  // readonly: Returns a readonly cell marker object.
  // The component manager detects __isReadonly and provides an immutable attr
  // (no .update()) while still allowing the value to flow downward.
  readonly: (value: any) => {
    const resolved = typeof value === 'function' ? value() : value;
    // If value is already a mut cell, wrap its value (strips mutability)
    const unwrapped = resolved && resolved.__isMutCell ? resolved.value : resolved;
    return {
      __isReadonly: true,
      __readonlyValue: unwrapped,
      get value() {
        const v = typeof value === 'function' ? value() : value;
        return v && v.__isMutCell ? v.value : v;
      },
    };
  },
  // mut: Returns a setter function for two-way binding.
  // When used with (fn (mut this.val) newValue), the returned function
  // updates the property on the component via Ember.set().
  // The template transform adds a path string as the second arg.
  // The context is captured at creation time via the bridge
  // `compilePipeline.getMutContext?.()`; the state lives in
  // `ember-gxt-wrappers.ts`. That bridge is installed at its module-init time;
  // by the time this helper body actually runs (template render time, well past
  // compile.ts module init), the bridge slot is populated and the optional chain
  // resolves.
  mut: (value: any, path?: string) => {
    // Capture context at creation time (set by $_maybeHelper wrapper)
    const capturedCtx = getGxtRenderer()?.compilePipeline.getMutContext?.() as any;
    // Assert that mut only receives a path, not a literal or helper result.
    // Use getDebugFunction('assert') to ensure we call the currently-registered
    // assert (which may be stubbed by expectAssertion in tests).
    if (!path || typeof path !== 'string') {
      // If value is not a getter function, it's a literal or helper result — not allowed
      if (typeof value !== 'function' || value.prototype) {
        const _assert = getDebugFunction('assert');
        if (_assert) _assert('You can only pass a path to mut', false);
      }
      return typeof value === 'function' ? value() : value;
    }
    // Determine the property name from the path
    const propName = path.startsWith('this.')
      ? path.slice(5)
      : path.startsWith('@')
        ? path.slice(1)
        : path;
    // Look up the source getter for two-way binding (from curried component positional args)
    const sourceGetter = capturedCtx?.__mutArgSources?.[propName];
    // Create a "mut cell" function: calling it with a value sets the property
    const mutCell = function mutCell(newValue?: any) {
      if (arguments.length === 0) {
        // Read mode: return current value
        return typeof value === 'function' ? value() : value;
      }
      // Write mode: set the property through the binding chain
      if (sourceGetter) {
        // We have a source getter from the parent template.
        // Parse its toString() to extract the property path, then set through it.
        const parentCtx = sourceGetter.__mutParentCtx;
        if (parentCtx) {
          const getterStr = sourceGetter.toString();
          // Match patterns like: () => this.model?.val2, () => this.model.val2
          const extractedPath = extractThisPath(getterStr);
          if (extractedPath) {
            // Clean the path: remove optional chaining operators
            const fullPath = extractedPath.split('?').join('');
            // Split into parts and set the nested property
            const parts = fullPath.split('.');
            if (parts.length === 1) {
              // Simple property: this.val
              if (typeof parentCtx.set === 'function') {
                parentCtx.set(parts[0]!, newValue);
              } else {
                parentCtx[parts[0]!] = newValue;
              }
            } else {
              // Nested property: this.model.val2
              // Navigate to the parent object, then set the final property
              let obj = parentCtx;
              for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]!];
                if (obj == null) break;
              }
              if (obj != null) {
                const lastProp = parts[parts.length - 1]!;
                if (typeof obj.set === 'function') {
                  obj.set(lastProp, newValue);
                } else {
                  obj[lastProp] = newValue;
                }
              }
              // Trigger re-render. Call the module-local `_gxtTriggerReRender`
              // directly (it's in scope, so this avoids the bridge lookup).
              // Suppression is honored by the `_gxtFlags.triggerSuppressed`
              // short-circuit at the entry of `_gxtTriggerReRender`.
              const triggerReRender = _gxtTriggerReRender;
              if (triggerReRender) {
                // Dirty cells along the property path for GXT formula tracking
                if (obj != null && parts.length > 1) {
                  triggerReRender(obj, parts[parts.length - 1]!);
                }
                triggerReRender(parentCtx, parts[0]!);
              }
              // Force a full re-render of the parent component.
              // This is needed when the property path isn't cell-tracked
              // (e.g., model is a plain prototype property from Component.extend).
              if (typeof parentCtx.rerender === 'function') {
                try {
                  parentCtx.rerender();
                } catch {
                  /* ignore */
                }
              } else if (typeof parentCtx.notifyPropertyChange === 'function') {
                parentCtx.notifyPropertyChange(parts[0]!);
              }
            }
            // Also set the local property on the component
            if (capturedCtx && capturedCtx !== parentCtx) {
              if (typeof capturedCtx.set === 'function') {
                capturedCtx.set(propName, newValue);
              } else {
                capturedCtx[propName] = newValue;
              }
            }
            return newValue;
          }
        }
      }
      // Fallback: set on the component's own context
      if (capturedCtx) {
        if (typeof capturedCtx.set === 'function') {
          capturedCtx.set(propName, newValue);
          // Ember's set() can fail to persist on GXT cell-backed descriptors
          // when mandatory-setter-style interception short-circuits the write.
          // Fall back to direct assignment (invokes the descriptor's setter)
          // and then to manual setter invocation if even that doesn't take.
          if (capturedCtx[propName] !== newValue) {
            try {
              capturedCtx[propName] = newValue;
            } catch {
              /* ignore */
            }
            if (capturedCtx[propName] !== newValue) {
              try {
                const ownDesc = Object.getOwnPropertyDescriptor(capturedCtx, propName);
                const setter = ownDesc?.set;
                if (setter) setter.call(capturedCtx, newValue);
              } catch {
                /* ignore */
              }
            }
            // Fire a re-render trigger so GXT's trackedArgCells sync runs
            // for dependent children (important when the fallback path
            // bypassed Ember's set() and its notifyPropertyChange chain).
            // The module-local `_gxtTriggerReRender` is called directly;
            // suppression is honored by its entry short-circuit.
            const triggerReRender = _gxtTriggerReRender;
            if (triggerReRender) {
              try {
                triggerReRender(capturedCtx, propName);
              } catch {
                /* ignore */
              }
            }
          }
        } else {
          capturedCtx[propName] = newValue;
        }
      }
      return newValue;
    };
    // Mark as a mut cell so fn helper doesn't try to unwrap it
    (mutCell as any).__isMutCell = true;
    // What it writes: a cell is created on each evaluation of `(mut this.x)`,
    // and `(fn (mut this.x) …)` keeps its function across them (utils.ts).
    (mutCell as any)[MUT_CELL_SOURCE] = { ctx: capturedCtx, path };
    // Ember's mut cell API: .value returns current value, .update(newValue) sets it.
    // These are used by tests via component.attrs.propName.value and .update().
    Object.defineProperty(mutCell, 'value', {
      get() {
        return typeof value === 'function' ? value() : value;
      },
      enumerable: true,
    });
    (mutCell as any).update = function (newValue: any) {
      return mutCell(newValue);
    };
    // valueOf returns current value for template rendering
    mutCell.toString = () => String(typeof value === 'function' ? value() : value);
    mutCell.valueOf = () => (typeof value === 'function' ? value() : value);
    return mutCell;
  },
  // unbound: Returns the value without tracking.
  // Use getDebugFunction('assert') so expectAssertion's stub is called.
  //
  // For `(unbound (hash foo=this.x))` the serializer emits:
  //   unbound($__hash({ foo: () => this.x }))
  // The `$__hash` result is an object whose `foo` property is a live GXT
  // getter that re-reads `this.x` on every access. To give Ember-style
  // frozen-at-first-read semantics we deep-snapshot those getters into
  // static own-property values before returning the hash so downstream
  // `{{value.foo}}` reads the frozen value.
  unbound: (...args: any[]) => {
    const _assert = getDebugFunction('assert');
    if (_assert)
      _assert(
        'unbound helper cannot be called with multiple params or hash params',
        args.length <= 1
      );
    const value = args[0];
    const resolved = typeof value === 'function' ? value() : value;
    return _unboundSnapshot(resolved);
  },
  // concat: Concatenates arguments into a string.
  // Must use _normalizeStringValue rather than .join('') because Symbol
  // values throw on implicit string coercion but are defined for explicit
  // String() conversion. Also maps Object.create(null) -> '' to match
  // Glimmer's normalizeStringValue semantics.
  concat: (...args: any[]) => {
    let out = '';
    for (const a of args) {
      const v = typeof a === 'function' && !a.prototype ? a() : a;
      out += _normalizeStringValue(v);
    }
    return out;
  },
  // array: Creates an array from arguments
  array: (...args: any[]) => {
    return args.map((a) => (typeof a === 'function' && !a.prototype ? a() : a));
  },
  // hash: Creates an object from named arguments (handled specially)
  hash: (obj: any) => obj,
  // Comparison keyword helpers (gt, gte, lt, lte, neq).
  //
  // These exist in `@glimmer/runtime` and are exposed via
  // `@ember/helper`, but GXT's compiler does not recognize them
  // natively (unlike `eq`/`and`/`or`/`not`, which map to GXT's
  // `$__eq`/`$__and`/`$__or`/`$__not` opcodes). For unrecognized bare
  // identifiers like `{{gt a b}}`, GXT emits `$_maybeHelper("gt", [a, b],
  // this)`. The strict-mode `$_maybeHelper` shadow emitted into the template
  // body then checks the name against this table (`__gxtBuiltinHelpers`);
  // without these entries, every `gt`/`gte`/`lt`/`lte`/`neq` invocation
  // throws "not in scope".
  //
  // Args arrive pre-unwrapped via `unwrapArgs` (ember-gxt-wrappers.ts) for
  // `{{gt a b}}` content position, but for the SubExpression case
  // `{{if (gt a b) ...}}` GXT routes through a different code path that
  // leaves the args as zero-arity getter functions. We re-unwrap defensively
  // so both paths produce numeric results. The arg-count `throw` matches the
  // Glimmer runtime helper bodies (packages/@glimmer/runtime/lib/helpers/gt.ts,
  // etc.) so the `'throws if not called with exactly two arguments'` tests
  // pass. Use getDebugFunction('assert') so expectAssertion's stub can capture
  // the throw before it propagates.
  gt: _comparisonHelper('gt', (a, b) => a > b),
  gte: _comparisonHelper('gte', (a, b) => a >= b),
  lt: _comparisonHelper('lt', (a, b) => a < b),
  lte: _comparisonHelper('lte', (a, b) => a <= b),
  neq: _comparisonHelper('neq', (a, b) => a !== b),
  // gxtGetOutletState: Returns the current outlet state
  // (`getCurrentOutletState()`). Used as the fallback for
  // `{{-get-dynamic-var "outletState"}}` when no enclosing
  // `{{#-with-dynamic-vars outletState=...}}` has provided a scoped
  // override. The Ember template keyword accepts only `outletState` as
  // a key (compile-time assert rejects others) and lets descendants read
  // the routing outlet state.
  gxtGetOutletState: () => {
    return getCurrentOutletState();
  },
  // gxtEntriesOf: Converts an object to [{k, v}, ...] for {{#each-in}}
  // Returns objects with .k and .v properties (not arrays) since GXT
  // doesn't support numeric property access like entry.0.
  gxtEntriesOf: (obj: any) => {
    let resolved = typeof obj === 'function' ? obj() : obj;
    // Functions can have own properties (e.g., function Foo() {}; Foo.bar = 1).
    // In each-in, these should be iterable. However, we must distinguish between
    // plain functions (which should have their keys enumerated) and getter functions
    // (which should be called to get the actual value).
    // After the first unwrap, if we still have a function, it's a real value —
    // check if it has own enumerable keys.
    if (typeof resolved === 'function') {
      const keys = Object.keys(resolved);
      if (keys.length > 0) {
        return keys.map((key) => ({ k: key, v: (resolved as any)[key] }));
      }
      return [];
    }
    if (!resolved || typeof resolved !== 'object') return [];
    // Unwrap ObjectProxy — iterate over .content, not the proxy itself.
    // ObjectProxy has unknownProperty/setUnknownProperty and stores data in .content
    if (
      typeof resolved.unknownProperty === 'function' &&
      typeof resolved.setUnknownProperty === 'function'
    ) {
      const content = resolved.content;
      if (!content || typeof content !== 'object') return [];
      resolved = content;
    }
    // Support Map-like objects (ES6 Map, etc.) but NOT arrays.
    // Arrays have both .entries() and .forEach(), but should use Object.keys()
    // to iterate like `for (key in obj)` — including non-numeric own properties
    // and skipping sparse holes.
    if (
      !Array.isArray(resolved) &&
      typeof resolved.entries === 'function' &&
      typeof resolved.forEach === 'function'
    ) {
      return Array.from(resolved.entries()).map(([k, v]: any) => ({ k, v }));
    }
    // Support custom iterables with Symbol.iterator (but not arrays or strings)
    if (
      typeof resolved[Symbol.iterator] === 'function' &&
      !Array.isArray(resolved) &&
      typeof resolved !== 'string'
    ) {
      const entries: { k: any; v: any }[] = [];
      for (const entry of resolved) {
        if (Array.isArray(entry) && entry.length >= 2) {
          entries.push({ k: entry[0], v: entry[1] });
        }
      }
      return entries;
    }
    // For objects and arrays: use Object.keys() which returns own enumerable properties.
    // This correctly handles:
    // - Plain objects: all own keys
    // - Object.create(proto): only own keys (not inherited)
    // - Arrays: numeric indices + custom properties like arr.foo = 'bar'
    // - Sparse arrays: only defined indices (skips holes)
    const keys = Object.keys(resolved);
    // Subscribe the each-in source to the object's key set so
    // `set(obj,'NewKey')` re-iterates. (This inline copy is the fallback —
    // ember-gxt-wrappers.ts overrides `gxtEntriesOf` at runtime.)
    _gxtEntangleObjectKeys(resolved, keys);
    return keys.map((key) => ({ k: key, v: (resolved as any)[key] }));
  },
  // get: Dynamic property lookup — supports dot-path keys like 'foo.bar'
  get: (obj: any, key: any) => {
    const resolvedObj = typeof obj === 'function' ? obj() : obj;
    const resolvedKey = typeof key === 'function' ? key() : key;
    if (resolvedObj == null) return undefined;
    if (typeof resolvedKey === 'string' && resolvedKey.includes('.')) {
      let current = resolvedObj;
      for (const part of resolvedKey.split('.')) {
        if (current == null) return undefined;
        current = current[part];
      }
      return current;
    }
    return resolvedObj[resolvedKey];
  },
  // __mutGet: Two-way binding for (mut (get obj key)) pattern.
  // Creates a mut cell that reads from obj[key] and writes to obj[key].
  // This is used when the template transform converts (mut (get obj key))
  // into (__mutGet obj key).
  __mutGet: (obj: any, key: any) => {
    // Bridge-routed reader for the mut context (see the sibling `mut` helper).
    const capturedCtx = getGxtRenderer()?.compilePipeline.getMutContext?.() as any;
    const resolveObj = () => (typeof obj === 'function' ? obj() : obj);
    const resolveKey = () => (typeof key === 'function' ? key() : key);
    const getValue = () => {
      const o = resolveObj();
      const k = resolveKey();
      if (o == null) return undefined;
      if (typeof k === 'string' && k.includes('.')) {
        let current = o;
        for (const part of k.split('.')) {
          if (current == null) return undefined;
          current = current[part];
        }
        return current;
      }
      return o[k];
    };
    const mutCell = function mutGetCell(newValue?: any) {
      if (arguments.length === 0) {
        return getValue();
      }
      // Write mode: set the property at the dynamic key path
      const o = resolveObj();
      const k = resolveKey();
      if (o == null) return newValue;
      if (typeof k === 'string' && k.includes('.')) {
        const parts = k.split('.');
        let target = o;
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]!];
          if (target == null) return newValue;
        }
        const lastProp = parts[parts.length - 1]!;
        if (typeof target.set === 'function') {
          target.set(lastProp, newValue);
        } else {
          target[lastProp] = newValue;
        }
      } else {
        if (typeof o.set === 'function') {
          o.set(k, newValue);
        } else {
          o[k] = newValue;
        }
      }
      // Trigger re-render via the module-local `_gxtTriggerReRender` (called
      // directly; suppression is honored by its entry short-circuit).
      const triggerReRender = _gxtTriggerReRender;
      if (triggerReRender && o != null) {
        const rk = typeof k === 'string' && k.includes('.') ? k.split('.')[0]! : k;
        triggerReRender(o, rk);
      }
      if (capturedCtx && typeof capturedCtx.notifyPropertyChange === 'function') {
        const rk = typeof k === 'string' && k.includes('.') ? k.split('.')[0]! : k;
        capturedCtx.notifyPropertyChange(rk);
      }
      return newValue;
    };
    (mutCell as any).__isMutCell = true;
    Object.defineProperty(mutCell, 'value', {
      get() {
        return getValue();
      },
      enumerable: true,
    });
    (mutCell as any).update = function (newValue: any) {
      return mutCell(newValue);
    };
    mutCell.toString = () => String(getValue());
    mutCell.valueOf = () => getValue();
    return mutCell;
  },
  // helper: The (helper) keyword resolves a helper by name and returns a curried helper reference.
  // {{helper "hello-world"}} renders the result of invoking the helper (via toString/valueOf).
  // {{helper (helper "hello-world") "wow"}} passes extra args to the curried helper.
  helper: (helperNameOrRef: any, ...extraArgs: any[]) => {
    // Helper invocation function: resolves and invokes a helper by name with given args
    const invokeByName = (name: string, positional: any[]) => {
      const owner = getAmbientOwner();
      if (!owner || owner.isDestroyed || owner.isDestroying) return undefined;
      const factory = owner.factoryFor?.(`helper:${name}`);
      if (factory) {
        const instance = factory.create();
        if (instance && typeof instance.compute === 'function') {
          return instance.compute(positional, {});
        }
      }
      const lookup = owner.lookup?.(`helper:${name}`);
      if (typeof lookup === 'function') return lookup(positional, {});
      if (lookup && typeof lookup.compute === 'function') return lookup.compute(positional, {});
      return undefined;
    };

    // Invoke a helper through its manager (for defineSimpleHelper results)
    const invokeManaged = (helperFn: any, positional: any[]) => {
      const managers = getGxtRenderer()?.registries.internalHelperManagers;
      if (!managers) return helperFn(...positional);
      let mgr: any = null;
      let ptr = helperFn;
      while (ptr) {
        mgr = managers.get(ptr);
        if (mgr) break;
        try {
          ptr = Object.getPrototypeOf(ptr);
        } catch {
          break;
        }
      }
      if (mgr && typeof mgr.getDelegateFor === 'function') {
        const delegate = mgr.getDelegateFor(getAmbientOwner());
        if (
          delegate &&
          typeof delegate.createHelper === 'function' &&
          delegate.capabilities?.hasValue
        ) {
          const args = { positional, named: {} };
          const bucket = delegate.createHelper(helperFn, args);
          return delegate.getValue(bucket);
        }
      }
      return helperFn(...positional);
    };

    // Resolve the first argument (unwrap GXT getters but preserve curried refs and managed helpers)
    const raw = helperNameOrRef;
    const resolved =
      typeof raw === 'function' && !raw.__isCurriedHelper && !raw.__isManagedHelper ? raw() : raw;

    // If it's already a curried helper reference, merge extra args and invoke
    if (resolved && resolved.__isCurriedHelper) {
      const resolvedExtras = extraArgs.map((a: any) =>
        typeof a === 'function' && !a.prototype ? a() : a
      );
      const merged = [...(resolved.__positionalArgs || []), ...resolvedExtras];
      if (resolved.__helperName) {
        return invokeByName(resolved.__helperName, merged);
      }
      if (resolved.__helperFn) {
        return invokeManaged(resolved.__helperFn, merged);
      }
      return undefined;
    }

    // String — resolve helper by name
    if (typeof resolved === 'string') {
      const resolvedExtras = extraArgs.map((a: any) =>
        typeof a === 'function' && !a.prototype ? a() : a
      );
      if (extraArgs.length === 0) {
        // No extra args — return a curried reference.
        // In content position {{helper "name"}}, GXT renders the return value.
        // We use toString/valueOf so the curried ref renders as the helper result.
        const ref: any = {};
        ref.__isCurriedHelper = true;
        ref.__helperName = resolved;
        ref.__positionalArgs = [];
        ref.toString = () => String(invokeByName(resolved, []) ?? '');
        ref.valueOf = () => invokeByName(resolved, []);
        return ref;
      }
      return invokeByName(resolved, resolvedExtras);
    }

    // Function with helper manager (from defineSimpleHelper/setHelperManager)
    if (resolved && typeof resolved === 'function') {
      const managers = getGxtRenderer()?.registries.internalHelperManagers;
      let hasManager = false;
      if (managers) {
        let ptr = resolved;
        while (ptr) {
          if (managers.has(ptr)) {
            hasManager = true;
            break;
          }
          try {
            ptr = Object.getPrototypeOf(ptr);
          } catch {
            break;
          }
        }
      }
      if (hasManager) {
        const resolvedExtras = extraArgs.map((a: any) =>
          typeof a === 'function' && !a.prototype ? a() : a
        );
        if (extraArgs.length === 0) {
          const ref: any = {};
          ref.__isCurriedHelper = true;
          ref.__isManagedHelper = true;
          ref.__helperFn = resolved;
          ref.__positionalArgs = [];
          ref.toString = () => String(invokeManaged(resolved, []) ?? '');
          ref.valueOf = () => invokeManaged(resolved, []);
          return ref;
        }
        return invokeManaged(resolved, resolvedExtras);
      }
    }

    return undefined;
  },
  // mount: no table entry — the gxt compiler rewrites every `{{mount}}`
  // statement to an `<ember-mount>` custom element at compile time
  // (glimmer-next visitors/mustache.ts), so no runtime call can reach here.
  // unique-id: Returns a unique identifier string that always starts with a letter
  // (valid CSS selector / HTML ID). Uses the same algorithm as Ember's uniqueId().
  'unique-id': () => {
    return generateUUID();
  },
  // fn: Partially applies a function with arguments
  fn: (func: any, ...args: any[]) => {
    const out = function fnHelperResult(...callArgs: any[]) {
      // Resolve the function — it may be a GXT getter wrapping the actual function
      let resolvedFn = func;
      // Unwrap nested getters until we get the actual function or value
      // But don't unwrap mut cells — they are callable setter functions
      while (
        typeof resolvedFn === 'function' &&
        resolvedFn.length === 0 &&
        !resolvedFn.__isMutCell
      ) {
        const inner = resolvedFn();
        if (inner === resolvedFn) break; // prevent infinite loop
        // If inner is a mut cell, use it directly
        if (typeof inner === 'function' && inner.__isMutCell) {
          resolvedFn = inner;
          break;
        }
        if (typeof inner !== 'function') {
          resolvedFn = inner;
          break;
        }
        resolvedFn = inner;
      }
      const resolvedArgs = args.map((a) => (typeof a === 'function' && !a.__isMutCell ? a() : a));
      if (typeof resolvedFn === 'function') {
        return resolvedFn(...resolvedArgs, ...callArgs);
      }
      return undefined;
    };
    // Mark as fn-helper result so downstream unwrap loops (in `$_c_ember`
    // and curried-component handling) do NOT eagerly invoke the closure
    // when reading a named arg's value descriptor. Without this mark,
    // `<Child @callback={{fn greet "hello"}} />` ended up calling the
    // closure at args-read time, propagating `undefined` (greet's return)
    // as `@callback` to Child — so `{{on "click" @callback}}` received
    // undefined and threw.
    try {
      Object.defineProperty(out, '__isFnHelper', {
        value: true,
        enumerable: false,
        configurable: true,
      });
    } catch {
      /* frozen — skip */
    }
    return out;
  },
  // modifier: The (modifier) keyword for currying modifiers.
  // Delegates to $_modifierHelper which handles string names and modifier references.
  modifier: (...args: any[]) => {
    const g = globalThis as any;
    const modHelper = g.$_modifierHelper;
    if (typeof modHelper === 'function') {
      return modHelper(args, {});
    }
    return undefined;
  },
  // __gxtCommentLookup: resolves a registry token back to the literal
  // HTML comment source produced by `gxtHtmlCommentTransform`. The token
  // is a plain-ASCII identifier with no mustache characters, so it
  // survives the GXT parser without being interpreted as a mustache.
  // The registry lives in ast-transforms.ts (`lookupGxtComment`).
  __gxtCommentLookup: (token: unknown) => lookupGxtComment(token),
};

// ---------------------------------------------------------------------------
// {{on}} modifier — once/capture/passive named-arg support
// ---------------------------------------------------------------------------
//
// Upstream GXT's AST compiler short-circuits when it sees `{{on "event" cb ...}}`
// as an element modifier and emits `[eventName, ($e, $n) => cb($e, $n, ...rest)]`,
// dropping the hash pairs entirely. That loses `once=`, `capture=`, `passive=`.
//
// Fix strategy — rename to bypass the compiler short-circuit:
//   * When we see `{{on "evt" cb once=X capture=Y passive=Z}}`, we rewrite
//     the modifier path to the alias `on-ext`. Because the AST visitor
//     branches on the literal name `"on"`, the alias flows through the
//     *general* modifier path which fully preserves hash pairs.
//   * We register `on-ext` in `$_MANAGERS.modifier._builtinModifiers` as an
//     alias for the Glimmer VM `on` modifier. At handle-time, manager.ts
//     resolves the alias to the same internal manager (`OnModifierManager`),
//     which natively understands `once=` / `capture=` / `passive=` AND the
//     classic rebind-on-callback-change semantics (remove + add listener)
//     that Ember's {{on}} tests assert via counter deltas.
//   * Even hash-less forms are routed through the alias so the
//     OnModifierManager's rebind-on-callback-change semantics fire. GXT's
//     own short-circuit binds a stable arrow that reads the handler
//     reactively and never issues remove/add on change, which would skew
//     the counter assertions.
//
// The alias name uses a hyphen so it can never collide with a user-defined
// modifier (Glimmer's Handlebars parser accepts hyphenated identifiers).
// `_GXT_ON_EXT_ALIAS` (from ast-transforms.ts) is the shared contract string, so
// the `gxtOnModifierTransform` rewrite (see `buildGxtDialectTransforms`) and
// this registration stay in sync.
let _gxtOnExtAliasInstalled = false;
/**
 * Register `on-ext` as an alias for the `on` modifier inside
 * `$_MANAGERS.modifier._builtinModifiers`. Invoked at every call to
 * `precompileTemplate` so the alias is available as soon as the `on`
 * modifier has been registered (via `setInternalModifierManager`).
 * Idempotent: the alias is installed at most once per session.
 */
function _ensureOnExtAlias(): void {
  if (_gxtOnExtAliasInstalled) return;
  const mgrs = (globalThis as any).$_MANAGERS;
  const builtins = mgrs?.modifier?._builtinModifiers;
  if (!builtins) return;
  const onModifier = builtins['on'];
  if (!onModifier) return;
  builtins[_GXT_ON_EXT_ALIAS] = onModifier;
  _gxtOnExtAliasInstalled = true;
}

// {{unbound}} caching. Each call site in a template gets a unique ID; the first
// evaluation stores the result and later evaluations return the cached value.
// The cache is per context (a plain object keyed by call-site ID), which covers
// both a single component re-evaluating (same ctx) and #each iterations (one
// ctx per iteration). The value is passed as a lazy thunk `() => value` so the
// expression is not evaluated eagerly (which would track GXT cell
// dependencies).
//
// The GXT serializer emits `__gxtUnboundEval(__ubCache, "__ubN", () =>
// unbound(...))` for both the `{{unbound X}}` top-level form and inline
// `(unbound X)` sub-expressions; `__gxtUnboundEval` and its slot state are
// inlined into the emitted `templateFnCode` Function() body (search for
// `__ubCache` in the `templateFnCode` builder).

// Runtime guard for the "resolved helper passed as a named argument" form.
// When a template contains `<Component @name={{helperIdent}} />` (no parens),
// Ember's strict-mode compiler throws a specific error because the syntax
// is ambiguously pass-by-reference vs invocation. We mirror that check at
// render time: if `name` resolves to a registered helper via owner lookup,
// throw the same error. Otherwise this returns undefined (letting the
// surrounding expression fall through to its original $_maybeHelper path).
//
// The guard body is inlined into the emitted `templateFnCode` Function() body;
// the post-processor rewrites the bare named-arg helper pattern
// `["@name", $_maybeHelper("ident", [], this)]` into
// `["@name", (__gxtAssertNotResolvedHelperAsNamedArg("ident", this),
// $_maybeHelper("ident", [], this))]`. The body reads only the injected
// `__gxtBuiltinHelpers` / `__gxtAmbientOwner` Function parameters and
// `Symbol.for('OWNER')`. The inline injection is gated on
// `hasNamedArgHelperGuard` so templates without the guard pattern pay zero
// overhead. See the `templateFnCode` builder (search for
// `__gxtAssertNotResolvedHelperAsNamedArg`) for the inlined definition.

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here; the `$_bp<N>`
// getters below read the top of the stack.
// Other files (ember-gxt-wrappers' slot-render frames, manager.ts's has-block
// frames) reach these by REFERENCE through the compilePipeline bridge accessors
// (getBlockParamsStack / getContextBlockParams / getSlotsContextStack).
const blockParamsStack: any[][] = [];

// Per-context block params storage for persistence across re-renders
// WeakMap allows garbage collection when context is no longer referenced
const contextBlockParams = new WeakMap<object, any[]>();

// Current slot params - persists until next slot is called
// This is used for re-renders where the stack has been popped
// Key insight: for simple non-nested slot cases, keeping the "last" params
// allows re-renders to access them even after the slot function returns
let currentSlotParams: any[] | null = null;

// The current render's `$slots` / `$fw`. Compiled template Function() bodies
// read them through the injected `__gxtGetSlots` / `__gxtGetFw` accessor
// parameters.
// The most recent template render context and the hash-getter construction
// context (set while a hash-constructed getter runs); used by the
// $_componentHelper mut-parent-context capture.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _gxtLastRenderContext: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _gxtHashGetterCtx: any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _gxtCurrentSlots: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _gxtCurrentFw: any;
const _gxtGetSlotsFn = () => _gxtCurrentSlots;
const _gxtGetFwFn = () => _gxtCurrentFw;

// Per-template scope-value store. Each compile overwrites its storeKey entry,
// and compiled bodies read it through the injected `__gxtGetScope` accessor
// parameter on every invocation, so they see the latest values.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _gxtScopeStore = new Map<string, any>();
const _gxtGetScopeFn = (key: string) => _gxtScopeStore.get(key);

// Helper to unwrap a potentially reactive value
// This is called each time a block param is accessed to ensure fresh values
function unwrapReactiveValue(value: any): any {
  if (value === undefined || value === null) return value;

  // Check if it's a GXT reactive cell (has 'fn' property and 'isConst')
  if (typeof value === 'object' && 'fn' in value && 'isConst' in value) {
    try {
      return value.fn();
    } catch {
      return value;
    }
  }

  // Functions are returned as-is: yielded user callbacks (e.g.
  // `{{yield this.updatePerson}}`) must not be invoked.
  return value;
}

const bpDescriptors: Record<string, PropertyDescriptor> = {};
for (let i = 0; i < 10; i++) {
  const bpName = `$_bp${i}`;
  bpDescriptors[bpName] = {
    get() {
      let rawValue: any;

      // First check if this context has persistent block params
      // This handles re-renders after the slot function has returned
      const persistentParams = contextBlockParams.get(this);
      if (persistentParams && persistentParams[i] !== undefined) {
        rawValue = persistentParams[i];
      } else {
        // Check the global stack (during initial slot execution)
        const stack = blockParamsStack;
        const stackParams = stack && stack[stack.length - 1];
        if (stackParams && stackParams[i] !== undefined) {
          rawValue = stackParams[i];
        } else {
          // Fall back to current slot params (for re-renders after slot returned)
          const current = currentSlotParams;
          if (current && current[i] !== undefined) {
            rawValue = current[i];
          }
        }
      }

      // CRITICAL: Unwrap reactive values each time to support reactivity
      // When the component's property changes, this getter will return the new value
      return unwrapReactiveValue(rawValue);
    },
    configurable: true,
    enumerable: false,
  };
}
try {
  Object.defineProperties(Object.prototype, bpDescriptors);
} catch (e) {
  // If we can't define on Object.prototype, fall back to globalThis
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(globalThis, `$_bp${i}`, bpDescriptors[`$_bp${i}`]);
  }
}

// The functional-helper brand for GXT's helper resolution: a module-local Set
// behind the registered hook pair (the gxt runtime calls the pair).
{
  const _functionalHelpers = new Set<unknown>();
  _gxtRegisterHostHooks({
    isFunctionalHelper: (fn: unknown) => _functionalHelpers.has(fn),
    markFunctionalHelper: (fn: unknown) => void _functionalHelpers.add(fn),
  });
}

// Stack to track the current slots context during rendering
// Components push their $slots here when rendering, so has-block can check it
const slotsContextStack: any[] = [];

// has-block / has-block-params helpers — returns true if the named block exists.
//
// GXT emits `$_hasBlock.bind(this, $slots)(name)` for `{{has-block "name"}}`, so
// the function receives `(slots, blockName)`. We also accept the legacy single-arg
// `(blockName)` form (falls back to the global slotsContextStack) to stay compatible
// with call sites that pre-date this calling convention.
//
// `<:inverse>` is a Glimmer alias for `<:else>` (see @glimmer/syntax/v2/normalize).
// When looking up either block, we transparently fall back to the other so templates
// can use `yield to="inverse"` even when the invoker wrote `<:else>`.
function _lookupSlot(slots: any, name: string): any {
  if (!slots) return undefined;
  if (typeof slots[name] === 'function') return slots[name];
  if (name === 'else' && typeof slots.inverse === 'function') return slots.inverse;
  if (name === 'inverse' && typeof slots.else === 'function') return slots.else;
  return undefined;
}

function _resolveHasBlockArgs(arg1: any, arg2: any): { slots: any; name: string } {
  // GXT-bound path: (slots, blockName)
  if (arg1 && typeof arg1 === 'object') {
    return { slots: arg1, name: (typeof arg2 === 'string' ? arg2 : undefined) || 'default' };
  }
  // Legacy single-arg path: (blockName)
  const name = (typeof arg1 === 'string' ? arg1 : undefined) || 'default';
  const slots = slotsContextStack[slotsContextStack.length - 1];
  return { slots, name };
}

(globalThis as any).$_hasBlock = function (arg1?: any, arg2?: any) {
  const { slots, name } = _resolveHasBlockArgs(arg1, arg2);
  return _lookupSlot(slots, name) !== undefined;
};

(globalThis as any).$_hasBlockParams = function (arg1?: any, arg2?: any) {
  const { slots, name } = _resolveHasBlockArgs(arg1, arg2);
  const slotFn = _lookupSlot(slots, name);
  if (!slotFn) return false;
  if (slotFn.__hasBlockParams !== undefined) {
    return slotFn.__hasBlockParams;
  }
  // GXT runtime compiler emits a sibling `${name}_` flag (e.g., `default_: true`)
  // alongside the slot function to indicate that block params were declared.
  if (slots) {
    const markerKey = `${name}_`;
    if (markerKey in slots && typeof slots[markerKey] === 'boolean') {
      return slots[markerKey];
    }
    if (name === 'else' && typeof slots.inverse_ === 'boolean') return slots.inverse_;
    if (name === 'inverse' && typeof slots.else_ === 'boolean') return slots.else_;
  }
  return false;
};

// SVG/MathML namespace channel. When the `$_c_ember` override (below)
// intercepts a GXT `$_SVGProvider` / `$_MathMLProvider` / `$_HTMLProvider`
// component invocation, it stashes the caller's existing namespace, sets
// `_gxtNamespace` to the provider's flag (`'svg'` / `'mathml'` / `null`) for the
// duration of the default-slot execution, then restores the previous value in a
// `finally` block. The wrapped `g.$_tag` reader (further down in this module)
// consults the binding to decide whether to use
// `document.createElementNS(SVG_NS|MATHML_NS, tag)` instead of GXT's default
// `createElement`, and four sibling originalTag-wrap guards short-circuit their
// plain-HTML attribute/SafeString cleanup paths when a namespace is active (the
// SVG / MathML branches apply their own attributes via `applyNsAttr`).
//
// Save/restore tolerates `undefined`, so no lazy-init is needed.
let _gxtNamespace: string | undefined;

// Override $_c to handle CurriedComponent — when a GXT binding (e.g., from {{#let}})
// resolves to a CurriedComponent, we need to render it through the Ember component manager
// instead of GXT's normal component constructor path.
const g = globalThis as any;
if (g.$_c && !g.$_c.__emberWrapped) {
  const originalC = g.$_c;

  g.$_c = function $_c_ember(comp: any, args: any, ctx: any) {
    // Handle GXT namespace providers (SVGProvider, HTMLProvider, MathMLProvider).
    // These are GXT-internal components that set up namespace-aware DOM APIs.
    // Instead of routing them through GXT's full component system (which requires
    // deep context setup), we handle them directly by executing their default slot
    // with the appropriate namespace flag set for $_tag to use.
    if (comp === _gxtSVGProvider || comp === _gxtHTMLProvider || comp === _gxtMathMLProvider) {
      const ns = comp === _gxtSVGProvider ? 'svg' : comp === _gxtMathMLProvider ? 'mathml' : null;
      const $SLOTS = $SLOTS_SYMBOL;
      const slots = args?.[$SLOTS] || args?.args?.[$SLOTS];
      const defaultSlot = slots?.default;
      if (typeof defaultSlot === 'function') {
        const prevNs = _gxtNamespace;
        if (ns) _gxtNamespace = ns;
        try {
          const result = defaultSlot(ctx);
          return result;
        } finally {
          _gxtNamespace = prevNs;
        }
      }
      // No default slot — return empty
      return [];
    }

    // Handle string component names (e.g., $_c('FooBar', ...)) from curly block
    // invocations like {{#foo-bar}}...{{/foo-bar}}. The GXT compiler emits these
    // as $_c('FooBar', $_args({...}, {default: ...}, $_edp), ctx) in compat mode.
    // The manager resolves the string name from Ember's registry and returns a
    // rendering closure. We invoke it directly and return the DOM result.
    if (typeof comp === 'string') {
      // Handle @argName — resolve named arg from context, then render as component.
      // This occurs with {{#@inner}}content{{/@inner}} where @inner holds a curried component.
      if (comp.startsWith('@') && ctx) {
        const argName = comp.slice(1);
        const $ARGS_KEY = GXT_ARGS_SYMBOL;
        const ctxArgs = ctx[$ARGS_KEY] || ctx['args'] || ctx?.args || {};
        let componentValue = ctxArgs[argName];
        // Resolve getter functions
        let guard = 5;
        while (
          typeof componentValue === 'function' &&
          !componentValue.prototype &&
          !componentValue.__isCurriedComponent &&
          guard-- > 0
        ) {
          try {
            componentValue = componentValue();
          } catch {
            break;
          }
        }
        if (componentValue && componentValue.__isCurriedComponent) {
          const managers = g.$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return handleEmberComponent(managers, componentValue, buildNamedArgs(args), null, ctx);
          }
        }
      }
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        return handleEmberComponent(managers, comp, args, args?.[$PROPS_SYMBOL] || null, ctx);
      }
    }

    if (comp && comp.__isCurriedComponent) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        let fw = args?.[$PROPS_SYMBOL] || null;
        let namedArgs: any;
        if (isTagPropsTuple(args)) {
          fw = args;
          namedArgs = namedArgsFromTagProps(args);
        } else {
          namedArgs = buildNamedArgs(args);
        }
        return handleEmberComponent(managers, comp, namedArgs, fw, ctx);
      }
    }

    // Also handle functions with __stringComponentName (from $_dc_ember markers)
    if (typeof comp === 'function' && comp.__stringComponentName) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        let fw = null;
        let namedArgs: any = {};
        if (isTagPropsTuple(args)) {
          fw = args;
          namedArgs = namedArgsFromTagProps(args);
        } else if (args) {
          // Own named args only: no `args.args` bag and no slots on this path.
          copyOwnNamedArgs(args, namedArgs, 'none');
        }
        return handleEmberComponent(managers, comp, namedArgs, fw, ctx);
      } else {
        // Component with __stringComponentName but canHandle returned false.
        // This means the component name could not be resolved. Throw an error
        // matching Ember's behavior for {{component "does-not-exist"}}.
        const compName = comp.__stringComponentName;
        const notFoundErr = new Error(
          `Attempted to resolve \`${compName}\`, which was expected to be a component, but nothing was found. ` +
            `Could not find component named "${compName}" (no component or template with that name was found)`
        );
        throw notFoundErr;
      }
    }

    // Handle direct component definitions (template-only, GlimmerishComponent)
    // that have GXT templates in COMPONENT_TEMPLATES. These come from strict mode
    // scope values (e.g., defComponent('<Foo/>', { scope: { Foo } })) where Foo
    // is a template-only component object or a class with setComponentTemplate.
    if (
      comp &&
      typeof comp === 'object' &&
      getGxtRenderer()?.registries.componentTemplates?.has(comp)
    ) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const fw = args?.[$PROPS_SYMBOL] || null;
        // Curried `(helper)` values in content-arg position resolve on read
        // (getters and thunk values) or once (plain values).
        return handleEmberComponent(managers, comp, buildNamedArgs(args, 'all'), fw, ctx);
      }
    }

    // Handle class-based component definitions with templates (e.g., GlimmerishComponent subclasses)
    if (
      comp &&
      typeof comp === 'function' &&
      getGxtRenderer()?.registries.componentTemplates?.has(comp)
    ) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const fw = args?.[$PROPS_SYMBOL] || null;
        // Getter args resolve curried `(helper)` values on read.
        return handleEmberComponent(managers, comp, buildNamedArgs(args, 'getters'), fw, ctx);
      }
    }

    // Handle getter functions that resolve to a CurriedComponent.
    // This occurs with {{#@inner}}content{{/@inner}} where @inner is a named arg
    // holding a curried component. The GXT compiler emits $_c(() => ctx.args.inner, args, ctx).
    if (
      typeof comp === 'function' &&
      !comp.prototype &&
      !comp.__isCurriedComponent &&
      !comp.__stringComponentName
    ) {
      let resolved = comp;
      let guard = 5;
      while (
        typeof resolved === 'function' &&
        !resolved.prototype &&
        !resolved.__isCurriedComponent &&
        guard-- > 0
      ) {
        try {
          resolved = resolved();
        } catch {
          break;
        }
      }
      if (resolved && resolved.__isCurriedComponent) {
        const managers = g.$_MANAGERS;
        if (managers?.component?.canHandle?.(resolved)) {
          const namedArgs = buildNamedArgs(args);
          return handleEmberComponent(
            managers,
            resolved,
            namedArgs,
            args?.[$PROPS_SYMBOL] || null,
            ctx
          );
        }
      }
    }

    // {{element "tag"}} helper bridge.
    //
    // When user scope rebinds `element` to the official `@ember/helper`
    // `element` helper (Ember's element-helper test does exactly that), a
    // template like `<Inner @tag={{element "p"}} />` compiles to a getter
    // that calls the helper and returns an `ElementComponentDefinition`
    // instance. The child template then does
    // `{{#let @tag as |Tag|}}<Tag>...</Tag>{{/let}}`, which arrives here as
    // `$_c_ember(definition, ...)` (or as `$_c_ember(getter, ...)` when the
    // let-binding resolved a getter shaped `() => @tag`).
    //
    // The definition is branded via `prototype.__isElementHelperDefinition`
    // (see packages/@ember/-internals/glimmer/lib/helpers/element.ts). The
    // Glimmer-VM path for this definition would build a wrapped class
    // component instance; since GXT does not run that VM, we render the
    // tag directly using `$_tag` with the invocation's splat-attrs (fw[1]).
    // Empty tagName means "render block without wrapper" (matches the
    // helper docblock: `When @tagName is "" the block content is rendered
    // without a wrapping element`).
    {
      let elDef = comp;
      // Unwrap zero-arg getter functions (no prototype) up to a few levels;
      // mirrors the curried-component getter-unwrap loop above.
      let guard = 5;
      while (
        typeof elDef === 'function' &&
        !(elDef as any).prototype &&
        !(elDef as any).__isCurriedComponent &&
        !(elDef as any).__stringComponentName &&
        !(elDef as any).__isElementHelperDefinition &&
        guard-- > 0
      ) {
        try {
          elDef = (elDef as any)();
        } catch {
          break;
        }
      }
      if (
        elDef &&
        typeof elDef === 'object' &&
        (elDef as any).__isElementHelperDefinition === true
      ) {
        const tagName = (elDef as any).tagName;
        const $SLOTS = $SLOTS_SYMBOL;
        const $PROPS = $PROPS_SYMBOL;
        const fw = args?.[$PROPS] || null;
        const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
        const defaultSlot =
          gxtSlots && typeof gxtSlots.default === 'function' ? gxtSlots.default : null;
        const childrenThunk = defaultSlot ? [() => (defaultSlot as any)(ctx)] : [];

        // Empty tag name: render the block without a wrapper (per Ember's
        // element-helper spec). Drop any splat attrs applied by the wrapping
        // let-block since there is no element to attach them to.
        if (!tagName) {
          return defaultSlot ? (defaultSlot as any)(ctx) : [];
        }

        const tagProps = fw && Array.isArray(fw) ? fw : g.$_edp;
        return g.$_tag(tagName, tagProps, ctx, childrenThunk);
      }
    }

    return originalC(comp, args, ctx);
  };
  g.$_c.__emberWrapped = true;
  // Protect from setupGlobalScope overwrite — GXT's setupGlobalScope iterates its
  // symbol table and writes each symbol to globalThis, which would replace our
  // $_c_ember wrapper with the raw GXT $_c function.
  const _protectedC = g.$_c;
  Object.defineProperty(g, '$_c', {
    get() {
      return _protectedC;
    },
    set() {
      /* ignore setupGlobalScope overwrites */
    },
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// $_tag fast-path eligibility predicate.
//
// Every element runs BOTH Ember $_tag_ember wrappers (this compile.ts one + the
// ember-gxt-wrappers one). For a plain lowercase-HTML element with no
// Ember-special features, every one of the wrapper's post-resolve scans is a
// no-op: the null-attr filter, the eager nullish-attr getter scan, the
// SafeString text-getter scan, the splat merge, the modifier/text reorder, and
// the position-0 post-apply re-scan all match nothing. This predicate proves
// (conservatively) that ALL of those scans would no-op, so the wrapper can
// delegate straight to GXT's native originalTag (which already applies
// props/attrs/events/splat itself). When ANY check fails, we fall through to the
// full slow path — so SafeString / null-strip / splat / namespace / reactive-attr
// semantics are fully preserved for everything else.
//
// `isPlainHtmlTagFastPath` (utils.ts) lists why each skipped scan is dead; this
// wrapper also requires that no SVG/MathML namespace is active (the namespace
// getter-wrapping and the namespace-gated attr scans would apply).
function _gxtTagFastPathEligible(tag: unknown, tagProps: any): boolean {
  return !_gxtNamespace && isPlainHtmlTagFastPath(tag, tagProps, g.$_edp);
}

// Override $_tag to check for Ember components before creating HTML elements
// GXT compiles PascalCase tags like <FooBar /> to $_tag('FooBar', ...) but
// these should be handled by the component manager for Ember integration
if (g.$_tag && !g.$_tag.__compileWrapped) {
  const originalTag = g.$_tag;

  // GXT's $_tag signature: $_tag(tag, tagProps, ctx, children)
  g.$_tag = function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    ctx: any,
    children: any[]
  ): any {
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    // Handle non-string tags that resolve to CurriedComponent or other Ember components
    // This happens with <fb.baz> where fb is a block param yielding a component hash
    if (resolvedTag && typeof resolvedTag !== 'string') {
      const managers = g.$_MANAGERS;
      if (resolvedTag.__isCurriedComponent || resolvedTag.__stringComponentName) {
        if (managers?.component?.canHandle?.(resolvedTag)) {
          // Build fw from tagProps (GXT format [props, attrs, events, parentFw?])
          const fwProps: [string, any][] = [];
          const fwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          const namedArgs: any = {};

          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) {
                const key = entry[0] === '' ? 'class' : entry[0];
                if (key === 'class') {
                  const val = entry[1];
                  fwProps.push([
                    entry[0],
                    typeof val === 'function'
                      ? () => {
                          const v = val();
                          return v == null || v === false ? '' : v;
                        }
                      : val,
                  ]);
                } else {
                  fwProps.push(entry);
                }
              }
            }
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (key.startsWith('@')) {
                  const argName = key.slice(1);
                  Object.defineProperty(namedArgs, argName, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                } else {
                  fwAttrs.push([key, value]);
                }
              }
            }
            if (Array.isArray(tagProps[2])) events = tagProps[2];
            // Merge parent fw
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) for (const e of parentFw[0]) fwProps.push(e);
              if (Array.isArray(parentFw[1])) for (const e of parentFw[1]) fwAttrs.push(e);
              if (Array.isArray(parentFw[2])) for (const e of parentFw[2]) events.push(e);
            }
          }

          const fw = [fwProps, fwAttrs, events];

          // Extract slots from children
          if (children && children.length > 0) {
            const defaultSlotFn = (slotCtx: any, ...params: any[]) => {
              return children.map((child: any) => (typeof child === 'function' ? child() : child));
            };
            _setInternalProp(namedArgs, '$slots', { default: defaultSlotFn });
          }

          const handleResult = managers.component.handle(resolvedTag, namedArgs, fw, ctx);
          if (typeof handleResult === 'function') return handleResult();
          return handleResult;
        }
      }
    }

    // Ensure ctx has a GXT component ID that points to a real node in GXT's TREE.
    // See the detailed explanation in the template.render() function below — we
    // assign the gxtRoot's id so addToTree's PARENT.set points at a parent that's
    // actually registered (the root). Without this, the $_if/$_each walker crashes
    // with "Cannot read properties of undefined (reading 'Symbol()')".
    if (
      ctx &&
      typeof ctx === 'object' &&
      COMPONENT_ID_PROPERTY &&
      // Don't re-stamp glimmer-next-native block wrappers ($_ucw / $_inElement).
      // They are already real, TREE-registered nodes with their own
      // COMPONENT_ID and CHILD bucket. Overwriting their id with the shared
      // gxt-root id collapses their CHILD bucket into the root's — so when the
      // wrapper is torn down (e.g. an {{#if}} branch toggling off via
      // destroyBranchSync → destroyElementSync), runDestructorsSync walks
      // CHILD.get(rootId) and cascades through the ENTIRE root subtree
      // (every sibling {{#each}} row, other {{#if}} blocks, etc.) instead of
      // just this wrapper's own children. That cascade is what wiped the whole
      // template on in-place array mutation (life-cycle-test `that thing about
      // destroying`). The wrapper sets `$BLOCK_WRAPPER_SYMBOL` on itself
      // (glimmer-next dom.ts) before its body renders, so this guard sees it.
      !(ctx as any)[$BLOCK_WRAPPER_SYMBOL]
    ) {
      const gxtRootCtx = _gxtRootContext;
      const rootId = gxtRootCtx && gxtRootCtx[COMPONENT_ID_PROPERTY as any];
      if (rootId !== undefined && rootId !== null) {
        try {
          ctx[COMPONENT_ID_PROPERTY as any] = rootId;
        } catch {
          /* frozen, ignore */
        }
      } else if (!ctx[COMPONENT_ID_PROPERTY as any]) {
        ctx[COMPONENT_ID_PROPERTY as any] = ++_contextId;
      }
    }

    // Fast-path: a plain-HTML element with no Ember-special features.
    // Runs AFTER the ctx component-id stamp above (load-bearing for the GXT
    // tree walker) but BEFORE every Ember-semantic scan. Delegates straight to
    // GXT's native originalTag, which already applies props/attrs/events itself.
    if (_gxtTagFastPathEligible(tag, tagProps)) {
      return originalTag(tag, tagProps, ctx, children);
    }

    // Handle dynamic component patterns: <@foo /> and <this.foo />
    // These are invalid HTML tag names that need special handling
    if (resolvedTag && typeof resolvedTag === 'string') {
      // Handle <@foo /> - component passed as argument
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1); // Remove '@'
        // Get the component from the context's args
        // GXT uses plain string 'args' ($args = 'args')
        const ctxArgs = ctx?.['args'] || ctx?.args || {};
        const componentValue = ctxArgs[argName];
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const dynArgName = key.slice(1);
                  Object.defineProperty(dynArgs, dynArgName, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // This enables {{yield}} in the component to render the block content
          // GXT puts text children in tagProps[2] (events position) when it doesn't
          // recognize the tag as a component (e.g., @inner). Extract from there too.
          const blockChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (blockChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  blockChildren.push(entry[1]);
                }
              }
            }
          }
          if (blockChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return blockChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            _setInternalProp(dynArgs, '$slots', { default: defaultSlotFn });
          }

          // Build fw (forwarding) structure — separate props (fw[0]) from attrs (fw[1])
          const dynFwProps: [string, any][] = [];
          const dynFwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            // Props (position 0) — class, id, etc.
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) {
                dynFwProps.push(entry);
              }
            }
            // Attrs (position 1) — data-*, title, etc.
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  dynFwAttrs.push([key, value]);
                }
              }
            }
            // Only use tagProps[2] as events if we didn't already use them as block children
            if (Array.isArray(tagProps[2]) && blockChildren.length === 0) {
              events = tagProps[2];
            }
            // Merge parent fw if present
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) {
                for (const entry of parentFw[0]) dynFwProps.push(entry);
              }
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) dynFwAttrs.push(entry);
              }
              if (Array.isArray(parentFw[2])) {
                for (const entry of parentFw[2]) events.push(entry);
              }
            }
          }
          const fw = [dynFwProps, dynFwAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component @${argName} not found`);
      }

      // Handle <this.foo /> - component from context property
      if (resolvedTag.startsWith('this.')) {
        const propPath = resolvedTag.slice(5); // Remove 'this.'
        // Get the component from the context
        let componentValue = ctx;
        for (const part of propPath.split('.')) {
          componentValue = componentValue?.[part];
        }
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const argName = key.slice(1);
                  Object.defineProperty(dynArgs, argName, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // GXT puts text children in tagProps[2] for unrecognized tags
          const thisDynChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (thisDynChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  thisDynChildren.push(entry[1]);
                }
              }
            }
          }
          if (thisDynChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return thisDynChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            _setInternalProp(dynArgs, '$slots', { default: defaultSlotFn });
          }

          // Build fw (forwarding) structure — separate props (fw[0]) from attrs (fw[1])
          const thisFwProps: [string, any][] = [];
          const thisFwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) thisFwProps.push(entry);
            }
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  thisFwAttrs.push([key, value]);
                }
              }
            }
            if (Array.isArray(tagProps[2]) && thisDynChildren.length === 0) {
              events = tagProps[2];
            }
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) {
                for (const entry of parentFw[0]) thisFwProps.push(entry);
              }
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) thisFwAttrs.push(entry);
              }
              if (Array.isArray(parentFw[2])) {
                for (const entry of parentFw[2]) events.push(entry);
              }
            }
          }
          const fw = [thisFwProps, thisFwAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component this.${propPath} not found`);
      }
    }

    // Handle named blocks like <:header> and <:default>
    // These are not real elements - they're markers for named slots
    // Return a special object that can be detected when building slots
    if (resolvedTag && typeof resolvedTag === 'string' && resolvedTag.startsWith(':')) {
      const slotName = resolvedTag.slice(1); // Remove the leading ':'

      // Check for block params - they're in the forwarded props (fw) or tagProps
      // When there's "as |param|", GXT passes block params info in tagProps
      let hasBlockParams = false;
      if (tagProps && tagProps !== g.$_edp) {
        // Check if attrs (index 1) contains block params marker
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, value] of attrs) {
            if (key === '@__hasBlockParams__') {
              hasBlockParams = true;
              break;
            }
          }
        }
        // Also check fw (forwarded) for block params info
        const fw = tagProps[3];
        if (fw && fw.__hasBlockParams) {
          hasBlockParams = true;
        }
      }

      const namedBlock = {
        __isNamedBlock: true,
        __slotName: slotName,
        __children: children,
        __hasBlockParams: hasBlockParams,
      };
      return namedBlock;
    }

    // Special handling for EmberHtmlRaw component (triple mustaches)
    // This component outputs raw HTML without escaping.
    // Returns a live DOM fragment with a reactive effect that updates innerHTML.
    // We return DOM nodes directly (not a __htmlRaw function) so that GXT's
    // $_if and other block helpers handle them correctly.
    if (resolvedTag === 'EmberHtmlRaw') {
      let valueGetter: any;
      if (tagProps && tagProps !== g.$_edp) {
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, val] of attrs) {
            if (key === '@value') {
              valueGetter = val;
              break;
            }
          }
        }
      }

      // Probe the caller's rendering context for the enclosing parent
      // element. When `{{{x}}}` sits directly inside a table-family tag
      // (e.g. `<table>{{{this.title}}}</table>`), the browser's contextual
      // HTML parser rules affect which child elements survive the parse;
      // passing the real parent down lets us match classic Glimmer-VM's
      // rehydration serialization. `ctx` is GXT's caller rendering context
      // and may expose the active element via the RENDERING_CONTEXT_PROPERTY
      // symbol.
      let callerParent: Element | null = null;
      try {
        if (RENDERING_CONTEXT_PROPERTY && ctx && typeof ctx === 'object') {
          const rc = (ctx as any)[RENDERING_CONTEXT_PROPERTY as any];
          if (rc && rc.element && rc.element.nodeType === 1) {
            callerParent = rc.element as Element;
          }
        }
      } catch {
        /* ignore */
      }

      const getHtml = () => {
        let raw = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
        // Unwrap cell-like wrappers and nested getter functions
        while (typeof raw === 'function') {
          raw = raw();
        }
        if (
          raw &&
          typeof raw === 'object' &&
          typeof (raw as any).value !== 'undefined' &&
          (raw as any).__isCell
        ) {
          raw = (raw as any).value;
        }
        if (raw === null || raw === undefined) return '';
        const toHTML = (raw as any)?.toHTML;
        if (typeof toHTML === 'function') return toHTML.call(raw);
        // Objects with no toString (e.g. Object.create(null)) would throw
        // "Cannot convert object to primitive value" — normalize to ''.
        if (typeof raw === 'object' && typeof (raw as any).toString !== 'function') return '';
        try {
          return String(raw);
        } catch {
          return '';
        }
      };

      // Create start/end anchors and initial content.
      // Start anchor uses an empty comment so test helpers treat it as a
      // marker (see internal-test-helpers isMarker). A non-empty text like
      // 'htmlRaw' would make `firstChild` non-null even when content is
      // empty, breaking assertIsEmpty() for trusted null/undefined values.
      const startAnchor = document.createComment('');
      const endAnchor = document.createComment('/htmlRaw');
      const fragment = document.createDocumentFragment();
      let contentNodes: Node[] = [];
      let lastHtml = '';

      // Helper: parse rawHtml in the context of the given parent element.
      // This mimics the browser's contextual parsing so that `<tr>` inside
      // a `<table>` gets wrapped in `<tbody>`, a `<td>` outside of `<tr>`
      // gets stripped (when parent is a `<div>`), etc. — matching what
      // classic Glimmer-VM's rehydration produces. We use a scratch
      // element of the same tagName as the parent, so its contextual
      // HTML parser rules apply when we assign innerHTML.
      const parseInParentContext = (rawHtml: string, parent: Element | null): Node[] => {
        if (!rawHtml) return [];
        // Fall back to a plain `<div>` when no parent is available yet
        // (the template hasn't been mounted). This preserves the prior
        // behavior for most sites; only `<table>` / `<tr>` / `<select>`
        // contexts care about contextual parsing.
        const contextTag = parent && parent.tagName ? parent.tagName.toLowerCase() : 'div';
        // Only use a scratch parent for tags whose parse context affects
        // what child elements survive. For generic containers, a plain
        // div scratch works.
        const needsContext = _GXT_CONTEXTUAL_PARSE_TAGS.has(contextTag);
        const scratch = document.createElement(needsContext ? contextTag : 'div');
        try {
          scratch.innerHTML = rawHtml;
        } catch {
          return [];
        }
        const result: Node[] = [];
        while (scratch.firstChild) {
          result.push(scratch.firstChild);
          scratch.removeChild(scratch.firstChild);
        }
        return result;
      };

      const initialHtml = getHtml();
      fragment.appendChild(startAnchor);
      // Use the caller's rendering-context element as the contextual parse
      // parent when available (e.g. `<table>` for
      // `<table>{{{this.title}}}</table>`). Falls back to a div-context
      // parse when we can't determine the parent.
      const initialChildren = parseInParentContext(initialHtml, callerParent);
      for (const child of initialChildren) {
        contentNodes.push(child);
        fragment.appendChild(child);
      }
      fragment.appendChild(endAnchor);

      lastHtml = initialHtml;
      let reparsedForParent: Element | null = null;

      // Tag the anchors with the raw HTML source so an outer-tag post-
      // process step can reparse the content in its real parent context
      // (critical for `<table>{{{tr}}}</table>` and similar).
      (startAnchor as any).__gxtHtmlRawStart = true;
      (startAnchor as any).__gxtHtmlRawReparse = (parent: Element) => {
        // Remove current content between anchors
        for (const n of contentNodes) {
          if (n.parentNode === parent) parent.removeChild(n);
        }
        contentNodes.length = 0;
        if (lastHtml) {
          for (const child of parseInParentContext(lastHtml, parent)) {
            contentNodes.push(child);
            parent.insertBefore(child, endAnchor);
          }
        }
      };

      // Reparse contextually once the fragment lands in the DOM. If the
      // parent is a table-family element (like `<table>` for our
      // `<table>{{{this.title}}}</table>` test), the initial div-context
      // parse may have stripped `<tr>`/`<td>` nodes; re-parse in the
      // real parent tag to restore the proper structure (with `<tbody>`
      // injected by the browser as needed).
      const reparseIfNeeded = () => {
        const parent = endAnchor.parentNode as Element | null;
        if (!parent || parent === reparsedForParent) return;
        const contextTag = (parent.tagName || '').toLowerCase();
        const needsReparse = _GXT_CONTEXTUAL_PARSE_TAGS.has(contextTag);
        if (!needsReparse) return;
        // Remove current content nodes, re-parse contextually, re-insert.
        for (const n of contentNodes) {
          if (n.parentNode === parent) parent.removeChild(n);
        }
        contentNodes = [];
        if (lastHtml) {
          for (const child of parseInParentContext(lastHtml, parent)) {
            contentNodes.push(child);
            parent.insertBefore(child, endAnchor);
          }
        }
        reparsedForParent = parent;
      };

      // Set up reactive update: register a `gxtEffect` that subscribes to the
      // cells `getHtml()` reads so `{{{...}}}` content stays live as those cells
      // change.
      const _htmlRawUpdate = () => {
        const html = getHtml();
        const parent = endAnchor.parentNode as Element | null;
        if (!parent) return;
        // Every effect run: ensure we've reparsed for the current parent
        // context (no-op when already done or not a table-family context).
        reparseIfNeeded();
        if (html === lastHtml) return;
        lastHtml = html;

        // Remove old content nodes
        for (const n of contentNodes) {
          if (n.parentNode === parent) parent.removeChild(n);
        }
        contentNodes = [];

        if (html) {
          for (const child of parseInParentContext(html, parent)) {
            contentNodes.push(child);
            parent.insertBefore(child, endAnchor);
          }
        }
      };
      {
        // Before registering the subscribed effect, run a capture frame over
        // `getHtml()` so we can (a) register any LEAF object the value resolves
        // to as a value-owner of its source cell — so
        // `set(nullObject,'message',...)` dirties the cell `getHtml` reads
        // (mirrors the content-position null-object fix at the text effect),
        // and (b) materialize a leaf cell when the bound path resolves off an
        // ABSENT property (initial-undefined `{{{this.name}}}` reads no cell, so
        // the effect would subscribe to nothing).
        try {
          _gxtCaptureLeafOwnersForGetter(valueGetter);
        } catch {
          /* best-effort */
        }
        // Register the subscribed effect.
        try {
          gxtEffect(_htmlRawUpdate);
        } catch {
          /* effect setup may fail during shutdown */
        }
        // Register a teardown destructor that removes the LIVE content nodes +
        // anchors. Without it, the HtmlRaw content this
        // effect inserted between the anchors is NOT in any RENDERED_NODES
        // snapshot (the effect mutates the DOM out-of-band after render) — so it
        // is left orphaned. Two distinct teardown triggers are needed:
        //
        //   (1) The enclosing GXT context (e.g. an outer {{#if}} whose true
        //       branch holds `{{{this.inner}}}`): when it collapses, the cascade
        //       tears down the branch wrapper's tracked children. Register on
        //       `_gxtGetParentContext()`.
        //
        //   (2) The fragment AS A KEYED EACH-ROW (GH#16314): a primitive
        //       `{{#each list as |v|}}{{{v}}}{{/each}}` returns THIS fragment as
        //       the row. On a keyed-reconcile splice (`replace(idx,del,ins)`),
        //       syncList destroys the old row by calling `destroyElementSync(row
        //       = fragment)`. A bare DocumentFragment carries no
        //       RENDERED_NODES_PROPERTY, so destroy was a no-op (the moved-out
        //       anchors + live content stayed → stale + duplicated rows). Attach
        //       RENDERED_NODES_PROPERTY = [startAnchor, endAnchor] to the fragment
        //       and register the teardown ON the fragment so the row destroy runs
        //       it (reclaims dynamic content) and reaps the anchors.
        //
        // The teardown nulls `contentNodes` + guards on `parentNode`, so running
        // it from both triggers is idempotent.
        const _htmlRawTeardown = () => {
          const p = endAnchor.parentNode as Element | null;
          if (p) {
            for (const n of contentNodes) {
              if (n.parentNode === p) p.removeChild(n);
            }
          }
          contentNodes = [];
          try {
            if ((startAnchor as Node).parentNode)
              (startAnchor as Node).parentNode!.removeChild(startAnchor);
            if ((endAnchor as Node).parentNode)
              (endAnchor as Node).parentNode!.removeChild(endAnchor);
          } catch {
            /* already detached — ignore */
          }
        };
        // (2) Make the fragment a destroyable unit so a keyed each-row destroy
        // reclaims this html-raw's live nodes. `destroyElementSync` checks
        // RENDERED_NODES_PROPERTY first; rendering is unaffected because GXT's
        // `api.isNode(fragment)` short-circuits before the RENDERED_NODES path.
        try {
          if (RENDERED_NODES_PROPERTY) {
            (fragment as any)[RENDERED_NODES_PROPERTY] = [startAnchor, endAnchor];
          }
          _gxtRegisterDestructor(fragment as unknown as object, _htmlRawTeardown);
        } catch {
          /* registration unavailable — owner-context teardown still applies */
        }
        // (1) Enclosing-context teardown (outer {{#if}} collapse, etc.).
        try {
          const owner = _gxtGetParentContext();
          if (owner && owner !== (fragment as unknown as object)) {
            _gxtRegisterDestructor(owner, _htmlRawTeardown);
          }
        } catch {
          /* parent-context unavailable — effect still cleans on next run */
        }
      }

      return fragment;
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent =
      resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    // Access managers dynamically - they may be set up after this module loads
    const managers = g.$_MANAGERS;

    // Engine support: ctx.owner may be the engine instance while the ambient owner is the app.
    // Swap only during component-related resolution (mightBeComponent section).
    let _eoSwap = false;
    let _eoPrev: any;
    if (mightBeComponent) {
      const _eoCtx = ctx?.owner;
      _eoSwap = !!(
        _eoCtx &&
        typeof _eoCtx === 'object' &&
        typeof _eoCtx.factoryFor === 'function' &&
        !_eoCtx.isDestroyed &&
        !_eoCtx.isDestroying &&
        _eoCtx !== getAmbientOwner()
      );
      if (_eoSwap) {
        _eoPrev = getAmbientOwner();
        setAmbientOwner(_eoCtx);
      }
    }

    try {
      // Engine owner swap try block

      if (mightBeComponent && managers?.component?.canHandle) {
        // Convert PascalCase to kebab-case for Ember component lookup
        // Also convert -- (namespace separator from ::) to /
        let kebabName = doubleDashToSlash(pascalToKebab(resolvedTag));

        // Strip the curly-c- prefix added by the Vite plugin's transformCurlyComponents.
        // The plugin converts {{foo-bar}} to <curly-c-foo-bar /> so GXT compiles it as
        // a tag (not a variable), but the actual component/helper name is just "foo-bar".
        if (kebabName.startsWith('curly-c-')) {
          kebabName = kebabName.slice(8); // 8 = 'curly-c-'.length
        }

        // Check for HELPER first — inline curlies like {{to-js "foo"}} get transformed
        // to <ToJs @__pos0__="foo" /> by transformCurlyBlockComponents. These should be
        // handled as helpers, not components.
        // A destroyed owner cannot resolve anything (its container throws on
        // factoryFor/lookup) — treat it as absent, like manager.ts canHandle does.
        // The ambient owner can linger from a torn-down app when ownerless renders
        // (e.g. the rehydration test delegate) encounter hyphenated tags.
        const _ambient = getAmbientOwner();
        const owner = _ambient && !_ambient.isDestroyed && !_ambient.isDestroying ? _ambient : null;
        if (owner) {
          const helperFactory = owner.factoryFor?.(`helper:${kebabName}`);
          const helperLookup = !helperFactory ? owner.lookup?.(`helper:${kebabName}`) : null;

          // Check if the user is trying to override a built-in helper.
          // Built-in helpers (array, hash, concat, fn, etc.) cannot be overridden.
          if (helperFactory || helperLookup) {
            const BUILTIN_HELPERS = BUILTIN_HELPER_NAMES;
            if (BUILTIN_HELPERS.includes(kebabName)) {
              emberAssert(
                `You attempted to overwrite the built-in helper "${kebabName}" which is not allowed. Please rename the helper.`,
                false
              );
            }
          }

          // If the helper was invoked as a block (has children or __hasBlock__ marker),
          // it's not a valid usage. Helpers cannot be used with blocks — only components can.
          // {{#some-helper}}{{/some-helper}} → <SomeHelper @__hasBlock__="default"></SomeHelper>
          if (helperFactory || helperLookup) {
            const hasChildren = children && children.length > 0;
            // Check for __hasBlock__ marker in attrs (from empty curly block invocation)
            let hasBlockMarker = false;
            if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[1])) {
              for (const [key] of tagProps[1]) {
                if (key === '@__hasBlock__') {
                  hasBlockMarker = true;
                  break;
                }
              }
            }
            if (hasChildren || hasBlockMarker) {
              const err = new Error(
                `Attempted to resolve \`${kebabName}\`, which was expected to be a component, but nothing was found.`
              );
              const capture = getGxtRenderer()?.compilePipeline.captureRenderError;
              if (typeof capture === 'function') {
                capture(err);
                return document.createComment('helper-as-block-error');
              }
              throw err;
            }
          }
          if (helperFactory || helperLookup) {
            // Collect raw attr getters (keep them lazy for reactivity)
            const rawAttrs: Array<[string, any]> = [];
            if (tagProps && tagProps !== g.$_edp) {
              const attrs = tagProps[1];
              if (Array.isArray(attrs)) {
                rawAttrs.push(...attrs);
              }
            }

            // Create or reuse a persistent class-based helper instance.
            // The cache prevents re-creation when `_gxtForceEmberRerender` does
            // a full innerHTML='' + rebuild, which would otherwise create a new
            // instance and inflate createCount / computeCount.
            let helperInstance: any = null;
            let recomputeTag: any = null;

            if (helperFactory) {
              const factoryClass = helperFactory.class;
              const isClassBased =
                factoryClass &&
                factoryClass.prototype &&
                typeof factoryClass.prototype.compute === 'function';
              if (isClassBased) {
                const cached = _tagHelperInstanceCache.get(kebabName);
                if (
                  cached &&
                  cached.instance &&
                  !cached.instance.isDestroyed &&
                  !cached.instance.isDestroying
                ) {
                  helperInstance = cached.instance;
                  recomputeTag = cached.recomputeTag;
                } else {
                  try {
                    helperInstance = helperFactory.create();
                    recomputeTag = helperInstance[RECOMPUTE_TAG] ?? null;
                    _tagHelperInstanceCache.set(kebabName, {
                      instance: helperInstance,
                      recomputeTag,
                    });
                    // Register for destruction via the module-local helper,
                    // which fires the registered push-hook (manager.ts's
                    // `_installHelperRecomputeBridge`) before pushing.
                    _gxtPushHelperInstance(helperInstance);
                    // Associate with the enclosing `{{#if}}` branch (if any) so
                    // destroy+willDestroy fire on branch teardown, matching the
                    // classic Ember Helper lifecycle (see class-based helper
                    // lifecycle test).
                    const ifScopeTag = _gxtCurrentHelperScope;
                    if (ifScopeTag && typeof ifScopeTag.add === 'function') {
                      try {
                        ifScopeTag.add(helperInstance);
                      } catch {
                        /* ignore */
                      }
                    }
                  } catch (e) {
                    if (_isAssertionLike(e)) throw e;
                    helperInstance = null;
                  }
                }
              }
            }

            // Build a getter that resolves args lazily and invokes the helper.
            const helperGetter = () => {
              const positional: any[] = [];
              const named: Record<string, any> = {};
              for (const [key, value] of rawAttrs) {
                const resolved = typeof value === 'function' ? value() : value;
                if (key.startsWith('@__pos') && key.endsWith('__') && key !== '@__posCount__') {
                  const idx = parseInt(key.slice(6, -2));
                  positional[idx] = resolved;
                } else if (key.startsWith('@') && !key.startsWith('@__')) {
                  named[key.slice(1)] = resolved;
                }
              }

              // Freeze positional/named to prevent mutation (Ember semantics)
              Object.freeze(positional);
              Object.freeze(named);

              if (helperInstance && typeof helperInstance.compute === 'function') {
                // Deduplicate: if args haven't changed, return cached result.
                // The force-rerender (innerHTML='' + rebuild) creates a NEW gxtEffect closure
                // that fires immediately with the same args, causing double-computation.
                // We store the cache on the helperInstance itself (which is shared via
                // _tagHelperInstanceCache) so it survives across closure re-creation.
                // Only dedup during force-rerender — during normal reactive updates,
                // always call compute() so helpers pick up tracked property changes.
                let argsSerialized: string | null = null;
                // Include recompute tag value in dedup key so recompute() invalidates cache
                const recomputeVal =
                  recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag
                    ? recomputeTag.value
                    : 0;
                try {
                  argsSerialized = JSON.stringify({ p: positional, n: named, r: recomputeVal });
                } catch {
                  /* skip dedup */
                }
                if (
                  argsSerialized !== null &&
                  argsSerialized === helperInstance.__gxtLastArgsSerialized
                ) {
                  // recomputeTag.value already consumed above for the dedup key
                  return helperInstance.__gxtLastResult;
                }
                const result = helperInstance.compute(positional, named);
                helperInstance.__gxtLastArgsSerialized = argsSerialized;
                helperInstance.__gxtLastResult = result;
                // Consume RECOMPUTE_TAG cell for reactivity
                if (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                  recomputeTag.value;
                }
                return result;
              }

              // Simple helper: delegate to $_maybeHelper
              const maybeHelper = g.$_maybeHelper;
              if (typeof maybeHelper === 'function') {
                return maybeHelper(kebabName, positional, named, ctx);
              }
              return undefined;
            };

            // Create a reactive text node. The gxtEffect tracks cell reads
            // inside helperGetter and updates the text node when deps change.
            // We must avoid double-calling compute: the effect fires immediately
            // on creation (first evaluation), so we let it set the initial value.
            const textNode = document.createTextNode('');
            try {
              const disposeEffect = gxtEffect(() => {
                const v = helperGetter();
                textNode.textContent = v == null ? '' : String(v);
              });
              // The effect is created without an owner (gxtEffect's second
              // argument), so nothing ever disposes it — it merely goes
              // quiescent when its deps stop changing. Inside an {{#if}}
              // branch that is a live bug: after the branch collapses (the
              // helper instance destroyed, caches evicted), any later dep
              // bump — including the destroy cascade itself — re-fires the
              // stale effect, which re-creates the helper (extra init/compute
              // in the class-based lifecycle test, eager evaluation in the
              // "evaluation should be lazy" trio). Register the disposer with
              // the enclosing branch scope so destroyScope tears the effect
              // down with the branch.
              const ifScopeTag = _gxtCurrentHelperScope;
              if (
                ifScopeTag &&
                typeof ifScopeTag.add === 'function' &&
                typeof disposeEffect === 'function'
              ) {
                try {
                  ifScopeTag.add({
                    destroy: disposeEffect,
                    isDestroyed: false,
                    isDestroying: false,
                  });
                } catch {
                  /* ignore */
                }
              }
            } catch (e) {
              if (_isAssertionLike(e)) throw e; /* effect setup may fail */
            }
            return textNode;
          }
        }

        // Check if the component manager can handle this
        // Also try with a leading dash — GXT's PascalCase conversion strips
        // leading dashes from component names like `-inner-component`
        if (
          !managers.component.canHandle(kebabName) &&
          managers.component.canHandle(`-${kebabName}`)
        ) {
          kebabName = `-${kebabName}`;
        }
        if (managers.component.canHandle(kebabName)) {
          // Build args from tagProps - convert Props format to args object
          // IMPORTANT: Keep args LAZY - don't evaluate functions yet!
          // Block params from parent slots won't be available until slot.default runs
          let args: any = {};
          // GXT FwType is [TagProp[], TagAttr[], TagEvent[]]
          // fwProps = position 0: HTML properties (class as ["", value], id, etc.)
          // fwAttrs = position 1: DOM attributes (data-*, title, etc.)
          const fwProps: [string, any][] = []; // Props to forward via ...attributes (fw[0])
          const fwAttrs: [string, any][] = []; // Attrs to forward via ...attributes (fw[1])

          if (tagProps && tagProps !== g.$_edp) {
            // tagProps is [props[], attrs[], events[], fw?]
            // - props[0]: HTML properties including class (key "" = class, key "id" = id, etc.)
            // - attrs[1]: Attributes with @ prefix for named args, or data-* attributes
            // - events[2]: Event handlers
            // - fw[3]: Forwarded props from parent (for nested components)

            // Process props (index 0) - includes class and other HTML properties
            const props = tagProps[0];
            if (Array.isArray(props)) {
              for (const [key, value] of props) {
                // Empty key means class attribute in GXT's format
                const attrKey = key === '' ? 'class' : key;
                // Collect for forwarding via ...attributes — keep in GXT's prop format
                // Class uses empty key "" in GXT's prop format
                // For class values, wrap to return "" instead of undefined/null/false
                // because GXT joins class values with " " and undefined becomes "undefined"
                if (key === '' || attrKey === 'class') {
                  const wrappedValue =
                    typeof value === 'function'
                      ? () => {
                          const v = value();
                          return v == null || v === false ? '' : v;
                        }
                      : value == null || value === false
                        ? ''
                        : value;
                  fwProps.push([key, wrappedValue]);
                } else {
                  fwProps.push([key, value]);
                }
                // Also add class/classNames to args so wrapper building and sync can access them
                if (attrKey === 'class' || attrKey === 'classNames') {
                  Object.defineProperty(args, attrKey, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                }
                // HTML id prop (not @id named arg) - use special key to distinguish
                // from @id which maps to elementId (frozen after first render)
                if (attrKey === 'id') {
                  Object.defineProperty(args, '__htmlId', {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }

            // Process attrs (index 1) - includes @ args and data-* attributes
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  // Named arg - keep as lazy getter
                  // The value might be a function that references block params
                  // which won't be available until we're inside a slot context
                  const argName = key.slice(1);
                  Object.defineProperty(args, argName, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                } else {
                  // HTML attribute (like data-test, title) - collect for forwarding as attrs (fw[1])
                  fwAttrs.push([key, value]);
                  // Also keep in args for direct access as lazy getter
                  Object.defineProperty(args, key, {
                    get: () => (typeof value === 'function' ? value() : value),
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }

            // Merge parent fw (tagProps[3]) if present — this handles ...attributes forwarding
            // through component chains (e.g., <XOuter data-foo> where XOuter template has
            // <XInner ...attributes> — the data-foo must reach XInner's ...attributes)
            //
            // Check for __splatLocal__ marker — attrs that come AFTER ...attributes
            // in source should override fw (local-first). Without marker, fw wins (parent first).
            const splatLocalNames = new Set<string>();
            // Check both fwProps and fwAttrs for __splatLocal__ marker
            for (const arr of [fwProps, fwAttrs]) {
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i][0] === '__splatLocal__') {
                  const names =
                    typeof arr[i][1] === 'string'
                      ? arr[i][1]
                      : typeof arr[i][1] === 'function'
                        ? arr[i][1]()
                        : '';
                  for (const n of names.split(',')) if (n) splatLocalNames.add(n);
                  arr.splice(i, 1);
                }
              }
            }

            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (splatLocalNames.size > 0) {
                // ...attributes came BEFORE local attrs: local overrides fw
                // Put local first (already in fwProps/fwAttrs), then parent fw
                // But filter out parent entries that conflict with splatLocal names
                const classAfterSplat = splatLocalNames.has('__class__');
                splatLocalNames.delete('__class__');

                if (classAfterSplat) {
                  // Class was AFTER ...attributes: fw classes first, local class second
                  // Reorder: move local class entries to end, put parent class entries before them
                  const localClassEntries = fwProps.filter((e) => e[0] === '' || e[0] === 'class');
                  const localNonClassEntries = fwProps.filter(
                    (e) => e[0] !== '' && e[0] !== 'class'
                  );
                  fwProps.length = 0;
                  for (const entry of localNonClassEntries) fwProps.push(entry);
                  // Parent props: non-class are filtered by splatLocalNames, class goes before local class
                  if (Array.isArray(parentFw[0])) {
                    for (const entry of parentFw[0]) {
                      const k = entry[0] === '' ? 'class' : entry[0];
                      if (k === 'class')
                        fwProps.push(entry); // parent class first
                      else if (!splatLocalNames.has(k)) fwProps.push(entry);
                    }
                  }
                  for (const entry of localClassEntries) fwProps.push(entry); // local class after
                } else {
                  // No class after splat: local entries already in fwProps, add parent non-conflicting
                  if (Array.isArray(parentFw[0])) {
                    for (const entry of parentFw[0]) {
                      const k = entry[0] === '' ? 'class' : entry[0];
                      if (!splatLocalNames.has(k)) fwProps.push(entry);
                    }
                  }
                }
                if (Array.isArray(parentFw[1])) {
                  for (const entry of parentFw[1]) {
                    if (!splatLocalNames.has(entry[0])) fwAttrs.push(entry);
                  }
                }
              } else {
                // ...attributes came AFTER local attrs (or no positional info):
                // Parent fw should override local — put parent entries FIRST
                // EXCEPT for class (key === ''), where order is: local first, then parent
                // (class is additive and Ember preserves definition→invocation order)
                const localProps = [...fwProps];
                const localAttrs = [...fwAttrs];
                fwProps.length = 0;
                fwAttrs.length = 0;
                // Separate class entries from non-class entries
                const localClassProps = localProps.filter((e) => e[0] === '' || e[0] === 'class');
                const localNonClassProps = localProps.filter(
                  (e) => e[0] !== '' && e[0] !== 'class'
                );
                const parentClassProps: any[] = [];
                const parentNonClassProps: any[] = [];
                if (Array.isArray(parentFw[0])) {
                  for (const entry of parentFw[0]) {
                    if (entry[0] === '' || entry[0] === 'class') parentClassProps.push(entry);
                    else parentNonClassProps.push(entry);
                  }
                }
                // Non-class: parent first (parent wins in GXT Set dedup)
                for (const entry of parentNonClassProps) fwProps.push(entry);
                for (const entry of localNonClassProps) fwProps.push(entry);
                // Class: local first, then parent (definition→invocation order)
                for (const entry of localClassProps) fwProps.push(entry);
                for (const entry of parentClassProps) fwProps.push(entry);
                // Attrs: parent first for non-class attrs
                if (Array.isArray(parentFw[1])) {
                  for (const entry of parentFw[1]) fwAttrs.push(entry);
                }
                for (const entry of localAttrs) fwAttrs.push(entry);
              }
              // Events from parent are always merged
              if (Array.isArray(parentFw[2])) {
                // Events will be merged below in the events section
              }
            }
          }

          // Build fw (forwarding) structure for the component manager
          // fw[0] = props (class, id — for GXT's prop application on ...attributes elements)
          // fw[1] = attrs (data-*, title — for GXT's attr application on ...attributes elements)
          // fw[2] = events/modifiers (to forward to elements with ...attributes)
          const slots: Record<string, any> = {};

          // Collect events/modifiers from tagProps[2] for forwarding
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
            events = [...tagProps[2]];
            // Also merge parent events if present
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw) && Array.isArray(parentFw[2])) {
              for (const entry of parentFw[2]) {
                events.push(entry);
              }
            }
          } else {
            // Even without own events, merge parent events if present
            const parentFw = tagProps?.[3];
            if (parentFw && Array.isArray(parentFw) && Array.isArray(parentFw[2])) {
              events = [...parentFw[2]];
            }
          }
          // GXT puts text children in tagProps[2] (events position) for lowercase
          // elements. Extract text entries (numeric keys like "0", "1") as children
          // and keep only real event entries (named keys like "click").
          let effectiveChildren = children;
          if (
            (!children || children.length === 0) &&
            tagProps &&
            tagProps !== g.$_edp &&
            Array.isArray(tagProps[2])
          ) {
            const textChildren: any[] = [];
            const realEvents: [string, any][] = [];
            for (const entry of tagProps[2]) {
              if (Array.isArray(entry) && entry.length === 2) {
                const key = entry[0];
                // Numeric keys are text children EXCEPT key "0" which is
                // ON_CREATED (modifier events). Key "1" = TEXT_CONTENT.
                // Modifier functions (key "0") take an element parameter and should
                // be forwarded as events, not treated as text content.
                if (typeof key === 'string' && isAllDigits(key) && key !== '0') {
                  textChildren.push(entry[1]);
                } else {
                  realEvents.push(entry);
                }
              } else {
                // Non-array entries in position 2 could be children (functions)
                textChildren.push(entry);
              }
            }
            if (textChildren.length > 0) {
              effectiveChildren = textChildren;
              // Replace events with only real events (not text children)
              events = realEvents;
            }
          }

          if (effectiveChildren && effectiveChildren.length > 0) {
            // Separate named blocks from default slot children
            // Named blocks are marked with __isNamedBlock from :name element handling
            const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> =
              new Map();
            const defaultChildren: any[] = [];

            for (let _ci = 0; _ci < effectiveChildren.length; _ci++) {
              let child = effectiveChildren[_ci];
              // GXT compiles named block children as lazy functions producing
              // a __isNamedBlock marker, and marks those factories itself
              // (`$_nbt` sets `fn.$_namedBlock = name`). Read the marker, not
              // the function source (which minification changes). Evaluate
              // ONLY marked factories to avoid side effects from eagerly
              // evaluating plain component children.
              if (
                typeof child === 'function' &&
                !child.__isCurriedComponent &&
                !(child instanceof Node) &&
                _gxtGetNamedBlockName(child) !== null
              ) {
                try {
                  const evaluated = child();
                  if (evaluated && typeof evaluated === 'object' && evaluated.__isNamedBlock) {
                    child = evaluated;
                  }
                } catch {
                  /* not a named block factory — keep as-is */
                }
              }
              // Check if it's a named block marker
              if (child && typeof child === 'object' && child.__isNamedBlock) {
                const slotName = child.__slotName;
                if (!namedBlocks.has(slotName)) {
                  namedBlocks.set(slotName, { children: [], hasBlockParams: false });
                }
                const slot = namedBlocks.get(slotName)!;
                // Add the named block's children to its slot
                if (child.__children) {
                  slot.children.push(...child.__children);
                }
                // Copy the hasBlockParams flag from the named block marker
                if (child.__hasBlockParams) {
                  slot.hasBlockParams = true;
                }
              } else {
                // Regular child goes to default slot
                defaultChildren.push(child);
              }
            }

            // Helper to create a slot function. A block declares params only
            // through the `@__hasBlockParams__` marker (added by the block-params
            // AST transform for every `as |…|` element binder) or a named
            // block's `__hasBlockParams`; a slot without either has none.
            const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
              const hasBlockParams = explicitHasBlockParams ?? false;

              const slotFn = (slotCtx: any, ...params: any[]) => {
                // KEEP the live GXT formula for a reactive block param instead of
                // eagerly snapshotting it with `param.fn()`. Eager unwrap reduces
                // `{{yield this.full ...}}` (a getter over @tracked props) to a
                // static string at slot-invocation time, so the consumer's
                // `$_bp0` read returns the snapshot, the text effect captures NO
                // cell, and a later change never re-fires (yield-test `yielded
                // getters update correctly`, AngleBracket `yield positionally`).
                // Passing the raw formula lets `$_bp${i}` → `unwrapReactiveValue`
                // re-evaluate it inside the consumer's tracker frame each read,
                // subscribing to the underlying cells.
                const unwrappedParams = params.map((param) => {
                  // Unwrap GXT reactive formulas (objects with fn/isConst)
                  if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                    // Keep CONSTANT formulas snapshotted (no cell
                    // to subscribe to) but keep REACTIVE formulas live so the
                    // consumer re-reads them. `param.isConst` is already computed
                    // by glimmer-next's createSlot (it reads `.value` before
                    // deciding to keep the formula), so a live formula reaching
                    // here is genuinely reactive.
                    if (param.isConst !== true) {
                      return param;
                    }
                    try {
                      return param.fn();
                    } catch {
                      return param;
                    }
                  }
                  // Do NOT call plain functions here — they may be user functions
                  // yielded as block params (e.g., {{yield this.updatePerson}}).
                  // Calling them would invoke the function instead of passing it
                  // as a value. GXT reactive getters are formula objects (handled
                  // above), not plain functions.
                  return param;
                });

                // Store on slotCtx for context-based lookup
                const contextParams = contextBlockParams as WeakMap<object, any[]>;
                if (contextParams && slotCtx && typeof slotCtx === 'object') {
                  contextParams.set(slotCtx, [...unwrappedParams]);
                }

                // Also store as current slot params for re-renders
                // This persists until the next slot call, allowing reactivity
                // to access block params even after the slot function returns
                currentSlotParams = unwrappedParams;

                const stack = blockParamsStack;
                stack.push(unwrappedParams);

                try {
                  // Evaluate lazy-wrapped component children (contain $_tag/$_c/$_dc)
                  // but preserve reactive text getters as functions so GXT can track
                  // cell dependencies and create reactive text nodes via gxtEffect.
                  // Without this, yielded {{this.message}} becomes a static string
                  // and won't update when the outer context changes via set().
                  return slotChildren.map((child: any) => {
                    if (
                      typeof child === 'function' &&
                      !child.__isCurriedComponent &&
                      !(child instanceof Node)
                    ) {
                      // Node-producing child thunks are MARKED by the gxt compiler
                      // (`$_nt` sets `$_isNode` on every component-child DOM
                      // producer, AST-driven — including `$_each*` children, whose
                      // component rows match the wrap predicate recursively). Unmarked
                      // functions are reactive text getters. The marker, unlike a
                      // `.toString()` source check, survives minification.
                      if ((child as any).$_isNode === true) {
                        try {
                          return child();
                        } catch {
                          return child;
                        }
                      }
                      // Reactive text getters — return as functions for GXT reactive tracking
                      return child;
                    }
                    return child;
                  });
                } finally {
                  stack.pop();
                  // NOTE: We do NOT clear __currentSlotParams here
                  // This allows re-renders (via GXT reactivity) to access
                  // the params even after the slot function has returned
                }
              };

              // Mark slot with block params info for has-block-params helper
              (slotFn as any).__hasBlockParams = hasBlockParams;

              return slotFn;
            };

            // Create slot functions for named blocks
            for (const [slotName, slotData] of namedBlocks) {
              // Pass both children and the explicit hasBlockParams flag
              const fn = createSlotFn(slotData.children, slotData.hasBlockParams);
              slots[slotName] = fn;
              // `<:inverse>` is an alias for `<:else>` (Glimmer v2 normalize rule).
              // Register both names so that `{{yield to="else"}}` finds the block
              // even when the invoker wrote `<:inverse>`, and vice versa.
              if (slotName === 'else' && !slots.inverse) {
                slots.inverse = fn;
              } else if (slotName === 'inverse' && !slots.else) {
                slots.else = fn;
              }
            }

            // Create default slot if there are default children
            // Check args.__hasBlockParams__ marker for explicit block params declaration
            if (defaultChildren.length > 0) {
              // Get the explicit hasBlockParams flag from args if present
              const explicitHasBlockParams =
                args.__hasBlockParams__ !== undefined
                  ? (typeof args.__hasBlockParams__ === 'function'
                      ? args.__hasBlockParams__()
                      : args.__hasBlockParams__) === 'default'
                  : undefined;
              slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
            }
          }

          // Check for __hasBlock__ marker - indicates curly block invocation or
          // empty angle-bracket invocation <Component></Component>
          // Even if children are empty, we need to create a default slot
          // so that (has-block) returns true
          if (args.__hasBlock__ && !slots.default) {
            const blockName =
              typeof args.__hasBlock__ === 'function' ? args.__hasBlock__() : args.__hasBlock__;
            // Check if block params were declared
            const hasBlockParams =
              args.__hasBlockParams__ !== undefined
                ? (typeof args.__hasBlockParams__ === 'function'
                    ? args.__hasBlockParams__()
                    : args.__hasBlockParams__) === 'default'
                : false;
            // Create an empty slot function for the specified block
            const slotFn = (slotCtx: any, ...params: any[]) => {
              return []; // Empty slot - just return empty array
            };
            // Set the hasBlockParams flag on the slot
            (slotFn as any).__hasBlockParams = hasBlockParams;
            slots[blockName || 'default'] = slotFn;
            // Remove the markers from args so they're not passed to the component
            delete args.__hasBlock__;
            delete args.__hasBlockParams__;
          }

          // GXT FwType is [TagProp[], TagAttr[], TagEvent[]] - all arrays
          // Props in position 0 (class, id), attrs in position 1 (data-*, title),
          // events in position 2. Slots are passed separately via args.$slots.
          const fw = [fwProps, fwAttrs, events]; // [props, attrs, events]

          // Pass slots via args so manager.ts can access them.
          // Set on both string key and Symbol key to survive GXT's slot processing.
          _setInternalProp(args, '$slots', slots);
          args[$SLOTS_SYMBOL] = slots;

          // Store raw (unevaluated) children for components that need reactive
          // slot rendering (e.g., LinkTo). The slot function eagerly resolves
          // children, losing reactivity. Raw children preserve the getter functions.
          if (effectiveChildren && effectiveChildren.length > 0) {
            _setInternalProp(args, '__rawSlotChildren', effectiveChildren);
          }

          // Return a THUNK that renders the component when called
          // This is crucial for block params: when <Outer><Inner @msg={{param}} /></Outer>
          // is compiled, $_tag('Inner', ...) is called BEFORE $_tag('Outer', ...)
          // (due to JavaScript array literal evaluation order)
          // By returning a thunk, we defer the actual rendering until slot.default
          // calls the children functions - at which point block params are set up

          // Create a stable instance ID for this component position in the template
          // This ID is preserved across re-renders of the same template position
          const GXT_THUNK_ID = Symbol.for('gxt-thunk-id');
          if (!args[GXT_THUNK_ID]) {
            args[GXT_THUNK_ID] = Symbol('thunk-instance');
          }
          const thunkId = args[GXT_THUNK_ID];

          const renderComponent = function __componentThunk() {
            // Now evaluate args and render the component
            // The args getters will access block params from the stack
            // Pass the stable thunkId to enable instance caching
            _setInternalProp(args as any, '__thunkId', thunkId);
            // Track the render path for template-only components. They don't
            // appear in the parentView chain (no instance), so the backtracking
            // diagnostic (`checkBacktracking` in manager.ts) doesn't see
            // them when building its `- While rendering:` tree. After handle()
            // completes, if `peekInstanceCapture()` returns null (the
            // renderGlimmerComponent path passed `null` to setInstanceCapture)
            // this was a template-only render — add its kebabName to a
            // per-render set. The `transformBacktrackingMessage` host hook
            // contributed by this file via `installBacktrackingPart` reads this
            // set to inject template-only names into the render tree. Reset the
            // set when the renderPassId changes since the last entry
            // (`_gxtTemplateOnlyRenderedSetPassId` is the pass-id snapshot,
            // paired with `_gxtTemplateOnlyRenderedSet`).
            {
              // Bridge-routed render-pass id read.
              const _curPass = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
              if (_gxtTemplateOnlyRenderedSetPassId !== _curPass) {
                _gxtTemplateOnlyRenderedSetPassId = _curPass;
                _gxtTemplateOnlyRenderedSet.clear();
              }
            }
            _gxtTemplateOnlyStack.push(kebabName);
            // During a force-rerender (e.g., runTask(() => set(items, ...))),
            // manager.ts's renderClassicComponent skips willRender/willUpdate
            // for reused pooled instances (skipInitHooks = isReused && isForceRerender)
            // and `_gxtSyncAllWrappers` is never invoked by GXT to fire the
            // deferred hooks. Classic lifecycle contract requires `willRender`
            // to fire on every re-render whose args changed (test #11044
            // "component helper properly invalidates hash params inside an
            // {{#each}}" depends on this). After handle() runs we fire the
            // update hooks on the last-created/reused instance so that any
            // `set()` inside willRender propagates through Ember's
            // notifyPropertyChange → `_gxtTriggerReRender` → cell.update chain
            // and the DOM is re-read in the post-runTask sync.
            // Snapshot the force-rerender flag BEFORE `handle()` runs so the
            // post-`finally` block can gate willRender/didUpdateAttrs fan-out on
            // whether we were in the force-rerender frame.
            const __forceRerenderSnapshot = _gxtIsForceRerender();
            let handleResult: any;
            let rendered: any;
            try {
              handleResult = managers.component.handle(kebabName, args, fw, ctx);
              rendered = handleResult;
              if (typeof rendered === 'function') {
                rendered = rendered();
              }
            } finally {
              // Pop the template-only tracking stack after render (even on error).
              if (
                _gxtTemplateOnlyStack.length > 0 &&
                _gxtTemplateOnlyStack[_gxtTemplateOnlyStack.length - 1] === kebabName
              ) {
                _gxtTemplateOnlyStack.pop();
              }
              // Template-only components are identified by the fact that
              // renderGlimmerComponent calls setInstanceCapture(null) — so
              // after handle(), peekInstanceCapture() returns null.
              // Classic components are still captured as their instance.
              const _lastCreatedAfter = peekInstanceCapture();
              if (_lastCreatedAfter === null) {
                _gxtTemplateOnlyRenderedSet.add(kebabName);
              }
            }
            if (__forceRerenderSnapshot) {
              const _inst = peekInstanceCapture();
              // Fire willRender/willUpdate ONLY if `_gxtSyncAllWrappers` did not
              // already fire them on this instance for the current sync cycle.
              // manager.ts stamps `__gxtSyncAllFiredCycleId` on any instance
              // whose update hooks syncAll fires via `trigger`.
              // This gate prevents double-firing for direct-invocation args
              // (e.g. {{non-block prop=this.x}}) while still firing for
              // each-iteration re-renders whose parent-getter captures an
              // old block param and is missed by syncAll.
              if (_inst && _inst.__gxtEverInserted && typeof _inst.trigger === 'function') {
                const __gCycle = _gxtGetSyncCycleId();
                // Pool-reuse-with-changes escape hatch: when Phase-1 syncAll
                // visited this instance (stamping __gxtSyncAllFiredCycleId) but
                // did NOT actually fire hooks (block-param closure held stale
                // value at Phase-1 time, so no changes detected), yet pool
                // reuse detected real arg changes, we must STILL fire willRender.
                // Test #11044 depends on this: willRender syncs internalName
                // from the new `name` for items renders inside {{#each}}.
                // __gxtHooksFiredCycleId is stamped ONLY when hooks actually
                // fire (via wrapTrigger), distinguishing "visited no-op" from
                // "visited and fired hooks".
                const poolReuseWithChanges = _inst.__gxtPoolReuseWithChangesCycleId === __gCycle;
                const hooksActuallyFired = _inst.__gxtHooksFiredCycleId === __gCycle;
                const willRenderAlreadyFired = _inst.__gxtWillRenderFiredCycleId === __gCycle;
                const normalGate =
                  _inst.__gxtSyncAllFiredCycleId !== __gCycle && !willRenderAlreadyFired;
                const poolReuseGate =
                  poolReuseWithChanges && !hooksActuallyFired && !willRenderAlreadyFired;
                if (normalGate || poolReuseGate) {
                  _inst.__gxtWillRenderFiredCycleId = __gCycle;
                  // Clear the pool-reuse flag so subsequent invocations don't
                  // re-fire the hooks in the same cycle.
                  _inst.__gxtPoolReuseWithChangesCycleId = 0;
                  try {
                    _inst.trigger('didUpdateAttrs');
                  } catch {
                    /* ignore */
                  }
                  try {
                    _inst.trigger('didReceiveAttrs');
                  } catch {
                    /* ignore */
                  }
                  try {
                    _inst.trigger('willUpdate');
                  } catch {
                    /* ignore */
                  }
                  try {
                    _inst.trigger('willRender');
                  } catch {
                    /* ignore */
                  }
                  // willRender may call `set()` which dirties cells. Flush so
                  // freshly-dirtied cells propagate to the DOM within this pass.
                  try {
                    gxtSyncDom();
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
            // If the result is a primitive (from a helper resolved as component
            // fallback), wrap it in a text node so GXT can insert it in the DOM.
            if (rendered != null && typeof rendered !== 'object') {
              return document.createTextNode(String(rendered));
            }
            return rendered;
          };
          // Mark as component thunk for debugging
          (renderComponent as any).__isComponentThunk = true;
          (renderComponent as any).__componentName = kebabName;

          // Check if we're inside a slot context (block params active).
          // If block params are on the stack, we must return the thunk deferred
          // so that GXT's rendering pipeline calls it within the slot scope.
          // Otherwise, execute immediately so GXT receives a DOM node directly.
          const bpStack = blockParamsStack;
          const hasBP = bpStack && bpStack.length > 0 && bpStack[bpStack.length - 1]?.length > 0;
          if (hasBP) {
            return renderComponent;
          }
          // Execute immediately — GXT's $_tag expects a DOM node return
          return renderComponent();
        }
      }

      // Check if this tag came from {{component "name"}} helper (has @__fromComponentHelper__ marker).
      // If so, throw an error instead of falling through to custom element rendering.
      if (mightBeComponent && resolvedTag && typeof resolvedTag === 'string') {
        let hasFromComponentHelper = false;
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[1])) {
          for (const [key] of tagProps[1]) {
            if (key === '@__fromComponentHelper__') {
              hasFromComponentHelper = true;
              break;
            }
          }
        }
        if (hasFromComponentHelper) {
          let kebabName2 = doubleDashToSlash(pascalToKebab(resolvedTag));
          // Before throwing, try with leading dash — GXT strips leading dashes
          // from component names like `-inner-component` during PascalCase conversion
          const managers2 = g.$_MANAGERS;
          if (managers2?.component?.canHandle?.(`-${kebabName2}`)) {
            // The component exists with a leading dash — don't throw, just skip
          } else {
            const notFoundErr = new Error(
              `Attempted to resolve \`${kebabName2}\`, which was expected to be a component, but nothing was found. ` +
                `Could not find component named "${kebabName2}" (no component or template with that name was found)`
            );
            throw notFoundErr;
          }
        }
      }

      // Unknown block-form component: a curly-block invocation like
      // `{{#no-good}}...{{/no-good}}` is transformed by the GXT AST compiler
      // to a PascalCase tag (`<NoGood>...</NoGood>`) with a single default-slot
      // child for the body. When the component manager cannot resolve the name
      // and the helper registry has no match either, the author intended an
      // Ember component that does not exist — throw a helpful assertion
      // instead of falling through to the HTML-element path (which would emit
      // an unknown <NoGood> tag and silently succeed).
      //
      // Detection signals, any of which indicate a curly-block invocation:
      //   1. `curly-c-` prefix on the tag (legacy AST transform path)
      //   2. `@__hasBlock__` marker in attrs (angle-bracket block form) —
      //      but ONLY on PascalCase tags. GXT sometimes attaches the marker
      //      to hyphenated lowercase tags (custom elements like
      //      `<use-the-platform></use-the-platform>`), where the author
      //      intends a plain HTML custom element, not a component.
      //   3. PascalCase tag name with at least one child (curly-block body)
      if (mightBeComponent && resolvedTag && typeof resolvedTag === 'string') {
        const firstChar = resolvedTag.charCodeAt(0);
        const isPascalCase = firstChar >= 65 && firstChar <= 90; // A-Z
        let isCurlyBlockInvocation = resolvedTag.startsWith('curly-c-');
        if (
          !isCurlyBlockInvocation &&
          isPascalCase &&
          tagProps &&
          tagProps !== g.$_edp &&
          Array.isArray(tagProps[1])
        ) {
          for (const [key] of tagProps[1]) {
            if (key === '@__hasBlock__') {
              isCurlyBlockInvocation = true;
              break;
            }
          }
        }
        if (!isCurlyBlockInvocation && Array.isArray(children) && children.length > 0) {
          if (isPascalCase) isCurlyBlockInvocation = true;
        }
        if (isCurlyBlockInvocation) {
          // Compute the original dashed name (e.g. `no-good` from `NoGood` or
          // `curly-c-no-good`). Strip the `curly-c-` prefix if present.
          let rawName = doubleDashToSlash(pascalToKebab(resolvedTag));
          if (rawName.startsWith('curly-c-')) rawName = rawName.slice(8);
          const notFoundErr = new Error(
            `Attempted to resolve \`${rawName}\`, which was expected to be a component, but nothing was found.`
          );
          throw notFoundErr;
        }
      }

      // Custom element fallback: dash-containing tags that were not resolved as
      // components or helpers — render as plain HTML custom elements with attrs.
      if (
        mightBeComponent &&
        resolvedTag &&
        typeof resolvedTag === 'string' &&
        resolvedTag.includes('-')
      ) {
        const ceEl = document.createElement(resolvedTag);
        const _gxtEff = gxtEffect;

        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[0])) {
          for (const [key, value] of tagProps[0]) {
            const attrKey = key === '' ? 'class' : key;
            _gxtEff(() => {
              const resolved = typeof value === 'function' ? value() : value;
              if (resolved !== undefined && resolved !== null && resolved !== false) {
                ceEl.setAttribute(attrKey, String(resolved));
              }
            });
          }
        }
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[1])) {
          for (const [key, value] of tagProps[1]) {
            if (key.startsWith('@')) continue;
            _gxtEff(() => {
              const resolved = typeof value === 'function' ? value() : value;
              if (resolved !== undefined && resolved !== null && resolved !== false) {
                ceEl.setAttribute(key, String(resolved));
              } else if (resolved === false) {
                ceEl.removeAttribute(key);
              }
            });
          }
        }
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
          for (const entry of tagProps[2]) {
            if (Array.isArray(entry)) {
              const [evKey, evVal] = entry;
              if (evKey === '1' || evKey === 1) {
                const textVal = typeof evVal === 'function' ? evVal() : evVal;
                if (textVal != null) ceEl.appendChild(document.createTextNode(String(textVal)));
              } else if (typeof evVal === 'function') {
                ceEl.addEventListener(evKey, evVal);
              }
            }
          }
        }
        if (children && children.length > 0) {
          // Flatten the children into the custom element (see
          // `_appendChildValue`). Objects:
          //   - SafeString (.toHTML()) is parsed as HTML
          //   - GXT list context with topMarker/bottomMarker (e.g. {{#if}})
          //   - `$nodes` / `nodes`, a cell's `fn`, Symbol-keyed node arrays
          //   - anything else is stringified
          const appendCustomObject = (item: any, appendCustomChild: (v: any) => void): void => {
            // SafeString ({ toHTML(): string })
            if (typeof (item as any).toHTML === 'function') {
              const tpl = document.createElement('template');
              tpl.innerHTML = String((item as any).toHTML());
              while (tpl.content.firstChild) ceEl.appendChild(tpl.content.firstChild);
              return;
            }
            // GXT list context from $_if / $_each — move the markers and
            // everything between them into the custom element.
            if ((item as any).topMarker && (item as any).bottomMarker) {
              const topMarker = (item as any).topMarker as Node;
              const bottomMarker = (item as any).bottomMarker as Node;
              let node: Node | null = topMarker;
              while (node) {
                const next: Node | null = node.nextSibling;
                ceEl.appendChild(node);
                if (node === bottomMarker) break;
                node = next;
              }
              return;
            }
            // $nodes / nodes array on a component-ish wrapper
            const nodesProp = (item as any).$nodes || (item as any).nodes;
            if (Array.isArray(nodesProp)) {
              for (const n of nodesProp) appendCustomChild(n);
              return;
            }
            // GXT reactive cell w/ fn getter
            if (typeof (item as any).fn === 'function' && 'isConst' in (item as any)) {
              try {
                appendCustomChild((item as any).fn());
              } catch {
                /* ignore */
              }
              return;
            }
            // GXT IfCondition / list component: node storage lives under a
            // Symbol-keyed array. Recurse through any such array we find.
            // The `placeholder` Comment sits inside the array when the
            // branch is empty (false branch), so we don't need a separate
            // placeholder fallback — the Symbol walk covers both cases.
            const syms = Object.getOwnPropertySymbols(item);
            let foundFromSym = false;
            for (const sym of syms) {
              const v = (item as any)[sym];
              if (Array.isArray(v) && v.length > 0) {
                const hasNodes = v.some(
                  (x: any) =>
                    x instanceof Node ||
                    typeof x === 'string' ||
                    typeof x === 'number' ||
                    typeof x === 'function' ||
                    (x && typeof x === 'object')
                );
                if (hasNodes) {
                  for (const n of v) appendCustomChild(n);
                  foundFromSym = true;
                }
              }
            }
            if (foundFromSym) return;
            // Fallback: stringify
            try {
              ceEl.appendChild(document.createTextNode(String(item)));
            } catch {
              /* ignore */
            }
          };
          for (const child of children) _appendChildValue(ceEl, child, appendCustomObject);
        }
        return ceEl;
      }
    } finally {
      if (_eoSwap) {
        setAmbientOwner(_eoPrev);
      }
    } // Engine owner swap restore

    // Fall back to original $_tag for regular HTML elements
    // GXT handles ...attributes internally via tagProps[3] ($fw):
    // - fw[0] = props (class, id, etc.)
    // - fw[1] = attrs (data-*, title, etc.)
    // - fw[2] = events (event handlers/modifiers)
    //
    // GXT applies fw BEFORE local attrs, so local attrs win. But Ember's
    // ...attributes semantics require invocation-side (fw) to override
    // definition-side (local) for the same attribute. Fix: remove local
    // props/attrs that are also present in fw so fw values take effect.
    if (tagProps && tagProps !== g.$_edp && tagProps[3] && typeof tagProps[3] === 'object') {
      const fw = tagProps[3];
      // Check for __splatLocal__ marker — these are local attrs that come AFTER
      // ...attributes in the source and should override fw (not be overridden by it).
      // GXT may place __splatLocal__ in tagProps[0] (props) or tagProps[1] (attrs).
      const splatLocalSet = new Set<string>();
      for (const pos of [0, 1]) {
        if (Array.isArray(tagProps[pos])) {
          for (const entry of tagProps[pos]) {
            if (entry[0] === '__splatLocal__') {
              const names =
                typeof entry[1] === 'string'
                  ? entry[1]
                  : typeof entry[1] === 'function'
                    ? entry[1]()
                    : '';
              for (const n of names.split(',')) if (n) splatLocalSet.add(n);
            }
          }
        }
      }

      // Build sets of keys present in fw props and fw attrs
      const fwPropKeys = new Set<string>();
      const fwAttrKeys = new Set<string>();
      if (Array.isArray(fw[0])) {
        for (const entry of fw[0]) {
          const key = entry[0] === '' ? 'class' : entry[0];
          if (key !== 'class' && !splatLocalSet.has(key)) fwPropKeys.add(entry[0]);
        }
      }
      if (Array.isArray(fw[1])) {
        for (const entry of fw[1]) {
          if (!splatLocalSet.has(entry[0])) fwAttrKeys.add(entry[0]);
        }
      }

      tagProps = [tagProps[0], tagProps[1], tagProps[2], tagProps[3]];

      // Remove __splatLocal__ marker from props and attrs
      if (splatLocalSet.size > 0) {
        if (Array.isArray(tagProps[0])) {
          tagProps[0] = tagProps[0].filter((entry: any) => entry[0] !== '__splatLocal__');
        }
        if (Array.isArray(tagProps[1])) {
          tagProps[1] = tagProps[1].filter((entry: any) => entry[0] !== '__splatLocal__');
        }
      }

      // For attrs NOT in splatLocal: fw should override local (remove from local)
      if (fwPropKeys.size > 0 && Array.isArray(tagProps[0])) {
        tagProps[0] = tagProps[0].filter((entry: any) => !fwPropKeys.has(entry[0]));
      }
      if (fwAttrKeys.size > 0 && Array.isArray(tagProps[1])) {
        tagProps[1] = tagProps[1].filter((entry: any) => !fwAttrKeys.has(entry[0]));
      }

      // For attrs IN splatLocal: local should override fw (remove from fw)
      if (splatLocalSet.size > 0) {
        const newFw = [
          Array.isArray(fw[0])
            ? fw[0].filter((e: any) => {
                const k = e[0] === '' ? 'class' : e[0];
                return !splatLocalSet.has(k);
              })
            : fw[0],
          Array.isArray(fw[1]) ? fw[1].filter((e: any) => !splatLocalSet.has(e[0])) : fw[1],
          fw[2],
        ];
        tagProps[3] = newFw;
      }

      // Reorder class entries for ...attributes precedence.
      // GXT applies fw classes first (from tagProps[3][0]) then local (from tagProps[0]).
      // Ember wants:
      //   <div class="qux" ...attributes /> → local first, fw second (need to swap)
      //   <div ...attributes class="qux" /> → fw first, local second (GXT default, no swap)
      // If __class__ is NOT in splatLocalSet, ...attributes was AFTER class → swap.
      // If __class__ IS in splatLocalSet, ...attributes was BEFORE class → no swap.
      const classAfterSplat = splatLocalSet.has('__class__');
      if (!classAfterSplat && Array.isArray(tagProps[0]) && Array.isArray(tagProps[3]?.[0])) {
        const localClassEntries = tagProps[0].filter((e: any) => e[0] === '');
        if (localClassEntries.length > 0) {
          tagProps[0] = tagProps[0].filter((e: any) => e[0] !== '');
          // Prepend local class entries to fw[0] so they come first in GXT's class concat
          tagProps[3] = [[...localClassEntries, ...tagProps[3][0]], tagProps[3][1], tagProps[3][2]];
        }
      }
      // Clean __class__ from splatLocalSet (it's a meta-marker, not an actual attr)
      splatLocalSet.delete('__class__');
    }
    // GXT order: tag, tagProps, ctx, children
    // Wrap TEXT_CONTENT event getters (event key "1") so non-primitive, non-Node values
    // (Date, Object, Symbol) are stringified before reaching GXT's $ev/resolveRenderable.
    // GXT's resolveRenderable returns raw objects for non-primitive values, which then
    // fails in opcodeFor (expects a cell/tag). Ember stringifies all values in text positions.
    if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
      for (let ei = 0; ei < tagProps[2].length; ei++) {
        const entry = tagProps[2][ei];
        if (Array.isArray(entry) && entry[0] === '1' && typeof entry[1] === 'function') {
          const origGetter = entry[1];
          const _stringifyTextContent = function _stringifyTextContent(this: any) {
            const val = origGetter.apply(this, arguments);
            if (
              val == null ||
              typeof val === 'string' ||
              typeof val === 'number' ||
              typeof val === 'boolean'
            )
              return val;
            if (typeof val === 'symbol') return String(val);
            if (typeof val === 'function') return val;
            if (val instanceof Node) return val;
            // Non-primitive object — stringify for text position (Ember behavior)
            if (typeof val === 'object') {
              if (Array.isArray(val)) return val;
              if (typeof val.toHTML === 'function') return val;
              if (val.__isCurriedComponent) return val;
              try {
                return String(val);
              } catch {
                return '';
              }
            }
            return val;
          };
          // Stamp the wrapper with the raw getter's `this.<path>` so
          // glimmer-next's const-binding recovery (materializeAbsentPathCell, via
          // resolveRenderable) can materialize a leaf cell for an
          // initially-undefined `<p>{{this.name}}</p>` text child whose source
          // the wrapper's own toString hides.
          {
            try {
              const _p = extractThisPath(String(origGetter));
              if (_p) (_stringifyTextContent as any).__gxtPath = _p;
            } catch {
              /* best-effort */
            }
          }
          entry[1] = _stringifyTextContent;
        }
      }
    }
    // Fix: GXT uses element.style = value (prop assignment) which sets
    // style.cssText. When value is "" or null, this leaves style="" on the element.
    // Ember expects the style attribute to be removed entirely for empty values.
    // Intercept by wrapping the style prop getter to never return empty string.
    let hasReactiveStyle = false;
    let styleEntryRef: any[] | null = null;
    if (tagProps && tagProps !== g.$_edp) {
      for (const arrIdx of [0, 1]) {
        if (hasReactiveStyle) break;
        const arr = tagProps[arrIdx];
        if (Array.isArray(arr)) {
          for (let i = 0; i < arr.length; i++) {
            const entry = arr[i];
            if (Array.isArray(entry) && entry[0] === 'style' && typeof entry[1] === 'function') {
              hasReactiveStyle = true;
              styleEntryRef = entry;
              break;
            }
          }
        }
      }
    }

    // Wrap attribute/prop getters so that non-coercible values (Symbol,
    // objects with no toString) are normalized before they reach GXT's
    // compiled quoted-attribute concatenation. Without this, GXT's output
    // does implicit string concatenation on the getter result, which throws
    // TypeError for Symbols ("Cannot convert a Symbol value to a string")
    // and for Object.create(null) ("Cannot convert object to primitive value").
    // That throw aborts the entire render and leaves the container empty.
    //
    // Matches Glimmer's normalizeStringValue semantics:
    //   Symbol(debug) -> "Symbol(debug)"
    //   Object.create(null) -> ""
    if (tagProps && tagProps !== g.$_edp) {
      for (const arrIdx of [0, 1]) {
        const arr = tagProps[arrIdx];
        if (!Array.isArray(arr)) continue;
        for (let i = 0; i < arr.length; i++) {
          const entry = arr[i];
          if (!Array.isArray(entry)) continue;
          const key = entry[0];
          // Skip named-args (@foo) — those go through component args and
          // must preserve raw value (symbols/objects are valid arg values).
          if (typeof key === 'string' && key.startsWith('@')) continue;
          // Skip style — handled separately below.
          if (key === 'style') continue;
          const val = entry[1];
          if (typeof val !== 'function') continue;
          const origGetter = val;
          // Preserve __isCell / __isMutCell markers etc. by only wrapping plain getters.
          if ((origGetter as any).__isCell || (origGetter as any).__isMutCell) continue;
          const _attrNormalize = function _attrNormalize(this: any) {
            const v = origGetter.apply(this, arguments);
            if (v === null || v === undefined) return v;
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
            if (typeof v === 'symbol') return String(v); // "Symbol(debug)"
            if (typeof v === 'function') return v; // preserve helper/cell-like
            if (typeof v === 'object') {
              // SafeString — leave for GXT/downstream to call toHTML/toString.
              if (typeof (v as any).toHTML === 'function') return v;
              // Object with no toString (e.g. Object.create(null)) — normalize to ''.
              if (typeof (v as any).toString !== 'function') return '';
              try {
                return String(v);
              } catch {
                return '';
              }
            }
            return v;
          };
          // Stamp the wrapper with the raw getter's `this.<path>` so
          // glimmer-next's const-binding recovery (materializeAbsentPathCell)
          // can find the path it cannot read off the wrapper's own toString
          // (which only shows `origGetter.apply`). Enables initial-undefined
          // attribute bindings to materialize a leaf cell.
          {
            try {
              const _p = extractThisPath(String(origGetter));
              if (_p) (_attrNormalize as any).__gxtPath = _p;
            } catch {
              /* best-effort */
            }
          }
          entry[1] = _attrNormalize;
        }
      }
    }

    // Wrap the style getter: convert SafeString to HTML string, and when
    // the value is null/undefined/false, use a sentinel that the post-render
    // step can detect and clean up.
    // Also emit the style-binding XSS warning when the value is a non-safe string.
    if (hasReactiveStyle && styleEntryRef) {
      const origGetter = styleEntryRef[1];
      // Track whether we've warned for this style binding in this render pass
      // to avoid duplicate warnings from reactive re-evaluations.
      let _styleWarnedPassId = -1;
      styleEntryRef[1] = function _styleEmptyGuard() {
        const val = origGetter();
        // SafeString object: convert to plain HTML string, no warning needed
        if (val && typeof val === 'object' && typeof val.toHTML === 'function') {
          const html = val.toHTML();
          return html || null;
        }
        if (val == null || val === false || val === '') return null;
        // Non-safe dynamic value — potentially warn for style binding XSS.
        // Do not warn during force-rerender (the initial render already warned).
        if (!_gxtIsForceRerender()) {
          // Bridge-routed render-pass id read.
          const currentPassId = getGxtRenderer()?.viewUtils.getRenderPassId?.() ?? 0;
          if (_styleWarnedPassId !== currentPassId) {
            // Check if the string value came from a SafeString.toString() conversion.
            // For quoted attrs like style="{{safeExpr}}", the quoted-attr helper
            // calls String(safeString) → toString() → sets
            // `_gxtLastSafeStringResult`. If the final concatenated value matches
            // the last SafeString result exactly, the entire value came from a
            // single SafeString — no warning needed. If the value differs (e.g.
            // static text was mixed in), warn.
            let isSafeFromConcat = false;
            if (typeof val === 'string') {
              const lastSafe = _gxtLastSafeStringResult;
              if (lastSafe !== undefined && val === lastSafe) {
                isSafeFromConcat = true;
              }
            }
            // Clear the last-safe-string tracker regardless
            _gxtLastSafeStringResult = undefined;
            if (!isSafeFromConcat) {
              _styleWarnedPassId = currentPassId;
              const warnFn = getDebugFunction('warn');
              if (warnFn) {
                warnFn(_constructStyleDeprecationMessage(String(val)), false, {
                  id: 'ember-htmlbars.style-xss-warning',
                });
              }
            }
          }
        }
        return val;
      };
    }

    // SVG/MathML namespace handling: when _gxtNamespace is set (by $_c_ember
    // when it intercepts $_SVGProvider/$_MathMLProvider), create elements in the
    // correct namespace using createElementNS instead of GXT's default createElement.
    const currentNs = _gxtNamespace;
    if (currentNs && resolvedTag && typeof resolvedTag === 'string') {
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
      const XLINK_NS = 'http://www.w3.org/1999/xlink';
      const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
      const ns = currentNs === 'svg' ? SVG_NS : currentNs === 'mathml' ? MATHML_NS : null;
      if (ns) {
        const el = document.createElementNS(ns, resolvedTag);

        // Helper: apply one key/value pair to the SVG/MathML element using the
        // correct namespace for xlink: / xmlns: keys. Shared between the
        // "props" (position 0) and "attrs" (position 1) loops because GXT
        // classifies `xlink:href` as a prop for `<use>` but as an attr for
        // other tags, so both code paths need identical namespace handling.
        const applyNsAttr = (key: string, val: any): void => {
          if (val == null || val === false) return;
          if (key === '' || key === 'class' || key === 'className') {
            el.setAttribute('class', String(val));
            return;
          }
          if (key.includes(':')) {
            if (key.startsWith('xlink')) {
              el.setAttributeNS(XLINK_NS, key, String(val));
            } else if (key.startsWith('xmlns')) {
              el.setAttributeNS(XMLNS_NS, key, String(val));
            } else {
              el.setAttributeNS(ns, key, String(val));
            }
            return;
          }
          el.setAttribute(key, String(val));
        };
        // A bound value of a URL attribute (`<a href={{…}}>`, `xlink:href`) is
        // sanitized before it is applied, as Glimmer sanitizes a dynamic
        // attribute; a static value is written as authored.
        const boundNsValue = (key: string, v: any): any =>
          requiresSanitization(el.tagName, key)
            ? sanitizeAttributeValue(el as unknown as SimpleElement, key, v)
            : v;

        // Apply attributes/props from tagProps
        if (tagProps && tagProps !== g.$_edp) {
          // Props (position 0): class, id, xlink:href on <use>, etc.
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              const val = typeof value === 'function' ? boundNsValue(key, value()) : value;
              applyNsAttr(key, val);
              // Set up reactive updates for dynamic props
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = boundNsValue(key, value());
                    if (v == null || v === false) {
                      const removeKey = key === '' || key === 'className' ? 'class' : key;
                      el.removeAttribute(removeKey);
                    } else {
                      applyNsAttr(key, v);
                    }
                  });
                } catch {
                  /* ignore effect setup errors */
                }
              }
            }
          }

          // Attrs (position 1): viewBox, data-*, xlink:href, etc.
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) continue; // skip component args
              const val = typeof value === 'function' ? boundNsValue(key, value()) : value;
              applyNsAttr(key, val);
              // Reactive attrs
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = boundNsValue(key, value());
                    if (v == null || v === false) {
                      el.removeAttribute(key);
                    } else {
                      applyNsAttr(key, v);
                    }
                  });
                } catch {
                  /* ignore */
                }
              }
            }
          }

          // Position 2: events AND text content. Entries use the key "1" for
          // text children, "0" for modifier bindings, and event-name keys
          // (e.g. "click") for inline `onclick={{x}}` handlers. Skip entries
          // that look like modifier bindings — SVG namespace elements
          // generally don't support Ember-style modifiers in these tests.
          const pos2 = tagProps[2];
          if (Array.isArray(pos2)) {
            for (const entry of pos2) {
              if (!Array.isArray(entry) || entry.length < 2) continue;
              const [keyStr, valOrFn] = entry;
              if (keyStr === '1') {
                // Text child
                const val = typeof valOrFn === 'function' ? valOrFn() : valOrFn;
                if (val != null && val !== false) {
                  el.appendChild(document.createTextNode(String(val)));
                }
              } else if (keyStr === '0') {
                // Modifier — skip, not supported in this lightweight path
              } else if (typeof valOrFn === 'function') {
                // Inline event handler (onclick etc.)
                el.addEventListener(String(keyStr), valOrFn as EventListener);
              }
            }
          }
        }

        // Render children inside the SVG namespace
        if (children && children.length > 0) {
          // Flatten the children into the element (see `_appendChildValue`).
          // Objects are GXT `$_if`/`$_each` block results, which expose their
          // nodes as `nodes`, as `RENDERED_NODES_PROPERTY` or by iteration;
          // any other object renders nothing (not `[object Object]`).
          const appendObjectNodes = (v: any, appendChildValue: (v: any) => void): void => {
            const nodesArray = (v as any).nodes;
            if (Array.isArray(nodesArray)) {
              for (const n of nodesArray) appendChildValue(n);
              return;
            }
            if (RENDERED_NODES_PROPERTY && (v as any)[RENDERED_NODES_PROPERTY as any]) {
              const renderedNodes = (v as any)[RENDERED_NODES_PROPERTY as any];
              if (Array.isArray(renderedNodes)) {
                for (const n of renderedNodes) appendChildValue(n);
                return;
              }
            }
            // Symbol.iterator: iterate and recurse
            if (typeof (v as any)[Symbol.iterator] === 'function') {
              try {
                for (const n of v as any) appendChildValue(n);
                return;
              } catch {
                /* fall through */
              }
            }
          };

          for (const child of children) {
            _appendChildValue(el, child, appendObjectNodes);
          }
        }

        return el;
      }
    }

    // Guard: when a slot function (e.g. `ctx0 => [$_tag('span', ..., ctx0, ...)]`)
    // wraps yielded content in a literal HTML tag, GXT's `$_slot`/`H` creates a
    // fresh child context with `[RENDERING_CONTEXT_PROPERTY]` unset. Calling the
    // original GXT `$_tag` in that state crashes in `n(ctx).element(...)` because
    // the walker (St/Q-based) cannot climb to any ancestor — the parent linkage
    // was never recorded. Fall back to the global gxt root's rendering context so
    // the DOM API is available for element creation, as the top-level
    // `template.render` entry does.
    if (RENDERING_CONTEXT_PROPERTY && ctx && typeof ctx === 'object') {
      const rcKey = RENDERING_CONTEXT_PROPERTY as any;
      const existing = (ctx as any)[rcKey];
      if (existing == null) {
        try {
          const gxtRoot = _gxtRootContext;
          const rootRc = gxtRoot && gxtRoot[rcKey];
          if (rootRc && rootRc.element !== null) {
            (ctx as any)[rcKey] = rootRc;
          }
        } catch {
          /* ignore — let GXT raise the real error below */
        }
      }
    }

    // Fix: GXT invokes fw[2] modifier fns BEFORE applying local props/attrs to
    // the element (e.g., `<div id="inner-one" ...attributes>` gets the modifier
    // called with `el.id === ""` because id hasn't been set yet). Ember's
    // `didInsertElement` contract expects the element to be fully set up
    // (id, text, children all applied) before the modifier runs. This matters
    // especially when the modifier reads `el.getAttribute(...)` synchronously.
    //
    // Strategy: when fw[2] contains ON_CREATED modifier entries (key "0"),
    // clone tagProps[3] for THIS call only (don't mutate the shared $fw, since
    // the same fw object is passed to multiple $_tag calls for sibling splat
    // elements) and wrap each modifier fn so that, on invocation, it first
    // applies the local attrs / text content to the element, then calls the
    // real modifier fn. This way:
    //   - Tracked reads inside the real modifier fn still happen *synchronously*
    //     within GXT's outer modifier formula, keeping reactive updates working.
    //   - The element has its id / text content set by the time the modifier's
    //     `didInsertElement` hook inspects it.
    //
    // We only pre-apply *static* attrs / text (non-reactive values). Reactive
    // values are still applied later by GXT via formulas as usual — any modifier
    // that cares about those should track them internally.
    if (
      tagProps &&
      tagProps !== g.$_edp &&
      tagProps[3] &&
      Array.isArray((tagProps[3] as any)[2]) &&
      typeof resolvedTag === 'string' &&
      (tagProps[3] as any)[2].length > 0
    ) {
      const origEvents = (tagProps[3] as any)[2];
      let hasModifier = false;
      for (const entry of origEvents) {
        if (Array.isArray(entry) && entry[0] === '0' && typeof entry[1] === 'function') {
          hasModifier = true;
          break;
        }
      }
      if (hasModifier) {
        // Collect local static attrs (tagProps[1]) and local static text (tagProps[2] key=="1")
        // to pre-apply. We skip reactive values to avoid double-tracking.
        const localAttrs: Array<[string, any]> = [];
        const localTexts: any[] = [];
        if (Array.isArray(tagProps[1])) {
          for (const entry of tagProps[1]) {
            if (Array.isArray(entry) && typeof entry[0] === 'string' && !entry[0].startsWith('@')) {
              localAttrs.push([entry[0], entry[1]]);
            }
          }
        }
        if (Array.isArray(tagProps[2])) {
          for (const entry of tagProps[2]) {
            if (Array.isArray(entry) && entry[0] === '1') {
              localTexts.push(entry[1]);
            }
          }
        }
        const applyLocalToElement = (el: HTMLElement) => {
          // Apply local static attrs (id, data-*, etc.) so they're on the element
          // before the modifier's didInsertElement reads them.
          // If a getter throws here (e.g., accessing `this.x` before context is
          // ready), re-throw — GXT's normal pipeline would surface the same
          // error, and silent-swallowing would mask real bugs.
          for (const [key, val] of localAttrs) {
            const resolved = typeof val === 'function' ? val() : val;
            if (resolved == null || resolved === false) {
              // Leave unset — GXT will handle it reactively if needed
              continue;
            }
            // Only set if the element doesn't already have this attr (avoid overwriting
            // fw-applied values from earlier in the pipeline).
            if (!el.hasAttribute(key)) {
              el.setAttribute(key, String(resolved));
            }
          }
          // Apply local text content. Only if element has no textContent yet.
          if (!el.firstChild) {
            for (const textVal of localTexts) {
              const resolved = typeof textVal === 'function' ? textVal() : textVal;
              if (resolved != null && resolved !== false) {
                el.appendChild(document.createTextNode(String(resolved)));
              }
            }
          }
        };
        const fw = tagProps[3] as any;
        const wrappedEvents = origEvents.map((entry: any) => {
          if (Array.isArray(entry) && entry[0] === '0' && typeof entry[1] === 'function') {
            const origFn = entry[1];
            const preApplyWrapper = function preApplyModifierWrapper(el: any, ...rest: any[]) {
              // Pre-apply local static attrs / text so the modifier sees a
              // fully-formed element. Reactive reads inside origFn still run
              // synchronously, so GXT's modifier formula tracks them correctly.
              if (el && typeof el === 'object' && el.nodeType === 1) {
                applyLocalToElement(el);
              }
              return origFn(el, ...rest);
            };
            return [entry[0], preApplyWrapper];
          }
          return entry;
        });
        // Clone tagProps[3] so we don't mutate the shared $fw across sibling calls.
        const clonedFw: any = [fw[0], fw[1], wrappedEvents];
        for (let i = 3; i < fw.length; i++) clonedFw[i] = fw[i];
        // Preserve any non-numeric own properties from fw (GXT may attach
        // markers like __hasBlockParams). If fw is frozen or has a setter
        // that throws, skip that property rather than silently swallowing —
        // but log so the issue surfaces.
        for (const key of Object.keys(fw)) {
          if (!/^\d+$/.test(key)) {
            const descriptor = Object.getOwnPropertyDescriptor(fw, key);
            if (descriptor && 'value' in descriptor) {
              clonedFw[key] = (fw as any)[key];
            }
            // If fw has a getter-only property we can't clone it — GXT code
            // using such markers would still see the original via closure, so
            // a missing copy is acceptable here.
          }
        }
        tagProps = [tagProps[0], tagProps[1], tagProps[2], clonedFw];
      }
    }

    // Strip `[key, null]` / `[key, undefined]` entries from attrs before GXT's
    // originalTag runs. GXT otherwise sets the attribute to the empty string
    // (so `<a href={{null}}>` renders as `<a href="">` / `<a href>`), while
    // Ember's semantics treat null/undefined as "do not render this attribute
    // at all". Filtering here is safer than mutating the attribute after the
    // fact — GXT's DOM code paths may dispatch on presence.
    // Also normalise reactive getters whose current value is null/undefined
    // to a no-op by dropping the entry for the *initial* render (the getter
    // still gets wrapped by GXT's effect system to re-add it later; but our
    // wrapping approach here only affects the first synchronous pass).
    if (tagProps && tagProps !== g.$_edp && typeof tag === 'string' && !_gxtNamespace) {
      const filteredAttrs = Array.isArray(tagProps[1])
        ? tagProps[1].filter((entry: [string, unknown]) => {
            if (!Array.isArray(entry) || entry.length < 2) return true;
            const v = entry[1];
            // Skip only *static* null/undefined — reactive getters are
            // left intact so they can update later.
            if (typeof v === 'function') return true;
            return v !== null && v !== undefined;
          })
        : tagProps[1];
      if (filteredAttrs !== tagProps[1]) {
        tagProps = [tagProps[0], filteredAttrs, tagProps[2], tagProps[3]];
      }
    }

    // Track which attr entries have dynamic sources that return null/undefined.
    // After GXT renders, we'll strip those attributes from the DOM element so
    // Ember-style "null/undefined means no attribute" semantics win.
    const _nullishAttrsForCleanup: string[] = [];
    if (
      tagProps &&
      tagProps !== g.$_edp &&
      typeof tag === 'string' &&
      !_gxtNamespace &&
      Array.isArray(tagProps[1])
    ) {
      for (const entry of tagProps[1]) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        const key = entry[0];
        const value = entry[1];
        if (typeof key !== 'string' || key.startsWith('@')) continue;
        if (typeof value === 'function') {
          let v: unknown;
          try {
            v = value();
            while (typeof v === 'function') v = (v as () => unknown)();
          } catch {
            v = undefined;
          }
          if (v == null) _nullishAttrsForCleanup.push(key);
        }
      }
    }

    // Detect tagProps[2] text entries whose getter returns a SafeString
    // (an object with a toHTML() method). Ember renders those as raw HTML,
    // but GXT would coerce the object via String() to `[object Object]`
    // and `_normalizeStringValue` strips it to ''. Capture the raw HTML
    // from toHTML() here and inject it into the element after originalTag.
    const _safeHtmlInjections: Array<{ html: string }> = [];
    if (
      tagProps &&
      tagProps !== g.$_edp &&
      typeof tag === 'string' &&
      !_gxtNamespace &&
      Array.isArray(tagProps[2])
    ) {
      for (const entry of tagProps[2]) {
        if (!Array.isArray(entry) || entry.length < 2) continue;
        // Only text entries — key "1" is GXT's text-child marker.
        if (entry[0] !== '1') continue;
        const val = entry[1];
        if (typeof val !== 'function') continue;
        let v: unknown;
        try {
          v = val();
          while (typeof v === 'function') v = (v as () => unknown)();
        } catch {
          v = undefined;
        }
        if (
          v &&
          typeof v === 'object' &&
          typeof (v as { toHTML?: () => string }).toHTML === 'function'
        ) {
          try {
            _safeHtmlInjections.push({
              html: (v as { toHTML: () => string }).toHTML() ?? '',
            });
          } catch {
            /* ignore toHTML errors */
          }
        }
      }
    }

    const result = originalTag(tag, tagProps, ctx, children);

    if (_nullishAttrsForCleanup.length > 0 && result instanceof Element) {
      for (const key of _nullishAttrsForCleanup) {
        try {
          result.removeAttribute(key);
        } catch {
          /* ignore */
        }
      }
    }

    // Inject SafeString HTML: replace any text node created from the
    // `[object Object]` placeholder with the parsed HTML fragment.
    if (_safeHtmlInjections.length > 0 && result instanceof Element) {
      // GXT's originalTag produced text nodes for the getter's String()
      // coercion. Those nodes have nodeValue `"[object Object]"` or an
      // empty string; remove them and replace with parsed HTML.
      // Walk text nodes and remove matching ones.
      const toRemove: Node[] = [];
      for (const child of Array.from(result.childNodes)) {
        if (child.nodeType === 3 /* TEXT_NODE */) {
          const nv = child.nodeValue ?? '';
          if (nv === '' || nv === '[object Object]') {
            toRemove.push(child);
          }
        }
      }
      for (const node of toRemove) {
        try {
          result.removeChild(node);
        } catch {
          /* ignore */
        }
      }
      // Append each SafeString's parsed HTML in order.
      for (const inj of _safeHtmlInjections) {
        try {
          const tmpl = document.createElement('template');
          tmpl.innerHTML = inj.html;
          while (tmpl.content.firstChild) {
            result.appendChild(tmpl.content.firstChild);
          }
        } catch {
          /* fallback: append raw text */
        }
      }
    }

    // EmberHtmlRaw contextual reparse: when the result element is a
    // table-family element (table/thead/tbody/tr/select/etc.) and its
    // children include `{{{htmlRaw}}}` markers, the initial parse (done
    // without the parent context) may have stripped `<tr>`/`<td>` nodes.
    // Now that the parent element is available, re-parse the raw HTML
    // against the correct contextual parent so the proper structure
    // (with browser-injected `<tbody>` etc.) is in place.
    if (result instanceof Element) {
      const tagLower = (result.tagName || '').toLowerCase();
      const needsHtmlRawReparse = _GXT_CONTEXTUAL_PARSE_TAGS.has(tagLower);
      if (needsHtmlRawReparse) {
        for (const child of Array.from(result.childNodes)) {
          if (child.nodeType === 8 /* COMMENT */ && (child as any).__gxtHtmlRawStart) {
            const reparse = (child as any).__gxtHtmlRawReparse;
            if (typeof reparse === 'function') {
              try {
                reparse(result);
              } catch {
                /* ignore reparse errors */
              }
            }
          }
        }
      }
    }

    // Post-apply: GXT's originalTag only renders attributes from tagProps[1]
    // for plain HTML tags. Position 0 ("props") is used internally for
    // `class` (empty-string key) and forwarded splats; any additional entries
    // that happen to land in position 0 (e.g. dynamic `name={{...}}` paired
    // with static `foo="bar"`, where GXT classifies them into different
    // slots) are dropped. Apply anything that looks like a plain attribute
    // name to the rendered element so both static and dynamic sibling
    // attributes end up on the DOM.
    if (
      tagProps &&
      tagProps !== g.$_edp &&
      typeof tag === 'string' &&
      !_gxtNamespace &&
      result instanceof Element
    ) {
      const props = tagProps[0];
      if (Array.isArray(props)) {
        for (const entry of props) {
          if (!Array.isArray(entry) || entry.length < 2) continue;
          const key = entry[0];
          const value = entry[1];
          // Skip the class slot (empty key) — GXT already applied it; skip
          // `id` and other reserved prop-position keys that GXT handles
          // natively; only interfere when the entry is clearly a stray
          // attribute that GXT's originalTag did not map to the DOM.
          if (typeof key !== 'string' || key === '' || key === 'className') continue;
          if (key.startsWith('@') || key.startsWith('$')) continue;
          // Skip entries GXT may have already applied — specifically
          // class/id/style are set via element properties by upstream code.
          if (result.hasAttribute(key)) continue;
          const resolved = typeof value === 'function' ? value() : value;
          if (resolved == null || resolved === false) {
            // Null/undefined/false: ensure no stray attribute; leave as-is.
            continue;
          }
          // HTML boolean attributes: only when the SOURCE is a literal `true`
          // (static `<option selected>`) do we write the bare form. Dynamic
          // bindings (`selected={{this.x}}`) keep `String(value)`.
          const isLiteralTrueBoolean = value === true;
          const isBoolAttr = typeof key === 'string' && _HTML_BOOLEAN_ATTRS.has(key.toLowerCase());
          let serialized: string;
          if (isLiteralTrueBoolean && isBoolAttr) {
            // Static `<option selected>` → bare attribute.
            serialized = '';
          } else {
            serialized = String(resolved);
          }
          try {
            result.setAttribute(key, serialized);
          } catch {
            // Ignore attribute-application errors (e.g. invalid name);
            // this is a best-effort fallback, not a strict render.
          }
          // Set up a reactive effect for dynamic values so the attribute
          // updates on cell changes. Only when the source value is a
          // function — static strings don't need re-tracking.
          if (typeof value === 'function') {
            try {
              gxtEffect(() => {
                const v = value();
                if (v == null || v === false) {
                  result.removeAttribute(key);
                } else {
                  // Dynamic path: keep String(v) so `selected={{true}}`
                  // serializes as `selected="true"` (matches classic).
                  result.setAttribute(key, String(v));
                }
              });
            } catch {
              /* effect setup may fail during shutdown */
            }
          }
        }
      }
    }

    // After GXT renders, the element may have style="" from null→"" conversion.
    // GXT's prop handler does: el.style = (null === s ? "" : s)
    // When our getter returns null, GXT converts to "" and sets el.style = "".
    // Clean up: remove style attr if it's empty, and watch for future changes.
    if (hasReactiveStyle && result instanceof HTMLElement) {
      const el = result;
      // Initial cleanup
      if (el.getAttribute('style') === '') {
        el.removeAttribute('style');
      }
      // Watch for future empty style via MutationObserver
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === 'style' && el.getAttribute('style') === '') {
            el.removeAttribute('style');
          }
        }
      });
      observer.observe(el, { attributes: true, attributeFilter: ['style'] });
    }

    return result;
  };

  // Mark as wrapped to prevent re-wrapping
  g.$_tag.__compileWrapped = true;
}

// `$_dc` wrapper: a block-param component getter may THROW before its params
// are bound (a slot that hasn't fired yet) — defer via a lazy component thunk
// that re-invokes $_dc once the getter resolves. (The manager fw for
// splattributes is derived in `$_dc_ember.renderComponent`,
// ember-gxt-wrappers.ts, from the invocation props tuple.)
if (g.$_dc && !g.$_dc.__splatForwardWrapped) {
  const __origDc = g.$_dc;

  g.$_dc = function $_dc_deferThrow(componentGetter: any, gxtArgs: any, ctx: any, fw?: any): any {
    if (typeof componentGetter === 'function') {
      let getterThrew = false;
      try {
        componentGetter();
      } catch {
        getterThrew = true;
      }
      if (getterThrew) {
        const lazyThunk = () => {
          try {
            componentGetter();
          } catch {
            return undefined;
          }
          return __origDc.call(undefined, componentGetter, gxtArgs, ctx, fw);
        };
        (lazyThunk as any).__isComponentThunk = true;
        return lazyThunk;
      }
    }
    return __origDc.call(this, componentGetter, gxtArgs, ctx, fw);
  };
  (g.$_dc as any).__splatForwardWrapped = true;
  // Preserve __emberWrapped flag so ember-gxt-wrappers doesn't re-wrap
  if ((__origDc as any).__emberWrapped) (g.$_dc as any).__emberWrapped = true;
}

// Template cache for performance
const templateCache = new Map<string, any>();

let _functionCodeCache: Map<string, Function> | null = null;

/**
 * Map of GXT block-keyword names that must be rewritten to a PascalCase
 * alias when the user's strict-mode `scope` shadows them. GXT lowers the
 * block-form curly invocation `{{#NAME ...}}BODY{{/NAME}}` into either a
 * built-in keyword (e.g. `#each`, `#if`) or a raw HTML element tag for
 * lowercase names, which ignores any local binding by the same name.
 *
 * We rewrite `{{#NAME}}BODY{{/NAME}}` to `<Alias>BODY</Alias>` so GXT
 * treats it as a component invocation on the scope binding. The alias is
 * mirrored into scopeValues / scopeBindings so the binding resolves to
 * the original value.
 *
 * The `input` / `textarea` pair is handled by the upstream
 * ember-template-compiler wrapper (ember-template-compiler.ts) already;
 * we intentionally do not re-shadow them here.
 */
const _GXT_SHADOWABLE_BLOCK_KEYWORDS: Record<string, string> = {
  if: 'GxtShadowedIfBinding',
  unless: 'GxtShadowedUnlessBinding',
  each: 'GxtShadowedEachBinding',
  'each-in': 'GxtShadowedEachInBinding',
  let: 'GxtShadowedLetBinding',
  with: 'GxtShadowedWithBinding',
};

function _rewriteShadowedBlockKeyword(
  template: string,
  name: string,
  alias: string
): { source: string; changed: boolean } {
  // Only rewrite names that can appear as bare identifiers in a block tag.
  // `each-in` has a hyphen; we escape carefully for use in a RegExp.
  const escapedName = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const open = new RegExp(`\\{\\{#(${escapedName})(\\s[^}]*)?\\}\\}`, 'g');
  const close = new RegExp(`\\{\\{/${escapedName}\\}\\}`, 'g');
  if (!open.test(template) || !close.test(template)) {
    return { source: template, changed: false };
  }
  open.lastIndex = 0;
  close.lastIndex = 0;
  let out = template.replace(open, (_match, _n: string, extra?: string) => {
    // `extra` captures any hash args / positional params after the name.
    // Angle-bracket syntax uses them verbatim; GXT's attribute parser
    // supports `key=value` and bare `{{value}}` in this context.
    return `<${alias}${extra ?? ''}>`;
  });
  out = out.replace(close, `</${alias}>`);
  return { source: out, changed: true };
}

/**
 * Quick gate that decides whether a template can possibly resolve any
 * names from a strict-mode `scope()` callback. Returns true if the
 * template has either a PascalCase angle-bracket invocation or any
 * mustache whose head identifier is not `this`, `@`-prefixed, or `on`.
 *
 * For templates that fail this gate (e.g. the internal Input / Textarea
 * single-element template, with only `<input ...>` and `{{on "..."}}`
 * modifiers), the scope() resolution is skipped entirely.
 */
function _templateMayNeedScopeThreading(template: string): boolean {
  // PascalCase tag — `<Foo` or `<Foo.Bar` style. Skip closing `</…`.
  if (/<[A-Z][A-Za-z0-9_:.-]*[\s/>]/.test(template)) return true;
  // Free-identifier mustache that isn't `this`, `@arg`, `on`, or a
  // GXT/Ember built-in we always want to suppress. We just need a single
  // counter-example, so scan with a regex that captures the head and
  // bail on the first hit.
  const re = /\{\{(?:#|\/|!)?\s*([A-Za-z_][A-Za-z0-9_-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    const head = m[1];
    if (head === 'this' || head === 'on') continue;
    return true;
  }
  // SubExpression `(ident ...)` syntax — e.g. `{{on "click" (fn handleClick 123)}}`.
  // The mustache head may be `on` (skipped above) but the modifier args can
  // reference a strict-mode scope binding via a SubExpression. Detect that
  // pattern so the scope() callback is consulted for any free identifiers.
  // Match `(ident` only when preceded by whitespace, `=`, `(`, `{` or `,`
  // to avoid matching attribute literals like `style="(border)"`.
  const subExprRe = /(?:^|[\s={(,])\(([A-Za-z_][A-Za-z0-9_-]*)/g;
  while ((m = subExprRe.exec(template))) {
    const head = m[1];
    // `this` cannot appear as a SubExpression head; only `on` is worth
    // skipping (a SubExpression `(on ...)` would reference the modifier
    // helper, not a free user binding).
    if (head === 'this' || head === 'on') continue;
    return true;
  }
  return false;
}

/**
 * Returns true if `name` appears as a referenceable identifier in
 * `template`. Used to filter out scope() entries that the template
 * never references, so we don't bloat the binding set.
 *
 * The match is intentionally permissive — it accepts the name as:
 *   * a PascalCase or kebab-case angle-bracket tag (`<Foo`, `<my-foo`)
 *   * a path head inside a mustache (`{{name}}`, `{{name.x}}`,
 *     `{{#name ...}}`, `{{(name ...)}}`, `{{... name=...}}` — handled
 *     by a single word-boundary check)
 *   * a value inside a quoted attribute (`attr="{{name}}"`)
 *
 * False positives are acceptable here (a stray comment match would just
 * inject an unused binding); the only goal is to cheaply prune obvious
 * non-references.
 */
function _scopeNameAppearsAsReference(template: string, name: string): boolean {
  if (!name) return false;
  const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Either `<Name` (component tag) or a word-boundary occurrence outside
  // a closing `</...>`. The simple word-boundary regex below covers
  // path heads, helper invocations, and attribute values — anything
  // GXT could surface as a binding reference.
  const re = new RegExp(`(<\\s*${escaped}[\\s/>])|\\b${escaped}\\b`, 'm');
  return re.test(template);
}

// ── Native-templateFn dual path ─────────────────────────────────────────────
// gxt's compileTemplate already builds a finished templateFn from the compiled
// code (runtime-compiler.ts fnBody: `$_GET_ARGS(this, arguments)` + the
// flag-driven $a/$slots/$fw preamble + `return CODE`); the legacy path instead
// assembles its own Function around a rewritten copy of the code. A template
// can ride the native fn only when NONE of the legacy post-emission rewrites /
// wrapper injections would fire for it; `_gxtNativeTemplateEligible`
// whitelists exactly that set, everything else keeps the legacy assembly. On
// the native path $_GET_ARGS puts the render context into gxt's component TREE
// (fresh id via `??= cId()`, addToTree under the ambient gxtRoot parent),
// which gives ember components gxt-native destroy sequencing.
// scopeValues are threaded into gxtCompileTemplate (gxt binds them as real
// Function parameters) when EVERY key is a plain valid JS identifier —
// matching gxt's emitted identifier references verbatim. Keys needing the
// legacy normalization machinery (hyphens → underscore rewrite, reserved-word
// `__scope_` prefixing, kebab-identifier code surgery) keep the legacy path; a
// leading `$` is rejected too so user scope can never collide with gxt's own
// `$a`/`$slots`/`$fw` preamble locals or `$_*` params. (gxt's own scope-name
// validation THROWS on invalid identifiers — this guard is what makes passing
// scopeValues safe for the shared compile call.)
const _GXT_NATIVE_SCOPE_IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_$]*$/;
// Names that pass the identifier regex but are NOT usable as Function
// parameter names (literals + strict-mode-restricted). JS_RESERVED_WORDS
// covers statement keywords; these are the residue (`new Function('true', …)`
// is a SyntaxError, e.g. for the eval form's `{{if true …}}`).
const _GXT_UNSAFE_PARAM_NAMES = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'this',
  'arguments',
  'eval',
  'await',
  'yield',
]);
function _gxtScopeValuesNativeSafe(sv: Record<string, unknown> | undefined): boolean {
  if (!sv) return true;
  for (const key of Object.keys(sv)) {
    if (!_GXT_NATIVE_SCOPE_IDENT_RE.test(key)) return false;
    if (JS_RESERVED_WORDS.has(key)) return false;
    if (_GXT_UNSAFE_PARAM_NAMES.has(key)) return false;
  }
  return true;
}
// gxt's ADDED_TO_TREE_FLAG is a non-exported `Symbol('addedToTree')` (gxt
// src/core/types.ts). The force-rerender stale-registration clear needs it;
// hunt it once by description on an instance that has been through
// $_GET_ARGS and cache the (module-global) symbol instance.
let _gxtAddedToTreeSymCache: symbol | null = null;
function _gxtFindAddedToTreeSym(obj: object): symbol | null {
  if (_gxtAddedToTreeSymCache) return _gxtAddedToTreeSymCache;
  const s = Object.getOwnPropertySymbols(obj).find((x) => x.description === 'addedToTree');
  if (s) _gxtAddedToTreeSymCache = s;
  return s ?? null;
}
// Native-vs-legacy routing is driven ENTIRELY by gxt's emission report
// (CompileResult.emittedSymbols / maybeHelperNames /
// maybeHelperInNamedArgPosition / referencedBindings / emittedIdentifiers,
// collected by the serializer at emission time) — no scans of the generated
// code or the template source.
//
// Names that route a template to the legacy wrapper because a legacy-only
// injection/rewrite is load-bearing for them:
// - MAYBE-HELPER names: `unbound` (the __gxtUnboundEval freeze/replay
//   rewrite) and `__mutGet` (mut writer plumbing).
// - REFERENCED BINDINGS: the ember-injected locals the legacy Function
//   provides (each-in entries, outlet state, comment registry, mut writer)
//   and the keyword-helper locals the legacy wrapper shadows with ember-spec
//   implementations.
const _GXT_LEGACY_MAYBE_HELPER_NAMES = new Set(['unbound', '__mutGet']);
// The JS-identifier keyword helpers plus the ember-injected locals, which the
// legacy Function declares as `const <name> = __gxtBuiltinHelpers[<name>]`
// when the compiled code references them (`unique-id` is not an identifier).
const _GXT_LEGACY_HELPER_LOCALS: readonly string[] = [
  ...EMBER_KEYWORD_HELPER_NAMES.filter((name) => name !== 'unique-id'),
  'gxtEntriesOf',
  'gxtGetOutletState',
  '__gxtCommentLookup',
];
const _GXT_LEGACY_BINDING_NAMES = new Set([
  // gxt's raw-embedded {{unbound}} islands reference the legacy-provided
  // `globalThis.__gxtUnboundEval(...)`; the report records the MEMBER name for
  // globalThis.* roots (and the compound-island scan also surfaces the nested
  // `unbound` callee, which the maybe-helper set already blocks). Kept for
  // island shapes where the bare name isn't visible.
  '__gxtUnboundEval',
  ..._GXT_LEGACY_HELPER_LOCALS,
]);
function _gxtNativeTemplateEligible(
  cr: any,
  options: { strictMode?: boolean; scope?: unknown; scopeValues?: unknown } | undefined
): boolean {
  if (!cr || typeof cr.templateFn !== 'function') return false;
  if (cr.errors && cr.errors.length > 0) return false;
  // NON-STRICT scoped templates are eligible when their scopeValues were
  // threaded into gxtCompileTemplate as native Function params (all keys plain
  // identifiers — see _gxtScopeValuesNativeSafe) AND no key collides with the
  // ember builtin-helper table (the legacy helperInjections deliberately
  // SHADOW such keys with ember-spec callable implementations — e.g. a
  // scope-passed `fn` from '@ember/helper' is an internal helper definition,
  // not directly callable; the keyword-helper fn MustacheStatement test
  // covers it).
  //
  // STRICT MODE stays legacy: two known gaps — the builtin-shadowing above,
  // and the implicit-eval (`template(src, {eval})`) component-module flow,
  // which renders empty on the native path while the same emission renders
  // correctly standalone (root cause in the component-module interplay, not
  // the emission).
  if (options?.strictMode === true) return false;
  if (options?.scopeValues) {
    if (!_gxtScopeValuesNativeSafe(options.scopeValues)) return false;
    for (const key of Object.keys(options.scopeValues)) {
      if (Object.prototype.hasOwnProperty.call(_emberBuiltinHelpers, key)) return false;
    }
  }
  // {{yield}} / splattributes are allowed: the render seam mirrors
  // _gxtCurrentSlots/_gxtCurrentFw onto ctx['args'][$SLOTS/$PROPS] so gxt's
  // native $_GET_SLOTS/$_GET_FW preamble resolves the SAME objects the legacy
  // __gxtGetSlots/__gxtGetFw params provide. Recycle stays excluded
  // (runtime-recycle registration is not wired on this path).
  if (cr.usedRecycle === true) return false;
  // ── Pure ground-truth checks on the emission report (no code/source scans) ──
  const maybeHelperNames: readonly string[] = cr.maybeHelperNames || [];
  const referencedBindings: readonly string[] = cr.referencedBindings || [];
  // Legacy-only rewrites keyed on specific unresolved-helper names
  // (unbound freeze/replay, mut writer).
  for (const name of maybeHelperNames) {
    if (_GXT_LEGACY_MAYBE_HELPER_NAMES.has(name)) return false;
  }
  // Ember-injected locals / keyword-helper shadows only the legacy Function
  // provides.
  for (const binding of referencedBindings) {
    if (_GXT_LEGACY_BINDING_NAMES.has(binding)) return false;
  }
  // Free identifiers the serializer emitted regardless of binding provenance —
  // covers bare keyword references like `{{yield (get …)}}` emitting `get(` for
  // a name that was never a caller binding (referencedBindings is
  // caller-provided-only).
  const emittedIdentifiers: readonly string[] = cr.emittedIdentifiers || [];
  for (const id of emittedIdentifiers) {
    if (_GXT_LEGACY_BINDING_NAMES.has(id)) return false;
  }
  // The named-arg resolved-helper DEBUG guard is a legacy-only rewrite.
  if (cr.maybeHelperInNamedArgPosition === true) return false;
  // Scope-key string lookups: when gxt emitted `$_maybeHelper("KEY")` for a
  // scopeValues-provided key, only the legacy rewrite re-points the string at
  // the injected local.
  if (options?.scopeValues && maybeHelperNames.length > 0) {
    for (const key of Object.keys(options.scopeValues)) {
      if (maybeHelperNames.includes(key)) return false;
    }
  }
  return true;
}

/**
 * Runtime precompileTemplate implementation using GXT runtime compiler
 * Returns a template factory function that takes an owner and returns a template.
 */
export function precompileTemplate(
  templateString: string,
  options?: {
    strictMode?: boolean;
    scope?: () => Record<string, unknown>;
    moduleName?: string;
    scopeValues?: Record<string, unknown>;
    // Ember's `plugins.ast`: AST plugins (`ASTPluginBuilder`s). They run in the
    // gxt compiler's `transforms` hook, before the Ember-dialect transforms, as
    // classic Ember runs user plugins before its built-in ones.
    plugins?: { ast?: ReadonlyArray<ReturnType<typeof buildGxtDialectTransforms>[number]> };
    // Throw the gxt compiler's errors (parse errors, errors thrown by an AST
    // plugin) instead of only logging them.
    throwOnCompileError?: boolean;
  }
) {
  // Strict-mode `precompileTemplate(..., { scope: () => ({ Foo, bar }) })`
  // threading: the test-only / RFC strict-mode form passes a `scope`
  // callback that returns the locally-visible bindings. The downstream
  // compile pipeline only consumes `scopeValues`, so when `scope` is
  // present we invoke it and merge any names that are actually referenced
  // by the template into `scopeValues`.
  //
  // Filter rules (kept narrow on purpose to avoid touching textarea / input
  // / classic templates that worked before the threading was added):
  //   * Skip `on` — GXT's visitor short-circuits `{{on "evt" cb}}`
  //     syntactically. Adding `on` as a binding causes the GXT compiler
  //     to emit a variable reference and that breaks the textarea
  //     `<input ... {{on "input" ...}} />` modifier path that the Ember
  //     <Textarea> component generates internally.
  //   * Skip names that don't actually appear as referenceable identifiers
  //     in the template — keeps bookkeeping cheap and avoids churn for
  //     large scope() payloads.
  //   * Skip the whole pass for templates that have no PascalCase tags
  //     and no non-`{this,@,on,!}` mustaches — the internal Input/Textarea
  //     template is a single `<input ... />` with `{{on "..."}}` modifiers
  //     and `@`-args, so `_templateMayNeedScopeThreading` returns false
  //     for it and the pass is skipped.
  if (typeof options?.scope === 'function') {
    let extra: Record<string, unknown> | undefined;
    try {
      const scopeResult = options.scope();
      if (scopeResult && typeof scopeResult === 'object') {
        extra = scopeResult as Record<string, unknown>;
      }
    } catch {
      /* ignore — scope thunk threw, fall back to scopeValues alone */
    }
    if (extra && _templateMayNeedScopeThreading(templateString)) {
      const existing = options.scopeValues || {};
      let mergedScope: Record<string, unknown> | undefined;
      for (const name of Object.keys(extra)) {
        if (name === 'on') continue;
        if (Object.prototype.hasOwnProperty.call(existing, name)) continue;
        if (!_scopeNameAppearsAsReference(templateString, name)) continue;
        if (!mergedScope) mergedScope = { ...existing };
        mergedScope[name] = extra[name];
      }
      if (mergedScope) {
        options = { ...options, scopeValues: mergedScope };
      }
    }
  }

  // Pre-transform shadowed block keywords. When `scopeValues` provides a
  // binding whose name collides with a GXT block keyword (e.g. `each`,
  // `if`, `unless`, `let`, `with`, `each-in`), GXT's keyword path runs
  // before scope resolution and the local binding is silently ignored.
  // Rewrite `{{#NAME ...}}BODY{{/NAME}}` → `<Alias ...>BODY</Alias>` and
  // mirror the alias into scopeValues so the component call resolves to
  // the user-provided value. Skip when no scope is provided (non-strict
  // templates cannot shadow keywords).
  if (options?.scopeValues) {
    let rewritten = templateString;
    let patchedScope: Record<string, unknown> | undefined;
    for (const [name, alias] of Object.entries(_GXT_SHADOWABLE_BLOCK_KEYWORDS)) {
      if (!Object.prototype.hasOwnProperty.call(options.scopeValues, name)) continue;
      const result = _rewriteShadowedBlockKeyword(rewritten, name, alias);
      if (!result.changed) continue;
      rewritten = result.source;
      patchedScope = patchedScope || { ...options.scopeValues };
      patchedScope[alias] = options.scopeValues[name];
    }
    if (rewritten !== templateString) {
      templateString = rewritten;
      options = { ...options, scopeValues: patchedScope };
    }
  }

  // Check cache first — skip cache when scopeValues or AST plugins are provided
  // (both are per-call references the source string does not capture)
  const userAstPlugins = options?.plugins?.ast ?? [];
  const hasScopeValues =
    (options?.scopeValues && Object.keys(options.scopeValues).length > 0) ||
    userAstPlugins.length > 0;
  // Debug tracking removed to avoid unbounded memory growth in long test suites
  // Include strictMode in cache key so the same source string compiled under
  // both modes (strict vs loose) is cached separately — otherwise a loose
  // compile would win and mask the strict-mode "not in scope" behavior.
  const __strictModeFlag = options?.strictMode === true;
  const cacheKey =
    templateString + (options?.moduleName || '') + (__strictModeFlag ? '|strict' : '');
  if (!hasScopeValues) {
    const cached = templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Check for <foo.bar /> — dotted paths used as tag names require
  // the head (foo) to be in scope. In classic templates (non-strict), only
  // `this` is implicitly in scope, so <foo.bar> is invalid unless foo is
  // a block param. Check if the template provides any block params that
  // could bring the head into scope.
  {
    const blockParamNames = findBlockParamNames(templateString);
    const scopeKeys = options?.scopeValues
      ? new Set(Object.keys(options.scopeValues))
      : new Set<string>();
    for (const [head, tail] of findDottedTags(templateString)) {
      if (head !== 'this' && !blockParamNames.has(head) && !scopeKeys.has(head)) {
        throw new Error(
          `Error: You used ${head}.${tail} as a tag name, but ${head} is not in scope`
        );
      }
    }
  }

  // Check for {{attrs.X}} (assert) and {{this.attrs.X}} (deprecation)
  // This mirrors the Glimmer AST plugin assert-against-attrs.ts
  {
    // Skip the {{attrs.X}} assertion if `attrs` is used as a block param
    // (e.g., {{#let ... as |attrs|}}) since that's a valid use case.
    const hasAttrsBlockParam = hasAttrsInBlockParams(templateString);

    // Check for {{attrs.X}} - this should trigger an assert (throw)
    if (!hasAttrsBlockParam) {
      const attrsMatches = findAttrsPatterns(templateString);
      for (const attrMatch of attrsMatches) {
        const propName = attrMatch.propName;
        // Calculate location: column points to 'attrs' (after '{{'), so add 2
        const beforeMatch = templateString.slice(0, attrMatch.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length;
        const col = (lines[lines.length - 1]?.length || 0) + 2; // +2 for '{{'
        const locationDisplay = `(L${line}:C${col}) `;
        const message = `Using {{attrs}} to reference named arguments is not supported. {{attrs.${propName}}} should be updated to {{@${propName}}}. ${locationDisplay}`;
        emberAssert(message, false);
      }
    }

    // Check for {{this.attrs.X}} - this should trigger a deprecation
    const thisAttrsMatches = findThisAttrsPatterns(templateString);
    for (const thisAttrMatch of thisAttrsMatches) {
      const propName = thisAttrMatch.propName;
      // Calculate location: column points to 'this' (after '{{'), so add 2
      const beforeMatch = templateString.slice(0, thisAttrMatch.index);
      const lines = beforeMatch.split('\n');
      const line = lines.length;
      const col = (lines[lines.length - 1]?.length || 0) + 2; // +2 for '{{'
      const locationDisplay = `(L${line}:C${col}) `;
      const message = `Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.${propName}}} should be updated to {{@${propName}}}. ${locationDisplay}`;
      emberDeprecate(message, false, {
        id: 'attrs-arg-access',
        url: 'https://deprecations.emberjs.com/v3.x/#toc_attrs-arg-access',
        until: '6.0.0',
        for: 'ember-source',
        since: {
          available: '3.26.0',
          enabled: '3.26.0',
        },
      });
    }
  }

  // The Ember-dialect source rewrites (`{{outlet}}`, `{{#each-in}}`, `{{{…}}}`,
  // HTML comments, the implicit `<tbody>`, quoted-attribute and body bare
  // helpers, `{{#@arg}}` blocks, block params, dynamic vars, `{{on}}` hash
  // args) and the source asserts (`<TextArea />` typo, dotted paths with a free
  // head, dynamic `(helper)` / `(modifier)`) run as AST visitors in the GXT
  // compiler's `transforms` hook (see `buildGxtDialectTransforms` in
  // ast-transforms.ts). The asserts fire from this function just after the
  // compile call, from `_gxtDialectFindings`.

  // Transform the template
  let transformedTemplate = templateString;

  // {{on "evt" handler once=X capture=Y passive=Z}} — the `gxtOnModifierTransform`
  // AST visitor (wired below) renames the modifier to the `on-ext` alias so
  // GXT's `on`-only short-circuit does not drop the hash pairs. `on-ext`
  // resolves to the same Glimmer VM OnModifierManager via
  // `$_MANAGERS.modifier._builtinModifiers`, which natively understands the
  // hash args and passes them to `addEventListener` with the correct options.
  //
  // SKIP the rewrite when the template's scope shadows `on` with a NON-
  // canonical modifier (e.g., a user-defined `setModifierManager(..., {})`
  // value). The shadow must take effect inside the template; rewriting
  // `{{on ...}}` to `{{on-ext ...}}` short-circuits resolution through the
  // built-in `on` and breaks tests like
  // `keyword modifier: on :: can be shadowed`. We compute that gate here and
  // pass it to `buildGxtDialectTransforms` below.
  let _includeOnExtTransform = false;
  {
    const _scopeOn = options?.scopeValues?.['on'];
    const _canonicalOn = (globalThis as any).$_MANAGERS?.modifier?._builtinModifiers?.['on'];
    const _scopeShadowsOn =
      _scopeOn !== undefined && _canonicalOn !== undefined && _scopeOn !== _canonicalOn;
    if (!_scopeShadowsOn) {
      _ensureOnExtAlias();
      _includeOnExtTransform = true;
    }
  }

  // Literal string destination ids of `{{#in-element (... "id")}}` blocks, in
  // template order. $_inElement uses them as a fallback when the reactive
  // destination ref resolves to null during a render-order-timing situation
  // (nested component rendering before the outer fragment is committed). The
  // template itself reaches gxt unstripped: with the EMBER_IN_ELEMENT flag the
  // compiler reads the `insertBefore=` hash and passes the mode as
  // $_inElement's 4th argument.
  const _inElementLiteralIds: string[] = [];
  if (transformedTemplate.includes('{{#in-element')) {
    // Scan the pre-parse template for literal string ids inside each
    // {{#in-element ...}} opening tag (the $_inElement render-order fallback).
    {
      const marker = '{{#in-element';
      let i = 0;
      while (true) {
        i = transformedTemplate.indexOf(marker, i);
        if (i === -1) break;
        let p = i + marker.length;
        while (
          p < transformedTemplate.length &&
          (transformedTemplate[p] === ' ' || transformedTemplate[p] === '\t')
        )
          p++;
        const endTag = transformedTemplate.indexOf('}}', p);
        if (endTag === -1) break;
        const destExpr = transformedTemplate.slice(p, endTag);
        const m = destExpr.match(/"([^"]+)"/);
        _inElementLiteralIds.push(m && m[1] ? m[1] : '');
        i = endTag + 2;
      }
    }
  }

  // Build bindings set from scopeValues so the GXT compiler knows which names
  // are in scope and should NOT be transformed to built-in symbols (e.g. the
  // local `array` function should shadow the built-in $__array helper).
  const scopeBindings = new Set<string>();
  if (options?.scopeValues) {
    for (const key of Object.keys(options.scopeValues)) {
      scopeBindings.add(key);
    }
  }

  // Add gxtEntriesOf to scope bindings whenever the source contains an
  // `{{#each-in` block. The `gxtEachInTransform` AST visitor injects a
  // `(gxtEntriesOf …)` SubExpression during compile, so the binding must be
  // present up front for the compiler to emit a bare binding reference
  // (`gxtEntriesOf`) instead of a string lookup (`"gxtEntriesOf"`). The check
  // reads the original `templateString`: the name only appears after the AST
  // rewrite.
  if (templateString.indexOf('{{#each-in') !== -1) {
    scopeBindings.add('gxtEntriesOf');
  }

  // Add gxtGetOutletState to scope bindings whenever the source contains a
  // `-get-dynamic-var` call (either form). The `gxtDynamicVarsTransform` AST
  // visitor injects a `(gxtGetOutletState)` SubExpression during compile for
  // top-level / non-`outletState` gets, so the binding must be present up
  // front for the compiler to emit a bare binding reference
  // (`gxtGetOutletState`) rather than a string lookup (`"gxtGetOutletState"`).
  // The check reads the original `templateString`: the name only appears after
  // the AST rewrite. The second test covers a template that literally mentions
  // `gxtGetOutletState`. An unused binding (all gets in-scope) is inert.
  if (
    templateString.indexOf('-get-dynamic-var') !== -1 ||
    containsWord(transformedTemplate, 'gxtGetOutletState')
  ) {
    scopeBindings.add('gxtGetOutletState');
  }

  // NOTE: Input and Textarea are intentionally NOT added to scopeBindings.
  // Adding them causes the GXT compiler to emit $_c(Input, ...) with a variable
  // reference, but no actual Input/Textarea variable is injected. Without the
  // binding, GXT emits $_tag('Input', ...) with a string tag, which the
  // $_tag_ember wrapper correctly resolves to the Ember Input/Textarea component
  // via the component manager (PascalCase string → kebab-case registry lookup).
  // The $_tag_ember wrapper handles @-prefixed args properly for string component
  // tags, extracting them as named args for the component manager.

  // Block-param names for the `gxtDottedMustacheAssert` visitor (it must not flag
  // a `{{foo.bar}}` whose `foo` is brought into scope by an `as |foo|` block
  // param). Computed once on the post-transform source and threaded into the
  // dialect transforms.
  const _gxtDialectBlockParamNames = findBlockParamNames(transformedTemplate);

  // Ember-dialect assert findings, populated by the read-only assert-detection
  // visitors during the compile traverse and acted on immediately after the
  // compile call below (see GxtAssertFindings for why the throw cannot live in
  // the visitor itself).
  const _gxtDialectFindings: GxtAssertFindings = {
    textArea: false,
    dynamicHelper: false,
    dynamicModifier: false,
    dottedMustache: null,
  };

  // Compile using GXT runtime compiler
  const compilationResult = gxtCompileTemplate(transformedTemplate, {
    moduleName: options?.moduleName || 'gxt-runtime-template',
    bindings: scopeBindings.size > 0 ? scopeBindings : undefined,
    // The emission flags are set in the `flags:` key below (after
    // `transforms:`). ⚠ Do not add a second `flags:` key to this object
    // literal: duplicate keys silently overwrite (the later one wins), so the
    // flags would never reach the compiler.
    // scopeValues are passed as native Function params when all keys are plain
    // identifiers (gxt's scope-name validation throws otherwise). The native
    // templateFn then resolves scope references directly; legacy-normalization
    // cases pass undefined and use the __gxtGetScope injections.
    scopeValues:
      options?.scopeValues && _gxtScopeValuesNativeSafe(options.scopeValues)
        ? options.scopeValues
        : undefined,
    // Ember dialect AST transforms (public `transforms` hook). These run on the
    // parsed AST after preprocess / before codegen — see
    // `buildGxtDialectTransforms` (ast-transforms.ts). The `{{on}}`→`{{on-ext}}`
    // rewrite is included only when the scope does not shadow `on`.
    transforms: [
      ...userAstPlugins,
      ...buildGxtDialectTransforms(
        _includeOnExtTransform,
        options?.scopeValues,
        _gxtDialectBlockParamNames,
        _gxtDialectFindings
      ),
    ],
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
      // FORCE_SYNC_LIST: {{#each}} emits $_eachSync/$_eachSyncRecycled.
      // Classic Ember's synchronous _gxtSyncDomNow/morph flush requires the row
      // DOM mutated before the flush inspects it; async AsyncListComponent
      // applies on a microtask and destroys keyed-row DOM identity. Async
      // element destructors (the reason gxt defaults to async) only matter for
      // row animations, which precompileTemplate templates never set up.
      FORCE_SYNC_LIST: true,
      // EMBER_ATTR_CONCAT: interpolated quoted attrs emit `$_qStr([...])` with
      // Ember string-coercion semantics (Symbol/no-toString coercion,
      // all-nullish → null).
      EMBER_ATTR_CONCAT: true,
      // EMBER_IN_ELEMENT: {{#in-element}} insertBefore semantics emit as
      // $_inElement's 4th MODE arg (1=clear, 0=append, literal=dev-assert).
      EMBER_IN_ELEMENT: true,
      // EMBER_TRUSTED_HTML stays off. With it on, the rehydration tests for
      // top-level unescaped tr/td inside a tr contextualElement regress:
      // `$_html`'s create+insert range conflicts with rehydration's
      // claim-vs-write model for trusted table/select content. EmberHtmlRaw
      // has to stay anyway (it also backs HTML-comment preservation via
      // gxtHtmlCommentTransform), so the flag would only replace the
      // content-position `{{{…}}}` lowering. Turning it on also needs
      // `removeGxtArtifacts` (manager.ts) to keep the empty comment anchors
      // that bound a native `$_html` range: stripping them as artifacts
      // detaches the range and the next opcode run empties it (classic
      // components render empty).
    },
    // Convert PascalCase component names to kebab-case for Ember registry lookup.
    //
    // Strict-mode threaded bindings (from `scope: () => ({ Foo })`) must NOT
    // be lowered: when `Foo` is in `scopeBindings`, the GXT compiler emits
    // `$_c(Foo, ...)` against the local variable. Lowering the name here
    // would re-route the call through the kebab-case Ember registry lookup
    // (`$_c('foo', ...)` → raw `<foo>` element), which is exactly the bug
    // that breaks the Strict-Mode renderComponent cluster.
    customizeComponentName: (name: string) => {
      if (scopeBindings.has(name)) {
        return name;
      }
      return pascalToKebab(name);
    },
  });

  // Fire the AST-detected Ember-dialect asserts now (the detection ran inside the
  // transforms above; the throw/assert MUST happen here — a throw raised inside a
  // transform is swallowed into compilationResult.errors by the GXT compiler and
  // never re-thrown, so it would silently fail to abort. See GxtAssertFindings).
  // Order: textarea → dotted-mustache → dynamic-helper → dynamic-modifier (the
  // source asserts for dotted tags / attrs / this.attrs already ran above).
  if (_gxtDialectFindings.textArea) {
    // Use getDebugFunction('assert') so expectAssertion's stub is the one called.
    const _assert = getDebugFunction('assert');
    if (_assert)
      _assert('Could not find component `<TextArea />` (did you mean `<Textarea />`?)', false);
  }
  if (_gxtDialectFindings.dottedMustache) {
    const { head, tail } = _gxtDialectFindings.dottedMustache;
    throw new Error(
      `You attempted to render a path (\`{{${head}.${tail}}}\`), but ${head} was not in scope`
    );
  }
  if (_gxtDialectFindings.dynamicHelper) {
    emberAssert('Passing a dynamic string to the `(helper)` keyword is disallowed.', false);
  }
  if (_gxtDialectFindings.dynamicModifier) {
    emberAssert('Passing a dynamic string to the `(modifier)` keyword is disallowed.', false);
  }

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    if (options?.throwOnCompileError) {
      throw new Error(
        compilationResult.errors.map((e: { message: string }) => e.message).join('\n')
      );
    }
    console.warn('[gxt-compile] Compilation errors:', compilationResult.errors);
    console.warn('[gxt-compile] Template:', transformedTemplate.slice(0, 200));
  }

  // Eligible templates keep gxt's OWN templateFn (built inside
  // gxtCompileTemplate from the unmodified code) and skip the legacy assembly
  // below. Otherwise the template function is rebuilt around a rewritten copy
  // of the code plus the legacy injections ($a alias for @named args,
  // $slots/$fw accessors, helper and scope locals).
  const __gxtUseNativeTemplateFn =
    !!compilationResult.code && _gxtNativeTemplateEligible(compilationResult, options);
  if (__gxtUseNativeTemplateFn) {
    (compilationResult as any).__gxtNativePath = true;
  } else if (compilationResult.code) {
    let modifiedCode = compilationResult.code;

    // Post-process: When GXT emits $_maybeHelper("name", ...) with a string for a
    // name that is in scope bindings, replace the string with a variable reference.
    // The GXT compiler sometimes emits string-based lookups even for known bindings
    // (e.g., when WITH_HELPER_MANAGER path isn't taken). The scope injection later
    // creates `const get = __gxtGetScope(storeKey)["get"]`, but the compiled code
    // references the string "get" — this fix bridges that gap.
    //
    // Only keys the compiler reports are rewritten: a quoted lookup is listed in
    // `maybeHelperNames`, and a kebab binding that gxt emitted verbatim as an
    // unquoted identifier (`$_maybeHelper(say-hello, …)`, invalid JS parsed as
    // `say - hello`) is listed in `referencedBindings`.
    if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
      const _jsReserved = JS_RESERVED_WORDS;
      const quotedLookups = new Set(compilationResult.maybeHelperNames);
      const referencedBindings = new Set(compilationResult.referencedBindings);
      const scopeKeySet = new Set(Object.keys(options.scopeValues));
      for (const key of scopeKeySet) {
        const quoted = quotedLookups.has(key);
        const bareKebab = key.indexOf('-') !== -1 && referencedBindings.has(key);
        if (!quoted && !bareKebab) continue;
        let jsKey = hyphenToUnderscore(key);
        if (_jsReserved.has(jsKey)) {
          jsKey = `__scope_${jsKey}`;
        }
        const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        if (quoted) {
          // Replace $_maybeHelper("key", with $_maybeHelper(jsKey,
          // Use a regex that matches both quote styles
          const pattern = new RegExp(`\\$_maybeHelper\\("${escapedKey}",`, 'g');
          modifiedCode = modifiedCode.replace(pattern, `$_maybeHelper(${jsKey},`);
          const pattern2 = new RegExp(`\\$_maybeHelper\\('${escapedKey}',`, 'g');
          modifiedCode = modifiedCode.replace(pattern2, `$_maybeHelper(${jsKey},`);
        }
        if (bareKebab) {
          const pattern3 = new RegExp(`\\$_maybeHelper\\(${escapedKey},`, 'g');
          modifiedCode = modifiedCode.replace(pattern3, `$_maybeHelper(${jsKey},`);
        }
      }
    }

    // Post-process: detect `["@name", $_maybeHelper("ident", [], this)]` — a
    // bare un-wrapped helper call in a component's named-arg position. In
    // strict mode this form is ambiguously a pass-by-reference or invocation
    // when `ident` resolves to a registered helper, and Ember throws a
    // specific error ("A resolved helper cannot be passed as a named
    // argument...").
    //
    // We rewrite the pattern to invoke a runtime guard first. The guard
    // checks `owner.factoryFor('helper:ident')`; if it resolves, it throws
    // the Ember-standard error. Otherwise it falls through, letting
    // $_maybeHelper run normally (for non-helper resolutions like a `this`
    // property fallback).
    //
    // Block-param and scope-bound forms compile as `["@name", () => ident()]`
    // or `["@name", () => $_maybeHelper(ident, ...)]` (with an outer getter
    // wrapper), so they do NOT match this un-wrapped pattern and are left
    // alone.
    //
    // The compiler reports whether any string lookup landed in a named-arg
    // position (`maybeHelperInNamedArgPosition`); the rewrite runs only then.
    // The guard function is declared in the Function() body below, gated on
    // `hasNamedArgHelperGuard`.
    let hasNamedArgHelperGuard = false;
    if (compilationResult.maybeHelperInNamedArgPosition) {
      modifiedCode = modifiedCode.replace(
        /(\["@[A-Za-z_][A-Za-z0-9_-]*",\s*)\$_maybeHelper\(("[^"]+"),\s*\[\],\s*this\)/g,
        (match, prefix, nameLiteral) => {
          // Skip known built-in helper names that are safe as named args.
          const bareName = nameLiteral.slice(1, -1);
          // Only apply to simple identifiers (letters/digits/underscore/hyphen)
          if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(bareName)) return match;
          // Do not guard built-in keyword helpers — those aren't "registered
          // helpers" from the owner registry perspective.
          if (_GXT_NAMED_ARG_SAFE_BUILTINS.has(bareName)) return match;
          hasNamedArgHelperGuard = true;
          return `${prefix}(__gxtAssertNotResolvedHelperAsNamedArg(${nameLiteral}, this), $_maybeHelper(${nameLiteral}, [], this))`;
        }
      );
    }

    // {{unbound}} islands are emitted as `globalThis.__gxtUnboundEval(__ubCache, …)`
    // and reported in `emittedIdentifiers`.
    const hasUnbound = compilationResult.emittedIdentifiers.includes('__gxtUnboundEval');

    compilationResult.code = modifiedCode;
    try {
      // Preamble injection is driven by the compiler's ground-truth emission
      // flags (`usedArgsAlias`/`usedSlots`/`usedFw`). The rewrites above never
      // introduce `$a`/`$slots`/`$fw` references.
      const needsArgsAlias = compilationResult.usedArgsAlias;
      const needsSlots = compilationResult.usedSlots;
      const needsFw = compilationResult.usedFw;
      // Inject Ember keyword helpers as local variables so GXT-compiled code
      // that references them as bare identifiers (e.g. inside {{#let}}) works.
      // GXT treats unknown helpers as scope variables in subexpression position.
      const helperInjections: string[] = [];
      const scopeInjections: string[] = [];
      const scopeVals = options?.scopeValues;
      const scopeKeys = new Set(scopeVals ? Object.keys(scopeVals) : []);

      // Inject scope values as local variables (for strict mode templates with scope)
      // JS reserved words cannot be used as variable names, so we prefix them
      let scopeStoreKey = '';
      const scopeAliases = new Map<string, string>(); // original key -> JS alias
      if (scopeVals && scopeKeys.size > 0) {
        // Normalize scope values: replace Glimmer VM internal helpers with
        // GXT-compatible equivalents. Glimmer VM helpers (from @glimmer/runtime)
        // are plain objects registered via setInternalHelperManager — they cannot
        // be called as functions. Replace them with the GXT-compatible versions.
        const BUILTINS_MAP: Record<string, string> = {
          hash: 'hash',
          array: 'array',
          concat: 'concat',
          get: 'get',
          fn: 'fn',
        };
        const gxtBuiltins = _emberBuiltinHelpers;
        const internalHelperManagers = getGxtRenderer()?.registries.internalHelperManagers as
          | WeakMap<object, any>
          | undefined;
        for (const key of Object.keys(scopeVals)) {
          const val = scopeVals[key];
          if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
            // Check if this is a Glimmer VM internal helper
            if (internalHelperManagers?.has?.(val as object)) {
              const builtinName = BUILTINS_MAP[key];
              if (builtinName && gxtBuiltins?.[builtinName]) {
                scopeVals[key] = gxtBuiltins[builtinName];
              }
            }
          }
        }
        // Deterministic key based on sorted scope key names AND the
        // template source so that distinct templates that happen to share
        // the same scope-key SHAPE (e.g. two strict-mode templates each
        // declaring `scope: () => ({ Child, data })` but with different
        // `data` values) get distinct global storage slots — otherwise
        // the second compile overwrites the first's scope values and
        // both renders end up reading the same `data` (see the
        // renderComponent siblings-with-reactivity test).
        const sortedKeys = Array.from(scopeKeys).sort().join(',');
        const hashSource = sortedKeys + '' + templateString;
        let h = 0x811c9dc5; // FNV-1a 32-bit
        for (let i = 0; i < hashSource.length; i++) {
          h ^= hashSource.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        scopeStoreKey = `__gxtScope_${(h >>> 0).toString(36)}`;
        _gxtScopeStore.set(scopeStoreKey, scopeVals);
        for (const key of scopeKeys) {
          // Use valid JS identifier (convert hyphens, etc.)
          let jsKey = hyphenToUnderscore(key);
          // Prefix reserved words so they can be used as variable names
          if (JS_RESERVED_WORDS.has(jsKey)) {
            jsKey = `__scope_${jsKey}`;
          }
          // Block-param shadow fix for scoped helpers like `hash`, `get`,
          // `fn` that the template also shadows via `{{#let ... as |hash|}}`.
          // GXT emits `(() => { let hash = () => $_maybeHelper(hash, ...); })()`
          // which is self-referential (inner `hash` captures the let binding,
          // not the outer scope binding). Transform the IIFE to receive the
          // outer binding as a parameter:
          //   (() => { let hash = () => $_maybeHelper(hash, ...); })()
          //   → ((_$outer_hash) => { let hash = () => $_maybeHelper(_$outer_hash, ...); })(hash)
          // This preserves outer `hash` references AND allows the shadow's
          // RHS to reach the scope binding via the captured alias.
          const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          const iifeOpenPattern = /\(\(\)\s*=>\s*\{/g;
          const shadowMatches: Array<{
            start: number;
            bodyStart: number;
            bodyEnd: number;
            end: number;
          }> = [];
          let mm: RegExpExecArray | null;
          while ((mm = iifeOpenPattern.exec(modifiedCode)) !== null) {
            const iifeStart = mm.index;
            const bodyStart = iifeOpenPattern.lastIndex;
            let depth = 1;
            let i = bodyStart;
            while (i < modifiedCode.length && depth > 0) {
              const ch = modifiedCode[i];
              if (ch === '{') depth++;
              else if (ch === '}') depth--;
              else if (ch === '"' || ch === "'" || ch === '`') {
                const quote = ch;
                i++;
                while (i < modifiedCode.length && modifiedCode[i] !== quote) {
                  if (modifiedCode[i] === '\\') i++;
                  i++;
                }
              }
              i++;
            }
            if (depth !== 0) break;
            const bodyEnd = i - 1;
            if (modifiedCode.slice(bodyEnd + 1, bodyEnd + 4) !== ')()') continue;
            const bodyText = modifiedCode.slice(bodyStart, bodyEnd);
            const shadowRe = new RegExp(`\\blet\\s+${escapedKey}\\s*=`);
            if (!shadowRe.test(bodyText)) continue;
            shadowMatches.push({ start: iifeStart, bodyStart, bodyEnd, end: bodyEnd + 4 });
            iifeOpenPattern.lastIndex = bodyEnd + 4;
          }
          if (shadowMatches.length > 0) {
            const capturedAlias = `_$outer_${jsKey}`;
            for (let si = shadowMatches.length - 1; si >= 0; si--) {
              const { start, bodyStart, bodyEnd, end } = shadowMatches[si]!;
              const body = modifiedCode.slice(bodyStart, bodyEnd);
              let newBody = body.replace(
                new RegExp(
                  `(let\\s+${escapedKey}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*)\\$_maybeHelper\\(${escapedKey}\\s*,`,
                  'g'
                ),
                (_m: string, p1: string) => `${p1}$_maybeHelper(${capturedAlias},`
              );
              newBody = newBody.replace(
                new RegExp(
                  `(let\\s+${escapedKey}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*)(\\$__?[a-zA-Z_]+)\\(${escapedKey}\\s*,`,
                  'g'
                ),
                (_m: string, p1: string, p2: string) => `${p1}${p2}(${capturedAlias},`
              );
              const replacement = `((${capturedAlias}) => {${newBody}})(${jsKey})`;
              modifiedCode = modifiedCode.slice(0, start) + replacement + modifiedCode.slice(end);
            }
          }
          scopeAliases.set(key, jsKey);
          // Read through the injected `__gxtGetScope` accessor parameter so
          // scope keys whose names collide with `globalThis` itself
          // (strict-mode allowed globals like `globalThis`, `Math`, `JSON`)
          // don't TDZ-trap on the about-to-be-declared `const ${jsKey}`.
          scopeInjections.push(`const ${jsKey} = __gxtGetScope("${scopeStoreKey}")["${key}"];`);
        }
      }

      const BUILTINS = _emberBuiltinHelpers;
      if (BUILTINS) {
        // Inject the helpers the compiled code references as bare identifiers:
        // gxt lists every free identifier it emitted in `emittedIdentifiers`
        // and every referenced caller binding (`gxtEntriesOf`,
        // `gxtGetOutletState`) in `referencedBindings`.
        const referenced = new Set([
          ...compilationResult.emittedIdentifiers,
          ...compilationResult.referencedBindings,
        ]);
        for (const name of _GXT_LEGACY_HELPER_LOCALS) {
          // Skip if this name is provided in scope values (scope shadows built-in)
          if (scopeKeys.has(name)) continue;
          if (referenced.has(name)) {
            helperInjections.push(`const ${name} = __gxtBuiltinHelpers["${name}"];`);
          }
        }
      }

      // For strict-mode templates, shadow the global $_maybeHelper with a
      // resolver that throws "not in scope" for free identifiers instead of
      // falling back to owner.lookup. We do this at the OUTER (factory) scope
      // so that the shadow survives across all reactive getter closures
      // produced by the compiled template — including closures invoked long
      // after the enclosing template.render() call returns.
      //
      // The shadow is inlined into the emitted Function() body, closing over
      // the `$_maybeHelper` symbol parameter (the ember-wrapped delegate), an
      // inline allow-list object literal, and the `__gxtBuiltinHelpers`
      // parameter for the built-in bypass. The Function() body is cached, so
      // the inlined block costs one compilation per unique template body.
      const strictMaybeHelperInjection = __strictModeFlag
        ? `var $_maybeHelper_orig = $_maybeHelper;` +
          `var $_maybeHelper_allowed = ${_GXT_STRICT_ALLOWED_NAMES_JS_LITERAL};` +
          `var $_maybeHelper = function (n) {` +
          `if (typeof n === 'string' && !$_maybeHelper_allowed[n]) {` +
          `var bh = __gxtBuiltinHelpers;` +
          `if (!(bh && bh[n])) {` +
          `throw new Error('Attempted to resolve \`' + n + '\`, which was expected to be a component or helper, but that value was not in scope: ' + n);` +
          `}` +
          `}` +
          // Forward the call's own arguments: `$_maybeHelper_ember` reads the
          // context's position from their number.
          `return $_maybeHelper_orig.apply(this, arguments);` +
          `};`
        : '';
      // Rewrite emitted `globalThis.__gxtUnboundEval(__ubCache,` → local
      // `__gxtUnboundEval(__ubCache,` so the inline-emitted eval function
      // (declared at the outer Function() scope below) is used directly. Matches
      // the GXT-bundled serializer's wrapper shape (emitted for both the
      // top-level `{{unbound X}}` form and inline `(unbound X)` sub-expressions).
      // The `__ubCache` suffix anchors the
      // rewrite: emitted code only references `__gxtUnboundEval(__ubCache, ...)`
      // (the cache var lives in the same outer Function() scope), so the rewrite
      // is precise and never matches a foreign `__gxtUnboundEval(` reference.
      if (hasUnbound) {
        modifiedCode = modifiedCode
          .split('globalThis.__gxtUnboundEval(__ubCache')
          .join('__gxtUnboundEval(__ubCache');
      }

      // Inlined `__gxtUnboundEval` definition + per-Function-body `__ubSlots`
      // map declared at the OUTER Function() scope alongside `__ubCache`. Closes
      // over the `__ubGT` / `__ubST` Function() params (bound below to the
      // module-local `_gxtGetTracker` / `_gxtSetTracker`) so tracker suppression
      // works without a globalThis tracker surface. `__ubSlots` is per-Function-
      // body (a shared module-level Map would be fragile across concurrent
      // renders of different templates).
      const unboundEvalInjection = hasUnbound
        ? `var __ubSlots = Object.create(null);` +
          // Fine-grained replay state: a deferred GXT formula re-evaluation
          // (e.g. {{concat (if (unbound this.cond) ...)}} where the concat
          // MergedCell re-runs its sub-expressions, or a content-binding effect
          // re-firing on a sibling cell change) re-invokes the SAME unbound
          // call-site AFTER the live render's template `this` has been torn
          // down. On that deferred pass `() => this.x` reads from a lost
          // context and yields the WRONG value — but `{{unbound}}` must FREEZE
          // the value captured during the live render. We detect a deferred
          // pass via a null `__gxtGetTemplateThis()` (the template `this` is
          // only set during the live synchronous render) and REPLAY the cached
          // live-pass slots in order instead of advancing the live counter +
          // re-reading. `__ubReplay` resets on each live→deferred transition so
          // the replay walks `id:0, id:1, ...` exactly as the live pass produced
          // them.
          `var __ubReplay = Object.create(null);` +
          `var __ubLastLive = true;` +
          `function __gxtUnboundEval(cacheObj, id, valueFn) {` +
          `if (!__gxtGetTemplateThis()) {` +
          // Deferred (non-live) pass: replay the frozen live-pass values.
          `if (__ubLastLive) { __ubReplay = Object.create(null); __ubLastLive = false; }` +
          `var rSlot = __ubReplay[id] || 0;` +
          `__ubReplay[id] = rSlot + 1;` +
          `var rKey = id + ':' + rSlot;` +
          `if (rKey in cacheObj) return cacheObj[rKey];` +
          // Defensive: nothing cached for this replay slot — fall back to a
          // suppressed live eval so we still return a sane frozen value.
          `var rResult; var rSaved = __ubGT(); __ubST(null);` +
          `try { rResult = valueFn(); } finally { __ubST(rSaved); }` +
          `cacheObj[rKey] = rResult;` +
          `return rResult;` +
          `}` +
          `__ubLastLive = true;` +
          `var slot = __ubSlots[id] || 0;` +
          `var key = id + ':' + slot;` +
          `__ubSlots[id] = slot + 1;` +
          `if (key in cacheObj) return cacheObj[key];` +
          `var result;` +
          `var savedTracker = __ubGT();` +
          `__ubST(null);` +
          `try { result = valueFn(); } finally { __ubST(savedTracker); }` +
          `cacheObj[key] = result;` +
          `return result;` +
          `}` +
          `function __gxtUnboundResetSlots() {` +
          `for (var k in __ubSlots) { delete __ubSlots[k]; }` +
          `__ubLastLive = true;` +
          `}`
        : '';

      // Inlined `__gxtAssertNotResolvedHelperAsNamedArg` definition declared at
      // the OUTER Function() scope. Reads the builtin-helper table and the
      // ambient owner through the injected `__gxtBuiltinHelpers` /
      // `__gxtAmbientOwner` Function parameters. Gated on
      // `hasNamedArgHelperGuard` so templates without the bare-named-arg-helper
      // pattern pay zero overhead.
      const namedArgHelperGuardInjection = hasNamedArgHelperGuard
        ? `function __gxtAssertNotResolvedHelperAsNamedArg(name, ctx) {` +
          `var BUILTIN = __gxtBuiltinHelpers;` +
          `if (BUILTIN && BUILTIN[name]) return;` +
          `var owner = (ctx && (ctx.owner || (ctx[Symbol.for('OWNER')] || null))) || __gxtAmbientOwner();` +
          `if (!owner || typeof owner.factoryFor !== 'function') return;` +
          `var factory = owner.factoryFor('helper:' + name);` +
          `if (!factory) return;` +
          `throw new Error('A resolved helper cannot be passed as a named argument as the syntax is ambiguously a pass-by-reference or invocation. Use the \`{{helper \\'foo-helper}}\` helper to pass by reference or explicitly invoke the helper with parens: \`{{(fooHelper)}}\`.');` +
          `}`
        : '';

      const templateFnCode = `
        "use strict";
        ${hasUnbound ? 'var __ubCache = Object.create(null);' : ''}
        ${unboundEvalInjection}
        ${namedArgHelperGuardInjection}
        ${strictMaybeHelperInjection}
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          ${needsSlots ? 'const $slots = __gxtGetSlots() || {};' : ''}
          ${needsFw ? 'const $fw = __gxtGetFw();' : ''}
          ${hasUnbound ? '__gxtUnboundResetSlots();' : ''}

          ${scopeInjections.join('\n          ')}
          ${helperInjections.join('\n          ')}
          return ${modifiedCode};
        };
      `;
      // Cache compiled Function() to reduce V8 code space growth (OOM prevention)
      if (!_functionCodeCache) _functionCodeCache = new Map();
      let cachedFn = _functionCodeCache.get(templateFnCode);
      if (!cachedFn) {
        // Function() parameters: first the tracker accessors, so the inlined
        // `__gxtUnboundEval` body (above) can suppress the GXT reactive tracker
        // during `valueFn()` evaluation (bound to the module-local
        // `_gxtGetTracker` / `_gxtSetTracker`; unused when `hasUnbound` is
        // false); then the ember emitted-code hooks (`__gxtBuiltinHelpers`
        // table, `__gxtGetTemplateThis` live-render accessor, `__gxtAmbientOwner`
        // bridge accessor) and the full GXT symbol table — a compile-time
        // snapshot of the ember-wrapped globals, so the compiled body's bare
        // `$_tag` / `$_maybeHelper` / … bind as parameters instead of
        // resolving through globalThis on every render. Unlisted identifiers
        // still fall through to globalThis (the injection is additive).
        cachedFn = Function(
          '__ubGT',
          '__ubST',
          '__gxtBuiltinHelpers',
          '__gxtGetTemplateThis',
          '__gxtAmbientOwner',
          '__gxtGetSlots',
          '__gxtGetFw',
          '__gxtGetScope',
          ..._GXT_SYMBOL_PARAM_NAMES,
          templateFnCode
        )(
          _gxtGetTracker,
          _gxtSetTracker,
          _emberBuiltinHelpers,
          _gxtGetTemplateThisFn,
          getAmbientOwner,
          _gxtGetSlotsFn,
          _gxtGetFwFn,
          _gxtGetScopeFn,
          ..._GXT_SYMBOL_PARAM_NAMES.map((n) => (globalThis as any)[n])
        );
        _functionCodeCache.set(templateFnCode, cachedFn);
      }
      compilationResult.templateFn = cachedFn;
    } catch (e) {
      console.error('[gxt-compile] Failed to recreate template function:', e);
    }
  }

  // Helper function to convert template results to nodes
  const itemToNode = (item: any, depth = 0): Node | null => {
    if (item instanceof Node) {
      return item;
    }
    // Flatten raw arrays — $_c_ember's SVG/MathML/HTMLProvider branch returns
    // the defaultSlot's result directly, which is a plain array of Nodes like
    // [<svg>]. Without this branch such arrays fall through to `return null`
    // and the nested elements disappear. Wrap into a DocumentFragment so a
    // single parent-append call captures all children.
    if (Array.isArray(item)) {
      if (item.length === 0) return null;
      const frag = document.createDocumentFragment();
      for (const child of item) {
        const node = itemToNode(child, depth + 1);
        if (node) frag.appendChild(node);
      }
      return frag.childNodes.length > 0 ? frag : null;
    }
    // GXT returns getter functions for dynamic values like {{@greeting}}
    // Create a REACTIVE text node that updates when dependencies change
    if (typeof item === 'function') {
      try {
        // Triple-stache (raw HTML): use a single empty comment placeholder
        // when content is empty (matches Glimmer VM's <!----> behavior),
        // and replace with actual HTML nodes when non-empty.
        if ((item as any).__htmlRaw) {
          return renderReactiveHtml(item);
        }

        // Check if item IS a CurriedComponent BEFORE calling it.
        // Curried components are functions with __isCurriedComponent marker.
        // If we call them, they render immediately via curriedComponentFn() and
        // we lose the reactive tracking for arg changes. Instead, set up
        // marker-based reactive rendering that re-renders when curried args change.
        if (item.__isCurriedComponent) {
          const _curriedItem = item;
          const _curriedManagers = (globalThis as any).$_MANAGERS;
          if (_curriedManagers?.component?.canHandle?.(_curriedItem)) {
            // Capture owner at template evaluation time for reactive updates
            const _curriedOwner = getAmbientOwner();
            const _renderCurried = (curried: any): Node | null =>
              curried
                ? _renderCurriedNode(
                    _curriedManagers,
                    curried,
                    _curriedOwner,
                    itemToNode,
                    depth + 1
                  )
                : null;

            const _csm = document.createComment('curried-start');
            const _cem = document.createComment('curried-end');
            const _cfrag = document.createDocumentFragment();
            _cfrag.appendChild(_csm);
            const _cinitial = _renderCurried(_curriedItem);
            if (_cinitial) _cfrag.appendChild(_cinitial);
            _cfrag.appendChild(_cem);

            // Set up reactive effect to track curried arg changes
            const _cinfo: any = { lastRenderedName: _curriedItem.__name, __lastSnapshot: null };
            _snapshotCurriedArgs(_cinfo, _curriedItem);
            try {
              gxtEffect(() => {
                // For eagerly-evaluated curried components, track arg getters
                const cc = _curriedItem;
                _touchCurriedArgGetters(cc);
                const parent = _csm.parentNode;
                if (!parent) return;
                // Skip if args haven't changed
                if (_csm.nextSibling !== _cem && !_curriedComponentChanged(_cinfo, cc)) return;
                // Re-render: remove old, insert new
                const _removed = _removeNodesBetween(parent, _csm, _cem);
                if (_removed.length > 0) {
                  getGxtRenderer()?.destruction.destroyInstancesInNodes(_removed);
                }
                const newNode = _renderCurried(cc);
                if (newNode) parent.insertBefore(newNode, _cem);
                _cinfo.lastRenderedName = cc.__name;
                _snapshotCurriedArgs(_cinfo, cc);
              });
            } catch {
              /* effect setup may fail */
            }
            return _cfrag;
          }
        }

        // Capture-replay: the text-binding effect below is the sole updater, so
        // it has to SUBSCRIBE to the cells the outer `item()` reads. We can't
        // simply call `item()` inside the effect's first run (side-effecting
        // helpers like `{{capture (hash …)}}` would dispatch twice). Instead we
        // capture the cells `item()` reads here, under a fresh tracker frame, and
        // replay them into the effect's tracking frame on its first run (see the
        // `_firstRun` branch below). We forward captured cells into any AMBIENT
        // tracker so an enclosing formula still depends on them.
        const _capturedDeps = new Set<any>();
        let result: any;
        let finalResult: any;
        const _ambientTracker = _gxtGetTracker();
        const _captureFrame = new Set<any>();
        _gxtSetTracker(_captureFrame);
        try {
          result = item();
          // Mirror the effect's read shape so the same cells are captured:
          // the effect (subsequent runs) does `v = item(); typeof v === 'function' ? v() : v`.
          // If result is a function, it's a nested getter (e.g. from $__if);
          // do NOT call CurriedComponent functions — they need the reactive
          // rendering path below.
          finalResult =
            typeof result === 'function' && !result.__isCurriedComponent ? result() : result;
          // Walk every hash/array sub-value so each member's source cell is
          // captured: a hash exposes lazy getters per key and the consumer
          // only reads the keys it references, leaving sibling sub-values
          // unsubscribed. Touch them all here.
          _gxtCaptureHashArrayDeps(finalResult);
          // Initial-undefined path subscription: when the bound path resolves
          // to a value off an ABSENT property (`{{this.name}}` with `name` not
          // yet on the context), reading it touches NO cell —
          // `_captureFrame.size === 0` — so the effect subscribes to nothing
          // and a later `set(context,'name',...)` never updates the text node.
          // Materialize the leaf cell explicitly by walking the `this.<path>`
          // chain on the parent render context and calling `cellFor(...).value`
          // INSIDE this capture frame so the cell is recorded. Only fires when
          // capture came up empty (so defined paths and helpers are untouched).
          if (_captureFrame.size === 0) {
            try {
              const _path = extractThisPath(String(item));
              const _pc = _gxtCurrentTemplateThis;
              if (_path && _pc && typeof _pc === 'object') {
                let _cur: any = _pc;
                const _parts = _path.split('.');
                for (let _pi = 0; _pi < _parts.length; _pi++) {
                  const _seg = _parts[_pi]!;
                  if (!_cur || typeof _cur !== 'object') break;
                  // Read through cellFor so the cell registers in the active
                  // capture frame. skipDefine=false so an absent property gets
                  // a real cell that `set()` will dirty.
                  try {
                    const _segCell = cellFor(_cur, _seg, /* skipDefine */ false);
                    _cur = _segCell ? _segCell.value : _cur[_seg];
                  } catch {
                    _cur = _cur[_seg];
                  }
                }
              }
            } catch {
              /* best-effort cell materialization */
            }
          }
        } finally {
          _gxtSetTracker(_ambientTracker);
          _captureFrame.forEach((c) => {
            _capturedDeps.add(c);
            if (_ambientTracker) _ambientTracker.add(c);
            // Nested-object subscription: the text effect subscribes to the
            // cells `item()` READ (e.g. cellFor(context, 'nullObject') for
            // `this.nullObject.message`), but the LEAF access (`.message`) is
            // plain JS — no cell read — so mutating the leaf object
            // (`set(nullObject,'message',...)`) doesn't dirty any cell this
            // effect tracks. Register the held object as a value-owner of the
            // captured cell so the SyncCore reverse-lookup
            // (`_objectValueCellMap`) dirties this captured cell when a
            // property on the held object changes. This is what makes
            // null-proto objects + non-component nested paths reactive. Guard
            // with the cell's recorded owner (`_relatedObj`/`_relatedKey`, set
            // by gxt's rawCellFor); skip when unavailable.
            try {
              const _v = (c as any)._value;
              const _ro = (c as any)._relatedObj;
              const _rk = (c as any)._relatedKey;
              if (
                _v &&
                typeof _v === 'object' &&
                _ro &&
                typeof _ro === 'object' &&
                typeof _rk === 'string'
              ) {
                registerObjectValueOwner(_v, _ro, _rk);
              }
            } catch {
              /* registration is best-effort */
            }
          });
        }

        // Curried dynamic helper in content position: {{@value}} where
        // @value = {{helper foo "..."}}. The curried helper is a function
        // marked with __isEmberCurriedHelper; invoke it (with no extra
        // args) to get the resolved text/value and recurse.
        while (typeof finalResult === 'function' && (finalResult as any).__isEmberCurriedHelper) {
          try {
            finalResult = (finalResult as any)();
          } catch {
            break;
          }
        }

        if (finalResult instanceof Node) {
          return finalResult;
        }

        // Check if the result is a CurriedComponent — render it as a component
        // Use marker-based reactive rendering so that when curried args change
        // (e.g., set('model.greeting', 'Hola')), the DOM is replaced.
        if (finalResult && finalResult.__isCurriedComponent) {
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(finalResult)) {
            // Capture owner at template evaluation time for reactive updates
            const capturedOwner = getAmbientOwner();
            const renderCurriedComponent = (curried: any): Node | null => {
              if (!curried) return null;
              // Empty curried component marker — renders nothing but preserves
              // the reactive rendering infrastructure for future transitions.
              if (curried.__isEmpty) return null;
              return _renderCurriedNode(managers, curried, capturedOwner, itemToNode, depth + 1);
            };

            const startMarker = document.createComment('curried-start');
            const endMarker = document.createComment('curried-end');
            const fragment = document.createDocumentFragment();
            fragment.appendChild(startMarker);

            // Initial render
            const initialNode = renderCurriedComponent(finalResult);
            if (initialNode) {
              fragment.appendChild(initialNode);
            }
            fragment.appendChild(endMarker);

            // Reactive update — when the getter re-evaluates to a new/different
            // CurriedComponent, replace the content between markers.
            // The effect tracks cell reads inside item() so it fires when
            // any dependency (e.g., this.model.greeting) changes.
            try {
              // Store the getter so we can manually trigger re-renders
              const curriedRenderInfo: any = {
                item,
                startMarker,
                endMarker,
                renderCurriedComponent,
                managers,
                lastRenderedName: finalResult.__name,
              };
              // Snapshot initial curried args for change detection
              _snapshotCurriedArgs(curriedRenderInfo, finalResult);
              // Register for manual re-rendering on property changes.
              _curriedRenderInfos.push(curriedRenderInfo);

              gxtEffect(() => {
                // Determine the current curried component.
                // If item IS a curried component (not a getter), use it directly.
                // If item is a getter function, call it to get the curried component.
                let newFinal: any;
                if (item.__isCurriedComponent) {
                  // item is the curried component itself — use it directly
                  // (it was eagerly evaluated from the template, not a getter)
                  newFinal = item;
                } else {
                  const newResult = item();
                  newFinal =
                    typeof newResult === 'function' && !newResult?.__isCurriedComponent
                      ? newResult()
                      : newResult;
                }
                // Evaluate curried arg getters to establish tracking —
                // when a curried arg changes (e.g., this.model.expectedText),
                // this effect must re-fire so we can update the component.
                if (newFinal && newFinal.__isCurriedComponent) {
                  _touchCurriedArgGetters(newFinal);
                }

                const parent = startMarker.parentNode;
                if (!parent) return;

                // Skip teardown if same component with unchanged args (preserves DOM stability)
                if (
                  newFinal &&
                  newFinal.__isCurriedComponent &&
                  startMarker.nextSibling !== endMarker &&
                  !_curriedComponentChanged(curriedRenderInfo, newFinal)
                ) {
                  return;
                }

                // Check if the component type changed (not just args)
                const _componentSwapped =
                  !newFinal ||
                  !newFinal.__isCurriedComponent ||
                  newFinal.__name !== curriedRenderInfo.lastRenderedName;
                // Collect and remove existing content between markers
                const _removedNodes = _removeNodesBetween(parent, startMarker, endMarker);
                // Destroy old component instances when the component TYPE changed
                if (_componentSwapped && _removedNodes.length > 0) {
                  getGxtRenderer()?.destruction.destroyInstancesInNodes(_removedNodes);
                }

                // Insert new content if we have a valid curried component
                if (
                  newFinal &&
                  newFinal.__isCurriedComponent &&
                  managers.component.canHandle(newFinal)
                ) {
                  const newNode = renderCurriedComponent(newFinal);
                  if (newNode) {
                    parent.insertBefore(newNode, endMarker);
                  }
                  curriedRenderInfo.lastRenderedName = newFinal.__name;
                  _snapshotCurriedArgs(curriedRenderInfo, newFinal);
                } else if (newFinal && typeof newFinal === 'string') {
                  // Component name resolved to string — try rendering directly
                  if (managers.component.canHandle(newFinal)) {
                    const handleResult = managers.component.handle(newFinal, {}, null, null);
                    if (typeof handleResult === 'function') {
                      const rendered = handleResult();
                      if (rendered instanceof Node) {
                        parent.insertBefore(rendered, endMarker);
                      }
                    } else if (handleResult instanceof Node) {
                      parent.insertBefore(handleResult, endMarker);
                    }
                  }
                  curriedRenderInfo.lastRenderedName = newFinal;
                }
              });
            } catch {
              /* effect setup may fail */
            }

            return fragment;
          }
        }

        // Check if the result is a raw HTML value (from triple-stache {{{expr}}})
        // These have __htmlRaw or toHTML marker and need innerHTML rendering
        if (
          finalResult &&
          typeof finalResult === 'object' &&
          (finalResult.__htmlRaw || typeof finalResult.toHTML === 'function')
        ) {
          const getHtml = () => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            if (fv == null) return '';
            if (fv.toHTML) return fv.toHTML();
            // Object.create(null) and similar have no toString — normalize to ''
            if (typeof fv === 'object' && typeof (fv as any).toString !== 'function') return '';
            try {
              return String(fv);
            } catch {
              return '';
            }
          };
          return renderReactiveHtml(getHtml);
        }

        // If result is an object with GXT node structure, process it.
        // But plain objects (Date, {foo:'bar'}, etc.) should be stringified for text rendering.
        if (finalResult && typeof finalResult === 'object' && !(finalResult instanceof Node)) {
          // Check if it looks like a GXT component (has RENDERED_NODES_PROPERTY)
          const _RNPROP = RENDERED_NODES_PROPERTY;
          // Arrays: only recurse if they contain Node or function items (GXT node arrays).
          // Plain value arrays (e.g., from rest positionalParams) should be stringified.
          const isGxtArray =
            Array.isArray(finalResult) &&
            finalResult.length > 0 &&
            finalResult.some(
              (v: any) =>
                v instanceof Node ||
                typeof v === 'function' ||
                (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date))
            );
          if (_RNPROP && _RNPROP in finalResult && !isGxtArray) {
            // Extract DOM nodes from GXT ComponentReturnType objects (e.g., from $_dc).
            // These objects have RENDERED_NODES_PROPERTY containing the actual DOM nodes.
            const renderedNodes = finalResult[_RNPROP];
            if (Array.isArray(renderedNodes) && renderedNodes.length > 0) {
              if (renderedNodes.length === 1 && renderedNodes[0] instanceof Node) {
                return renderedNodes[0];
              }
              const frag = document.createDocumentFragment();
              for (const rn of renderedNodes) {
                if (rn instanceof Node) frag.appendChild(rn);
              }
              return frag;
            }
            // Empty rendered nodes — return a placeholder comment
            return document.createComment('');
          }
          if (isGxtArray || typeof finalResult.toHTML === 'function') {
            return itemToNode(finalResult, depth + 1);
          }
          // Check if this is a component definition (from {{this.Foo}} where Foo is a component).
          // In Ember, curly syntax {{value}} renders components when the value is a
          // component definition. Detect by checking COMPONENT_TEMPLATES or manager.
          const _gMgrs = (globalThis as any).$_MANAGERS;
          if (_gMgrs?.component?.canHandle?.(finalResult)) {
            const _handleRes = _gMgrs.component.handle(finalResult, {}, null, null);
            let _compNode: Node | null = null;
            if (typeof _handleRes === 'function') {
              _compNode = _handleRes();
            } else {
              _compNode = _handleRes;
            }
            if (_compNode instanceof Node) return _compNode;
            if (_compNode) return itemToNode(_compNode, depth + 1);
          }
          // Plain object (Date, {foo:'bar'}, etc.) — stringify for text rendering.
          // Ember's Glimmer VM stringifies all values in text positions.
          // Handle Object.create(null) which has no toString — render as empty.
          let textVal: string;
          try {
            textVal = String(finalResult);
          } catch {
            textVal = '';
          }
          const objTextNode = document.createTextNode(textVal);
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              objTextNode.textContent = _gxtCoerceText(fv);
            });
          } catch {
            /* effect setup may fail */
          }
          return objTextNode;
        }

        // Handle symbol values — stringify for text rendering
        if (typeof finalResult === 'symbol') {
          const symTextNode = document.createTextNode(String(finalResult));
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              symTextNode.textContent = _gxtCoerceText(fv);
            });
          } catch {
            /* effect setup may fail */
          }
          return symTextNode;
        }

        // Create a text node with the initial value.
        // If the initial value is a DOM Node, use a marker-based approach
        // that can swap between text and node content reactively.
        if (finalResult instanceof Node) {
          // DOM node in content position — insert it directly with
          // start/end markers for reactive replacement.
          const startMarker = document.createComment('');
          const endMarker = document.createComment('');
          const fragment = document.createDocumentFragment();
          fragment.appendChild(startMarker);
          fragment.appendChild(finalResult);
          fragment.appendChild(endMarker);
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              const parent = startMarker.parentNode;
              if (!parent) return;
              // Remove existing content between markers
              let node = startMarker.nextSibling;
              while (node && node !== endMarker) {
                const next = node.nextSibling;
                parent.removeChild(node);
                node = next;
              }
              // Insert new content
              if (fv instanceof Node) {
                parent.insertBefore(fv, endMarker);
              } else if (fv != null && fv !== '') {
                parent.insertBefore(document.createTextNode(String(fv)), endMarker);
              }
            });
          } catch {
            /* effect setup may fail */
          }
          return fragment;
        }

        // Set up reactive text binding via GXT effect().
        // Cell-backed getters on the instance make property reads trackable.
        // effect() tracks those cell reads. When set() updates the value,
        // the cell is dirtied, gxtSyncDom() runs the effect, and the
        // text node content is updated.
        //
        // When a value transitions to a DOM Node (e.g., {{this.attached}}
        // changing from undefined to an Element), we replace the text node
        // with the actual DOM node. We track the current content node so we
        // can swap it reactively without leaving comment markers in the DOM.
        //
        // When the "skip text effects" flag is set (nested renderComponent),
        // skip creating effects. Nested renders are destroyed and recreated by
        // the parent, so independent effects cause ordering issues. Read via the
        // module-local `_gxtGetSkipTextEffects()`.
        const textValue = finalResult == null ? '' : String(finalResult);
        const textNode = document.createTextNode(textValue);
        if (_gxtGetSkipTextEffects()) {
          return textNode;
        }
        let _currentContentNode: Node = textNode;
        let _isNodeContent = finalResult instanceof Node;
        try {
          // The outer `item()` call above has already been issued — it
          // produced `finalResult` and we've synchronously written it into
          // the text node above. If the underlying helper has user-observable
          // side effects (e.g. `{{capture (hash …)}}` records each call into
          // the test's step list), the gxtEffect's first synchronous run
          // calling `item()` AGAIN would dispatch the helper a second time
          // before any state has changed. Skip the first effect invocation's
          // re-call by reusing the cached `finalResult`; dependency tracking
          // is still established through the cell reads that happened during
          // the outer `item()` call because gxtEffect captures the same
          // tracking frame (no second helper invocation needed to register
          // deps — they were registered when finalResult was first computed).
          let _firstRun = true;
          gxtEffect(() => {
            let fv: any;
            if (_firstRun) {
              _firstRun = false;
              // Capture-replay: the effect's formula is capturing deps inside
              // this run. Replay the cells the outer `item()` read (captured
              // above into `_capturedDeps`) into the active tracker so this
              // effect SUBSCRIBES to them — without re-calling `item()` (which
              // would double-dispatch a side-effecting helper).
              const _effectTracker = _gxtGetTracker();
              if (_effectTracker) {
                _capturedDeps.forEach((c) => _effectTracker.add(c));
              }
              fv = finalResult;
            } else {
              const v = item();
              fv = typeof v === 'function' ? v() : v;
              // Leaf-owner RE-registration on re-run (GH#14332). The first-run
              // capture frame registered the held leaf object as a value-owner of
              // each captured cell (so a nested
              // `set(leaf,'prop',…)` reverse-looks-up and dirties the cell). But
              // when a parent ref-swaps the held object — `set(context,'page',
              // newPage)` then `set(newPage,'title',…)` — the effect re-runs and
              // re-tracks `cellFor(context,'page')`, yet `newPage` was never
              // registered as that cell's value-owner (registration only ran on
              // first render with the OLD page). So `set(newPage,'title',…)`
              // reverse-looks-up nothing and the bound text stays stale. Re-walk
              // the live tracker (the cells THIS run read, with their refreshed
              // `_value` = newPage) and re-register owners. Idempotent
              // (registerObjectValueOwner dedupes by (obj,key)).
              try {
                const _tr = _gxtGetTracker();
                if (_tr) {
                  _tr.forEach((c: any) => {
                    try {
                      const _v = c._value;
                      const _ro = c._relatedObj;
                      const _rk = c._relatedKey;
                      if (
                        _v &&
                        typeof _v === 'object' &&
                        _ro &&
                        typeof _ro === 'object' &&
                        typeof _rk === 'string'
                      ) {
                        registerObjectValueOwner(_v, _ro, _rk);
                      }
                    } catch {
                      /* per-cell best-effort */
                    }
                  });
                }
              } catch {
                /* leaf-owner re-registration is best-effort */
              }
            }
            if (fv instanceof Node) {
              // Transition to or update DOM Node content
              const parent = _currentContentNode.parentNode;
              if (!parent) return;
              if (_currentContentNode !== fv) {
                parent.replaceChild(fv, _currentContentNode);
                _currentContentNode = fv;
              }
              _isNodeContent = true;
              return;
            }

            if (_isNodeContent) {
              // Was Node, now primitive — replace with text node
              const parent = _currentContentNode.parentNode;
              if (!parent) return;
              const newText = document.createTextNode(_gxtCoerceText(fv));
              parent.replaceChild(newText, _currentContentNode);
              _currentContentNode = newText;
              _isNodeContent = false;
            } else {
              (textNode as Text).textContent = _gxtCoerceText(fv);
            }
          });
        } catch {
          // Effect setup failed — text node stays static
        }

        return textNode;
      } catch (e) {
        // Re-throw assertion errors (e.g., "Could not find component named ...")
        // so they propagate to the test harness
        if (
          e instanceof Error &&
          (e.message.includes('Could not find component') ||
            e.message.includes('Attempted to resolve') ||
            e.message.includes('Assertion Failed'))
        ) {
          throw e;
        }
        return null;
      }
    }
    if (typeof item === 'string') {
      return document.createTextNode(item);
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      return document.createTextNode(String(item));
    }
    // Check for htmlSafe strings (SafeString objects with toHTML method)
    if (item && typeof item === 'object' && typeof item.toHTML === 'function') {
      const htmlContent = item.toHTML();
      // Create a document fragment with the HTML content
      const template = document.createElement('template');
      template.innerHTML = htmlContent;
      const fragment = document.createDocumentFragment();
      while (template.content.firstChild) {
        fragment.appendChild(template.content.firstChild);
      }
      return fragment;
    }
    if (item && typeof item === 'object') {
      // Check for CurriedComponent — render it as a component
      if (item && item.__isCurriedComponent) {
        const managers = (globalThis as any).$_MANAGERS;
        if (managers?.component?.canHandle?.(item)) {
          const handleResult = managers.component.handle(item, {}, null, null);
          if (typeof handleResult === 'function') {
            const rendered = handleResult();
            if (rendered instanceof Node) return rendered;
            return itemToNode(rendered, depth + 1);
          }
          if (handleResult instanceof Node) return handleResult;
          return itemToNode(handleResult, depth + 1);
        }
      }

      // Check for GXT list context (from $_each/$_eachSync results)
      // These have topMarker and bottomMarker properties, and the content is between them
      if (item.topMarker && item.bottomMarker) {
        const topMarker = item.topMarker;
        const bottomMarker = item.bottomMarker;
        const parent = topMarker.parentNode;
        if (parent) {
          // Create a fragment containing all nodes between markers (inclusive of markers for GXT tracking)
          const fragment = document.createDocumentFragment();
          // GXT needs the markers for list tracking, so include them
          let node = topMarker;
          while (node) {
            const next = node.nextSibling;
            fragment.appendChild(node);
            if (node === bottomMarker) break;
            node = next;
          }
          return fragment;
        }
        return null;
      }

      // Check for GXT reactive cell with 'fn' property (from $_slot results)
      // GXT's slots return reactive cells that have a 'fn' getter function
      if (typeof item.fn === 'function' && 'isConst' in item) {
        try {
          const cellValue = item.fn();
          return itemToNode(cellValue);
        } catch (e) {
          // fn() may throw if the cell is destroyed
        }
      }

      // Check for $nodes or nodes property
      const nodesProp = item.$nodes || item.nodes;
      if (nodesProp) {
        const frag = document.createDocumentFragment();
        for (const n of nodesProp) {
          const node = itemToNode(n);
          if (node) frag.appendChild(node);
        }
        return frag.childNodes.length > 0 ? frag : null;
      }

      // Check for Symbol-based node storage (GXT context objects)
      const symbols = Object.getOwnPropertySymbols(item);
      for (const sym of symbols) {
        const val = item[sym];
        if (Array.isArray(val) && val.length > 0) {
          const hasNodes = val.some(
            (v: any) =>
              v instanceof Node ||
              typeof v === 'string' ||
              typeof v === 'number' ||
              typeof v === 'function' ||
              (v && typeof v === 'object')
          );

          if (hasNodes) {
            const frag = document.createDocumentFragment();
            for (const n of val) {
              const node = itemToNode(n);
              if (node) frag.appendChild(node);
            }
            return frag.childNodes.length > 0 ? frag : null;
          }
        }
      }
    }
    return null;
  };

  // Create the template factory function (takes owner, returns template)
  const templateFactory = function (owner?: any) {
    const templateId = `gxt-template-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create a template object that Ember expects
    const template = {
      __gxtCompiled: true,
      moduleName: options?.moduleName || 'gxt-runtime-template',
      id: templateId,
      result: 'ok' as const,
      meta: { owner },

      // The compiled template function
      _templateFn: compilationResult.templateFn,
      _code: compilationResult.code,

      // For debugging
      toString() {
        return `[gxt-template: ${templateString.slice(0, 50)}...]`;
      },

      // Required by Ember's template system - provides a compilable program
      asLayout() {
        return {
          compile: () => ({ handle: 0, symbolTable: { hasEval: false, symbols: [] } }),
          id: templateId,
          moduleName: options?.moduleName || 'gxt-runtime-template',
        };
      },

      asWrappedLayout() {
        return this.asLayout();
      },

      // Render function for Ember integration
      render(context: any, parentElement: Element | null) {
        if (!parentElement) {
          console.warn('[gxt-compile] No parent element provided for render');
          return { nodes: [] };
        }

        // Set up $slots and $fw as globals for the template function to access
        // The GXT runtime compiler generates code that references these directly
        const prevSlots = _gxtCurrentSlots;
        const prevFw = _gxtCurrentFw;

        // Push this template's literal in-element ids onto the global
        // fallback stack and bump the render-pass depth counter so
        // $_inElement can detect render-order timing issues and defer
        // the body render until the parent fragment commits.
        //
        // Call the module-local `_gxtSetIsRendering` directly (this site is
        // intra-file); the cross-package writer sites in
        // `glimmer/lib/renderer.ts` use the bridge `withRendering(fn)` helper.
        // The `_inElemStackStart` snapshot/length-restore pattern in the finally
        // block scopes pushes to this template invocation under reentrancy
        // without replacing the shared module-local `_inElementFallbackIds`.
        const _inElemStack: string[] = _inElementFallbackIds;
        const _inElemStackStart = _inElemStack.length;
        for (const id of _inElementLiteralIds) _inElemStack.push(id);
        _gxtSetIsRendering(true);

        try {
          // Per-parent-element root isolation: renders into the same parent
          // share a root (preserving outlet re-render semantics), renders into
          // distinct parents get fresh, isolated roots. The module-local
          // `_gxtRootContext` is updated inside `_getOrCreateGxtRoot` so
          // downstream consumers (e.g. the component-ID fallback in the resolver)
          // still read the current root, either directly intra-file or via
          // `compilePipeline.getRootContext` from cross-file callers.
          const gxtRoot = _getOrCreateGxtRoot(parentElement);
          gxtSetParentContext(gxtRoot);

          // Use the context directly — don't wrap with Object.create()!
          // The context IS the Proxy from createRenderContext. Wrapping it would
          // bypass the Proxy's get handler, breaking cell-based reactive tracking.
          // Declared before the RENDERING_CONTEXT_PROPERTY block below, which
          // uses it.
          const renderContext = context;

          // Copy GXT rendering context from root to our render context.
          //
          // We can't rely on `gxtInitDOM(gxtRoot)`: it is a two-arg function
          // (`(ctx, domApi) => domApi`) in the installed GXT build, so calling it
          // with a single arg crashes inside the try/catch, silently leaving
          // renderContext[RENDERING_CONTEXT_PROPERTY] unset. For a freshly-created
          // Root that hasn't yet been installed via `renderComponent`, the dom
          // module's internal `xt` fast-path variable is also null, so `$_tag`'s
          // `n(ctx)` walker falls through to `ctx[RENDERING_CONTEXT_PROPERTY]` —
          // which would be undefined — and the walk returns null, crashing with
          // "Cannot read properties of null (reading 'element')".
          //
          // So if the root has no DOMApi yet, mint one directly with
          // `new HTMLBrowserDOMApi(root.document)` (the same constructor the
          // dom module uses internally) and install it on BOTH the root
          // (so subsequent renders can reuse it) AND the render context.
          try {
            let rootRenderingCtx =
              gxtRoot && RENDERING_CONTEXT_PROPERTY
                ? (gxtRoot as any)[RENDERING_CONTEXT_PROPERTY as any]
                : undefined;
            if (!rootRenderingCtx && _GXT_HTMLBrowserDOMApi) {
              const doc = (gxtRoot && (gxtRoot as any).document) || document;
              rootRenderingCtx = new (_GXT_HTMLBrowserDOMApi as any)(doc);
              if (gxtRoot && RENDERING_CONTEXT_PROPERTY) {
                try {
                  (gxtRoot as any)[RENDERING_CONTEXT_PROPERTY as any] = rootRenderingCtx;
                } catch {
                  /* ignore frozen root */
                }
              }
            }
            if (rootRenderingCtx && RENDERING_CONTEXT_PROPERTY) {
              renderContext[RENDERING_CONTEXT_PROPERTY as any] = rootRenderingCtx;
            }
          } catch {
            /* ignore */
          }

          _gxtCurrentSlots = context.$slots || context[$SLOTS_SYMBOL] || {};
          _gxtCurrentFw = context.$fw || [[], [], []];

          // Ensure the ambient owner is set before the template renders.
          // During top-level component rendering (via runAppend), the owner may
          // not be set on globalThis yet. Extract it from the component context.
          if (!getAmbientOwner() && context) {
            const ctxOwner =
              context.owner || context._owner || (context.__gxtRawTarget || context)?.owner;
            if (ctxOwner && typeof ctxOwner === 'object' && typeof ctxOwner.lookup === 'function') {
              setAmbientOwner(ctxOwner);
            }
          }

          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Check for built-in helper overrides. If the owner has registered a
          // helper with a built-in name, assert before rendering.
          {
            const _owner = getAmbientOwner();
            if (_owner && !_owner.isDestroyed) {
              for (const builtinName of BUILTIN_HELPER_NAMES) {
                let hasOverride = false;
                try {
                  hasOverride = !!_owner.factoryFor?.(`helper:${builtinName}`);
                } catch {
                  /* ignore */
                }
                if (hasOverride) {
                  emberAssert(
                    `You attempted to overwrite the built-in helper "${builtinName}" which is not allowed. Please rename the helper.`,
                    false
                  );
                }
              }
            }
          }

          // Register render context for cross-cell dirtying
          _gxtLastRenderContext = context;
          if (context && typeof context === 'object') {
            const proto = Object.getPrototypeOf(context);
            if (proto && proto !== Object.prototype) {
              const ctxsMap = _getOrCreateGxtComponentContexts();
              if (!ctxsMap.has(proto)) {
                ctxsMap.set(proto, new Set());
              }
              ctxsMap.get(proto)!.add(context);
            }
          }

          // Set up the GXT context symbols using the proper exported symbols
          if (RENDERED_NODES_PROPERTY && !renderContext[RENDERED_NODES_PROPERTY as any]) {
            renderContext[RENDERED_NODES_PROPERTY as any] = [];
          }
          // CRITICAL: The Ember render context is NOT registered in GXT's internal
          // TREE map (that map is not accessible from outside GXT in production builds).
          // When GXT's $_if/$_each/etc. call addToTree(renderContext, newChild), they
          // set PARENT.set(newChildId, renderContext[COMPONENT_ID_PROPERTY]). Then the
          // context walker does TREE.get(parentId) which returns undefined and crashes
          // while trying to read RENDERING_CONTEXT_PROPERTY off the undefined parent.
          //
          // Fix: assign the gxtRoot's COMPONENT_ID_PROPERTY to the render context. This
          // way addToTree writes PARENT[childId] = gxtRootId, and TREE.get(gxtRootId)
          // returns the gxtRoot (which IS registered in TREE and has
          // RENDERING_CONTEXT_PROPERTY set). Walker finds the DOM api and returns.
          //
          // This must be set UNCONDITIONALLY (not guarded by "if not set"), because an
          // earlier classic-component render may have assigned a dangling custom id to
          // the same instance, leaving addToTree pointing into a void.
          //
          // NATIVE PATH EXCEPTION: a native-templateFn template calls
          // $_GET_ARGS itself, which mints the context its OWN fresh id
          // (`??= cId()`) and addToTree-registers it as a DISTINCT child of the
          // ambient gxtRoot — the root-id stamp above would instead make
          // $_GET_ARGS do `TREE.set(rootId, renderContext)` (overwriting the
          // root's entry, self-parenting it, and recycling the root id on
          // teardown). So for native templates: do NOT stamp; and on a
          // force-rerender (same instance reused by the morph path with its
          // previous registration manually discarded) clear the stale id +
          // addedToTree flag so $_GET_ARGS re-registers cleanly.
          const __gxtNativeTpl = (compilationResult as any).__gxtNativePath === true;
          if (COMPONENT_ID_PROPERTY && __gxtNativeTpl) {
            if (_gxtIsForceRerender()) {
              try {
                delete renderContext[COMPONENT_ID_PROPERTY as any];
              } catch {
                /* frozen context, ignore */
              }
              const _attSym = _gxtFindAddedToTreeSym(renderContext);
              if (_attSym) {
                try {
                  delete (renderContext as any)[_attSym];
                } catch {
                  /* ignore */
                }
              }
            }
          } else if (COMPONENT_ID_PROPERTY) {
            const rootId = gxtRoot && (gxtRoot as any)[COMPONENT_ID_PROPERTY as any];
            if (rootId !== undefined && rootId !== null) {
              try {
                renderContext[COMPONENT_ID_PROPERTY as any] = rootId;
              } catch {
                /* frozen context, ignore */
              }
            } else if (!renderContext[COMPONENT_ID_PROPERTY as any]) {
              // Fallback: mint a unique ID (old behavior) if gxtRoot has no id.
              renderContext[COMPONENT_ID_PROPERTY as any] = ++_contextId;
            }
          }

          // Ensure 'args' key is ALWAYS accessible on the render context
          // GXT's runtime compiler uses $args = 'args' (a string), so templates
          // access args via this['args'].foo (aliased as $a.foo)
          if (!renderContext['args']) {
            renderContext['args'] = context['args'] || context.args || {};
          }

          // Native path: gxt's own preamble resolves slots/fw via
          // `$_GET_SLOTS/$_GET_FW(this, arguments)`, which (with no args passed
          // at the call seam below) read `this['args'][$SLOTS_SYMBOL]` /
          // `this['args'][$PROPS_SYMBOL]`. Ember stores slots on the context
          // root (context.$slots / context[$SLOTS_SYMBOL]) and fw on
          // context.$fw — which is why the ambient _gxtCurrentSlots/_gxtCurrentFw
          // module stack (+ the injected __gxtGetSlots/__gxtGetFw wrapper
          // params) exists on the legacy path. Mirror the SAME values onto
          // this['args'] under the shared registered symbols so the native
          // preamble sees identical objects. (renderContext['args'] is the
          // attrsProxy — a plain object with per-key defineProperty getters —
          // so symbol writes are transparent.)
          if (__gxtNativeTpl) {
            const __argsObj = renderContext['args'];
            if (__argsObj && typeof __argsObj === 'object') {
              try {
                __argsObj[$SLOTS_SYMBOL] = _gxtCurrentSlots;
              } catch {
                /* frozen args — legacy-only shape, ignore */
              }
              try {
                __argsObj[$PROPS_SYMBOL] = _gxtCurrentFw;
              } catch {
                /* ignore */
              }
            }
          }

          // Add has-block helpers to the render context.
          // GXT-compiled code calls `$_hasBlock.bind(this, $slots)(name)` so the
          // function may be invoked as either `(slots, name)` or `(name)`; also
          // `<:inverse>` aliases `<:else>`. Delegate via the shared helpers
          // (_lookupSlot / _resolveHasBlockArgs defined above) so the logic
          // stays in one place.
          const currentSlots = _gxtCurrentSlots;
          renderContext.$_hasBlock = function (arg1?: any, arg2?: any) {
            const slots = arg1 && typeof arg1 === 'object' ? arg1 : currentSlots;
            const name = ((arg1 && typeof arg1 === 'object' ? arg2 : arg1) as string) || 'default';
            return _lookupSlot(slots, name) !== undefined;
          };
          renderContext.$_hasBlockParams = function (arg1?: any, arg2?: any) {
            const slots = arg1 && typeof arg1 === 'object' ? arg1 : currentSlots;
            const name = ((arg1 && typeof arg1 === 'object' ? arg2 : arg1) as string) || 'default';
            const slotFn = _lookupSlot(slots, name);
            if (!slotFn) return false;
            if (slotFn.__hasBlockParams !== undefined) {
              return slotFn.__hasBlockParams;
            }
            if (slots) {
              const markerKey = `${name}_`;
              if (markerKey in slots && typeof slots[markerKey] === 'boolean') {
                return slots[markerKey];
              }
              if (name === 'else' && typeof slots.inverse_ === 'boolean') return slots.inverse_;
              if (name === 'inverse' && typeof slots.else_ === 'boolean') return slots.else_;
            }
            return false;
          };

          // Set up $_scope for GXT's $_maybeHelper name resolution.
          // When templates use bare names like {{cond1}} (without this.),
          // GXT compiles to $_maybeHelper("cond1", [], ctx). The scope is
          // checked to resolve the name. We set $_scope to the render context
          // so bare names resolve to component properties through cell getters.
          const argsObj = renderContext['args'] || {};
          if (!argsObj.$_scope) {
            Object.defineProperty(argsObj, '$_scope', {
              value: renderContext,
              writable: true,
              enumerable: false,
              configurable: true,
            });
          }

          // Push slots onto the global stack for nested has-block checks
          const slotsStack = slotsContextStack;
          slotsStack.push(currentSlots);

          // Install cells on the render context for user-defined properties BEFORE
          // the template evaluates. This ensures GXT formulas reading this.prop
          // will track the cell, enabling reactive updates when set() is called later.
          // We walk the prototype chain (up to the base Ember component) to find
          // properties set via Component.extend({ fooBar: true }).
          try {
            const internalKeys = new Set([
              'args',
              'attrs',
              'element',
              'parentView',
              'tagName',
              'layoutName',
              'layout',
              'classNames',
              'classNameBindings',
              'attributeBindings',
              'concatenatedProperties',
              'mergedProperties',
              'isDestroying',
              'isDestroyed',
              'renderer',
              'init',
              'constructor',
              'willDestroy',
              'toString',
            ]);
            // Use the raw target if render context is a Proxy (so cells are keyed
            // to the same object that `_gxtTriggerReRender` uses).
            const cellTarget = (renderContext as any).__gxtRawTarget || renderContext;
            let proto = cellTarget;
            // Walk prototype chain, stopping at Object.prototype
            const visited = new Set<string>();
            for (let depth = 0; depth < 5 && proto; depth++) {
              const keys = Object.getOwnPropertyNames(proto);
              for (const key of keys) {
                if (visited.has(key)) continue;
                visited.add(key);
                if (key.startsWith('_') || key.startsWith('$') || internalKeys.has(key)) continue;
                const desc = Object.getOwnPropertyDescriptor(proto, key);
                if (
                  desc &&
                  !desc.get &&
                  !desc.set &&
                  desc.configurable &&
                  typeof desc.value !== 'function'
                ) {
                  try {
                    // Guard against installing a recursive cell-backed getter (GH#18417):
                    // if a formula (Yt) cell already exists for (cellTarget, key)
                    // whose __fn reads cellTarget[key], installing a getter that
                    // returns cell.value will loop — cell.value → __fn() →
                    // cellTarget[key] → getter → cell.value. Skip installation
                    // to keep the raw data property in place; the formula still
                    // reads the correct value through the data descriptor.
                    try {
                      const _existing = cellFor(cellTarget, key as any, /* skipDefine */ true);
                      if (_existing && typeof (_existing as any).__fn === 'function') {
                        continue;
                      }
                    } catch {
                      /* ignore probe failure */
                    }
                    // Install cell on the raw target (not the proxy)
                    // This ensures the same cell is used for reads and writes
                    cellFor(cellTarget, key as any, /* skipDefine */ false);
                    // Register reverse mapping: if this property holds an object,
                    // we need to dirty this cell when a property changes on that object.
                    // This enables {{this.m.formattedMessage}} to update when m.message changes.
                    const cellValue = desc.value;
                    if (cellValue && typeof cellValue === 'object') {
                      registerObjectValueOwner(cellValue, cellTarget, key);
                    }
                  } catch {
                    /* ignore non-configurable properties */
                  }
                }
              }
              const nextProto = Object.getPrototypeOf(proto);
              if (!nextProto || nextProto === Object.prototype) break;
              proto = nextProto;
            }
          } catch {
            /* ignore */
          }
          // Cell promotion handled by `_gxtForceEmberRerender` (full re-render)

          // Call the compiled template function with the render context.
          // Enable isRendering so GXT formulas track cell dependencies.
          let result;
          gxtSetIsRendering(true);
          // Unconditional set-true / set-false (NOT save-restore): the
          // templateFactory.render body always wants the "we are inside a
          // template render pass" signal during the template body call,
          // regardless of nesting; the surrounding try/finally provides the
          // cleanup pairing.
          _gxtSetCurrentlyRendering(true);
          const _prevTemplateThis = _gxtCurrentTemplateThis;
          _gxtCurrentTemplateThis = renderContext;
          // glimmer-next reads the current template `this` (through the
          // `getCurrentTemplateThis` host hook registered above) so its
          // const-binding recovery (resolveRenderable / attribute binding) can
          // materialize a leaf cell for an initially-undefined `this.<path>`.
          try {
            result = compilationResult.templateFn.call(renderContext);
          } catch (e) {
            // THROW path: the itemToNode-loop `finally` below (which owns the
            // `_gxtCurrentTemplateThis` / isRendering restore on the success
            // path) will never run, so restore here. Leaving
            // `_gxtCurrentTemplateThis` set would poison every subsequent
            // `{{unbound}}` evaluation in the realm: the live/deferred
            // detection (`__gxtGetTemplateThis()`, see the
            // unboundEvalInjection) misclassifies deferred passes as live and
            // unbound values silently un-freeze. Invisible in the per-module
            // Playwright runner (fresh realm per module) but a hard cumulative
            // failure in the single-page testem run, where one mid-render
            // throw broke every later "does not update when unbound" test.
            gxtSetIsRendering(false);
            _gxtCurrentTemplateThis = _prevTemplateThis;
            throw e;
          } finally {
            // NOTE: `_gxtCurrentTemplateThis` is intentionally NOT reset here
            // on the SUCCESS path — itemToNode (where the initial-undefined
            // capture frame consults it) runs in the result-processing loop
            // BELOW, after this `.call` returns. It is restored in the
            // itemToNode-loop `finally` instead (and in the catch above when
            // the template body throws).
            // Stop blocking tracked setters from calling `_gxtTriggerReRender`,
            // but KEEP isRendering=true so that GXT formulas created during
            // itemToNode (e.g., gxtEffect for reactive text nodes) properly
            // track cell dependencies and register in GXT's relatedTags map.
            // Without this, formulas created outside isRendering=true won't
            // re-evaluate when their tracked dependencies change.
            _gxtSetCurrentlyRendering(false);
            // Pop slots from stack
            slotsStack.pop();
          }

          // Handle the result — keep isRendering=true so gxtEffect calls
          // inside itemToNode create properly-tracked formulas.
          const nodes: Node[] = [];
          try {
            if (Array.isArray(result)) {
              for (const item of result) {
                const node = itemToNode(item);
                if (node) {
                  if (node instanceof DocumentFragment) {
                    const childNodes = Array.from(node.childNodes);
                    for (const child of childNodes) {
                      nodes.push(child);
                      parentElement.appendChild(child);
                    }
                  } else {
                    nodes.push(node);
                    parentElement.appendChild(node);
                  }
                }
              }
            } else {
              const node = itemToNode(result);
              if (node) {
                if (node instanceof DocumentFragment) {
                  const childNodes = Array.from(node.childNodes);
                  for (const child of childNodes) {
                    nodes.push(child);
                    parentElement.appendChild(child);
                  }
                } else {
                  nodes.push(node);
                  parentElement.appendChild(node);
                }
              }
            }
          } finally {
            gxtSetIsRendering(false);
            _gxtCurrentTemplateThis = _prevTemplateThis;
          }

          // Restore previous global values
          _gxtCurrentSlots = prevSlots;
          _gxtCurrentFw = prevFw;
          _gxtSetIsRendering(false);
          // Trim any un-consumed fallback ids pushed by this template
          // render (e.g. because no nested in-element hit the null-dest
          // path). Preserves ids pushed by ancestor renders.
          if (_inElemStack.length > _inElemStackStart) {
            _inElemStack.length = _inElemStackStart;
          }

          return { nodes, ctx: context };
        } catch (err) {
          // Restore globals even on error
          _gxtCurrentSlots = prevSlots;
          _gxtCurrentFw = prevFw;
          _gxtSetIsRendering(false);
          if (_inElemStack.length > _inElemStackStart) {
            _inElemStack.length = _inElemStackStart;
          }

          // Re-throw ALL errors. Init-phase user errors, assertion failures,
          // and Glimmer-compatibility "could not find / capabilities / not in
          // scope" diagnostics all need to surface to the host renderer's
          // try/catch (renderer.ts around `template.render(...)`), which
          // clears the partially-rendered DOM and re-throws to
          // `assert.throws` / Ember's error recovery. Swallowing here would
          // turn user-visible failures into silent successes.
          throw err;
        }
      },
    };

    return template;
  };

  // Add properties to the factory function itself for compatibility
  (templateFactory as any).__gxtCompiled = true;
  (templateFactory as any).moduleName = options?.moduleName || 'gxt-runtime-template';
  (templateFactory as any).id = `gxt-factory-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Cache the result
  templateCache.set(cacheKey, templateFactory);

  return templateFactory;
}

/**
 * Compile a template string at runtime using GXT
 */
export function compileTemplate(templateString: string, options?: any) {
  return precompileTemplate(templateString, options);
}

/**
 * Part of the `@ember/template-compilation` surface. A no-op here: templates
 * are compiled by `compileTemplate` above, not by a registered compiler.
 */
export function __registerTemplateCompiler(_compiler: any) {}

/**
 * Ember template compiler interface
 */
export const __emberTemplateCompiler = {
  compile: compileTemplate,
  precompile(templateString: string, options?: any) {
    // For precompile, just return a JSON representation
    // The actual compilation happens at runtime
    return JSON.stringify({
      source: templateString,
      moduleName: options?.moduleName,
      isGxt: true,
    });
  },
};

// Deliberate external surface (see the `withRootContext` pipeline-member doc):
// an out-of-package FastBoot/SSR driver that cannot import `@ember/-internals`
// reaches the per-request root-context runner through this global.
(globalThis as any).__gxtWithRootContext = _gxtWithRootContext;

// Contribute compile.ts-owned function references to the bridge's
// `compilePipeline` namespace. These functions cannot live in manager.ts
// because they close over compile.ts module-local state:
//   - `registerObjectValueOwner` / `registerArrayOwner` close over
//     `_objectValueCellMap` / `_arrayOwnerMap`
//   - `_gxtResetIntervalBudget` closes over `_intervalSyncBudget`
//   - moving `compileTemplate` into manager.ts would create a circular import
//     (the very cycle the bridge exists to avoid).
//
// Runs AFTER manager.ts's initial `setGxtRenderer` (manager.ts module init is
// eager and runs before this file's bottom, because consumers of this file's
// `template`/`compile` exports must already have manager.ts loaded transitively
// for the renderer to work at all).
import {
  installCompilePipelinePart,
  assertCompilePipelineInstalled,
  installRenderPassPart,
  installBacktrackingPart,
  installViewUtilsPart,
} from './gxt-bridge';
// Expose `registerObjectValueOwner` to glimmer-next so its reactive attribute /
// inside-element bindings can register the LEAF object a binding's source cell
// holds (e.g. `nullObject` for `this.nullObject.message`) as a value-owner —
// making `set(nullObject,'message',...)` reach the cell via the SyncCore reverse
// lookup. The compilePipeline bridge method is not visible to glimmer-next core,
// so a host hook is the seam.
_gxtRegisterHostHooks({
  registerObjectValueOwner,
  // `registerHostHooks` merges per-key, so this does not clobber the
  // `registerObjectValueOwner` above (or any later registration).
  //
  // Flag each `{{#each}}` rowCtx (a plain object) as an association anchor and
  // register its pre-destroy destructor. Skip `{{#if}}`/`{{#unless}}` branch
  // ctxs (IfCondition class instances) by the prototype discriminator.
  onRowContextCreated: (ctx: object) => {
    const isEachRow = Object.getPrototypeOf(ctx) === Object.prototype;
    if (!isEachRow) return; // IfCondition branch scope — branch-swap teardown rides onConditionBranchSwap below
    _gxtEachRowCtxSet.add(ctx);
    _gxtRowCtxInstances.set(ctx, new Set());
    _gxtRegisterDestructor(ctx, () => _gxtFireRowPreDestroy(ctx));
  },
  // {{#if}}/{{#unless}} branch class-helper teardown. gxt fires this once per
  // branch RENDER with a fresh `branchCtx` and `meta = { if, value }`, and runs
  // that ctx's destructors at the START of the OUTGOING branch's teardown
  // (pre-DOM-removal) — so a destructor registered here reaps the branch's
  // class-based helpers at the Ember-correct moment. The per-branch
  // helper-capture Sets are stashed on the IfCondition by `patchGlobalIf`; read
  // them LAZILY in the destructor (the initial-render hook can fire during
  // `origIf(...)` construction, before the Sets are attached). For the TRUE
  // branch, also snapshot the class-helper cache at hook-fire time (before the
  // branch body renders) so the destructor can reap helpers created in
  // deferred formulas outside `wrapBranch`'s dynamic scope.
  onConditionBranchSwap: (branchCtx: object, meta: { if?: object; value?: boolean }) => {
    const ifc = meta?.if as any;
    const isTrue = !!meta?.value;
    const snap = isTrue ? _gxtSnapshotClassHelperCacheKeys() : null;
    _gxtRegisterDestructor(branchCtx, () => {
      const scope = ifc && (isTrue ? ifc.__gxtTrueBranchHelpers : ifc.__gxtFalseBranchHelpers);
      if (scope) _gxtDestroyHelperScope(scope);
      if (isTrue) _gxtDestroyNewClassHelperCacheEntriesSince(snap);
    });
  },
});
installCompilePipelinePart({
  compileTemplate: compileTemplate,
  resetIntervalBudget: _gxtResetIntervalBudget,
  registerArrayOwner: registerArrayOwner,
  registerObjectValueOwner: registerObjectValueOwner,
  // Associate a new instance with the currently-rendering `{{#each}}` row
  // (closure over `_gxtCurrentRowCtx`).
  captureRowInstance: _gxtCaptureRowInstance,
  // Canonical `triggerReRender` + the two chain-aware host-hook registration
  // methods (`addBeforeTriggerReRender` / `addAfterTriggerReRender`). The
  // globalThis writer is also retained for dual exposure so the save-restore
  // suppression sites (validator.ts, manager.ts) that swap the global slot keep
  // working.
  triggerReRender: _gxtTriggerReRender,
  addBeforeTriggerReRender: _gxtAddBeforeTriggerReRender,
  addAfterTriggerReRender: _gxtAddAfterTriggerReRender,
  // Save-restore helper for the trigger-suppression sites (validator.ts track()
  // reentrancy guard, manager.ts first-render suppression).
  withTriggerSuppressed: _gxtWithTriggerSuppressed,
  // Save-restore helper + read predicate for the "in trigger-rerender" flag.
  // The predicate serves `metal/computed.ts`'s CP.get re-entrance guard; the
  // cross-package writer in `metal/property_events.ts` uses the wrapper.
  withInTriggerReRender: _gxtWithInTriggerReRender,
  isInTriggerReRender: _gxtIsInTriggerReRender,
  // Read predicate for the render-pass depth counter (`_renderPassDepth`); used
  // by `glimmer/lib/renderer.ts` to decide whether to suppress text-effect
  // creation during nested renderComponent calls.
  isRendering: _gxtIsRendering,
  // Save-restore wrapper around the render-pass depth counter, used by the
  // cross-package renderComponent wraps. Preserves the depth counter,
  // drain-on-1→0 semantics, and re-entrancy contract.
  withRendering: _gxtWithRendering,
  // Read predicate for the "syncing" flag (the post-runTask DOM sync flush);
  // read by the `@ember/object/core.ts` DEBUG proxy-trap and several
  // non-proxy-trap readers.
  isSyncing: _gxtIsSyncing,
  // Save-restore wrapper for the "syncing" flag, taking the new value as an
  // argument. The cross-package `manager.ts` post-render-hook re-entry calls it
  // with `value=false` to bypass the re-entrancy guard on the nested
  // `_gxtSyncDomNow` invocation.
  withSyncing: _gxtWithSyncing,
  // Save-restore wrapper + read predicate for the "currently rendering" flag
  // (distinct from the render-pass depth counter). The writer is manager.ts's
  // `wrapHandler`; the reader is validator.ts's `_scheduleNativeCollectionFlush`.
  withCurrentlyRendering: _gxtWithCurrentlyRendering,
  isCurrentlyRendering: _gxtIsCurrentlyRendering,
  // Mark+consume surface for the "tracked set since rerender" flag: set by
  // ember-gxt-wrappers.ts's BEFORE-trigger-rerender hook, read+cleared by its
  // UpdatingVM.execute patch (which forces `alwaysRevalidate=true` when set).
  markTrackedSetSinceRerender: _gxtMarkTrackedSetSinceRerender,
  consumeTrackedSetSinceRerender: _gxtConsumeTrackedSetSinceRerender,
  // Read-only accessor for the monotonic sync-cycle counter (incremented once
  // per `_gxtSyncDomNow` flush by the intra-file `_gxtIncrementSyncCycleId`).
  getSyncCycleId: _gxtGetSyncCycleId,
  // Read predicate for the "sync is property-driven" flag, read by manager.ts's
  // `_gxtDestroyUnclaimedPoolEntries` destroy-error capture gate.
  isSyncIsPropertyDriven: _gxtIsSyncIsPropertyDriven,
  // Paired get/set for the "had pending sync" flag.
  getHadPendingSync: _gxtGetHadPendingSync,
  setHadPendingSync: _gxtSetHadPendingSync,
  // Paired get/set for the "pending sync from property change" flag.
  getPendingSyncFromPropertyChange: _gxtGetPendingSyncFromPropertyChange,
  setPendingSyncFromPropertyChange: _gxtSetPendingSyncFromPropertyChange,
  // Paired get/set for the master "DOM sync pending" flag; module code uses the
  // module-local helpers.
  getPendingSync: _gxtGetPendingSync,
  setPendingSync: _gxtSetPendingSync,
  getBlockParamsStack: () => blockParamsStack,
  getContextBlockParams: () => contextBlockParams,
  getSlotsContextStack: () => slotsContextStack,
  setCurrentSlotParams: (params) => {
    currentSlotParams = params;
  },
  getBuiltinHelpers: () => _emberBuiltinHelpers,
  subscribeCell: _gxtSubscribeCellFn,
  eachItemRawFor: _gxtEachItemRawFor,
  // Paired get/set for the "run task active" flag, written by the test helpers
  // and read together with the pending-sync flag in the `_backburner` end gate
  // (renderer.ts) and the runloop `onEnd` hook.
  getRunTaskActive: _gxtGetRunTaskActive,
  setRunTaskActive: _gxtSetRunTaskActive,
  // Paired get/set for the "after-render property change" detector flag, set by
  // `_gxtTriggerReRender` inside an `afterRender` callback and read+cleared by
  // `runAppend` in the test helpers.
  getAfterRenderPropertyChange: _gxtGetAfterRenderPropertyChange,
  setAfterRenderPropertyChange: _gxtSetAfterRenderPropertyChange,
  // Paired get/set for the "in after-render" gate flag, written by the
  // `gxtAfterRenderWrapper` in `@ember/runloop` and read by `_gxtTriggerReRender`.
  getInAfterRender: _gxtGetInAfterRender,
  setInAfterRender: _gxtSetInAfterRender,
  // Paired get/set for the "destroy-reattach in progress" flag, written in
  // manager.ts + compile.ts around the destroy-phase reattach loop and read by
  // the `<ember-outlet>` `connectedCallback` guard.
  getDestroyReattachInProgress: _gxtGetDestroyReattachInProgress,
  setDestroyReattachInProgress: _gxtSetDestroyReattachInProgress,
  // Get-only accessor for the engine-instance Map cache (`<ember-mount>` adds
  // engines through it).
  getEngineInstances: _gxtGetEngineInstances,
  // Read predicate + TRUE-for-body save-restore wrapper for the
  // "suppress dirty in rcSet" flag. The reader is `validator.ts`'s
  // `classicDirtyTagForGuarded` gate; the writers are manager.ts's `_rcSet` arg
  // dispatch + arg-changed sync.
  isDirtyInRcSetSuppressed: _gxtIsDirtyInRcSetSuppressed,
  withSuppressDirtyInRcSet: _gxtWithSuppressDirtyInRcSet,
  // Paired get/set for the "had nested object change" flag. Written inside
  // `_gxtTriggerReRender`'s nested-object-change detection (and manager.ts's
  // helper-recompute); read by `_gxtForceEmberRerender`'s morph-fallback gate.
  getHadNestedObjectChange: _gxtGetHadNestedObjectChange,
  setHadNestedObjectChange: _gxtSetHadNestedObjectChange,
  // Get-only accessor for the `_tagHelperInstanceCache` Map (holds
  // `{ instance, recomputeTag }` entries for tag-helpers created in `$_tag` so
  // they survive force-rerenders). Read by ember-gxt-wrappers.ts's
  // `_tagDirtySentinel.lastArgsSer` setter to propagate classic-tag dirties.
  getTagHelperInstanceCache: () => _tagHelperInstanceCache,
  // The canonical per-test GXT-state-reset routine, called from the
  // internal-test-helpers `afterEach` hooks.
  cleanupActiveComponents: _gxtCleanupActiveComponents,
  // Save-restore wrapper + read predicate for the "in outlet render" flag.
  // The writer is `glimmer/lib/templates/root.ts`'s outlet-render path; the
  // reader is manager.ts's `_buildRenderTree`.
  withInOutletRender: _gxtWithInOutletRender,
  isInOutletRender: _gxtIsInOutletRender,
  // Set/get for the captured top-outlet ref. Written after the outlet-render
  // block in root.ts; read by manager.ts's `_buildRenderTree` outlet branch and
  // renderer.ts's OutletView re-render fallback. (Companion to the
  // in-outlet-render flag — one outlet-render state cluster.)
  setTopOutletRef: _gxtSetTopOutletRef,
  getTopOutletRef: _gxtGetTopOutletRef,
  // Read accessor for the captured "current helper scope", which
  // `patchGlobalIf`/`wrapBranch` set around branch evaluation. Read by
  // ember-gxt-wrappers.ts's `$_maybeHelper` paths to wire fresh helper
  // instances to the enclosing `{{#if}}` branch's teardown set.
  getCurrentHelperScope: _gxtGetCurrentHelperScope,
  // Save-restore wrapper + read predicate for the "is force-rerender" flag.
  // Written around `classicRoot.render()` in renderer.ts; read by many gates
  // across the gxt-backend package and renderer/root.
  withForceRerender: _gxtWithForceRerender,
  isForceRerender: _gxtIsForceRerender,
  // Root outlet-rerender dispatcher: root.ts registers the dispatcher closure
  // via `setRootOutletRerender`; manager.ts registers the `render.outlet`
  // instrumentation wrap via `setRootOutletRerenderWrap`; renderer.ts,
  // views/outlet.ts, and root.ts read it via `getRootOutletRerender`.
  setRootOutletRerender: _gxtSetRootOutletRerender,
  getRootOutletRerender: _gxtGetRootOutletRerender,
  setRootOutletRerenderWrap: _gxtSetRootOutletRerenderWrap,
  // Set/get for the "skip text effects" flag. Written around each
  // renderComponent template render in renderer.ts; read by the intra-file
  // `$_text` reactive-binding setup to gate `gxtEffect` creation.
  setSkipTextEffects: _gxtSetSkipTextEffects,
  getSkipTextEffects: _gxtGetSkipTextEffects,
  // The `_gxtHelperInstances` destroy-tracking array, exposed as set/get + a
  // separate `pushHelperInstance` mutator. The collection identity is stable
  // (contents mutated by push + length=0). `pushHelperInstance` fires the
  // optional registered push-hook (set by manager.ts via
  // `setHelperInstancePushHook(_installHelperRecomputeBridge)` to install the
  // classic-helper-recompute GXT bridge) BEFORE the array push. Cross-file
  // pushes (ember-gxt-wrappers.ts) and iterate-destroy readers (manager.ts's
  // `_gxtDestroyTrackedInstances`, the test helpers) route through the bridge;
  // the optional chain short-circuits before this module's
  // `installCompilePipelinePart` runs, and the push-hook is registered by
  // manager.ts after that point, so by render time the hook is installed.
  getHelperInstances: _gxtGetHelperInstances,
  pushHelperInstance: _gxtPushHelperInstance,
  setHelperInstancePushHook: _gxtSetHelperInstancePushHook,
  // Paired accessors for the module-local `_gxtRootContext` binding; module
  // code reads the binding directly.
  getRootContext: _getGxtRootContext,
  setRootContext: _setGxtRootContext,
  // SSR: the synchronous per-root save/swap/restore runner (see
  // `withRootContext`); no browser-path caller. It is also published on
  // `globalThis.__gxtWithRootContext` so an out-of-package SSR driver that
  // cannot import `@ember/-internals` can reach it — a deliberate external
  // surface.
  withRootContext: _gxtWithRootContext,
  // Get-only accessor (with internal lazy-init) for the canonical
  // `_gxtComponentContexts` WeakMap; module code (and the test-teardown reset
  // via `_resetGxtComponentContexts`) uses the module-local helpers.
  getComponentContextsMap: _getOrCreateGxtComponentContexts,
  // The canonical sync-pipeline flush function (the 16ms setInterval calls
  // `_gxtSyncDomNow` directly).
  syncDomNow: _gxtSyncDomNow,
  // manager.ts and ember-gxt-wrappers.ts cannot import glimmer/lib/helper.ts
  // or the template-only module (both import the manager shim), so they read
  // the tag and test definitions through here.
  getHelperRecomputeTag: (instance: object) => (instance as any)[RECOMPUTE_TAG],
  isTemplateOnlyDefinition: (value: unknown) => value instanceof TemplateOnlyComponentDefinition,
});
// manager.ts calls these members without a fallback.
assertCompilePipelineInstalled([
  'getHelperRecomputeTag',
  'isTemplateOnlyDefinition',
  'withSyncing',
  'withSuppressDirtyInRcSet',
  'isSyncIsPropertyDriven',
  'isInOutletRender',
  'syncDomNow',
]);

// Host hook that runs at the start of every `beginRenderPass` call, BEFORE
// manager.ts clears its template-rendered set.
installRenderPassPart({
  beforeBeginRenderPass: _resetTemplateOnlyState,
});

// `{{mount}}` compiles to `<ember-mount>`; define it with the rest of the
// runtime so every compat build (not only the test page) has it.
defineEmberMountElement();
defineEmberOutletElement();

// Host hook that runs inside manager.ts's `checkBacktracking` body,
// transforming the assembled assertion message before it reaches `_assertFn`.
installBacktrackingPart({
  transformBacktrackingMessage: _rebuildBacktrackingMsgWithTemplateOnly,
});

// Host hook that runs AFTER manager.ts's `rebuildViewTreeFromDom` body
// completes, dispatched by the `_gxtBridgeRebuildViewTreeFromDom` adapter in
// manager.ts.
installViewUtilsPart({
  afterRebuildViewTreeFromDom: _afterRebuildViewTreeFromDom,
  // Exposes `_wrapperIfUserFalse` to manager.ts (restores `isExpanded = false`
  // on freshly-constructed component instances whose wrapper id was
  // user-toggled false).
  getWrapperUserFalseSet: () => _wrapperIfUserFalse,
  // Host hook that runs AFTER manager.ts's `flushAfterInsertQueue` body
  // completes, dispatched by the `_gxtBridgeFlushAfterInsertQueue` adapter in
  // manager.ts (the in-element deferred-render drain).
  afterFlushAfterInsertQueue: _afterFlushAfterInsertQueue,
});
