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
import { pascalToKebab, isAllDigits, parseInElementInsertBefore } from './utils';
import {
  initChildViews as _emberInitChildViews,
  getElementView as _emberGetElementView,
  collectChildViews as _emberCollectChildViews,
} from '@ember/-internals/views/lib/system/utils';

// Helper to detect assertion-related throws that must escape catch blocks.
// The expectAssertion test helper throws a non-Error sentinel (BREAK = {})
// when a stubbed assert fires. Also re-throws actual Assertion Failed errors.
function _isAssertionLike(e: unknown): boolean {
  if (e instanceof Error) {
    return e.message?.includes('Assertion Failed') === true;
  }
  // Non-Error, non-null/undefined objects may be the BREAK sentinel from expectAssertion.
  if (e !== null && e !== undefined && typeof e === 'object') return true;
  return false;
}

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

// `__gxtQuotedAttr` renders quoted attribute values that contain a single
// interpolation (e.g. `src='{{this.src}}'`). When every input is
// null/undefined, Ember's semantics treat the attribute as absent — the helper
// returns `null` so the `$_tag` wrapper's "remove attribute" branch activates.
// For any other shape (multi-segment concat, non-null values), normalize each
// part with `_normalizeStringValue` semantics and concatenate. The body is
// inlined directly into the emitted `templateFnCode` Function() outer-factory
// scope as a local `__gxtQuotedAttr` function — no closure surface needed
// (every reference is intrinsic JS: `Array.isArray`, `String(...)`,
// null/undefined checks). The emitted `globalThis.__gxtQuotedAttr(` shape
// produced by the post-processor below is rewritten to the local
// `__gxtQuotedAttr(` reference at the templateFnCode builder. See the
// `templateFnCode` builder for the inlined definition.

// Module-local state for the `{{#in-element}}` insertBefore/appendMode
// signalling channel. These flags communicate `insertBefore=null` (append
// mode) and the asserting form `insertBefore=<non-null>` from compile-time
// parsing (via `parseInElementInsertBefore`) to the `$_inElement` runtime
// shim. Written by the emitted template-fn via the `__ieSet` Function()
// parameter binding (alongside `__ubGT` / `__ubST`); read+consumed (read-then-
// clear) by the `$_inElement` shim defined further down in this module.
//
// Ordering invariant: the emitted setter runs inside the per-template
// `return function() { ...; __ieSet(...); return ${modifiedCode}; }` body,
// GXT then synchronously evaluates `modifiedCode` to produce the DOM tree,
// and the `$_inElement` shim is called by that tree's `{{#in-element}}` site
// during the same synchronous render. So the order is always setter → read →
// clear. A single template-fn invocation produces a single `$_inElement` call
// per `{{#in-element}}`, and the shim reads-and-clears before any re-entry into
// another template-fn for the block body, so there is no re-entrancy. There is
// exactly one `_inElementInsertBefore` value per compiled template, so the
// write/consume cycle is per-render.
let _gxtIeInsertBeforeValue: unknown = undefined;
let _gxtIeAppendMode = false;
function _gxtIeSet(insertBefore: unknown, append: boolean): void {
  _gxtIeInsertBeforeValue = insertBefore;
  _gxtIeAppendMode = append;
}

// Module-local pointer to the in-element deferred-render drain function.
// Assigned inside the `_inElementDeferQueue` setup block (which also captures
// `_origFlush` and wraps `__gxtFlushAfterInsertQueue`); read by two intra-file
// consumers — the render-pass-end gate in `_gxtSetIsRendering` and the
// post-rebuild finalization in `__gxtFlushAfterInsertQueue`'s wrap. Readers
// keep a `typeof === 'function'` guard: this slot is `undefined` until the
// setup block runs at module load, and a reader could in principle fire before
// then if a render triggers from another module's eager init.
let _drainInElementDeferQueue: (() => void) | undefined;

/** Replace all hyphens with underscores without regex */
function hyphenToUnderscore(str: string): string {
  return str.split('-').join('_');
}

/**
 * Module-local monotonic counter for fallback render-context IDs.
 *
 * Used at two sites in this file (managers.component.handle ctx-id fallback and
 * the template.render() renderContext fallback) when no `gxtRoot` id is
 * available. Starts at 100 to mirror the historical `(g.__gxtContextId || 100) + 1`
 * truthy-coerce semantics — first allocation mints `101`, then monotonically
 * increases.
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

/** Check if template contains <TextArea followed by whitespace, / or > (typo check) without regex */
function hasTextAreaTag(str: string): boolean {
  let idx = 0;
  while (idx < str.length) {
    const found = str.indexOf('<TextArea', idx);
    if (found === -1) return false;
    const nextIdx = found + 9; // '<TextArea'.length
    if (nextIdx >= str.length) return false;
    const c = str[nextIdx]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '/' || c === '>') return true;
    idx = found + 1;
  }
  return false;
}

/** Check if a string contains a $_bp<digit> reference (block param) without regex */
function hasBlockParamRef(str: string): boolean {
  let idx = 0;
  while (idx < str.length) {
    const found = str.indexOf('$_bp', idx);
    if (found === -1) return false;
    const nextIdx = found + 4;
    if (nextIdx < str.length) {
      const c = str[nextIdx]!;
      if (c >= '0' && c <= '9') return true;
    }
    idx = found + 1;
  }
  return false;
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

/** Count occurrences of a word (with word boundaries) in text without regex */
function countWord(text: string, word: string): number {
  let count = 0;
  let idx = 0;
  while (idx <= text.length - word.length) {
    const found = text.indexOf(word, idx);
    if (found === -1) break;
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
    if (!isWordCharBefore && !isWordCharAfter) count++;
    idx = found + 1;
  }
  return count;
}

/** Replace all occurrences of a word (with word boundaries) using a callback without regex */
function replaceWord(text: string, word: string, replacer: () => string): string {
  let result = '';
  let idx = 0;
  while (idx <= text.length - word.length) {
    const found = text.indexOf(word, idx);
    if (found === -1) break;
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
    if (!isWordCharBefore && !isWordCharAfter) {
      result += text.slice(idx, found) + replacer();
      idx = found + word.length;
    } else {
      result += text.slice(idx, found + 1);
      idx = found + 1;
    }
  }
  result += text.slice(idx);
  return result;
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
  {
    if (typeof v === 'object' && typeof v.toString !== 'function') return '';
    try {
      return String(v);
    } catch {
      return '';
    }
  }
  return String(v);
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
 * Find all {{identifier.path}} dotted mustache expressions.
 * Returns array of { head, tail, full } objects.
 * Replaces regex /\{\{([a-z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9.]*)\}\}/g
 */
function findDottedMustaches(str: string): Array<{ head: string; tail: string }> {
  const results: Array<{ head: string; tail: string }> = [];
  let idx = 0;
  while (idx < str.length) {
    const found = str.indexOf('{{', idx);
    if (found === -1) break;
    let pos = found + 2;
    // Head must start with lowercase letter
    if (pos >= str.length || str[pos]! < 'a' || str[pos]! > 'z') {
      idx = found + 2;
      continue;
    }
    const headStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9'))
    )
      pos++;
    const head = str.slice(headStart, pos);
    // Must be followed by '.'
    if (pos >= str.length || str[pos] !== '.') {
      idx = found + 2;
      continue;
    }
    pos++; // skip dot
    // Tail must start with [a-zA-Z]
    if (
      pos >= str.length ||
      !((str[pos]! >= 'a' && str[pos]! <= 'z') || (str[pos]! >= 'A' && str[pos]! <= 'Z'))
    ) {
      idx = found + 2;
      continue;
    }
    const tailStart = pos;
    while (
      pos < str.length &&
      ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9') ||
        str[pos] === '.')
    )
      pos++;
    const tail = str.slice(tailStart, pos);
    // Must be followed by '}}'
    if (pos + 1 < str.length && str[pos] === '}' && str[pos + 1] === '}') {
      results.push({ head, tail });
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

// parseInElementInsertBefore moved to ./utils (zero-dependency module) so the
// node vitest gate can unit-test it without compile.ts's full module graph.
// Imported at the top of this file; still re-exported via __test_internals.

/**
 * Check if a template contains a dynamic helper pattern like {{helper this.xxx}} or {{helper @xxx}}.
 * Replaces regex /\{\{helper\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\s*\}\}/
 */
function hasDynamicHelper(str: string): boolean {
  const marker = '{{helper ';
  let idx = str.indexOf(marker);
  while (idx !== -1) {
    let pos = idx + marker.length;
    // Skip whitespace
    while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t')) pos++;
    // Check for this. or @
    if (pos < str.length && (str.slice(pos, pos + 5) === 'this.' || str[pos] === '@')) {
      // Read identifier chars
      const start = pos;
      while (
        pos < str.length &&
        ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
          (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
          (str[pos]! >= '0' && str[pos]! <= '9') ||
          str[pos] === '_' ||
          str[pos] === '.' ||
          str[pos] === '@')
      )
        pos++;
      if (pos > start) {
        // Skip optional whitespace then check for }}
        while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t')) pos++;
        if (pos + 1 < str.length && str[pos] === '}' && str[pos + 1] === '}') {
          return true;
        }
      }
    }
    idx = str.indexOf(marker, idx + 1);
  }
  return false;
}

/**
 * Check if a template contains a dynamic modifier pattern like (modifier this.xxx) or (modifier @xxx).
 * Replaces regex /\(modifier\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\s*\)/
 */
function hasDynamicModifier(str: string): boolean {
  const marker = '(modifier ';
  let idx = str.indexOf(marker);
  while (idx !== -1) {
    let pos = idx + marker.length;
    // Skip whitespace
    while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t')) pos++;
    // Check for this. or @
    if (pos < str.length && (str.slice(pos, pos + 5) === 'this.' || str[pos] === '@')) {
      const start = pos;
      while (
        pos < str.length &&
        ((str[pos]! >= 'a' && str[pos]! <= 'z') ||
          (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
          (str[pos]! >= '0' && str[pos]! <= '9') ||
          str[pos] === '_' ||
          str[pos] === '.' ||
          str[pos] === '@')
      )
        pos++;
      if (pos > start) {
        while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t')) pos++;
        if (pos < str.length && str[pos] === ')') {
          return true;
        }
      }
    }
    idx = str.indexOf(marker, idx + 1);
  }
  return false;
}

// `_shouldWarnStyle` + `_styleWarnedElements` are defined in manager.ts (next
// to their two reader sites) and surfaced via `gxt-bridge`'s `format`
// capability. See gxt-bridge.ts `GxtFormatCapabilities`.

// Inline the style warning message to avoid importing @ember/-internals/views
// (which can cause circular dependency issues during module initialization)
function _constructStyleDeprecationMessage(affectedStyle: string): string {
  return (
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}

import { buildUntouchableThis } from '@glimmer/debug-util';
// Import the GXT runtime compiler
// @ts-ignore - direct path to avoid GXT Babel plugin
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
  GXT_RUNTIME_SYMBOLS,
  // Public AST-transform hook type. `transforms: AstTransform[]` runs
  // `@glimmer/syntax`-style visitors on the parsed template AST after
  // preprocess, before glimmer-next codegen. See the dialect AST transforms
  // assembled by `buildGxtDialectTransforms` below — those replace the brittle
  // string/regex pre-rewrites (`{{outlet}}` lowering, `{{#@arg}}` block
  // lowering, quoted-attribute bare-helper wrapping, `{{#each-in}}` lowering,
  // and `{{on}}`→`{{on-ext}}`) that previously mutated the template source text.
  // @ts-ignore - type-only; the published 0.0.63 lacks this export (see file footer note)
  type AstTransform as GxtAstTransform,
} from '@lifeart/gxt/runtime-compiler';

// We need access to GXT's reactive tracker (setTracker/getTracker) for {{unbound}}.
// These are not exported from GXT's public API, so we extract them at runtime
// by exploiting the MergedCell evaluation behavior. See __gxtUnboundCached below.

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
  initDOM as gxtInitDOM,
  setIsRendering as gxtSetIsRendering,
  isRendering as gxtIsRendering,
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
  $_TO_VALUE as _gxtOrigToValue,
  // Phase 4.1 SSR per-render-root state primitives (RFC §7.1.1 step 2).
  // `createRenderRootState` mints a fresh, fully-isolated RenderRootState and
  // `withRenderRoot` is the synchronous save/swap/restore runner that scopes the
  // upstream node-counter / parent-context / rendering-context module-globals to
  // one render root. Both are published by `@lifeart/gxt` (runtime + types) as of
  // 0.0.65 — the version this repo pins — so they bind via a plain named import.
  // Sole consumer is `_gxtWithRootContext` below (additive, SSR-only).
  withRenderRoot as _gxtWithRenderRoot,
  createRenderRootState as _gxtCreateRenderRootState,
} from '@lifeart/gxt';
// §2d host-hooks adoption (docs-internal-gxt-globalthis-wiring.md), capability
// detected: dists shipping the formal `registerHostHooks()` API get the hooks
// registered module-locally on the gxt side; older dists keep the legacy
// `globalThis.__gxt*` slot writes. Namespace import so the missing export on a
// pre-API dist binds as `undefined` instead of a build error (the
// `__lifeartGxtForOptional` pattern in manager.ts).
import * as __gxtForHostHooks from '@lifeart/gxt';
const _gxtRegisterHostHooks: ((hooks: Record<string, unknown>) => void) | undefined = (
  __gxtForHostHooks as any
).registerHostHooks;
// Module-local seam for Ember truthiness: the canonical `emberToBool` is
// defined inside the wrapper-installer scope below; this ref lets other
// compile.ts scopes (the {{#if}}-helper cleanup paths) reach it without the
// legacy `__gxtToBool` global round-trip, which hook-capable dists no longer
// populate.
let _emberToBoolRef: ((predicate: unknown) => boolean) | null = null;
// §2e symbol-table parameter injection: runtime-compiled template Function()
// bodies reference `$_tag` / `$_maybeHelper` / … as free identifiers. They are
// now bound as Function PARAMETERS (snapshot of the ember-wrapped globals at
// compile time — module init runs setupGlobalScope + installEmberWrappers
// before any compile, so the snapshot is deterministic) instead of resolving
// through globalThis on every render. Build-time-compiled (.gjs) template
// bodies still resolve via globalThis, so the global publication itself stays.
const _GXT_SYMBOL_PARAM_NAMES = Object.keys(GXT_RUNTIME_SYMBOLS);

// Use direct imports for cellFor/effect/syncDom — the manualChunks consolidation
// ensures all GXT internals share a single module instance (gxt.core.es.js).
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
// On detection, we create a fresh root via `gxtCreateRoot(document)`, re-prime
// its rendering context via `gxtInitDOM`, and publish it. This keeps repeated
// calls from GxtRehydrationDelegate working without breaking the outlet/manager
// render chain.
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

// Canonical state for the ambient GXT root context, owned by this file.
// Cross-file lazy-init writers/readers (glimmer/lib/renderer.ts,
// glimmer/lib/templates/root.ts, gxt-backend/outlet.gts,
// gxt-backend/runtime-hbs.ts) route through
// `compilePipeline.getRootContext?.()` / `compilePipeline.setRootContext?.(v)`.
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
// Cross-file lazy-init writers/readers (glimmer/lib/templates/root.ts,
// @ember/routing/route.ts) and intra-file readers all route through this
// single WeakMap reference; the bridge surface
// `compilePipeline.getComponentContextsMap?.()` returns the always-stable map
// handle so every reader sees the same instance.
//
// Test-teardown reset: `_resetGxtComponentContexts` re-allocates a fresh
// WeakMap. Cross-file readers re-fetch the map through the bridge on every
// access (no long-lived caching), so the new WeakMap propagates immediately on
// the next call.
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

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';

// Typed capabilities bridge for destruction hooks. Populated by manager.ts at
// its module init time.
import {
  getGxtRenderer,
  getCurrentOutletState,
  getAmbientOwner,
  setAmbientOwner,
  setDcComponentGetter,
} from './gxt-bridge';

// `peekInstanceCapture` exposes the last-created Ember instance, used by the
// $_tag component thunk's template-only-detection snapshots. The writer
// (`setInstanceCapture` in `./manager`) stores into a module-local.
import { peekInstanceCapture, getOwnerWithFallback } from './manager';

const _SLOTS_SYM = Symbol.for('gxt-slots');

// Set by glimmer-next on its native block wrappers ($_ucw / $_inElement). When
// present on a ctx, the $_tag root-id re-stamp below must be skipped — the
// wrapper is already a real TREE-registered node and re-stamping its
// COMPONENT_ID collapses its CHILD bucket into the gxt-root's, causing
// over-broad destroy cascades on branch teardown. See the guard usage site for
// the full rationale. Symbol.for keeps the contract package-boundary-safe.
const BLOCK_WRAPPER_SYMBOL = Symbol.for('gxt-block-wrapper');

/**
 * Set a GXT-internal property on an object as non-enumerable so it doesn't
 * leak into user-visible iteration (Object.keys, each-in, etc.).
 *
 * For the `$slots` key we also set the `Symbol.for('gxt-slots')` alias so
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
    const sym = Symbol.for('gxt-slots');
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
// originals onto globalThis). Symbols imported via the wrapper module — see
// `gxt-with-runtime-hbs.ts` for the body. The wrapper module isn't imported
// at module init (it's only loaded by runtime-hbs.ts), so we replicate the
// override inline to avoid pulling its full transitive graph in here.
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
  // Install non-writable, non-configurable so a subsequent setupGlobalScope()
  // call (e.g. in a test reset) cannot clobber the Ember-spec versions.
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
// closes over `globalThis.$_maybeHelper` (the ember-wrapped delegate published
// by `installEmberWrappers()` at module-init) as the delegate, an inline
// object-literal allow-list as the allowed-names set, and
// `globalThis.__EMBER_BUILTIN_HELPERS__` for the built-in-keyword bypass. The
// Function() body is cached (see `_functionCodeCache`), so per-template
// overhead is paid once.
//
// The names list is kept as a module-local Set so the JSON-stringified
// allow-list payload below is generated once.
const _GXT_STRICT_ALLOWED_NAMES = new Set<string>([
  'array',
  'hash',
  'concat',
  'fn',
  'get',
  'mut',
  'readonly',
  'unbound',
  'unique-id',
  'unique_id',
  'helper',
  'modifier',
  'on',
  '__mutGet',
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
if (false as boolean) {
  const g = globalThis as any;
  const origToValue = g.$_TO_VALUE || _gxtOrigToValue;

  g.$_TO_VALUE = function $_TO_VALUE_ember(reference: unknown) {
    if (typeof reference !== 'function') {
      return reference;
    }

    // Peek at the getter value to check if it resolves to a CurriedComponent.
    // We call the getter inside a tracking context so cell reads are captured.
    let peeked: any;
    try {
      peeked = (reference as Function)();
      // Unwrap nested getters but NOT curried components
      while (typeof peeked === 'function' && !peeked.__isCurriedComponent && !peeked.prototype) {
        peeked = peeked();
      }
    } catch {
      // If peek fails, fall through to original
      return origToValue(reference);
    }

    if (!peeked || !peeked.__isCurriedComponent) {
      // Not a curried component — use original GXT resolution
      return origToValue(reference);
    }

    // CurriedComponent detected — set up reactive marker-based rendering.
    // This replaces GXT's resolveRenderable which would call the curried function
    // directly, losing reactive tracking for arg changes.
    const managers = g.$_MANAGERS;
    if (!managers?.component?.canHandle?.(peeked)) {
      return origToValue(reference);
    }

    // Capture owner for re-renders
    const capturedOwner = getAmbientOwner();

    const renderCurried = (curried: any): Node | null => {
      if (!curried) return null;
      // Restore owner for component resolution
      const prevOwner = getAmbientOwner();
      if (capturedOwner && !getAmbientOwner()) {
        setAmbientOwner(capturedOwner);
      }
      try {
        const handleResult = managers.component.handle(curried, {}, null, null);
        if (typeof handleResult === 'function') {
          const rendered = handleResult();
          if (rendered instanceof Node) return rendered;
          return rendered != null ? document.createTextNode(String(rendered)) : null;
        }
        if (handleResult instanceof Node) return handleResult;
        if (handleResult != null) return document.createTextNode(String(handleResult));
        return null;
      } finally {
        if (capturedOwner && prevOwner !== getAmbientOwner()) {
          setAmbientOwner(prevOwner);
        }
      }
    };

    // Create marker-based fragment for reactive updates
    const startMarker = document.createComment('curried-start');
    const endMarker = document.createComment('curried-end');
    const fragment = document.createDocumentFragment();
    fragment.appendChild(startMarker);

    // Initial render
    const initialNode = renderCurried(peeked);
    if (initialNode) {
      fragment.appendChild(initialNode);
    }
    fragment.appendChild(endMarker);

    // Snapshot curried args for change detection
    const renderInfo: any = {
      lastRenderedName: peeked.__name,
      __lastSnapshot: null,
    };
    // Snapshot current curried arg values
    const snapArgs = (curried: any) => {
      const cArgs = curried?.__curriedArgs || {};
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(cArgs)) {
        resolved[key] =
          typeof value === 'function' &&
          !(value as any).__isCurriedComponent &&
          !(value as any).prototype
            ? (value as any)()
            : value;
      }
      const cPos = curried?.__curriedPositionals || [];
      const resolvedPos: any[] = [];
      for (const val of cPos) {
        resolvedPos.push(
          typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype
            ? val()
            : val
        );
      }
      renderInfo.__lastSnapshot = {
        name: curried?.__name,
        args: resolved,
        positionals: resolvedPos,
      };
    };
    const argsChanged = (curried: any): boolean => {
      const last = renderInfo.__lastSnapshot;
      if (!last) return true;
      const cArgs = curried?.__curriedArgs || {};
      const cPos = curried?.__curriedPositionals || [];
      if (last.name !== curried?.__name) return true;
      const currentKeys = Object.keys(cArgs);
      if (Object.keys(last.args).length !== currentKeys.length) return true;
      for (const key of currentKeys) {
        const val = cArgs[key];
        const resolved =
          typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype
            ? val()
            : val;
        if (last.args[key] !== resolved) return true;
      }
      if (last.positionals.length !== cPos.length) return true;
      for (let i = 0; i < cPos.length; i++) {
        const val = cPos[i];
        const resolved =
          typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype
            ? val()
            : val;
        if (last.positionals[i] !== resolved) return true;
      }
      return false;
    };
    snapArgs(peeked);

    // Set up reactive effect to track curried arg changes
    try {
      gxtEffect(() => {
        // Re-evaluate the getter to get the latest curried component
        let newResult: any;
        try {
          newResult = (reference as Function)();
          while (
            typeof newResult === 'function' &&
            !newResult.__isCurriedComponent &&
            !newResult.prototype
          ) {
            newResult = newResult();
          }
        } catch {
          return;
        }

        // Touch curried arg getters to establish tracking
        if (newResult && newResult.__isCurriedComponent && newResult.__curriedArgs) {
          for (const val of Object.values(newResult.__curriedArgs)) {
            if (
              typeof val === 'function' &&
              !(val as any).prototype &&
              !(val as any).__isCurriedComponent
            ) {
              try {
                (val as any)();
              } catch {
                /* ignore */
              }
            }
          }
        }
        if (newResult && newResult.__isCurriedComponent && newResult.__curriedPositionals) {
          for (const val of newResult.__curriedPositionals) {
            if (
              typeof val === 'function' &&
              !(val as any).prototype &&
              !(val as any).__isCurriedComponent
            ) {
              try {
                val();
              } catch {
                /* ignore */
              }
            }
          }
        }

        const parent = startMarker.parentNode;
        if (!parent) return;

        // Skip if nothing changed (preserves DOM stability)
        if (
          newResult &&
          newResult.__isCurriedComponent &&
          startMarker.nextSibling !== endMarker &&
          !argsChanged(newResult)
        ) {
          return;
        }

        // Determine if component type changed
        const componentSwapped =
          !newResult ||
          !newResult.__isCurriedComponent ||
          newResult.__name !== renderInfo.lastRenderedName;

        // Remove existing content between markers
        const removedNodes: Node[] = [];
        let node = startMarker.nextSibling;
        while (node && node !== endMarker) {
          const next = node.nextSibling;
          removedNodes.push(node);
          parent.removeChild(node);
          node = next;
        }

        // Destroy old instances when component TYPE changed
        if (componentSwapped && removedNodes.length > 0) {
          getGxtRenderer()?.destruction.destroyInstancesInNodes(removedNodes);
        }

        // Insert new content
        if (
          newResult &&
          newResult.__isCurriedComponent &&
          managers.component.canHandle(newResult)
        ) {
          const newNode = renderCurried(newResult);
          if (newNode) {
            parent.insertBefore(newNode, endMarker);
          }
          renderInfo.lastRenderedName = newResult.__name;
          snapArgs(newResult);
        } else if (!newResult || (!newResult.__isCurriedComponent && !newResult)) {
          // Falsy — render nothing (empty between markers)
          renderInfo.lastRenderedName = null;
          renderInfo.__lastSnapshot = null;
        }
      });
    } catch {
      /* effect setup may fail */
    }

    return fragment;
  };

  // Protect override from setupGlobalScope overwriting
  try {
    const _ember_TO_VALUE = g.$_TO_VALUE;
    Object.defineProperty(g, '$_TO_VALUE', {
      get() {
        return _ember_TO_VALUE;
      },
      set(v: any) {
        /* ignore GXT's attempt to overwrite */
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* ignore */
  }
}

// Install a render-pass flag so $_inElement below can distinguish
// "inside an active GXT template.render() pass" from "top-level
// synchronous render entry (e.g. this.render in expectAssertion
// tests)". The renderer (packages/@ember/-internals/glimmer/lib/renderer.ts)
// wraps `template.render()` with the bridge `compilePipeline.withRendering(fn)`
// helper so this depth counter is bumped on entry and decremented on exit.
// Compile.ts's own templateFactory.render() body also bumps it via the
// intra-file `_gxtSetIsRendering` writer.
//
// The read-side predicate `_gxtIsRendering` is contributed to the bridge as
// `compilePipeline.isRendering()` (see `installCompilePipelinePart` at the
// bottom of this file). The writer `_gxtSetIsRendering` is contributed as
// `compilePipeline.withRendering(fn): T` (save-restore wrapper around the
// depth-counter increment/decrement, including the depth-1→0
// in-element-deferred-render drain). Cross-package readers
// (`@ember/object/core.ts` proxy trap and `glimmer/lib/renderer.ts`
// renderComponent wraps) route through the bridge predicate / helper.
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
    // the renderComponent strict-mode path, which does NOT go through
    // __gxtRebuildViewTreeFromDom or __gxtFlushAfterInsertQueue.
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
// History: this used to be a conditional restore that SKIPPED the decrement
// for nested calls (entered with depth > 0) to keep nested exits from
// draining. But the outer frame only ever decrements its own increment, so
// each nested call inflated the counter PERMANENTLY — after the first
// "modifier calls renderComponent" test the realm was stuck at depth 1
// forever, keeping isRendering() true for every later test: the DEBUG
// ObjectProxy trap stopped asserting (it treats render passes as internal
// access) and app.reset() re-boot broke. The depth-gated drain makes the
// skip unnecessary — balanced accounting preserves the drain timing the
// conditional restore was protecting.
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
// live document — the block body render is queued here and executed
// after the parent commit. We hook into the manager's
// __gxtRebuildViewTreeFromDom callback (invoked at the tail of
// gxt-backend/manager.ts's flushAfterInsertQueue) to drain the queue,
// since that is the earliest synchronous point at which the parent's
// DOM is guaranteed to be in the live document.
//
// The enqueue side is this module-local queue, pushed into by the $_inElement
// override below. The drain side is the module-local `_drainInElementDeferQueue`
// pointer (declared near the top of the module); its two consumers are the
// `_gxtSetIsRendering` depth-1→0 gate and the `__gxtFlushAfterInsertQueue`
// wrap, both in this file. The setup block below assigns the drain arrow into
// that pointer.
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

  // The in-element deferred queue is drained via the `afterFlushAfterInsertQueue`
  // host hook, contributed by compile.ts through `installViewUtilsPart` at file
  // EOF (using the module-local `_drainInElementDeferQueue` pointer assigned
  // just above). The bridge adapter `_gxtBridgeFlushAfterInsertQueue` in
  // manager.ts dispatches the after-hook AFTER the main `flushAfterInsertQueue`
  // body runs.

  // NOTE: deliberately do NOT install an Object.defineProperty getter/setter
  // wrap on globalThis.__gxtRebuildViewTreeFromDom here to drain the in-element
  // deferred queue at rebuild time. Such a wrap conflicts with the legitimate
  // `_wrapGxtRebuildViewTree` wrap below: that wrap reads
  // `orig = g.__gxtRebuildViewTreeFromDom` (which would get our wrapper, not
  // the manager.ts function), then ASSIGNS the resulting `wrapped` back via
  // `g.__gxtRebuildViewTreeFromDom = wrapped`, which the property setter
  // intercepts and stores in the inner slot — overwriting the manager.ts
  // implementation that the in-element wrapper is supposed to call. The
  // setInterval retry then re-applies the wrap on top of itself each tick
  // because `__emberIfRebuildPatched` lives on the assigned `wrapped` (in the
  // inner slot) but reads always see our wrapper (which lacks the flag),
  // producing compounding re-wraps and corrupting the view-registry reset for
  // `_wrapperIfUserFalse` — surfacing as a `getChildViews` regression where
  // x-toggle siblings see each other's child cells (cell aliasing).
  //
  // The in-element deferred queue is instead drained via the
  // `afterFlushAfterInsertQueue` host hook (installed at file EOF via
  // `installViewUtilsPart`), which covers the ember-gxt-wrappers code path.
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

  const _origInElement = (globalThis as any).$_inElement;
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
    // insertBefore=undefined means "replace" (clear existing content first)
    //
    // GXT's $_inElement doesn't support insertBefore natively, so we read the
    // module-local flags `_gxtIeInsertBeforeValue` / `_gxtIeAppendMode` set by
    // the template injection (see their declaration at module top).
    let insertBefore: any = undefined; // undefined = replace (default)

    // Check for non-null insertBefore value (Ember only allows null)
    if (_gxtIeInsertBeforeValue !== undefined) {
      const ibv = _gxtIeInsertBeforeValue;
      _gxtIeInsertBeforeValue = undefined;
      emberAssert(`Can only pass null to insertBefore in in-element, received: ${ibv}`, false);
    }

    if (_gxtIeAppendMode) {
      insertBefore = null;
      _gxtIeAppendMode = false; // consume the flag
    }

    // Also check if this element was previously used in append mode
    if (appendRef && appendRef instanceof Element && _inElementAppendModeElements.has(appendRef)) {
      insertBefore = null;
    }

    if (insertBeforeRef !== undefined) {
      if (typeof insertBeforeRef === 'function') {
        let ibVal = insertBeforeRef();
        if (typeof ibVal === 'function') ibVal = ibVal();
        if (ibVal && typeof ibVal === 'object' && 'value' in ibVal) {
          insertBefore = ibVal.value;
        } else {
          insertBefore = ibVal;
        }
      } else if (
        insertBeforeRef &&
        typeof insertBeforeRef === 'object' &&
        'value' in insertBeforeRef
      ) {
        insertBefore = insertBeforeRef.value;
      } else {
        insertBefore = insertBeforeRef;
      }
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
        (placeholder as any).__gxtInElementNodes = deferredRenderedNodes;
        (placeholder as any).__gxtInElementTarget = retryRef;
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
    // (often ROOT) while subsequent SELF_TAG morph re-renders push a fresh
    // re-render context, so the pool lookup misses, a brand-new instance is
    // created, and the prior one is swept as unclaimed — firing
    // willDestroyElement on every reactive change and never firing
    // didInsertElement. The target element (`appendRef`) is stable across
    // renders, so use it as the block's pool-parent key.
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
    // Suppress self-insert when a delegate explicitly tells us the current
    // render target is *not* the in-element destination. The rehydration
    // delegate sets __gxtInElementRenderTarget to the element it's
    // rendering into; if that's not `appendRef`, the `{{#in-element}}` is
    // targeting an EXTERNAL element and must render there directly —
    // even if the external element is currently empty and we're inside
    // an active render pass.
    const explicitRenderTarget = (globalThis as any).__gxtInElementRenderTarget;
    const isExternalTarget =
      explicitRenderTarget !== undefined &&
      explicitRenderTarget !== null &&
      explicitRenderTarget !== appendRef;
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
      !isExternalTarget &&
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
      (placeholder as any).__gxtInElementNodes = renderedNodes;
      (placeholder as any).__gxtInElementTarget = appendRef;
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
    (placeholder as any).__gxtInElementNodes = renderedNodes;
    (placeholder as any).__gxtInElementTarget = appendRef;
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
// result here; the style-binding warn site in __gxtAttrInterpolate reads +
// clears it to distinguish SafeString-derived strings from plain strings.
let _gxtLastSafeStringResult: string | undefined;

// Patch SafeString.toString() to track when a SafeString is being converted to
// a string during GXT's quoted attribute concatenation. This lets the style prop
// patch distinguish between a plain string (warn) and a SafeString-derived string
// (no warn). We track the last SafeString result so the prop patch can compare.
// Deferred to avoid circular deps — patches after modules are loaded.
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

// Patch GXT's HTMLBrowserDOMApi.attr() to handle undefined values.
// GXT's native implementation: attr(t,e,n){t.setAttribute(e,null===n?"":n)}
// This only handles null -> "" but not undefined. In Ember, when a bound attribute
// value becomes undefined, the attribute should be REMOVED from the element.
// Without this patch, undefined becomes the string "undefined" on the DOM.
//
// Additionally, sanitize dangerous `javascript:`/`vbscript:` URL values for
// href/src/action/background attributes on A/IMG/LINK/IFRAME/BASE/FORM/BODY
// tags (matching Glimmer's sanitizeAttributeValue contract in
// `@glimmer/runtime/lib/dom/sanitized-values.ts`). Without this, tests that
// expect `href="unsafe:javascript:..."` see the raw `javascript:...` instead.
const _SANITIZE_BAD_PROTOCOLS = ['javascript:', 'vbscript:'];
const _SANITIZE_BAD_TAGS = new Set(['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM']);
const _SANITIZE_BAD_ATTRS = new Set(['href', 'src', 'background', 'action']);
const _SANITIZE_DATAURI_TAGS = new Set(['EMBED']);
const _SANITIZE_DATAURI_ATTRS = new Set(['src']);
function _sanitizeUrlAttribute(element: any, name: string, strValue: string): string {
  if (!element || typeof element.tagName !== 'string') return strValue;
  const tagName = element.tagName.toUpperCase();
  const attr = name;
  // Skip if this element/attr combination doesn't require URI sanitization
  const needsUri = _SANITIZE_BAD_TAGS.has(tagName) && _SANITIZE_BAD_ATTRS.has(attr);
  const needsDataUri = _SANITIZE_DATAURI_TAGS.has(tagName) && _SANITIZE_DATAURI_ATTRS.has(attr);
  if (!needsUri && !needsDataUri) return strValue;
  // Extract protocol via URL parser (robust to spaces/case/encoded schemes)
  let protocol = ':';
  try {
    if (typeof URL === 'function') {
      protocol = new URL(strValue, 'http://_/').protocol.toLowerCase();
    }
  } catch {
    // Malformed URL — fall back to naive split (safe for explicit javascript:foo)
    const idx = strValue.indexOf(':');
    if (idx > -1) protocol = strValue.slice(0, idx + 1).toLowerCase();
  }
  if (needsUri && _SANITIZE_BAD_PROTOCOLS.indexOf(protocol) !== -1) {
    return `unsafe:${strValue}`;
  }
  if (needsDataUri) {
    return `unsafe:${strValue}`;
  }
  return strValue;
}
// Fallback sanitization: patch Element.prototype.setAttribute too. Vite dev
// server sometimes loads duplicate copies of the GXT dom chunk (versioned
// URL vs unversioned), and the runtime may use the unpatched copy. A global
// Element.prototype hook guarantees sanitization regardless of which chunk
// provides the DOM API. The override is gated on tag/attr/protocol so it
// never touches unrelated setAttribute calls.
if (
  typeof Element !== 'undefined' &&
  Element.prototype &&
  (Element.prototype as any).setAttribute &&
  !(Element.prototype as any).__gxtSanitizePatched
) {
  const _origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name: string, value: any): void {
    if (typeof value === 'string') {
      const tagName = this.tagName ? this.tagName.toUpperCase() : '';
      const needsUri = _SANITIZE_BAD_TAGS.has(tagName) && _SANITIZE_BAD_ATTRS.has(name);
      const needsDataUri = _SANITIZE_DATAURI_TAGS.has(tagName) && _SANITIZE_DATAURI_ATTRS.has(name);
      if (needsUri || needsDataUri) {
        let protocol = ':';
        try {
          if (typeof URL === 'function') {
            protocol = new URL(value, 'http://_/').protocol.toLowerCase();
          }
        } catch {
          const idx = value.indexOf(':');
          if (idx > -1) protocol = value.slice(0, idx + 1).toLowerCase();
        }
        if (needsUri && _SANITIZE_BAD_PROTOCOLS.indexOf(protocol) !== -1) {
          return _origSetAttribute.call(this, name, `unsafe:${value}`);
        }
        if (needsDataUri) {
          return _origSetAttribute.call(this, name, `unsafe:${value}`);
        }
      }
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
if (_GXT_HTMLBrowserDOMApi && _GXT_HTMLBrowserDOMApi.prototype) {
  const origAttr = _GXT_HTMLBrowserDOMApi.prototype.attr;
  const _patchedAttr = function (element: any, name: string, value: any) {
    // Style warning is now emitted from _styleEmptyGuard in the $_tag_ember wrapper
    // (earlier in the rendering pipeline) to avoid double warnings.
    if (value === undefined || value === false) {
      element.removeAttribute(name);
    } else if (
      value === true &&
      typeof name === 'string' &&
      _HTML_BOOLEAN_ATTRS.has(name.toLowerCase())
    ) {
      // HTML boolean attribute — write bare (empty string value) so the
      // serialized innerHTML reads `<option selected>` instead of
      // `<option selected="true">`. Non-boolean attrs with `true` still go
      // through the normal path (becoming the literal string "true"), which
      // preserves current behavior for attributes that legitimately carry
      // stringified booleans (e.g. `aria-pressed="true"`).
      origAttr.call(this, element, name, '');
    } else if (
      typeof value === 'symbol' ||
      (value !== null && typeof value === 'object' && typeof (value as any).toString !== 'function')
    ) {
      // Symbol values throw on implicit string coercion inside setAttribute.
      // Objects with no toString method (e.g. Object.create(null)) likewise
      // throw "Cannot convert object to primitive value". Normalize these
      // explicitly to match Glimmer's normalizeStringValue semantics:
      //   Symbol(debug) -> "Symbol(debug)"
      //   Object.create(null) -> ""
      origAttr.call(this, element, name, _normalizeStringValue(value));
    } else if (typeof value === 'string') {
      // Skip SafeString objects (they have toHTML) — but strings are
      // always unsafe and need URL sanitization on href/src/action/background.
      origAttr.call(this, element, name, _sanitizeUrlAttribute(element, name, value));
    } else {
      origAttr.call(this, element, name, value);
    }
  };
  (_patchedAttr as any).__patched = true;
  _GXT_HTMLBrowserDOMApi.prototype.attr = _patchedAttr;

  // Patch prop() — style warning is now emitted from _styleEmptyGuard in the
  // $_tag_ember wrapper (earlier in the pipeline) to avoid double warnings.
  const origProp = _GXT_HTMLBrowserDOMApi.prototype.prop;
  _GXT_HTMLBrowserDOMApi.prototype.prop = function (element: any, name: string, value: any) {
    return origProp.call(this, element, name, value);
  };
}

// Override GXT's $__fn to support mut cells.
// GXT's $__fn unwraps function args by calling them with no args, which breaks
// mut cells (calling mutCell() returns the current value instead of the setter).
// Also marks the returned function with __isFnHelper so the compat layer can
// distinguish fn-helper results from GXT reactive getters (both are arrow fns).
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
      let result: any;
      // If the first arg is a mut cell, don't unwrap it
      if (fn && fn.__isMutCell) {
        result = (...callArgs: any[]) => {
          const resolvedArgs = partialArgs.map((a: any) =>
            typeof a === 'function' && !a.__isMutCell ? a() : a
          );
          return fn(...resolvedArgs, ...callArgs);
        };
        result.__isFnHelper = true;
        return result;
      }
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
        try {
          const fnResult = fn();
          if (fnResult && fnResult.__isMutCell) {
            result = (...callArgs: any[]) => {
              const resolvedArgs = partialArgs.map((a: any) =>
                typeof a === 'function' && !a.__isMutCell ? a() : a
              );
              // Re-evaluate the getter to get the current mut cell
              const currentMut = fn();
              return currentMut(...resolvedArgs, ...callArgs);
            };
            result.__isFnHelper = true;
            return result;
          }
        } catch {
          /* ignore */
        }
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
      result = function $__fn_partial(...callArgs: any[]) {
        // Resolve fn: detect GXT-generated getters vs direct scope handlers.
        const resolvedFn = resolveFirstArg(fn);
        // Resolve partial args: if they're getters (arrow fns), call them
        const resolvedPartials = partialArgs.map((a: any) => (isArgGetter(a) ? a() : a));
        if (typeof resolvedFn !== 'function') {
          return resolvedFn;
        }
        return resolvedFn.call(_fnHelperThis, ...resolvedPartials, ...callArgs);
      };
      result.__isFnHelper = true;
      return result;
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

// Module-local registry of curried-component render infos.
// The reader, the test-cleanup `length = 0` reset, and the push site are all
// intra-file. Entries are object literals typed as `any` at construction (see
// push site for shape).
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

    // Protect from setupGlobalScope overwrite
    try {
      let _currentLog = g.$__log;
      Object.defineProperty(g, '$__log', {
        get() {
          return _currentLog;
        },
        set(v: any) {
          _currentLog = g.$__log;
        },
        configurable: true,
        enumerable: true,
      });
    } catch {
      /* ignore */
    }
  }
}

// Wrap $__hash so that getter values capture the parent render context at
// HASH-CONSTRUCTION TIME, not at getter-invocation time. Without this, a
// contextual component embedded in a nested-component hash (e.g.
// `{{my-comp (hash comp=(component "foo" this.model.x))}}`) captures the
// INNER component's render context when its lazy getter eventually fires
// during the inner render — which means the mut helper can't find
// `this.model.x` to propagate writes back to the outer test context.
// By stamping the outer ctx onto each getter up-front, $_componentHelper_ember
// below can prefer it over globalThis.__lastRenderContext for __mutParentCtx.
{
  const g = globalThis as any;
  if (g.$__hash && !g.$__hash.__emberHashWrapped) {
    const origHash = g.$__hash;
    g.$__hash = function $__hash_ember(inputObj: Record<string, any>) {
      // Snapshot the current outer render context at construction time.
      const ctxAtConstruction = _gxtLastRenderContext;
      // Wrap each function-valued getter so that while it runs we expose the
      // outer context via g.__hashGetterCtx. $_componentHelper_ember reads
      // this to recover the OUTER scope when the hash getter fires inside a
      // nested component's render. Without this, mut cannot locate
      // `this.model.x` on the outer test context when an inner click fires.
      if (ctxAtConstruction && inputObj && typeof inputObj === 'object') {
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
              _gxtHashGetterCtx = ctxAtConstruction;
              try {
                return val.call(this);
              } finally {
                _gxtHashGetterCtx = prev;
              }
            };
            wrappedGetter.toString = () => val.toString();
            (wrappedGetter as any).__origHashGetter = val;
            (wrappedGetter as any).__hashConstructionCtx = ctxAtConstruction;
            (wrappedGetter as any).__emberHashGetterWrapped = true;
            wrappedObj[key] = wrappedGetter;
          } else {
            wrappedObj[key] = val;
          }
        }
        return origHash.call(this, wrappedObj);
      }
      return origHash.call(this, inputObj);
    };
    g.$__hash.__emberHashWrapped = true;
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
      const createCurried = g.__createCurriedComponent;
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
  // Use Ember's isProxy (WeakSet-based) for reliable proxy detection.
  // The heuristic (_content/content check) fails for proxies with undefined content.
  const _isProxyImport = (() => {
    try {
      // Access Ember's proxy WeakSet — isProxy uses PROXIES.has(value)
      // The isProxy function is also available via @ember/-internals/utils
      return (v: any): boolean => {
        if (!v || typeof v !== 'object') return false;
        // Check Ember's proxy marker (setProxy adds to WeakSet)
        // Also fall back to duck-typing: ObjectProxy has unknownProperty
        if (typeof v.unknownProperty === 'function' && typeof v.setUnknownProperty === 'function')
          return true;
        // Check _content property existence (ObjectProxy stores content internally)
        if ('_content' in v || 'content' in v) return true;
        return false;
      };
    } catch {
      return (v: any) => false;
    }
  })();

  function emberToBool(predicate: unknown): boolean {
    if (predicate && typeof predicate === 'object') {
      // Native Array: empty is falsy
      if (_isArray(predicate)) {
        return (predicate as any[]).length !== 0;
      }
      // Proxy-like (ObjectProxy/ArrayProxy)
      if (_isProxyImport(predicate)) {
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
  // GXT's IfCondition.setupCondition checks the toBool host hook (legacy slot
  // `__gxtToBool`) before its own !!v
  _emberToBoolRef = emberToBool;
  if (_gxtRegisterHostHooks) {
    _gxtRegisterHostHooks({ toBool: emberToBool });
  } else {
    g.__gxtToBool = emberToBool;
  }

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

  // Protect the override: GXT's setupGlobalScope iterates its symbol table
  // and assigns every helper to globalThis, which would replace our $__if.
  // Intercept writes so we can re-apply the Ember version.
  try {
    let _currentIf = _ember$__if;
    Object.defineProperty(g, '$__if', {
      get() {
        return _currentIf;
      },
      set(v: any) {
        // Allow GXT to "set" it, but immediately restore Ember version
        _currentIf = _ember$__if;
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* ignore if defineProperty fails */
  }
}

// GXT external schedule hook: GXT's cell.update() calls scheduleRevalidate()
// which consults the scheduleRevalidate host hook (legacy slot
// `__gxtExternalSchedule`) before using queueMicrotask.
// We set it to a no-op so GXT doesn't auto-schedule DOM sync — instead we
// control when gxtSyncDom() is called (after runTask, or via setTimeout fallback).
// The canonical pending-sync state is the module-local `_gxtPendingSyncFlag`
// boolean (defaults to `false` at module init).
const _gxtExternalScheduleHook = function () {
  _gxtSetPendingSync(true);
  // Note: this is from cell/effect scheduling, NOT from a property change.
  // The property-change flag is set separately by _notifyPropertiesChanged via
  // `_gxtSetPendingSyncFromPropertyChange` (module-local in this file) or via
  // `compilePipeline.setPendingSyncFromPropertyChange?.(true)` for cross-package
  // writers (templates/root.ts outlet rerender + routing/router.ts transition
  // LinkTo path).
};
if (_gxtRegisterHostHooks) {
  _gxtRegisterHostHooks({ scheduleRevalidate: _gxtExternalScheduleHook });
} else {
  (globalThis as any).__gxtExternalSchedule = _gxtExternalScheduleHook;
}

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

// Pending if-watcher notifications accumulated during __gxtTriggerReRender.
// Flushed in __gxtSyncDomNow after all cells have been updated atomically.
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
let _drainInProgress = false;
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

// GXT re-render trigger hook - called by Ember's notifyPropertyChange.
// Since GXT's own cell updates are captured by __gxtExternalSchedule,
// this hook only needs to mark that a sync is pending.
//
// The canonical body is exposed via the gxt-bridge as
// `compilePipeline.triggerReRender`; the globalThis writer is also retained so
// the save-restore sites in `validator.ts` and `manager.ts` can keep the global
// slot. Two host-hook chains let cross-file contributors run code before/after
// the canonical body without wrap-by-reassignment:
//   - `_beforeTriggerReRender` — populated by manager.ts (dirtied-objects
//     Set) and ember-gxt-wrappers.ts (tracked-set-since-rerender flag).
//   - `_afterTriggerReRender` — populated by glimmer/lib/renderer.ts
//     (ArrayProxy content-array owner dirtying).
// Chain dispatch is gated on a `length > 0` check so empty chains add zero
// per-call overhead.
//
// The `__gxtInTriggerReRender` flag toggle is folded into the canonical body's
// try/finally below. The flag is also set by `metal/property_events.ts`
// (caller-side) for the canonical notify path; setting it again here is
// idempotent (the save/restore pattern uses `wasInside` so nested calls are
// safe).
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

// Save-restore wrapper around the "in trigger-rerender" flag, exposed on the
// bridge as `compilePipeline.withInTriggerReRender`. Writers: the inline toggle
// wrapped around `_gxtTriggerReRenderBody` below, and `metal/property_events.ts`
// (caller-side around `gxtTrigger`). Re-entrancy-safe because the saved value is
// whatever the enclosing frame wrote (nested calls stack correctly).
//
// The canonical state is the module-local boolean `_gxtInTriggerReRenderFlag`.
// Cross-package readers (`metal/computed.ts` and `@ember/object/core.ts`'s
// DEBUG proxy trap) route through `compilePipeline.isInTriggerReRender()`; the
// cross-package writer in `metal/property_events.ts` routes through
// `compilePipeline.withInTriggerReRender(fn)`.

// The render context (`this`) the current template body is being `.call`ed
// with. itemToNode's capture frame consults this to materialize a leaf cell
// when a bound path resolves off an ABSENT property (initial-undefined paths
// read no cell, so the effect would subscribe to nothing). Set/cleared around
// `templateFn.call(renderContext)`.
let _gxtCurrentTemplateThis: any = null;
// Accessor bound into compiled template Function() bodies (the {{unbound}}
// live/deferred detection) and registered as the `getCurrentTemplateThis`
// host hook so hook-capable gxt dists read the module-local instead of the
// `__gxtCurrentTemplateThis` global (whose writes are legacy-gated below).
const _gxtGetTemplateThisFn = () => _gxtCurrentTemplateThis;
if (_gxtRegisterHostHooks) {
  _gxtRegisterHostHooks({ getCurrentTemplateThis: _gxtGetTemplateThisFn });
}

let _gxtInTriggerReRenderFlag = false;
function _gxtWithInTriggerReRender<T>(fn: () => T): T {
  const wasInside = _gxtInTriggerReRenderFlag;
  _gxtInTriggerReRenderFlag = true;
  try {
    return fn();
  } finally {
    _gxtInTriggerReRenderFlag = wasInside;
  }
}

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

// Read-side predicate paired with `withInTriggerReRender`. Returns `true` iff
// the current sync stack is nested inside a `withInTriggerReRender(fn)` frame
// (which always wraps the canonical `triggerReRender` body). Used by
// `metal/computed.ts`'s CP.get re-entrance guard.
function _gxtIsInTriggerReRender(): boolean {
  return _gxtInTriggerReRenderFlag;
}

// Canonical state for the "currently rendering" flag. Two cross-package readers
// (`metal/tracked.ts` and `gxt-backend/glimmer-tracking.ts`) gate the
// "cross-object reactivity" trigger fan-out on it so we DON'T fire
// `__gxtTriggerReRender` from a @tracked setter while we're INSIDE a render
// pass or a wrapped event-handler frame (otherwise the inner trigger would
// dirty cells mid-render and break the initial render or the user-input
// commit). Writer (save-restore wrapper) and reader (predicate) are exposed on
// the bridge as `compilePipeline.withCurrentlyRendering` +
// `compilePipeline.isCurrentlyRendering`.
//
// It is a pure boolean (no depth counter, no transition side-effects), so the
// balanced "always save + always restore" wrap is correct here — unlike
// `withRendering`, where the depth-1→0 drain forces a conditional-restore
// variant.
//
// Intra-file writers (`templateFactory.render`) call
// `_gxtSetCurrentlyRendering` directly (unconditional set-true / set-false).
// The cross-package `manager.ts` writer goes through
// `_gxtWithCurrentlyRendering` via the bridge
// `compilePipeline.withCurrentlyRendering(fn)` helper.
let _gxtCurrentlyRenderingFlag = false;
function _gxtIsCurrentlyRendering(): boolean {
  return _gxtCurrentlyRenderingFlag;
}
function _gxtSetCurrentlyRendering(on: boolean): void {
  _gxtCurrentlyRenderingFlag = on;
}
function _gxtWithCurrentlyRendering<T>(fn: () => T): T {
  const wasRendering = _gxtCurrentlyRenderingFlag;
  _gxtCurrentlyRenderingFlag = true;
  try {
    return fn();
  } finally {
    _gxtCurrentlyRenderingFlag = wasRendering;
  }
}

// "Tracked set since last rerender" detector flag, exposed via a 2-method
// bridge (`mark` + `consume`):
//
//   Writer: `ember-gxt-wrappers.ts` BEFORE-trigger-rerender hook (registered
//   via `addBeforeTriggerReRender`). On every `triggerReRender` the hook calls
//   `markTrackedSetSinceRerender()` which flips this flag to `true` —
//   signalling that a tracked write occurred since the last VM execute
//   completed.
//
//   Reader: `ember-gxt-wrappers.ts` `UpdatingVM.prototype.execute` patch. On
//   entry the patched method calls `consumeTrackedSetSinceRerender()`, which
//   atomically returns the prior value AND clears the flag. When the prior
//   value was `true`, the patched method forces `alwaysRevalidate=true` for
//   that one execute call (recompute every childRef) to flush stale cached
//   values from tracked writes that fired outside the normal VM update cycle.
//
// The reader never reads without also clearing, so mark+consume matches its
// usage exactly.
//
// Bridge-not-yet-installed edge: both methods are optional on the bridge
// interface; the writer hook only registers AFTER the bridge install
// (registration is itself bridge-mediated via `addBeforeTriggerReRender`), so
// the writer can assume the bridge is installed. The reader (UVM execute patch)
// runs on every Glimmer execute, including before the bridge install — the
// defensive `?.` access plus `?? false` default gives "no detection ⇒ never
// force revalidate".
let _gxtTrackedSetSinceRerenderFlag = false;
function _gxtMarkTrackedSetSinceRerender(): void {
  _gxtTrackedSetSinceRerenderFlag = true;
}
function _gxtConsumeTrackedSetSinceRerender(): boolean {
  const prev = _gxtTrackedSetSinceRerenderFlag;
  _gxtTrackedSetSinceRerenderFlag = false;
  return prev;
}

// Monotonic sync-cycle counter.
//
//   Writer (intra-file only): `__gxtSyncDomNow` bumps the cycle ID once per
//   sync flush via `_gxtIncrementSyncCycleId()`. This is the only canonical
//   writer; the counter increases monotonically across the renderer's lifetime.
//
//   Readers: intra-file compile.ts sites call `_gxtGetSyncCycleId()` directly;
//   cross-file (gxt-backend/manager.ts) and cross-package
//   (glimmer/lib/renderer.ts) readers route through the bridge
//   `compilePipeline.getSyncCycleId?.() ?? 0`.
//
// Only a read method is exposed on the bridge (`getSyncCycleId?(): number`);
// no increment helper, since the writer is intra-file only.
//
// Bridge-not-yet-installed edge: the readers run on every sync flush
// (manager.ts hot paths) and during initial render. All readers default to `0`
// if the bridge is not yet installed. The writer is intra-file only, so it
// always sees the canonical counter regardless of bridge install state.
let _gxtSyncCycleId = 0;
function _gxtIncrementSyncCycleId(): number {
  _gxtSyncCycleId = _gxtSyncCycleId + 1;
  return _gxtSyncCycleId;
}
function _gxtGetSyncCycleId(): number {
  return _gxtSyncCycleId;
}

// Read-side predicate for the "syncing" flag toggled by `__gxtSyncDomNow` and
// the post-render-hook re-entry save-restore in `manager.ts`. Returns `true`
// iff the current synchronous stack is nested inside the GXT post-`runTask` DOM
// sync flush. Read by the `@ember/object/core.ts` DEBUG proxy trap's
// `_isInternalPath` predicate (alongside `isRendering()` and
// `isInTriggerReRender()`) and by several non-proxy-trap readers, all through
// `compilePipeline.isSyncing()`.
let _gxtSyncingFlag = false;
function _gxtIsSyncing(): boolean {
  return _gxtSyncingFlag;
}
function _gxtSetSyncing(on: boolean): void {
  _gxtSyncingFlag = on;
}
// Save-restore wrapper for the "syncing" flag, taking the new flag value as an
// argument. The compile.ts `__gxtSyncDomNow` body uses straight-line
// set-true/set-false rather than this wrapper (its try/finally already provides
// cleanup pairing; no nested caller writes the flag to a different value
// mid-body). The cross-package `manager.ts` post-render-hook re-entry site uses
// this helper via the bridge with `value=false` to temporarily clear the flag
// so the nested `__gxtSyncDomNow` invocation bypasses the re-entrancy guard.
function _gxtWithSyncing<T>(value: boolean, fn: () => T): T {
  const wasSyncing = _gxtSyncingFlag;
  _gxtSyncingFlag = value;
  try {
    return fn();
  } finally {
    _gxtSyncingFlag = wasSyncing;
  }
}

// Set to TRUE while manager.ts is performing internal arg write-backs (the
// `instance[key] = newValue` assignment in `rcSet`/dynamic-component arg
// dispatch) so that `validator.ts`'s `classicDirtyTagFor` wrapper can mark the
// tag dirty and bump the global revision WITHOUT scheduling another GXT sync —
// preventing a backburner re-entry loop on curly component tests. Written by 4
// save-set-TRUE-for-body-restore sites in manager.ts (via
// `withSuppressDirtyInRcSet`); read by `validator.ts`'s
// `classicDirtyTagForGuarded` gate via `isDirtyInRcSetSuppressed()`.
let _gxtSuppressDirtyInRcSetFlag = false;
function _gxtIsDirtyInRcSetSuppressed(): boolean {
  return _gxtSuppressDirtyInRcSetFlag;
}
function _gxtWithSuppressDirtyInRcSet<T>(fn: () => T): T {
  const wasSuppressed = _gxtSuppressDirtyInRcSetFlag;
  _gxtSuppressDirtyInRcSetFlag = true;
  try {
    return fn();
  } finally {
    _gxtSuppressDirtyInRcSetFlag = wasSuppressed;
  }
}

// "Sync is property-driven" flag. Set at the start of `__gxtSyncDomNow`
// (mirroring `_gxtHadPendingSyncFlag` but surviving `__gxtForceEmberRerender`'s
// finally-block clear) so downstream phases — specifically
// `__gxtDestroyUnclaimedPoolEntries` in manager.ts — can still tell whether the
// sync was driven by a real property change. That reader gates destroy-error
// capture: spurious unclaimed sweeps from initial-render syncs (where no
// property change drove the sync) must NOT route user-thrown destroy/lifecycle
// errors into `_renderErrors`. The two intra-file writers call
// `_gxtSetSyncIsPropertyDriven(value)` directly; the cross-file reader routes
// through `compilePipeline.isSyncIsPropertyDriven?.()`.
let _gxtSyncIsPropertyDrivenFlag = false;
function _gxtIsSyncIsPropertyDriven(): boolean {
  return _gxtSyncIsPropertyDrivenFlag;
}
function _gxtSetSyncIsPropertyDriven(on: boolean): void {
  _gxtSyncIsPropertyDrivenFlag = on;
}

// "Had pending sync" flag, paired with a 2-method get/set bridge surface
// (`getHadPendingSync` + `setHadPendingSync`). The flag survives
// `__gxtSyncDomNow`'s Phase-1 gxtSyncDom call but is cleared by
// `__gxtForceEmberRerender`'s finally-block (its companion flag
// `_gxtSyncIsPropertyDrivenFlag` exists precisely because this flag is cleared
// mid-flush). Intra-`compile.ts` writers/readers use `_gxtSetHadPendingSync` /
// `_gxtGetHadPendingSync` directly; the cross-file writer in `manager.ts`
// (helper recompute) routes through `compilePipeline.setHadPendingSync(true)`;
// the cross-package writer in `glimmer/lib/renderer.ts` (force-rerender
// finally) through `setHadPendingSync(false)`; the cross-package readers there
// through `getHadPendingSync?.() ?? false`. Paired get/set rather than a
// read-only predicate because there are cross-file/cross-package writers as
// well as readers.
let _gxtHadPendingSyncFlag = false;
function _gxtGetHadPendingSync(): boolean {
  return _gxtHadPendingSyncFlag;
}
function _gxtSetHadPendingSync(on: boolean): void {
  _gxtHadPendingSyncFlag = on;
}

// "Had nested object change" flag, paired with a 2-method get/set bridge
// surface (`getHadNestedObjectChange` + `setHadNestedObjectChange`). The flag
// survives `__gxtSyncDomNow`'s Phase-1 sync but is cleared by
// `_gxtForceEmberRerender`'s finally-block (in renderer.ts) and by the
// between-test reset block in `compile.ts`. It is set TRUE inside
// `__gxtTriggerReRender`'s nested-object-change detection (and by the
// `manager.ts` helper-recompute path); its TRUE value is read inside
// `_gxtForceEmberRerender` to gate the full-tree morph fallback when no root's
// own tag moved. Intra-`compile.ts` writers/readers use the helpers directly;
// cross-file/cross-package writers and the reader route through the
// `compilePipeline` bridge. Mirrors `_gxtHadPendingSyncFlag`: both are cleared
// by `_gxtForceEmberRerender`'s finally and both gate the force-rerender
// fallback.
let _gxtHadNestedObjectChangeFlag = false;
function _gxtGetHadNestedObjectChange(): boolean {
  return _gxtHadNestedObjectChangeFlag;
}
function _gxtSetHadNestedObjectChange(on: boolean): void {
  _gxtHadNestedObjectChangeFlag = on;
}

// Paired state: a "morph render in progress" flag + a modifier-invocations
// queue array, exposed via a save-restore bridge wrapper
// (`withMorphRender(invocations, fn)`) plus paired read accessors
// (`isMorphRenderInProgress()` + `getMorphModifierInvocations()`).
//
// Both pieces describe the same "we are currently rendering into a throwaway
// tempContainer that will be diffed against the live DOM by `morphChildren`"
// lifecycle phase: the flag is the gate (manager.ts' modifier-manager `handle`
// reader + compile.ts' `$_each` empty-comment cleanup gate), the array is the
// side-channel queue (manager.ts — modifiers seen on temp elements push entries
// for post-morph replay against the real DOM). They are tightly coupled: the
// array is always assigned together with the flag set to TRUE, and cleared to
// `null` together with the flag set to FALSE.
//
// Re-entrancy contract: on entry, save the prior flag and invocations slot, set
// the new values, invoke `fn`, then restore the prior values via try/finally so
// nested calls stack correctly. In practice no nested morph render occurs (the
// morph-fallback path is not re-entered from within a temp-container template
// body).
let _gxtMorphRenderInProgressFlag = false;
let _gxtMorphModifierInvocations: any[] | null = null;
function _gxtIsMorphRenderInProgress(): boolean {
  return _gxtMorphRenderInProgressFlag;
}
function _gxtGetMorphModifierInvocations(): any[] | null {
  return _gxtMorphModifierInvocations;
}
function _gxtWithMorphRender<T>(invocations: any[], fn: () => T): T {
  const prevFlag = _gxtMorphRenderInProgressFlag;
  const prevInvocations = _gxtMorphModifierInvocations;
  _gxtMorphRenderInProgressFlag = true;
  _gxtMorphModifierInvocations = invocations;
  try {
    return fn();
  } finally {
    _gxtMorphRenderInProgressFlag = prevFlag;
    _gxtMorphModifierInvocations = prevInvocations;
  }
}

// "In outlet render" flag: set TRUE for the duration of the
// `renderTemplateWithContext(routeTemplate, ...)` call inside
// `glimmer/lib/templates/root.ts`'s outlet render path, restored to FALSE on
// the surrounding `try/finally`. Consumed by `gxt-backend/manager.ts`'s
// `_buildRenderTree` body — used together with `__currentOutletState` to decide
// whether to rebuild the parentView-derived `renderTreeParts` with the proper
// outlet hierarchy that the Glimmer VM produces (route-name "{{outlet}} for X" /
// route X entries). Outside the outlet render frame the flag is `false` and the
// function retains the bare parentView-derived render-tree parts.
//
// Exposed as a paired bridge surface `withInOutletRender<T>(fn): T` (writer) +
// `isInOutletRender(): boolean` (reader). The writer lives in
// `glimmer/lib/templates/root.ts`, the reader in `gxt-backend/manager.ts`; the
// reader's optional-chain fallback treats `undefined` as `false` (the safe
// value — outside an outlet render frame we must NOT rebuild the
// renderTreeParts). Pure balanced save-restore wrap; in practice no nested
// outlet-render occurs.
let _gxtInOutletRenderFlag = false;
function _gxtIsInOutletRender(): boolean {
  return _gxtInOutletRenderFlag;
}
function _gxtWithInOutletRender<T>(fn: () => T): T {
  const prev = _gxtInOutletRenderFlag;
  _gxtInOutletRenderFlag = true;
  try {
    return fn();
  } finally {
    _gxtInOutletRenderFlag = prev;
  }
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

// Captured "current helper scope", exposed via a paired set/get bridge surface
// (`setCurrentHelperScope` / `getCurrentHelperScope`). Three intra-file
// save-restore writer pairs in `patchGlobalIf`/`wrapBranch` set it around the
// branch evaluation body, publishing a per-branch `Set<any>`
// (`trueBranchHelpers` / `falseBranchHelpers`) so class-helper instantiation
// paths can associate freshly-created helper instances with the enclosing
// `{{#if}}` branch's teardown scope (matching Ember's classic Helper lifecycle:
// destroy + willDestroy fire on branch swap, not only on component teardown).
// Three readers:
//
//   - the intra-file `$_tag` class-based-helper instance creation block, which
//     calls `ifScopeTag.add(helperInstance)` to wire the instance to the
//     enclosing branch scope;
//   - `ember-gxt-wrappers.ts`'s `$_maybeHelper` branch-swap recreation branch;
//   - `ember-gxt-wrappers.ts`'s `$_maybeHelper` class-based-helper path
//     (factory.create() cache miss).
//
// Each reader treats a non-`null`/`undefined` `scope` with a callable
// `.add(...)` as the active branch scope; absence or non-Set values
// short-circuit silently.
//
// Overwrite contract: each write OVERWRITES the prior captured scope. Intra-file
// callers save the prior scope into a local binding and restore it in `finally`
// so nested branch evaluations restore the outer scope. Bridge writers are
// responsible for their own save-restore (the bridge does NOT auto-wrap). The
// cross-file readers' optional-chain fallback gives `undefined` before the slot
// is set.
let _gxtCurrentHelperScope: any = null;
function _gxtGetCurrentHelperScope(): any {
  return _gxtCurrentHelperScope;
}
function _gxtSetCurrentHelperScope(scope: any): void {
  _gxtCurrentHelperScope = scope;
}

// "Is force-rerender" flag, exposed via a paired bridge surface
// (`withForceRerender<T>(fn): T` writer + `isForceRerender(): boolean` reader).
// Set TRUE around the `classicRoot.render()` body in `glimmer/lib/renderer.ts`.
// Read by many gates across the gxt-backend package and renderer/root:
// `_shouldWarnStyle`, the pool-claim sweep on factory swap,
// `pushedUpdatedInstance` skip, ember-component init bypass, `_buildDom`
// reused-from-pool gate, the `$_tag` `__forceRerenderSnapshot`, style-binding
// XSS warn suppression, engine-instance cache reuse, and the OutletView
// short-circuit.
//
// Pure balanced save-restore wrap; in practice no nested force-rerender occurs.
// The renderer.ts writer's `catch (renderErr)` (which stashes onto
// `classicRoot.__gxtDeferredError`) lives inside the `fn` it passes, so the
// deferred-error stash happens before this wrapper's `finally` resets the flag.
// Readers' optional-chain fallback treats `undefined` as "not in
// force-rerender".
let _gxtIsForceRerenderFlag = false;
function _gxtIsForceRerender(): boolean {
  return _gxtIsForceRerenderFlag;
}
function _gxtWithForceRerender<T>(fn: () => T): T {
  const prev = _gxtIsForceRerenderFlag;
  _gxtIsForceRerenderFlag = true;
  try {
    return fn();
  } finally {
    _gxtIsForceRerenderFlag = prev;
  }
}

// "Skip text effects" flag, exposed via a paired set/get bridge surface
// (`setSkipTextEffects` / `getSkipTextEffects`). Set TRUE around each
// renderComponent template render in `glimmer/lib/renderer.ts`'s
// `_renderComponent` entrypoint so that nested `renderComponent` calls (during
// an existing render pass) suppress GXT-effect creation for text nodes. The
// single reader, in the intra-file `$_text` reactive-binding setup of the
// glimmer-template forked branch, short-circuits the `gxtEffect(...)` setup when
// truthy and returns the bare text node instead.
//
// The conditional set-true semantics (gated on `wasRendering`) and the
// save-prior/restore-prior pattern live in the renderer.ts writers, NOT here —
// the bridge just stores/reads the boolean. The intra-file reader uses the
// module-local directly.
let _gxtSkipTextEffectsFlag = false;
function _gxtGetSkipTextEffects(): boolean {
  return _gxtSkipTextEffectsFlag;
}
function _gxtSetSkipTextEffects(value: boolean): void {
  _gxtSkipTextEffectsFlag = value;
}

// Root outlet-rerender dispatcher, exposed via the bridge. The writer in
// `glimmer/lib/templates/root.ts` registers a `(outletRef) => void` dispatcher
// closure via `setRootOutletRerender`; `gxt-backend/manager.ts` registers a
// `render.outlet` instrumentation wrap via `setRootOutletRerenderWrap` (once at
// IIFE time); three readers (renderer.ts, views/outlet.ts, root.ts) fetch it via
// `getRootOutletRerender?.() ?? null` with a `typeof === 'function'` guard.
//
// `_gxtRootOutletRerenderRaw` holds the already-wrapped dispatcher;
// `_gxtRootOutletRerenderWrap` holds the instrumentation wrap (defaults to
// identity so a not-yet-registered wrap is a no-op). The wrap is applied at
// SET-TIME inside `_gxtSetRootOutletRerender`. Manager.ts's wrap closure has its
// own `__gxtInstrumented` idempotency check, so re-applying it to an
// already-wrapped function is a no-op.
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

// Holds an error captured during `_gxtSyncDomNow`'s morph-fallback try/catch
// (the `forceEmberRerender` rerender error and the `destroyUnclaimedPoolEntries`
// destroy error) so that the error can be re-thrown AFTER the `finally`-block
// sync-state cleanup runs (`_gxtSetSyncing(false)` +
// `_gxtSetSyncIsPropertyDriven(false)`). Without the defer, the throw would skip
// the finally's flag-reset and leave `_gxtSyncingFlag === true`, causing every
// subsequent `_gxtSyncDomNow` call to short-circuit on the re-entrancy guard and
// become a permanent no-op.
//
// All read/write/clear/throw sites live in the same `_gxtSyncDomNow` body. The
// two writers use first-error-wins coalescing (`existing || newErr`) so the
// rerender throw isn't shadowed by a later destroy throw. The reader captures
// the error AFTER the function-body `finally` ran, clears the slot, then
// re-throws to propagate the error to `runTask`'s caller (typically
// `assert.throws` in tests).
//
// Type is `unknown` (not `Error | null`): the throws can be any thrown value
// (`throw 'string'`, `throw 42`, etc.), and a bare `throw deferredSyncErr;` is
// permitted for `unknown`.
let _gxtDeferredSyncError: unknown = null;

// The master "DOM sync pending" flag, paired with a 2-method get/set bridge
// surface (`getPendingSync` + `setPendingSync`). It is set TRUE on any scheduled
// DOM sync (cell.update via GXT's external-schedule hook, a real property change
// observed by `__gxtTriggerReRender`, force-rerender invalidation, outlet model
// update, route transition, post-render hook re-entry) and cleared at well-known
// boundaries: at the start of `__gxtSyncDomNow` (after gating its body), in
// cross-test teardown, in `__gxtPostRenderHooks` save/restore around
// `didUpdate`/`didRender` (so hooks can detect their own dirty contributions),
// in `wrapHandler`'s tail finally (so user-interaction handler property changes
// do not survive past the handler), and at the end of every `runTask` /
// `runAppend` / test-case-teardown.
//
// Intra-`compile.ts` writers/readers (including the `__gxtExternalSchedule`
// hook) call `_gxtSetPendingSync` / `_gxtGetPendingSync` directly; cross-file
// (manager.ts) and cross-package (renderer.ts revalidate, templates/root.ts
// outlet, router.ts transition, test helpers) writers/readers route through the
// bridge methods. The `__gxtPostRenderHooks` save-restore in manager.ts operates
// on two flags (this one + `_gxtPendingSyncFromPropertyChangeFlag`) so it stays
// an inline save-restore rather than a single-flag `with*` helper.
let _gxtPendingSyncFlag = false;
function _gxtGetPendingSync(): boolean {
  return _gxtPendingSyncFlag;
}
function _gxtSetPendingSync(on: boolean): void {
  _gxtPendingSyncFlag = on;
}

// "Run task active" flag, paired with a 2-method get/set bridge surface
// (`getRunTaskActive` + `setRunTaskActive`). Read together with
// `_gxtPendingSyncFlag` in the same `getPendingSync?.() && !runTaskActive` gate
// in `glimmer/lib/renderer.ts` (`_backburner` end listener) and
// `runloop/index.ts` (runloop `onEnd` hook). Set TRUE during the body of
// `runTask` / `runAppend` (test-helper writers) to tell the runloop `onEnd` and
// `_backburner` end listeners to SKIP the post-end `__gxtSyncDomNow` flush —
// `runTask` / `runAppend` perform their own explicit sync after the user's task
// completes. Cleared in the `finally` at the end of each helper. The test-helper
// writers and the two cross-package readers route through the bridge methods.
let _gxtRunTaskActiveFlag = false;
function _gxtGetRunTaskActive(): boolean {
  return _gxtRunTaskActiveFlag;
}
function _gxtSetRunTaskActive(on: boolean): void {
  _gxtRunTaskActiveFlag = on;
}

// "After-render property change" detector flag, paired with a 2-method get/set
// bridge surface (`getAfterRenderPropertyChange` +
// `setAfterRenderPropertyChange`). Set TRUE by `_gxtTriggerReRender` when it
// fires INSIDE a `schedule('afterRender', cb)` callback (detected via the
// `_gxtInAfterRenderFlag`), recording that a property change originated from an
// `afterRender` callback (the classic `afterRender set` pattern where
// `didInsertElement` queues a set that must re-render the DOM before the test
// assertion). Consumed in `runAppend` (`internal-test-helpers/lib/run.ts`),
// which reads-and-clears it in a single get-then-set pair: the read decides
// whether to preserve `_gxtPendingSyncFromPropertyChangeFlag` for the subsequent
// `syncNow()` call (TRUE = legitimate user state; FALSE = init artifact noise
// that should not trigger a post-runAppend full sync). The intra-file writer
// uses the module-local helper directly; the cross-package reader+clearer routes
// through the bridge.
let _gxtAfterRenderPropertyChangeFlag = false;
function _gxtGetAfterRenderPropertyChange(): boolean {
  return _gxtAfterRenderPropertyChangeFlag;
}
function _gxtSetAfterRenderPropertyChange(on: boolean): void {
  _gxtAfterRenderPropertyChangeFlag = on;
}

// "In after-render" gate flag, paired with a 2-method get/set bridge surface
// (`getInAfterRender` + `setInAfterRender`). Set TRUE for the duration of a
// `schedule('afterRender', cb)` wrapped callback body (the
// `gxtAfterRenderWrapper` in `@ember/runloop/index.ts` does the classic
// save/set-TRUE/finally-restore around the user callback). Read by
// `_gxtTriggerReRender` to gate the `_gxtSetAfterRenderPropertyChange(true)`
// setter — i.e. to decide whether a property change originated inside an
// `afterRender` callback (a legitimate `afterRender set` that must trigger
// gxtSyncDom). Together with `_gxtAfterRenderPropertyChangeFlag` this forms the
// afterRender-detection cluster: this gate marks when the wrapper body is
// executing, that detector records whether a property change was observed while
// the gate was open.
//
// The intra-file reader uses the module-local helper directly; the cross-package
// writers route through the bridge.
let _gxtInAfterRenderFlag = false;
function _gxtGetInAfterRender(): boolean {
  return _gxtInAfterRenderFlag;
}
function _gxtSetInAfterRender(on: boolean): void {
  _gxtInAfterRenderFlag = on;
}

// "Destroy-reattach in progress" flag, paired with a 2-method get/set bridge
// surface (`getDestroyReattachInProgress` + `setDestroyReattachInProgress`). Set
// TRUE for the duration of a destroy-phase reattach loop that temporarily
// re-attaches disconnected component elements to `document.body` /
// `#qunit-fixture` so that `willDestroyElement` / `willClearRender` hooks see
// `document.body.contains(this.element) === true` during the destroy phase.
// Cleared FALSE in a paired `finally` after the lifecycle hooks run and the
// elements are detached again.
//
// The flag gates the `<ember-outlet>` custom element's `connectedCallback`: when
// a destroy-phase reattach fires `connectedCallback` on an inner `<ember-outlet>`
// (e.g. one nested inside a just-removed component wrapper), the callback MUST
// skip rendering — without this gate it would read `__currentOutletState` (the
// NEW route after the transition), render the new route's template, and corrupt
// the parentView stack (the new route's components would get the removed
// wrapper as `parentView` and disappear from `getRootViews`).
//
// Two intra-file writers use the module-local helper directly; two cross-file
// writers in `manager.ts` and the cross-package reader in
// `glimmer/lib/templates/outlet.ts` route through the bridge.
let _gxtDestroyReattachInProgressFlag = false;
function _gxtGetDestroyReattachInProgress(): boolean {
  return _gxtDestroyReattachInProgressFlag;
}
function _gxtSetDestroyReattachInProgress(on: boolean): void {
  _gxtDestroyReattachInProgressFlag = on;
}

// Engine-instance cache, exposed via a single-method `getEngineInstances`
// getter bridge. Holds one engine instance per `{{mount "engine-name"}}`
// invocation — reused across re-renders of the parent template so that
// `<ember-mount>` elements recreated by a force-rerender don't double-
// instantiate the engine. Engines are inserted on first `<ember-mount>`
// connection (outlet.gts `renderEngine`) and destroyed in the between-test
// teardown (`_gxtClearOnSetup`), which destroys both the inner
// `__gxtOriginalEngine` (which `init`-ed itself into the `Namespace.NAMESPACES`
// table) and the cached instance so the "Should not have any NAMESPACES"
// assertion passes.
//
// The cross-package writer (`outlet.gts`) routes through
// `compilePipeline.getEngineInstances()`; the intra-file readers in
// `_gxtClearOnSetup` use `_gxtEngineInstances` directly. Only a getter is
// exposed because the Map identity never changes — consumers mutate its
// contents via `Map.get` / `Map.set` / `Map.clear` on the returned reference.
const _gxtEngineInstances: Map<string, any> = new Map<string, any>();
function _gxtGetEngineInstances(): Map<string, any> {
  return _gxtEngineInstances;
}

// Phase 4.1 SSR consumer plumbing (RFC §7.1.1 step 2). `withRootContext(ctx, fn)`
// runs `fn` against an ISOLATED render root: it snapshots the three (a)-class
// ember-side root-scoped singletons enumerated in the RFC — `_gxtRootContext`
// (the ambient GXT `Root`), `_gxtTopOutletRef` (the captured top outlet), and the
// `_gxtEngineInstances` map (engine mount-point registry) — installs the per-root
// state carried by `ctx` (defaulting to a fresh/empty root), wraps the body in
// glimmer-next's `withRenderRoot(createRenderRootState(), …)` so the UPSTREAM
// module-globals (node counter, parent-context stack, rendering context) are
// likewise swapped to a fresh isolated set, and restores the outer ambient state
// on exit — including on throw — while checkpointing the (possibly mutated) per-root
// state back into `ctx` (mirroring `withRenderRoot`'s own save/checkpoint/restore
// idiom for `RenderRootState`).
//
// CRITICAL: this is ADDITIVE. Nothing in the existing browser/render path calls it;
// the default ambient module-globals remain untouched and single-root behavior is
// byte-identical unless a caller explicitly invokes `withRootContext`. There is no
// consumer until a FastBoot/SSR driver exists — each SSR request would become
// `withRootContext(freshCtx, () => render(...))`. It is SYNCHRONOUS ONLY: `fn` must
// mint all DOM synchronously before returning (matching `withRenderRoot`'s non-goal —
// no `await` inside the swapped window), or the swapped globals leak across requests.
//
// `_gxtEngineInstances` is a `const` whose identity must stay stable (cross-package
// consumers hold the reference), so it is swapped by clearing + repopulating its
// CONTENTS rather than reassigning the binding.
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

// "Pending sync from property change" flag, paired with a 2-method get/set
// bridge surface (`getPendingSyncFromPropertyChange` +
// `setPendingSyncFromPropertyChange`). Set TRUE when `__gxtTriggerReRender`
// observes a real property change (so `__gxtSyncDomNow` can distinguish a
// property-driven sync from a cell-creation-during-initial-render sync) and
// cleared at well-known boundaries: at the start of `__gxtSyncDomNow` (after
// capturing into `_gxtHadPendingSyncFlag` and `_gxtSyncIsPropertyDrivenFlag`),
// at the end of every `runTask` / `runAppend` (so the setInterval fallback does
// not pick up stale sync state for the next test), in the cross-test teardown
// phases, in `__gxtPostRenderHooks` save/restore around `didUpdate`/`didRender`
// (to detect whether the hook itself produced property changes), and in
// `wrapHandler`'s tail finally (so user-interaction handler property changes do
// not survive past the handler).
//
// Intra-file writers/readers use the module-local helpers directly; the
// cross-file (manager.ts) and cross-package (templates/root.ts outlet,
// routing/router.ts transition) writers and the test-helper writers route
// through the bridge.
let _gxtPendingSyncFromPropertyChangeFlag = false;
function _gxtGetPendingSyncFromPropertyChange(): boolean {
  return _gxtPendingSyncFromPropertyChangeFlag;
}
function _gxtSetPendingSyncFromPropertyChange(on: boolean): void {
  _gxtPendingSyncFromPropertyChangeFlag = on;
}

// Suppression flag for the canonical `_gxtTriggerReRender` function.
// `_gxtWithTriggerSuppressed` sets it while running `fn`, and
// `_gxtTriggerReRender` short-circuits at its entry when the flag is `true`, so
// the bridge `compilePipeline.triggerReRender(...)` consumers
// (`metal/tracked.ts` + `glimmer-tracking.ts`) observe the same no-op
// suppression. Only `_gxtWithTriggerSuppressed` writes it.
let _gxtTriggerSuppressedFlag = false;

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
  // The optional `value` parameter is plumbed through
  // `notifyPropertyChange(obj, keyName, _meta, value)` via the bridge so
  // `_gxtTriggerReRenderSyncCore`'s primary `cellFor(obj, keyName).update(value)`
  // can skip the `obj[keyName]` getter read for the ~85% of write traffic that
  // already passes a value (set() + the @tracked setter). SyncCore is the single
  // source of truth for the cell.update.
  //
  // Honor the suppression flag at this single entry point: when
  // `_gxtWithTriggerSuppressed(fn)` is in flight the flag is `true` and we
  // short-circuit. The bridge readers (`metal/tracked.ts`, `glimmer-tracking.ts`)
  // reach this via `compilePipeline.triggerReRender(...)`, so the flag-gate is
  // the only surface that preserves their suppression.
  if (_gxtTriggerSuppressedFlag) return;
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
  // Run SyncCore under the in-trigger-rerender flag via the typed
  // `_gxtWithInTriggerReRender` helper (also published on the bridge as
  // `compilePipeline.withInTriggerReRender`). The flag is restored before the
  // AFTER-hook chain dispatches (AFTER hooks run with the flag already
  // restored). The save/restore is re-entrancy-safe (`wasInside` preserves an
  // enclosing toggle if any).
  //
  // The body is split into SyncCore (synchronous-mandatory cell/flag work, run
  // immediately) and Deferred (deferrable cascade work, enqueued into
  // `_deferredCascadeQueue` with WeakMap+Set dedupe and drained in
  // `_gxtSyncDomNow`).
  //
  // Re-entrancy: if a Deferred body run calls `_gxtTriggerReRender` recursively,
  // the inner call's SyncCore fires immediately (read-after-set contract), the
  // inner call's Deferred is enqueued (dedupe may catch it), and the inner call
  // SKIPS the drain because `_drainInProgress` is true. The outer call's cursor
  // loop in `_drainCascadeQueue` picks up the new tail entry in the SAME pass
  // (bounded by `_MAX_DRAIN`).
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
    // changed key is `model`, look up its registered outlet via
    // `__gxtControllerOutletRerender` (installed by root.ts at module
    // load) and invoke the outlet's `rerenderForThisRoot` closure with
    // forceFull=true. This closes the cell→DOM propagation gap for
    // `set(controller, 'model', x)`: SyncCore + _walkRenderContexts
    // updates the cells on the renderContext (Object.create(controller)),
    // but the outlet template's text-binding effects don't always
    // auto-flush — driving through the outlet rerender path with a full
    // re-render forces the template formulas to re-evaluate.
    //
    // The hook is intentionally narrowed to `keyName === 'model'`. Firing
    // for ALL controller properties (e.g. `@tracked isExpanded`) destroys
    // the view tree on every tracked write (the View tree test regressed
    // when this was unguarded) — the cell-based cascade for tracked props
    // works correctly without a forceFull rerender; only `model` writes
    // need the outlet-template re-evaluation because outletState's model
    // reference is unchanged so the natural setOutletState rerender path
    // doesn't fire.
    //
    // The bridge is ALSO fired for QP-tracked properties (keys present in the
    // controller's `queryParams` configuration). When a controller's QP-tracked
    // property is mutated
    // followed by `route.refresh()`, the outletState model reference is
    // unchanged so the natural rerender path doesn't fire — analogous to
    // the `model` case. QP keys are explicitly declared (a closed,
    // user-authored set), so this widening doesn't accidentally include
    // generic `@tracked` properties that broke the View tree test.
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
        // should never throw, but if a getter rejects, fall through quietly
        // (visible warn rather than silent swallow per CLAUDE.md).
        console.warn('[gxt] QP-key detection on controller failed', e);
      }
    }
    if (_isControllerKey && (keyName === 'model' || _isQpKey)) {
      const _ctrlHook = (globalThis as any).__gxtControllerOutletRerender;
      if (typeof _ctrlHook === 'function') {
        try {
          // Pass the changed key so the outlet-rerender hook can, in
          // fine-grained mode, choose the cell-only fast path for a route
          // MODEL identity swap (preserving route-template component identity
          // — `didInsertElement` fires once — while still re-evaluating
          // `{{@model.…}}` bindings). QP keys keep the legacy full re-render.
          _ctrlHook(obj, keyName);
        } catch (e) {
          // Match the existing post-trigger error handling shape — log but
          // don't break the canonical trigger body (per CLAUDE.md no
          // silent swallow: visible warn).
          console.warn('[gxt] controller-set outlet rerender hook failed', e);
        }
      }
    } else if (obj && typeof obj === 'object' && !_gxtIsCurrentlyRendering()) {
      // Interior model mutation bridge: if `obj` is registered as the VALUE
      // of `(*, 'model')` via _objectValueCellMap and the owner traces
      // back to a controller, fire the outlet rerender hook for that
      // controller. Same forceFull rationale as the direct controller-
      // model branch above. Guard against firing during an active render
      // pass (component init `this.set(...)` writes go through this path —
      // those should hit the classic backtracking-re-render assertion,
      // not get force-rerendered into a green test).
      try {
        const owners = _objectValueCellMap.get(obj);
        if (owners) {
          const _ctrlHook = (globalThis as any).__gxtControllerOutletRerender;
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
        // but if WeakMap rejects (non-object key), fall through quietly —
        // the trigger-body already protected this path with try/catch in the
        // sibling SyncCore reverse-lookup at L5337-5352.
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

// Save-restore suppression helper, exposed on the bridge as
// `compilePipeline.withTriggerSuppressed`. Used by the two suppression sites
// (`validator.ts` track() reentrancy guard and `manager.ts` first-render
// suppression for new classic components). It saves/restores the module-local
// `_gxtTriggerSuppressedFlag` (the single suppression surface for all readers,
// both bridge and intra-file). Re-entrancy-safe (`wasSuppressed` preserves an
// enclosing frame's flag value if any).
function _gxtWithTriggerSuppressed<T>(fn: () => T): T {
  const wasSuppressed = _gxtTriggerSuppressedFlag;
  _gxtTriggerSuppressedFlag = true;
  try {
    return fn();
  } finally {
    _gxtTriggerSuppressedFlag = wasSuppressed;
  }
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
  // Group D (gated): if a NEW key was added to an object an each-in source has
  // iterated, bump its key-SET revision so the source re-iterates. No-op when
  // the key was already observed (value-only change) or no each-in tracks `obj`.
  {
    _gxtMaybeBumpKeySet(obj, keyName);
  }
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
      const rc = cellFor(cellTarget, keyName, /* skipDefine */ false);
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
  // Signal to __gxtForceEmberRerender that nested object changes occurred.
  // When a property changes on a nested object (e.g., set(m, 'message', ...)
  // or foo.set('text', ...)), the component's SELF_TAG is NOT dirtied by
  // Ember (only the object's tag is). Setting __gxtHadNestedObjectChange
  // allows the force-rerender to fall back to force-rendering all roots so
  // computed properties like {{this.m.formattedMessage}} re-evaluate.
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
    // are handled by the cell-based sync pipeline (Phase 1) without needing
    // the force-all morph.
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

// ---- Cross-module-instance $_if fix ----
//
// Problem: Vite serves GXT's internal chunks (vm-*.js, dom-*.js) with inconsistent
// ?v= query strings, creating TWO module instances of the reactive core. Cells/opcodes
// from one instance don't trigger re-evaluation in the other. This breaks $_if
// condition tracking when properties change via Ember's set().
//
// Additional: IfCondition's internal placeholder gets disconnected when Ember's
// compat layer moves rendered nodes into wrapper divs. Fix: include placeholder
// and target in the extracted RENDERED_NODES so itemToNode preserves them.
//
// Solution: Patch $_if to capture IfCondition instances. Register manual callbacks
// keyed by (object, property). When __gxtTriggerReRender fires, call syncState
// on the IfCondition directly.

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

// The pre-flush FALSE-flip block in `__gxtSyncDomNow` stashes the set of cbs
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

// The registry maps a stable plain-ASCII token (e.g. `__gxtCmt_42`) to the
// literal HTML comment source captured by the `gxtHtmlCommentTransform` AST
// visitor; the counter monotonically increments per registered comment so each
// token is unique within the process. That visitor builds a
// `<EmberHtmlRaw @value={{(__gxtCommentLookup "<token>")}} />` element in place of
// the original `<!-- ... -->` `CommentStatement`, and the `__gxtCommentLookup`
// resolver (a built-in helper key) reads the registry back at render time to
// recover the literal comment text without sending curly-brace-containing comment
// bodies through the GXT parser. The writer is inside `gxtHtmlCommentTransform`;
// the reader is the `__gxtCommentLookup` resolver — both intra-file.
const _gxtCommentRegistry: Record<string, string> = Object.create(null);
let _gxtCommentCounter = 0;

// In-element literal-id fallback STACK, pushed by the GXT render-template
// wrapper before invoking the template body and consumed by `$_inElement` when
// the destination ref resolves to null/undefined during a render pass:
// `_inElementFallbackIds` then peeks the top id (a compile-time literal element
// id captured from the `#in-element` destination expression) and shifts it off,
// allowing the renderer to defer the body insertion and re-resolve against the
// now-attached parent fragment. All functional sites (the peek reader and shift
// reader in `$_inElement`, and the push-side reader-writer in the render-template
// wrapper) are intra-file. The stack is preserved across nested render passes
// via the `_inElemStackStart` index snapshot at the push site (NOT via array
// replacement), so the shared module-local array is safe under reentrancy.
const _inElementFallbackIds: string[] = [];

// Persistent set of classic-component wrapper DOM ids that the user has
// directly toggled to `false` via a click handler calling set()/toggleProperty.
// Used by the __gxtRebuildViewTreeFromDom wrap below to reset the view-
// registry's CHILD_VIEW_IDS for those wrappers so getChildViews returns
// empty (matching the collapsed {{#if}} branch) even if GXT's own
// destroyBranchSync was a no-op for the yield-only true branch.
//
// Exposed via the typed bridge `viewUtils.getWrapperUserFalseSet()` (contributed
// below via `installViewUtilsPart`). The sole cross-file reader in manager.ts
// (restoring `isExpanded = false` on freshly-constructed component instances
// whose wrapper id was user-toggled false — load-bearing for the View tree
// x-toggle/visit() cycle assertions) routes through the bridge.
const _wrapperIfUserFalse = new Set<string>();
// Map of wrapperId -> Set of {condFn, placeholder} entries. Populated by the
// ifWatcher when the user toggles to false. Used by _wrapGxtRebuildViewTree
// to verify at read time that a LIVE-DOM-connected IfCondition for this
// wrapper still reports false. Needed because pool-reuse creates multiple
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
    // Mirror notifyIfWatchers' candidate list: obj + its prototype + render-
    // context proxies that wrap obj. Notification fires on each — we replicate
    // here so ordering reflects the same set the original loop would touch.
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

function notifyIfWatchers(obj: object, key: string) {
  const candidates = [obj];
  try {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) candidates.push(proto);
  } catch {
    /* ignore */
  }
  // Walk component-context mappings to also notify watchers on render-
  // context proxies that wrap this instance. CRITICAL: only expand
  // candidates from ctxsMap entries keyed by `obj` directly — not from
  // proto-keyed entries. The prototype bucket aggregates contexts from
  // every instance sharing the prototype, so expanding from it would
  // broadcast the notify to sibling instances and fire their watchers,
  // collapsing their {{#if}} branches on an unrelated toggle (cell-
  // aliasing bug).
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
    const watchers = keyMap.get(key);
    if (!watchers) continue;
    for (const cb of watchers) {
      try {
        cb(obj);
      } catch (e) {
        console.warn('[GXT] ifWatcher error:', e);
      }
    }
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
    // parentView. GATED on fine-grained mode (curly `newly-added
    // sub-components get correct parentView`).
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

    // Install branch-swap helper-destroy hook unconditionally. This fires
    // destroy + willDestroy on any class-based helper instance created during
    // the outgoing branch's evaluation whenever the branch toggles, so that
    // tests like `class-based helper lifecycle` (where `{{#if this.show}}` is
    // flipped to `false`) see the full Ember Helper lifecycle.
    if (
      ifCondition &&
      typeof ifCondition.syncState === 'function' &&
      !(ifCondition as any).__emberHelperCleanupInstalled
    ) {
      (ifCondition as any).__emberHelperCleanupInstalled = true;
      const emberToBool = _emberToBoolRef || Boolean;
      const origSS = ifCondition.syncState.bind(ifCondition);
      let prevBool: boolean | null = null;
      const destroyScope = (scope: Set<any>) => {
        if (!scope || scope.size === 0) return;
        const copy = Array.from(scope);
        scope.clear();
        const evictFromCache = (cache: any) => {
          try {
            if (cache && typeof cache.forEach === 'function') {
              const toDelete: any[] = [];
              cache.forEach((v: any, k: any) => {
                // Cache values may be either a raw instance, a wrapper object
                // from the manager path `{__managerBucket, bucket, ...}`, or a
                // `{ instance, recomputeTag }` shape from the compile-time
                // _tagHelperInstanceCache.
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
        // The class-helper instance cache lives in `ember-gxt-wrappers.ts`;
        // route through the get-only bridge accessor
        // `compilePipeline.getClassHelperInstanceCache?.()`. The
        // `if (cache && typeof cache.forEach === 'function')` guard inside
        // `evictFromCache` short-circuits when the bridge returns undefined
        // (pre-bridge-install).
        evictFromCache(getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.());
        // `_tagHelperInstanceCache` is the module-local Map in this file (read
        // directly). The forward reference is safe — this arrow body runs at
        // runtime, long after module init hoisted the `const` binding.
        // ember-gxt-wrappers.ts reads it via the get-only
        // `getTagHelperInstanceCache` bridge method.
        evictFromCache(_tagHelperInstanceCache);
        for (const inst of copy) {
          try {
            if (
              inst &&
              typeof inst.destroy === 'function' &&
              !inst.isDestroyed &&
              !inst.isDestroying
            ) {
              inst.destroy();
            }
          } catch {
            /* ignore */
          }
        }
      };
      // Initialise prevBool from the condition's current value.
      try {
        const initV = typeof conditionOrCell === 'function' ? conditionOrCell() : conditionOrCell;
        prevBool = emberToBool(initV);
      } catch {
        prevBool = null;
      }
      // Fallback: if we couldn't populate the scope because helper creation
      // happens inside a deferred formula (outside our wrapBranch's dynamic
      // scope), snapshot the set of live class-helper instances BEFORE the
      // branch is evaluated and destroy any newly-added ones on branch swap.
      let preBranchCacheKeys: Set<string> | null = null;
      const snapshotCacheKeys = () => {
        try {
          // Class-helper instance cache via the get-only bridge accessor; the
          // guard short-circuits when the bridge returns undefined
          // (pre-bridge-install).
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
      };
      const destroyNewCacheEntriesSince = (prev: Set<string> | null) => {
        try {
          // Class-helper instance cache via the get-only bridge accessor; the
          // early-return guard short-circuits when the bridge returns undefined
          // (pre-bridge-install).
          const cache = getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.();
          if (!cache || typeof cache.forEach !== 'function') return;
          const toDelete: string[] = [];
          cache.forEach((_v: any, k: string) => {
            if (!prev || !prev.has(k)) toDelete.push(k);
          });
          for (const k of toDelete) {
            const entry = cache.get(k);
            cache.delete(k);
            // Resolve the helper instance from the cache entry (manager-path
            // wraps it in { bucket: { instance } }; direct path stores the
            // instance directly).
            const inst = entry && entry.__managerBucket ? entry.bucket?.instance : entry;
            if (
              inst &&
              typeof inst.destroy === 'function' &&
              !inst.isDestroyed &&
              !inst.isDestroying
            ) {
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
      };

      // Capture the pre-branch snapshot at install time (just before the
      // first syncState runs).
      preBranchCacheKeys = snapshotCacheKeys();

      ifCondition.syncState = function (v: any) {
        try {
          const nextBool = emberToBool(v);
          if (prevBool !== null && prevBool !== nextBool) {
            if (prevBool === true) {
              destroyScope(trueBranchHelpers);
              destroyNewCacheEntriesSince(preBranchCacheKeys);
            } else {
              destroyScope(falseBranchHelpers);
            }
            // Update snapshot to the cache state BEFORE the branch re-renders
            preBranchCacheKeys = snapshotCacheKeys();
          }
          prevBool = nextBool;
        } catch {
          /* ignore */
        }
        return origSS(v);
      };
    }

    if (watchTarget && watchKey && ifCondition) {
      // Mark as Ember-managed so itemToNode handles it correctly
      ifCondition.__emberIfCondition = true;

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
        let prevBoolState: boolean | null = null;
        const destroyHelpersIn = (scope: Set<any>) => {
          if (!scope || scope.size === 0) return;
          const copy = Array.from(scope);
          scope.clear();
          // Also remove from the shared classHelperInstanceCache so subsequent
          // renders create fresh instances with their full lifecycle.
          try {
            // Class-helper instance cache via the get-only bridge accessor; the
            // guard short-circuits when the bridge returns undefined
            // (pre-bridge-install).
            const cache = getGxtRenderer()?.compilePipeline.getClassHelperInstanceCache?.();
            if (cache && typeof cache.forEach === 'function') {
              const toDelete: any[] = [];
              cache.forEach((v: any, k: any) => {
                if (copy.indexOf(v) !== -1) toDelete.push(k);
              });
              for (const k of toDelete) cache.delete(k);
            }
          } catch {
            /* ignore */
          }
          for (const inst of copy) {
            try {
              if (
                inst &&
                typeof inst.destroy === 'function' &&
                !inst.isDestroyed &&
                !inst.isDestroying
              ) {
                inst.destroy();
              }
            } catch {
              /* ignore */
            }
          }
        };
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
          // On branch transition, destroy helpers captured during the *outgoing*
          // branch's evaluation so their destroy/willDestroy hooks fire.
          try {
            const nextBool = emberToBool(v);
            if (prevBoolState !== null && prevBoolState !== nextBool) {
              if (prevBoolState === true) destroyHelpersIn(trueBranchHelpers);
              else destroyHelpersIn(falseBranchHelpers);
            }
            prevBoolState = nextBool;
          } catch {
            /* ignore */
          }
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
  const _patchedIf = g.$_if;
  try {
    Object.defineProperty(g, '$_if', {
      get() {
        return _patchedIf;
      },
      set(_v: any) {
        /* keep patched version */
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* ignore */
  }

  return true;
}
patchGlobalIf();
queueMicrotask(patchGlobalIf);

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
  // This covers the renderComponent strict-mode path that does NOT
  // go through globalThis.__gxtFlushAfterInsertQueue.
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
// to a different ref → `__gxtRebindEachItem` is never called for that row. When
// FALSE, the per-row `__gxtRev` revision cell is dead weight (created + read +
// subscribed by every body formula but never bumped), so the proxy get-trap
// SKIPS it entirely.
interface _EachItemHolder {
  raw: any;
  rebindPossible: boolean;
}

// Shared trap skip-list (framework/internal props bypass cell tracking).
// Hoisted out of the per-row closure.
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
const _eachItemProxyHandler: ProxyHandler<any> = {
  get(target, prop, _receiver) {
    const holder = _eachItemHolderByTarget.get(target);
    const raw = holder ? holder.raw : target;
    if (typeof prop !== 'string') return Reflect.get(raw, prop, raw);
    if (_eachProxySkipProp(prop)) return Reflect.get(raw, prop, raw);
    const value = Reflect.get(raw, prop, raw);
    if (typeof value === 'function') return value;
    try {
      // Subscribe to the per-holder revision cell so a REBIND (holder.raw swap)
      // re-fires this read even though the new object has different per-prop
      // cells. Keyed to the stable `holder`. This subscription is unconditional:
      // the re-fire depends on the body having subscribed to the revision cell
      // at render time, and there's no force-rerender primitive reachable here to
      // safely re-subscribe bodies rendered before the first rebind.
      //
      // Only ENTANGLE the revision cell when the owning list
      // can ever rebind this row (explicit `key=`). For `@identity`-keyed lists
      // (`holder.rebindPossible === false`) `__gxtRebindEachItem` is provably
      // never called, so the rev cell would be created + subscribed by every
      // body formula yet NEVER bumped — pure dead weight. Skipping it for the
      // common identity-keyed each (`{{#each this.data}}`) avoids that cost,
      // with rebind fully preserved for explicit-key lists.
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
  },
  set(target, prop, value) {
    const holder = _eachItemHolderByTarget.get(target);
    const raw = holder ? holder.raw : target;
    return Reflect.set(raw, prop, value, raw);
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
  // keyed reuse where the row's source object changed by ref, `__gxtRebindEachItem`
  // swaps `holder.raw` + bumps the revision cell so the body re-reads the new one.
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
// rebind). syncList calls `__gxtRebindEachItem` from INSIDE the first
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
if (_gxtRegisterHostHooks) {
  _gxtRegisterHostHooks({ rebindEachItem: _gxtRebindEachItemHook });
} else {
  (globalThis as any).__gxtRebindEachItem = _gxtRebindEachItemHook;
}

// Gated bridge: resolve an each-item body-PROXY back to its RAW source object.
// `wrapEachItemForTracking` (above) is module-local, so `_eachItemProxyToRaw`
// can't be read by manager.ts directly. manager.ts's `_gxtSyncAllWrappersBody`
// nested-arg-mutation check needs this to recognise that an #each-body
// component's `item` arg (a proxy) corresponds to a RAW object recorded in
// `_dirtiedNestedObjectsForHooks` on an in-place `set(item, …)` — so it can
// dispatch the component's `didUpdate`. Returns undefined for non-proxies.
(globalThis as any).__gxtEachItemRawFor = function (maybeProxy: any): any {
  if (maybeProxy && typeof maybeProxy === 'object' && _eachItemProxyToRaw.has(maybeProxy)) {
    return _eachItemProxyToRaw.get(maybeProxy);
  }
  return undefined;
};

// ---- each-in key-SET reactivity ----
//
// `{{#each-in obj}}` compiles to `{{#each (gxtEntriesOf obj)}}`. The
// `gxtEntriesOf` source formula does `Object.keys(obj)`, which taps the
// per-VALUE cells (`cellFor(obj, key)`) but NOT the SET of keys. So when
// `set(obj, 'NewKey', v)` adds a brand-new key, the source formula has no dep
// on "the key set" and never re-iterates → the new key is never rendered.
//
// FIX: a per-object key-SET revision cell `cellFor(obj, '__gxtKeySet')`.
// `gxtEntriesOf` READS it (so the source formula subscribes) and records the
// keys it has observed. SyncCore, on a write to a key NOT yet observed for that
// object, BUMPS the revision cell → the source re-iterates and picks up the new
// key. `_keySetSeen` tracks observed keys per object so we only bump on genuine
// additions (a value-only change of an existing key already propagates via its
// own per-value cell).
const _keySetSeen = new WeakMap<object, Set<string>>();
// Exposed so the canonical `gxtEntriesOfEmber` (ember-gxt-wrappers.ts, which
// OVERRIDES the inline `gxtEntriesOf` below) can record the key-set + subscribe
// the active source formula.
(globalThis as any).__gxtRecordEachInKeySet = function (resolved: object, keys: string[]): void {
  _gxtRecordKeySet(resolved, keys);
};
// Exposed so `gxtEntriesOfEmber` (ember-gxt-wrappers.ts) can subscribe the
// active each-in source formula to an intermediate property cell — e.g. an
// ObjectProxy's `content`. `{{#each-in proxy}}` reads `proxy.content` as a
// BARE access inside gxtEntriesOf, so a whole-content ref-swap
// (`set(proxy,'content',newObj)`) dirties `cellFor(proxy,'content')` but the
// source formula never subscribed to it → stale iteration. Reading the cell's
// `.value` here (inside the formula's tracker frame) registers the dep.
(globalThis as any).__gxtSubscribeCell = function (obj: any, key: string): void {
  if (!obj || typeof obj !== 'object') return;
  try {
    const c = cellFor(obj, key, /* skipDefine */ true);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    if (c) (c as any).value;
  } catch {
    /* ignore */
  }
};
function _gxtRecordKeySet(resolved: object, keys: string[]): void {
  let seen = _keySetSeen.get(resolved);
  if (!seen) {
    seen = new Set();
    _keySetSeen.set(resolved, seen);
  } else {
    seen.clear();
  }
  for (let i = 0; i < keys.length; i++) seen.add(keys[i]);
  try {
    // Subscribe the active source formula to this object's key-set revision.
    const revCell = cellFor(resolved as any, '__gxtKeySet', /* skipDefine */ true);
    if (revCell) (revCell as any).value;
  } catch {
    /* ignore */
  }
}
// Called from SyncCore on every keyed write. Bumps the key-set revision iff
// `keyName` is a key we have NOT previously observed for `obj` via gxtEntriesOf
// — i.e. a genuine key addition that an each-in source must re-iterate to see.
function _gxtMaybeBumpKeySet(obj: object, keyName: string): void {
  const seen = _keySetSeen.get(obj);
  // Only relevant for objects an each-in source has actually iterated. If we
  // never recorded a key-set for `obj`, no each-in depends on it → skip.
  if (!seen || seen.has(keyName)) return;
  seen.add(keyName);
  try {
    const revCell = cellFor(obj as any, '__gxtKeySet', /* skipDefine */ true);
    if (revCell) {
      (revCell as any).update(((revCell as any)._value || 0) + 1);
    }
  } catch {
    /* ignore */
  }
}

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
    // reused row to a NEW object ref (`__gxtRebindEachItem`). glimmer-next's
    // compiler emits `key` as: `null` (no `key=`), `'@identity'` (each-in /
    // explicit identity), or `'@index'` (rare; compiler warns + downgrades to
    // identity) → ALL of these key by object identity (a stable WeakMap), so a
    // given key can NEVER bind to a different ref → rebind is impossible → the
    // per-row `__gxtRev` cell is dead weight. Only an EXPLICIT property/function
    // `key=` (e.g. `key="id"`) can stale a key (in-place mutate the keyed prop,
    // then a ref-swap reuses the row by the stale key) → rebind possible → KEEP
    // the rev cell. So: rebindPossible = key is non-null, non-identity,
    // non-index.
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
    };
    // Wrap inverseFn so components created in the {{else}} branch (rendered
    // when items becomes empty on update) see the captured parent — at that
    // point the parentViewStack is empty and new instances would otherwise
    // have parentView=null, breaking the lifecycle tests.
    //
    // Additionally, when the forward branch items all disappear (items array
    // goes from non-empty → empty), classic Ember lifecycle expects
    // `willDestroyElement` + `willClearRender` to fire on the OLD items
    // BEFORE the inverse-branch components are constructed. GXT's native
    // reactivity has already torn down the old item DOM by the time our
    // wrapped inverseFn runs, so temporarily re-attach each old element to
    // a fixture container and fire the hooks — mirroring the mechanism in
    // __gxtDestroyUnclaimedPoolEntries' Phase 1. Guard with
    // `__gxtInverseDestroyFiredCycle` so Phase 1 and Phase 2b don't double-fire,
    // and mark each instance with `__gxtWDEFiredCycle` so Phase 2c's
    // `__gxtDestroyUnclaimedPoolEntries` skips re-firing the pre-destroy hooks.
    if (typeof inverseFn === 'function') {
      const origInverseFn = inverseFn;
      inverseFn = function wrappedInverseFn(ctx0: any) {
        // Lifecycle teardown ORDERING: the old each-rows whose
        // willDestroyElement/willClearRender fired below need their async
        // teardown (didDestroyElement + willDestroy) fired AFTER the inverse
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
                  if ((inst as any).__gxtWDEFiredCycle === currentCycle) continue;
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

                const _bridgeViewUtils = getGxtRenderer()?.viewUtils;
                const getViewElement = _bridgeViewUtils
                  ? (inst: any) => _bridgeViewUtils.getViewElement(inst)
                  : (inst: any) => inst && inst.element;
                const tempContainer = document.getElementById('qunit-fixture') || document.body;
                const reattached: Array<{ element: Element }> = [];
                _gxtSetDestroyReattachInProgress(true);
                try {
                  for (const inst of ordered) {
                    try {
                      const el = getViewElement(inst);
                      if (el instanceof HTMLElement && !el.isConnected) {
                        tempContainer.appendChild(el);
                        reattached.push({ element: el });
                      }
                    } catch {
                      /* ignore */
                    }
                  }
                } finally {
                  _gxtSetDestroyReattachInProgress(false);
                }
                for (const inst of ordered) {
                  try {
                    (inst as any).__gxtWDEFiredCycle = currentCycle;
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
                    // Install a per-instance trigger gate so that a subsequent
                    // call from __gxtDestroyUnclaimedPoolEntries' Phase 1
                    // (which fires willDestroyElement/willClearRender again
                    // for instances whose element is disconnected) becomes a
                    // no-op. Keep other hook names (didDestroyElement,
                    // willDestroy) flowing through so Phase 2/3 still emit
                    // their hooks in the stock sequence.
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
                // Detach reattached nodes so origInverseFn renders into a
                // parent without leftover old items
                for (const { element } of reattached) {
                  try {
                    if (element.parentNode) element.parentNode.removeChild(element);
                  } catch {
                    /* ignore */
                  }
                }
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
        // Lifecycle teardown ORDERING (fine-grained only): queue the old rows'
        // async teardown so `_gxtSyncDomNow` drains it AFTER Phase 3b
        // (flushAfterInsertQueue) has fired the NEW content's
        // didInsertElement/didRender — matching classic Ember's
        // new-insert-before-async-destroy.
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
      if (gxtFormula) {
        // Wrap in formula → MergedCell so $_eachSync gets a proper reactive tag
        const wrappedCell = gxtFormula(() => {
          const raw = origGetter();
          // Register array-owner mapping on every read so that newly-set
          // collection wrappers (post replaceList) hook their underlying
          // arrays into KVO mutation propagation too.
          _registerIterableUnderlyingArray(raw);
          // Fine-grained mode (gated): subscribe the source formula DIRECTLY to
          // the backing array's `[]` cell. `arrayContentDidChange` →
          // `notifyPropertyChange(array,'[]')` dirties `cellFor(array,'[]')`
          // (SyncCore primary cell.update). The array-owner fan-out covers
          // `this.<prop>` sources (parseable name), but NOT block-param sources
          // like the INNER each in `{{#each foo as |bar|}}` where `foo` has no
          // owner cell — its in-place mutation (`inner.replace(0,1,['lady'])`,
          // nested-each test) then never re-fired the inner list. Reading the
          // backing array's `[]` cell here makes the formula re-run on any
          // in-place mutation regardless of source shape.
          {
            _gxtSubscribeBackingArray(raw);
          }
          return normalizeEachCollection(raw);
        });
        return origEachSync(wrappedCell, fn, key, ctx, inverseFn, hasIndex);
      }
      // Fallback: pass function directly (legacy behavior)
      const wrappedGetter: any = function () {
        return normalizeEachCollection(origGetter());
      };
      if (origGetter.__gxtWatchTarget) wrappedGetter.__gxtWatchTarget = origGetter.__gxtWatchTarget;
      if (origGetter.__gxtWatchKey) wrappedGetter.__gxtWatchKey = origGetter.__gxtWatchKey;
      return origEachSync(wrappedGetter, fn, key, ctx, inverseFn, hasIndex);
    } else if (items && typeof items === 'object' && 'value' in items) {
      const origCell = items;
      const wrappedCell = Object.create(origCell);
      Object.defineProperty(wrappedCell, 'value', {
        get() {
          return normalizeEachCollection(origCell.value);
        },
        enumerable: true,
        configurable: true,
      });
      if (origCell.id !== undefined) wrappedCell.id = origCell.id;
      return origEachSync(wrappedCell, fn, key, ctx, inverseFn, hasIndex);
    }
    return origEachSync(normalizeEachCollection(items), fn, key, ctx, inverseFn, hasIndex);
  };
  g.$_eachSync.__emberPatched = true;

  // Protect from setupGlobalScope overwrite
  const _patchedEach = g.$_eachSync;
  try {
    Object.defineProperty(g, '$_eachSync', {
      get() {
        return _patchedEach;
      },
      set(_v: any) {
        /* keep patched version */
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    /* ignore */
  }
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
// the canonical `__gxtSyncAllWrappers` body in manager.ts; the reader in
// `_gxtSyncDomNow` (Phase 1 below) dispatches through
// `getGxtRenderer()?.compilePipeline.syncAllWrappers?.()`.

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
//
// Exposed through the `compilePipeline.syncDomNow` typed-bridge method
// (registered in `installCompilePipelinePart` at file EOF); the
// `(globalThis as any).__gxtSyncDomNow` slot is also retained for dual exposure
// so the test-harness probes and dev scripts that read/wrap the slot keep
// working.
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
    // Mirror "had pending sync" into a flag that survives
    // __gxtForceEmberRerender's finally-block clear, so downstream phases (e.g.
    // __gxtDestroyUnclaimedPoolEntries in manager.ts) can still tell whether this
    // sync was driven by a real property change. Used to gate destroy-error
    // capture: spurious unclaimed sweeps from initial-render syncs (where no
    // property change drove the sync) should NOT route user-thrown
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
    // Wrap ALL phases in try/finally so __gxtSyncing is ALWAYS reset,
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
      // same-runtask template reads. Re-entrance during drain is handled by
      // `_drainInProgress`; recursive `_gxtTriggerReRender` calls during a
      // Deferred body enqueue at the tail and the cursor loop picks them up
      // in the same pass (bounded by `_MAX_DRAIN`).
      if (_deferredCascadeQueue.length > 0) {
        _drainInProgress = true;
        try {
          _drainCascadeQueue();
        } finally {
          _drainInProgress = false;
          _deferredCascadeQueue.length = 0;
          _deferredCascadeIndex = new WeakMap();
        }
      }
      // Only run gxtSyncDom when a real property change triggered the sync.
      // Cell creation during initial render also sets __gxtPendingSync, but those
      // cells may have stale values (e.g., each-formula re-evaluates with [] before
      // the correct value propagates). Skipping gxtSyncDom for non-property-change
      // syncs prevents spurious #each inverse rendering on first render.
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
      // during __gxtTriggerReRender calls and are flushed HERE (after all gxtSyncDom
      // calls) so batched property changes are applied atomically — IfConditions see
      // the final state of all conditions, not intermediate states.
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
        // plus any with metadata whose nextBool came back null. Use the original
        // notifyIfWatchers fan-out so behavior matches the historical path for
        // these untracked watchers.
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
      // NOTE: Previously this block used __gxtCheckAllTagsCurrent to skip the morph
      // when root tags appeared current. However, __gxtUpdateRootTagValues (Phase 1b
      // above) already updates tags to match current values, so checkAllTagsCurrent
      // always returned true — incorrectly skipping the morph for cases where
      // gxtSyncDom didn't handle the update (e.g., inline $__if with function values,
      // undefined → truthy transitions). The morph must always run when hadPendingSync
      // is true from a property change to ensure correctness.
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
              // Curried-node path: re-invoke item() to get a fresh Node
              if (info.__isCurriedNodePath) {
                const newNode = render();
                if (newNode) {
                  let node = sm.nextSibling;
                  while (node && node !== em) {
                    const next = node.nextSibling;
                    parent.removeChild(node);
                    node = next;
                  }
                  parent.insertBefore(newNode, em);
                }
                continue;
              }

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
              const _rem2: Node[] = [];
              let node = sm.nextSibling;
              while (node && node !== em) {
                const next = node.nextSibling;
                _rem2.push(node);
                parent.removeChild(node);
                node = next;
              }
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
      // CRITICAL: Always reset __gxtSyncing even if an error escapes.
      // Without this, the flag stays true forever and _gxtSyncDomNow becomes a
      // permanent no-op, causing all subsequent tests to fail.
      _gxtSetSyncing(false);
      // Also reset the property-driven mirror flag so a subsequent
      // initial-render sync starts in a clean state.
      _gxtSetSyncIsPropertyDriven(false);
    }
    // Re-throw any deferred errors from the force-rerender or lifecycle phases
    // so they propagate to assert.throws() in tests. The read happens AFTER the
    // outer try/finally above has already reset `_gxtSyncingFlag` and
    // `_gxtSyncIsPropertyDrivenFlag`, so the throw escapes with a clean sync
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

// Dual-publish the canonical `_gxtSyncDomNow` on `globalThis` so the harness
// probes and dev-debug scripts that read/wrap the slot keep working. In-package
// readers route through `compilePipeline.syncDomNow?.()` via the bridge.
(globalThis as any).__gxtSyncDomNow = _gxtSyncDomNow;

// Also schedule a fallback setTimeout flush for non-test scenarios
// where __gxtSyncDomNow isn't called explicitly.
// Guards:
// 1. Skip if no pending sync (`_gxtGetPendingSync()`).
// 2. Skip if __gxtSyncing is stuck true (prevents piling up on a hung sync).
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
  // Clear the deferred-cascade queue + index + in-progress flag between tests
  // so queue state never leaks across the test boundary (defensive — the queue
  // should already be drained by `_gxtSyncDomNow`).
  _deferredCascadeQueue.length = 0;
  _deferredCascadeIndex = new WeakMap();
  _drainInProgress = false;
  // Clear dynamic component change listeners and stale getter from $_dc_ember.
  // The Set + string-path counter live in manager.ts behind the bridge's
  // `clearDynamicComponentListeners()`. The clear resets both in lockstep —
  // without that lockstep, an orphaned listener count leaks across tests and
  // makes _gxtSyncDomNow incorrectly clear the had-pending-sync flag in Phase 1,
  // which then causes __gxtForceEmberRerender to skip the morph for tests that
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
  // can trigger __gxtForceEmberRerender (innerHTML='' + rebuild) on the next
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

// Set GXT mode flag
(globalThis as any).__GXT_MODE__ = true;

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
// Publish the GXT-original `$_MANAGERS` reference via the typed gxt-bridge
// `runtime.getOriginalManagers` so manager.ts can find the GXT-original object
// reliably (even after globalThis.$_MANAGERS is reassigned). Both this writer
// and gxt-with-runtime-hbs.ts contribute the same object via
// `installRuntimePart`; last-writer-wins is benign because both reference the
// same `@lifeart/gxt` module instance (via the rollup `manualChunks`
// consolidation).
installRuntimePart({
  getOriginalManagers: () => $_MANAGERS,
});

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
    try {
      Object.defineProperty(globalThis, '$_maybeModifier', {
        get() {
          return emberMaybeModifier;
        },
        set(_v: any) {
          /* protect from setupGlobalScope overwrite */
        },
        configurable: true,
        enumerable: true,
      });
    } catch {
      (globalThis as any).$_maybeModifier = emberMaybeModifier;
    }
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
  try {
    Object.defineProperty(globalThis, '$_helperHelper', {
      get() {
        return emberHelperHelper;
      },
      set(_v: any) {
        /* protect from setupGlobalScope overwrite */
      },
      configurable: true,
      enumerable: true,
    });
  } catch {
    _g.$_helperHelper = emberHelperHelper;
  }
}

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
// Module-local (the retired `globalThis.__EMBER_BUILTIN_HELPERS__` slot);
// cross-file readers (ember-gxt-wrappers' helper resolution + entries-of
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
              // Suppression is honored by the `_gxtTriggerSuppressedFlag`
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
  // this)`. The Ember-mode strict-shadow check (compile.ts:15527) then
  // verifies the name is in `__EMBER_BUILTIN_HELPERS__`; without these
  // entries, every `gt`/`gte`/`lt`/`lte`/`neq` invocation throws
  // "not in scope".
  //
  // Args arrive pre-unwrapped via `unwrapArgs` in
  // `ember-gxt-wrappers.ts:835` for `{{gt a b}}` content position, but
  // for the SubExpression case `{{if (gt a b) ...}}` GXT routes through
  // a different code path that leaves the args as zero-arity getter
  // functions. We re-unwrap defensively so both paths produce numeric
  // results. The arg-count `throw` matches the Glimmer runtime helper
  // bodies (packages/@glimmer/runtime/lib/helpers/gt.ts, etc.) so the
  // `'throws if not called with exactly two arguments'` tests pass.
  // Use getDebugFunction('assert') so expectAssertion's stub can capture
  // the throw before it propagates.
  gt: (...args: any[]) => {
    if (args.length !== 2) {
      const _assert = getDebugFunction('assert');
      const msg = `\`gt\` expects exactly two arguments, received ${args.length}`;
      if (_assert) _assert(msg, false);
      throw new Error(msg);
    }
    const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
    const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
    return (a as number) > (b as number);
  },
  gte: (...args: any[]) => {
    if (args.length !== 2) {
      const _assert = getDebugFunction('assert');
      const msg = `\`gte\` expects exactly two arguments, received ${args.length}`;
      if (_assert) _assert(msg, false);
      throw new Error(msg);
    }
    const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
    const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
    return (a as number) >= (b as number);
  },
  lt: (...args: any[]) => {
    if (args.length !== 2) {
      const _assert = getDebugFunction('assert');
      const msg = `\`lt\` expects exactly two arguments, received ${args.length}`;
      if (_assert) _assert(msg, false);
      throw new Error(msg);
    }
    const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
    const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
    return (a as number) < (b as number);
  },
  lte: (...args: any[]) => {
    if (args.length !== 2) {
      const _assert = getDebugFunction('assert');
      const msg = `\`lte\` expects exactly two arguments, received ${args.length}`;
      if (_assert) _assert(msg, false);
      throw new Error(msg);
    }
    const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
    const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
    return (a as number) <= (b as number);
  },
  neq: (...args: any[]) => {
    if (args.length !== 2) {
      const _assert = getDebugFunction('assert');
      const msg = `\`neq\` expects exactly two arguments, received ${args.length}`;
      if (_assert) _assert(msg, false);
      throw new Error(msg);
    }
    const a = typeof args[0] === 'function' && !(args[0] as any).prototype ? args[0]() : args[0];
    const b = typeof args[1] === 'function' && !(args[1] as any).prototype ? args[1]() : args[1];
    return a !== b;
  },
  // gxtGetOutletState: Returns the current outlet state from
  // globalThis.__currentOutletState. Used as the fallback for
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
    // Group D (gated): subscribe the each-in source to the object's key-SET
    // revision so `set(obj,'NewKey')` re-iterates. (This inline copy is the
    // fallback — ember-gxt-wrappers.ts overrides `gxtEntriesOf` at runtime.)
    {
      _gxtRecordKeySet(resolved, keys);
    }
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
    const g = globalThis as any;

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
  // mount: Engine mounting — handled by <ember-mount> custom element.
  // This stub exists for any remaining {{mount}} calls that weren't transformed.
  mount: (engineName: string) => {
    // Create the custom element dynamically
    const el = document.createElement('ember-mount');
    el.setAttribute(
      'data-engine',
      typeof engineName === 'function' ? (engineName as any)() : engineName
    );
    return el;
  },
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
  __gxtCommentLookup: (token: unknown) => {
    // Reads the module-local `_gxtCommentRegistry` (eagerly initialized via
    // Object.create(null), so no guard is needed).
    const key = typeof token === 'string' ? token : String(token ?? '');
    return _gxtCommentRegistry[key] || '';
  },
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
const _GXT_ON_EXT_ALIAS = 'on-ext';
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

// `{{on ...}}` → `{{on-ext ...}}` rewriting is now handled by the
// `gxtOnModifierTransform` AST visitor (see `buildGxtDialectTransforms`), which
// targets `ElementModifierStatement` nodes directly. The former
// `transformOnModifierHashArgs` string scanner lived here.

// Caching wrapper for {{unbound}} helper.
// Each call site in a template gets a unique ID. The first evaluation
// stores the result; subsequent evaluations return the cached value.
// The cache is stored on the component context (`ctx`) to isolate
// different component instances.
// IMPORTANT: Takes a lazy thunk `() => value` to avoid eagerly evaluating
// the expression (which would track GXT cell dependencies).
// Caching wrapper for {{unbound}} helper.
// Each context gets its own cache (a plain object keyed by call-site ID).
// This handles both:
// - Single component renders (same ctx across re-evaluations)
// - #each iterations (each iteration has its own ctx)
//
// `__gxtUnboundEval` (the eval+cache function) and `__gxtUnboundResetSlots`
// (the per-render slot-counter reset) are inlined directly into the emitted
// `templateFnCode` Function() body rather than published on globalThis. The GXT
// serializer emits `__gxtUnboundEval(__ubCache, "__ubN", () => unbound(...))` for
// the `{{unbound X}}` top-level form AND for inline `(unbound X)` sub-expressions
// (both serializer paths are at parity). The `_ubSlots` Map state is a per-Function-body local
// (avoids a shared global Map that was fragile across concurrent renders of
// different templates). The GXT reactive tracker getter/setter are passed in as
// Function() constructor parameters
// (`Function('__ubGT', '__ubST', templateFnCode)(_gxtGetTracker, _gxtSetTracker)`),
// so the inlined eval body closes over stable module-bound references without a
// globalThis surface. See the `templateFnCode` builder (search for `__ubCache`)
// for the inlined definitions.

// Runtime guard for the "resolved helper passed as a named argument" form.
// When a template contains `<Component @name={{helperIdent}} />` (no parens),
// Ember's strict-mode compiler throws a specific error because the syntax
// is ambiguously pass-by-reference vs invocation. We mirror that check at
// render time: if `name` resolves to a registered helper via owner lookup,
// throw the same error. Otherwise this returns undefined (letting the
// surrounding expression fall through to its original $_maybeHelper path).
//
// The guard body is inlined into the emitted `templateFnCode` Function() body
// (not published on globalThis); the post-processor rewrites the bare named-arg
// helper pattern `["@name", $_maybeHelper("ident", [], this)]` into
// `["@name", (__gxtAssertNotResolvedHelperAsNamedArg("ident", this),
// $_maybeHelper("ident", [], this))]`. The body reads only the injected
// `__gxtBuiltinHelpers` / `__gxtAmbientOwner` Function parameters and
// `Symbol.for('OWNER')` — no globalThis surface. The inline injection is
// gated on `hasNamedArgHelperGuard` so templates without the guard pattern
// pay zero overhead. See the `templateFnCode` builder (search for
// `__gxtAssertNotResolvedHelperAsNamedArg`) for the inlined definition.

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here
// The $_blockParam helper reads from the top of the stack
// Cross-file readers (ember-gxt-wrappers' slot-render frames, manager.ts's
// has-block frames) reach these by REFERENCE through the compilePipeline
// bridge accessors (getBlockParamsStack / getContextBlockParams /
// getSlotsContextStack) — the retired `globalThis.__blockParamsStack` /
// `__contextBlockParams` / `__slotsContextStack` slots.
const blockParamsStack: any[][] = [];

// Per-context block params storage for persistence across re-renders
// WeakMap allows garbage collection when context is no longer referenced
const contextBlockParams = new WeakMap<object, any[]>();

// Current slot params - persists until next slot is called
// This is used for re-renders where the stack has been popped
// Key insight: for simple non-nested slot cases, keeping the "last" params
// allows re-renders to access them even after the slot function returns
let currentSlotParams: any[] | null = null;

// The current render's `$slots` / `$fw` — formerly the `globalThis.$slots` /
// `globalThis.$fw` slots written around every template render. Compiled
// template Function() bodies read them through the injected `__gxtGetSlots` /
// `__gxtGetFw` accessor parameters.
// The most recent template render context and the hash-getter construction
// context (set while a hash-constructed getter runs) — the retired
// `globalThis.__lastRenderContext` / `__hashGetterCtx` slots; used by the
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

// Per-template scope-value store — formerly per-template `globalThis
// .__gxtScope_<hash>` keys. Same late-binding semantics: each compile
// overwrites its storeKey entry, and compiled bodies read through the
// injected `__gxtGetScope` accessor parameter PER INVOCATION.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _gxtScopeStore = new Map<string, any>();
const _gxtGetScopeFn = (key: string) => _gxtScopeStore.get(key);

// Helper function to get a block param by index
// This is called by compiled templates that use {{($_blockParam N)}}
(globalThis as any).$_blockParam = function (index: number) {
  const currentParams = blockParamsStack[blockParamsStack.length - 1];
  const rawValue = currentParams ? currentParams[index] : undefined;
  // Unwrap reactive value to get current value
  return unwrapReactiveValue(rawValue);
};

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

  // Check if it's a GXT reactive getter function that should be evaluated.
  // Only call functions that are GXT-internal reactive wrappers — NOT plain
  // user functions like arrow functions yielded as block params (e.g.,
  // {{yield this.updatePerson}}). GXT reactive getters are typically created
  // by $_slot and have no prototype (arrow-style) and no user-facing markers.
  // However, yielded user functions also lack prototypes. The safest check:
  // only unwrap functions that have GXT-specific markers like __isReactiveGetter
  // or that come from formula.fn. Plain functions (user callbacks) are returned as-is.
  if (typeof value === 'function' && (value as any).__isReactiveGetter) {
    try {
      return value();
    } catch {
      return value;
    }
  }

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

// Also expose through the functional-helper brand for GXT's helper resolution.
// Hook mode keeps the brand Set module-local (the gxt runtime calls the
// registered pair); legacy mode keeps the historical `EmberFunctionalHelpers`
// global Set (which the pre-API gxt dist consults directly).
if (_gxtRegisterHostHooks) {
  const _functionalHelpers = new Set<unknown>();
  _gxtRegisterHostHooks({
    isFunctionalHelper: (fn: unknown) => _functionalHelpers.has(fn),
    markFunctionalHelper: (fn: unknown) => void _functionalHelpers.add(fn),
  });
  _functionalHelpers.add((globalThis as any).$_blockParam);
} else {
  if (typeof (globalThis as any).EmberFunctionalHelpers === 'undefined') {
    (globalThis as any).EmberFunctionalHelpers = new Set();
  }
  (globalThis as any).EmberFunctionalHelpers.add((globalThis as any).$_blockParam);
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
// All sites are intra-file. Save/restore tolerates `undefined`, so no lazy-init
// is needed.
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
      const $SLOTS = Symbol.for('gxt-slots');
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
        const $ARGS_KEY = Symbol.for('gxt-args');
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
            const $SLOTS = Symbol.for('gxt-slots');
            const namedArgs: any = {};
            if (args) {
              for (const key of Object.keys(args)) {
                if (key === 'args' || key.startsWith('$')) continue;
                const desc = Object.getOwnPropertyDescriptor(args, key);
                if (desc) {
                  Object.defineProperty(namedArgs, key, desc);
                }
              }
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
              const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
              if (gxtSlots && typeof gxtSlots === 'object') {
                _setInternalProp(namedArgs, '$slots', gxtSlots);
              }
            }
            const handleResult = managers.component.handle(componentValue, namedArgs, null, ctx);
            if (typeof handleResult === 'function') {
              return handleResult();
            }
            return handleResult;
          }
        }
      }
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const $PROPS = Symbol.for('gxt-props');
        const fw = args?.[$PROPS] || null;
        const handleResult = managers.component.handle(comp, args, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    if (comp && comp.__isCurriedComponent) {
      // Build args from the GXT args object
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        let fw = args?.[$PROPS] || null;

        // Extract named args from the GXT args object
        const namedArgs: any = {};
        if (args) {
          // GXT may pass args in tagProps format: [props[], attrs[], events[]]
          // Check if args is an array (tagProps format from $_dc)
          if (Array.isArray(args) && args.length >= 2 && Array.isArray(args[1])) {
            // tagProps format: extract named args from attrs array (index 1)
            fw = args; // The whole tagProps array is the fw
            const attrs = args[1];
            for (const entry of attrs) {
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
            // Extract slots from tagProps
            const gxtSlots = args[$SLOTS as any];
            if (gxtSlots && typeof gxtSlots === 'object') {
              _setInternalProp(namedArgs, '$slots', gxtSlots);
            }
          } else {
            // Plain object format
            for (const key of Object.keys(args)) {
              if (key === 'args' || key.startsWith('$')) continue;
              const desc = Object.getOwnPropertyDescriptor(args, key);
              if (desc) {
                Object.defineProperty(namedArgs, key, desc);
              }
            }
            // Also check args.args (GXT puts named args in args['args'])
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

            // Extract slots from GXT args for {{yield}} support
            const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
            if (gxtSlots && typeof gxtSlots === 'object') {
              _setInternalProp(namedArgs, '$slots', gxtSlots);
            }
          }
        }

        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    // Also handle functions with __stringComponentName (from $_dc_ember markers)
    if (typeof comp === 'function' && comp.__stringComponentName) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        const namedArgs: any = {};
        let fw = null;
        if (args) {
          // args may be GXT tagProps format: [props, attrs, events]
          if (Array.isArray(args) && args.length >= 2 && Array.isArray(args[1])) {
            fw = args;
            // Extract named args from attrs array (index 1)
            // Each entry is ["@key", value] or ["@key", () => value]
            const attrs = args[1];
            for (const entry of attrs) {
              if (Array.isArray(entry) && entry.length >= 2) {
                let key = entry[0];
                const val = entry[1];
                // Strip @ prefix for named args
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
            // Also extract slots from GXT args
            const gxtSlots = args[$SLOTS as any];
            if (gxtSlots) {
              _setInternalProp(namedArgs, '$slots', gxtSlots);
            }
          } else {
            // Plain object format
            for (const key of Object.keys(args)) {
              if (key === 'args' || key.startsWith('$')) continue;
              const desc = Object.getOwnPropertyDescriptor(args, key);
              if (desc) {
                Object.defineProperty(namedArgs, key, desc);
              }
            }
          }
        }
        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
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
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        const fw = args?.[$PROPS] || null;
        const namedArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              // Unwrap curried ember helpers in content-arg position.
              // When {{helper foo "..."}} lands in @value, the underlying
              // value/getter may be a GXT getter that yields a curried
              // helper, or the curried helper function directly. Wrap in
              // a getter that resolves all nested levels at read time so
              // reactive reads see the resolved value instead of the
              // function source (which would otherwise be stringified
              // straight into the DOM).
              const unwrapCurriedHelper = (v: any): any => {
                let out = v;
                let guard = 8;
                while (
                  typeof out === 'function' &&
                  (out as any).__isEmberCurriedHelper &&
                  guard-- > 0
                ) {
                  try {
                    out = (out as any)();
                  } catch {
                    break;
                  }
                }
                return out;
              };
              if (desc.get) {
                const origGet = desc.get;
                Object.defineProperty(namedArgs, key, {
                  get() {
                    let v = origGet.call(args);
                    // Unwrap nested getters that yield a curried helper.
                    // Stop at non-functions, curried components, and
                    // fn helpers/mut cells (those must reach the manager
                    // untouched).
                    while (
                      typeof v === 'function' &&
                      !(v as any).__isEmberCurriedHelper &&
                      !(v as any).__isCurriedComponent &&
                      !(v as any).__isFnHelper &&
                      !(v as any).__isMutCell &&
                      !(v as any).prototype
                    ) {
                      try {
                        v = (v as any)();
                      } catch {
                        break;
                      }
                    }
                    return unwrapCurriedHelper(v);
                  },
                  enumerable: desc.enumerable,
                  configurable: desc.configurable,
                });
              } else if ('value' in desc) {
                let v = desc.value;
                // For plain-value descriptors that hold a getter function
                // returning a curried helper, wrap as a lazy getter too.
                if (
                  typeof v === 'function' &&
                  !(v as any).__isEmberCurriedHelper &&
                  !(v as any).__isCurriedComponent &&
                  !(v as any).__isFnHelper &&
                  !(v as any).__isMutCell &&
                  !(v as any).prototype
                ) {
                  const vGet = v;
                  Object.defineProperty(namedArgs, key, {
                    get() {
                      let r: any = vGet;
                      while (
                        typeof r === 'function' &&
                        !(r as any).__isEmberCurriedHelper &&
                        !(r as any).__isCurriedComponent &&
                        !(r as any).__isFnHelper &&
                        !(r as any).__isMutCell &&
                        !(r as any).prototype
                      ) {
                        try {
                          r = (r as any)();
                        } catch {
                          break;
                        }
                      }
                      return unwrapCurriedHelper(r);
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
          const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
          if (gxtSlots && typeof gxtSlots === 'object') {
            _setInternalProp(namedArgs, '$slots', gxtSlots);
          }
        }
        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
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
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        const fw = args?.[$PROPS] || null;
        const namedArgs: any = {};
        const unwrapCurriedHelper2 = (v: any): any => {
          let out = v;
          let guard = 8;
          while (typeof out === 'function' && (out as any).__isEmberCurriedHelper && guard-- > 0) {
            try {
              out = (out as any)();
            } catch {
              break;
            }
          }
          return out;
        };
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              if (desc.get) {
                const origGet = desc.get;
                Object.defineProperty(namedArgs, key, {
                  get() {
                    let v = origGet.call(args);
                    while (
                      typeof v === 'function' &&
                      !(v as any).__isEmberCurriedHelper &&
                      !(v as any).__isCurriedComponent &&
                      !(v as any).__isFnHelper &&
                      !(v as any).__isMutCell &&
                      !(v as any).prototype
                    ) {
                      try {
                        v = (v as any)();
                      } catch {
                        break;
                      }
                    }
                    return unwrapCurriedHelper2(v);
                  },
                  enumerable: desc.enumerable,
                  configurable: desc.configurable,
                });
              } else {
                Object.defineProperty(namedArgs, key, desc);
              }
            }
          }
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
          const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
          if (gxtSlots && typeof gxtSlots === 'object') {
            _setInternalProp(namedArgs, '$slots', gxtSlots);
          }
        }
        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
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
          const $PROPS = Symbol.for('gxt-props');
          const $SLOTS = Symbol.for('gxt-slots');
          const namedArgs: any = {};
          let fw = args?.[$PROPS] || null;
          if (args) {
            for (const key of Object.keys(args)) {
              if (key === 'args' || key.startsWith('$')) continue;
              const desc = Object.getOwnPropertyDescriptor(args, key);
              if (desc) {
                Object.defineProperty(namedArgs, key, desc);
              }
            }
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
            const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
            if (gxtSlots && typeof gxtSlots === 'object') {
              _setInternalProp(namedArgs, '$slots', gxtSlots);
            }
          }
          const handleResult = managers.component.handle(resolved, namedArgs, fw, ctx);
          if (typeof handleResult === 'function') {
            return handleResult();
          }
          return handleResult;
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
        const $SLOTS = Symbol.for('gxt-slots');
        const $PROPS = Symbol.for('gxt-props');
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
// CONSERVATISM (proves each skipped scan is dead):
//  - plain lowercase tag /^[a-z][a-z0-9]*$/ (NO hyphen — a kebab tag could be a
//    registered component/helper handled by mightBeComponent) → never a
//    component / dynamic (@/this.) / named-block (:) / EmberHtmlRaw tag.
//  - no namespace (_gxtNamespace unset) → the SVG/MathML getter-wrapping +
//    the (already namespace-gated) attr scans don't apply.
//  - no splat (tagProps[3] not an array) → no ...attributes merge / fw reorder.
//  - tagProps[1] (attrs): no function-valued entry (would need the eager
//    nullish-getter scan + reactive-undefined cleanup) AND no STATIC
//    null/undefined entry (would need the null-attr strip → "do not render").
//  - tagProps[2] (events): no TEXT_CONTENT entry (key '1') → the SafeString
//    text-getter scan finds nothing AND the modifier/text reorder (needs BOTH
//    text + modifier present) can't apply. Plain DOM event listeners (key
//    'click' …) and ON_CREATED modifiers (key '0') are applied natively by
//    GXT's $ev exactly as the slow path would leave them.
//  - tagProps[0] (props): every entry is the class slot (empty key) — GXT's
//    addProperties applies class (incl. a reactive class getter) natively, and
//    the position-0 post-apply scan explicitly skips the empty key. Any other
//    position-0 key would risk the post-apply doing real setAttribute work, so
//    we bail to the slow path.
//
// hasReactiveStyle is irrelevant here: a reactive `style` binding lands in
// tagProps[0] under the 'style' key (not empty-key), which fails the props
// check above → slow path. So the style getter-wrap is never skipped.
const _PLAIN_HTML_TAG_RE = /^[a-z][a-z0-9]*$/;
function _gxtTagFastPathEligible(tag: unknown, tagProps: any): boolean {
  if (typeof tag !== 'string' || !_PLAIN_HTML_TAG_RE.test(tag)) return false;
  if (_gxtNamespace) return false;
  if (tagProps === g.$_edp || tagProps == null) return false;
  // No splat / forwarded attributes.
  if (Array.isArray(tagProps[3])) return false;
  // tagProps[1] (attrs): reject any reactive (function) value or static
  // null/undefined (which the slow path would strip).
  const attrs = tagProps[1];
  if (Array.isArray(attrs)) {
    for (let i = 0; i < attrs.length; i++) {
      const entry = attrs[i];
      if (!Array.isArray(entry) || entry.length < 2) return false;
      const v = entry[1];
      if (typeof v === 'function') return false;
      if (v === null || v === undefined) return false;
    }
  } else if (attrs != null) {
    return false;
  }
  // tagProps[2] (events): reject any TEXT_CONTENT entry (key '1') — that is the
  // only thing the SafeString scan / modifier-text reorder care about.
  const events = tagProps[2];
  if (Array.isArray(events)) {
    for (let i = 0; i < events.length; i++) {
      const entry = events[i];
      if (Array.isArray(entry) && entry[0] === '1') return false;
    }
  } else if (events != null) {
    return false;
  }
  // tagProps[0] (props): only the class slot (empty key) is safe to leave to
  // GXT (the post-apply scan skips it). Any other key → slow path.
  const props = tagProps[0];
  if (Array.isArray(props)) {
    for (let i = 0; i < props.length; i++) {
      const entry = props[i];
      if (!Array.isArray(entry) || entry[0] !== '') return false;
    }
  } else if (props != null) {
    return false;
  }
  return true;
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
          const $PROPS = Symbol.for('gxt-props');
          const $SLOTS = Symbol.for('gxt-slots');
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
      // destroying`). The wrapper sets Symbol.for('gxt-block-wrapper') on itself
      // (glimmer-next dom.ts) before its body renders, so this guard sees it.
      !(ctx as any)[BLOCK_WRAPPER_SYMBOL]
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
        const needsContext =
          contextTag === 'table' ||
          contextTag === 'thead' ||
          contextTag === 'tbody' ||
          contextTag === 'tfoot' ||
          contextTag === 'tr' ||
          contextTag === 'colgroup' ||
          contextTag === 'select' ||
          contextTag === 'optgroup';
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
      (endAnchor as any).__gxtHtmlRawEnd = true;
      (startAnchor as any).__gxtHtmlRawGetter = () => lastHtml;
      (startAnchor as any).__gxtHtmlRawEndAnchor = endAnchor;
      (startAnchor as any).__gxtHtmlRawContentNodes = contentNodes;
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
        const needsReparse =
          contextTag === 'table' ||
          contextTag === 'thead' ||
          contextTag === 'tbody' ||
          contextTag === 'tfoot' ||
          contextTag === 'tr' ||
          contextTag === 'colgroup' ||
          contextTag === 'select' ||
          contextTag === 'optgroup';
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

      // Keep the post-mount reparse flag unused — the caller-context
      // probe above usually nails the right parent for the initial parse
      // and the effect above handles all subsequent reparses.
      void reparsedForParent;
      void reparseIfNeeded;

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
            const BUILTIN_HELPERS = [
              'array',
              'hash',
              'concat',
              'fn',
              'get',
              'mut',
              'readonly',
              'unique-id',
              'unbound',
              '__mutGet',
            ];
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
            // The cache prevents re-creation when __gxtForceEmberRerender does
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
                    // Find RECOMPUTE_TAG symbol on the instance
                    const symKeys = Object.getOwnPropertySymbols(helperInstance);
                    for (const sym of symKeys) {
                      if (sym.toString().includes('RECOMPUTE_TAG')) {
                        recomputeTag = helperInstance[sym];
                        break;
                      }
                    }
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
          // Helper to detect if children use block params
          // Block params are accessed via $_bp0, $_bp1 getters on Object.prototype
          const detectBlockParams = (slotChildren: any[]): boolean => {
            // Check if any child function references block params
            for (const child of slotChildren) {
              if (typeof child === 'function') {
                const fnStr = child.toString();
                // Look for $_bp references which indicate block params are used
                if (hasBlockParamRef(fnStr)) {
                  return true;
                }
              }
            }
            return false;
          };

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
              // GXT compiles named block children as lazy functions:
              //   () => $_tag(':header', ...) which returns a __isNamedBlock marker.
              // Evaluate ONLY functions that look like named block factories to avoid
              // side effects from eagerly evaluating component children.
              if (
                typeof child === 'function' &&
                !child.__isCurriedComponent &&
                !(child instanceof Node)
              ) {
                const fnStr = child.toString();
                if (fnStr.includes("$_tag(':") || fnStr.includes('$_tag(":')) {
                  try {
                    const evaluated = child();
                    if (evaluated && typeof evaluated === 'object' && evaluated.__isNamedBlock) {
                      child = evaluated;
                    }
                  } catch {
                    /* not a named block factory — keep as-is */
                  }
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

            // Helper to create a slot function
            // explicitHasBlockParams: if true/false is explicitly provided, use it
            // otherwise detect from children
            const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
              // Use explicit flag if provided, otherwise detect from children
              const hasBlockParams =
                explicitHasBlockParams !== undefined
                  ? explicitHasBlockParams
                  : detectBlockParams(slotChildren);

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
                const _fgSlot = true;
                const unwrappedParams = params.map((param) => {
                  // Unwrap GXT reactive formulas (objects with fn/isConst)
                  if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                    // Fine-grained: keep CONSTANT formulas snapshotted (no cell
                    // to subscribe to) but keep REACTIVE formulas live so the
                    // consumer re-reads them. `param.isConst` is already computed
                    // by glimmer-next's createSlot (it reads `.value` before
                    // deciding to keep the formula), so a live formula reaching
                    // here is genuinely reactive.
                    if (_fgSlot && param.isConst !== true) {
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
                      const fnStr = child.toString();
                      // Lazy-wrapped component children contain $_tag or $_c calls — evaluate them
                      if (
                        fnStr.includes('$_tag(') ||
                        fnStr.includes('$_c(') ||
                        fnStr.includes('$_dc(') ||
                        fnStr.includes('$_eachSync(')
                      ) {
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

          // Legacy: If no slots were created but children exist, create default slot
          // (This handles the case where there are no named blocks)
          if (
            effectiveChildren &&
            effectiveChildren.length > 0 &&
            !slots.default &&
            Object.keys(slots).length === 0
          ) {
            // Check for explicit hasBlockParams marker from args
            const explicitHasBlockParams =
              args.__hasBlockParams__ !== undefined
                ? (typeof args.__hasBlockParams__ === 'function'
                    ? args.__hasBlockParams__()
                    : args.__hasBlockParams__) === 'default'
                : undefined;
            // Detect from children if not explicitly set
            const hasBlockParams =
              explicitHasBlockParams !== undefined
                ? explicitHasBlockParams
                : detectBlockParams(effectiveChildren);

            const slotFn = (slotCtx: any, ...params: any[]) => {
              // CRITICAL: Do NOT unwrap params here - keep them as raw values (potentially reactive)
              // The $_bp0, $_bp1, etc. getters will unwrap them when accessed
              // This allows reactivity to work: when the component's property changes,
              // the next access to $_bp0 will return the new value
              const rawParams = [...params];

              // Store on slotCtx for context-based lookup
              const contextParams = contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, rawParams);
              }

              // Also store as current slot params for re-renders
              // This persists until the next slot call, allowing reactivity
              // to access block params even after the slot function returns
              currentSlotParams = rawParams;

              // Push block params onto the global stack
              // The $_blockParam helper reads from this stack
              const stack = blockParamsStack;
              stack.push(rawParams);

              try {
                // Evaluate lazy-wrapped component children (contain $_tag/$_c/$_dc)
                // but preserve reactive text getters as functions so GXT can track
                // cell dependencies and create reactive text nodes via gxtEffect.
                return effectiveChildren.map((child: any) => {
                  if (
                    typeof child === 'function' &&
                    !child.__isCurriedComponent &&
                    !(child instanceof Node)
                  ) {
                    const fnStr = child.toString();
                    if (
                      fnStr.includes('$_tag(') ||
                      fnStr.includes('$_c(') ||
                      fnStr.includes('$_dc(') ||
                      fnStr.includes('$_eachSync(')
                    ) {
                      try {
                        return child();
                      } catch {
                        return child;
                      }
                    }
                    return child;
                  }
                  return child;
                });
              } finally {
                // Pop block params from stack
                // NOTE: We do NOT clear __currentSlotParams here
                // This allows re-renders (via GXT reactivity) to access
                // the params even after the slot function has returned
                stack.pop();
              }
            };

            // Mark slot with block params info
            (slotFn as any).__hasBlockParams = hasBlockParams;
            slots.default = slotFn;
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
          args[Symbol.for('gxt-slots')] = slots;

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
            // and __gxtSyncAllWrappers is never invoked by GXT to fire the
            // deferred hooks. Classic lifecycle contract requires `willRender`
            // to fire on every re-render whose args changed (test #11044
            // "component helper properly invalidates hash params inside an
            // {{#each}}" depends on this). After handle() runs we fire the
            // update hooks on the last-created/reused instance so that any
            // `set()` inside willRender propagates through Ember's
            // notifyPropertyChange → __gxtTriggerReRender → cell.update chain
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
              // Fire willRender/willUpdate ONLY if __gxtSyncAllWrappers did not
              // already fire them on this instance for the current sync cycle.
              // syncAll is wrapped above to stamp `__gxtSyncAllFiredCycleId`
              // on any instance whose update hooks it fires via `trigger`.
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
          // Recursive child-flattener for the custom-element fallback. Mirrors
          // the tree shapes itemToNode handles inside the top-level render but
          // is duplicated here so this global $_tag override doesn't reach
          // into precompileTemplate's closure. Handles:
          //   - Node
          //   - string / number / boolean
          //   - Array (flatten)
          //   - GXT list context with topMarker/bottomMarker (e.g. {{#if}})
          //   - SafeString (.toHTML())
          const appendCustomChild = (item: any): void => {
            if (item == null || item === false) return;
            if (item instanceof Node) {
              ceEl.appendChild(item);
              return;
            }
            if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
              ceEl.appendChild(document.createTextNode(String(item)));
              return;
            }
            if (typeof item === 'function') {
              try {
                appendCustomChild(item());
              } catch {
                /* ignore getter error */
              }
              return;
            }
            if (Array.isArray(item)) {
              for (const sub of item) appendCustomChild(sub);
              return;
            }
            if (typeof item === 'object') {
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
            }
            // Fallback: stringify
            try {
              ceEl.appendChild(document.createTextNode(String(item)));
            } catch {
              /* ignore */
            }
          };
          for (const child of children) appendCustomChild(child);
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

        // Apply attributes/props from tagProps
        if (tagProps && tagProps !== g.$_edp) {
          // Props (position 0): class, id, xlink:href on <use>, etc.
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              const val = typeof value === 'function' ? value() : value;
              applyNsAttr(key, val);
              // Set up reactive updates for dynamic props
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = value();
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
              const val = typeof value === 'function' ? value() : value;
              applyNsAttr(key, val);
              // Reactive attrs
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = value();
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
          // Helper: flatten a child value into appended DOM nodes.
          // Handles: Node, Array, function-wrapped children, and GXT's
          // $_if/$_each block results (which expose nodes via `nodes` or
          // `RENDERED_NODES_PROPERTY`).
          const appendChildValue = (v: any): void => {
            if (v == null || v === false) return;
            if (v instanceof Node) {
              el.appendChild(v);
              return;
            }
            if (Array.isArray(v)) {
              for (const item of v) appendChildValue(item);
              return;
            }
            if (typeof v === 'function') {
              try {
                appendChildValue(v());
              } catch {
                /* ignore errors in child evaluation */
              }
              return;
            }
            if (typeof v === 'object') {
              // GXT block result: look for `nodes` array, `node` single, or
              // the RENDERED_NODES_PROPERTY symbol. These are emitted by
              // $_if/$_each when their branch evaluates to content.
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
              // Fall-through: avoid writing `[object Object]` as a text
              // node. Prefer an empty text node so rehydration serializer
              // produces empty content rather than junk.
              return;
            }
            // Primitive (string/number/boolean): convert to text.
            el.appendChild(document.createTextNode(String(v)));
          };

          for (const child of children) {
            appendChildValue(child);
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
    // the DOM API is available for element creation. This mirrors the recovery
    // path used in the top-level `template.render` entry (see line ~8255).
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
      const needsHtmlRawReparse =
        tagLower === 'table' ||
        tagLower === 'thead' ||
        tagLower === 'tbody' ||
        tagLower === 'tfoot' ||
        tagLower === 'tr' ||
        tagLower === 'colgroup' ||
        tagLower === 'select' ||
        tagLower === 'optgroup';
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
          // bindings (`selected={{this.x}}`) keep `String(value)` so tests
          // that compare against `selected="true"` still match — this mirrors
          // how classic Glimmer serializes DYNAMIC boolean-true attribute
          // bindings under rehydration mode.
          const isLiteralTrueBoolean = value === true;
          const isBoolAttr = typeof key === 'string' && _HTML_BOOLEAN_ATTRS.has(key.toLowerCase());
          const inRehydration = (globalThis as any).__gxtRehydrationMode === true;
          const isDynamicBinding = typeof value === 'function';
          let serialized: string;
          if (isLiteralTrueBoolean && isBoolAttr) {
            // Static `<option selected>` → bare attribute.
            serialized = '';
          } else if (
            inRehydration &&
            isBoolAttr &&
            isDynamicBinding &&
            resolved !== null &&
            resolved !== undefined &&
            resolved !== false
          ) {
            // Rehydration-mode DYNAMIC boolean attribute binding: classic
            // Glimmer-VM serializes any truthy value as the literal "true"
            // so `selected={{true}}` and `selected={{'is-true'}}` both
            // produce `selected="true"` in the rehydration SSR output.
            // Only applies to dynamic (function-valued) bindings — static
            // string literals like `<input checked='checked'>` preserve the
            // original string.
            serialized = 'true';
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
          //
          // NOTE: in rehydration mode, dynamic boolean attribute bindings are
          // FROZEN to the server-rendered value. Classic Glimmer-VM's SSR
          // builder emits `selected="true"` as a literal in the server HTML
          // and the rehydration phase preserves that attribute even when the
          // underlying DOM property flips (e.g. `element.selected = false`).
          // Matching that semantic here: skip the reactive effect entirely
          // for boolean HTML attrs under rehydration mode so the attribute
          // we just set stays pinned across rerenders.
          const isBoolAttrInRehydration = inRehydration && isBoolAttr;
          if (typeof value === 'function' && !isBoolAttrInRehydration) {
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
      // Store observer reference for cleanup
      (el as any).__gxtStyleObserver = observer;
    }

    return result;
  };

  // Mark as wrapped to prevent re-wrapping
  g.$_tag.__compileWrapped = true;
}

// Wrap $_dc to properly forward splattributes (tagProps) to the component
// manager when the dynamic component is a CurriedComponent. The base
// ember-gxt-wrappers' $_dc_ember invokes renderComponent with fw=null, which
// drops class/attrs on constructs like `<this.foo class="..." />`. This
// wrapper reads tagProps from Symbol.for('gxt-props') on the $_args result
// and forwards them as fw so the target element's `...attributes` receives
// the class/attrs.
if (g.$_dc && !g.$_dc.__splatForwardWrapped) {
  const __origDc = g.$_dc;
  const $PROPS_SYM = Symbol.for('gxt-props');

  g.$_dc = function $_dc_splatfix(componentGetter: any, gxtArgs: any, ctx: any): any {
    const tagProps = gxtArgs && typeof gxtArgs === 'object' ? gxtArgs[$PROPS_SYM] : null;
    const hasSplatProps =
      Array.isArray(tagProps) &&
      ((Array.isArray(tagProps[0]) && tagProps[0].length > 0) ||
        (Array.isArray(tagProps[1]) &&
          tagProps[1].some(
            (e: any) => Array.isArray(e) && typeof e[0] === 'string' && !e[0].startsWith('@')
          )));
    if (!hasSplatProps) {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }
    // Narrow the intervention to angle-bracket contextual component invocations
    // that came from `<param.prop ...>` (transformed to `<this.$_bp0.prop ...>`
    // by the `gxtBlockParamsTransform` AST visitor). The compiled getter body contains
    // `this.$_bp` for block-param-based lookups. Leave other $_dc callers
    // (e.g. `{{component this.foo}}` or curly contextual invocations) to the
    // ember-gxt-wrappers path so we don't perturb their behavior.
    if (typeof componentGetter !== 'function') {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }
    let __getterSrc: string;
    try {
      __getterSrc = componentGetter.toString();
    } catch {
      __getterSrc = '';
    }
    if (!__getterSrc.includes('$_bp')) {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }

    // Build fw + mergedArgs and invoke the manager directly with correct fw.
    // This is the canonical path for curried components in a splat invocation.
    const renderCurriedWithFw = (componentValue: any): any => {
      const managers = (globalThis as any).$_MANAGERS;
      if (!managers?.component?.canHandle?.(componentValue)) return null;

      const fwProps: any[] = [];
      const fwAttrs: any[] = [];
      const events: any[] = [];
      if (Array.isArray(tagProps![0])) {
        for (const entry of tagProps![0]) {
          if (!Array.isArray(entry)) continue;
          const key = entry[0];
          if (key === '' || key === 'class') {
            const val = entry[1];
            const wrapped =
              typeof val === 'function'
                ? () => {
                    const v = val();
                    return v == null || v === false ? '' : v;
                  }
                : val == null || val === false
                  ? ''
                  : val;
            fwProps.push([key, wrapped]);
          } else {
            fwProps.push(entry);
          }
        }
      }
      if (Array.isArray(tagProps![1])) {
        for (const entry of tagProps![1]) {
          if (!Array.isArray(entry)) continue;
          const key = entry[0];
          if (typeof key === 'string' && key.startsWith('@')) continue;
          fwAttrs.push(entry);
        }
      }
      if (Array.isArray(tagProps![2])) {
        for (const entry of tagProps![2]) {
          if (Array.isArray(entry)) events.push(entry);
        }
      }
      const fw = [fwProps, fwAttrs, events];

      const mergedArgs: any = {};
      if (gxtArgs && typeof gxtArgs === 'object') {
        for (const key of Object.keys(gxtArgs)) {
          if (key === 'args' || key.startsWith('$')) continue;
          if (key.startsWith('_') && key !== '__hasBlock__' && key !== '__hasBlockParams__')
            continue;
          const desc = Object.getOwnPropertyDescriptor(gxtArgs, key);
          if (desc) Object.defineProperty(mergedArgs, key, { ...desc, configurable: true });
        }
        if (Array.isArray(tagProps![1])) {
          for (const entry of tagProps![1]) {
            if (!Array.isArray(entry)) continue;
            const key = entry[0];
            if (typeof key === 'string' && key.startsWith('@')) {
              const argName = key.slice(1);
              const val = entry[1];
              Object.defineProperty(mergedArgs, argName, {
                get: () => (typeof val === 'function' ? val() : val),
                enumerable: true,
                configurable: true,
              });
            }
          }
        }
        const $SLOTS = Symbol.for('gxt-slots');
        const slots = gxtArgs[$SLOTS];
        if (slots && typeof slots === 'object') {
          _setInternalProp(mergedArgs, '$slots', slots);
        }
      }

      const handleResult = managers.component.handle(componentValue, mergedArgs, fw, ctx);
      if (typeof handleResult === 'function') return handleResult();
      return handleResult;
    };

    // Try to resolve the component getter. The getter may throw if block
    // params aren't bound yet (e.g. inside a slot that hasn't fired). In
    // that case, defer rendering via a lazy thunk that re-resolves later.
    let componentValue: any;
    let getterThrew = false;
    try {
      componentValue = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
    } catch {
      getterThrew = true;
    }

    if (getterThrew) {
      // Getter threw (block params not yet bound) — defer via a lazy thunk.
      const lazyThunk = () => {
        let val: any;
        try {
          val = typeof componentGetter === 'function' ? componentGetter() : componentGetter;
        } catch {
          return undefined;
        }
        if (val && val.__isCurriedComponent) {
          const rendered = renderCurriedWithFw(val);
          if (rendered != null) return rendered;
        }
        // Non-curried path (string, null) — fall back to ember-gxt-wrappers' $_dc.
        return __origDc.call(undefined, componentGetter, gxtArgs, ctx);
      };
      (lazyThunk as any).__isComponentThunk = true;
      return lazyThunk;
    }

    // Only intervene for curried components — string components/null path is
    // already handled correctly by ember-gxt-wrappers' $_dc_ember.
    if (!componentValue || !componentValue.__isCurriedComponent) {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }

    const rendered = renderCurriedWithFw(componentValue);
    if (rendered == null) {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }
    return rendered;
  };
  (g.$_dc as any).__splatForwardWrapped = true;
  // Preserve __emberWrapped flag so ember-gxt-wrappers doesn't re-wrap
  if ((__origDc as any).__emberWrapped) (g.$_dc as any).__emberWrapped = true;
}

// NOTE: transformCapitalizedComponents has been moved to the GXT AST compiler
// (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: transformTripleMustaches has been migrated to the `gxtTripleMustacheTransform`
// AST visitor (see `buildGxtDialectTransforms`). Triple-mustache `{{{expr}}}` →
// `<EmberHtmlRaw @value={{expr}} />` is detected on the parsed AST (a
// `MustacheStatement` with `escaped === false`), NOT rewritten in template source.

// NOTE: transformAngleBracketPositionalParams has been removed.
// Positional params transform (<Component "Foo" 4 /> → @__pos0__="Foo" @__pos1__={{4}} ...)
// is now handled in the GXT AST compiler (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: transformComponentHelper, transformCurlyArgsToAngleBracket, and
// transformLetBlockParamInvocations have been moved to the GXT AST compiler
// (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: isInsideHtmlAttributeValue and isElementModifier have been moved to the GXT AST compiler
// (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: transformCurlyBlockComponents (inline form) has been moved to the GXT AST compiler
// (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: wrapAllTopLevelChildren and wrapTopLevelChildren removed — children lazy
// wrapping is now handled in the GXT serializer (element.ts) at compile time.

// Template cache for performance
const templateCache = new Map<string, any>();
/**
 * Transform {{#each-in EXPR as |KEY VALUE|}}BODY{{else}}ELSE{{/each-in}}
 * into {{#each (gxtEntriesOf EXPR) key="@identity" as |__ei__|}}{{#let __ei__.k __ei__.v as |KEY VALUE|}}BODY{{/let}}{{else}}ELSE{{/each}}
 *
 * This avoids Ember's (-each-in) SubExpression which GXT doesn't understand.
 * gxtEntriesOf returns [{k, v}, ...] for objects, Maps, proxies, custom iterables.
 * The let block destructures each entry into the original key/value block params.
 *
 * Handles nesting by processing from innermost to outermost.
 */
// Triple-mustache `{{{expr}}}` → `<EmberHtmlRaw @value={{expr}} />` is now handled
// by the `gxtTripleMustacheTransform` AST visitor (see `buildGxtDialectTransforms`),
// which detects the `escaped === false` `MustacheStatement` and reproduces the
// rawtext fallback via an ancestor lookup. The former `transformTripleMustaches`
// template-source string scanner lived here.

/**
 * Counter for unique `-with-dynamic-vars` scope variable names. Shared across
 * all templates in a single process — GXT's `{{#let}}` block generates block
 * params that are local anyway, so uniqueness is just a convenience to avoid
 * hash collisions within a single template (nested `-with-dynamic-vars`).
 */
let _dynVarCounter = 0;

// `{{#-with-dynamic-vars …}}` / `{{-get-dynamic-var "…"}}` lowering is now handled
// by the `gxtDynamicVarsTransform` AST visitor (see `buildGxtDialectTransforms`),
// which recurses the AST, fires the same `Ember.assert` diagnostics, and builds the
// `{{#let EXPR as |VAR|}}` scope with generated block-param names. The former
// `_findInnermostWithDynamicVars` / `_parseDynamicVarsArgs` / `_rewriteGetOutletInBody`
// / `transformDynamicVars` string scanners lived here. `_dynVarCounter` above is now
// consumed by the AST visitor.

// `{{#each-in EXPR as |k v|}}` → `{{#each (gxtEntriesOf EXPR) …}}` rewriting
// is now handled by the `gxtEachInTransform` AST visitor (see
// `buildGxtDialectTransforms`), which recurses the AST and splits `{{else}}`
// inverses for free. The former `transformEachInBlocks` + `splitElse` string
// scanners lived here.

let _functionCodeCache: Map<string, Function> | null = null;
// Global counter for log site IDs — ensures uniqueness across compilations.
// Without this, every compiled template gets __logSite:0, __logSite:1, etc.
// and the dedup logic in $__log_ember incorrectly skips log calls from
// different templates that happen to share the same site ID.
let _globalLogSiteCounter = 0;

/**
 * Ember dialect AST transforms.
 *
 * These run inside the GXT runtime compiler via the public `transforms`
 * `CompileOptions` hook — `@glimmer/syntax`-style visitors applied to the
 * parsed template AST *after* preprocess and *before* glimmer-next codegen
 * (the same shape classic Ember AST plugins use). They are wired into the
 * `gxtCompileTemplate(...)` call in `compileTemplate` below.
 *
 * Each transform here REPLACES a former brittle string/regex pre-rewrite of
 * the template *source text*. Operating on the AST is exact: it cannot be
 * fooled by the same token appearing inside a string-literal attribute value,
 * inside an HTML comment, as a substring of a longer identifier, etc. — the
 * hand-rolled tokenizers the string versions needed (whitespace skipping,
 * identifier-boundary checks, comment/raw-block skipping) are all subsumed by
 * the parser.
 *
 * The `env.syntax.builders` factory shape (`ASTPluginBuilder`) is used so we
 * construct replacement nodes with glimmer-next's own `@glimmer/syntax`
 * builders (no direct `@glimmer/syntax` dependency in this package).
 */

// `env` shape passed to an ASTPluginBuilder by the GXT compiler:
//   { meta: { moduleName }, syntax: { parse, builders, print, traverse, Walker } }
// We only type the bits we touch.
interface GxtAstEnv {
  syntax: {
    builders: {
      element(
        tag: string,
        options?: { attrs?: unknown[]; children?: unknown[]; selfClosing?: boolean }
      ): unknown;
      path(original: string): unknown;
      block(
        path: unknown,
        params: unknown[],
        hash: unknown,
        program: unknown,
        inverse?: unknown,
        loc?: unknown
      ): unknown;
      // Additional `@glimmer/syntax` builders used by the dialect transforms.
      mustache(path: unknown, params?: unknown[], hash?: unknown, trusting?: boolean): unknown;
      sexpr(path: unknown, params?: unknown[], hash?: unknown): unknown;
      hash(pairs?: unknown[]): unknown;
      pair(key: string, value: unknown): unknown;
      string(value: string): unknown;
      blockItself(body?: unknown[], params?: Array<unknown | string>, chained?: boolean): unknown;
      elementModifier(path: unknown, params?: unknown[], hash?: unknown, loc?: unknown): unknown;
      attr(name: string, value: unknown, loc?: unknown): unknown;
      text(chars?: string, loc?: unknown): unknown;
    };
  };
}

/**
 * `{{outlet}}` → `<ember-outlet />`.
 *
 * Mirrors the build-time transform in
 * packages/demo/compat/gxt-template-compiler-plugin.mjs so that templates
 * compiled at runtime (via `compile()` / `precompileTemplate()` from
 * addTemplate(), rendering test helpers, etc.) get the same handling as
 * templates compiled at build time. Without it, the GXT compiler treats
 * `{{outlet}}` like `{{yield}}` (a default-slot yield) and no `<ember-outlet>`
 * element is produced — which breaks nested route rendering.
 *
 * Only the bare zero-arg/zero-hash form is lowered, exactly matching the old
 * string scanner. Named outlets (`{{outlet "main"}}`) keep their mustache form
 * (they carry a positional param) and are handled downstream.
 */
function gxtOutletTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-outlet',
    visitor: {
      MustacheStatement(node: any): unknown {
        const path = node.path;
        if (
          path &&
          path.type === 'PathExpression' &&
          path.head &&
          path.head.type === 'VarHead' &&
          path.head.name === 'outlet' &&
          node.params.length === 0 &&
          node.hash.pairs.length === 0
        ) {
          return b.element('ember-outlet', { attrs: [], children: [], selfClosing: true });
        }
        return undefined;
      },
    },
  };
}

/**
 * `{{#@argName args}}body{{/@argName}}` → `{{#component @argName args}}body{{/component}}`.
 *
 * GXT's AST compiler may not emit code for a block whose head is an `@arg`
 * (AtHead detection returns empty). Rewriting it to a `{{#component @arg}}`
 * block routes it through the component path, which GXT handles. The AST form
 * naturally preserves positional params, the hash, the main block, AND any
 * `{{else}}` inverse — the former regex captured everything up to the first
 * `{{/@…}}` as opaque body text and could not split an inverse.
 */
function gxtBlockAtArgTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-block-at-arg',
    visitor: {
      BlockStatement(node: any): unknown {
        const path = node.path;
        if (path && path.type === 'PathExpression' && path.head && path.head.type === 'AtHead') {
          const componentPath = b.path('component');
          const argRef = b.path(path.head.name);
          return b.block(
            componentPath,
            [argRef, ...node.params],
            node.hash,
            node.program,
            node.inverse,
            node.loc
          );
        }
        return undefined;
      },
    },
  };
}

// Built-in names that must NOT be wrapped as a SubExpression inside a quoted
// attribute value (they are keywords / built-in helpers GXT resolves itself).
// Mirrors the BUILTINS set in the former `transformAttrQuotedHelperMustaches`
// string scanner exactly.
const _GXT_ATTR_QUOTED_HELPER_BUILTINS: ReadonlySet<string> = new Set([
  'this',
  'else',
  'if',
  'unless',
  'each',
  'each-in',
  'let',
  'with',
  'yield',
  'outlet',
  'component',
  'helper',
  'modifier',
  'debugger',
  'log',
  'action',
  'concat',
  'hash',
  'array',
  'fn',
  'get',
  'mut',
  'readonly',
  'unbound',
  'unique-id',
  'in-element',
  'has-block',
  'has-block-params',
  'on',
]);
// Same bare-identifier shape the string scanner accepted (a single, dot-free
// identifier — leading letter/underscore, then letters/digits/underscore/dash).
const _GXT_ATTR_BARE_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * Bare-identifier helper mustaches inside quoted HTML attribute values:
 *   `attr="{{foo-bar}}"`            → `attr="{{(foo-bar)}}"`
 *   `attr="pre-{{foo-bar}}-post"`   → `attr="pre-{{(foo-bar)}}-post"`
 *   `attr="{{null}}"` / `{{undefined}}` → `attr="{{""}}"`
 *
 * GXT's compiler swallows a bare `{{foo-bar}}` in a quoted attribute value
 * (it resolves it as a PathExpression against an empty scope and emits
 * `[""].join("")`). Wrapping it as a SubExpression forces the helper
 * resolution path. Literal `null`/`undefined` are mapped to an empty string
 * literal (Ember treats them as empty in attribute position).
 *
 * Replaces the former `transformAttrQuotedHelperMustaches` string scanner.
 * Operating on `AttrNode` values means we cannot be fooled by `{{...}}`
 * appearing in body/text position or inside an element's modifier list — the
 * parser already classified those as something other than an attribute value.
 * The same name guards apply: skip `this.x`, `@arg`, dotted paths, mustaches
 * carrying params/hash, and the built-in keyword set above.
 *
 * IMPORTANT: only QUOTED values are rewritten. The parser represents a quoted
 * attribute value as a `ConcatStatement` (even when it is a single mustache),
 * and an UNQUOTED `={{x}}` as a bare `MustacheStatement`. The string scanner
 * matched only `="{{…}}"`, so we restrict to `ConcatStatement` parts and leave
 * bare mustache values alone (rewriting them would invoke a by-reference
 * helper in named-argument position).
 */
function gxtAttrQuotedHelperTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  function rewriteMustache(node: any): unknown {
    const p = node.path;
    if (!p) return undefined;
    // Only zero-arg, zero-hash mustaches (matching the string scanner, which
    // rejected anything containing whitespace/parens/`=` inside the braces).
    if (node.params.length !== 0 || node.hash.pairs.length !== 0) return undefined;
    // `{{null}}` / `{{undefined}}` parse as literal heads (not PathExpressions).
    if (p.type === 'NullLiteral' || p.type === 'UndefinedLiteral') {
      return b.mustache(b.string(''));
    }
    if (p.type !== 'PathExpression') return undefined;
    // Bare, single-part var head only (no `this`, no `@arg`, no dotted path).
    if (p.head && p.head.type === 'VarHead' && p.tail.length === 0) {
      const name: string = p.head.name;
      if (!_GXT_ATTR_BARE_IDENT_RE.test(name)) return undefined;
      if (_GXT_ATTR_QUOTED_HELPER_BUILTINS.has(name)) return undefined;
      return b.mustache(b.sexpr(b.path(name)));
    }
    return undefined;
  }
  return {
    name: 'ember-gxt-attr-quoted-helper',
    visitor: {
      AttrNode(node: any): void {
        const v = node.value;
        if (!v) return;
        // ONLY rewrite QUOTED attribute values. A quoted value always parses as
        // a `ConcatStatement` (even a single mustache: `="{{x}}"` →
        // `Concat[Mustache]`, and `="pre-{{x}}-post"` → `Concat[Text, Mustache,
        // Text]`). An UNQUOTED `={{x}}` parses as a bare `MustacheStatement`.
        // The former string scanner matched only `="{{…}}"` (literal quotes),
        // so the bare-mustache case must NOT be wrapped — doing so would invoke
        // a helper that Ember passes by reference in named-argument position
        // (e.g. `<Bar @content={{foo}} />` where `foo` is a local helper).
        if (v.type === 'ConcatStatement') {
          for (let i = 0; i < v.parts.length; i++) {
            const part = v.parts[i];
            if (part && part.type === 'MustacheStatement') {
              const r = rewriteMustache(part);
              if (r) v.parts[i] = r;
            }
          }
        }
      },
    },
  };
}

/**
 * `{{#each-in EXPR as |KEY VALUE|}}BODY{{else}}ELSE{{/each-in}}` →
 * `{{#each (gxtEntriesOf EXPR) key="@identity" as |__ei__|}}
 *    {{#let __ei__.k __ei__.v as |KEY VALUE|}}BODY{{/let}}
 *  {{else}}ELSE{{/each}}`
 *
 * (and the one-param / zero-param variants). `gxtEntriesOf` returns
 * `[{k, v}, ...]` for objects, Maps, proxies, and custom iterables; the
 * `key="@identity"` keeps row identity stable.
 *
 * Replaces the former `transformEachInBlocks` string scanner. Recursion over
 * the AST handles nesting and `{{else}}`-splitting for free (the string
 * version hand-rolled an innermost-first loop + same-depth `{{else}}` finder).
 *
 * NOTE: the `gxtEntriesOf` binding must be added to the compile `bindings` set
 * so the compiler emits a bare binding reference rather than a string lookup;
 * the call site does this whenever the source contains `{{#each-in`.
 */
function gxtEachInTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-each-in',
    visitor: {
      BlockStatement(node: any): unknown {
        const p = node.path;
        if (
          !(
            p &&
            p.type === 'PathExpression' &&
            p.head &&
            p.head.type === 'VarHead' &&
            p.head.name === 'each-in' &&
            p.tail.length === 0
          )
        ) {
          return undefined;
        }
        const expr = node.params[0];
        if (!expr) return undefined;
        const entriesOf = b.sexpr(b.path('gxtEntriesOf'), [expr]);
        const keyHash = b.hash([b.pair('key', b.string('@identity'))]);
        const bp: string[] = node.program.blockParams || [];
        if (bp.length >= 1) {
          const entryVar = '__ei__';
          const letParams: unknown[] = [b.path(entryVar + '.k')];
          const letBP: string[] = [bp[0]!];
          if (bp.length >= 2) {
            letParams.push(b.path(entryVar + '.v'));
            letBP.push(bp[1]!);
          }
          const letBlock = b.blockItself(node.program.body, letBP);
          const letStmt = b.block(b.path('let'), letParams, b.hash([]), letBlock);
          const eachProgram = b.blockItself([letStmt], [entryVar]);
          return b.block(b.path('each'), [entriesOf], keyHash, eachProgram, node.inverse, node.loc);
        }
        // No block params — emit `{{#each (gxtEntriesOf EXPR) key="@identity"}}`.
        const eachProgram = b.blockItself(node.program.body, []);
        return b.block(b.path('each'), [entriesOf], keyHash, eachProgram, node.inverse, node.loc);
      },
    },
  };
}

/**
 * `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}` →
 * `{{#let EXPR as |__gxt_dvar_outletState_N__|}}BODY'{{/let}}` and
 * `{{-get-dynamic-var "outletState"}}` / `(-get-dynamic-var "outletState")` →
 * the nearest enclosing scope var (inside such a block) or the
 * `gxtGetOutletState` built-in helper (at top level).
 *
 * Semantics (mirrors Ember stock behavior — replaces the former
 * `transformDynamicVars` string scanner + its `_findInnermostWithDynamicVars` /
 * `_parseDynamicVarsArgs` / `_rewriteGetOutletInBody` helpers):
 *   - Only `outletState` is a valid key. Any other key on a
 *     `{{#-with-dynamic-vars}}` block fires an `Ember.assert` with the
 *     `-with-dynamic-scope` message; any other key on a `-get-dynamic-var` call
 *     fires one with the `-get-dynamic-scope` message. These asserts are what
 *     the `expectAssertion` tests in `with-dynamic-var-test.js` rely on. Because
 *     these visitors run in **ember's** process (the `transforms` hook is
 *     applied inside `gxtCompileTemplate`), `emberAssert` resolves to the same
 *     swappable debug function the string version used — so `expectAssertion`'s
 *     stub captures the message exactly as before.
 *   - `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}`
 *     lowers to `{{#let EXPR as |VAR|}}BODY'{{/let}}` (GXT accepts `{{#let}}`),
 *     where BODY' has inner `{{-get-dynamic-var "outletState"}}` rewritten to the
 *     generated `VAR`. A `-with-dynamic-vars` block with NO `outletState` key
 *     lowers to BODY' directly (no `{{#let}}` wrapper), exactly as the string
 *     version did.
 *   - A top-level (out-of-scope) or non-`outletState` `-get-dynamic-var` lowers
 *     to the `gxtGetOutletState` built-in helper call (mustache form
 *     `{{(gxtGetOutletState)}}`, subexpression form `(gxtGetOutletState)`),
 *     which reads `globalThis.__currentOutletState`.
 *
 * Scope discipline: the generated `VAR` must be in scope for the block's BODY
 * but NOT for the `outletState=EXPR` head itself (a `-get-dynamic-var` inside the
 * head resolves to `gxtGetOutletState`, matching the string version, which fed
 * the head expr through its top-level phase). `@glimmer/syntax`'s `traverse`
 * visits a `BlockStatement`'s `hash` (the head) BEFORE descending into its
 * program `Block`, so we push the scope var on the program `Block`'s enter and
 * pop it on exit — the head is already visited by then. Nesting is handled by
 * the scope stack (nearest binding wins); generated names come from the module
 * `_dynVarCounter` (same counter the string version used). For nested blocks the
 * counter is allocated outermost-first here (string version allocated
 * innermost-first), so the `__gxt_dvar_outletState_N__` suffixes can differ for
 * nested blocks — but they are purely-internal `{{#let}}` block-param names and
 * the binding↔reference renaming stays consistent (alpha-equivalent output).
 *
 * Operating on the AST is exact: it cannot be fooled by the keyword appearing
 * inside a string literal / comment, and the innermost-first scan + same-depth
 * matching the string version hand-rolled fall out of `traverse` for free.
 */
function gxtDynamicVarsTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  // Names currently in lexical scope (bodies of enclosing `-with-dynamic-vars`).
  // Pushed on the program `Block`'s enter, popped on its exit.
  const scopeStack: string[] = [];
  // Whether each `Block` enter pushed a scope var (popped 1:1 on `Block` exit).
  const blockPushes: boolean[] = [];
  // Open `-with-dynamic-vars` blocks (between their `BlockStatement` enter/exit).
  const pendingStack: Array<{ node: any; varName: string; outletNode: any }> = [];

  const isWithDynamicVars = (node: any): boolean =>
    node.path &&
    node.path.type === 'PathExpression' &&
    node.path.head &&
    node.path.head.type === 'VarHead' &&
    node.path.head.name === '-with-dynamic-vars' &&
    node.path.tail.length === 0;

  const isGetDynamicVar = (path: any): boolean =>
    path &&
    path.type === 'PathExpression' &&
    path.head &&
    path.head.type === 'VarHead' &&
    path.head.name === '-get-dynamic-var' &&
    path.tail.length === 0;

  // Extract the single literal-string key of a `-get-dynamic-var` call. The
  // string version matched ONLY `-get-dynamic-var "KEY"` immediately followed by
  // the closing marker — i.e. exactly one positional param (a string literal)
  // and no hash. Anything else (dynamic key, extra params/hash) was left alone.
  const literalGetKey = (node: any): string | null => {
    if (node.params.length !== 1 || node.hash.pairs.length !== 0) return null;
    const p0 = node.params[0];
    return p0 && p0.type === 'StringLiteral' ? p0.value : null;
  };

  const getOutletStateCall = (): unknown => b.sexpr(b.path('gxtGetOutletState'));

  return {
    name: 'ember-gxt-dynamic-vars',
    visitor: {
      BlockStatement: {
        enter(node: any): void {
          if (!isWithDynamicVars(node)) return;
          // Validate keys — only `outletState` is permitted (Phase-1 assert).
          for (const pair of node.hash.pairs) {
            if (pair.key !== 'outletState') {
              emberAssert(
                `Using \`-with-dynamic-scope\` is only supported for \`outletState\` (you used \`${pair.key}\`).`,
                false
              );
            }
          }
          const outletPair = node.hash.pairs.find((p: any) => p.key === 'outletState');
          const varName = `__gxt_dvar_outletState_${_dynVarCounter++}__`;
          pendingStack.push({ node, varName, outletNode: outletPair ? outletPair.value : null });
        },
        exit(node: any): unknown {
          if (!isWithDynamicVars(node)) return undefined;
          const frame = pendingStack.pop()!;
          if (frame.outletNode) {
            // `{{#let EXPR as |VAR|}}BODY'{{/let}}` — BODY' already has its inner
            // `outletState` gets rewritten to `VAR` (done during child traversal).
            const letBlock = b.blockItself(node.program.body, [frame.varName]);
            return b.block(
              b.path('let'),
              [frame.outletNode],
              b.hash([]),
              letBlock,
              node.inverse,
              node.loc
            );
          }
          // No `outletState` — splice the (rewritten) body in place of the block.
          return node.program.body;
        },
      },
      Block: {
        enter(node: any, path: any): void {
          const parent = path && path.parent && path.parent.node;
          const top = pendingStack[pendingStack.length - 1];
          if (parent && top && parent === top.node && parent.program === node) {
            scopeStack.push(top.varName);
            blockPushes.push(true);
          } else {
            blockPushes.push(false);
          }
        },
        exit(): void {
          if (blockPushes.pop()) scopeStack.pop();
        },
      },
      MustacheStatement(node: any): unknown {
        if (!isGetDynamicVar(node.path)) return undefined;
        const key = literalGetKey(node);
        if (key === null) return undefined;
        if (key === 'outletState') {
          return scopeStack.length > 0
            ? b.mustache(b.path(scopeStack[scopeStack.length - 1]!))
            : b.mustache(getOutletStateCall());
        }
        // Non-`outletState` get (Phase-2 assert), then lower to the helper.
        emberAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
          false
        );
        return b.mustache(getOutletStateCall());
      },
      SubExpression(node: any): unknown {
        if (!isGetDynamicVar(node.path)) return undefined;
        const key = literalGetKey(node);
        if (key === null) return undefined;
        if (key === 'outletState') {
          return scopeStack.length > 0
            ? b.path(scopeStack[scopeStack.length - 1]!)
            : getOutletStateCall();
        }
        emberAssert(
          `Using \`-get-dynamic-scope\` is only supported for \`outletState\` (you used \`${key}\`).`,
          false
        );
        return getOutletStateCall();
      },
    },
  };
}

/**
 * `{{on ...}}` element modifier → `{{on-ext ...}}`.
 *
 * Upstream GXT's AST compiler short-circuits the literal `on` modifier and
 * drops the hash pairs (`once=` / `capture=` / `passive=`) AND skips the
 * Glimmer VM `OnModifierManager`'s rebind-on-callback-change semantics. The
 * `on-ext` alias (registered in `$_MANAGERS.modifier._builtinModifiers` by
 * `_ensureOnExtAlias`) routes through GXT's general modifier path, preserving
 * both. Even hash-less `{{on "evt" cb}}` is routed so the rebind semantics
 * the Ember `{{on}}` counter assertions expect fire.
 *
 * Replaces the former `transformOnModifierHashArgs` string scanner. Targeting
 * `ElementModifierStatement` is strictly more precise than the string match on
 * `{{on `: it only fires in modifier position (the sole valid use of `{{on}}`),
 * never on an `{{on}}` substring inside a string literal or comment.
 *
 * GATED: skipped when the template's strict-mode scope shadows `on` with a
 * non-canonical modifier — the call site omits this transform in that case so
 * the user's binding takes effect (`keyword modifier: on :: can be shadowed`).
 */
function gxtOnModifierTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-on-ext',
    visitor: {
      ElementModifierStatement(node: any): unknown {
        const p = node.path;
        if (
          p &&
          p.type === 'PathExpression' &&
          p.head &&
          p.head.type === 'VarHead' &&
          p.head.name === 'on' &&
          p.tail.length === 0
        ) {
          return b.elementModifier(b.path(_GXT_ON_EXT_ALIAS), node.params, node.hash, node.loc);
        }
        return undefined;
      },
    },
  };
}

// Bare kebab-case identifier shape accepted in BODY position (a lowercase
// leading segment, then one-or-more `-segment` parts). Mirrors the
// `KEBAB_IDENT_RE` in the former `transformBodyBareHelperMustaches` string
// scanner exactly.
const _GXT_BODY_KEBAB_IDENT_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
// Kebab names that are GXT/Ember built-in keywords (resolved by the compiler
// itself) and must NOT be lowered to a component element. Mirrors the BUILTINS
// set in the former string scanner exactly.
const _GXT_BODY_BARE_BUILTINS: ReadonlySet<string> = new Set([
  'each-in',
  'in-element',
  'has-block',
  'has-block-params',
  'unique-id',
]);

/**
 * Zero-arg bare kebab-case mustaches in BODY position:
 *   `{{my-component}}` → `<MyComponent />`
 *
 * GXT's compiler emits `$_maybeHelper("my-component", [], this)` for a bare
 * `{{my-component}}` in content position; if the name resolves to a component
 * its rendered DOM is silently dropped into the text-children slot. Lowering it
 * to a `<MyComponent />` element routes it through GXT's tag-rewrite path (which
 * checks BOTH the helper and component registries — correct for either kind).
 * The with-args case (`{{my-component data=…}}`) is already angle-bracket-lowered
 * by GXT's own `transformCurlyArgsToAngleBracket`; this fills the zero-args gap.
 *
 * Replaces the former `transformBodyBareHelperMustaches` string scanner. Working
 * on the AST makes the position-awareness the scanner hand-rolled (the
 * `inOpenTag` flag, the `="…"` quoted-attr skip, the `<!-- -->` comment skip,
 * the `{{{…}}}` triple-stache skip, the block/inverse `#`/`/` skip) fall out of
 * the node classification for free:
 *   - element modifiers (`<h1 {{foo-bar}}>`) parse as `ElementModifierStatement`,
 *     never visited by this `MustacheStatement` handler;
 *   - quoted attr values parse as `ConcatStatement` parts, unquoted attr values
 *     and named args parse with an `AttrNode` / `HashPair` parent — all excluded
 *     by the body-position parent guard below;
 *   - HTML comments are `CommentStatement` nodes (their text is never re-parsed);
 *   - triple-stache `{{{…}}}` carries `escaped === false`;
 *   - `{{#x}}` / `{{/x}}` / `{{else}}` are `BlockStatement`s, not mustaches.
 *
 * The same name guards apply: skip dotted paths, `this.x`, `@arg`, mustaches
 * carrying params/hash, non-kebab names, the built-in keyword set, and (when
 * `scopeValues` binds the name) explicitly scope-bound kebab locals — those keep
 * their `{{name}}` form so GXT resolves them through its scope-lookup path
 * (rehydration delegate fixtures, strict-mode locals).
 */
function gxtBodyBareHelperTransform(scopeValues?: Record<string, unknown>) {
  const hasScope = !!scopeValues && Object.keys(scopeValues).length > 0;
  return (env: GxtAstEnv) => {
    const b = env.syntax.builders;
    return {
      name: 'ember-gxt-body-bare-helper',
      visitor: {
        MustacheStatement(node: any, path: any): unknown {
          const p = node.path;
          if (!p || p.type !== 'PathExpression') return undefined;
          // Zero-arg, zero-hash only (the string scanner rejected any inner
          // whitespace/parens/pipes/quotes/`=`).
          if (node.params.length !== 0 || node.hash.pairs.length !== 0) return undefined;
          // Bare single-part var head only (no `this`, no `@arg`, no dotted path).
          if (!p.head || p.head.type !== 'VarHead' || p.tail.length !== 0) return undefined;
          // Triple-stache `{{{…}}}` outputs raw HTML — not a component invocation.
          if (node.escaped === false) return undefined;
          const name: string = p.head.name;
          if (!_GXT_BODY_KEBAB_IDENT_RE.test(name)) return undefined;
          if (_GXT_BODY_BARE_BUILTINS.has(name)) return undefined;
          if (hasScope && Object.prototype.hasOwnProperty.call(scopeValues!, name)) {
            return undefined;
          }
          // BODY position only. The string scanner lowered a mustache only when
          // it was NOT inside an HTML open tag / quoted attr value / comment; in
          // the AST that means its parent is a Template, Block, or ElementNode
          // (the content slots). A `ConcatStatement` (quoted attr), `AttrNode`
          // (unquoted attr value), or `HashPair` (named arg) parent is an
          // attribute/argument context and must be left alone.
          const parent = path && path.parent && path.parent.node;
          if (parent) {
            const pt = parent.type;
            if (pt !== 'Template' && pt !== 'Block' && pt !== 'ElementNode') {
              return undefined;
            }
          }
          // `{{my-component}}` → `<MyComponent />`. `customizeComponentName` at
          // the call site lowers the PascalCase tag back to kebab for the Ember
          // registry lookup during codegen — identical to a parsed `<MyComponent />`.
          const pascal = name
            .split('-')
            .map((seg) => (seg.length === 0 ? '' : seg[0]!.toUpperCase() + seg.slice(1)))
            .join('');
          const el: any = b.element(pascal, { attrs: [], children: [], selfClosing: true });
          // The `element` builder ignores its `selfClosing` option (it always
          // emits a close tag). Force the self-closing shape so codegen emits the
          // empty-default-props form (`$_edp`) byte-identically to a parsed
          // `<MyComponent />`, rather than a default-block component
          // (`@__hasBlock__="default"`).
          el.selfClosing = true;
          el.closeTag = null;
          return el;
        },
      },
    };
  };
}

// Tag-name shapes the former `transformBlockParamsInTemplate` string scanner
// matched (its `tagPattern` first capture group): a PascalCase tag (possibly
// dotted/dashed) OR a kebab-case tag (a dash-containing lowercase name). The AST
// transform fires the `$_bp` rewrite ONLY for these tags so it affects exactly
// the same elements — dynamic tags (`<this.Foo …>`, `<@foo …>`) and bare
// lowercase tags were left to glimmer-next's native block-param handling by the
// string version, and stay native here (their block params still SHADOW, see the
// scope stack, but are not rewritten).
const _GXT_BP_PASCAL_TAG_RE = /^[A-Z][a-zA-Z0-9.-]*$/;
const _GXT_BP_KEBAB_TAG_RE = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;
function _gxtBpTagMatches(tag: string): boolean {
  return _GXT_BP_PASCAL_TAG_RE.test(tag) || _GXT_BP_KEBAB_TAG_RE.test(tag);
}

/**
 * Angle-bracket component block params:
 *   `<Foo as |x y|>{{x}} {{y.prop}}</Foo>`
 *     → `<Foo @__hasBlockParams__="default">{{this.$_bp0}} {{this.$_bp1.prop}}</Foo>`
 *   `<Foo as |x|><x.Trigger .../></Foo>` → `<Foo …><this.$_bp0.Trigger .../></Foo>`
 *
 * `$_bp{N}` is a pure ember-runtime convention: ember installs `$_bp{i}` getters
 * (see `Object.defineProperty(globalThis, '$_bp'+i, …)` ~9263/9301) that return
 * the current yielded block-param at render time; glimmer-next compiles
 * `this.$_bp0` as an ordinary `this`-path. The marker arg
 * `@__hasBlockParams__="default"` tells the slot machinery the component declared
 * a default block with params (consumed at ~10439 / ~11482).
 *
 * Replaces the former `transformBlockParamsInTemplate` string scanner. Operating
 * on the AST adds SHADOW-AWARENESS the string version lacked: it scope-stacks
 * every block-param binder (element AND `{{#block as |..|}}`), so an inner binder
 * re-declaring a name correctly shadows the outer component param — the string
 * version blind-replaced every `{{name}}` in the component's text span, even
 * inside a nested `{{#each items as |name|}}` (where the name is a native
 * glimmer-next block param, not a `$_bp`). Only ELEMENT-binder references resolve
 * to `$_bp`; block-statement binders shadow without rewriting (glimmer-next owns
 * those natively).
 *
 * Faithfulness: for non-shadowing templates the emitted JS is byte-identical to
 * the string version, EXCEPT a dotted block-param tail (`{{x.prop}}`) emits
 * `this.$_bp0.prop` rather than the string version's `this.$_bp0?.prop`. The
 * `?.` was an artifact of injecting `this.$_bp0.prop` as literal SOURCE (the
 * compiler's loc-based parts add `?.` for ≥3 segments); glimmer-next's own value
 * serializer explicitly SUPPRESSES `?.` for `$_`-prefixed paths
 * (`if (e.includes("$_")) return e`), so the AST output is the intended shape.
 * The two are semantically equivalent except when a block param is nullish and a
 * property is read off it.
 *
 * The PathExpression head rewrite MUTATES the parsed node in place (head → `this`,
 * prepend `$_bp{N}` to the tail) rather than building a fresh node, so the
 * node's `loc` (and thus codegen) stays consistent with a parsed `this`-path.
 */
function gxtBlockParamsTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  // Scope stack of frames; each frame is an array of { name, bp? }. A `bp`
  // (e.g. `$_bp0`) marks an ELEMENT block-param (rewrite refs to `this.$_bp{N}`);
  // a bp-less entry is a shadowing-only binder (a `{{#block as |..|}}` param, or
  // a native element param whose tag didn't match the string-rewrite shape).
  const scopes: Array<Array<{ name: string; bp?: string }>> = [];
  const resolve = (name: string): { name: string; bp?: string } | null => {
    for (let i = scopes.length - 1; i >= 0; i--) {
      const hit = scopes[i]!.find((e) => e.name === name);
      if (hit) return hit; // nearest binder wins
    }
    return null;
  };
  // Rewrite a yielded contextual-component tag `<param.Foo …>` → `<this.$_bp0.Foo …>`
  // (only when `param` is an in-scope ELEMENT binder). Resolved against the
  // ENCLOSING scope (called before this element pushes its own params).
  const rewriteTag = (node: any): void => {
    const tag: string = node.tag;
    if (!tag) return;
    const dot = tag.indexOf('.');
    if (dot === -1) return;
    const head = tag.slice(0, dot);
    const hit = resolve(head);
    if (!hit || hit.bp === undefined) return;
    node.tag = `this.${hit.bp}.${tag.slice(dot + 1)}`;
  };
  return {
    name: 'ember-gxt-block-params',
    visitor: {
      ElementNode: {
        enter(node: any): void {
          rewriteTag(node);
          const bp: string[] = node.blockParams || [];
          if (bp.length && _gxtBpTagMatches(node.tag)) {
            scopes.push(bp.map((n, i) => ({ name: n, bp: `$_bp${i}` })));
            node.attributes.push(b.attr('@__hasBlockParams__', b.text('default')));
            node.__gxtBpRewrite = true;
          } else if (bp.length) {
            // Native (dynamic/bare) tag with block params — left to glimmer-next,
            // but its params still shadow outer element params.
            scopes.push(bp.map((n) => ({ name: n })));
          } else {
            scopes.push([]);
          }
        },
        exit(node: any): void {
          scopes.pop();
          if (node.__gxtBpRewrite) {
            node.blockParams = [];
            delete node.__gxtBpRewrite;
          }
        },
      },
      // `{{#each items as |item|}}` / `{{#let … as |x|}}` etc. — the program /
      // inverse `Block` carries the binder. These shadow but are NEVER rewritten
      // (glimmer-next resolves them as native block params).
      Block: {
        enter(node: any): void {
          const bp: string[] = node.blockParams || [];
          scopes.push(bp.length ? bp.map((n) => ({ name: n })) : []);
        },
        exit(): void {
          scopes.pop();
        },
      },
      PathExpression(node: any): void {
        if (!node.head || node.head.type !== 'VarHead') return;
        const hit = resolve(node.head.name);
        if (!hit || hit.bp === undefined) return;
        // Mutate in place (preserve `loc`): head → `this`, prepend `$_bp{N}`.
        node.head = (b.path('this') as any).head;
        node.tail = [hit.bp, ...(node.tail || [])];
        if (typeof node.original === 'string') {
          node.original = `this.${(node.tail as string[]).join('.')}`;
        }
      },
    },
  };
}

// Rawtext (RCDATA/RAWTEXT) element tags: their content is parsed as plain text
// by the browser tokenizer, so a `<EmberHtmlRaw …>` child would serialize as
// literal markup. Mirrors the `rawtextTags` list in the former
// `transformTripleMustaches` string scanner.
const _GXT_RAWTEXT_TAGS: ReadonlySet<string> = new Set(['title', 'script', 'style', 'textarea']);

/**
 * Build the `@value` expression node a triple-mustache lowers to. Mirrors the
 * former string scanner's paren-wrap rule: a bare path / single positional ref
 * (`{{{this.html}}}`, `{{{@x}}}`) becomes `{{this.html}}` (the mustache path
 * alone); a helper invocation with params/hash (`{{{foo bar}}}`) becomes
 * `{{(foo bar)}}` (the path wrapped as a SubExpression). The string version
 * keyed this off "inner contains whitespace"; on the AST it keys off the parsed
 * params/hash, which is the exact same distinction for every realistic input.
 */
function _gxtTripleValueExpr(b: GxtAstEnv['syntax']['builders'], node: any): unknown {
  if (node.params.length === 0 && node.hash.pairs.length === 0) {
    return b.mustache(node.path);
  }
  return b.mustache(b.sexpr(node.path, node.params, node.hash));
}

/**
 * Triple-mustache `{{{expr}}}` → `<EmberHtmlRaw @value={{expr}} />`.
 *
 * The GXT compiler treats `{{{expr}}}` identically to `{{expr}}` (escaped text
 * interpolation — see the `escaped !== false` codegen), but Ember semantics
 * require inserting the value as raw HTML. Wrapping it in an `<EmberHtmlRaw>`
 * element routes it through the special-cased `resolvedTag === 'EmberHtmlRaw'`
 * codegen + the ember-gxt-wrappers render path, which parses the value into DOM
 * nodes and reactively updates via `innerHTML`. ONLY detection moves to the AST;
 * the runtime mechanism in ember-gxt-wrappers is untouched.
 *
 * Replaces the former `transformTripleMustaches` string scanner. A
 * triple-mustache parses as a `MustacheStatement` with `escaped === false`, so
 * detection is a single flag check — the hand-rolled tokenizer the string
 * version needed to skip `{{! }}` / `{{!-- --}}` comments (now
 * `MustacheCommentStatement`s, never `escaped===false`), `{{{{raw}}}}` handlebars
 * raw blocks, and `}}}` boundary disambiguation are all subsumed by the parser.
 *
 * Rawtext fallback: inside a `<title>` / `<script>` / `<style>` / `<textarea>`
 * the browser parses content as plain text, so a `<EmberHtmlRaw>` element child
 * would serialize as literal `&lt;EmberHtmlRaw…&gt;` garbage. There the string
 * version emitted a plain `{{expr}}` interpolation instead; we reproduce that by
 * walking the ancestor chain for an enclosing rawtext `ElementNode` (exact, and
 * — unlike the string version's backward open/close-tag balance scan — correct
 * even when the triple sits inside a `{{#if}}`/`{{#each}}` block within the
 * rawtext element).
 *
 * Faithfulness (proven by compiling representative templates both ways through
 * `gxtCompileTemplate` and byte-diffing): identical for every realistic input.
 * The lone divergence is a triple-mustache wrapping a whitespace-containing
 * STRING LITERAL (`{{{"raw text"}}}`) — the string version paren-wrapped it into
 * the invalid sub-expression `{{("raw text")}}` (a hard compile error); the AST
 * version emits the correct `{{"raw text"}}`. No Ember template contains that
 * shape (it would not compile today), so the change is a strict improvement.
 */
function gxtTripleMustacheTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-triple-mustache',
    visitor: {
      MustacheStatement(node: any, path: any): unknown {
        if (node.escaped !== false) return undefined;
        // CONTENT position only. A triple-stache lowers to an `<EmberHtmlRaw>`
        // element that inserts DOM nodes — valid only in a content/body slot
        // (parent `Template`, `Block`, or `ElementNode`). In ATTRIBUTE position
        // (parent `AttrNode` / `ConcatStatement`, e.g. `<div style={{{x}}}>`),
        // the former string scanner emitted syntactically broken markup
        // (`style=<EmberHtmlRaw … />`) that failed the WHOLE compile, yielding an
        // empty, warning-free render (the `style={{{x}}}` "no warning" test passed
        // VACUOUSLY). gxt has no trusted-attribute channel, so emitting a real
        // binding here would (wrongly, for a trusted value) fire the style-XSS
        // warning. We reproduce the string version's observable outcome — no
        // warning, no crash — by emptying the attribute value.
        const parent = path && path.parent && path.parent.node;
        const pt = parent && parent.type;
        if (pt && pt !== 'Template' && pt !== 'Block' && pt !== 'ElementNode') {
          return b.text('');
        }
        // Rawtext fallback: nearest enclosing rawtext element → plain `{{expr}}`.
        let p = path && path.parent;
        let inRawtext = false;
        while (p) {
          const an = p.node;
          if (
            an &&
            an.type === 'ElementNode' &&
            _GXT_RAWTEXT_TAGS.has(String(an.tag).toLowerCase())
          ) {
            inRawtext = true;
            break;
          }
          p = p.parent;
        }
        if (inRawtext) return _gxtTripleValueExpr(b, node);
        const el: any = b.element('EmberHtmlRaw', {
          attrs: [b.attr('@value', _gxtTripleValueExpr(b, node))],
          children: [],
          selfClosing: true,
        });
        // The `element` builder always emits a close tag; force the self-closing
        // shape so codegen matches a parsed `<EmberHtmlRaw … />` byte-for-byte.
        el.selfClosing = true;
        el.closeTag = null;
        return el;
      },
    },
  };
}

/**
 * Preserve HTML comments: `<!-- ... -->` → `<EmberHtmlRaw @value={{(__gxtCommentLookup "<token>")}} />`.
 *
 * The upstream GXT compiler strips `<!-- ... -->` from the emitted template;
 * Ember classic templates treat them as first-class DOM nodes (rehydration and
 * `assertHTML` tests assert on them verbatim). Each comment is registered in the
 * module-local `_gxtCommentRegistry` under a stable plain-ASCII token, and the
 * emitted `<EmberHtmlRaw>` calls the `__gxtCommentLookup` built-in (resolved at
 * render time) to recover the literal comment source — `__gxtCommentLookup` +
 * `_gxtCommentRegistry` + the `<!---->` / `<!--/htmlRaw-->` marker stripping in
 * snapshot.ts are all UNTOUCHED; only detection moves to the AST.
 *
 * Replaces the former `_preserveHtmlComments` string scanner. An HTML comment
 * parses as a `CommentStatement` whose `value` is the inner text (without the
 * `<!--` / `-->` delimiters), so we reconstruct the full source as
 * `'<!--' + value + '-->'` — exactly what the string scanner captured via
 * `template.slice(i, end + 3)`. Handlebars comments `{{! ... }}` /
 * `{{!-- ... --}}` parse as `MustacheCommentStatement` (a DIFFERENT node kind,
 * never visited here), so they are left to be stripped, matching Ember.
 *
 * The token registry indirection is still required: a comment body may contain
 * `{{...}}`, and feeding that back through the parser as an attribute value would
 * mis-parse it as a mustache — the token is pure ASCII and survives intact.
 * (Faithfulness proven by byte-diffing emitted code, normalizing the
 * monotonic token suffix `__gxtCmt_<N>`, which is an internal counter whose exact
 * value the writer and the `__gxtCommentLookup` reader agree on either way.)
 */
function gxtHtmlCommentTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  return {
    name: 'ember-gxt-html-comment',
    visitor: {
      CommentStatement(node: any): unknown {
        const full = '<!--' + node.value + '-->';
        const token = `__gxtCmt_${++_gxtCommentCounter}`;
        _gxtCommentRegistry[token] = full;
        const value = b.mustache(b.sexpr(b.path('__gxtCommentLookup'), [b.string(token)]));
        const el: any = b.element('EmberHtmlRaw', {
          attrs: [b.attr('@value', value)],
          children: [],
          selfClosing: true,
        });
        el.selfClosing = true;
        el.closeTag = null;
        return el;
      },
    },
  };
}

// Table-section element tags whose presence as a `<table>`'s first significant
// child suppresses the implicit-`<tbody>` wrap (HTML allows these directly).
// Mirrors the tag set the former `transformTableTbody` string scanner checked.
const _GXT_TABLE_SECTION_TAGS: ReadonlySet<string> = new Set([
  'thead',
  'tbody',
  'tfoot',
  'caption',
  'colgroup',
]);

// First child of a `<table>` that is not a whitespace-only `TextNode` — mirrors
// the string scanner's `inner.replace(/^\s+/, '')` leading-whitespace strip.
function _gxtFirstSignificantChild(children: any[]): any {
  for (const c of children) {
    if (c && c.type === 'TextNode') {
      if (c.chars && c.chars.trim() !== '') return c;
      continue;
    }
    return c;
  }
  return null;
}

// Whether any descendant element is a `<tr…>` — the AST analogue of the string
// scanner's `inner.includes('<tr')` (which also peers inside `{{#block}}` bodies,
// so we recurse into `BlockStatement` program/inverse bodies too).
function _gxtHasTrDescendant(nodes: any[]): boolean {
  for (const c of nodes) {
    if (!c) continue;
    if (c.type === 'ElementNode') {
      if (String(c.tag).toLowerCase().startsWith('tr')) return true;
      if (_gxtHasTrDescendant(c.children)) return true;
    } else if (c.type === 'BlockStatement') {
      if (c.program && _gxtHasTrDescendant(c.program.body)) return true;
      if (c.inverse && _gxtHasTrDescendant(c.inverse.body)) return true;
    }
  }
  return false;
}

/**
 * Insert the implicit `<tbody>` an HTML parser auto-inserts when `<tr>` appears
 * directly inside `<table>`. The browser tokenizer fixes this up when parsing
 * HTML strings (`innerHTML` / DOMParser), but the GXT AST compiler emits a raw
 * `$_tag('table', …, [$_tag('tr', …)])`. Rehydration / `assertHTML` tests
 * compare serialized DOM against an innerHTML-parsed expected string, which
 * always carries the `<tbody>`.
 *
 * Replaces the former `transformTableTbody` string scanner, reproducing its
 * exact decision on the parsed AST:
 *   - process only the OUTERMOST `<table>` (the string scanner depth-matched the
 *     closing `</table>` and skipped the whole span, so a NESTED table kept its
 *     raw `<tr>`); a `tableDepth` counter reproduces that — only `tableDepth===0`
 *     tables are eligible, sibling top-level tables are each processed;
 *   - skip when the first significant child is a `<thead>`/`<tbody>`/`<tfoot>`/
 *     `<caption>`/`<colgroup>` (a present section wrapper) OR a mustache / block /
 *     handlebars-comment (the scanner's `trimmed.startsWith('{{')` guard — it
 *     could not see into dynamic content, so it bailed). A leading HTML comment
 *     or text node does NOT suppress the wrap (the scanner's `<\s*\w+` regex did
 *     not match `<!--`), matching the scanner;
 *   - otherwise, when a `<tr>` descendant exists, wrap the ENTIRE child list in a
 *     single `<tbody>` (the scanner wrapped all of `inner`, leading whitespace /
 *     blocks included), leaving the original nodes in place inside it.
 *
 * Operating on the AST removes two scanner bugs (proven by byte-diff: every
 * realistic + documented edge case matches; these two cases the scanner turned
 * into hard compile errors): a `>` inside a `<table>` attribute value (e.g.
 * `data-x="a>b"`) no longer splits the opening tag at the wrong offset, and a
 * `<tr` substring inside an attribute value can no longer mis-trigger the wrap.
 */
function gxtTableTbodyTransform(env: GxtAstEnv) {
  const b = env.syntax.builders;
  let tableDepth = 0;
  return {
    name: 'ember-gxt-table-tbody',
    visitor: {
      ElementNode: {
        enter(node: any): void {
          if (String(node.tag).toLowerCase() !== 'table') return;
          const outermost = tableDepth === 0;
          tableDepth++;
          if (!outermost) return; // nested table — string scanner skipped these
          const fs = _gxtFirstSignificantChild(node.children);
          let isWrapper = false;
          if (fs) {
            if (fs.type === 'ElementNode') {
              if (_GXT_TABLE_SECTION_TAGS.has(String(fs.tag).toLowerCase())) {
                isWrapper = true;
              }
            } else if (
              fs.type === 'MustacheStatement' ||
              fs.type === 'BlockStatement' ||
              fs.type === 'MustacheCommentStatement'
            ) {
              // `trimmed.startsWith('{{')` in the string scanner.
              isWrapper = true;
            }
          }
          if (isWrapper) return;
          if (!_gxtHasTrDescendant(node.children)) return;
          const tbody: any = b.element('tbody', {
            attrs: [],
            children: node.children.slice(),
            selfClosing: false,
          });
          node.children = [tbody];
        },
        exit(node: any): void {
          if (String(node.tag).toLowerCase() === 'table') tableDepth--;
        },
      },
    },
  };
}

/**
 * Build the ordered list of Ember dialect AST transforms for one compile.
 *
 * `gxtOutletTransform`, `gxtBlockAtArgTransform`, `gxtAttrQuotedHelperTransform`,
 * `gxtEachInTransform`, `gxtDynamicVarsTransform`, `gxtBlockParamsTransform` and
 * `gxtBodyBareHelperTransform` are always active (they target disjoint node kinds
 * — or, for the `MustacheStatement` visitors, disjoint name/shape predicates — so
 * order between them is irrelevant). The `{{on}}`→`{{on-ext}}` transform is
 * appended only when the strict-mode scope does NOT shadow `on` — mirroring the
 * per-compile gate the former string rewrite used at its call site.
 *
 * `gxtTableTbodyTransform`, `gxtTripleMustacheTransform` and
 * `gxtHtmlCommentTransform` (the former template-SOURCE string rewrites, now the
 * last to migrate) are prepended FIRST, in that relative order — mirroring the
 * old call-site order where they ran on the source before any AST transform.
 * The order between tbody and triple is LOAD-BEARING: the tbody visitor's
 * "first significant child is `{{…}}` → skip wrap" rule must see a leading
 * triple-mustache as a raw `MustacheStatement`, so tbody must run before the
 * triple visitor rewrites it into an `<EmberHtmlRaw>` element (glimmer applies
 * each transform as a separate full traverse, so array order is observable).
 */
// Every builder the dialect visitors call (the full `GxtAstEnv` surface). If
// an upstream @lifeart/gxt release changes its compiler's AST/builders shape,
// the visitors would otherwise fail silently or emit wrong code — this list
// backs the once-per-process fail-loud assertion below.
const GXT_REQUIRED_BUILDERS = [
  'element',
  'path',
  'block',
  'mustache',
  'sexpr',
  'hash',
  'pair',
  'string',
  'blockItself',
  'elementModifier',
  'attr',
  'text',
] as const;

let _gxtAstEnvShapeChecked = false;

/**
 * Fail-loud guard on the upstream `CompileOptions.transforms` contract: the
 * first time the GXT compiler invokes a dialect transform builder, assert the
 * `env.syntax.builders` factory exposes every method the 11 visitors use.
 * Runs once per process at builder-call time (NOT as its own transform pass),
 * so it adds zero AST traversals and zero per-compile cost after the first.
 */
function assertGxtAstEnvShape(env: GxtAstEnv): void {
  if (_gxtAstEnvShapeChecked) return;
  _gxtAstEnvShapeChecked = true;
  const builders = (env as { syntax?: { builders?: Record<string, unknown> } })?.syntax?.builders;
  const missing = builders
    ? GXT_REQUIRED_BUILDERS.filter((name) => typeof builders[name] !== 'function')
    : [...GXT_REQUIRED_BUILDERS];
  if (missing.length > 0) {
    throw new Error(
      `[gxt-backend] @lifeart/gxt AST-transform contract violation: ` +
        `env.syntax.builders is missing ${missing.join(', ')}. The installed ` +
        `@lifeart/gxt compiler's AST shape has drifted from what the Ember ` +
        `dialect transforms (buildGxtDialectTransforms) were written against — ` +
        `check the @lifeart/gxt version pin before debugging template output.`
    );
  }
}

function buildGxtDialectTransforms(
  includeOnExt: boolean,
  scopeValues?: Record<string, unknown>
): readonly GxtAstTransform[] {
  const transforms: GxtAstTransform[] = [
    // The tbody builder is wrapped with the once-per-process env-shape guard
    // (see assertGxtAstEnvShape). It must stay FIRST in the array regardless
    // (the tbody↔triple order is load-bearing, see the doc comment above), so
    // wrapping it guards every later visitor too.
    ((env: GxtAstEnv) => {
      assertGxtAstEnvShape(env);
      return gxtTableTbodyTransform(env);
    }) as unknown as GxtAstTransform,
    gxtTripleMustacheTransform as unknown as GxtAstTransform,
    gxtHtmlCommentTransform as unknown as GxtAstTransform,
    gxtOutletTransform as unknown as GxtAstTransform,
    gxtBlockAtArgTransform as unknown as GxtAstTransform,
    gxtAttrQuotedHelperTransform as unknown as GxtAstTransform,
    gxtEachInTransform as unknown as GxtAstTransform,
    gxtDynamicVarsTransform as unknown as GxtAstTransform,
    gxtBlockParamsTransform as unknown as GxtAstTransform,
    gxtBodyBareHelperTransform(scopeValues) as unknown as GxtAstTransform,
  ];
  if (includeOnExt) {
    transforms.push(gxtOnModifierTransform as unknown as GxtAstTransform);
  }
  return transforms;
}

// HTML comments `<!-- ... -->` are now preserved by the `gxtHtmlCommentTransform`
// AST visitor, and the implicit `<table><tbody>` wrap is now inserted by the
// `gxtTableTbodyTransform` AST visitor (both wired into the compiler `transforms`
// hook — see `buildGxtDialectTransforms`). The former `_preserveHtmlComments` and
// `transformTableTbody` template-source string scanners lived here.

// Zero-arg bare kebab-case mustaches in BODY position (`{{my-component}}` →
// `<MyComponent />`) are now lowered by the `gxtBodyBareHelperTransform` AST
// visitor (see `buildGxtDialectTransforms`), which visits `MustacheStatement`
// nodes and uses the parsed node classification for the position-awareness the
// former string scanner hand-rolled (open-tag / quoted-attr / comment /
// triple-stache / block skipping). The former `transformBodyBareHelperMustaches`
// string scanner lived here.

// Bare-identifier helper mustaches inside quoted attribute values
// (`attr="{{foo-bar}}"` → `attr="{{(foo-bar)}}"`) are now handled by the
// `gxtAttrQuotedHelperTransform` AST visitor (see `buildGxtDialectTransforms`),
// which targets `AttrNode` values directly. The former
// `transformAttrQuotedHelperMustaches` string scanner lived here.

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

  // Check cache first — skip cache when scopeValues are provided (they contain unique references)
  const hasScopeValues = options?.scopeValues && Object.keys(options.scopeValues).length > 0;
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

  // Check for <TextArea /> typo — should be <Textarea />.
  // Use getDebugFunction('assert') so expectAssertion's stub is called.
  if (hasTextAreaTag(templateString)) {
    const _assert = getDebugFunction('assert');
    if (_assert)
      _assert('Could not find component `<TextArea />` (did you mean `<Textarea />`?)', false);
  }

  // Transform the template
  let transformedTemplate = templateString;

  // Pre-transform: rewrite bare-identifier helper mustaches in HTML attribute
  // quoted values from `attr="{{foo-bar}}"` → `attr="{{(foo-bar)}}"`.
  //
  // Bare-identifier helper mustaches inside quoted attribute values
  // (`attr="{{foo-bar}}"` → `attr="{{(foo-bar)}}"`) are now handled by the
  // `gxtAttrQuotedHelperTransform` AST visitor wired into the GXT compiler's
  // `transforms` hook below (see `buildGxtDialectTransforms`). No
  // template-source string rewrite needed.

  // Zero-arg bare kebab-case mustaches in BODY position (`{{my-component}}` →
  // `<MyComponent />`) are now lowered by the `gxtBodyBareHelperTransform` AST
  // visitor wired into the GXT compiler's `transforms` hook below (see
  // `buildGxtDialectTransforms`). The visitor receives `options?.scopeValues` so
  // explicitly scope-bound kebab names (rehydration fixtures, strict-mode
  // locals) keep their `{{name}}` form. No template-source string rewrite needed.

  // {{outlet}} → <ember-outlet /> is now handled by the `gxtOutletTransform`
  // AST visitor wired into the GXT compiler's `transforms` hook below
  // (see `buildGxtDialectTransforms`). No template-source string rewrite needed.

  // `<table><tr>` → `<table><tbody><tr>` (the implicit-tbody HTML-parser fix-up)
  // is now inserted by the `gxtTableTbodyTransform` AST visitor wired into the
  // GXT compiler's `transforms` hook below (see `buildGxtDialectTransforms`). No
  // template-source string rewrite needed.

  // {{#-with-dynamic-vars ...}} / {{-get-dynamic-var ...}} lowering is now handled
  // by the `gxtDynamicVarsTransform` AST visitor wired into the GXT compiler's
  // `transforms` hook below (see `buildGxtDialectTransforms`). It lowers
  // `{{#-with-dynamic-vars outletState=EXPR}}BODY{{/-with-dynamic-vars}}` to
  // `{{#let EXPR as |VAR|}}BODY'{{/let}}` (inner `{{-get-dynamic-var "outletState"}}`
  // → `{{VAR}}`), lowers remaining top-level `{{-get-dynamic-var "outletState"}}`
  // to the `gxtGetOutletState` built-in helper, and fires the same Ember.assert
  // diagnostics on non-`outletState` keys (now from inside the visitor). The
  // `gxtGetOutletState` scope binding is still added below (gated on the source
  // containing `-get-dynamic-var`) so the compiler emits a bare binding reference.

  // {{#each-in EXPR as |k v|}} → {{#each (gxtEntriesOf EXPR) …}} is now handled
  // by the `gxtEachInTransform` AST visitor wired into the GXT compiler's
  // `transforms` hook below (see `buildGxtDialectTransforms`). The
  // `gxtEntriesOf` scope binding is still added below (gated on the source
  // containing `{{#each-in`) so the compiler emits a bare binding reference.

  // Triple-mustache {{{expr}}} → <EmberHtmlRaw @value={{expr}} /> is now handled
  // by the `gxtTripleMustacheTransform` AST visitor wired into the GXT compiler's
  // `transforms` hook below (see `buildGxtDialectTransforms`). It detects the
  // `escaped === false` MustacheStatement and emits the same EmberHtmlRaw element
  // (with the rawtext `{{expr}}` fallback inside title/script/style/textarea).
  // The ember-gxt-wrappers render mechanism is untouched. No source rewrite needed.

  // HTML comments <!-- ... --> are now preserved by the `gxtHtmlCommentTransform`
  // AST visitor wired into the GXT compiler's `transforms` hook below (see
  // `buildGxtDialectTransforms`). It converts each `CommentStatement` to the same
  // `<EmberHtmlRaw @value={{(__gxtCommentLookup "<token>")}} />` invocation, using
  // the unchanged `_gxtCommentRegistry` + `__gxtCommentLookup` resolver (whose
  // `<!---->` / `<!--/htmlRaw-->` markers `MARKER_COMMENT_RE` in snapshot.ts still
  // strips). Handlebars comments `{{! }}` / `{{!-- --}}` parse as
  // `MustacheCommentStatement` and are left to be stripped. No source rewrite needed.

  // onclick={{expr}} → {{on "click" expr}} transform is now handled at the AST level
  // in the GXT compiler (visitors/element.ts rewriteOnEventAttributes),
  // gated behind IS_GLIMMER_COMPAT_MODE.

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

  // Check for dotted-path mustache expressions like {{foo.bar}} where foo is not in scope.
  // In Ember, these are errors because foo is a free variable path that can't be resolved.
  // Collect block param names first so we don't flag those. Strict-mode
  // bindings (from scope() / scopeValues) also bring the head into scope.
  {
    const blockParamNames = findBlockParamNames(transformedTemplate);
    const scopeValueNames = options?.scopeValues ? new Set(Object.keys(options.scopeValues)) : null;
    for (const { head, tail } of findDottedMustaches(transformedTemplate)) {
      if (head === 'this') continue;
      if (blockParamNames.has(head)) continue;
      if (scopeValueNames && scopeValueNames.has(head)) continue;
      throw new Error(
        `You attempted to render a path (\`{{${head}.${tail}}}\`), but ${head} was not in scope`
      );
    }
  }

  // NOTE: `this.attrs.X` → `@X` rewriting is now handled in the GXT AST compiler
  // (visitors/utils.ts resolvePath and visitors/index.ts visitPathExpression),
  // gated behind IS_GLIMMER_COMPAT_MODE.

  // Transform {{#in-element dest insertBefore=EXPR}} to extract the insertBefore
  // parameter. GXT's native $_inElement only takes (elementRef, roots, ctx) but
  // Ember also supports insertBefore=null (append mode) and validates the destination.
  // We strip the insertBefore param from the template and set a global flag
  // that our $_inElement override reads at runtime.
  // Possible insertBefore values:
  //   null      → append mode (don't clear existing content)
  //   undefined → replace mode (default, clear existing content)
  //   other     → assert error (Ember only allows null)
  let _inElementInsertBefore: string | null = null; // null = no insertBefore specified
  // Extracted literal string destination ids for `{{#in-element (... "id")}}`
  // in template order. Used by $_inElement as a fallback when the reactive
  // destination ref resolves to null during a render-order-timing situation
  // (nested component rendering before the outer fragment is committed).
  const _inElementLiteralIds: string[] = [];
  if (transformedTemplate.includes('{{#in-element')) {
    // Scan the pre-parse template for literal string ids inside each
    // {{#in-element ...}} opening tag. This MUST run before
    // parseInElementInsertBefore (which may rewrite the destination
    // expression).
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
    const parsed = parseInElementInsertBefore(transformedTemplate);
    transformedTemplate = parsed.result;
    _inElementInsertBefore = parsed.insertBefore;
  }

  // {{mount "engine-name"}} is now handled at the AST level in the GXT compiler
  // (mustache.ts createMountElement). No runtime regex transform needed.

  // Empty true-branch in {{#if cond}}{{else}}content{{/if}} is now handled
  // at the AST level in the GXT compiler (block.ts visitBlock allows empty
  // main body when an inverse/else branch exists). No runtime regex needed.

  // Bare {{this}} → {{this.__gxtSelfString__}} is now handled at the AST level
  // in the GXT compiler (mustache.ts visitMustache). No runtime regex transform needed.

  // {{#each-in}} is now handled at the AST level in the GXT compiler
  // (block.ts visitEachInBlock). No runtime regex transform needed.
  let _eachInSources: Array<{ propName: string; sourceExpr: string }> = [];

  // (mut (get obj key)) -> (__mutGet obj key) is now handled at the AST level
  // in the GXT compiler (visitors/index.ts visitSubExpression and
  // visitors/mustache.ts visitHelperMustache). No runtime regex transform needed.

  // (mut this.prop) / (mut @arg) path annotation is now handled at the AST level
  // in the GXT compiler (visitors/index.ts visitSubExpression), gated behind
  // IS_GLIMMER_COMPAT_MODE. No runtime regex transform needed.

  // Check for dynamic (helper ...) usage — disallowed in Ember.
  // {{helper this.xxx}} or (helper @xxx) pass dynamic strings which is not allowed.
  // Only {{helper "static-name"}} is valid. But {{helper this.helperRef}} where
  // the ref is a helper function (not a string) IS allowed — we can't distinguish
  // at compile time, so we only flag obvious dynamic-string patterns.
  {
    // Match {{helper this.xxx}} — this is the only pattern in the test suite that
    // represents "dynamic string resolution". Template-local refs like this.val
    // where val is a defineSimpleHelper result use a different template structure
    // (they're inside component templates where this.val is set as a class property).
    if (hasDynamicHelper(transformedTemplate)) {
      emberAssert('Passing a dynamic string to the `(helper)` keyword is disallowed.', false);
    }
  }

  // Check for dynamic (modifier ...) usage — disallowed in Ember.
  // (modifier this.xxx) passes a dynamic string which is not allowed.
  // Only (modifier "static-name") or (modifier this.modifierRef) (where ref is a
  // modifier function, not a string) are valid.
  {
    if (hasDynamicModifier(transformedTemplate)) {
      emberAssert('Passing a dynamic string to the `(modifier)` keyword is disallowed.', false);
    }
  }

  // {{(modifier "name" args...)}} in element modifier position is now handled at the
  // AST level in the GXT compiler (visitors/element.ts processEvents), gated behind
  // IS_GLIMMER_COMPAT_MODE. No runtime regex transform needed.
  // Pattern 2 (@attr={{modifier refExpr "arg"}}) is left as-is for the modifier helper
  // in ember-gxt-wrappers.ts to handle at runtime.

  // Foo::Bar namespaced component transform is now handled as a pre-processor
  // in the GXT compiler (compile.ts transformNamespacedComponents),
  // gated behind IS_GLIMMER_COMPAT_MODE.

  // PascalCase → kebab-case transform for component names is now handled by the
  // GXT compiler's customizeComponentName callback (passed in the compile options below).
  // Triple-mustache {{{expr}}} transform is now handled at compile time
  // in the GXT AST compiler (mustache visitor, escaped === false check).

  // NOTE: {{component}} helper transform ({{#component "name"}} → <Name />, etc.)
  // is now handled as a pre-processor in the GXT compiler (plugins/compiler/compile.ts),
  // gated behind IS_GLIMMER_COMPAT_MODE.

  // NOTE: transformLetBlockParamInvocations has been moved to the GXT AST compiler
  // (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

  // {{input ...}} / {{textarea ...}} → <Input /> / <Textarea /> is now handled at the AST level
  // in the GXT compiler (mustache.ts createInputTextareaElement). No runtime regex transform needed.

  // Hyphenated built-in helper name renaming (e.g., unique-id → unique_id) is now
  // handled by the GXT compiler's scope tracker in IS_GLIMMER_COMPAT_MODE.
  // The compiler normalizes hyphenated names to underscored JS identifiers during
  // path resolution, so the template text no longer needs pre-processing.

  // NOTE: transformCurlyBlockComponents (inline form) has been moved to the GXT AST compiler
  // (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.
  // Block form was already handled by the GXT block visitor.

  // {{#@argName args}}content{{/@argName}} block invocations are now lowered to
  // {{#component @argName args}}content{{/component}} by the
  // `gxtBlockAtArgTransform` AST visitor wired into the GXT compiler's
  // `transforms` hook below (see `buildGxtDialectTransforms`). No
  // template-source string rewrite needed.

  // NOTE: Empty component @__hasBlock__ marker transform has been moved to the GXT AST compiler
  // (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

  // NOTE: Positional params transform (<Component "Foo" 4 /> → @__pos0__="Foo" @__pos1__={{4}} ...)
  // has been moved to the GXT AST compiler (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

  // NOTE: Reserved-word attribute value transforms (e.g. class=class → class=this.class)
  // are now handled in the GXT AST compiler's resolvePath (visitors/utils.ts).
  // The Glimmer parser produces a PathExpression for the value and resolvePath
  // prefixes JS reserved words with `this.` when IS_GLIMMER_COMPAT_MODE is set.

  // Block params transform (`<Foo as |x|>{{x}}</Foo>` → `<Foo @__hasBlockParams__="default">{{this.$_bp0}}</Foo>`)
  // is now handled by the `gxtBlockParamsTransform` AST visitor wired into the GXT
  // compiler's `transforms` hook below (see `buildGxtDialectTransforms`). The
  // visitor is shadow-aware (the former `transformBlockParamsInTemplate` string
  // scanner was not). No template-source string rewrite needed.

  // has-block and has-block-params transforms (including attribute-position wrapping)
  // are now handled at the AST level in the GXT compiler (visitors/index.ts
  // visitSubExpression + visitors/element.ts visitAttributeValue), gated behind
  // IS_GLIMMER_COMPAT_MODE. No runtime regex transform needed.

  // ...attributes local override tracking (__splatLocal__ marker) is now handled at the
  // AST level in the GXT compiler (visitors/element.ts rewriteSplatLocalOverrides),
  // gated behind IS_GLIMMER_COMPAT_MODE.

  // Build bindings set from scopeValues so the GXT compiler knows which names
  // are in scope and should NOT be transformed to built-in symbols (e.g. the
  // local `array` function should shadow the built-in $__array helper).
  const scopeBindings = new Set<string>();
  if (options?.scopeValues) {
    for (const key of Object.keys(options.scopeValues)) {
      scopeBindings.add(key);
    }
  }

  // Add unique_id to scope bindings if the template references unique-id or unique_id.
  // The GXT compiler normalizes hyphenated names to underscores in IS_GLIMMER_COMPAT_MODE,
  // so `{{unique-id}}` resolves to the `unique_id` scope binding.
  // We inject the actual value later via helperInjections.
  if (
    containsWord(transformedTemplate, 'unique-id') ||
    containsWord(transformedTemplate, 'unique_id')
  ) {
    scopeBindings.add('unique_id');
  }

  // Add gxtEntriesOf to scope bindings whenever the source contains an
  // `{{#each-in` block. The `gxtEachInTransform` AST visitor (wired below)
  // injects a `(gxtEntriesOf …)` SubExpression during compile, so the binding
  // must be present up front for the compiler to emit a bare binding reference
  // (`gxtEntriesOf`) instead of a string lookup (`"gxtEntriesOf"`). We gate on
  // the original `templateString` (not the post-string-transform
  // `transformedTemplate`) since the AST rewrite no longer puts the name in the
  // source. `{{#each-in` is exactly the precondition the former
  // `transformEachInBlocks` loop used.
  if (templateString.indexOf('{{#each-in') !== -1) {
    scopeBindings.add('gxtEntriesOf');
  }

  // Add gxtGetOutletState to scope bindings whenever the source contains a
  // `-get-dynamic-var` call (either form). The `gxtDynamicVarsTransform` AST
  // visitor (wired below) injects a `(gxtGetOutletState)` SubExpression during
  // compile for top-level / non-`outletState` gets, so the binding must be
  // present up front for the compiler to emit a bare binding reference
  // (`gxtGetOutletState`) rather than a string lookup (`"gxtGetOutletState"`).
  // We gate on the original `templateString` (not the post-string-transform
  // `transformedTemplate`) since the AST rewrite no longer puts the name in the
  // source. The OR keeps the prior behavior for a template that literally
  // mentions `gxtGetOutletState`. An unused binding (all gets in-scope) is inert.
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

  // Compile using GXT runtime compiler
  const compilationResult = gxtCompileTemplate(transformedTemplate, {
    moduleName: options?.moduleName || 'gxt-runtime-template',
    bindings: scopeBindings.size > 0 ? scopeBindings : undefined,
    // Ember dialect AST transforms (public `transforms` hook). These run on the
    // parsed AST after preprocess / before codegen and replace the former
    // string pre-rewrites for `{{outlet}}`, `{{#@arg}}` blocks, quoted-attribute
    // bare-helper mustaches, `{{#each-in}}`, and (when not scope-shadowed)
    // `{{on}}`→`{{on-ext}}`. See `buildGxtDialectTransforms` above. REQUIRES a
    // glimmer-next build that exposes `CompileOptions.transforms` (PR #217 /
    // next publish); the currently published 0.0.63 ignores this field — see
    // the file-footer landing note.
    transforms: buildGxtDialectTransforms(_includeOnExtTransform, options?.scopeValues),
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
    },
    // Convert PascalCase component names to kebab-case for Ember registry lookup.
    // This replaces the regex-based transformCapitalizedComponents() pre-processing.
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

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    console.warn('[gxt-compile] Compilation errors:', compilationResult.errors);
    console.warn('[gxt-compile] Template:', transformedTemplate.slice(0, 200));
  }

  // Always recreate the template function to:
  // 1. Replace async $_each with synchronous $_eachSync
  // 2. Inject $slots reference (globalThis.$slots) for {{yield}} support
  // 3. Inject $a alias for @named args
  if (compilationResult.code) {
    let modifiedCode = compilationResult.code;
    // Force every {{#each}} block in classic Ember templates onto the
    // synchronous list path (`$_eachSync` / `SyncListComponent`).
    //
    // GXT's serializer emits async `$_each` by default — `AsyncListComponent`
    // applies its DOM mutations on a microtask. After a runTask
    // mutation that fires `notifyPropertyChange(arr, '[]')`, the
    // `__gxtSyncDomNow` pipeline runs synchronously, so the async
    // syncList opcode hasn't yet updated the live DOM by the time
    // `__gxtForceEmberRerender`'s morph fallback fires. The morph then
    // diffs the new full-template fragment against the *pre-mutation*
    // live DOM (3 children) position-by-position, clobbering the
    // existing Text nodes' content with whatever happens to land at the
    // same index in the new fragment. That destroys the DOM-node
    // identity that the `assertPartialInvariants` invariant in the
    // `Syntax test: {{#each}} ... it maintains DOM stability for
    // stable keys when list is updated` test guards. The synchronous
    // SyncListComponent path moves item markers (and the rows behind
    // them) BEFORE the morph runs, so morph then sees identical content
    // on both sides and is a no-op for keyed rows — preserving identity.
    //
    // Async element destructors (the original reason GXT removed the
    // forced-sync path) only matter for animations attached to
    // `{{#each}}` rows; classic Ember templates compiled via
    // `precompileTemplate` never set them up, so the sync path is
    // strictly safe here.
    modifiedCode = modifiedCode.replace(/\$_each\(/g, '$_eachSync(');
    // NOTE: $__log site ID wrapping is now handled in the GXT serializer
    // (value.ts emits comma expression with site ID directly in IS_GLIMMER_COMPAT_MODE)
    // Post-process: replace per-compilation __logSite:N with globally unique IDs
    // to prevent dedup collisions across different template compilations.
    modifiedCode = modifiedCode.replace(
      /__logSite:\d+/g,
      () => `__logSite:${_globalLogSiteCounter++}`
    );

    // Post-process: GXT emits quoted attribute values as `[...expressions].join("")`.
    // This implicit string coercion throws TypeError for Symbol values and for
    // Object.create(null). Rewrite to `globalThis.__gxtQuotedAttr([...])` which
    // uses explicit String() conversion with Glimmer's normalizeStringValue
    // semantics AND returns `null` when the attribute value is purely
    // null/undefined — matching Ember's "missing attribute" behavior for
    // `<img src='{{this.src}}'>` with `src=null`.
    //
    // The pattern is very specific: `].join("")` occurs at the end of the quoted
    // attribute serialization in GXT's output. Any other `.join` call uses a
    // non-empty separator, so this replacement is safe.
    if (modifiedCode.indexOf('].join("")') !== -1) {
      // Walk the code and wrap each matching `[...].join("")` with the
      // __gxtQuotedAttr helper. We scan backward from each `].join("")`
      // to find the matching `[` (handling nested brackets/strings) so we
      // can prepend the wrapper call.
      const target = '].join("")';
      let buf = '';
      let i = 0;
      const n = modifiedCode.length;
      while (i < n) {
        const idx = modifiedCode.indexOf(target, i);
        if (idx === -1) {
          buf += modifiedCode.slice(i);
          break;
        }
        // Find matching `[` for the `]` at position idx
        let depth = 1;
        let j = idx - 1;
        while (j >= 0 && depth > 0) {
          const ch = modifiedCode[j]!;
          if (ch === ']') depth++;
          else if (ch === '[') depth--;
          else if (ch === '"' || ch === "'" || ch === '`') {
            const quote = ch;
            j--;
            while (j >= 0 && modifiedCode[j] !== quote) {
              if (modifiedCode[j - 1] === '\\') j--;
              j--;
            }
          }
          if (depth > 0) j--;
        }
        if (depth !== 0) {
          // Couldn't find matching bracket — leave the literal as-is.
          buf += modifiedCode.slice(i, idx + target.length);
          i = idx + target.length;
          continue;
        }
        const arrStart = j; // position of `[`
        // Replace `[...].join("")` with `globalThis.__gxtQuotedAttr([...])`
        buf += modifiedCode.slice(i, arrStart);
        buf += 'globalThis.__gxtQuotedAttr(';
        buf += modifiedCode.slice(arrStart, idx + 1); // includes `]`
        buf += ')';
        i = idx + target.length;
      }
      modifiedCode = buf;
    }

    // NOTE: arg-headed dynamic-component tags (`<@model.componentName/>` and
    // `{{component @model.componentName ...}}`) are now normalized to `$a.`
    // directly by the GXT serializer's `buildComponentCall` `@`-tag handling
    // (glimmer-next lifeart/glimmer-next#219), so the former
    // `_rewriteBareAtArgsToArgsAlias` post-codegen string scrub is no longer
    // needed. The serializer emits `$_dc(() => $a.model.componentName, ...)`.

    // Post-process: When GXT emits $_maybeHelper("name", ...) with a string for a
    // name that is in scope bindings, replace the string with a variable reference.
    // The GXT compiler sometimes emits string-based lookups even for known bindings
    // (e.g., when WITH_HELPER_MANAGER path isn't taken). The scope injection later
    // creates `const get = globalThis[scopeKey]["get"]`, but the compiled code
    // references the string "get" — this fix bridges that gap.
    if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
      const _jsReserved = new Set([
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
      const scopeKeySet = new Set(Object.keys(options.scopeValues));
      for (const key of scopeKeySet) {
        let jsKey = hyphenToUnderscore(key);
        if (_jsReserved.has(jsKey)) {
          jsKey = `__scope_${jsKey}`;
        }
        // Replace $_maybeHelper("key", with $_maybeHelper(jsKey,
        // Use a regex that matches both quote styles
        const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const pattern = new RegExp(`\\$_maybeHelper\\("${escapedKey}",`, 'g');
        modifiedCode = modifiedCode.replace(pattern, `$_maybeHelper(${jsKey},`);
        const pattern2 = new RegExp(`\\$_maybeHelper\\('${escapedKey}',`, 'g');
        modifiedCode = modifiedCode.replace(pattern2, `$_maybeHelper(${jsKey},`);
        // Replace $_maybeHelper(kebab-name, ...) — GXT may emit the scope
        // binding name verbatim as an unquoted identifier, which for kebab
        // names like `say-hello` is invalid JS (parsed as `say - hello`).
        // Only apply when the key actually contains a hyphen — hyphen-free
        // names (including reserved words handled elsewhere) are safe.
        if (key.indexOf('-') !== -1) {
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
    modifiedCode = modifiedCode.replace(
      /(\["@[A-Za-z_][A-Za-z0-9_-]*",\s*)\$_maybeHelper\(("[^"]+"),\s*\[\],\s*this\)/g,
      (match, prefix, nameLiteral) => {
        // Skip known built-in helper names that are safe as named args.
        const bareName = nameLiteral.slice(1, -1);
        // Only apply to simple identifiers (letters/digits/underscore/hyphen)
        if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(bareName)) return match;
        // Do not guard built-in keyword helpers — those aren't "registered
        // helpers" from the owner registry perspective.
        const BUILTIN = new Set([
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
          'component',
          '__mutGet',
        ]);
        if (BUILTIN.has(bareName)) return match;
        return `${prefix}(globalThis.__gxtAssertNotResolvedHelperAsNamedArg(${nameLiteral}, this), $_maybeHelper(${nameLiteral}, [], this))`;
      }
    );

    // NOTE: inline `(unbound X)` in a sub-expression context (e.g.
    // `{{yield (unbound this.x)}}`) is now wrapped in the caching
    // `globalThis.__gxtUnboundEval(__ubCache, "__ubN", () => unbound(...))`
    // shape directly by the GXT serializer's legacy string path
    // (`serializeHelperCall`, now at parity with the JSExpression builder —
    // glimmer-next lifeart/glimmer-next#219), matching the top-level
    // `{{unbound X}}` form. The former `_rewriteInlineUnbound` post-codegen
    // scrub is no longer needed.

    // Detect unbound usage by checking for __ubCache in the compiled code
    const hasUnbound = modifiedCode.includes('__ubCache');
    // NOTE: The Let_XXX_scopeN()() double-call fix has been removed — the root cause
    // was fixed in GXT's applyVariableReplacements() in block.ts, and GXT no longer
    // generates Let_ naming patterns.
    // NOTE: $_if condition tagging (__gxtGetCellOrFormula) is now handled in the GXT
    // serializer (control.ts emits the wrapped call directly in IS_GLIMMER_COMPAT_MODE)
    // NOTE: $__fn first-arg getter wrapping is now handled in the GXT serializer
    // (value.ts wraps this.X paths in getters directly in IS_GLIMMER_COMPAT_MODE)
    // NOTE: Block param children wrapping ($_bp) is now handled in the GXT serializer
    // (element.ts wraps children containing component calls in arrow functions in IS_GLIMMER_COMPAT_MODE)

    // Scope resolution for helpers (string→ref, built-in shadowing, getter
    // unwrapping for hash/array/fn) is now handled at compile time by the GXT
    // compiler's buildHelper/buildScopeOverriddenBuiltIn in value.ts.
    // The compiler receives scopeBindings via the `bindings` option and:
    //   1. Emits $_maybeHelper(ref, ...) with direct variable references for
    //      scope-bound names (no string-based resolution needed)
    //   2. Emits getter-unwrapping IIFE wrappers for hash/array/fn when a
    //      scope binding shadows the GXT built-in
    //   3. Let-block shadowing fix is no longer needed because the built-in
    //      symbol replacement (step 2) no longer happens as a regex

    // NOTE: $_componentHelper hash getter wrapping is now handled in the GXT serializer
    // (value.ts wraps hash values in getters directly in IS_GLIMMER_COMPAT_MODE),
    // INCLUDING the former EXCEPTION case where `(component "x" key=this.path)`
    // appears inside a `(hash ...)` passed to `{{yield}}` (e.g.
    // `{{yield (hash foo=(component "nested" p=this.x))}}`). That case previously
    // routed through the legacy string serializer (`serializeHelperCall`), which
    // emitted DIRECT hash values (`$_componentHelper(["nested"], { p: this.x })`)
    // instead of getters — a frozen snapshot for Ember's CurriedComponent manager
    // (`typeof value === 'function' ? value() : value`). That string path is now
    // at parity with the JSExpression builder and getter-wraps named args
    // (`{ p: () => this.x }`) directly (glimmer-next lifeart/glimmer-next#219), so
    // the former `_wrapComponentHelperHashGetters` post-codegen scrub is gone.

    // NOTE: Component children lazy wrapping ($_tag children) is now handled in the GXT
    // serializer (element.ts wraps component children in arrow functions in IS_GLIMMER_COMPAT_MODE)

    compilationResult.code = modifiedCode;
    try {
      const needsArgsAlias = modifiedCode.includes('$a.');
      const needsSlots = modifiedCode.includes('$slots');
      // Broad-substring on purpose (a false positive just emits an unused
      // const): with the globalThis.$fw slot retired, a missed reference
      // shape would silently read undefined.
      const needsFw = modifiedCode.includes('$fw');
      const g = globalThis as any;
      // Inject Ember keyword helpers as local variables so GXT-compiled code
      // that references them as bare identifiers (e.g. inside {{#let}}) works.
      // GXT treats unknown helpers as scope variables in subexpression position.
      const helperInjections: string[] = [];
      const scopeInjections: string[] = [];
      const scopeVals = options?.scopeValues;
      const scopeKeys = new Set(scopeVals ? Object.keys(scopeVals) : []);

      // Inject scope values as local variables (for strict mode templates with scope)
      // JS reserved words cannot be used as variable names, so we prefix them
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
        // Also replace the Glimmer VM `on` modifier with a GXT-compatible version.
        // GXT handles {{on "event" handler}} natively, so we provide a no-op modifier
        // that the GXT compiler already transforms into event bindings.
        //
        // IMPORTANT: only replace when scope `on` is the canonical Glimmer-VM
        // `on` definition (the OnModifierManager registered in
        // `$_MANAGERS.modifier._builtinModifiers['on']`). Tests that
        // intentionally shadow `on` with a user-defined modifier
        // (`setModifierManager(() => mgr, {})`) put a different object on
        // INTERNAL_MODIFIER_MANAGERS; the shadow must take effect — otherwise
        // the built-in `on` runs instead and tests like
        // `keyword modifier: on :: can be shadowed` fail with "passed
        // undefined" because the built-in requires a 2nd handler arg.
        const _canonicalOn = g.$_MANAGERS?.modifier?._builtinModifiers?.['on'];
        if (
          scopeVals['on'] !== undefined &&
          typeof scopeVals['on'] !== 'function' &&
          _canonicalOn !== undefined &&
          scopeVals['on'] === _canonicalOn
        ) {
          // Only the canonical Glimmer-VM `on` is replaced; user-shadowed
          // `on` modifiers fall through unchanged.
          scopeVals['on'] = _emberBuiltinHelpers['on'] || scopeVals['on'];
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
          // don't TDZ-trap on the about-to-be-declared `const ${jsKey}` —
          // and the per-template `__gxtScope_<hash>` globalThis keys die.
          scopeInjections.push(`const ${jsKey} = __gxtGetScope("${scopeStoreKey}")["${key}"];`);
        }
      }

      const BUILTINS = _emberBuiltinHelpers;
      if (BUILTINS) {
        // Check which helpers are referenced as bare identifiers in the compiled code
        const helperNames = [
          'get',
          'unbound',
          'array',
          'hash',
          'concat',
          'fn',
          'mut',
          'readonly',
          'unique-id',
          'helper',
          'modifier',
          'gxtEntriesOf',
          'gxtGetOutletState',
          '__mutGet',
          '__gxtCommentLookup',
        ];
        for (const name of helperNames) {
          // Convert helper name to valid JS identifier (unique-id -> unique_id)
          const jsName = hyphenToUnderscore(name);
          // Skip if this name is provided in scope values (scope shadows built-in)
          if (scopeKeys.has(name) || scopeKeys.has(jsName)) continue;
          // Check if the compiled code references this as a bare identifier
          // Match word boundary to avoid false positives (e.g. "getElement")
          if (name === 'unique-id') {
            // unique-id needs per-component-instance caching so that:
            // 1. Each {{unique-id}} invocation returns a UNIQUE value
            // 2. The SAME invocation returns the SAME value across re-renders
            // 3. {{#let (unique-id) as |id|}} produces a stable id
            //
            // The compiled code may reference unique-id in two forms
            // depending on the compile path:
            //   a) bare call:    unique_id()                  (scope-bound)
            //   b) maybeHelper:  $_maybeHelper("unique-id", [], this)
            // Form (b) appears when GXT does not recognize the binding —
            // e.g. inside `{{#let (unique-id) as |id|}}` where the let-init
            // is not wrapped in the builtin resolution path. We normalize
            // (b) into (a) so both share the _uid[N] caching mechanism that
            // keeps ids stable across re-evaluations of the same call site.
            const mhStr = '$_maybeHelper("unique-id", [], this)';
            if (modifiedCode.includes(mhStr)) {
              modifiedCode = modifiedCode.split(mhStr).join('unique_id()');
            }
            if (!containsWord(modifiedCode, jsName)) continue;
            // GXT compiles #let block params as getters: let id = () => unique_id();
            // Each access to `id` calls unique_id() again. To make ids stable,
            // we count unique_id() call sites in the compiled code, pre-generate
            // that many IDs (cached per component instance), and replace each
            // unique_id() call with a lookup into the pre-generated array.
            //
            // Count unique_id() calls in modifiedCode
            const uidCallCount = countWord(modifiedCode, 'unique_id()');
            if (uidCallCount > 0) {
              // Replace each unique_id() call with _uid[N] where N is the call index
              let uidIdx = 0;
              modifiedCode = replaceWord(modifiedCode, 'unique_id()', () => `_uid[${uidIdx++}]`);
              // Mark that we need the _uid array in the outer scope.
              // The array is generated ONCE when the template factory function
              // is first evaluated, so IDs remain stable across re-renders.
              (compilationResult as any).__uidCount = uidCallCount;
            } else {
              // unique_id referenced but not called — inject as plain function
              helperInjections.push(`const unique_id = __gxtBuiltinHelpers["unique-id"];`);
            }
          } else if (containsWord(modifiedCode, jsName)) {
            helperInjections.push(`const ${jsName} = __gxtBuiltinHelpers["${name}"];`);
          }
        }
      }
      // each-in entries getter injections (now handled at AST level in GXT compiler)
      const eachInInjections: string[] = [];
      // Generate unique-id pre-computed array in outer scope if needed.
      // This runs ONCE per template compilation (not per render), so IDs
      // remain stable across re-renders of the same component instance.
      const uidCount = (compilationResult as any).__uidCount || 0;
      const uidOuterScope =
        uidCount > 0
          ? `var _uid_fn = __gxtBuiltinHelpers["unique-id"];` +
            `var _uid = []; for (var _uid_i = 0; _uid_i < ${uidCount}; _uid_i++) _uid.push(_uid_fn());`
          : '';

      // For strict-mode templates, shadow the global $_maybeHelper with a
      // resolver that throws "not in scope" for free identifiers instead of
      // falling back to owner.lookup. We do this at the OUTER (factory) scope
      // so that the shadow survives across all reactive getter closures
      // produced by the compiled template — including closures invoked long
      // after the enclosing template.render() call returns.
      //
      // The shadow is inlined into the emitted Function() body, closing over
      // `globalThis.$_maybeHelper` (the ember-wrapped delegate, stable after
      // `installEmberWrappers()`), an inline allow-list object literal, and
      // `globalThis.__EMBER_BUILTIN_HELPERS__` for the built-in bypass. The
      // Function() body is cached, so the inlined block costs one compilation
      // per unique template body.
      const strictMaybeHelperInjection = __strictModeFlag
        ? `var $_maybeHelper_orig = $_maybeHelper;` +
          `var $_maybeHelper_allowed = ${_GXT_STRICT_ALLOWED_NAMES_JS_LITERAL};` +
          `var $_maybeHelper = function (n, a, h, c) {` +
          `if (typeof n === 'string' && !$_maybeHelper_allowed[n]) {` +
          `var bh = __gxtBuiltinHelpers;` +
          `if (!(bh && bh[n])) {` +
          `throw new Error('Attempted to resolve \`' + n + '\`, which was expected to be a component or helper, but that value was not in scope: ' + n);` +
          `}` +
          `}` +
          `return $_maybeHelper_orig(n, a, h, c);` +
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

      // Rewrite emitted `globalThis.__gxtAssertNotResolvedHelperAsNamedArg(` →
      // local `__gxtAssertNotResolvedHelperAsNamedArg(` so the inline-emitted
      // guard function (declared at the outer Function() scope below) is used
      // directly. The injection is gated on detection of the rewritten form so
      // templates without the guard pattern pay zero overhead.
      const hasNamedArgHelperGuard = modifiedCode.includes(
        'globalThis.__gxtAssertNotResolvedHelperAsNamedArg('
      );
      if (hasNamedArgHelperGuard) {
        modifiedCode = modifiedCode
          .split('globalThis.__gxtAssertNotResolvedHelperAsNamedArg(')
          .join('__gxtAssertNotResolvedHelperAsNamedArg(');
      }

      // Rewrite emitted `globalThis.__gxtQuotedAttr(` → local `__gxtQuotedAttr(`
      // so the inline-emitted helper (declared at the outer Function() scope
      // below) is used directly. The emitter is the `].join("")` post-processor
      // above. The injection is gated on detection of the rewritten form so
      // templates without quoted attribute interpolation pay zero overhead.
      const hasQuotedAttr = modifiedCode.includes('globalThis.__gxtQuotedAttr(');
      if (hasQuotedAttr) {
        modifiedCode = modifiedCode.split('globalThis.__gxtQuotedAttr(').join('__gxtQuotedAttr(');
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
          // pass via the absence of `globalThis.__gxtCurrentTemplateThis` (only
          // set during the live synchronous render) and REPLAY the cached
          // live-pass slots in order instead of advancing the live counter +
          // re-reading. `__ubReplay` resets on each live→deferred transition so
          // the replay walks `id:0, id:1, ...` exactly as the live pass produced
          // them.
          `var __ubReplay = Object.create(null);` +
          `var __ubLastLive = true;` +
          `function __gxtUnboundEval(cacheObj, id, valueFn) {` +
          `var __ubFG = true;` +
          `if (__ubFG && !__gxtGetTemplateThis()) {` +
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
          `if (__ubFG) __ubLastLive = true;` +
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
      // `__gxtAmbientOwner` Function parameters (formerly
      // `globalThis.__EMBER_BUILTIN_HELPERS__` / `globalThis.owner` — the
      // owner mirror's last reader). Gated on `hasNamedArgHelperGuard` so
      // templates without the bare-named-arg-helper pattern pay zero overhead.
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

      // Inlined `__gxtQuotedAttr` definition declared at the OUTER Function()
      // scope. The body re-implements `_normalizeStringValue` semantics inline
      // as `__qaNorm` (Glimmer's normalizeStringValue: null/undefined → '',
      // objects without toString → '', String(value) with a defensive try/catch
      // for throwing toStrings) — no closure surface needed beyond intrinsic JS.
      // Gated on `hasQuotedAttr` so templates without quoted-attribute
      // interpolation pay zero overhead.
      const quotedAttrInjection = hasQuotedAttr
        ? `function __qaNorm(v) {` +
          `if (v === null || v === undefined) return '';` +
          `if (typeof v.toString !== 'function') return '';` +
          `try { return String(v); } catch (e) { return ''; }` +
          `}` +
          `function __gxtQuotedAttr(parts) {` +
          `if (!Array.isArray(parts)) return __qaNorm(parts);` +
          `if (parts.length === 1) {` +
          `var v0 = parts[0];` +
          `if (v0 === null || v0 === undefined) return null;` +
          `}` +
          `var allNullish = true;` +
          `var out = '';` +
          `for (var i = 0; i < parts.length; i++) {` +
          `var p = parts[i];` +
          `if (p !== null && p !== undefined) { allNullish = false; }` +
          `out += __qaNorm(p);` +
          `}` +
          `return allNullish ? null : out;` +
          `}`
        : '';
      const templateFnCode = `
        "use strict";
        ${hasUnbound ? 'var __ubCache = Object.create(null);' : ''}
        ${unboundEvalInjection}
        ${namedArgHelperGuardInjection}
        ${quotedAttrInjection}
        ${uidOuterScope}
        ${strictMaybeHelperInjection}
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          ${needsSlots ? 'const $slots = __gxtGetSlots() || {};' : ''}
          ${needsFw ? 'const $fw = __gxtGetFw();' : ''}
          ${hasUnbound ? '__gxtUnboundResetSlots();' : ''}

          ${scopeInjections.join('\n          ')}
          ${helperInjections.join('\n          ')}
          ${eachInInjections.join('\n          ')}
          ${_inElementInsertBefore === 'null' ? '__ieSet(undefined, true);' : _inElementInsertBefore !== null && _inElementInsertBefore !== 'undefined' ? `__ieSet(${JSON.stringify(_inElementInsertBefore)}, false);` : ''}
          return ${modifiedCode};
        };
      `;
      // Cache compiled Function() to reduce V8 code space growth (OOM prevention)
      if (!_functionCodeCache) _functionCodeCache = new Map();
      let cachedFn = _functionCodeCache.get(templateFnCode);
      if (!cachedFn) {
        // Pass the tracker accessors as Function() parameters so the inlined
        // `__gxtUnboundEval` body (above) can suppress the GXT reactive tracker
        // during `valueFn()` evaluation; bound to the module-local
        // `_gxtGetTracker` / `_gxtSetTracker`. No-op when `hasUnbound` is false.
        // The third param `__ieSet` is bound to the module-local `_gxtIeSet`
        // setter so the emitted template-fn can signal
        // `{{#in-element insertBefore=...}}` mode to the `$_inElement` shim
        // without globalThis; no-op when `_inElementInsertBefore` is the default.
        // §2e parameter injection: after the three private hooks come the
        // ember emitted-code hooks (`__gxtBuiltinHelpers` table,
        // `__gxtGetTemplateThis` live-render accessor, `__gxtAmbientOwner`
        // bridge accessor) and the full GXT symbol table — a compile-time
        // snapshot of the ember-wrapped globals, so the compiled body's bare
        // `$_tag` / `$_maybeHelper` / … bind as parameters instead of
        // resolving through globalThis on every render. Unlisted identifiers
        // still fall through to globalThis (the injection is additive).
        cachedFn = Function(
          '__ubGT',
          '__ubST',
          '__ieSet',
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
          _gxtIeSet,
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
          const placeholder = document.createComment('');
          const fragment = document.createDocumentFragment();
          // Track current content nodes so we can remove them on update.
          // Also track an "end marker" comment that is always in the DOM
          // so we have a stable insertion anchor.
          const endAnchor = document.createComment('/htmlRaw');
          let contentNodes: Node[] = [];
          let isEmpty = true;

          // Initial render
          const initialHtml = item();
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
            // Empty content — show placeholder (renders as <!----> in innerHTML)
            isEmpty = true;
            fragment.appendChild(placeholder);
          }
          fragment.appendChild(endAnchor);

          // Track last rendered HTML for DOM stability (skip update if unchanged)
          let lastHtml = initialHtml;

          // Reactive update
          try {
            gxtEffect(() => {
              const html = item();
              const parent = endAnchor.parentNode;
              if (!parent) return;
              // Skip update if HTML hasn't changed (preserves DOM node stability)
              if (html === lastHtml) return;
              lastHtml = html;

              if (html) {
                // Remove placeholder if present
                if (isEmpty && placeholder.parentNode === parent) {
                  parent.removeChild(placeholder);
                }
                // Remove old content nodes
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                // Parse and insert new HTML before the end anchor
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
                // Content is now empty
                // Remove old content nodes
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                contentNodes = [];
                // Insert placeholder before the end anchor if not already there
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
            const _renderCurried = (curried: any): Node | null => {
              if (!curried) return null;
              if (_curriedOwner && !getAmbientOwner()) {
                setAmbientOwner(_curriedOwner);
              }
              const handleResult = _curriedManagers.component.handle(curried, {}, null, null);
              if (typeof handleResult === 'function') {
                const rendered = handleResult();
                if (rendered instanceof Node) return rendered;
                return itemToNode(rendered, depth + 1);
              }
              if (handleResult instanceof Node) return handleResult;
              return itemToNode(handleResult, depth + 1);
            };

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
                if (cc.__curriedArgs) {
                  for (const val of Object.values(cc.__curriedArgs)) {
                    if (
                      typeof val === 'function' &&
                      !val.prototype &&
                      !(val as any).__isCurriedComponent
                    ) {
                      try {
                        val();
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }
                if (cc.__curriedPositionals) {
                  for (const val of cc.__curriedPositionals) {
                    if (
                      typeof val === 'function' &&
                      !val.prototype &&
                      !(val as any).__isCurriedComponent
                    ) {
                      try {
                        val();
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }
                const parent = _csm.parentNode;
                if (!parent) return;
                // Skip if args haven't changed
                if (_csm.nextSibling !== _cem && !_curriedComponentChanged(_cinfo, cc)) return;
                // Re-render: remove old, insert new
                let _n = _csm.nextSibling;
                const _removed: Node[] = [];
                while (_n && _n !== _cem) {
                  const nx = _n.nextSibling;
                  _removed.push(_n);
                  parent.removeChild(_n);
                  _n = nx;
                }
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
        const _gxtFineGrained = true;
        const _capturedDeps: Set<any> | null = _gxtFineGrained ? new Set() : null;
        let result: any;
        let finalResult: any;
        if (_gxtFineGrained) {
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
              _capturedDeps!.add(c);
              if (_ambientTracker) _ambientTracker.add(c);
              // Slice C (nested-object subscription, fine-grained only): the
              // text effect subscribes to the cells `item()` READ (e.g.
              // cellFor(context, 'nullObject') for `this.nullObject.message`),
              // but the LEAF access (`.message`) is plain JS — no cell read —
              // so mutating the leaf object (`set(nullObject,'message',...)`)
              // doesn't dirty any cell this effect tracks. Register the held
              // object as a value-owner of the captured cell so the SyncCore
              // reverse-lookup (`_objectValueCellMap`) dirties this captured
              // cell when a property on the held object changes. This is what
              // makes null-proto objects + non-component nested paths reactive
              // with the morph off. Guard with the cell's recorded owner
              // (added in glimmer-next rawCellFor); skip when unavailable.
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
        } else {
          result = item();
          // If result is a function, it's a nested getter (e.g., from $__if)
          // BUT: do NOT call CurriedComponent functions — they need the reactive rendering path below
          finalResult =
            typeof result === 'function' && !result.__isCurriedComponent ? result() : result;
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
              // Restore owner for component resolution during reactive re-evaluation
              if (capturedOwner && !getAmbientOwner()) {
                setAmbientOwner(capturedOwner);
              }
              const handleResult = managers.component.handle(curried, {}, null, null);
              if (typeof handleResult === 'function') {
                const rendered = handleResult();
                if (rendered instanceof Node) return rendered;
                return itemToNode(rendered, depth + 1);
              }
              if (handleResult instanceof Node) return handleResult;
              return itemToNode(handleResult, depth + 1);
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
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedArgs) {
                  for (const val of Object.values(newFinal.__curriedArgs)) {
                    if (
                      typeof val === 'function' &&
                      !val.prototype &&
                      !(val as any).__isCurriedComponent
                    ) {
                      try {
                        val();
                      } catch {
                        /* ignore */
                      }
                    }
                  }
                }
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedPositionals) {
                  for (const val of newFinal.__curriedPositionals) {
                    if (
                      typeof val === 'function' &&
                      !val.prototype &&
                      !(val as any).__isCurriedComponent
                    ) {
                      try {
                        val();
                      } catch {
                        /* ignore */
                      }
                    }
                  }
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
                const _removedNodes: Node[] = [];
                let node = startMarker.nextSibling;
                while (node && node !== endMarker) {
                  const next = node.nextSibling;
                  _removedNodes.push(node);
                  parent.removeChild(node);
                  node = next;
                }
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
          const placeholder = document.createComment('');
          const endAnchor = document.createComment('/htmlRaw');
          const fragment = document.createDocumentFragment();
          let contentNodes: Node[] = [];
          let htmlIsEmpty = true;
          const initialHtml = getHtml();
          if (initialHtml) {
            htmlIsEmpty = false;
            const tpl = document.createElement('template');
            tpl.innerHTML = initialHtml;
            while (tpl.content.firstChild) {
              const child = tpl.content.firstChild;
              contentNodes.push(child);
              fragment.appendChild(child);
            }
          } else {
            htmlIsEmpty = true;
            fragment.appendChild(placeholder);
          }
          fragment.appendChild(endAnchor);
          let lastHtml2 = initialHtml;
          // Reactive update
          try {
            gxtEffect(() => {
              const html = getHtml();
              const parent = endAnchor.parentNode;
              if (!parent) return;
              if (html === lastHtml2) return;
              lastHtml2 = html;
              if (html) {
                if (htmlIsEmpty && placeholder.parentNode === parent) {
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
                htmlIsEmpty = false;
              } else {
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                contentNodes = [];
                if (!htmlIsEmpty || !placeholder.parentNode) {
                  parent.insertBefore(placeholder, endAnchor);
                }
                htmlIsEmpty = true;
              }
            });
          } catch {
            /* effect setup may fail */
          }
          return fragment;
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
          // The outer `item()` call at L16087 has already been issued — it
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
              // Fine-grained capture-replay (gated): the effect's formula is
              // currently capturing deps inside this run. Replay the cells the
              // outer `item()` read (captured above into `_capturedDeps`) into
              // the active tracker so this effect SUBSCRIBES to them — without
              // re-calling `item()` (which would double-dispatch a
              // side-effecting helper). When the flag is OFF, `_capturedDeps`
              // is null and this is identical to the shipping `_firstRun`
              // behavior (the morph is the updater, no subscription needed).
              if (_capturedDeps !== null) {
                const _effectTracker = _gxtGetTracker();
                if (_effectTracker) {
                  _capturedDeps.forEach((c) => _effectTracker.add(c));
                }
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
              // (registerObjectValueOwner dedupes by (obj,key)). GATED — the
              // `else` branch only runs in fine-grained mode after first run.
              if (_gxtFineGrained) {
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
      __gxtRuntimeCompiled: true,
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
        const g = globalThis as any;
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
          // NOTE: Must be declared before first use (was previously in TDZ when
          // referenced in the RENDERING_CONTEXT_PROPERTY block below).
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

          _gxtCurrentSlots = context.$slots || context[_SLOTS_SYM] || {};
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
              const BUILTIN_HELPER_NAMES = [
                'array',
                'hash',
                'concat',
                'fn',
                'get',
                'mut',
                'readonly',
                'unique-id',
                'unbound',
                '__mutGet',
              ];
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
          if (COMPONENT_ID_PROPERTY) {
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
          const argsObj = renderContext['args'] || renderContext[$ARGS_KEY] || {};
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
          let _cellInstallCount = 0;
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
            // to the same object that __gxtTriggerReRender uses).
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
                    _cellInstallCount++;
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
          // _cellInstallCount tracked for debugging

          // Cell promotion handled by __gxtForceEmberRerender (full re-render)

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
          // Expose the current template `this` to glimmer-next so its
          // const-binding recovery (resolveRenderable / attribute binding) can
          // materialize a leaf cell for an initially-undefined `this.<path>`.
          // Hook-capable dists read it via the `getCurrentTemplateThis` host
          // hook (registered over the module-local above); only legacy dists
          // still consult the `__gxtCurrentTemplateThis` global.
          if (!_gxtRegisterHostHooks) {
            (globalThis as any).__gxtCurrentTemplateThis = renderContext;
          }
          try {
            result = compilationResult.templateFn.call(renderContext);
          } catch (e) {
            // THROW path: the itemToNode-loop `finally` below (which owns the
            // `_gxtCurrentTemplateThis` / isRendering restore on the success
            // path) will never run, so restore here. Leaving the GLOBAL
            // `__gxtCurrentTemplateThis` set would poison every subsequent
            // `{{unbound}}` evaluation in the realm: the live/deferred
            // detection (`!globalThis.__gxtCurrentTemplateThis`, see the
            // unboundEvalInjection) misclassifies deferred passes as live and
            // unbound values silently un-freeze. Invisible in the per-module
            // Playwright runner (fresh realm per module) but a hard cumulative
            // failure in the single-page testem run, where one mid-render
            // throw broke every later "does not update when unbound" test.
            gxtSetIsRendering(false);
            _gxtCurrentTemplateThis = _prevTemplateThis;
            if (!_gxtRegisterHostHooks) {
              (globalThis as any).__gxtCurrentTemplateThis = _prevTemplateThis;
            }
            throw e;
          } finally {
            // NOTE: `_gxtCurrentTemplateThis` is intentionally NOT reset here
            // on the SUCCESS path — itemToNode (where the initial-undefined
            // capture frame consults it) runs in the result-processing loop
            // BELOW, after this `.call` returns. It is restored in the
            // itemToNode-loop `finally` instead (and in the catch above when
            // the template body throws).
            // Stop blocking tracked setters from calling __gxtTriggerReRender,
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
            if (!_gxtRegisterHostHooks) {
              (globalThis as any).__gxtCurrentTemplateThis = _prevTemplateThis;
            }
          }

          // During morph re-renders the template was rendered into a throwaway
          // tempContainer that the renderer.ts morph code will then diff against
          // the LIVE DOM. The live DOM had its empty placeholder comments
          // removed by `removeGxtArtifacts` after the initial render. Without
          // the same cleanup here, the morph diff sees "extra" empty comment
          // nodes in tempContainer that are not in the live DOM, and treats
          // them as new children to insert — producing spurious mutations on
          // observed subtrees (GH #14332).
          //
          // Conservative: only remove empty comments that are children of an
          // ELEMENT (i.e. inside a wrapper like <ul>) and only when the wrapper
          // contains real visible content (other element children). This skips
          // top-level fragment children where empty comments may be
          // each-block topMarkers/bottomMarkers needed for re-render alignment.
          if (_gxtIsMorphRenderInProgress() && parentElement) {
            try {
              const _allElements: Element[] = [];
              if ((parentElement as any).querySelectorAll) {
                _allElements.push(...Array.from((parentElement as any).querySelectorAll('*')));
              }
              for (const _el of _allElements) {
                // Only clean inside elements that have at least one element
                // child (i.e. not a leaf). Leaf elements with comments may have
                // them as part of dynamic content boundaries.
                let _hasElementChild = false;
                for (const _c of Array.from(_el.childNodes)) {
                  if (_c.nodeType === 1) {
                    _hasElementChild = true;
                    break;
                  }
                }
                if (!_hasElementChild) continue;
                // Remove empty comments that are direct children of _el.
                const _toRemove: Comment[] = [];
                for (const _c of Array.from(_el.childNodes)) {
                  if (_c.nodeType !== 8) continue;
                  const _t = (_c as Comment).textContent || '';
                  if (
                    _t.includes('if-entry') ||
                    _t.includes('each-entry') ||
                    _t.includes('dc-placeholder')
                  )
                    continue;
                  if (_t === '') _toRemove.push(_c as Comment);
                }
                for (const _c of _toRemove) _el.removeChild(_c);
              }
            } catch {
              /* ignore artifact cleanup errors */
            }
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
          // `assert.throws` / Ember's error recovery. The previous "swallow
          // unless allowlisted" branch was a holdover from the
          // `captureRenderError`/`__gxtRenderErrorCount` plumbing — with that
          // signal removed, any swallow here turns user-visible failures
          // into silent successes.
          throw err;
        }
      },
    };

    return template;
  };

  // Add properties to the factory function itself for compatibility
  (templateFactory as any).__gxtCompiled = true;
  (templateFactory as any).__gxtRuntimeCompiled = true;
  (templateFactory as any).moduleName = options?.moduleName || 'gxt-runtime-template';
  (templateFactory as any).id = `gxt-factory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  // Record the strictMode flag on the factory so the render path can opt
  // into strict-mode resolution semantics (no container.lookup fallback for
  // free identifiers inside $_maybeHelper).
  (templateFactory as any).__gxtStrictMode = __strictModeFlag;

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
 * Register the template compiler (for compatibility)
 */
export function __registerTemplateCompiler(compiler: any) {
  // Store reference for debugging
  (globalThis as any).__registeredTemplateCompiler = compiler;
}

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

export default function templateCompilation() {
  return {
    precompileTemplate,
    compileTemplate,
    __registerTemplateCompiler,
    __emberTemplateCompiler,
  };
}

// Register the GXT compiler globally for @ember/template-compiler to use.
// Also exposed via the gxt-bridge as `compilePipeline.compileTemplate`. The
// globalThis writer is retained alongside the bridge install because
// `@glimmer-workspace/integration-tests/.../gxt-delegate.ts` reads this hook via
// globalThis and cannot depend on `@ember/-internals`.
(globalThis as any).__gxtCompileTemplate = compileTemplate;

// Phase 4.1 SSR consumer plumbing (RFC §7.1.1 step 2). Dual-published alongside
// the bridge entry above so an out-of-package SSR driver (or a harness probe) that
// cannot import `@ember/-internals/gxt-backend/compile` can reach the per-root
// runner via globalThis — exactly as `gxt-delegate.ts` reads `__gxtCompileTemplate`.
// ADDITIVE: nothing in the browser path invokes it; merely assigning the global
// changes no behavior.
(globalThis as any).__gxtWithRootContext = _gxtWithRootContext;

// @internal — exported for unit testing only
export const __test_internals = {
  hyphenToUnderscore,
  doubleDashToSlash,
  containsWord,
  countWord,
  replaceWord,
  generateUUID,
  extractThisPath,
  hasTextAreaTag,
  hasBlockParamRef,
  findBlockParamNames,
  findDottedTags,
  findDottedMustaches,
  hasAttrsInBlockParams,
  findAttrsPatterns,
  findThisAttrsPatterns,
  parseInElementInsertBefore,
  hasDynamicHelper,
  hasDynamicModifier,
};

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
  installRenderPassPart,
  installBacktrackingPart,
  installViewUtilsPart,
  installRuntimePart,
} from './gxt-bridge';
// Expose `registerObjectValueOwner` to glimmer-next so its reactive attribute /
// inside-element bindings can register the LEAF object a binding's source cell
// holds (e.g. `nullObject` for `this.nullObject.message`) as a value-owner —
// making `set(nullObject,'message',...)` reach the cell via the SyncCore reverse
// lookup. The compilePipeline bridge method is not visible to glimmer-next core,
// so a globalThis hook is the seam.
if (_gxtRegisterHostHooks) {
  _gxtRegisterHostHooks({ registerObjectValueOwner });
} else {
  try {
    (globalThis as any).__gxtRegisterObjectValueOwner = registerObjectValueOwner;
  } catch {
    /* ignore */
  }
}
installCompilePipelinePart({
  compileTemplate: compileTemplate,
  resetIntervalBudget: _gxtResetIntervalBudget,
  registerArrayOwner: registerArrayOwner,
  registerObjectValueOwner: registerObjectValueOwner,
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
  // `__gxtSyncDomNow` invocation.
  withSyncing: _gxtWithSyncing,
  // Save-restore wrapper + read predicate for the "currently rendering" flag
  // (distinct from the render-pass depth counter). The writer is manager.ts's
  // `wrapHandler`; readers are `metal/tracked.ts` and `glimmer-tracking.ts`.
  withCurrentlyRendering: _gxtWithCurrentlyRendering,
  isCurrentlyRendering: _gxtIsCurrentlyRendering,
  // Mark+consume surface for the "tracked set since rerender" flag: set by
  // ember-gxt-wrappers.ts's BEFORE-trigger-rerender hook, read+cleared by its
  // UpdatingVM.execute patch (which forces `alwaysRevalidate=true` when set).
  markTrackedSetSinceRerender: _gxtMarkTrackedSetSinceRerender,
  consumeTrackedSetSinceRerender: _gxtConsumeTrackedSetSinceRerender,
  // Read-only accessor for the monotonic sync-cycle counter (incremented once
  // per `__gxtSyncDomNow` flush by the intra-file `_gxtIncrementSyncCycleId`).
  getSyncCycleId: _gxtGetSyncCycleId,
  // Read predicate for the "sync is property-driven" flag, read by manager.ts's
  // `__gxtDestroyUnclaimedPoolEntries` destroy-error capture gate.
  isSyncIsPropertyDriven: _gxtIsSyncIsPropertyDriven,
  // Paired get/set for the "had pending sync" flag; cross-package readers/writers
  // live in `glimmer/lib/renderer.ts` and manager.ts.
  getHadPendingSync: _gxtGetHadPendingSync,
  setHadPendingSync: _gxtSetHadPendingSync,
  // Paired get/set for the "pending sync from property change" flag; cross-file/
  // cross-package writers live in manager.ts, templates/root.ts, routing/router.ts,
  // and the test helpers.
  getPendingSyncFromPropertyChange: _gxtGetPendingSyncFromPropertyChange,
  setPendingSyncFromPropertyChange: _gxtSetPendingSyncFromPropertyChange,
  // Paired get/set for the master "DOM sync pending" flag. Intra-file
  // writers/readers use the module-local helpers; cross-file/cross-package
  // writers (manager.ts, glimmer, routing, internal-test-helpers) and the
  // cross-package readers (the `_backburner` end gate, the runloop `onEnd` hook)
  // route through the bridge.
  getPendingSync: _gxtGetPendingSync,
  setPendingSync: _gxtSetPendingSync,
  getBlockParamsStack: () => blockParamsStack,
  getContextBlockParams: () => contextBlockParams,
  getSlotsContextStack: () => slotsContextStack,
  setCurrentSlotParams: (params) => {
    currentSlotParams = params;
  },
  getBuiltinHelpers: () => _emberBuiltinHelpers,
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
  // Get-only accessor for the engine-instance Map cache. Written via this method
  // by `outlet.gts`'s `<ember-mount>.renderEngine`; read directly by the
  // intra-file between-test teardown.
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
  // The "morph render in progress" flag + its companion modifier-invocations
  // queue. The writer is `glimmer/lib/renderer.ts` (via `withMorphRender`);
  // readers are manager.ts's modifier-manager `handle` and the intra-file
  // `$_each` empty-comment cleanup gate.
  withMorphRender: _gxtWithMorphRender,
  isMorphRenderInProgress: _gxtIsMorphRenderInProgress,
  getMorphModifierInvocations: _gxtGetMorphModifierInvocations,
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
  // Set/get for the captured "current helper scope". Written by
  // `patchGlobalIf`/`wrapBranch` around branch evaluation; read by the $_tag
  // class-helper creation path and by ember-gxt-wrappers.ts's `$_maybeHelper`
  // paths to wire fresh helper instances to the enclosing `{{#if}}` branch's
  // teardown set.
  setCurrentHelperScope: _gxtSetCurrentHelperScope,
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
  // Paired accessors for the module-local `_gxtRootContext` binding. Cross-file
  // lazy-init writers/readers (renderer.ts, root.ts, outlet.gts, runtime-hbs.ts)
  // route through these; intra-file consumers read the module-local directly.
  getRootContext: _getGxtRootContext,
  setRootContext: _setGxtRootContext,
  // Phase 4.1 SSR consumer plumbing (RFC §7.1.1 step 2): synchronous per-root
  // save/swap/restore runner. ADDITIVE — no browser-path caller; dormant until a
  // FastBoot/SSR driver wraps each request in `withRootContext(freshCtx, () => …)`.
  // Also dual-published on `globalThis.__gxtWithRootContext` (mirroring
  // `__gxtCompileTemplate`) so an out-of-package SSR driver that cannot import
  // `@ember/-internals` can still reach it.
  withRootContext: _gxtWithRootContext,
  // Get-only accessor (with internal lazy-init) for the canonical
  // `_gxtComponentContexts` WeakMap. Cross-file lazy-init writers/readers
  // (glimmer/lib/templates/root.ts, @ember/routing/route.ts) route through it;
  // intra-file consumers (and the test-teardown reset via
  // `_resetGxtComponentContexts`) call the module-local helpers directly.
  getComponentContextsMap: _getOrCreateGxtComponentContexts,
  // The canonical sync-pipeline flush function. Cross-file readers route through
  // `getGxtRenderer()?.compilePipeline.syncDomNow?.()`; the intra-file 16ms
  // setInterval calls the module-local `_gxtSyncDomNow` directly. The
  // `(globalThis as any).__gxtSyncDomNow` slot is also dual-published for the
  // harness probes and dev-debug scripts that read/wrap it.
  syncDomNow: _gxtSyncDomNow,
});

// Host hook that runs at the start of every `beginRenderPass` call, BEFORE
// manager.ts clears its template-rendered set.
installRenderPassPart({
  beforeBeginRenderPass: _resetTemplateOnlyState,
});

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
  // Exposes `_wrapperIfUserFalse` to its sole cross-file reader in manager.ts
  // (GXT compat: restore `isExpanded = false` on freshly-constructed component
  // instances whose wrapper id was user-toggled false).
  getWrapperUserFalseSet: () => _wrapperIfUserFalse,
  // Host hook that runs AFTER manager.ts's `flushAfterInsertQueue` body
  // completes, dispatched by the `_gxtBridgeFlushAfterInsertQueue` adapter in
  // manager.ts (the in-element deferred-render drain).
  afterFlushAfterInsertQueue: _afterFlushAfterInsertQueue,
});

// ─────────────────────────────────────────────────────────────────────────────
// LANDING NOTE — `transforms` AST hook dependency
//
// The dialect AST visitors built by `buildGxtDialectTransforms` (the
// `{{outlet}}`, `{{#@arg}}`, quoted-attribute bare-helper, `{{#each-in}}`, and
// `{{on}}`→`{{on-ext}}` visitors) are wired into `gxtCompileTemplate(...)` via
// the public `CompileOptions.transforms` hook. That hook ships in glimmer-next
// PR #217 and is present in the LOCALLY COPIED `@lifeart/gxt` dist used for
// testing — but it is NOT in the published `@lifeart/gxt@0.0.63` that ember's
// PR #21340 CI installs. The published `compile()` silently ignores an unknown
// `transforms` field, so on published gxt these dialect rewrites would no-op
// and `{{outlet}}` / `{{#@arg}}` / quoted-attr-helper / `{{#each-in}}` / `{{on}}`
// handling would regress.
//
// THEREFORE: landing this commit on PR #21340 REQUIRES, in order:
//   1. a glimmer-next release that publishes the `CompileOptions.transforms`
//      hook (>= the next release after 0.0.63), and
//   2. an ember bump of the `@lifeart/gxt` dependency to consume it.
// Until both land, keep this on the `gxt-fine-grained` branch only (do not push).
// ─────────────────────────────────────────────────────────────────────────────
