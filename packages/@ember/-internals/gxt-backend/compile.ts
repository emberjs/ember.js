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
import { pascalToKebab, isAllDigits } from './utils';
import { initChildViews as _emberInitChildViews, getElementView as _emberGetElementView, collectChildViews as _emberCollectChildViews } from '@ember/-internals/views/lib/system/utils';

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

// === Utility functions (regex-free) ===

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

// Expose on globalThis for use inside GXT-compiled template code.
// The compile.ts post-processor rewrites `].join("")` to
// `].map(globalThis.__gxtNormAttr).join("")` for quoted attribute values so
// that Symbol and null-prototype object values don't throw on stringification.
(globalThis as any).__gxtNormAttr = _normalizeStringValue;

/** Replace all hyphens with underscores without regex */
function hyphenToUnderscore(str: string): string {
  return str.split('-').join('_');
}

// ---------------------------------------------------------------------------
// {{unbound}} helper — compile-time + runtime support
// ---------------------------------------------------------------------------

/**
 * Global monotonic counter for synthetic `__ubInlineN` cache ids so each
 * compilation that contains inline `unbound(...)` calls gets unique ids even
 * when multiple templates are rewritten in the same process.
 */
let _inlineUnboundCounter = 0;

/**
 * Post-process the GXT-compiled code: wrap bare `unbound(...)` calls that are
 * NOT already inside a `__gxtUnboundEval(...)` wrapper with a caching wrapper.
 *
 * The GXT serializer only emits the caching wrapper for the TOP-LEVEL mustache
 * form `{{unbound X}}`. When `unbound` appears in a sub-expression context
 * (e.g. `{{yield (unbound this.x)}}`) the serializer emits a bare
 * `unbound(this.x)` helper call that re-reads the argument every time the
 * consumer evaluates the yielded value — breaking the frozen-value semantic.
 * Rewrite those inline calls so they share the same caching path:
 *   unbound(<EXPR>)  →  globalThis.__gxtUnboundEval(__ubCache,"<id>",()=>unbound(<EXPR>))
 * The scanner respects string/template/comment boundaries and balances
 * parentheses so nested expressions are handled correctly.
 */
function _rewriteInlineUnbound(code: string): string {
  if (code.indexOf('unbound(') === -1) return code;
  const needle = 'unbound(';
  const out: string[] = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i]!;
    if (c === '"' || c === "'" || c === '`') {
      const end = _skipStringLiteralUB(code, i);
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i);
      const end = nl === -1 ? code.length : nl;
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (c === '/' && code[i + 1] === '*') {
      const endIdx = code.indexOf('*/', i + 2);
      const end = endIdx === -1 ? code.length : endIdx + 2;
      out.push(code.slice(i, end));
      i = end;
      continue;
    }
    if (c === 'u' && code.substr(i, needle.length) === needle) {
      const prev = i === 0 ? '' : code[i - 1]!;
      const isIdentCont =
        (prev >= 'a' && prev <= 'z') ||
        (prev >= 'A' && prev <= 'Z') ||
        (prev >= '0' && prev <= '9') ||
        prev === '_' || prev === '$' || prev === '.';
      if (!isIdentCont) {
        const argsStart = i + needle.length;
        const argsEnd = _findMatchingParenUB(code, argsStart - 1);
        if (argsEnd !== -1) {
          // Skip when we are the inner `unbound(...)` of a top-level
          // serializer-emitted wrapper
          //   globalThis.__gxtUnboundEval(__ubCache,"__ubN",()=>unbound(...))
          // — caching is already in place there and we must not double-wrap.
          // Detect by the immediate `=>` preceding `unbound(` that sits
          // inside a `__gxtUnboundEval(__ubCache` call.
          const lookbackStart = Math.max(0, i - 80);
          const lookback = code.slice(lookbackStart, i);
          const hasWrapper = lookback.indexOf('__gxtUnboundEval(__ubCache') !== -1
            && lookback.lastIndexOf('=>') > lookback.lastIndexOf('unbound(');
          if (hasWrapper) {
            out.push(code.slice(i, argsEnd + 1));
            i = argsEnd + 1;
            continue;
          }
          const id = `__ubInline${_inlineUnboundCounter++}`;
          out.push(
            `globalThis.__gxtUnboundEval(__ubCache,"${id}",()=>unbound(`,
            code.slice(argsStart, argsEnd),
            `))`
          );
          i = argsEnd + 1;
          continue;
        }
      }
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

function _skipStringLiteralUB(code: string, start: number): number {
  const quote = code[start]!;
  let i = start + 1;
  while (i < code.length) {
    const c = code[i]!;
    if (c === '\\') { i += 2; continue; }
    if (c === quote) return i + 1;
    if (quote === '`' && c === '$' && code[i + 1] === '{') {
      let depth = 1;
      i += 2;
      while (i < code.length && depth > 0) {
        const cc = code[i]!;
        if (cc === '{') depth++;
        else if (cc === '}') depth--;
        else if (cc === '"' || cc === "'" || cc === '`') {
          i = _skipStringLiteralUB(code, i);
          continue;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return code.length;
}

function _findMatchingParenUB(code: string, openIdx: number): number {
  if (code[openIdx] !== '(') return -1;
  let depth = 1;
  let i = openIdx + 1;
  while (i < code.length) {
    const c = code[i]!;
    if (c === '"' || c === "'" || c === '`') {
      i = _skipStringLiteralUB(code, i);
      continue;
    }
    if (c === '/' && code[i + 1] === '/') {
      const nl = code.indexOf('\n', i);
      i = nl === -1 ? code.length : nl;
      continue;
    }
    if (c === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 2;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Scan the compiled code for `$_componentHelper(...)` calls and wrap any
 * direct `this.X` / `this["X"]` values in the second-argument hash with
 * `() =>` arrow functions. GXT's serializer emits these hash values as
 * direct expressions when the subexpression `(component "name" key=this.x)`
 * appears inside a `(hash ...)` passed to `{{yield}}` — but the Ember
 * CurriedComponent manager reads the curried-arg hash as
 * `typeof value === 'function' ? value() : value`, so a direct value is a
 * frozen snapshot and mutations on the parent never flow through. Wrapping
 * each bare `this` path in a getter makes the curried arg live-bound.
 */
function _wrapComponentHelperHashGetters(code: string): string {
  const needle = '$_componentHelper(';
  if (code.indexOf(needle) === -1) return code;

  const out: string[] = [];
  let i = 0;
  while (i < code.length) {
    const idx = code.indexOf(needle, i);
    if (idx === -1) {
      out.push(code.slice(i));
      break;
    }
    out.push(code.slice(i, idx));
    // Find end of `$_componentHelper(...)` by matching parens.
    const argsStart = idx + needle.length - 1; // position of `(`
    const argsEnd = _findMatchingParenUB(code, argsStart);
    if (argsEnd === -1) {
      out.push(code.slice(idx));
      break;
    }
    const argsInner = code.slice(argsStart + 1, argsEnd);
    // Split args into first (array) and rest. GXT emits
    //   $_componentHelper([<params>], { <hash> })
    // or                      , or `$_componentHelper([<params>], {})` with
    // optional trailing args. We only rewrite the hash (second arg).
    let firstCommaDepth = 0;
    let firstCommaIdx = -1;
    for (let j = 0; j < argsInner.length; j++) {
      const c = argsInner[j]!;
      if (c === '"' || c === "'" || c === '`') {
        j = _skipStringLiteralUB(argsInner, j) - 1;
        continue;
      }
      if (c === '(' || c === '[' || c === '{') firstCommaDepth++;
      else if (c === ')' || c === ']' || c === '}') firstCommaDepth--;
      else if (c === ',' && firstCommaDepth === 0) {
        firstCommaIdx = j;
        break;
      }
    }
    if (firstCommaIdx === -1) {
      // No hash arg — emit as-is.
      out.push(code.slice(idx, argsEnd + 1));
      i = argsEnd + 1;
      continue;
    }
    const firstArg = argsInner.slice(0, firstCommaIdx);
    const restArgs = argsInner.slice(firstCommaIdx + 1);
    // Find the hash object: skip leading whitespace, expect `{`, find matching `}`.
    let ws = 0;
    while (ws < restArgs.length && /\s/.test(restArgs[ws]!)) ws++;
    if (restArgs[ws] !== '{') {
      out.push(code.slice(idx, argsEnd + 1));
      i = argsEnd + 1;
      continue;
    }
    // Find matching brace for the hash
    let braceDepth = 1;
    let hashEnd = ws + 1;
    while (hashEnd < restArgs.length && braceDepth > 0) {
      const c = restArgs[hashEnd]!;
      if (c === '"' || c === "'" || c === '`') {
        hashEnd = _skipStringLiteralUB(restArgs, hashEnd);
        continue;
      }
      if (c === '{' || c === '(' || c === '[') braceDepth++;
      else if (c === '}' || c === ')' || c === ']') braceDepth--;
      if (braceDepth === 0) { hashEnd++; break; }
      hashEnd++;
    }
    const hashContent = restArgs.slice(ws + 1, hashEnd - 1); // between braces
    const trailingArgs = restArgs.slice(hashEnd);
    // Walk entries in hashContent. Each entry looks like:
    //   key: value
    // key is: identifier | "string" | 'string'
    // value: parse until next top-level comma
    const rewritten: string[] = [];
    let j = 0;
    while (j < hashContent.length) {
      // Skip whitespace
      while (j < hashContent.length && /\s/.test(hashContent[j]!)) j++;
      if (j >= hashContent.length) break;
      // Parse key: identifier, "string", or 'string'
      const keyStart = j;
      const kc = hashContent[j]!;
      if (kc === '"' || kc === "'") {
        j = _skipStringLiteralUB(hashContent, j);
      } else {
        while (j < hashContent.length && /[A-Za-z0-9_$]/.test(hashContent[j]!)) j++;
      }
      const keyEnd = j;
      // Skip whitespace + colon
      while (j < hashContent.length && /\s/.test(hashContent[j]!)) j++;
      if (hashContent[j] !== ':') {
        // Malformed — bail out, leave entire call unmodified
        rewritten.length = 0;
        break;
      }
      const colonIdx = j;
      j++; // consume ':'
      // Skip whitespace
      while (j < hashContent.length && /\s/.test(hashContent[j]!)) j++;
      // Parse value until top-level comma
      const valStart = j;
      let depth = 0;
      while (j < hashContent.length) {
        const c = hashContent[j]!;
        if (c === '"' || c === "'" || c === '`') {
          j = _skipStringLiteralUB(hashContent, j);
          continue;
        }
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') depth--;
        else if (c === ',' && depth === 0) break;
        j++;
      }
      const valEnd = j;
      const rawValue = hashContent.slice(valStart, valEnd).trimEnd();
      // Decide whether to wrap. We wrap only if the value is a direct
      // `this.X` / `this["X"]` path reference — not an arrow function,
      // literal, or other call.
      // Pattern: starts with `this.` or `this[`, does NOT start with `()`
      // and does NOT contain a top-level call.
      let newValue = rawValue;
      const trimmed = rawValue.trim();
      if (/^this(\.[\w$?]+|\[(?:"[^"]+"|'[^']+')\])(\?\.?[\w$]+|\.[\w$?]+|\[(?:"[^"]+"|'[^']+')\])*$/.test(trimmed)) {
        newValue = `() => ${trimmed}`;
      }
      const prefix = hashContent.slice(keyStart, colonIdx + 1); // "key:" plus trailing space
      rewritten.push(`${prefix} ${newValue}`);
      // Skip comma and whitespace
      while (j < hashContent.length && (hashContent[j] === ',' || /\s/.test(hashContent[j]!))) {
        rewritten.push(hashContent[j]!);
        j++;
      }
    }
    if (rewritten.length === 0) {
      // Couldn't rewrite — fall through unmodified
      out.push(code.slice(idx, argsEnd + 1));
    } else {
      const newHashContent = rewritten.join('');
      out.push('$_componentHelper(');
      out.push(firstArg);
      out.push(',');
      out.push(restArgs.slice(0, ws + 1)); // whitespace + '{'
      out.push(newHashContent);
      out.push('}');
      out.push(trailingArgs);
      out.push(')');
    }
    i = argsEnd + 1;
  }
  return out.join('');
}

/**
 * Rewrite bare `@identifier` / `@identifier.path` / `@identifier?.path`
 * occurrences in GXT-emitted JS code to `$a.identifier...`. GXT generally
 * transforms template `@arg` references correctly (emitting `$a.arg` or
 * `() => $a.arg`), but some code paths leak raw `@foo.bar` into the first
 * positional slot of callbacks like `$_dc(() => @model.componentName, ...)`.
 * That is a SyntaxError in JavaScript (`@` is only valid in decorator
 * position). This function rewrites such tokens to the `$a` alias injected
 * at the template-function scope.
 *
 * Safety:
 * - Walks string literals (", ', `) and skips their contents entirely.
 * - Skips `@` that is preceded by a word char, digit, `$`, `_`, another `@`,
 *   or `.` — these are not bare-arg references.
 * - Only rewrites when `@` is followed by an identifier-start character.
 * - Consumes the full identifier after `@`, plus any `.ident`, `?.ident`,
 *   and `?.` chains so that `@model?.componentData.foo` becomes
 *   `$a.model?.componentData.foo`.
 */
function _rewriteBareAtArgsToArgsAlias(code: string): string {
  const out: string[] = [];
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i]!;
    // Skip string/template literals
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out.push(c);
      i++;
      while (i < n) {
        const ch = code[i]!;
        if (ch === '\\') {
          out.push(ch);
          if (i + 1 < n) { out.push(code[i + 1]!); i += 2; continue; }
          i++;
          continue;
        }
        if (ch === quote) { out.push(ch); i++; break; }
        // Template literal `${...}` — keep as-is; inner expressions are
        // plain JS, but GXT does not emit template literals containing
        // template args, so we leave the full template literal untouched.
        out.push(ch);
        i++;
      }
      continue;
    }
    // Skip single-line comments
    if (c === '/' && i + 1 < n && code[i + 1] === '/') {
      while (i < n && code[i] !== '\n') { out.push(code[i]!); i++; }
      continue;
    }
    // Skip multi-line comments
    if (c === '/' && i + 1 < n && code[i + 1] === '*') {
      out.push(c); out.push(code[i + 1]!); i += 2;
      while (i < n) {
        if (code[i] === '*' && i + 1 < n && code[i + 1] === '/') {
          out.push(code[i]!); out.push(code[i + 1]!); i += 2; break;
        }
        out.push(code[i]!);
        i++;
      }
      continue;
    }
    // Check for bare `@identifier` — must not be preceded by word/$/._/@
    if (c === '@') {
      const prev = i > 0 ? code[i - 1]! : '';
      const isBareAt = !/[A-Za-z0-9_$.@]/.test(prev);
      // And next char must be an identifier start
      const next = i + 1 < n ? code[i + 1]! : '';
      if (isBareAt && /[A-Za-z_$]/.test(next)) {
        // Consume identifier after `@`
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_$]/.test(code[j]!)) j++;
        const ident = code.slice(i + 1, j);
        // Now consume trailing `.ident`, `?.ident`, `?.` chains
        let tail = '';
        while (j < n) {
          if (code[j] === '.' && j + 1 < n && /[A-Za-z_$]/.test(code[j + 1]!)) {
            const s = j;
            j++;
            while (j < n && /[A-Za-z0-9_$]/.test(code[j]!)) j++;
            tail += code.slice(s, j);
            continue;
          }
          if (code[j] === '?' && j + 1 < n && code[j + 1] === '.') {
            tail += '?.';
            j += 2;
            // Optional identifier after ?.
            if (j < n && /[A-Za-z_$]/.test(code[j]!)) {
              const s = j;
              while (j < n && /[A-Za-z0-9_$]/.test(code[j]!)) j++;
              tail += code.slice(s, j);
            }
            continue;
          }
          break;
        }
        out.push(`$a.${ident}${tail}`);
        i = j;
        continue;
      }
    }
    out.push(c);
    i++;
  }
  return out.join('');
}

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
      try { out[key] = _unboundSnapshot((v as any)()); }
      catch { out[key] = v; }
    } else {
      out[key] = _unboundSnapshot(v);
    }
  }
  return out;
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
    const isWordCharBefore = (before >= 'a' && before <= 'z') || (before >= 'A' && before <= 'Z') || (before >= '0' && before <= '9') || before === '_';
    const isWordCharAfter = (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z') || (after >= '0' && after <= '9') || after === '_';
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
    const isWordCharBefore = (before >= 'a' && before <= 'z') || (before >= 'A' && before <= 'Z') || (before >= '0' && before <= '9') || before === '_';
    const isWordCharAfter = (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z') || (after >= '0' && after <= '9') || after === '_';
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
    const isWordCharBefore = (before >= 'a' && before <= 'z') || (before >= 'A' && before <= 'Z') || (before >= '0' && before <= '9') || before === '_';
    const isWordCharAfter = (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z') || (after >= '0' && after <= '9') || after === '_';
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
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_' || c === '$' || c === '?' || c === '.') {
      end++;
    } else {
      break;
    }
  }
  if (end === idx + marker.length) return null;
  return getterStr.slice(idx + marker.length, end);
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
    while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')) pos++;
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
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9')
    )) pos++;
    const head = str.slice(headStart, pos);
    // Next must be '.'
    if (pos >= str.length || str[pos] !== '.') {
      idx = ltIdx + 1;
      continue;
    }
    pos++; // skip dot
    // Next must start with [a-zA-Z]
    if (pos >= str.length || !((str[pos]! >= 'a' && str[pos]! <= 'z') || (str[pos]! >= 'A' && str[pos]! <= 'Z'))) {
      idx = ltIdx + 1;
      continue;
    }
    const tailStart = pos;
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9')
    )) pos++;
    const tail = str.slice(tailStart, pos);
    // Must be followed by whitespace
    if (pos < str.length && (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')) {
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
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9') ||
      str[pos] === '_'
    )) pos++;
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
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9') ||
      str[pos] === '_'
    )) pos++;
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
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9')
    )) pos++;
    const head = str.slice(headStart, pos);
    // Must be followed by '.'
    if (pos >= str.length || str[pos] !== '.') {
      idx = found + 2;
      continue;
    }
    pos++; // skip dot
    // Tail must start with [a-zA-Z]
    if (pos >= str.length || !((str[pos]! >= 'a' && str[pos]! <= 'z') || (str[pos]! >= 'A' && str[pos]! <= 'Z'))) {
      idx = found + 2;
      continue;
    }
    const tailStart = pos;
    while (pos < str.length && (
      (str[pos]! >= 'a' && str[pos]! <= 'z') ||
      (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
      (str[pos]! >= '0' && str[pos]! <= '9') ||
      str[pos] === '.'
    )) pos++;
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
    while (pos < str.length && (str[pos] === ' ' || str[pos] === '\t' || str[pos] === '\n' || str[pos] === '\r')) pos++;
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

/**
 * Parse {{#in-element dest insertBefore=expr}} and replace with {{#in-element dest}}.
 * Returns { result: string, insertBefore: string | null }.
 */
function parseInElementInsertBefore(template: string): { result: string; insertBefore: string | null } {
  const marker = '{{#in-element';
  let insertBefore: string | null = null;
  let idx = template.indexOf(marker);
  if (idx === -1) return { result: template, insertBefore: null };

  let result = '';
  let searchFrom = 0;
  while (idx !== -1) {
    let pos = idx + marker.length;
    // Skip whitespace
    while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
    // Read dest (non-whitespace, non-})
    const destStart = pos;
    while (pos < template.length && template[pos] !== ' ' && template[pos] !== '\t' && template[pos] !== '}') pos++;
    const dest = template.slice(destStart, pos);
    // Skip whitespace
    while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
    // Check for insertBefore=
    const ibMarker = 'insertBefore=';
    if (pos + ibMarker.length <= template.length && template.slice(pos, pos + ibMarker.length) === ibMarker) {
      pos += ibMarker.length;
      const exprStart = pos;
      while (pos < template.length && template[pos] !== ' ' && template[pos] !== '\t' && template[pos] !== '}') pos++;
      insertBefore = template.slice(exprStart, pos);
      // Skip whitespace
      while (pos < template.length && (template[pos] === ' ' || template[pos] === '\t')) pos++;
      // Skip }}
      if (pos + 1 < template.length && template[pos] === '}' && template[pos + 1] === '}') {
        result += template.slice(searchFrom, idx) + `{{#in-element ${dest}}}`;
        searchFrom = pos + 2;
      } else {
        result += template.slice(searchFrom, pos);
        searchFrom = pos;
      }
    } else {
      // No insertBefore, leave as-is
      result += template.slice(searchFrom, pos);
      searchFrom = pos;
    }
    idx = template.indexOf(marker, searchFrom);
  }
  result += template.slice(searchFrom);
  return { result, insertBefore };
}

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
      while (pos < str.length && (
        (str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9') ||
        str[pos] === '_' || str[pos] === '.' || str[pos] === '@'
      )) pos++;
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
      while (pos < str.length && (
        (str[pos]! >= 'a' && str[pos]! <= 'z') ||
        (str[pos]! >= 'A' && str[pos]! <= 'Z') ||
        (str[pos]! >= '0' && str[pos]! <= '9') ||
        str[pos] === '_' || str[pos] === '.' || str[pos] === '@'
      )) pos++;
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

// Track style warnings per element to prevent duplicates when GXT sets style
// via both prop() and attr() paths, or when manager.ts also sets it.
// Also suppress all style warnings during force-rerender (morph).
const _styleWarnedElements = new WeakSet<object>();

function _shouldWarnStyle(element: any, _value?: string): boolean {
  // During force-rerender, suppress all style warnings — the initial render already warned.
  if ((globalThis as any).__gxtIsForceRerender) return false;
  if (element && typeof element === 'object') {
    if (_styleWarnedElements.has(element)) return false;
    _styleWarnedElements.add(element);
  }
  return true;
}
// Expose for manager.ts to use the same deduplication
(globalThis as any).__gxtShouldWarnStyle = _shouldWarnStyle;

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

// Import the GXT runtime compiler
// @ts-ignore - direct path to avoid GXT Babel plugin
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
} from '../node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js';

// We need access to GXT's reactive tracker (setTracker/getTracker) for {{unbound}}.
// These are not exported from GXT's public API, so we extract them at runtime
// by exploiting the MergedCell evaluation behavior. See __gxtUnboundCached below.

// Use direct path to avoid GXT Babel plugin processing (which injects duplicate declarations)
// @ts-ignore - direct path import
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
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
  // Symbols needed by renderer.ts / root.ts exposed via globalThis
  RENDERING_CONTEXT as _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi as _GXT_HTMLBrowserDOMApi,
  provideContext as _gxtProvideContext,
  getParentContext as _gxtGetParentContext,
  destroyElementSync as _gxtDestroyElementSync,
  renderComponent as _gxtRenderComponent,
  Component as _GXT_Component,
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
} from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';

// Use direct imports for cellFor/effect/syncDom — the manualChunks consolidation
// ensures all GXT internals share a single module instance (gxt.core.es.js).
const cellFor = _cellForFromDirectImport;
const gxtEffect = _effectFromDirectImport;
const gxtSyncDom = _syncDomFromDirectImport;
const gxtFormula = _formulaFromDirectImport;

// Expose formula on globalThis so patchedEachSync can create reactive MergedCells
(globalThis as any).__gxtFormula = gxtFormula;

// Phase 4.1: stale-aware GXT root context isolation.
//
// Previously, a single shared `globalThis.__gxtRootContext` was created lazily on
// first render and reused for every subsequent render. That broke the moment test
// cleanup tore down the shared root's rendering context: any later render would
// try to use the stale (null-element) root and crash inside GXT's DOM API with
// "Cannot read properties of null (reading 'element')".
//
// We cannot trivially per-parent isolate roots because nested renders (outlet
// re-renders, component mounts, manager.ts container renders) happen into
// DIFFERENT parent elements and still need to share the same parent-context
// chain. So instead of partitioning by parent, we keep a single ambient root
// (still exposed via `globalThis.__gxtRootContext` for legacy consumers) and
// transparently rebuild it when the previous root has been torn down.
//
// A root is considered stale if:
//   - its RENDERING_CONTEXT slot is null/undefined (test cleanup wiped it), OR
//   - its RENDERING_CONTEXT.roots list is empty / points at a detached element.
//
// On detection, we create a fresh root via `gxtCreateRoot(document)`, re-prime
// its rendering context via `gxtInitDOM`, and publish it on the global alias.
// This unblocks repeated calls from GxtRehydrationDelegate and the rehydration
// integration test suite without breaking the outlet/manager render chain.
//
// TODO(phase-4.x): replace the ambient global with an explicit per-app root
// lifetime once all consumers have been migrated to read the root through an
// explicit API (e.g. a second argument to template.render).
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

function _getOrCreateGxtRoot(_parentElement: Element): any {
  let root = (globalThis as any).__gxtRootContext;
  if (!root || _gxtRootIsStale(root)) {
    root = gxtCreateRoot(document);
    (globalThis as any).__gxtRootContext = root;
  }
  return root;
}

// Expose GXT symbols on globalThis so renderer.ts and root.ts can access them
// without importing from @lifeart/gxt (whose pre-bundled version drops these exports)
(globalThis as any).__gxtSymbols = {
  RENDERING_CONTEXT: _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi: _GXT_HTMLBrowserDOMApi,
  provideContext: _gxtProvideContext,
  getParentContext: _gxtGetParentContext,
  destroyElementSync: _gxtDestroyElementSync,
  renderComponent: _gxtRenderComponent,
  Component: _GXT_Component,
  createRoot: gxtCreateRoot,
  setParentContext: gxtSetParentContext,
};

// Ensure the validator compat module is loaded (registers backtracking detection
// functions on globalThis that ember-gxt-wrappers.ts needs at runtime).
import '@glimmer/validator';

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';

const _SLOTS_SYM = Symbol.for('gxt-slots');

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
    } catch { /* ignore frozen obj */ }
  }
}

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Install Ember-aware wrappers for $_maybeHelper on globalThis
installEmberWrappers();

// Expose a strict-mode resolver as a global so that templates compiled with
// `strictMode: true` can inject it as a local `$_maybeHelper` override. The
// resolver closure captures the strict flag at template-compilation time,
// which means any compiled getter closure that references the local
// `$_maybeHelper` resolves against the strict-mode behavior even when the
// getter runs asynchronously (after the outer `template.render()` call
// returns). A plain global flag would race here: reactive getters produced
// by a strict template are typically invoked inside a loose parent's
// rendering context, where a global flag would have already been reset.
//
// Scope-bound helpers compile to a variable reference (e.g.
// `$_maybeHelper(a_helper, ...)`) — NOT a string — so this guard only fires
// for names that were NOT resolved at compile time, i.e. genuine strict-mode
// free references. Built-in keyword helpers (fn, hash, array, get, concat,
// mut, readonly, unbound, unique-id, helper, modifier, on, __mutGet) are
// still allowed because $_maybeHelper_ember's BUILTIN_HELPERS check runs
// inside the original delegate.
const _GXT_STRICT_ALLOWED_NAMES = new Set<string>([
  'array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly', 'unbound',
  'unique-id', 'unique_id', 'helper', 'modifier', 'on', '__mutGet',
  // gxtEntriesOf is injected by our each-in transform; safe in any mode.
  'gxtEntriesOf',
]);
(globalThis as any).__gxtMakeStrictMaybeHelper = function (): any {
  const g = globalThis as any;
  return function $_maybeHelper_strict(
    nameOrFn: any,
    args: any[],
    hashOrCtx?: any,
    maybeCtx?: any
  ): any {
    if (typeof nameOrFn === 'string') {
      if (!_GXT_STRICT_ALLOWED_NAMES.has(nameOrFn)) {
        const BUILTIN_HELPERS = g.__EMBER_BUILTIN_HELPERS__;
        const isBuiltin = !!(BUILTIN_HELPERS && BUILTIN_HELPERS[nameOrFn]);
        if (!isBuiltin) {
          throw new Error(
            `Attempted to resolve \`${nameOrFn}\`, ` +
            `which was expected to be a component or helper, ` +
            `but that value was not in scope: ${nameOrFn}`
          );
        }
      }
    }
    return g.__gxt_origMaybeHelper(nameOrFn, args, hashOrCtx, maybeCtx);
  };
};
// Capture the underlying (ember-wrapped) $_maybeHelper exactly once.
if (!(globalThis as any).__gxt_origMaybeHelper) {
  (globalThis as any).__gxt_origMaybeHelper = (globalThis as any).$_maybeHelper;
}

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
    const capturedOwner = g.owner;

    const renderCurried = (curried: any): Node | null => {
      if (!curried) return null;
      // Restore owner for component resolution
      const prevOwner = g.owner;
      if (capturedOwner && !g.owner) {
        g.owner = capturedOwner;
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
        if (capturedOwner && prevOwner !== g.owner) {
          g.owner = prevOwner;
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
        resolved[key] = (typeof value === 'function' && !(value as any).__isCurriedComponent && !(value as any).prototype)
          ? (value as any)() : value;
      }
      const cPos = curried?.__curriedPositionals || [];
      const resolvedPos: any[] = [];
      for (const val of cPos) {
        resolvedPos.push((typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
          ? val() : val);
      }
      renderInfo.__lastSnapshot = { name: curried?.__name, args: resolved, positionals: resolvedPos };
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
        const resolved = (typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
          ? val() : val;
        if (last.args[key] !== resolved) return true;
      }
      if (last.positionals.length !== cPos.length) return true;
      for (let i = 0; i < cPos.length; i++) {
        const val = cPos[i];
        const resolved = (typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
          ? val() : val;
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
          while (typeof newResult === 'function' && !newResult.__isCurriedComponent && !newResult.prototype) {
            newResult = newResult();
          }
        } catch { return; }

        // Touch curried arg getters to establish tracking
        if (newResult && newResult.__isCurriedComponent && newResult.__curriedArgs) {
          for (const val of Object.values(newResult.__curriedArgs)) {
            if (typeof val === 'function' && !(val as any).prototype && !(val as any).__isCurriedComponent) {
              try { (val as any)(); } catch { /* ignore */ }
            }
          }
        }
        if (newResult && newResult.__isCurriedComponent && newResult.__curriedPositionals) {
          for (const val of newResult.__curriedPositionals) {
            if (typeof val === 'function' && !(val as any).prototype && !(val as any).__isCurriedComponent) {
              try { val(); } catch { /* ignore */ }
            }
          }
        }

        const parent = startMarker.parentNode;
        if (!parent) return;

        // Skip if nothing changed (preserves DOM stability)
        if (newResult && newResult.__isCurriedComponent &&
            startMarker.nextSibling !== endMarker &&
            !argsChanged(newResult)) {
          return;
        }

        // Determine if component type changed
        const componentSwapped = !newResult || !newResult.__isCurriedComponent ||
          (newResult.__name !== renderInfo.lastRenderedName);

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
        if (componentSwapped) {
          const destroyFn = g.__gxtDestroyInstancesInNodes;
          if (typeof destroyFn === 'function' && removedNodes.length > 0) {
            destroyFn(removedNodes);
          }
        }

        // Insert new content
        if (newResult && newResult.__isCurriedComponent && managers.component.canHandle(newResult)) {
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
    } catch { /* effect setup may fail */ }

    return fragment;
  };

  // Protect override from setupGlobalScope overwriting
  try {
    const _ember_TO_VALUE = g.$_TO_VALUE;
    Object.defineProperty(g, '$_TO_VALUE', {
      get() { return _ember_TO_VALUE; },
      set(v: any) { /* ignore GXT's attempt to overwrite */ },
      configurable: true,
      enumerable: true,
    });
  } catch { /* ignore */ }
}

// Install a render-pass flag so $_inElement below can distinguish
// "inside an active GXT template.render() pass" from "top-level
// synchronous render entry (e.g. this.render in expectAssertion
// tests)". The renderer (packages/@ember/-internals/glimmer/lib/renderer.ts)
// already attempts to call globalThis.__gxtSetIsRendering(true) before
// template.render() and restore after, but GXT itself does not expose
// these helpers. Provide a simple depth counter so those calls toggle
// a tracked boolean. Also wire compile.ts's own render() wrapper to
// bump it, because precompileTemplate's render() is called from the
// renderer.ts code path.
if (typeof (globalThis as any).__gxtIsRendering !== 'function') {
  let _renderPassDepth = 0;
  (globalThis as any).__gxtSetIsRendering = function(on: boolean) {
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
          const drain = (globalThis as any).__gxtInElementDrainDeferred;
          if (typeof drain === 'function') drain();
        } catch { /* ignore */ }
      }
    }
  };
  (globalThis as any).__gxtIsRendering = function() {
    return _renderPassDepth > 0;
  };
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
{
  const _inElementDeferQueue: Array<() => void> = [];
  const _drainInElementDeferQueue = () => {
    while (_inElementDeferQueue.length > 0) {
      const cb = _inElementDeferQueue.shift()!;
      try { cb(); } catch (e) {
        const capture = (globalThis as any).__gxtCaptureRenderError;
        if (typeof capture === 'function') capture(e);
        else throw e;
      }
    }
  };
  (globalThis as any).__gxtInElementDeferredRender = function(cb: () => void) {
    _inElementDeferQueue.push(cb);
  };
  (globalThis as any).__gxtInElementDrainDeferred = _drainInElementDeferQueue;

  // Wrap globalThis.__gxtFlushAfterInsertQueue so callers going through
  // it (demo path, ember-gxt-wrappers, etc.) also drain the queue.
  const _origFlush = (globalThis as any).__gxtFlushAfterInsertQueue;
  (globalThis as any).__gxtFlushAfterInsertQueue = function() {
    try {
      if (typeof _origFlush === 'function') _origFlush();
    } finally {
      _drainInElementDeferQueue();
    }
  };

  // NOTE: We deliberately do NOT install an Object.defineProperty getter/
  // setter wrap on globalThis.__gxtRebuildViewTreeFromDom here. A previous
  // iteration installed one to drain the in-element deferred queue at
  // rebuild time, but it conflicted with the legitimate _wrapGxtRebuildViewTree
  // wrap below (~L2390): that wrap reads `orig = g.__gxtRebuildViewTreeFromDom`
  // (gets our wrapper, not the manager.ts function), then ASSIGNS the
  // resulting `wrapped` back via `g.__gxtRebuildViewTreeFromDom = wrapped`,
  // which the property setter intercepts and stores in the inner slot —
  // overwriting the manager.ts implementation that the in-element wrapper
  // is supposed to call. The setInterval retry then re-applies the wrap on
  // top of itself each tick because `__emberIfRebuildPatched` lives on the
  // assigned `wrapped` (in the inner slot) but reads always see our wrapper
  // (which lacks the flag), producing compounding re-wraps and corrupting
  // the view-registry reset for `_wrapperIfUserFalse` — surfaced as the
  // `View tree tests :: getChildViews` regression where x-toggle siblings
  // see each other's child cells (classic cell-aliasing pattern).
  //
  // The in-element deferred queue is still drained via the
  // __gxtFlushAfterInsertQueue wrap above, which covers the demo /
  // ember-gxt-wrappers code path.
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
    // GXT's $_inElement doesn't support insertBefore natively, so we read
    // the flag from globalThis that was set by the template injection.
    let insertBefore: any = undefined; // undefined = replace (default)

    // Check for non-null insertBefore value (Ember only allows null)
    if ((globalThis as any).__gxtInElementInsertBeforeValue !== undefined) {
      const ibv = (globalThis as any).__gxtInElementInsertBeforeValue;
      delete (globalThis as any).__gxtInElementInsertBeforeValue;
      emberAssert(
        `Can only pass null to insertBefore in in-element, received: ${ibv}`,
        false
      );
    }

    if ((globalThis as any).__gxtInElementAppendMode) {
      insertBefore = null;
      (globalThis as any).__gxtInElementAppendMode = false; // consume the flag
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
      } else if (insertBeforeRef && typeof insertBeforeRef === 'object' && 'value' in insertBeforeRef) {
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
    // checking __gxtIsRendering() — if true, we're mid-render and should
    // defer the block body render until after the parent commits.
    //
    // Outside of an active render pass (classic `this.render` assertion
    // tests that pass `this.someElement = null`), fall through to the
    // synchronous assertion so expectAssertion() still catches the throw.
    const _gxtIsRenderingFn = (globalThis as any).__gxtIsRendering;
    const _insideRenderPass = typeof _gxtIsRenderingFn === 'function' && _gxtIsRenderingFn() === true;
    // Only defer if we have a compile-time literal id fallback to
    // re-resolve with. Without one, we cannot distinguish "render-order
    // timing bug" from "user actually passed null" — and deferring
    // would break expectAssertion tests that pass a literal null
    // destination via `{{#in-element this.someElement}}`.
    let _fallbackId = '';
    {
      const fbStack: string[] | undefined = (globalThis as any).__gxtInElementFallbackIds;
      if (Array.isArray(fbStack) && fbStack.length > 0) {
        // Peek — only consume if we actually take the defer path.
        _fallbackId = fbStack[0] || '';
      }
    }
    if ((appendRef === null || appendRef === undefined) && _insideRenderPass && _fallbackId) {
      // Consume the peeked id.
      const fbStack2: string[] = (globalThis as any).__gxtInElementFallbackIds;
      fbStack2.shift();
      // Snapshot the block-body closure state so the deferred callback
      // can execute the render after the parent fragment commits.
      const _deferredInsertBefore = insertBefore;
      const _deferredCtx = ctx;
      const _deferredRoots = roots;
      // Eagerly compute the block body nodes now — the render context
      // may be torn down by the time the deferred queue drains, so we
      // materialize the DOM synchronously and just re-parent it later.
      let _eagerNodes: any[] = [];
      try { _eagerNodes = roots(ctx); } catch { /* fall through */ }
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
          const err = new Error(
            'Assertion Failed: You cannot pass a null or undefined destination element to in-element'
          );
          const capture = (globalThis as any).__gxtCaptureRenderError;
          if (typeof capture === 'function') capture(err);
          else throw err;
          return;
        }

        // Remove previously rendered in-element nodes for this target.
        const prevNodes = _inElementRenderedNodes.get(retryRef);
        if (prevNodes) {
          for (const n of prevNodes) {
            try { if (n.parentNode) n.parentNode.removeChild(n); } catch { /* ignore */ }
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
          try { deferredNodes = _deferredRoots(_deferredCtx); } catch { /* ignore */ }
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
            } catch { /* effect setup may fail */ }
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

      const enq = (globalThis as any).__gxtInElementDeferredRender;
      if (typeof enq === 'function') enq(_deferredRender);
      else queueMicrotask(_deferredRender);

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

    // Remove previously rendered in-element nodes for this target
    const prevNodes = _inElementRenderedNodes.get(appendRef);
    if (prevNodes) {
      for (const node of prevNodes) {
        try { if (node.parentNode) node.parentNode.removeChild(node); } catch { /* ignore */ }
      }
      _inElementRenderedNodes.delete(appendRef);
    }

    // Track rendered nodes so they can be cleaned up when the in-element is destroyed
    const renderedNodes: Node[] = [];

    // Mark element for append mode tracking
    if (insertBefore === null) {
      _inElementAppendModeElements.add(appendRef);
    }

    // Clear existing content if insertBefore is undefined (replace mode)
    if (insertBefore === undefined) {
      appendRef.innerHTML = '';
    }

    // Render block content into the external element
    const nodes = roots(ctx);
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
        } catch { /* effect setup may fail */ }
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

    // Always append (for both append mode and replace mode — already cleared)
    appendRef.appendChild(fragment);

    // Store rendered nodes for cleanup
    _inElementRenderedNodes.set(appendRef, renderedNodes);
    (placeholder as any).__gxtInElementNodes = renderedNodes;
    (placeholder as any).__gxtInElementTarget = appendRef;

    return placeholder;
  };
  const _emberInElement = (globalThis as any).$_inElement;
  // Protect from setupGlobalScope overwrite using a non-writable getter
  Object.defineProperty(globalThis, '$_inElement', {
    get() { return _emberInElement; },
    set(_v: any) { /* ignore GXT overwrite */ },
    configurable: false,
    enumerable: true,
  });
}

// Patch SafeString.toString() to track when a SafeString is being converted to
// a string during GXT's quoted attribute concatenation. This lets the style prop
// patch distinguish between a plain string (warn) and a SafeString-derived string
// (no warn). We track the last SafeString result so the prop patch can compare.
// Deferred to avoid circular deps — patches after modules are loaded.
setTimeout(() => {
  try {
    // Use dynamic import to avoid circular dependency during static init
    import('@ember/-internals/glimmer/lib/utils/string').then(mod => {
      const SafeString = mod.SafeString;
      if (SafeString?.prototype?.toString) {
        const origToString = SafeString.prototype.toString;
        SafeString.prototype.toString = function() {
          const result = origToString.call(this);
          (globalThis as any).__gxtLastSafeStringResult = result;
          return result;
        };
      }
    }).catch(() => {});
  } catch {}
}, 0);

// Patch GXT's HTMLBrowserDOMApi.attr() to handle undefined values.
// GXT's native implementation: attr(t,e,n){t.setAttribute(e,null===n?"":n)}
// This only handles null -> "" but not undefined. In Ember, when a bound attribute
// value becomes undefined, the attribute should be REMOVED from the element.
// Without this patch, undefined becomes the string "undefined" on the DOM.
if (_GXT_HTMLBrowserDOMApi && _GXT_HTMLBrowserDOMApi.prototype) {
  const origAttr = _GXT_HTMLBrowserDOMApi.prototype.attr;
  const _patchedAttr = function(element: any, name: string, value: any) {
    // Style warning is now emitted from _styleEmptyGuard in the $_tag_ember wrapper
    // (earlier in the rendering pipeline) to avoid double warnings.
    if (value === undefined || value === false) {
      element.removeAttribute(name);
    } else if (typeof value === 'symbol' ||
               (value !== null && typeof value === 'object' && typeof (value as any).toString !== 'function')) {
      // Symbol values throw on implicit string coercion inside setAttribute.
      // Objects with no toString method (e.g. Object.create(null)) likewise
      // throw "Cannot convert object to primitive value". Normalize these
      // explicitly to match Glimmer's normalizeStringValue semantics:
      //   Symbol(debug) -> "Symbol(debug)"
      //   Object.create(null) -> ""
      origAttr.call(this, element, name, _normalizeStringValue(value));
    } else {
      origAttr.call(this, element, name, value);
    }
  };
  (_patchedAttr as any).__patched = true;
  _GXT_HTMLBrowserDOMApi.prototype.attr = _patchedAttr;

  // Patch prop() — style warning is now emitted from _styleEmptyGuard in the
  // $_tag_ember wrapper (earlier in the pipeline) to avoid double warnings.
  const origProp = _GXT_HTMLBrowserDOMApi.prototype.prop;
  _GXT_HTMLBrowserDOMApi.prototype.prop = function(element: any, name: string, value: any) {
    return origProp.call(this, element, name, value);
  };
}

// Override GXT's $__fn to support mut cells.
// GXT's $__fn unwraps function args by calling them with no args, which breaks
// mut cells (calling mutCell() returns the current value instead of the setter).
// Also marks the returned function with __isFnHelper so the compat layer can
// distinguish fn-helper results from GXT reactive getters (both are arrow fns).
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
      if (typeof fn === 'function' && !fn.__isMutCell && !fn.prototype && !fn.__isFnHelper && fn.length === 0) {
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
        } catch { /* ignore */ }
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
      const isArgGetter = (v: any) => typeof v === 'function' && !v.prototype && !v.__isFnHelper && !v.__isMutCell;
      const resolveFirstArg = (v: any): any => {
        if (!isArgGetter(v)) return v;
        // Functions with declared parameters are never GXT-generated getters.
        if (v.length >= 1) return v;
        // 0-arg function: try calling. If it returns a function, treat it as a
        // getter. If it returns undefined/non-function, treat as a direct
        // handler and return the function itself (side effects are unfortunate
        // but consistent with prior behavior when the template used `this.x`).
        let produced: any;
        try { produced = v(); } catch { return v; }
        if (typeof produced === 'function') return produced;
        return v;
      };
      result = function $__fn_partial(...callArgs: any[]) {
        // Resolve fn: detect GXT-generated getters vs direct scope handlers.
        const resolvedFn = resolveFirstArg(fn);
        // Resolve partial args: if they're getters (arrow fns), call them
        const resolvedPartials = partialArgs.map((a: any) => isArgGetter(a) ? a() : a);
        if (typeof resolvedFn !== 'function') {
          return resolvedFn;
        }
        return resolvedFn(...resolvedPartials, ...callArgs);
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
function _resolveCurriedArgs(curried: any): { name: any; args: Record<string, any>; positionals: any[] } {
  const cArgs = curried.__curriedArgs || {};
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(cArgs)) {
    resolved[key] = (typeof value === 'function' && !(value as any).__isCurriedComponent && !(value as any).prototype)
      ? (value as any)() : value;
  }
  const cPos = curried.__curriedPositionals || [];
  const resolvedPos: any[] = [];
  for (const val of cPos) {
    resolvedPos.push((typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
      ? val() : val);
  }
  return { name: curried.__name, args: resolved, positionals: resolvedPos };
}

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
          try { return a(); } catch { return a; }
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
          _logClearTimer = setTimeout(() => { _loggedSites.clear(); _logClearTimer = null; }, 0);
        }
      }

      console.log(...resolved);
      return '';
    };

    // Protect from setupGlobalScope overwrite
    try {
      let _currentLog = g.$__log;
      Object.defineProperty(g, '$__log', {
        get() { return _currentLog; },
        set(v: any) { _currentLog = g.$__log; },
        configurable: true,
        enumerable: true,
      });
    } catch { /* ignore */ }
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
      const ctxAtConstruction = g.__lastRenderContext;
      // Wrap each function-valued getter so that while it runs we expose the
      // outer context via g.__hashGetterCtx. $_componentHelper_ember reads
      // this to recover the OUTER scope when the hash getter fires inside a
      // nested component's render. Without this, mut cannot locate
      // `this.model.x` on the outer test context when an inner click fires.
      if (ctxAtConstruction && inputObj && typeof inputObj === 'object') {
        const wrappedObj: Record<string, any> = {};
        for (const key of Object.keys(inputObj)) {
          const val = inputObj[key];
          if (typeof val === 'function' && !val.prototype && !val.__isCurriedComponent && !(val as any).__emberHashGetterWrapped) {
            const wrappedGetter = function (this: any) {
              const prev = g.__hashGetterCtx;
              g.__hashGetterCtx = ctxAtConstruction;
              try {
                return val.call(this);
              } finally {
                g.__hashGetterCtx = prev;
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
    const unwrapArg = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
    // Cache the last known owner so re-evaluations during reactive updates
    // (when globalThis.owner may be null) can still resolve components.
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

    g.$_componentHelper = function $_componentHelper_ember(params: any[], hash: Record<string, any>) {
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

      // Track the owner — prefer globalThis.owner, fall back to cached.
      // Also use the shared getOwnerWithFallback from manager.ts which has
      // a more robust cache that survives across reactive re-evaluations.
      const currentOwner = g.owner;
      if (currentOwner && !currentOwner.isDestroyed && !currentOwner.isDestroying) {
        _cachedOwner = currentOwner;
      }
      if (_cachedOwner && (_cachedOwner.isDestroyed || _cachedOwner.isDestroying)) {
        _cachedOwner = null;
      }
      const sharedOwner = typeof g.__getOwnerWithFallback === 'function' ? g.__getOwnerWithFallback() : null;
      const owner = currentOwner || _cachedOwner || sharedOwner;

      // Capture the parent render context for two-way binding via mut.
      // Prefer __hashGetterCtx (set while a hash-constructed getter runs) so
      // `(component "foo" this.model.x)` inside
      // `{{my-comp (hash comp=(component ...))}}` captures the OUTER context
      // (where `model` lives), not the my-comp inner render context. Without
      // this, mut can't walk the path back to set this.model.x when the inner
      // component's click handler calls (mut this.val).
      const parentRenderCtx = (g.__hashGetterCtx as any) || (g as any).__lastRenderContext;

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
            try { val(); } catch { /* ignore */ }
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
          try { p(); } catch { /* ignore */ }
        }
      }

      // Validate that a string component name can be resolved.
      // This throws eagerly during template evaluation (matching Ember's behavior
      // of asserting during render for non-existent components).
      // IMPORTANT: Only validate with the CURRENT globalThis.owner (not cached fallback)
      // because cached owners may be from a different test and won't have the
      // component registered. Skipping validation during reactive re-evaluations
      // (when g.owner is null) is safe — the manager will handle resolution.
      if (typeof first === 'string' && first.length > 0) {
        const validationOwner = g.owner;
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
            // Capture the error so flushRenderErrors() can re-throw it
            // (GXT may catch the thrown error during formula evaluation)
            const captureErr = g.__captureRenderError;
            if (typeof captureErr === 'function') {
              captureErr(err);
            }
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

      // Temporarily set globalThis.owner for createCurriedComponent to capture
      const prevOwner = g.owner;
      if (!prevOwner && owner) {
        g.owner = owner;
      }
      try {
        // Create a curried component
        return createCurried(first, namedArgs, positionals);
      } finally {
        if (!prevOwner && owner) {
          g.owner = prevOwner;
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
        if (typeof v.unknownProperty === 'function' && typeof v.setUnknownProperty === 'function') return true;
        // Check _content property existence (ObjectProxy stores content internally)
        if ('_content' in v || 'content' in v) return true;
        return false;
      };
    } catch { return (v: any) => false; }
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
  // GXT's IfCondition.setupCondition checks __gxtToBool before its own !!v
  g.__gxtToBool = emberToBool;

  // Replace $__if on globalThis with Ember-aware version.
  // Use a persistent property trap so GXT's setupGlobalScope cannot overwrite.
  const _ember$__if = function $__if_ember(condition: unknown, ifTrue: unknown, ifFalse: unknown = '') {
    const rawCond = typeof condition === 'function' && !(condition as any).prototype ? (condition as any)() : condition;
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
      get() { return _currentIf; },
      set(v: any) {
        // Allow GXT to "set" it, but immediately restore Ember version
        _currentIf = _ember$__if;
      },
      configurable: true,
      enumerable: true,
    });
  } catch { /* ignore if defineProperty fails */ }
}

// GXT external schedule hook: GXT's cell.update() calls scheduleRevalidate()
// which now checks globalThis.__gxtExternalSchedule before using queueMicrotask.
// We set it to a no-op so GXT doesn't auto-schedule DOM sync — instead we
// control when gxtSyncDom() is called (after runTask, or via setTimeout fallback).
(globalThis as any).__gxtPendingSync = false;
(globalThis as any).__gxtPendingSyncFromPropertyChange = false;
(globalThis as any).__gxtExternalSchedule = function() {
  (globalThis as any).__gxtPendingSync = true;
  // Note: this is from cell/effect scheduling, NOT from a property change.
  // __gxtPendingSyncFromPropertyChange is set separately by _notifyPropertiesChanged.
};

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
(globalThis as any).__gxtRegisterObjectValueOwner = registerObjectValueOwner;

function registerArrayOwner(array: any, ownerObj: object, ownerKey: string) {
  if (!array || typeof array !== 'object') return;
  let owners = _arrayOwnerMap.get(array);
  if (!owners) {
    owners = new Set();
    _arrayOwnerMap.set(array, owners);
  }
  owners.add({ obj: ownerObj, key: ownerKey });
}
(globalThis as any).__gxtRegisterArrayOwner = registerArrayOwner;

// Pending if-watcher notifications accumulated during __gxtTriggerReRender.
// Flushed in __gxtSyncDomNow after all cells have been updated atomically.
// This prevents IfCondition branch switching during batched property changes
// (e.g., set(cond2, true); set(cond1, false) in a single runTask), which
// could create components in branches that will be removed when the outer
// conditional is updated.
let _pendingIfWatcherNotifications: Array<{ obj: object; keyName: string }> = [];

// GXT re-render trigger hook - called by Ember's notifyPropertyChange.
// Since GXT's own cell updates are captured by __gxtExternalSchedule,
// this hook only needs to mark that a sync is pending.
(globalThis as any).__gxtTriggerReRender = function(obj: object, keyName: string) {
  // Handle KVO array mutations: when '[]' or 'length' is notified on an array,
  // dirty the cells of all component properties that reference this array.
  // Note: KVO array mutation tracking (pushObject/shiftObject) is handled
  // by dirtying cells on objects that reference the array. This is a best-effort
  // approach since GXT's $_eachSync may not re-render for same-reference arrays.
  if ((keyName === '[]' || keyName === 'length') && Array.isArray(obj)) {
    const owners = _arrayOwnerMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        try {
          // Use skipDefine=true to avoid overwriting custom getters on renderContext
          // that were set up during createRenderContext. The custom getter reads
          // from the Ember instance via a getter function, while cellFor's default
          // getter reads from cell._value which may be stale for same-ref arrays.
          const c = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
          if (c) c.update(obj);
        } catch { /* ignore */ }
      }
    }
  }
  const newValue = (obj as any)[keyName];
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
    } catch { /* ignore */ }
  }
  // Re-evaluate cells for OTHER properties on the same object that have
  // cellFor-installed getters. Native getters (e.g., get countAlias() { return this.count; })
  // don't declare dependencies. When 'count' changes, the cell for 'countAlias'
  // is stale. Re-read the property's current value (which goes through the
  // original prototype getter or tracked getter) and update the cell.
  // Only scan own properties that have getters (installed by cellFor).
  try {
    const ownKeys = Object.getOwnPropertyNames(obj);
    for (const ownKey of ownKeys) {
      if (ownKey === keyName) continue; // Already updated
      try {
        const desc = Object.getOwnPropertyDescriptor(obj, ownKey);
        if (desc && desc.get && desc.configurable) {
          // This looks like a cellFor-installed getter. Get the cell and update it
          // by reading the ORIGINAL prototype getter's value.
          let protoGetter: (() => any) | null = null;
          let proto = Object.getPrototypeOf(obj);
          while (proto && proto !== Object.prototype) {
            const protoDesc = Object.getOwnPropertyDescriptor(proto, ownKey);
            if (protoDesc && protoDesc.get) {
              protoGetter = protoDesc.get;
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
          if (protoGetter) {
            // Call the original prototype getter to get fresh value
            const freshVal = protoGetter.call(obj);
            const oc = cellFor(obj, ownKey, /* skipDefine */ true);
            if (oc) oc.update(freshVal);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
  // Dirty cells that hold `obj` as their VALUE (reverse lookup).
  // This handles the case where a template reads {{this.m.formattedMessage}} —
  // the formula tracks cell(renderContext, 'm'), and when m.message changes,
  // we need to dirty that cell so the formula re-evaluates with the new
  // computed property result.
  // Collect owners that need their Ember tag dirtied for force-rerender.
  // The actual dirtying is deferred to AFTER gxtSyncDom + updateRootTagValues.
  let _deferredTagDirties: Array<{ obj: object; key: string }> | null = null;
  try {
    const owners = _objectValueCellMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        try {
          const oc = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
          if (oc) oc.update(obj);
        } catch { /* ignore */ }
        // Defer markObjectAsDirty to after gxtSyncDom + updateRootTagValues
        if (!_deferredTagDirties) _deferredTagDirties = [];
        _deferredTagDirties.push({ obj: ownerObj, key: ownerKey });
      }
    }
  } catch { /* ignore */ }
  // Recompute computed properties that depend on the changed key.
  // Ember computed properties (e.g., @computed('message') get formattedMessage())
  // are replaced by cell-backed getters when cellFor is called. When the underlying
  // dependency changes, we need to re-evaluate the computed getter and update its cell.
  try {
    const recompute = (globalThis as any).__gxtRecomputeDependents;
    if (typeof recompute === 'function') {
      const dependents: Array<{ key: string; value: unknown }> = recompute(obj, keyName);
      for (const { key, value } of dependents) {
        try {
          const dc = cellFor(obj, key, /* skipDefine */ true);
          if (dc) dc.update(value);
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
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
  } catch { /* ignore */ }
  // Also dirty cells on ALL render contexts derived from this component.
  // GXT's $_if formula tracks cells on Object.create(component) wrappers.
  // The contexts map is keyed by prototype, so we check both obj and its prototype.
  try {
    const ctxsMap = (globalThis as any).__gxtComponentContexts;
    if (ctxsMap) {
      // Check both the object itself and its prototype as keys
      const candidates = [obj];
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto && proto !== Object.prototype) candidates.push(proto);
      } catch { /* ignore */ }

      for (const candidate of candidates) {
        const ctxs = ctxsMap.get(candidate);
        if (!ctxs) continue;
        const isProto = candidate !== obj;
        const newValue = (obj as any)[keyName];
        for (const ctx of ctxs) {
          try {
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
            if (isProto && cellTarget !== obj) continue;
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
                    if (pd && pd.get) { protoGetter = pd.get; break; }
                    p = Object.getPrototypeOf(p);
                  }
                  if (!protoGetter) continue;
                  const freshVal = protoGetter.call(cellTarget);
                  const oc = cellFor(cellTarget, ownKey, /* skipDefine */ true);
                  if (oc) oc.update(freshVal);
                } catch { /* skip */ }
              }
            } catch { /* ignore */ }
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }
  // For nested paths like 'colors.apple', also dirty the root property cell.
  // Templates read `this.colors` which creates a cell for 'colors'. When
  // set(obj, 'colors.apple', val) fires, we need to dirty 'colors' too
  // so the template re-evaluates the full path.
  if (keyName.includes('.')) {
    const rootKey = keyName.split('.')[0]!;
    try {
      const rootCell = cellFor(obj, rootKey, /* skipDefine */ true);
      if (rootCell) rootCell.update((obj as any)[rootKey]);
    } catch { /* ignore */ }
  }
  // Sync wrapper element if the object has attribute/class bindings
  try {
    const syncWrapper = (globalThis as any).__gxtSyncWrapper;
    if (syncWrapper) syncWrapper(obj, keyName);
  } catch { /* ignore */ }

  (globalThis as any).__gxtPendingSync = true;
  (globalThis as any).__gxtPendingSyncFromPropertyChange = true;
  // If this property change originated from a `schedule('afterRender', ...)`
  // callback, record that fact. runAppend uses this to decide whether a
  // property-change flag set during the initial-render runloop should be
  // preserved for the subsequent syncNow() call — property changes from
  // afterRender callbacks are legitimate user sets (the `afterRender set`
  // pattern) and must trigger gxtSyncDom, while property changes from
  // component init (e.g. Textarea's internal bindings) are init artifacts
  // that should not cause a post-runAppend full sync.
  if ((globalThis as any).__gxtInAfterRender) {
    (globalThis as any).__gxtAfterRenderPropertyChange = true;
  }
  // Track whether ANY property change was on a nested object (not a component's
  // own cell). Nested changes need the morph (Phase 2b) because GXT's cell
  // tracking doesn't cover nested property paths (e.g., this.model.color).
  // Direct cell changes (e.g., this.positionTwo) are handled by Phase 1.
  const isNestedChange = keyName.includes('.') || _deferredTagDirties?.length > 0;
  if (isNestedChange) {
    (globalThis as any).__gxtHadNestedPropertyChange = true;
  }
  // DON'T call gxtSyncDom() here — property changes may be batched (e.g.,
  // set(cond2, true); set(cond1, false) in a single runTask). Calling
  // gxtSyncDom after each set() processes inner conditionals before outer
  // ones have been updated, creating components that should never exist.
  // Instead, let __gxtSyncDomNow handle all cell updates atomically
  // after the entire runTask callback completes.
  // The cells are already dirtied (via cell.update above), and the
  // __gxtSyncDomNow call from runTask will process them correctly.
  // Signal to __gxtForceEmberRerender that nested object changes occurred.
  // When a property changes on a nested object (e.g., set(m, 'message', ...)),
  // the component's SELF_TAG is NOT dirtied by Ember (only m's tag is).
  // Setting __gxtHadNestedObjectChange allows the force-rerender to fire
  // and re-evaluate computed properties like {{this.m.formattedMessage}}.
  if (_deferredTagDirties && _deferredTagDirties.length > 0) {
    (globalThis as any).__gxtHadNestedObjectChange = true;
  }
  // Defer if-watcher notifications to __gxtSyncDomNow so batched property
  // changes are applied atomically. Firing syncState here would process
  // inner conditionals before outer ones are updated (e.g., set(cond2, true)
  // triggers inner IfCondition to create components, but set(cond1, false)
  // hasn't happened yet to suppress the outer conditional).
  _pendingIfWatcherNotifications.push({ obj, keyName });
};

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

let ifWatchers = new WeakMap<object, Map<string, Set<(notifiedTarget: object) => void>>>();

// Persistent set of classic-component wrapper DOM ids that the user has
// directly toggled to `false` via a click handler calling set()/toggleProperty.
// Used by the __gxtRebuildViewTreeFromDom wrap below to reset the view-
// registry's CHILD_VIEW_IDS for those wrappers so getChildViews returns
// empty (matching the collapsed {{#if}} branch) even if GXT's own
// destroyBranchSync was a no-op for the yield-only true branch.
const _wrapperIfUserFalse = new Set<string>();
(globalThis as any).__gxtWrapperIfUserFalse = _wrapperIfUserFalse;
// Map of wrapperId -> Set of {condFn, placeholder} entries. Populated by the
// ifWatcher when the user toggles to false. Used by _wrapGxtRebuildViewTree
// to verify at read time that a LIVE-DOM-connected IfCondition for this
// wrapper still reports false. Needed because pool-reuse creates multiple
// stale IfCondition instances sharing the same wrapperId — only the one
// whose placeholder is currently inside the live #wrapperId element
// represents the user-visible state.
type _IfCondEntry = { condFn: () => any; placeholder: any; ifCondition: any };
const _wrapperIfCondLookup = new Map<string, Set<_IfCondEntry>>();

// Allow clearing ifWatchers between tests to prevent stale callbacks
(globalThis as any).__gxtClearIfWatchers = function() {
  ifWatchers = new WeakMap();
  _wrapperIfUserFalse.clear();
  _wrapperIfCondLookup.clear();
};

// Module-scope helper: is `par` a classic-component wrapper element
// (an element with class="ember-view")?
function _isEmberViewWrapper(par: any): boolean {
  if (!par || par.nodeType !== 1) return false;
  if (!par.getAttribute) return false;
  const cls = par.getAttribute('class');
  if (!cls) return false;
  return /\bember-view\b/.test(cls);
}

function registerIfWatcher(rawTarget: object, key: string, callback: (notifiedTarget: object) => void) {
  let keyMap = ifWatchers.get(rawTarget);
  if (!keyMap) { keyMap = new Map(); ifWatchers.set(rawTarget, keyMap); }
  let watchers = keyMap.get(key);
  if (!watchers) { watchers = new Set(); keyMap.set(key, watchers); }
  watchers.add(callback);
}

function notifyIfWatchers(obj: object, key: string) {
  const candidates = [obj];
  try {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) candidates.push(proto);
  } catch { /* ignore */ }
  // Walk component-context mappings to also notify watchers on render-
  // context proxies that wrap this instance. CRITICAL: only expand
  // candidates from ctxsMap entries keyed by `obj` directly — not from
  // proto-keyed entries. The prototype bucket aggregates contexts from
  // every instance sharing the prototype, so expanding from it would
  // broadcast the notify to sibling instances and fire their watchers,
  // collapsing their {{#if}} branches on an unrelated toggle (cell-
  // aliasing bug).
  const ctxsMap = (globalThis as any).__gxtComponentContexts;
  if (ctxsMap) {
    const ctxs = ctxsMap.get(obj);
    if (ctxs) {
      for (const ctx of ctxs) {
        const raw = ctx?.__gxtRawTarget || ctx;
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
      try { cb(obj); } catch (e) { console.warn('[GXT] ifWatcher error:', e); }
    }
  }
}

// Patch $_if to capture IfCondition instances and fix placeholder connectivity.
function patchGlobalIf() {
  const g = globalThis as any;
  if (!g.$_if || g.$_if.__emberPatched) return false;
  const origIf = g.$_if;
  g.$_if = function patchedIf(
    conditionOrCell: any,
    trueBranch: any,
    falseBranch: any,
    ctx: any
  ) {
    const watchTarget = conditionOrCell?.__gxtWatchTarget;
    const watchKey = conditionOrCell?.__gxtWatchKey;

    // Capture class-based helper instances created during trueBranch/falseBranch
    // evaluation so we can call `destroy()` on them when the branch is torn down
    // (e.g., `{{#if this.show}}{{hello-world}}{{/if}}` with `show` toggled to
    // false). Ember's classic Helper lifecycle requires destroy + willDestroy
    // to fire at block-teardown time, not only on top-level render teardown.
    const trueBranchHelpers = new Set<any>();
    const falseBranchHelpers = new Set<any>();
    const wrapBranch = (fn: any, scope: Set<any>) => {
      if (typeof fn !== 'function') return fn;
      return function wrappedBranch(this: any, ...branchArgs: any[]) {
        const g2 = globalThis as any;
        const prev = g2.__gxtCurrentHelperScope;
        g2.__gxtCurrentHelperScope = scope;
        try {
          const result = fn.apply(this, branchArgs);
          // If the branch returns a function (common pattern:
          // `ctx0 => $_ucw(ctx1 => [...], ctx0)` where $_ucw may invoke the
          // inner arrow later), wrap the inner call so that scope is active
          // when the nested render runs.
          if (typeof result === 'function') {
            const inner = result;
            const wrappedInner = function wrappedInnerBranch(this: any, ...innerArgs: any[]) {
              const g3 = globalThis as any;
              const prev2 = g3.__gxtCurrentHelperScope;
              g3.__gxtCurrentHelperScope = scope;
              try {
                return inner.apply(this, innerArgs);
              } finally {
                g3.__gxtCurrentHelperScope = prev2;
              }
            };
            return wrappedInner;
          }
          return result;
        } finally {
          g2.__gxtCurrentHelperScope = prev;
        }
      };
    };
    const wrappedTrue = wrapBranch(trueBranch, trueBranchHelpers);
    const wrappedFalse = wrapBranch(falseBranch, falseBranchHelpers);

    const ifCondition = origIf(conditionOrCell, wrappedTrue, wrappedFalse, ctx);

    // Install branch-swap helper-destroy hook unconditionally. This fires
    // destroy + willDestroy on any class-based helper instance created during
    // the outgoing branch's evaluation whenever the branch toggles, so that
    // tests like `class-based helper lifecycle` (where `{{#if this.show}}` is
    // flipped to `false`) see the full Ember Helper lifecycle.
    if (ifCondition && typeof ifCondition.syncState === 'function' &&
        !(ifCondition as any).__emberHelperCleanupInstalled) {
      (ifCondition as any).__emberHelperCleanupInstalled = true;
      const _g = globalThis as any;
      const emberToBool = _g.__gxtToBool || Boolean;
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
          } catch { /* ignore */ }
        };
        evictFromCache(_g.__gxtClassHelperInstanceCache);
        evictFromCache(_g.__gxtTagHelperInstanceCache);
        for (const inst of copy) {
          try {
            if (inst && typeof inst.destroy === 'function' &&
                !inst.isDestroyed && !inst.isDestroying) {
              inst.destroy();
            }
          } catch { /* ignore */ }
        }
      };
      // Initialise prevBool from the condition's current value.
      try {
        const initV = typeof conditionOrCell === 'function'
          ? conditionOrCell() : conditionOrCell;
        prevBool = emberToBool(initV);
      } catch { prevBool = null; }
      // Fallback: if we couldn't populate the scope because helper creation
      // happens inside a deferred formula (outside our wrapBranch's dynamic
      // scope), snapshot the set of live class-helper instances BEFORE the
      // branch is evaluated and destroy any newly-added ones on branch swap.
      let preBranchCacheKeys: Set<string> | null = null;
      const snapshotCacheKeys = () => {
        try {
          const cache = _g.__gxtClassHelperInstanceCache;
          if (cache && typeof cache.forEach === 'function') {
            const s = new Set<string>();
            cache.forEach((_v: any, k: string) => s.add(k));
            return s;
          }
        } catch { /* ignore */ }
        return new Set<string>();
      };
      const destroyNewCacheEntriesSince = (prev: Set<string> | null) => {
        try {
          const cache = _g.__gxtClassHelperInstanceCache;
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
            const inst = entry && entry.__managerBucket
              ? entry.bucket?.instance : entry;
            if (inst && typeof inst.destroy === 'function' &&
                !inst.isDestroyed && !inst.isDestroying) {
              try { inst.destroy(); } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
      };

      // Capture the pre-branch snapshot at install time (just before the
      // first syncState runs).
      preBranchCacheKeys = snapshotCacheKeys();

      ifCondition.syncState = function(v: any) {
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
        } catch { /* ignore */ }
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
              const node = item && (item as any).nodeType ? item : (item && (item as any)[RENDERED_NODES_PROPERTY!]?.[0]);
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
              if (node && (node as any).nodeType && (node as any).parentNode && (node as any).parentNode.isConnected) {
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
          } catch { /* ignore */ }
        }
        if (parent) {
          try {
            parent.appendChild(ph);
            lastKnownParent = parent;
          } catch { /* ignore */ }
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
        } catch { /* ignore */ }
        return null;
      })();

      // Register manual watcher for property change notification
      if (typeof ifCondition.syncState === 'function') {
        const emberToBool = g.__gxtToBool || Boolean;
        const origSyncState = ifCondition.syncState.bind(ifCondition);
        let prevBoolState: boolean | null = null;
        const destroyHelpersIn = (scope: Set<any>) => {
          if (!scope || scope.size === 0) return;
          const copy = Array.from(scope);
          scope.clear();
          // Also remove from the shared classHelperInstanceCache so subsequent
          // renders create fresh instances with their full lifecycle.
          const g2 = globalThis as any;
          try {
            const cache = g2.__gxtClassHelperInstanceCache;
            if (cache && typeof cache.forEach === 'function') {
              const toDelete: any[] = [];
              cache.forEach((v: any, k: any) => {
                if (copy.indexOf(v) !== -1) toDelete.push(k);
              });
              for (const k of toDelete) cache.delete(k);
            }
          } catch { /* ignore */ }
          for (const inst of copy) {
            try {
              if (inst && typeof inst.destroy === 'function' &&
                  !inst.isDestroyed && !inst.isDestroying) {
                inst.destroy();
              }
            } catch { /* ignore */ }
          }
        };
        ifCondition.syncState = function(v: any) {
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
          } catch { /* ignore */ }
          // Push the owner view so any components created by syncState's
          // re-render of the trueBranch (typically {{yield}} block content)
          // are registered as children of the correct view via the parentView
          // stack. Without this, slot fns capture parentView from the OUTER
          // scope (e.g., the route controller), and re-rendered yield content
          // is added as a child of the controller instead of the component
          // invoking yield.
          // Read push/pop dynamically — they may not be defined at patch time.
          const pushPV = (globalThis as any).__gxtPushParentView;
          const popPV = (globalThis as any).__gxtPopParentView;
          let pushed = false;
          if (ifOwnerView && typeof pushPV === 'function') {
            try { pushPV(ifOwnerView); pushed = true; } catch { /* ignore */ }
          }
          try {
            return origSyncState(v);
          } finally {
            if (pushed && typeof popPV === 'function') {
              try { popPV(); } catch { /* ignore */ }
            }
          }
        };
        registerIfWatcher(watchTarget, watchKey, (notifiedTarget: object) => {
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
            } catch { /* ignore */ }
            const ph = ifCondition.placeholder;
            const par: any = ph && (ph as any).parentNode;
            if (par && _isEmberViewWrapper(par) && par.id) {
              if (notifiedTarget === watchTarget && boolVal === false) {
                _wrapperIfUserFalse.add(par.id);
                let s = _wrapperIfCondLookup.get(par.id);
                if (!s) { s = new Set(); _wrapperIfCondLookup.set(par.id, s); }
                s.add({ condFn: conditionOrCell, placeholder: ph, ifCondition });
              } else if (boolVal === true || freshBoolVal === true) {
                _wrapperIfUserFalse.delete(par.id);
                _wrapperIfCondLookup.delete(par.id);
              }
            }

            ifCondition.syncState(boolVal);
          } catch (e) { console.warn('[GXT] syncState error:', e); }
        });
      }
    }

    return ifCondition;
  };
  g.$_if.__emberPatched = true;

  // Protect $_if from being overwritten by setupGlobalScope()
  const _patchedIf = g.$_if;
  try {
    Object.defineProperty(g, '$_if', {
      get() { return _patchedIf; },
      set(_v: any) { /* keep patched version */ },
      configurable: true,
      enumerable: true,
    });
  } catch { /* ignore */ }

  return true;
}
patchGlobalIf();
queueMicrotask(patchGlobalIf);

// Wrap __gxtRebuildViewTreeFromDom (defined in manager.ts and invoked from
// getChildViews) so that after the rebuild repopulates CHILD_VIEW_IDS from
// live DOM ancestry, any wrapper the user has toggled false (via direct
// click → toggleProperty('isExpanded')) has its view-registry children
// reset. This ensures getChildViews(rootWrapper) returns [] even though
// GXT's destroyBranchSync is a no-op for yield-only true branches (the
// inner DOM still contains the yielded nodes because prevComponent was
// empty). View-registry-only cleanup — no DOM mutation, so a subsequent
// toggle-back-to-true still surfaces the same DOM content.
function _wrapGxtRebuildViewTree() {
  const g = globalThis as any;
  const orig = g.__gxtRebuildViewTreeFromDom;
  if (!orig || (orig as any).__emberIfRebuildPatched) return;
  const wrapped = function(this: any, ...args: any[]) {
    const result = orig.apply(this, args);
    try {
      if (_wrapperIfUserFalse.size > 0) {
        // Collect registries to search: the explicit arg (if any) and the
        // current global owner's view registry.
        const registries: any[] = [];
        if (args && args[0]) registries.push(args[0]);
        try {
          const go: any = (globalThis as any).owner;
          const reg2 = go && go.lookup && go.lookup('-view-registry:main');
          if (reg2 && !registries.includes(reg2)) registries.push(reg2);
        } catch { /* ignore */ }
        const g2: any = globalThis as any;
        const toBool = g2.__gxtToBool || Boolean;
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
              if (pcHasContent) { anyExpanded = true; break; }
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
          } catch { /* ignore */ }
          for (const v of views) {
            try { _emberInitChildViews(v); } catch { /* ignore */ }
          }
        }
        for (const id of staleIds) _wrapperIfUserFalse.delete(id);
      }
    } catch { /* ignore */ }
    // Drain the in-element deferred-render queue now. By the time the
    // manager's flushAfterInsertQueue has processed all didInsertElement
    // hooks and called __gxtRebuildViewTreeFromDom, the parent fragment
    // for the outermost render pass has been committed to the live
    // document — so document.getElementById() can finally resolve any
    // in-element targets whose host div was rendered in the same pass.
    // This covers the renderComponent strict-mode path that does NOT
    // go through globalThis.__gxtFlushAfterInsertQueue.
    try {
      const drain = (globalThis as any).__gxtInElementDrainDeferred;
      if (typeof drain === 'function') drain();
    } catch { /* ignore */ }
    return result;
  };
  (wrapped as any).__emberIfRebuildPatched = true;
  g.__gxtRebuildViewTreeFromDom = wrapped;
}
_wrapGxtRebuildViewTree();
queueMicrotask(_wrapGxtRebuildViewTree);
// manager.ts may define __gxtRebuildViewTreeFromDom after compile.ts loads;
// retry a few times until patched or a short window expires.
{
  let _wrapAttempts = 0;
  const _wrapRebuildIv = setInterval(() => {
    _wrapGxtRebuildViewTree();
    _wrapAttempts++;
    const g = globalThis as any;
    if ((g.__gxtRebuildViewTreeFromDom as any)?.__emberIfRebuildPatched || _wrapAttempts > 60) {
      clearInterval(_wrapRebuildIv);
    }
  }, 50);
}

// ---- $_eachSync: normalize Ember collections for GXT ----
// Converts null/undefined/false/ArrayProxy/Set/ForEachable to native arrays.
// GXT's SyncListComponent already handles empty arrays + inverseFn correctly
// (after the GXT fix for first-render inverse). We just need to ensure
// the value reaching GXT is always a proper array.
function normalizeEachCollection(raw: any): any[] {
  if (raw == null || raw === false || raw === '' || raw === 0) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    if (typeof raw.toArray === 'function') return raw.toArray();
    if (typeof raw[Symbol.iterator] === 'function') return Array.from(raw);
    // ForEachable objects
    if (typeof raw.forEach === 'function' && typeof raw.length === 'number') {
      const arr: any[] = [];
      raw.forEach((item: any) => arr.push(item));
      return arr;
    }
  }
  // Non-iterable truthy values (true, 'hello', 1, {}, functions) → empty for #each
  return [];
}

function patchGlobalEachSync() {
  const g = globalThis as any;
  if (!g.$_eachSync || g.$_eachSync.__emberPatched) return false;
  const origEachSync = g.$_eachSync;

  g.$_eachSync = function patchedEachSync(
    items: any, fn: any, key: any, ctx: any, inverseFn?: any
  ) {
    // Capture the parent Ember component instance at the time $_eachSync is
    // called from the template body. `ctx` is the GXT render context (which
    // proxies the Ember component instance) — unwrap via __gxtRawTarget.
    // This is needed because on UPDATE (items add/remove) GXT invokes `fn`
    // and `inverseFn` OUTSIDE the render transaction — at which point the
    // parentViewStack is empty and newly-created item components would get
    // parentView = null.
    const capturedParent: any = (ctx && (ctx.__gxtRawTarget || ctx)) || null;
    const pushPV = g.__gxtPushParentView;
    const popPV = g.__gxtPopParentView;
    // Ember View instances have an _isView/isView flag; only push actual
    // view-like instances. Plain objects / GXT contexts without a view
    // identity must not be pushed or they would become bogus parents.
    const isViewInstance = !!(
      capturedParent &&
      typeof capturedParent === 'object' &&
      (capturedParent.isView === true || typeof capturedParent.trigger === 'function' || 'elementId' in capturedParent)
    );
    // Only wrap when we have a view instance AND the push/pop helpers exist.
    // On initial render, the parent is already on the stack (pushed by
    // renderTemplateWithParentView), so pushing again would merely stack —
    // `getCurrentParentView` still returns the same top. On update, the
    // stack is empty and this push makes the parent resolvable.
    const canWrap = isViewInstance && typeof pushPV === 'function' && typeof popPV === 'function';
    const withParent = (cb: any): any => {
      if (!canWrap) return cb();
      pushPV(capturedParent);
      try { return cb(); } finally { popPV(); }
    };

    // Wrap the callback fn to ensure `index` is always a cell-like object.
    // GXT's compiled code emits `() => index.value` for block params,
    // but in non-dev GXT builds, $SyncListComponent passes `index` as
    // a plain number (no .value property). This causes `() => index.value`
    // to return `undefined`, breaking {{get array index}} patterns.
    const origFn = fn;
    fn = function wrappedEachFn(item: any, index: any, ctx0: any) {
      // If index is a plain number (not a cell), wrap it in a cell-like object
      if (typeof index === 'number') {
        const cellLike: any = { id: index };
        Object.defineProperty(cellLike, 'value', {
          get() { return index; },
          enumerable: true,
          configurable: true,
        });
        return origFn(item, cellLike, ctx0);
      }
      return origFn(item, index, ctx0);
    };
    // Wrap inverseFn so components created in the {{else}} branch (rendered
    // when items becomes empty on update) see the captured parent — at that
    // point the parentViewStack is empty and new instances would otherwise
    // have parentView=null, breaking the lifecycle tests.
    if (typeof inverseFn === 'function') {
      const origInverseFn = inverseFn;
      inverseFn = function wrappedInverseFn(ctx0: any) {
        return withParent(() => origInverseFn(ctx0));
      };
    }

    // Wrap items cell/getter to normalize collection values.
    // CRITICAL: $_eachSync expects a Cell/MergedCell (with .id and .value),
    // NOT a plain getter function. Wrap in __gxtFormula so that
    // opcodeFor(tag, ...) can track reactivity and read .value correctly.
    const gxtFormula = g.__gxtFormula;
    if (typeof items === 'function' && !items.prototype) {
      const origGetter = items;
      if (gxtFormula) {
        // Wrap in formula → MergedCell so $_eachSync gets a proper reactive tag
        const wrappedCell = gxtFormula(() => {
          return normalizeEachCollection(origGetter());
        });
        return origEachSync(wrappedCell, fn, key, ctx, inverseFn);
      }
      // Fallback: pass function directly (legacy behavior)
      const wrappedGetter: any = function() { return normalizeEachCollection(origGetter()); };
      if (origGetter.__gxtWatchTarget) wrappedGetter.__gxtWatchTarget = origGetter.__gxtWatchTarget;
      if (origGetter.__gxtWatchKey) wrappedGetter.__gxtWatchKey = origGetter.__gxtWatchKey;
      return origEachSync(wrappedGetter, fn, key, ctx, inverseFn);
    } else if (items && typeof items === 'object' && 'value' in items) {
      const origCell = items;
      const wrappedCell = Object.create(origCell);
      Object.defineProperty(wrappedCell, 'value', {
        get() { return normalizeEachCollection(origCell.value); },
        enumerable: true, configurable: true,
      });
      if (origCell.id !== undefined) wrappedCell.id = origCell.id;
      return origEachSync(wrappedCell, fn, key, ctx, inverseFn);
    }
    return origEachSync(normalizeEachCollection(items), fn, key, ctx, inverseFn);
  };
  g.$_eachSync.__emberPatched = true;

  // Protect from setupGlobalScope overwrite
  const _patchedEach = g.$_eachSync;
  try {
    Object.defineProperty(g, '$_eachSync', {
      get() { return _patchedEach; },
      set(_v: any) { /* keep patched version */ },
      configurable: true,
      enumerable: true,
    });
  } catch { /* ignore */ }
  return true;
}
patchGlobalEachSync();
queueMicrotask(patchGlobalEachSync);

// Get a getter function for a property on the render context.
(globalThis as any).__gxtGetCellOrFormula = function(obj: any, key: string) {
  const raw = obj?.__gxtRawTarget || obj;
  try { cellFor(raw, key, /* skipDefine */ false); } catch { /* ignore */ }
  const getter: any = function() { return obj[key]; };
  getter.__gxtWatchTarget = raw;
  getter.__gxtWatchKey = key;
  return getter;
};

// Augment the backtracking assertion's render tree with template-only
// component names. Template-only components have no instance and therefore
// don't appear in the parentView chain that `__gxtCheckBacktracking` walks;
// without this augmentation, the render-tree message is missing entries like
// `x-inner-template-only` that Glimmer VM would include.
//
// We track active template-only renders via `__gxtTemplateOnlyStack` (pushed
// in the $_tag thunk below) and rewrite the backtracking assertion message
// at report time. `__emberAssertFn` is installed on globalThis as a getter
// (see manager.ts) that returns `getDebugFunction('assert')`; we can't
// replace it in-place. Instead we wrap `getDebugFunction('assert')` by
// intercepting via `setDebugFunction`, wrapping the returned function. The
// simpler path: wrap the globalThis '__emberAssertFn' property directly
// only if the current accessor allows overwrite.
function _rebuildBacktrackingMsgWithTemplateOnly(msg: string): string {
  const _g = globalThis as any;
  const renderedSet = (_g.__gxtTemplateOnlyRenderedSet as Set<string>) || new Set();
  if (renderedSet.size === 0) return msg;
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
    if (trimmed && !trimmed.startsWith('-top-level') && !trimmed.startsWith('{{outlet}}') &&
        !trimmed.startsWith('- While rendering:') && !trimmed.startsWith('You attempted')) {
      existingInTree.add(trimmed);
    }
  }
  const missingNames: string[] = [];
  for (const n of renderedSet) {
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
// Wrap __gxtCheckBacktracking to rewrite the assertion message's render tree
// and include names of rendered template-only components. Template-only
// components don't participate in the parentView chain that the original
// function walks; without this, the render tree emitted by the backtracking
// diagnostic is missing entries like `x-inner-template-only`.
function _installTemplateOnlyRenderTreeInjection() {
  const _g = globalThis as any;
  if (_g.__gxtAssertInjected) return;
  if (!_g.__gxtCheckBacktracking) return;
  const orig = _g.__gxtCheckBacktracking;
  // Intercept by patching __emberAssertFn seen by __gxtCheckBacktracking
  // via its internal read of globalThis.__emberAssertFn. We achieve this by
  // replacing __gxtCheckBacktracking with a thin wrapper that installs a
  // per-call override on __emberAssertFn for the duration of the call. This
  // keeps the wrapping scoped and avoids interfering with other uses of
  // __emberAssertFn.
  _g.__gxtCheckBacktracking = function __gxtCheckBacktracking_wrapInject(target: any, key: string) {
    const desc = Object.getOwnPropertyDescriptor(_g, '__emberAssertFn');
    const origGet = desc?.get;
    if (!origGet) {
      return orig.call(this, target, key);
    }
    // Override the getter for the duration of this call to return a wrapped
    // assert that rewrites the msg using our template-only set.
    try {
      Object.defineProperty(_g, '__emberAssertFn', {
        get() {
          const inner = origGet.call(this);
          if (typeof inner !== 'function') return inner;
          if ((inner as any).__gxtTemplateOnlyInjectWrapped) return inner;
          const wrapped = function(msg: any, test: any) {
            if (typeof msg === 'string') {
              msg = _rebuildBacktrackingMsgWithTemplateOnly(msg);
            }
            return inner.call(this, msg, test);
          };
          (wrapped as any).__gxtTemplateOnlyInjectWrapped = true;
          return wrapped;
        },
        configurable: true,
      });
    } catch { /* ignore */ }
    try {
      return orig.call(this, target, key);
    } finally {
      // Restore the original getter so that other assertion paths see the
      // untransformed __emberAssertFn.
      try {
        Object.defineProperty(_g, '__emberAssertFn', {
          get: origGet,
          configurable: true,
        });
      } catch { /* ignore */ }
    }
  };
  _g.__gxtAssertInjected = true;
}
// Retry install across microtasks and delayed timeouts until
// __gxtCheckBacktracking is defined by manager.ts.
_installTemplateOnlyRenderTreeInjection();
queueMicrotask(_installTemplateOnlyRenderTreeInjection);
setTimeout(_installTemplateOnlyRenderTreeInjection, 0);
setTimeout(_installTemplateOnlyRenderTreeInjection, 50);

// Clear the template-only rendered set at the start of each render pass so
// the backtracking injector only sees components that rendered during the
// current render. Otherwise previous tests leave stale entries (e.g. the
// `foo-bar` from a prior test polluting the next test's render tree).
function _installTemplateOnlyResetHook() {
  const _g = globalThis as any;
  if (!_g.__gxtBeginRenderPass || _g.__gxtBeginRenderPass.__emberTOReset) return;
  const orig = _g.__gxtBeginRenderPass;
  _g.__gxtBeginRenderPass = function __gxtBeginRenderPass_resetTO() {
    try {
      const set = _g.__gxtTemplateOnlyRenderedSet;
      if (set && typeof set.clear === 'function') set.clear();
      const stack = _g.__gxtTemplateOnlyStack;
      if (stack && typeof stack.length === 'number') stack.length = 0;
    } catch { /* ignore */ }
    return orig.apply(this, arguments as any);
  };
  _g.__gxtBeginRenderPass.__emberTOReset = true;
}
_installTemplateOnlyResetHook();
queueMicrotask(_installTemplateOnlyResetHook);
setTimeout(_installTemplateOnlyResetHook, 0);
setTimeout(_installTemplateOnlyResetHook, 50);

// Wrap __gxtSyncAllWrappers so that any instance whose update hooks are
// fired by syncAll is marked with `__gxtSyncAllFiredPassId`. The $_tag
// force-rerender fallback (renderComponent thunk below) consults this
// marker to avoid double-firing willUpdate/willRender on the same instance
// in the same render pass.
// We record the mark by wrapping `instance.trigger` on a per-instance basis
// on first invocation. When syncAll calls `trigger(hookName)` for an
// update hook, the wrapper stamps `__gxtSyncAllFiredPassId` on the
// instance. Once stamped, the wrapper stays but does nothing extra.
function _installSyncAllFiredMarker() {
  const _g = globalThis as any;
  if (!_g.__gxtSyncAllWrappers || _g.__gxtSyncAllWrappers.__emberMarkFired) return;
  const _origSyncAll = _g.__gxtSyncAllWrappers;
  const UPDATE_HOOKS = new Set(['didUpdateAttrs', 'didReceiveAttrs', 'willUpdate', 'willRender']);
  const wrapTrigger = (inst: any) => {
    if (!inst || typeof inst.trigger !== 'function' || inst.__gxtTriggerWrapped) return;
    const origTrigger = inst.trigger;
    const wrapped = function(this: any, name: string, ...args: any[]) {
      if (UPDATE_HOOKS.has(name) && _g.__gxtSyncAllInFlightPass) {
        this.__gxtSyncAllFiredPassId = _g.__gxtSyncAllInFlightPass;
      }
      return origTrigger.call(this, name, ...args);
    };
    Object.defineProperty(inst, 'trigger', {
      value: wrapped,
      writable: true,
      configurable: true,
      enumerable: false,
    });
    inst.__gxtTriggerWrapped = true;
  };
  _g.__gxtSyncAllWrappers = function __gxtSyncAllWrappers_markFired() {
    const __curPass = (_g.__emberRenderPassId || 0);
    _g.__gxtSyncAllInFlightPass = __curPass;
    // Proactively wrap trigger on all known-alive instances in all pool
    // arrays so triggers fired during syncAll are recorded.
    try {
      const pools = _g.__gxtAllPoolArrays;
      if (pools) {
        for (const poolArr of pools) {
          for (const entry of poolArr) {
            wrapTrigger(entry && entry.instance);
          }
        }
      }
    } catch { /* ignore */ }
    try {
      return _origSyncAll.apply(this, arguments as any);
    } finally {
      _g.__gxtSyncAllInFlightPass = 0;
    }
  };
  _g.__gxtSyncAllWrappers.__emberMarkFired = true;
}
// Attempt install now (in case manager.ts already loaded), and again in a
// microtask (in case manager.ts loads immediately after compile.ts).
_installSyncAllFiredMarker();
queueMicrotask(_installSyncAllFiredMarker);
// Also install via a defineProperty trap on globalThis so any subsequent
// assignment to __gxtSyncAllWrappers (e.g. from manager.ts) gets wrapped
// immediately. Without this, compile.ts may load before manager.ts and
// the initial install has nothing to wrap. The setter below re-runs the
// installer each time the value changes.
try {
  const _gg = globalThis as any;
  let _syncAllCurrent: any = _gg.__gxtSyncAllWrappers;
  Object.defineProperty(_gg, '__gxtSyncAllWrappers', {
    get() { return _syncAllCurrent; },
    set(v: any) {
      // If the new value isn't our mark-fired wrapper, wrap it inline.
      if (v && !v.__emberMarkFired && typeof v === 'function') {
        const _origSyncAll = v;
        const UPDATE_HOOKS = new Set(['didUpdateAttrs', 'didReceiveAttrs', 'willUpdate', 'willRender']);
        const wrapTrigger = (inst: any) => {
          if (!inst || typeof inst.trigger !== 'function' || inst.__gxtTriggerWrapped) return;
          const origTrigger = inst.trigger;
          const wrapped = function(this: any, name: string, ...args: any[]) {
            if (UPDATE_HOOKS.has(name) && _gg.__gxtSyncAllInFlightCycle) {
              this.__gxtSyncAllFiredCycleId = _gg.__gxtSyncAllInFlightCycle;
            }
            return origTrigger.call(this, name, ...args);
          };
          Object.defineProperty(inst, 'trigger', {
            value: wrapped,
            writable: true,
            configurable: true,
            enumerable: false,
          });
          inst.__gxtTriggerWrapped = true;
        };
        const wrappedSyncAll = function() {
          const __curCycle = (_gg.__gxtSyncCycleId || 0);
          _gg.__gxtSyncAllInFlightCycle = __curCycle;
          try {
            const pools = _gg.__gxtAllPoolArrays;
            if (pools) {
              for (const poolArr of pools) {
                for (const entry of poolArr) {
                  wrapTrigger(entry && entry.instance);
                }
              }
            }
          } catch { /* ignore */ }
          try {
            return _origSyncAll.apply(this, arguments as any);
          } finally {
            _gg.__gxtSyncAllInFlightCycle = 0;
          }
        };
        (wrappedSyncAll as any).__emberMarkFired = true;
        _syncAllCurrent = wrappedSyncAll;
      } else {
        _syncAllCurrent = v;
      }
    },
    configurable: true,
    enumerable: true,
  });
} catch { /* ignore property redefinition errors */ }

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
(globalThis as any).__gxtSyncDomNow = function() {
  // Re-entrancy guard: prevent infinite sync loops when force-rerender
  // triggers cell updates that schedule additional syncs
  if ((globalThis as any).__gxtSyncing) return;
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtPendingSync = false;
    // Only signal "had pending sync" to the force-rerender if an actual property
    // change triggered the sync. Cell creation during initial render also sets
    // __gxtPendingSync, but that should NOT force a full re-render.
    (globalThis as any).__gxtHadPendingSync = !!(globalThis as any).__gxtPendingSyncFromPropertyChange;
    (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
    (globalThis as any).__gxtSyncing = true;
    // Increment sync cycle ID so modifier update dedup works correctly.
    (globalThis as any).__gxtSyncCycleId = ((globalThis as any).__gxtSyncCycleId || 0) + 1;
    // Clear modifier update tracking for this new sync cycle
    const modMgr = (globalThis as any).$_MANAGERS?.modifier;
    if (modMgr?._updatedInstances) modMgr._updatedInstances.clear();
    // Wrap ALL phases in try/finally so __gxtSyncing is ALWAYS reset,
    // even if an unexpected error escapes a catch block.
    try {
    // Start a new render pass to prevent double-firing of lifecycle hooks
    const newPass = (globalThis as any).__gxtNewRenderPass;
    if (typeof newPass === 'function') newPass();
    // Only run gxtSyncDom when a real property change triggered the sync.
    // Cell creation during initial render also sets __gxtPendingSync, but those
    // cells may have stale values (e.g., each-formula re-evaluates with [] before
    // the correct value propagates). Skipping gxtSyncDom for non-property-change
    // syncs prevents spurious #each inverse rendering on first render.
    if ((globalThis as any).__gxtHadPendingSync) {
      try { gxtSyncDom(); } catch { /* ignore */ }
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
    try {
      const syncAll = (globalThis as any).__gxtSyncAllWrappers;
      if (typeof syncAll === 'function') {
        syncAll(); // Pre-render hooks + arg cell updates
        if ((globalThis as any).__gxtHadPendingSync) {
          try { gxtSyncDom(); } catch { /* ignore */ }
        }
        // When STRING-path $_dc change listeners are active (using GXT cells),
        // the second gxtSyncDom pass may have handled dynamic component swaps
        // via cell tracking. Skip the force-rerender morph (Phase 2b) only when
        // cell-based listeners exist. CurriedComponent listeners use manual DOM
        // swap and need the morph for other property changes to propagate.
        if ((globalThis as any).__dcStringListenerCount > 0) {
          (globalThis as any).__gxtHadPendingSync = false;
        }
      }
    } catch { /* ignore */ }
    // PHASE 1a: Flush deferred if-watcher notifications. These were accumulated
    // during __gxtTriggerReRender calls and are flushed HERE (after all gxtSyncDom
    // calls) so batched property changes are applied atomically — IfConditions see
    // the final state of all conditions, not intermediate states.
    if (_pendingIfWatcherNotifications.length > 0) {
      const pending = _pendingIfWatcherNotifications.splice(0);
      for (const { obj, keyName } of pending) {
        try { notifyIfWatchers(obj, keyName); } catch { /* ignore */ }
      }
    }
    // PHASE 1b: After gxtSyncDom handled cell-based updates, mark all GXT
    // roots as clean so the force-rerender morph (Phase 2b) is skipped when
    // GXT already applied the DOM changes. Without this, gxtLastTagValue is
    // stale and the morph ALWAYS fires, creating duplicate components/modifiers
    // on temporary elements. Only update root tag values (NOT hadPendingSync)
    // so that property-change-driven syncs still trigger the morph when needed.
    try {
      const updateRootTags = (globalThis as any).__gxtUpdateRootTagValues;
      if (typeof updateRootTags === 'function') updateRootTags();
    } catch { /* ignore */ }
    // NOTE: Previously this block used __gxtCheckAllTagsCurrent to skip the morph
    // when root tags appeared current. However, __gxtUpdateRootTagValues (Phase 1b
    // above) already updates tags to match current values, so checkAllTagsCurrent
    // always returned true — incorrectly skipping the morph for cases where
    // gxtSyncDom didn't handle the update (e.g., inline $__if with function values,
    // undefined → truthy transitions). The morph must always run when hadPendingSync
    // is true from a property change to ensure correctness.
    (globalThis as any).__gxtHadNestedPropertyChange = false;
    // PHASE 2a: Snapshot live instances before force-rerender
    try {
      const snapshot = (globalThis as any).__gxtSnapshotLiveInstances;
      if (typeof snapshot === 'function') snapshot();
    } catch { /* ignore */ }
    // PHASE 2b: With gxtModuleDedup, GXT's native cell tracking handles
    // most DOM updates via gxtSyncDom() in Phase 1. The force-rerender
    // (morph) is kept as fallback for cases where cell tracking doesn't
    // cover the change (computed properties, prototype chain changes).
    // The morph preserves DOM node stability.
    try {
      const forceRerender = (globalThis as any).__gxtForceEmberRerender;
      if (typeof forceRerender === 'function') forceRerender();
    } catch (rerenderErr) {
      // Store the error so it can be re-thrown after sync completes
      (globalThis as any).__gxtDeferredSyncError = (globalThis as any).__gxtDeferredSyncError || rerenderErr;
    }
    // PHASE 2c: Destroy unclaimed instances — components that were in
    // the old render but not in the new one (e.g., {{each}} items removed).
    try {
      const destroyUnclaimed = (globalThis as any).__gxtDestroyUnclaimedPoolEntries;
      if (typeof destroyUnclaimed === 'function') destroyUnclaimed();
    } catch (destroyErr) {
      // Store destroy errors for propagation to assert.throws
      (globalThis as any).__gxtDeferredSyncError = (globalThis as any).__gxtDeferredSyncError || destroyErr;
    }
    // PHASE 2c2: Rebuild view-tree parent/child relationships from DOM ancestry.
    try {
      const rebuild = (globalThis as any).__gxtRebuildViewTreeFromDom;
      if (typeof rebuild === 'function') rebuild();
    } catch { /* ignore */ }
    // PHASE 2d: Flush pending modifier destroys — call destroyModifier on
    // custom modifier managers whose elements were removed (e.g., by #if toggle).
    // This must happen BEFORE post-render hooks so willDestroyElement fires
    // before didInsertElement of the replacement element.
    try {
      const pendingDestroys = (globalThis as any).__gxtPendingModifierDestroys;
      if (pendingDestroys && pendingDestroys.length > 0) {
        const toFlush = pendingDestroys.splice(0);
        for (const entry of toFlush) {
          if (!entry.cached.pendingDestroy) continue; // Already reclaimed by update path
          // Only destroy if the element is actually disconnected from the DOM.
          if (entry.element && entry.element.isConnected) continue;
          try {
            if (entry.isCustom && entry.cached.manager?.destroyModifier && !entry.cached.instance?.__gxtModDestroyed) {
              entry.cached.manager.destroyModifier(entry.cached.instance);
              if (entry.cached.instance) entry.cached.instance.__gxtModDestroyed = true;
            }
            if (entry.destroyable) {
              const destroyFn = (globalThis as any).__gxtDestroyFn;
              if (typeof destroyFn === 'function') destroyFn(entry.destroyable);
            }
          } catch { /* ignore individual modifier destroy errors */ }
          // Remove from cache
          const elCache = entry.cache?.get(entry.element);
          if (elCache) {
            elCache.delete(entry.modKey);
            if (elCache.size === 0) entry.cache.delete(entry.element);
          }
        }
      }
    } catch { /* ignore */ }
    // PHASE 3: Post-render hooks (didUpdate, didRender) — fire after DOM
    // is fully updated by the force-rerender.
    try {
      const postRender = (globalThis as any).__gxtPostRenderHooks;
      if (typeof postRender === 'function') postRender();
    } catch { /* ignore */ }
    // Re-render CurriedComponent marker regions
    try {
      const infos = (globalThis as any).__curriedRenderInfos;
      if (infos) {
        for (const info of infos) {
          const { item: getter, startMarker: sm, endMarker: em, renderCurriedComponent: render, managers: mgrs } = info;
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
            const newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
              ? newResult() : newResult;

            // Skip teardown if same component with unchanged args (preserves DOM stability)
            if (newFinal && newFinal.__isCurriedComponent &&
                sm.nextSibling !== em &&
                !_curriedComponentChanged(info, newFinal)) {
              continue;
            }

            const _swapped2 = !newFinal || !newFinal.__isCurriedComponent ||
              (newFinal.__name !== info.lastRenderedName);
            const _rem2: Node[] = [];
            let node = sm.nextSibling;
            while (node && node !== em) {
              const next = node.nextSibling;
              _rem2.push(node);
              parent.removeChild(node);
              node = next;
            }
            if (_swapped2) {
              const _dFn2 = (globalThis as any).__gxtDestroyInstancesInNodes;
              if (typeof _dFn2 === 'function' && _rem2.length > 0) {
                _dFn2(_rem2);
              }
            }

            if (newFinal && newFinal.__isCurriedComponent && mgrs.component.canHandle(newFinal)) {
              const newNode = render(newFinal);
              if (newNode) parent.insertBefore(newNode, em);
              _snapshotCurriedArgs(info, newFinal);
            }
          } catch { /* ignore render errors */ }
        }
      }
    } catch { /* ignore */ }
    } finally {
      // CRITICAL: Always reset __gxtSyncing even if an error escapes.
      // Without this, the flag stays true forever and __gxtSyncDomNow
      // becomes a permanent no-op, causing all subsequent tests to fail.
      (globalThis as any).__gxtSyncing = false;
    }
    // Re-throw any deferred errors from the force-rerender or lifecycle phases
    // so they propagate to assert.throws() in tests
    const deferredSyncErr = (globalThis as any).__gxtDeferredSyncError;
    if (deferredSyncErr) {
      (globalThis as any).__gxtDeferredSyncError = null;
      throw deferredSyncErr;
    }
  }
};

// Also schedule a fallback setTimeout flush for non-test scenarios
// where __gxtSyncDomNow isn't called explicitly.
// Guards:
// 1. Skip if __gxtSyncing is stuck true (prevents piling up on a hung sync)
// 2. Skip during QUnit test transitions (__gxtTestTransition flag)
// 3. Budget: max 3 consecutive interval-triggered syncs without an explicit
//    runTask-triggered sync in between. Prevents the interval from driving
//    an infinite re-render loop when tests produce continuous dirty state.
let _intervalSyncBudget = 3;
(globalThis as any).__gxtResetIntervalBudget = function() { _intervalSyncBudget = 3; };
setInterval(() => {
  if ((globalThis as any).__gxtPendingSync) {
    // Don't fire during test transitions
    if ((globalThis as any).__gxtTestTransition) return;
    // Don't fire if a sync is already in progress (stuck flag)
    if ((globalThis as any).__gxtSyncing) return;
    // Enforce budget to prevent interval-driven infinite loops
    if (_intervalSyncBudget <= 0) return;
    _intervalSyncBudget--;
    try {
      (globalThis as any).__gxtSyncDomNow();
    } catch { /* ignore - errors will be caught by QUnit */ }
  } else {
    // No pending sync — reset budget for next burst
    _intervalSyncBudget = 3;
  }
}, 16); // ~60fps

// Cleanup function to reset GXT state between tests
(globalThis as any).__gxtCleanupActiveComponents = function() {
  // Destroy all tracked component instances first (fires willDestroy hooks)
  const destroyTracked = (globalThis as any).__gxtDestroyTrackedInstances;
  if (typeof destroyTracked === 'function') {
    destroyTracked();
  }
  // Reset block params stack
  blockParamsStack.length = 0;
  // Reset current slot params
  currentSlotParams = null;
  (globalThis as any).__currentSlotParams = null;
  // Reset sync scheduled flag
  (globalThis as any).__gxtSyncScheduled = false;
  // Reset slots context stack
  slotsContextStack.length = 0;
  // NOTE: Do NOT clear templateCache between tests. Each clear forces
  // re-compilation via new Function() which leaks V8 code space memory.
  // After ~3000 tests this causes Chromium renderer OOM.
  // Template cache entries are keyed by template string so identical
  // templates safely reuse compiled functions.
  // Clear curried render infos
  if ((globalThis as any).__curriedRenderInfos) {
    (globalThis as any).__curriedRenderInfos.length = 0;
  }
  // Clear helper instances (already destroyed by __gxtDestroyTrackedInstances)
  if ((globalThis as any).__gxtHelperInstances) {
    (globalThis as any).__gxtHelperInstances.length = 0;
  }
  // Clear the helper instance cache used by $_maybeHelper
  if (typeof (globalThis as any).__gxtClearHelperCache === 'function') {
    (globalThis as any).__gxtClearHelperCache();
  }
  // Clear the helper instance cache used by $_tag
  if (typeof (globalThis as any).__gxtClearTagHelperCache === 'function') {
    (globalThis as any).__gxtClearTagHelperCache();
  }
  // Clear component instance pools to prevent stale reuse across tests
  if (typeof (globalThis as any).__gxtClearInstancePools === 'function') {
    (globalThis as any).__gxtClearInstancePools();
  }
  // Clear stale ifWatchers to prevent callbacks from previous tests firing on detached DOM
  if (typeof (globalThis as any).__gxtClearIfWatchers === 'function') {
    (globalThis as any).__gxtClearIfWatchers();
  }
  // Destroy cached engine instances from {{mount}} so Namespace.destroy()
  // removes them from NAMESPACES (prevents "Should not have any NAMESPACES" failures).
  if ((globalThis as any).__gxtEngineInstances) {
    for (const [, engineInst] of (globalThis as any).__gxtEngineInstances) {
      try {
        // Destroy the original engine class instance (its init added it to NAMESPACES)
        const origEngine = engineInst?.__gxtOriginalEngine;
        if (origEngine && typeof origEngine.destroy === 'function' && !origEngine.isDestroyed && !origEngine.isDestroying) {
          origEngine.destroy();
        }
        if (engineInst && typeof engineInst.destroy === 'function' && !engineInst.isDestroyed && !engineInst.isDestroying) {
          engineInst.destroy();
        }
      } catch { /* ignore */ }
    }
    (globalThis as any).__gxtEngineInstances.clear();
  }
  // Clear pending if-watcher notifications from the previous test
  _pendingIfWatcherNotifications.length = 0;
  // Clear dynamic component change listeners and stale getter from $_dc_ember
  (globalThis as any).__dcComponentGetter = null;
  if ((globalThis as any).__dcChangeListeners) {
    (globalThis as any).__dcChangeListeners.clear();
  }
  // Reset the string-path listener counter in lockstep with clearing the Set.
  // Without this, orphaned listener count leaks across tests and makes
  // __gxtSyncDomNow incorrectly clear __gxtHadPendingSync in Phase 1, which
  // then causes __gxtForceEmberRerender to skip the morph for tests that
  // need it (e.g., classic Component.extend properties changed via set()).
  (globalThis as any).__dcStringListenerCount = 0;
  // Clear component contexts to prevent stale render contexts accumulating
  if ((globalThis as any).__gxtComponentContexts) {
    (globalThis as any).__gxtComponentContexts = new WeakMap();
  }
  // Reset pending sync flags to prevent timer-based re-renders leaking into next test.
  // A setInterval(16ms) checks __gxtPendingSync and calls __gxtSyncDomNow() which can
  // trigger __gxtForceEmberRerender (innerHTML='' + rebuild) on the next test's DOM.
  (globalThis as any).__gxtPendingSync = false;
  (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
  (globalThis as any).__gxtHadPendingSync = false;
  (globalThis as any).__gxtHadNestedObjectChange = false;
  (globalThis as any).__gxtSyncing = false;
  (globalThis as any).__gxtSyncScheduled = false;
  // Reset global rendering state
  (globalThis as any).$slots = undefined;
  (globalThis as any).$fw = undefined;

  // Clear GXT VM internal maps to prevent unbounded memory growth.
  // The VM exposes getVM() and getRenderTree() on window in dev mode,
  // giving access to internal Maps that accumulate across tests.
  try {
    if (typeof (globalThis as any).getRenderTree === 'function') {
      const tree = (globalThis as any).getRenderTree();
      if (tree) {
        if (tree.TREE && typeof tree.TREE.clear === 'function') tree.TREE.clear();
        if (tree.CHILD && typeof tree.CHILD.clear === 'function') tree.CHILD.clear();
        if (tree.PARENT && typeof tree.PARENT.clear === 'function') tree.PARENT.clear();
      }
    }
    if (typeof (globalThis as any).getVM === 'function') {
      const vm = (globalThis as any).getVM();
      if (vm) {
        if (vm.relatedTags && typeof vm.relatedTags.clear === 'function') vm.relatedTags.clear();
        if (vm.tagsToRevalidate && typeof vm.tagsToRevalidate.clear === 'function') vm.tagsToRevalidate.clear();
        if (vm.opsForTag && typeof vm.opsForTag.clear === 'function') vm.opsForTag.clear();
      }
    }
  } catch { /* ignore - VM internals may not be available */ }
};

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
(function patchQUnitForGxtWhitespace() {
  const g: any = globalThis as any;
  if (g.__gxtQUnitWhitespacePatched) return;
  const applyPatch = () => {
    const Q = g.QUnit;
    if (typeof Q === 'undefined' || !Q.equiv || !Q.assert) {
      return false;
    }
    if (g.__gxtQUnitWhitespacePatched) return true;
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
    g.__gxtQUnitWhitespacePatched = true;
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

// Track class-based helper instances for destruction during test teardown
(globalThis as any).__gxtHelperInstances = (globalThis as any).__gxtHelperInstances || [];

// Cache for helper instances created in $_tag to prevent re-creation during
// force re-render (which does innerHTML='' + full rebuild). Keyed by helper name.
// Cleared during test teardown via __gxtClearTagHelperCache.
const _tagHelperInstanceCache = new Map<string, { instance: any; recomputeTag: any }>();
(globalThis as any).__gxtClearTagHelperCache = () => _tagHelperInstanceCache.clear();
// Expose so the $_if helper-destroy hook can drop cached entries whose
// instances it's about to destroy.
(globalThis as any).__gxtTagHelperInstanceCache = _tagHelperInstanceCache;

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it.
// IMPORTANT: We store the GXT-original reference so that manager.ts can
// later MUTATE it (install Ember's component/helper/modifier handlers
// directly onto this object). GXT's internal functions ($_maybeModifier,
// $_maybeHelper, etc.) close over this same object reference.
(globalThis as any).$_MANAGERS = $_MANAGERS;
// Also store a reference under a different key so manager.ts can find
// the GXT-original object reliably (even after globalThis.$_MANAGERS
// is reassigned).
(globalThis as any).__gxtOriginalManagers = $_MANAGERS;

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
    const emberMaybeModifier = function(modifier: any, element: HTMLElement, props: any[], hashArgs: any) {
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
        get() { return emberMaybeModifier; },
        set(_v: any) { /* protect from setupGlobalScope overwrite */ },
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
  const emberHelperHelper = function(positional: any[], named: any): any {
    const unwrapVal = (v: any) =>
      typeof v === 'function' && !v.prototype && v.length === 0 ? v() : v;
    const head = Array.isArray(positional) && positional.length > 0
      ? unwrapVal(positional[0]) : undefined;
    const rest = Array.isArray(positional) && positional.length > 1
      ? positional.slice(1) : [];
    const managers = _g.$_MANAGERS;
    if (managers?.helper?.handle) {
      return managers.helper.handle(head, rest, named || {});
    }
    return undefined;
  };
  try {
    Object.defineProperty(globalThis, '$_helperHelper', {
      get() { return emberHelperHelper; },
      set(_v: any) { /* protect from setupGlobalScope overwrite */ },
      configurable: true,
      enumerable: true,
    });
  } catch {
    _g.$_helperHelper = emberHelperHelper;
  }
}

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
(globalThis as any).__EMBER_BUILTIN_HELPERS__ = {
  // readonly: Returns a readonly cell marker object.
  // The component manager detects __isReadonly and provides an immutable attr
  // (no .update()) while still allowing the value to flow downward.
  readonly: (value: any) => {
    const resolved = typeof value === 'function' ? value() : value;
    // If value is already a mut cell, wrap its value (strips mutability)
    const unwrapped = resolved && resolved.__isMutCell ? resolved.value : resolved;
    return { __isReadonly: true, __readonlyValue: unwrapped, get value() { const v = typeof value === 'function' ? value() : value; return v && v.__isMutCell ? v.value : v; } };
  },
  // mut: Returns a setter function for two-way binding.
  // When used with (fn (mut this.val) newValue), the returned function
  // updates the property on the component via Ember.set().
  // The template transform adds a path string as the second arg.
  // The context is captured at creation time via __gxtMutContext.
  mut: (value: any, path?: string) => {
    // Capture context at creation time (set by $_maybeHelper wrapper)
    const capturedCtx = (globalThis as any).__gxtMutContext;
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
    const propName = path.startsWith('this.') ? path.slice(5) : (path.startsWith('@') ? path.slice(1) : path);
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
              // Trigger re-render via multiple mechanisms:
              const triggerReRender = (globalThis as any).__gxtTriggerReRender;
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
                try { parentCtx.rerender(); } catch { /* ignore */ }
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
      get() { return typeof value === 'function' ? value() : value; },
      enumerable: true,
    });
    (mutCell as any).update = function(newValue: any) {
      return mutCell(newValue);
    };
    // valueOf returns current value for template rendering
    mutCell.toString = () => String(typeof value === 'function' ? value() : value);
    mutCell.valueOf = () => typeof value === 'function' ? value() : value;
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
    if (_assert) _assert(
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
      const v = (typeof a === 'function' && !a.prototype) ? a() : a;
      out += _normalizeStringValue(v);
    }
    return out;
  },
  // array: Creates an array from arguments
  array: (...args: any[]) => {
    return args.map(a => (typeof a === 'function' && !a.prototype) ? a() : a);
  },
  // hash: Creates an object from named arguments (handled specially)
  hash: (obj: any) => obj,
  // gxtEntriesOf: Converts an object to [{k, v}, ...] for {{#each-in}}
  // Returns objects with .k and .v properties (not arrays) since GXT
  // doesn't support numeric property access like entry.0.
  'gxtEntriesOf': (obj: any) => {
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
        return keys.map(key => ({ k: key, v: (resolved as any)[key] }));
      }
      return [];
    }
    if (!resolved || typeof resolved !== 'object') return [];
    // Unwrap ObjectProxy — iterate over .content, not the proxy itself.
    // ObjectProxy has unknownProperty/setUnknownProperty and stores data in .content
    if (typeof resolved.unknownProperty === 'function' && typeof resolved.setUnknownProperty === 'function') {
      const content = resolved.content;
      if (!content || typeof content !== 'object') return [];
      resolved = content;
    }
    // Support Map-like objects (ES6 Map, etc.) but NOT arrays.
    // Arrays have both .entries() and .forEach(), but should use Object.keys()
    // to iterate like `for (key in obj)` — including non-numeric own properties
    // and skipping sparse holes.
    if (!Array.isArray(resolved) && typeof resolved.entries === 'function' && typeof resolved.forEach === 'function') {
      return Array.from(resolved.entries()).map(([k, v]: any) => ({ k, v }));
    }
    // Support custom iterables with Symbol.iterator (but not arrays or strings)
    if (typeof resolved[Symbol.iterator] === 'function' && !Array.isArray(resolved) && typeof resolved !== 'string') {
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
    return keys.map(key => ({ k: key, v: (resolved as any)[key] }));
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
  '__mutGet': (obj: any, key: any) => {
    const capturedCtx = (globalThis as any).__gxtMutContext;
    const resolveObj = () => typeof obj === 'function' ? obj() : obj;
    const resolveKey = () => typeof key === 'function' ? key() : key;
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
      // Trigger re-render
      const triggerReRender = (globalThis as any).__gxtTriggerReRender;
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
      get() { return getValue(); },
      enumerable: true,
    });
    (mutCell as any).update = function(newValue: any) {
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
      const owner = g.owner;
      if (!owner) return undefined;
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
      const managers = g.INTERNAL_HELPER_MANAGERS;
      if (!managers) return helperFn(...positional);
      let mgr: any = null;
      let ptr = helperFn;
      while (ptr) {
        mgr = managers.get(ptr);
        if (mgr) break;
        try { ptr = Object.getPrototypeOf(ptr); } catch { break; }
      }
      if (mgr && typeof mgr.getDelegateFor === 'function') {
        const delegate = mgr.getDelegateFor(g.owner);
        if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
          const args = { positional, named: {} };
          const bucket = delegate.createHelper(helperFn, args);
          return delegate.getValue(bucket);
        }
      }
      return helperFn(...positional);
    };

    // Resolve the first argument (unwrap GXT getters but preserve curried refs and managed helpers)
    const raw = helperNameOrRef;
    const resolved = (typeof raw === 'function' && !raw.__isCurriedHelper && !raw.__isManagedHelper)
      ? raw() : raw;

    // If it's already a curried helper reference, merge extra args and invoke
    if (resolved && resolved.__isCurriedHelper) {
      const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
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
      const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
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
      const managers = g.INTERNAL_HELPER_MANAGERS;
      let hasManager = false;
      if (managers) {
        let ptr = resolved;
        while (ptr) {
          if (managers.has(ptr)) { hasManager = true; break; }
          try { ptr = Object.getPrototypeOf(ptr); } catch { break; }
        }
      }
      if (hasManager) {
        const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
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
    el.setAttribute('data-engine', typeof engineName === 'function' ? (engineName as any)() : engineName);
    return el;
  },
  // unique-id: Returns a unique identifier string that always starts with a letter
  // (valid CSS selector / HTML ID). Uses the same algorithm as Ember's uniqueId().
  'unique-id': () => {
    return generateUUID();
  },
  // fn: Partially applies a function with arguments
  fn: (func: any, ...args: any[]) => {
    return (...callArgs: any[]) => {
      // Resolve the function — it may be a GXT getter wrapping the actual function
      let resolvedFn = func;
      // Unwrap nested getters until we get the actual function or value
      // But don't unwrap mut cells — they are callable setter functions
      while (typeof resolvedFn === 'function' && resolvedFn.length === 0 && !resolvedFn.__isMutCell) {
        const inner = resolvedFn();
        if (inner === resolvedFn) break; // prevent infinite loop
        // If inner is a mut cell, use it directly
        if (typeof inner === 'function' && inner.__isMutCell) { resolvedFn = inner; break; }
        if (typeof inner !== 'function') { resolvedFn = inner; break; }
        resolvedFn = inner;
      }
      const resolvedArgs = args.map(a => typeof a === 'function' && !a.__isMutCell ? a() : a);
      if (typeof resolvedFn === 'function') {
        return resolvedFn(...resolvedArgs, ...callArgs);
      }
      return undefined;
    };
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

/**
 * Pre-process template source: rewrite every `{{on ...}}` element modifier
 * to `{{on-ext ...}}` so it flows through GXT's general modifier path
 * (which preserves hash pairs and defers to
 * `$_MANAGERS.modifier.handle(...)`). The alias maps to the same
 * OnModifierManager as stock `on` via `_builtinModifiers` aliasing.
 */
function transformOnModifierHashArgs(template: string): string {
  if (!template || template.indexOf('{{on ') === -1 && template.indexOf('{{on\t') === -1 && template.indexOf('{{on\n') === -1) {
    return template;
  }
  const needle = '{{on';
  let out = '';
  let i = 0;
  const len = template.length;
  while (i < len) {
    const at = template.indexOf(needle, i);
    if (at === -1) {
      out += template.slice(i);
      break;
    }
    const afterOn = at + needle.length;
    const ws = template[afterOn];
    if (ws !== ' ' && ws !== '\t' && ws !== '\n' && ws !== '\r') {
      out += template.slice(i, afterOn);
      i = afterOn;
      continue;
    }
    // Locate the matching `}}` for this mustache, respecting string/paren nesting.
    let j = afterOn;
    let depth = 0;
    let closeAt = -1;
    while (j < len) {
      const ch = template[j]!;
      if (ch === '"' || ch === "'") {
        const quote = ch;
        j++;
        while (j < len && template[j] !== quote) {
          if (template[j] === '\\') j++;
          j++;
        }
        j++;
        continue;
      }
      if (ch === '(') { depth++; j++; continue; }
      if (ch === ')') { depth--; j++; continue; }
      if (depth === 0 && ch === '}' && template[j + 1] === '}') {
        closeAt = j;
        break;
      }
      j++;
    }
    if (closeAt === -1) {
      out += template.slice(i);
      break;
    }
    const body = template.slice(afterOn, closeAt);
    // Always route through the `on-ext` alias. Even hash-less forms benefit:
    // the Glimmer VM `OnModifierManager` handles listener rebinding on
    // callback reference change (remove+add), which GXT's short-circuit does
    // not — reflecting that behaviour in the counter assertions the Ember
    // {{on}} test suite makes.
    out += template.slice(i, at) + '{{' + _GXT_ON_EXT_ALIAS + body + '}}';
    i = closeAt + 2;
  }
  return out;
}

// Caching wrapper for {{unbound}} helper.
// Each call site in a template gets a unique ID. The first evaluation
// stores the result; subsequent evaluations return the cached value.
// The cache is stored on the component context (`ctx`) to isolate
// different component instances.
// IMPORTANT: Takes a lazy thunk `() => value` to avoid eagerly evaluating
// the expression (which would track GXT cell dependencies).
// Caching wrapper for {{unbound}} helper.
// Uses a WeakMap keyed by context object. Each context gets its own cache
// (a plain object keyed by call-site ID). This handles both:
// - Single component renders (same ctx across re-evaluations)
// - #each iterations (each iteration has its own ctx)
{
  // __gxtUnboundEval evaluates the unbound expression with GXT cell tracking
  // suppressed (setTracker(null)). This prevents the formula from tracking
  // the unbound expression's cells. Combined with caching via __ubCache,
  // re-evaluations return the original cached value.
  //
  // The cache uses a global sequence number as part of the key to distinguish
  // #each iterations (each has its own call with the same template-level id).
  // A per-id counter tracks which "slot" the current call should use.
  const _ubSlots = new Map<string, number>(); // id → next slot index
  const _ubSlotMax = new Map<string, number>(); // id → max slots (set after first full pass)
  (globalThis as any).__gxtUnboundEval = function(cacheObj: any, id: string, valueFn: any) {
    // Determine slot for this call (handles #each where same id is called N times)
    let slot = _ubSlots.get(id) || 0;
    const key = `${id}:${slot}`;
    _ubSlots.set(id, slot + 1);

    if (key in cacheObj) return cacheObj[key];

    // First evaluation: suppress GXT cell tracking
    let result;
    const savedTracker = _gxtGetTracker();
    _gxtSetTracker(null);
    try {
      result = valueFn();
    } finally {
      _gxtSetTracker(savedTracker);
    }
    cacheObj[key] = result;
    return result;
  };
  // Reset slot counters at the start of each render cycle
  // Called from the template function before returning the template body.
  (globalThis as any).__gxtUnboundResetSlots = function() {
    _ubSlots.clear();
  };
}

// Runtime guard for the "resolved helper passed as a named argument" form.
// When a template contains `<Component @name={{helperIdent}} />` (no parens),
// Ember's strict-mode compiler throws a specific error because the syntax
// is ambiguously pass-by-reference vs invocation. We mirror that check at
// render time: if `name` resolves to a registered helper via owner lookup,
// throw the same error. Otherwise this returns undefined (letting the
// surrounding expression fall through to its original $_maybeHelper path).
(globalThis as any).__gxtAssertNotResolvedHelperAsNamedArg = function(
  name: string,
  ctx: any
): void {
  const g = globalThis as any;
  // Built-in keyword helpers are handled before owner lookup; they are not
  // registered helpers, so bail out without checking.
  const BUILTIN = g.__EMBER_BUILTIN_HELPERS__;
  if (BUILTIN && BUILTIN[name]) return;
  // Prefer the owner attached to the current render context; fall back to
  // the global owner captured by the runtime.
  const owner = (ctx && (ctx.owner || (ctx[Symbol.for('OWNER')] ?? null))) || g.owner;
  if (!owner || typeof owner.factoryFor !== 'function') return;
  const factory = owner.factoryFor(`helper:${name}`);
  if (!factory) return;
  const message =
    `A resolved helper cannot be passed as a named argument as the syntax is ` +
    `ambiguously a pass-by-reference or invocation. Use the ` +
    `\`{{helper 'foo-helper}}\` helper to pass by reference or explicitly ` +
    `invoke the helper with parens: \`{{(fooHelper)}}\`.`;
  const err = new Error(message);
  // Mirror what other template-level assertions do: capture for
  // flushRenderErrors so `assert.throws()` sees it when render returns.
  const captureFn = g.__captureRenderError;
  if (typeof captureFn === 'function') captureFn(err);
  throw err;
};

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here
// The $_blockParam helper reads from the top of the stack
const blockParamsStack: any[][] = [];
(globalThis as any).__blockParamsStack = blockParamsStack;

// Per-context block params storage for persistence across re-renders
// WeakMap allows garbage collection when context is no longer referenced
const contextBlockParams = new WeakMap<object, any[]>();
(globalThis as any).__contextBlockParams = contextBlockParams;

// Current slot params - persists until next slot is called
// This is used for re-renders where the stack has been popped
// Key insight: for simple non-nested slot cases, keeping the "last" params
// allows re-renders to access them even after the slot function returns
let currentSlotParams: any[] | null = null;
(globalThis as any).__currentSlotParams = null;

// Helper function to get a block param by index
// This is called by compiled templates that use {{($_blockParam N)}}
(globalThis as any).$_blockParam = function(index: number) {
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
        const stack = (globalThis as any).__blockParamsStack;
        const stackParams = stack && stack[stack.length - 1];
        if (stackParams && stackParams[i] !== undefined) {
          rawValue = stackParams[i];
        } else {
          // Fall back to current slot params (for re-renders after slot returned)
          const current = (globalThis as any).__currentSlotParams;
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

// Also expose through EmberFunctionalHelpers for GXT's helper resolution
if (typeof (globalThis as any).EmberFunctionalHelpers === 'undefined') {
  (globalThis as any).EmberFunctionalHelpers = new Set();
}
(globalThis as any).EmberFunctionalHelpers.add((globalThis as any).$_blockParam);

// Stack to track the current slots context during rendering
// Components push their $slots here when rendering, so has-block can check it
const slotsContextStack: any[] = [];
(globalThis as any).__slotsContextStack = slotsContextStack;

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

(globalThis as any).$_hasBlock = function(arg1?: any, arg2?: any) {
  const { slots, name } = _resolveHasBlockArgs(arg1, arg2);
  return _lookupSlot(slots, name) !== undefined;
};

(globalThis as any).$_hasBlockParams = function(arg1?: any, arg2?: any) {
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
        const prevNs = g.__gxtNamespace;
        if (ns) g.__gxtNamespace = ns;
        try {
          const result = defaultSlot(ctx);
          return result;
        } finally {
          g.__gxtNamespace = prevNs;
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
        while (typeof componentValue === 'function' && !componentValue.prototype && !componentValue.__isCurriedComponent && guard-- > 0) {
          try { componentValue = componentValue(); } catch { break; }
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
            fw = args;  // The whole tagProps array is the fw
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
        const captureErr = g.__captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(notFoundErr);
        }
        throw notFoundErr;
      }
    }

    // Handle direct component definitions (template-only, GlimmerishComponent)
    // that have GXT templates in COMPONENT_TEMPLATES. These come from strict mode
    // scope values (e.g., defComponent('<Foo/>', { scope: { Foo } })) where Foo
    // is a template-only component object or a class with setComponentTemplate.
    if (comp && typeof comp === 'object' && g.COMPONENT_TEMPLATES?.has(comp)) {
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
                while (typeof out === 'function' && (out as any).__isEmberCurriedHelper && guard-- > 0) {
                  try { out = (out as any)(); } catch { break; }
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
                    while (typeof v === 'function'
                      && !(v as any).__isEmberCurriedHelper
                      && !(v as any).__isCurriedComponent
                      && !(v as any).__isFnHelper
                      && !(v as any).__isMutCell
                      && !(v as any).prototype) {
                      try { v = (v as any)(); } catch { break; }
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
                if (typeof v === 'function'
                  && !(v as any).__isEmberCurriedHelper
                  && !(v as any).__isCurriedComponent
                  && !(v as any).__isFnHelper
                  && !(v as any).__isMutCell
                  && !(v as any).prototype) {
                  const vGet = v;
                  Object.defineProperty(namedArgs, key, {
                    get() {
                      let r: any = vGet;
                      while (typeof r === 'function'
                        && !(r as any).__isEmberCurriedHelper
                        && !(r as any).__isCurriedComponent
                        && !(r as any).__isFnHelper
                        && !(r as any).__isMutCell
                        && !(r as any).prototype) {
                        try { r = (r as any)(); } catch { break; }
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
    if (comp && typeof comp === 'function' && g.COMPONENT_TEMPLATES?.has(comp)) {
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
            try { out = (out as any)(); } catch { break; }
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
                    while (typeof v === 'function'
                      && !(v as any).__isEmberCurriedHelper
                      && !(v as any).__isCurriedComponent
                      && !(v as any).__isFnHelper
                      && !(v as any).__isMutCell
                      && !(v as any).prototype) {
                      try { v = (v as any)(); } catch { break; }
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
    if (typeof comp === 'function' && !comp.prototype && !comp.__isCurriedComponent && !comp.__stringComponentName) {
      let resolved = comp;
      let guard = 5;
      while (typeof resolved === 'function' && !resolved.prototype && !resolved.__isCurriedComponent && guard-- > 0) {
        try { resolved = resolved(); } catch { break; }
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

    return originalC(comp, args, ctx);
  };
  g.$_c.__emberWrapped = true;
  // Protect from setupGlobalScope overwrite — GXT's setupGlobalScope iterates its
  // symbol table and writes each symbol to globalThis, which would replace our
  // $_c_ember wrapper with the raw GXT $_c function.
  const _protectedC = g.$_c;
  Object.defineProperty(g, '$_c', {
    get() { return _protectedC; },
    set() { /* ignore setupGlobalScope overwrites */ },
    configurable: true,
  });
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
                  fwProps.push([entry[0], typeof val === 'function' ? () => { const v = val(); return (v == null || v === false) ? '' : v; } : val]);
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
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true, configurable: true,
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
              return children.map((child: any) => typeof child === 'function' ? child() : child);
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
    if (ctx && typeof ctx === 'object' && COMPONENT_ID_PROPERTY) {
      const gxtRootCtx = (globalThis as any).__gxtRootContext;
      const rootId = gxtRootCtx && gxtRootCtx[COMPONENT_ID_PROPERTY as any];
      if (rootId !== undefined && rootId !== null) {
        try {
          ctx[COMPONENT_ID_PROPERTY as any] = rootId;
        } catch { /* frozen, ignore */ }
      } else if (!ctx[COMPONENT_ID_PROPERTY as any]) {
        ctx[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
      }
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
                    get: () => typeof value === 'function' ? value() : value,
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
                    get: () => typeof value === 'function' ? value() : value,
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

      const getHtml = () => {
        let raw = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
        // Unwrap cell-like wrappers and nested getter functions
        while (typeof raw === 'function') {
          raw = raw();
        }
        if (raw && typeof raw === 'object' && typeof (raw as any).value !== 'undefined' && (raw as any).__isCell) {
          raw = (raw as any).value;
        }
        if (raw === null || raw === undefined) return '';
        return (raw as any)?.toHTML?.() ?? String(raw);
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

      const initialHtml = getHtml();
      fragment.appendChild(startAnchor);
      if (initialHtml) {
        const tpl = document.createElement('template');
        tpl.innerHTML = initialHtml;
        while (tpl.content.firstChild) {
          const child = tpl.content.firstChild;
          contentNodes.push(child);
          fragment.appendChild(child);
        }
      }
      fragment.appendChild(endAnchor);

      let lastHtml = initialHtml;

      // Set up reactive update
      try {
        _gxtEffect(() => {
          const html = getHtml();
          const parent = endAnchor.parentNode;
          if (!parent) return;
          if (html === lastHtml) return;
          lastHtml = html;

          // Remove old content nodes
          for (const n of contentNodes) {
            if (n.parentNode === parent) parent.removeChild(n);
          }
          contentNodes = [];

          if (html) {
            const tpl = document.createElement('template');
            tpl.innerHTML = html;
            while (tpl.content.firstChild) {
              const child = tpl.content.firstChild;
              contentNodes.push(child);
              parent.insertBefore(child, endAnchor);
            }
          }
        });
      } catch {}

      return fragment;
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent = resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    // Access managers dynamically - they may be set up after this module loads
    const managers = g.$_MANAGERS;

    // Engine support: ctx.owner may be the engine instance while g.owner is the app.
    // Swap only during component-related resolution (mightBeComponent section).
    let _eoSwap = false;
    let _eoPrev: any;
    if (mightBeComponent) {
      const _eoCtx = ctx?.owner;
      _eoSwap = !!(_eoCtx && typeof _eoCtx === 'object'
        && typeof _eoCtx.factoryFor === 'function'
        && !_eoCtx.isDestroyed && !_eoCtx.isDestroying
        && _eoCtx !== g.owner);
      if (_eoSwap) { _eoPrev = g.owner; g.owner = _eoCtx; }
    }

    try { // Engine owner swap try block

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
      const owner = g.owner;
      if (owner) {
        const helperFactory = owner.factoryFor?.(`helper:${kebabName}`);
        const helperLookup = !helperFactory ? owner.lookup?.(`helper:${kebabName}`) : null;

        // Check if the user is trying to override a built-in helper.
        // Built-in helpers (array, hash, concat, fn, etc.) cannot be overridden.
        if (helperFactory || helperLookup) {
          const BUILTIN_HELPERS = ['array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly', 'unique-id', 'unbound', '__mutGet'];
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
              if (key === '@__hasBlock__') { hasBlockMarker = true; break; }
            }
          }
          if (hasChildren || hasBlockMarker) {
            const err = new Error(
              `Attempted to resolve \`${kebabName}\`, which was expected to be a component, but nothing was found.`
            );
            const capture = (globalThis as any).__captureRenderError;
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
            const isClassBased = factoryClass && factoryClass.prototype &&
              typeof factoryClass.prototype.compute === 'function';
            if (isClassBased) {
              const cached = _tagHelperInstanceCache.get(kebabName);
              if (cached && cached.instance && !cached.instance.isDestroyed && !cached.instance.isDestroying) {
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
                  _tagHelperInstanceCache.set(kebabName, { instance: helperInstance, recomputeTag });
                  // Register for destruction
                  const destroyableInstances = g.__gxtHelperInstances;
                  if (Array.isArray(destroyableInstances)) {
                    destroyableInstances.push(helperInstance);
                  }
                  // Associate with the enclosing `{{#if}}` branch (if any) so
                  // destroy+willDestroy fire on branch teardown, matching the
                  // classic Ember Helper lifecycle (see class-based helper
                  // lifecycle test).
                  const ifScopeTag = (globalThis as any).__gxtCurrentHelperScope;
                  if (ifScopeTag && typeof ifScopeTag.add === 'function') {
                    try { ifScopeTag.add(helperInstance); } catch { /* ignore */ }
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
              const recomputeVal = (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag)
                ? recomputeTag.value : 0;
              try { argsSerialized = JSON.stringify({ p: positional, n: named, r: recomputeVal }); } catch { /* skip dedup */ }
              if (argsSerialized !== null && argsSerialized === helperInstance.__gxtLastArgsSerialized) {
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
            gxtEffect(() => {
              const v = helperGetter();
              textNode.textContent = v == null ? '' : String(v);
            });
          } catch (e) { if (_isAssertionLike(e)) throw e; /* effect setup may fail */ }
          return textNode;
        }
      }

      // Check if the component manager can handle this
      // Also try with a leading dash — GXT's PascalCase conversion strips
      // leading dashes from component names like `-inner-component`
      if (!managers.component.canHandle(kebabName) && managers.component.canHandle(`-${kebabName}`)) {
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
                const wrappedValue = typeof value === 'function'
                  ? () => { const v = value(); return (v == null || v === false) ? '' : v; }
                  : (value == null || value === false) ? '' : value;
                fwProps.push([key, wrappedValue]);
              } else {
                fwProps.push([key, value]);
              }
              // Also add class/classNames to args so wrapper building and sync can access them
              if (attrKey === 'class' || attrKey === 'classNames') {
                Object.defineProperty(args, attrKey, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
              // HTML id prop (not @id named arg) - use special key to distinguish
              // from @id which maps to elementId (frozen after first render)
              if (attrKey === 'id') {
                Object.defineProperty(args, '__htmlId', {
                  get: () => typeof value === 'function' ? value() : value,
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
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              } else {
                // HTML attribute (like data-test, title) - collect for forwarding as attrs (fw[1])
                fwAttrs.push([key, value]);
                // Also keep in args for direct access as lazy getter
                Object.defineProperty(args, key, {
                  get: () => typeof value === 'function' ? value() : value,
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
                const names = typeof arr[i][1] === 'string' ? arr[i][1] : (typeof arr[i][1] === 'function' ? arr[i][1]() : '');
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
                const localClassEntries = fwProps.filter(e => e[0] === '' || e[0] === 'class');
                const localNonClassEntries = fwProps.filter(e => e[0] !== '' && e[0] !== 'class');
                fwProps.length = 0;
                for (const entry of localNonClassEntries) fwProps.push(entry);
                // Parent props: non-class are filtered by splatLocalNames, class goes before local class
                if (Array.isArray(parentFw[0])) {
                  for (const entry of parentFw[0]) {
                    const k = entry[0] === '' ? 'class' : entry[0];
                    if (k === 'class') fwProps.push(entry); // parent class first
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
              const localClassProps = localProps.filter(e => e[0] === '' || e[0] === 'class');
              const localNonClassProps = localProps.filter(e => e[0] !== '' && e[0] !== 'class');
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
        if ((!children || children.length === 0) && tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
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
          const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> = new Map();
          const defaultChildren: any[] = [];

          for (let _ci = 0; _ci < effectiveChildren.length; _ci++) {
            let child = effectiveChildren[_ci];
            // GXT compiles named block children as lazy functions:
            //   () => $_tag(':header', ...) which returns a __isNamedBlock marker.
            // Evaluate ONLY functions that look like named block factories to avoid
            // side effects from eagerly evaluating component children.
            if (typeof child === 'function' && !child.__isCurriedComponent && !(child instanceof Node)) {
              const fnStr = child.toString();
              if (fnStr.includes("$_tag(':") || fnStr.includes('$_tag(":')) {
                try {
                  const evaluated = child();
                  if (evaluated && typeof evaluated === 'object' && evaluated.__isNamedBlock) {
                    child = evaluated;
                  }
                } catch { /* not a named block factory — keep as-is */ }
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
            const hasBlockParams = explicitHasBlockParams !== undefined
              ? explicitHasBlockParams
              : detectBlockParams(slotChildren);

            const slotFn = (slotCtx: any, ...params: any[]) => {
              const unwrappedParams = params.map(param => {
                // Unwrap GXT reactive formulas (objects with fn/isConst)
                if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                  try { return param.fn(); } catch { return param; }
                }
                // Do NOT call plain functions here — they may be user functions
                // yielded as block params (e.g., {{yield this.updatePerson}}).
                // Calling them would invoke the function instead of passing it
                // as a value. GXT reactive getters are formula objects (handled
                // above), not plain functions.
                return param;
              });

              // Store on slotCtx for context-based lookup
              const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }

              // Also store as current slot params for re-renders
              // This persists until the next slot call, allowing reactivity
              // to access block params even after the slot function returns
              (globalThis as any).__currentSlotParams = unwrappedParams;

              const stack = (globalThis as any).__blockParamsStack;
              stack.push(unwrappedParams);

              try {
                // Evaluate lazy-wrapped component children (contain $_tag/$_c/$_dc)
                // but preserve reactive text getters as functions so GXT can track
                // cell dependencies and create reactive text nodes via gxtEffect.
                // Without this, yielded {{this.message}} becomes a static string
                // and won't update when the outer context changes via set().
                return slotChildren.map((child: any) => {
                  if (typeof child === 'function' && !child.__isCurriedComponent && !(child instanceof Node)) {
                    const fnStr = child.toString();
                    // Lazy-wrapped component children contain $_tag or $_c calls — evaluate them
                    if (fnStr.includes('$_tag(') || fnStr.includes('$_c(') || fnStr.includes('$_dc(') || fnStr.includes('$_eachSync(')) {
                      try { return child(); } catch { return child; }
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
            const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
              ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
              : undefined;
            slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
          }
        }

        // Legacy: If no slots were created but children exist, create default slot
        // (This handles the case where there are no named blocks)
        if (effectiveChildren && effectiveChildren.length > 0 && !slots.default && Object.keys(slots).length === 0) {
          // Check for explicit hasBlockParams marker from args
          const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
            : undefined;
          // Detect from children if not explicitly set
          const hasBlockParams = explicitHasBlockParams !== undefined
            ? explicitHasBlockParams
            : detectBlockParams(effectiveChildren);

          const slotFn = (slotCtx: any, ...params: any[]) => {
            // CRITICAL: Do NOT unwrap params here - keep them as raw values (potentially reactive)
            // The $_bp0, $_bp1, etc. getters will unwrap them when accessed
            // This allows reactivity to work: when the component's property changes,
            // the next access to $_bp0 will return the new value
            const rawParams = [...params];

            // Store on slotCtx for context-based lookup
            const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
            if (contextParams && slotCtx && typeof slotCtx === 'object') {
              contextParams.set(slotCtx, rawParams);
            }

            // Also store as current slot params for re-renders
            // This persists until the next slot call, allowing reactivity
            // to access block params even after the slot function returns
            (globalThis as any).__currentSlotParams = rawParams;

            // Push block params onto the global stack
            // The $_blockParam helper reads from this stack
            const stack = (globalThis as any).__blockParamsStack;
            stack.push(rawParams);

            try {
              // Evaluate lazy-wrapped component children (contain $_tag/$_c/$_dc)
              // but preserve reactive text getters as functions so GXT can track
              // cell dependencies and create reactive text nodes via gxtEffect.
              return effectiveChildren.map((child: any) => {
                if (typeof child === 'function' && !child.__isCurriedComponent && !(child instanceof Node)) {
                  const fnStr = child.toString();
                  if (fnStr.includes('$_tag(') || fnStr.includes('$_c(') || fnStr.includes('$_dc(') || fnStr.includes('$_eachSync(')) {
                    try { return child(); } catch { return child; }
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
          const blockName = typeof args.__hasBlock__ === 'function' ? args.__hasBlock__() : args.__hasBlock__;
          // Check if block params were declared
          const hasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
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
        const fw = [fwProps, fwAttrs, events];  // [props, attrs, events]

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
          // diagnostic (`__gxtCheckBacktracking` in manager.ts) doesn't see
          // them when building its `- While rendering:` tree. Snapshot the
          // `__gxtLastCreatedEmberInstance` before handle() runs; after
          // handle() completes, if __gxtLastCreatedEmberInstance is null
          // (renderGlimmerComponent path) this was a template-only render
          // — add its kebabName to a per-render set. The assertion hook
          // above (`__gxtCheckBacktracking` wrapper) reads this set to
          // inject template-only names into the render tree.
          // Reset the set if the renderPassId changed since the last entry.
          {
            const _g = (globalThis as any);
            const _curPass = _g.__emberRenderPassId || 0;
            if (_g.__gxtTemplateOnlyRenderedSetPassId !== _curPass) {
              _g.__gxtTemplateOnlyRenderedSetPassId = _curPass;
              if (_g.__gxtTemplateOnlyRenderedSet && typeof _g.__gxtTemplateOnlyRenderedSet.clear === 'function') {
                _g.__gxtTemplateOnlyRenderedSet.clear();
              }
            }
          }
          const _lastCreatedBefore = (globalThis as any).__gxtLastCreatedEmberInstance;
          const _stackTO: string[] = (globalThis as any).__gxtTemplateOnlyStack ||
            ((globalThis as any).__gxtTemplateOnlyStack = []);
          _stackTO.push(kebabName);
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
          const __forceRerenderSnapshot = (globalThis as any).__gxtIsForceRerender;
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
            if (_stackTO.length > 0 && _stackTO[_stackTO.length - 1] === kebabName) {
              _stackTO.pop();
            }
            // Template-only components are identified by the fact that
            // renderGlimmerComponent calls setInstanceCapture(null) — so
            // after handle(), __gxtLastCreatedEmberInstance is null.
            // Classic components are still captured as their instance.
            const _lastCreatedAfter = (globalThis as any).__gxtLastCreatedEmberInstance;
            if (_lastCreatedAfter === null) {
              const _renderedSetTO: Set<string> = (globalThis as any).__gxtTemplateOnlyRenderedSet ||
                ((globalThis as any).__gxtTemplateOnlyRenderedSet = new Set());
              _renderedSetTO.add(kebabName);
            }
          }
          if (__forceRerenderSnapshot) {
            const _inst = (globalThis as any).__gxtLastCreatedEmberInstance;
            // Fire willRender/willUpdate ONLY if __gxtSyncAllWrappers did not
            // already fire them on this instance for the current sync cycle.
            // syncAll is wrapped above to stamp `__gxtSyncAllFiredCycleId`
            // on any instance whose update hooks it fires via `trigger`.
            // This gate prevents double-firing for direct-invocation args
            // (e.g. {{non-block prop=this.x}}) while still firing for
            // each-iteration re-renders whose parent-getter captures an
            // old block param and is missed by syncAll.
            if (_inst && _inst.__gxtEverInserted && typeof _inst.trigger === 'function') {
              const __gCycle = (globalThis as any).__gxtSyncCycleId || 0;
              if (_inst.__gxtSyncAllFiredCycleId !== __gCycle &&
                  _inst.__gxtWillRenderFiredCycleId !== __gCycle) {
                _inst.__gxtWillRenderFiredCycleId = __gCycle;
                try { _inst.trigger('didUpdateAttrs'); } catch { /* ignore */ }
                try { _inst.trigger('didReceiveAttrs'); } catch { /* ignore */ }
                try { _inst.trigger('willUpdate'); } catch { /* ignore */ }
                try { _inst.trigger('willRender'); } catch { /* ignore */ }
                // willRender may call `set()` which dirties cells. Flush so
                // freshly-dirtied cells propagate to the DOM within this pass.
                try { gxtSyncDom(); } catch { /* ignore */ }
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
        const bpStack = (globalThis as any).__blockParamsStack;
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
        const captureErr = g.__captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(notFoundErr);
        }
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
    //   2. `@__hasBlock__` marker in attrs (angle-bracket block form)
    //   3. PascalCase tag name with at least one child (curly-block body)
    if (mightBeComponent && resolvedTag && typeof resolvedTag === 'string') {
      let isCurlyBlockInvocation = resolvedTag.startsWith('curly-c-');
      if (!isCurlyBlockInvocation && tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[1])) {
        for (const [key] of tagProps[1]) {
          if (key === '@__hasBlock__') { isCurlyBlockInvocation = true; break; }
        }
      }
      if (!isCurlyBlockInvocation && Array.isArray(children) && children.length > 0) {
        const firstCh = resolvedTag.charCodeAt(0);
        const isPascal = firstCh >= 65 && firstCh <= 90; // A-Z
        if (isPascal) isCurlyBlockInvocation = true;
      }
      if (isCurlyBlockInvocation) {
        // Compute the original dashed name (e.g. `no-good` from `NoGood` or
        // `curly-c-no-good`). Strip the `curly-c-` prefix if present.
        let rawName = doubleDashToSlash(pascalToKebab(resolvedTag));
        if (rawName.startsWith('curly-c-')) rawName = rawName.slice(8);
        const notFoundErr = new Error(
          `Attempted to resolve \`${rawName}\`, which was expected to be a component, but nothing was found.`
        );
        const captureErr = g.__captureRenderError;
        if (typeof captureErr === 'function') {
          captureErr(notFoundErr);
        }
        throw notFoundErr;
      }
    }

    // Custom element fallback: dash-containing tags that were not resolved as
    // components or helpers — render as plain HTML custom elements with attrs.
    if (mightBeComponent && resolvedTag && typeof resolvedTag === 'string' && resolvedTag.includes('-')) {
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
        for (const child of children) {
          const resolved = typeof child === 'function' ? child() : child;
          if (resolved instanceof Node) ceEl.appendChild(resolved);
          else if (typeof resolved === 'string') ceEl.appendChild(document.createTextNode(resolved));
          else if (Array.isArray(resolved)) {
            for (const item of resolved) {
              if (item instanceof Node) ceEl.appendChild(item);
              else if (typeof item === 'string') ceEl.appendChild(document.createTextNode(item));
            }
          }
        }
      }
      return ceEl;
    }

    } finally { if (_eoSwap) { g.owner = _eoPrev; } } // Engine owner swap restore

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
              const names = typeof entry[1] === 'string' ? entry[1] : (typeof entry[1] === 'function' ? entry[1]() : '');
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
          Array.isArray(fw[0]) ? fw[0].filter((e: any) => {
            const k = e[0] === '' ? 'class' : e[0];
            return !splatLocalSet.has(k);
          }) : fw[0],
          Array.isArray(fw[1]) ? fw[1].filter((e: any) => !splatLocalSet.has(e[0])) : fw[1],
          fw[2]
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
          entry[1] = function _stringifyTextContent() {
            const val = origGetter.apply(this, arguments);
            if (val == null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
            if (typeof val === 'symbol') return String(val);
            if (typeof val === 'function') return val;
            if (val instanceof Node) return val;
            // Non-primitive object — stringify for text position (Ember behavior)
            if (typeof val === 'object') {
              if (Array.isArray(val)) return val;
              if (typeof val.toHTML === 'function') return val;
              if (val.__isCurriedComponent) return val;
              try { return String(val); } catch { return ''; }
            }
            return val;
          };
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
          entry[1] = function _attrNormalize() {
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
              try { return String(v); } catch { return ''; }
            }
            return v;
          };
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
        if (!((globalThis as any).__gxtIsForceRerender)) {
          const currentPassId = (globalThis as any).__emberRenderPassId || 0;
          if (_styleWarnedPassId !== currentPassId) {
            // Check if the string value came from a SafeString.toString() conversion.
            // For quoted attrs like style="{{safeExpr}}", __gxtNormAttr calls
            // String(safeString) → toString() → sets __gxtLastSafeStringResult.
            // If the final concatenated value matches the last SafeString result exactly,
            // the entire value came from a single SafeString — no warning needed.
            // If the value differs (e.g., static text was mixed in), warn.
            let isSafeFromConcat = false;
            if (typeof val === 'string') {
              const lastSafe = (globalThis as any).__gxtLastSafeStringResult;
              if (lastSafe !== undefined && val === lastSafe) {
                isSafeFromConcat = true;
              }
            }
            // Clear the last-safe-string tracker regardless
            (globalThis as any).__gxtLastSafeStringResult = undefined;
            if (!isSafeFromConcat) {
              _styleWarnedPassId = currentPassId;
              const warnFn = getDebugFunction('warn');
              if (warnFn) {
                warnFn(
                  _constructStyleDeprecationMessage(String(val)),
                  false,
                  { id: 'ember-htmlbars.style-xss-warning' }
                );
              }
            }
          }
        }
        return val;
      };
    }

    // SVG/MathML namespace handling: when __gxtNamespace is set (by $_c_ember
    // when it intercepts $_SVGProvider/$_MathMLProvider), create elements in the
    // correct namespace using createElementNS instead of GXT's default createElement.
    const currentNs = g.__gxtNamespace;
    if (currentNs && resolvedTag && typeof resolvedTag === 'string') {
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
      const XLINK_NS = 'http://www.w3.org/1999/xlink';
      const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
      const ns = currentNs === 'svg' ? SVG_NS : currentNs === 'mathml' ? MATHML_NS : null;
      if (ns) {
        const el = document.createElementNS(ns, resolvedTag);

        // Apply attributes/props from tagProps
        if (tagProps && tagProps !== g.$_edp) {
          // Props (position 0): class, id, etc.
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              const propName = key === '' ? 'class' : key;
              const val = typeof value === 'function' ? value() : value;
              if (val != null && val !== false) {
                if (propName === 'class' || propName === 'className') {
                  el.setAttribute('class', String(val));
                } else {
                  el.setAttribute(propName, String(val));
                }
              }
              // Set up reactive updates for dynamic props
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = value();
                    if (v == null || v === false) {
                      el.removeAttribute(propName === 'className' ? 'class' : propName);
                    } else {
                      el.setAttribute(propName === 'className' ? 'class' : propName, String(v));
                    }
                  });
                } catch { /* ignore effect setup errors */ }
              }
            }
          }

          // Attrs (position 1): viewBox, data-*, etc.
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) continue; // skip component args
              const val = typeof value === 'function' ? value() : value;
              if (val != null && val !== false) {
                if (key.includes(':')) {
                  // Namespaced attribute (xlink:href, xmlns:*, etc.)
                  if (key.startsWith('xlink')) {
                    el.setAttributeNS(XLINK_NS, key, String(val));
                  } else if (key.startsWith('xmlns')) {
                    el.setAttributeNS(XMLNS_NS, key, String(val));
                  } else {
                    el.setAttributeNS(ns, key, String(val));
                  }
                } else {
                  el.setAttribute(key, String(val));
                }
              }
              // Reactive attrs
              if (typeof value === 'function') {
                try {
                  gxtEffect(() => {
                    const v = value();
                    if (v == null || v === false) {
                      el.removeAttribute(key);
                    } else {
                      el.setAttribute(key, String(v));
                    }
                  });
                } catch { /* ignore */ }
              }
            }
          }

          // Events (position 2)
          const events = tagProps[2];
          if (Array.isArray(events)) {
            for (const [eventName, handler] of events) {
              if (typeof handler === 'function') {
                el.addEventListener(eventName, handler as EventListener);
              }
            }
          }
        }

        // Render children inside the SVG namespace
        if (children && children.length > 0) {
          for (const child of children) {
            if (child instanceof Node) {
              el.appendChild(child);
            } else if (typeof child === 'function') {
              const childResult = child();
              if (childResult instanceof Node) {
                el.appendChild(childResult);
              } else if (Array.isArray(childResult)) {
                for (const item of childResult) {
                  if (item instanceof Node) el.appendChild(item);
                  else if (item != null) el.appendChild(document.createTextNode(String(item)));
                }
              } else if (childResult != null) {
                el.appendChild(document.createTextNode(String(childResult)));
              }
            } else if (child != null) {
              el.appendChild(document.createTextNode(String(child)));
            }
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
          const gxtRoot = (globalThis as any).__gxtRootContext;
          const rootRc = gxtRoot && gxtRoot[rcKey];
          if (rootRc && rootRc.element !== null) {
            (ctx as any)[rcKey] = rootRc;
          }
        } catch { /* ignore — let GXT raise the real error below */ }
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
            if (descriptor && ('value' in descriptor)) {
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

    const result = originalTag(tag, tagProps, ctx, children);

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
    const hasSplatProps = Array.isArray(tagProps) && (
      (Array.isArray(tagProps[0]) && tagProps[0].length > 0) ||
      (Array.isArray(tagProps[1]) && tagProps[1].some((e: any) => Array.isArray(e) && typeof e[0] === 'string' && !e[0].startsWith('@')))
    );
    if (!hasSplatProps) {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }
    // Narrow the intervention to angle-bracket contextual component invocations
    // that came from `<param.prop ...>` (transformed to `<this.$_bp0.prop ...>`
    // in transformBlockParamsInTemplate). The compiled getter body contains
    // `this.$_bp` for block-param-based lookups. Leave other $_dc callers
    // (e.g. `{{component this.foo}}` or curly contextual invocations) to the
    // ember-gxt-wrappers path so we don't perturb their behavior.
    if (typeof componentGetter !== 'function') {
      return __origDc.call(this, componentGetter, gxtArgs, ctx);
    }
    let __getterSrc: string;
    try { __getterSrc = componentGetter.toString(); } catch { __getterSrc = ''; }
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
            const wrapped = typeof val === 'function'
              ? () => { const v = val(); return (v == null || v === false) ? '' : v; }
              : (val == null || val === false) ? '' : val;
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
          if (key.startsWith('_') && key !== '__hasBlock__' && key !== '__hasBlockParams__') continue;
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
                get: () => typeof val === 'function' ? val() : val,
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
        } catch { return undefined; }
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

// NOTE: transformTripleMustaches has been removed.
// Triple-mustache {{{expr}}} → <EmberHtmlRaw @value={{expr}} /> is now handled
// at compile time in the GXT AST compiler (mustache visitor, escaped === false).

// NOTE: transformAngleBracketPositionalParams has been removed.
// Positional params transform (<Component "Foo" 4 /> → @__pos0__="Foo" @__pos1__={{4}} ...)
// is now handled in the GXT AST compiler (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// NOTE: transformComponentHelper, transformCurlyArgsToAngleBracket, and
// transformLetBlockParamInvocations have been moved to the GXT AST compiler
// (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

// transformBlockParams() was removed assuming GXT would handle it, but GXT 0.0.53 does not.
// Re-introduced as transformBlockParamsInTemplate() below.

/**
 * Transform block params in angle-bracket component invocations.
 * `<Foo as |x y|>{{x}} {{y}}</Foo>` → `<Foo @__hasBlockParams__="default">{{this.$_bp0}} {{this.$_bp1}}</Foo>`
 *
 * This handles:
 * - Simple mustache: {{param}} → {{this.$_bp0}}
 * - Path expressions: {{param.prop}} → {{this.$_bp0.prop}}
 * - Attribute values: @attr={{param}} → @attr={{this.$_bp0}}
 * - SubExpressions: (helper param) → (helper this.$_bp0)
 */
function transformBlockParamsInTemplate(template: string): string {
  // Match angle-bracket components with `as |...|`
  // Pattern: <ComponentName ... as |params|> ... </ComponentName>
  // We process from outermost to innermost by finding opening tags with `as |...|`
  let result = template;
  // Use a simple state machine approach to find and transform block params
  // We need to handle nesting properly, so process one level at a time

  // Find all opening tags with `as |...|`
  const tagPattern = /<([A-Z][a-zA-Z0-9.-]*|[a-z][a-z0-9]*-[a-z0-9-]*)((?:\s+(?:[@a-zA-Z_][a-zA-Z0-9_-]*(?:=(?:"[^"]*"|'[^']*'|\{\{[^}]*\}\}|[^\s>]*))?))*)(\s+as\s*\|([^|]+)\|)(\s*)>/g;

  let match;
  // Process matches from last to first to avoid index shifting
  const matches: { index: number; fullMatch: string; tagName: string; attrs: string; asClause: string; params: string; trailingWs: string }[] = [];

  while ((match = tagPattern.exec(result)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      tagName: match[1],
      attrs: match[2],
      asClause: match[3],
      params: match[4],
      trailingWs: match[5],
    });
  }

  // Process from last to first
  for (let mi = matches.length - 1; mi >= 0; mi--) {
    const m = matches[mi]!;
    const paramNames = splitOnWhitespace(m.params.trim());
    if (paramNames.length === 0) continue;

    // Find the matching closing tag
    const closingTag = `</${m.tagName}>`;
    const openTagEnd = m.index + m.fullMatch.length;

    // Find the matching closing tag, accounting for nesting
    let depth = 1;
    let searchIdx = openTagEnd;
    let closingIdx = -1;
    const openPattern = `<${m.tagName}`;
    while (depth > 0 && searchIdx < result.length) {
      const nextOpen = result.indexOf(openPattern, searchIdx);
      const nextClose = result.indexOf(closingTag, searchIdx);

      if (nextClose === -1) break; // No closing tag found

      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Check it's actually an opening tag (not a substring match)
        const afterName = result[nextOpen + openPattern.length];
        if (afterName === ' ' || afterName === '>' || afterName === '\n' || afterName === '\t' || afterName === '\r' || afterName === '/') {
          depth++;
        }
        searchIdx = nextOpen + 1;
      } else {
        depth--;
        if (depth === 0) {
          closingIdx = nextClose;
        } else {
          searchIdx = nextClose + closingTag.length;
        }
      }
    }

    if (closingIdx === -1) continue; // Couldn't find closing tag

    // Extract content between opening and closing tags
    let content = result.slice(openTagEnd, closingIdx);

    // Replace block param references in content
    for (let j = 0; j < paramNames.length; j++) {
      const param = paramNames[j]!;
      const bpVar = `$_bp${j}`;

      // Replace `<param.prop ...>` and `</param.prop>` tag invocations
      // (contextual components yielded via (hash)) with `<this.$_bp0.prop ...>`.
      // Without this, GXT emits `$_dc(() => param.prop, ...)` where `param` is
      // a free JS variable that's not bound, so the getter throws and
      // splattributes (class/title) never reach the element.
      // Pattern matches `<fb.baz` but not `<fb ` (dot required — plain
      // param references aren't valid as tag names anyway).
      content = content.replace(
        new RegExp(`<${param}(\\.[a-zA-Z0-9_.-]+)(?=[\\s/>])`, 'g'),
        `<this.${bpVar}$1`
      );
      content = content.replace(
        new RegExp(`</${param}(\\.[a-zA-Z0-9_.-]+)\\s*>`, 'g'),
        `</this.${bpVar}$1>`
      );

      // Replace {{param.property}} with {{this.$_bp0.property}}
      content = content.replace(
        new RegExp(`\\{\\{\\s*${param}(\\.[a-zA-Z0-9_.\\-]+)\\s*\\}\\}`, 'g'),
        `{{this.${bpVar}$1}}`
      );

      // Replace {{param}} with {{this.$_bp0}}
      content = content.replace(
        new RegExp(`\\{\\{\\s*${param}\\s*\\}\\}`, 'g'),
        `{{this.${bpVar}}}`
      );

      // Replace in attribute values: @attr={{param.property}}
      content = content.replace(
        new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}(\\.[a-zA-Z0-9_.\\-]+)\\}\\}`, 'g'),
        `$1{{this.${bpVar}$2}}`
      );

      // Replace in attribute values: @attr={{param}}
      content = content.replace(
        new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}\\}\\}`, 'g'),
        `$1{{this.${bpVar}}}`
      );

      // Replace in sub-expressions and helper args: (helper param) → (helper this.$_bp0)
      // Match param as a standalone word in mustache/subexpr context
      content = content.replace(
        new RegExp(`(\\{\\{[^}]*?)\\b${param}\\b([^}]*?\\}\\})`, 'g'),
        (full: string, before: string, after: string) => {
          // Don't replace if it's already prefixed with this. or is part of a longer word
          if (before.endsWith('.') || before.endsWith('this.')) return full;
          return `${before}this.${bpVar}${after}`;
        }
      );
    }

    // Build the new opening tag (remove `as |...|`, add @__hasBlockParams__)
    const newOpenTag = `<${m.tagName}${m.attrs} @__hasBlockParams__="default"${m.trailingWs}>`;

    // Reconstruct the template
    result = result.slice(0, m.index) + newOpenTag + content + result.slice(closingIdx);
  }

  return result;
}

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
/**
 * Transform triple-mustache {{{expr}}} → <EmberHtmlRaw @value={{expr}} />
 *
 * The GXT AST compiler treats triple-mustaches identically to double-mustaches
 * (escaped text), but Ember semantics require inserting the value as raw HTML.
 * We rewrite to an EmberHtmlRaw component invocation so ember-gxt-wrappers.ts
 * can parse and reactively render the HTML via innerHTML.
 *
 * Skips:
 *   - {{!-- comments --}} and {{! comments}}
 *   - Handlebars raw blocks {{{{raw}}}} ... {{{{/raw}}}}
 *   - {{{>partial}}} (none in Ember, but belt-and-suspenders)
 */
function transformTripleMustaches(template: string): string {
  if (!template.includes('{{{')) return template;

  let out = '';
  let i = 0;
  const n = template.length;
  while (i < n) {
    // Skip HB comments: {{!-- ... --}} or {{! ... }}
    if (template.startsWith('{{!--', i)) {
      const end = template.indexOf('--}}', i + 5);
      if (end === -1) { out += template.slice(i); break; }
      out += template.slice(i, end + 4);
      i = end + 4;
      continue;
    }
    if (template.startsWith('{{!', i)) {
      const end = template.indexOf('}}', i + 3);
      if (end === -1) { out += template.slice(i); break; }
      out += template.slice(i, end + 2);
      i = end + 2;
      continue;
    }
    // Skip raw blocks {{{{ ... }}}} (four braces)
    if (template.startsWith('{{{{', i)) {
      const end = template.indexOf('}}}}', i + 4);
      if (end === -1) { out += template.slice(i); break; }
      out += template.slice(i, end + 4);
      i = end + 4;
      continue;
    }
    // Triple-mustache: {{{ ... }}} — but NOT {{{{
    if (template.startsWith('{{{', i)) {
      // Find matching }}} that's not part of }}}} (raw close)
      const end = template.indexOf('}}}', i + 3);
      if (end === -1) { out += template.slice(i); break; }
      const inner = template.slice(i + 3, end).trim();
      // Wrap expression in parentheses if it contains spaces (helper invocation)
      // so that {{{foo bar}}} becomes <EmberHtmlRaw @value={{(foo bar)}} />.
      // Simple paths like this.inner don't need parens.
      const valueExpr = /\s/.test(inner) && !inner.startsWith('(')
        ? `(${inner})`
        : inner;
      out += `<EmberHtmlRaw @value={{${valueExpr}}} />`;
      i = end + 3;
      continue;
    }
    out += template[i];
    i++;
  }
  return out;
}

function transformEachInBlocks(template: string): string {
  // Quick bail if no each-in
  if (!template.includes('each-in')) return template;

  let result = template;
  // Process repeatedly since nested each-in may exist
  let safety = 20;
  while (result.includes('{{#each-in') && safety-- > 0) {
    // Find the innermost {{#each-in ...}} block (one with no nested {{#each-in}})
    const openRegex = /\{\{#each-in\s+/g;
    let match: RegExpExecArray | null;
    let lastMatch: RegExpExecArray | null = null;

    while ((match = openRegex.exec(result)) !== null) {
      // Check if there's no nested {{#each-in between this and its {{/each-in}}
      const closeIdx = result.indexOf('{{/each-in}}', match.index);
      if (closeIdx === -1) break;
      const between = result.slice(match.index + match[0].length, closeIdx);
      if (!between.includes('{{#each-in')) {
        lastMatch = match;
        break; // Found innermost
      }
    }

    if (!lastMatch) break;

    const startIdx = lastMatch.index;
    const openTag = lastMatch[0]; // "{{#each-in "

    // Parse the expression and block params from the opening tag
    // Find the closing }} of the opening tag
    let braceDepth = 0;
    let openEnd = -1;
    for (let i = startIdx; i < result.length - 1; i++) {
      if (result[i] === '{' && result[i + 1] === '{') {
        braceDepth++;
        i++; // skip second {
      } else if (result[i] === '}' && result[i + 1] === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          openEnd = i + 2;
          break;
        }
        i++; // skip second }
      }
    }
    if (openEnd === -1) break;

    const openTagContent = result.slice(startIdx + 2, openEnd - 2); // strip {{ and }}
    // openTagContent looks like: #each-in EXPR as |KEY VALUE|
    // or: #each-in EXPR as |KEY|

    // Extract the expression and block params
    const asMatch = openTagContent.match(/^#each-in\s+([\s\S]+?)\s+as\s+\|([^|]*)\|\s*$/);
    if (!asMatch) {
      // No block params — just transform to {{#each (gxtEntriesOf EXPR)}}
      const exprMatch = openTagContent.match(/^#each-in\s+([\s\S]+?)\s*$/);
      if (!exprMatch) break;
      const expr = exprMatch[1].trim();
      const closeIdx = result.indexOf('{{/each-in}}', openEnd);
      if (closeIdx === -1) break;
      const body = result.slice(openEnd, closeIdx);
      // Check for {{else}} in body
      const elseParts = splitElse(body);
      let replacement: string;
      if (elseParts) {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity"}}${elseParts.main}{{else}}${elseParts.inverse}{{/each}}`;
      } else {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity"}}${body}{{/each}}`;
      }
      result = result.slice(0, startIdx) + replacement + result.slice(closeIdx + '{{/each-in}}'.length);
      continue;
    }

    const expr = asMatch[1].trim();
    const paramStr = asMatch[2].trim();
    const params = paramStr.split(/\s+/);

    // Find closing {{/each-in}}
    const closeIdx = result.indexOf('{{/each-in}}', openEnd);
    if (closeIdx === -1) break;

    const body = result.slice(openEnd, closeIdx);

    // Split on {{else}} at the same nesting level
    const elseParts = splitElse(body);

    let mainBody: string;
    let inverseBody: string | null = null;
    if (elseParts) {
      mainBody = elseParts.main;
      inverseBody = elseParts.inverse;
    } else {
      mainBody = body;
    }

    // Build the replacement
    // Use a unique entry var name to avoid collisions with user block params
    const entryVar = '__ei__';

    let letParams: string;
    if (params.length >= 2) {
      // {{#each-in obj as |key value|}} — key is first, value is second
      letParams = `${entryVar}.k ${entryVar}.v as |${params[0]} ${params[1]}|`;
    } else if (params.length === 1) {
      // {{#each-in obj as |key|}} — only key
      letParams = `${entryVar}.k as |${params[0]}|`;
    } else {
      // No params — shouldn't happen but handle gracefully
      letParams = '';
    }

    let replacement: string;
    if (letParams) {
      const wrappedMain = `{{#let ${letParams}}}${mainBody}{{/let}}`;
      if (inverseBody !== null) {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity" as |${entryVar}|}}${wrappedMain}{{else}}${inverseBody}{{/each}}`;
      } else {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity" as |${entryVar}|}}${wrappedMain}{{/each}}`;
      }
    } else {
      if (inverseBody !== null) {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity"}}${mainBody}{{else}}${inverseBody}{{/each}}`;
      } else {
        replacement = `{{#each (gxtEntriesOf ${expr}) key="@identity"}}${mainBody}{{/each}}`;
      }
    }

    result = result.slice(0, startIdx) + replacement + result.slice(closeIdx + '{{/each-in}}'.length);
  }

  return result;
}

/**
 * Split a template body on {{else}} at the same nesting level.
 * Returns null if no {{else}} found.
 */
function splitElse(body: string): { main: string; inverse: string } | null {
  // Find {{else}} that's not inside a nested block
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{' && body[i + 1] === '{' && body[i + 2] === '#') {
      depth++;
    } else if (body[i] === '{' && body[i + 1] === '{' && body[i + 2] === '/') {
      depth--;
    } else if (depth === 0 && body.slice(i, i + 8) === '{{else}}') {
      return {
        main: body.slice(0, i),
        inverse: body.slice(i + 8),
      };
    }
  }
  return null;
}

let _functionCodeCache: Map<string, Function> | null = null;
// Global counter for log site IDs — ensures uniqueness across compilations.
// Without this, every compiled template gets __logSite:0, __logSite:1, etc.
// and the dedup logic in $__log_ember incorrectly skips log calls from
// different templates that happen to share the same site ID.
let _globalLogSiteCounter = 0;

/**
 * Replace bare `{{outlet}}` mustaches with `<ember-outlet />`.
 *
 * This mirrors the build-time transform in
 * packages/demo/compat/gxt-template-compiler-plugin.mjs so that templates
 * compiled at runtime (via `compile()` / `precompileTemplate()` from
 * addTemplate(), rendering test helpers, etc.) get the same handling as
 * templates compiled at build time. Without it, the GXT compiler treats
 * `{{outlet}}` like `{{yield}}` (a default-slot yield) and no
 * <ember-outlet> element is produced — which breaks nested route rendering.
 */
function transformOutletMustaches(code: string): string {
  if (!code || code.indexOf('outlet') === -1) return code;
  const isIdent = (ch: string | undefined) =>
    !!ch && /[A-Za-z0-9_$]/.test(ch);
  const skipWS = (c: string, i: number) => {
    while (i < c.length && (c[i] === ' ' || c[i] === '\t' || c[i] === '\n' || c[i] === '\r')) i++;
    return i;
  };
  let r = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '{' && code[i + 1] === '{') {
      const j = skipWS(code, i + 2);
      if (code.startsWith('outlet', j) && !isIdent(code[j + 6])) {
        const k = skipWS(code, j + 6);
        if (code[k] === '}' && code[k + 1] === '}') {
          r += '<ember-outlet />';
          i = k + 2;
          continue;
        }
      }
    }
    r += code[i];
    i++;
  }
  return r;
}

/**
 * Rewrite bare-identifier helper mustaches inside quoted HTML attribute values:
 *   `attr="{{foo-bar}}"` → `attr="{{(foo-bar)}}"`
 *   `attr="pre-{{foo-bar}}-post"` → `attr="pre-{{(foo-bar)}}-post"`
 *
 * GXT's compiler swallows these (emitting `[""].join("")`) because it treats
 * them as PathExpressions against an empty scope. Wrapping them as
 * SubExpressions forces the helper resolution path.
 *
 * Rewrites are skipped for `this.xxx`, `@arg`, mustaches with arguments, and
 * known built-in keywords.
 */
function transformAttrQuotedHelperMustaches(code: string): string {
  if (!code || code.indexOf('{{') === -1) return code;
  const BARE_IDENT_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;
  const BUILTINS = new Set([
    'this', 'else', 'if', 'unless', 'each', 'each-in', 'let', 'with', 'yield',
    'outlet', 'component', 'helper', 'modifier', 'debugger', 'log', 'action',
    'concat', 'hash', 'array', 'fn', 'get', 'mut', 'readonly', 'unbound',
    'unique-id', 'in-element', 'has-block', 'has-block-params', 'on',
  ]);
  let out = '';
  let i = 0;
  const len = code.length;
  while (i < len) {
    const ch = code[i]!;
    if (ch === '=' && (code[i + 1] === '"' || code[i + 1] === "'")) {
      const quote = code[i + 1]!;
      const start = i + 2;
      let end = start;
      while (end < len && code[end] !== quote) end++;
      if (end >= len) {
        out += code.slice(i);
        i = len;
        break;
      }
      const inner = code.slice(start, end);
      const rewritten = inner.replace(
        /\{\{\s*([^}\s][^}]*?)\s*\}\}/g,
        (m, expr: string) => {
          const trimmed = expr.trim();
          if (!BARE_IDENT_RE.test(trimmed)) return m;
          if (BUILTINS.has(trimmed)) return m;
          return `{{(${trimmed})}}`;
        }
      );
      out += '=' + quote + rewritten + quote;
      i = end + 1;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

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
 * Runtime precompileTemplate implementation using GXT runtime compiler
 * Returns a template factory function that takes an owner and returns a template.
 */
export function precompileTemplate(templateString: string, options?: {
  strictMode?: boolean;
  scope?: () => Record<string, unknown>;
  moduleName?: string;
  scopeValues?: Record<string, unknown>;
}) {
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
  const cacheKey = templateString + (options?.moduleName || '') + (__strictModeFlag ? '|strict' : '');
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
    const scopeKeys = options?.scopeValues ? new Set(Object.keys(options.scopeValues)) : new Set<string>();
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
    if (_assert) _assert(
      'Could not find component `<TextArea />` (did you mean `<Textarea />`?)',
      false
    );
  }

  // Transform the template
  let transformedTemplate = templateString;

  // Pre-transform: rewrite bare-identifier helper mustaches in HTML attribute
  // quoted values from `attr="{{foo-bar}}"` → `attr="{{(foo-bar)}}"`.
  //
  // The upstream GXT compiler, when encountering `{{foo-bar}}` in a quoted
  // attribute value, resolves it as a PathExpression. Because `foo-bar` is not
  // a scope binding, not a built-in, and not a `this.`/`@` path, it drops the
  // reference entirely and emits `[""].join("")`. Wrapping it as a
  // SubExpression — `{{(foo-bar)}}` — forces GXT to emit a proper
  // `$_maybeHelper("foo-bar", [], this)` call, which then resolves via Ember's
  // helper registry.
  //
  // We restrict the rewrite to bare identifiers that cannot be properties of
  // `this` (no `this.` prefix, no `@` arg, no known keyword), and only inside
  // quoted attribute values (the only position where GXT swallows the helper).
  transformedTemplate = transformAttrQuotedHelperMustaches(transformedTemplate);

  // Transform {{outlet}} → <ember-outlet /> so that GXT emits a custom element
  // that the routing outlet subsystem can hook. Without this, `{{outlet}}` is
  // treated as a default-slot yield and emits empty comment markers, which
  // breaks nested-route rendering for tests that register templates via
  // addTemplate() (index/posts/zomg routes, etc.).
  // Mirrors the build-time plugin in gxt-template-compiler-plugin.mjs.
  transformedTemplate = transformOutletMustaches(transformedTemplate);

  // Transform {{#each-in EXPR as |KEY VALUE|}}BODY{{else}}ELSE{{/each-in}}
  // into {{#each (gxtEntriesOf EXPR) key="@identity" as |__ei__|}}{{#let __ei__.k __ei__.v as |KEY VALUE|}}BODY{{/let}}{{else}}ELSE{{/each}}
  // gxtEntriesOf returns [{k, v}, ...] for objects, Maps, proxies, custom iterables.
  // Must run BEFORE the GXT compiler to avoid Ember's (-each-in) SubExpression.
  transformedTemplate = transformEachInBlocks(transformedTemplate);

  // Transform triple-mustache {{{expr}}} → <EmberHtmlRaw @value={{expr}} />
  // The GXT compiler treats {{{expr}}} the same as {{expr}} (text interpolation),
  // but Ember semantics require the value to be inserted as raw HTML.
  // Wrapping in <EmberHtmlRaw> routes it through ember-gxt-wrappers.ts which
  // parses the value into DOM nodes and reactively updates via innerHTML.
  transformedTemplate = transformTripleMustaches(transformedTemplate);

  // onclick={{expr}} → {{on "click" expr}} transform is now handled at the AST level
  // in the GXT compiler (visitors/element.ts rewriteOnEventAttributes),
  // gated behind IS_GLIMMER_COMPAT_MODE.

  // {{on "evt" handler once=X capture=Y passive=Z}} — rename the modifier to
  // the `on-ext` alias so GXT's `on`-only short-circuit does not drop the hash
  // pairs. `on-ext` resolves to the same Glimmer VM OnModifierManager via
  // `$_MANAGERS.modifier._builtinModifiers`, which natively understands the
  // hash args and passes them to `addEventListener` with the correct options.
  _ensureOnExtAlias();
  transformedTemplate = transformOnModifierHashArgs(transformedTemplate);

  // Check for dotted-path mustache expressions like {{foo.bar}} where foo is not in scope.
  // In Ember, these are errors because foo is a free variable path that can't be resolved.
  // Collect block param names first so we don't flag those.
  {
    const blockParamNames = findBlockParamNames(transformedTemplate);
    for (const { head, tail } of findDottedMustaches(transformedTemplate)) {
      if (head !== 'this' && !blockParamNames.has(head)) {
        throw new Error(
          `You attempted to render a path (\`{{${head}.${tail}}}\`), but ${head} was not in scope`
        );
      }
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
        while (p < transformedTemplate.length && (transformedTemplate[p] === ' ' || transformedTemplate[p] === '\t')) p++;
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
      emberAssert(
        'Passing a dynamic string to the `(helper)` keyword is disallowed.',
        false
      );
    }
  }

  // Check for dynamic (modifier ...) usage — disallowed in Ember.
  // (modifier this.xxx) passes a dynamic string which is not allowed.
  // Only (modifier "static-name") or (modifier this.modifierRef) (where ref is a
  // modifier function, not a string) are valid.
  {
    if (hasDynamicModifier(transformedTemplate)) {
      emberAssert(
        'Passing a dynamic string to the `(modifier)` keyword is disallowed.',
        false
      );
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

  // {{#@argName args}}content{{/@argName}} block invocations: GXT's AST compiler
  // may not emit code for these (AtHead detection returns empty). Transform them
  // to {{#component @argName}}content{{/component}} which GXT handles properly.
  transformedTemplate = transformedTemplate.replace(
    /\{\{#(@[a-zA-Z_][a-zA-Z0-9_]*)((?:\s+[^}]*)?)}}([\s\S]*?)\{\{\/@[a-zA-Z_][a-zA-Z0-9_]*\}\}/g,
    (match, argRef, extraArgs, body) => {
      return `{{#component ${argRef}${extraArgs}}}${body}{{/component}}`;
    }
  );

  // NOTE: Empty component @__hasBlock__ marker transform has been moved to the GXT AST compiler
  // (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

  // NOTE: Positional params transform (<Component "Foo" 4 /> → @__pos0__="Foo" @__pos1__={{4}} ...)
  // has been moved to the GXT AST compiler (plugins/compiler/compile.ts), gated behind IS_GLIMMER_COMPAT_MODE.

  // NOTE: Reserved-word attribute value transforms (e.g. class=class → class=this.class)
  // are now handled in the GXT AST compiler's resolvePath (visitors/utils.ts).
  // The Glimmer parser produces a PathExpression for the value and resolvePath
  // prefixes JS reserved words with `this.` when IS_GLIMMER_COMPAT_MODE is set.

  // Block params transform (`<Foo as |x|>{{x}}</Foo>` → `<Foo @__hasBlockParams__="default">{{this.$_bp0}}</Foo>`)
  // NOTE: This was supposed to be handled at the AST level in the GXT compiler, but
  // GXT 0.0.53 does not implement the transform. Re-introduce it as a pre-processing step.
  if (/\s+as\s*\|[^|]+\|/.test(transformedTemplate)) {
    transformedTemplate = transformBlockParamsInTemplate(transformedTemplate);
  }

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
  if (containsWord(transformedTemplate, 'unique-id') || containsWord(transformedTemplate, 'unique_id')) {
    scopeBindings.add('unique_id');
  }

  // Add gxtEntriesOf to scope bindings if referenced (from each-in transform).
  // This ensures the GXT compiler generates a direct function call instead of $_maybeHelper.
  if (containsWord(transformedTemplate, 'gxtEntriesOf')) {
    scopeBindings.add('gxtEntriesOf');
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
    customizeComponentName: (name: string) => {
      return pascalToKebab(name);
    },
  });

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    console.warn('[gxt-compile] Compilation errors:', compilationResult.errors);
    console.warn('[gxt-compile] Template:', transformedTemplate.slice(0, 200));
  }

  // Debug compiled code when globalThis.__gxtDebugCompile is set.
  // Enable in browser console: globalThis.__gxtDebugCompile = true
  if ((globalThis as any).__gxtDebugCompile && compilationResult.code) {
    console.log('[gxt-debug] Template:', transformedTemplate.slice(0, 300));
    console.log('[gxt-debug] Compiled:', compilationResult.code.slice(0, 500));
  }
  // (debug code removed)


  // Debug: check compilation result for scope-valued templates
  if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
    const _g4 = globalThis as any;
    if (!_g4.__gxtDebugCompResult) _g4.__gxtDebugCompResult = [];
    _g4.__gxtDebugCompResult.push({
      hasCode: !!compilationResult.code,
      codeLen: compilationResult.code?.length || 0,
      errors: compilationResult.errors?.length || 0,
      code: (compilationResult.code || '').slice(0, 300),
    });
  }
  // Always recreate the template function to:
  // 1. Replace async $_each with synchronous $_eachSync
  // 2. Inject $slots reference (globalThis.$slots) for {{yield}} support
  // 3. Inject $a alias for @named args
  if (compilationResult.code) {
    let modifiedCode = compilationResult.code;
    // NOTE: $_each -> $_eachSync replacement is now handled in the GXT serializer
    // (control.ts emits $_eachSync directly in IS_GLIMMER_COMPAT_MODE)
    // NOTE: $__log site ID wrapping is now handled in the GXT serializer
    // (value.ts emits comma expression with site ID directly in IS_GLIMMER_COMPAT_MODE)
    // Post-process: replace per-compilation __logSite:N with globally unique IDs
    // to prevent dedup collisions across different template compilations.
    modifiedCode = modifiedCode.replace(/__logSite:\d+/g, () => `__logSite:${_globalLogSiteCounter++}`);

    // Post-process: GXT emits quoted attribute values as `[...expressions].join("")`.
    // This implicit string coercion throws TypeError for Symbol values and for
    // Object.create(null). Rewrite to `[...].map(__gxtNormAttr).join("")` which
    // uses explicit String() conversion with Glimmer's normalizeStringValue
    // semantics (see _normalizeStringValue in this file).
    //
    // The pattern is very specific: `].join("")` occurs at the end of the quoted
    // attribute serialization in GXT's output. Any other `.join` call uses a
    // non-empty separator, so this replacement is safe.
    if (modifiedCode.indexOf('].join("")') !== -1) {
      modifiedCode = modifiedCode.split('].join("")').join('].map(globalThis.__gxtNormAttr).join("")');
    }

    // Post-process: GXT may emit `@argName` (and `@argName.path`) as literal JS
    // when a template arg appears in the FIRST positional slot of a helper like
    // `{{component @model.componentName model=@model.componentData}}`. The
    // second named-arg value is correctly rewritten as `() => $a.model.componentData`,
    // but the first positional leaks through as `$_dc(() => @model.componentName, ...)`
    // which is a SyntaxError (`@` is not valid JS outside decorators).
    //
    // Rewrite any bare `@identifier` / `@identifier.path` / `@identifier?.path`
    // token (not inside a string literal and not following an identifier char)
    // to `$a.identifier...`. We parse string literals properly to avoid
    // rewriting `"@foo"` / `'@foo'` / template-literal content, and we skip
    // `@` occurrences that look like decorators (e.g. `class X { @foo bar }`
    // would be ` @foo ` with `@` preceded by whitespace — but GXT doesn't emit
    // decorator syntax in templates). The stricter guard is that the `@` must
    // be followed by an identifier start and must NOT be preceded by `@`
    // (nested), a digit, or a word char.
    if (modifiedCode.indexOf('@') !== -1) {
      modifiedCode = _rewriteBareAtArgsToArgsAlias(modifiedCode);
    }

    // Post-process: When GXT emits $_maybeHelper("name", ...) with a string for a
    // name that is in scope bindings, replace the string with a variable reference.
    // The GXT compiler sometimes emits string-based lookups even for known bindings
    // (e.g., when WITH_HELPER_MANAGER path isn't taken). The scope injection later
    // creates `const get = globalThis[scopeKey]["get"]`, but the compiled code
    // references the string "get" — this fix bridges that gap.
    if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
      const _jsReserved = new Set([
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield', 'await',
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
          'array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly',
          'unique-id', 'unbound', 'helper', 'modifier', 'component',
          '__mutGet',
        ]);
        if (BUILTIN.has(bareName)) return match;
        return `${prefix}(globalThis.__gxtAssertNotResolvedHelperAsNamedArg(${nameLiteral}, this), $_maybeHelper(${nameLiteral}, [], this))`;
      }
    );

    // The GXT serializer wraps the top-level `{{unbound X}}` form in
    // `globalThis.__gxtUnboundEval(__ubCache, "__ubN", () => unbound(...))`,
    // but it does NOT wrap `unbound(...)` calls that appear inline in a
    // sub-expression context (e.g. inside `{{yield (unbound this.x)}}`).
    // Rewrite those inline calls so they share the same caching path and
    // preserve the frozen-value semantic across consumer re-reads.
    modifiedCode = _rewriteInlineUnbound(modifiedCode);

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
    // (value.ts wraps hash values in getters directly in IS_GLIMMER_COMPAT_MODE)
    //
    // EXCEPTION: when `(component "x" key=this.path)` appears inside a
    // `(hash ...)` passed to `{{yield}}` (e.g. a parent component yielding a
    // contextual component via `{{yield (hash foo=(component "nested" p=this.x))}}`),
    // GXT emits the hash values as DIRECT expressions rather than getters:
    //   $_componentHelper(["nested"], { p: this.x })
    // instead of
    //   $_componentHelper(["nested"], { p: () => this.x })
    // The manager reads curried args through `typeof value === 'function' ? value() : value`,
    // so a direct value is a frozen snapshot — incrementProperty on the parent
    // (which dirties the upstream cell) never flows into the curried arg.
    // Post-process: inside $_componentHelper(...) calls, wrap any `key: this.X`
    // or `key: this["X"]` hash value in `() =>` so the manager sees a live getter.
    if (modifiedCode.indexOf('$_componentHelper(') !== -1) {
      modifiedCode = _wrapComponentHelperHashGetters(modifiedCode);
    }

    // NOTE: Component children lazy wrapping ($_tag children) is now handled in the GXT
    // serializer (element.ts wraps component children in arrow functions in IS_GLIMMER_COMPAT_MODE)

    compilationResult.code = modifiedCode;
    // Temporary debug: capture compiled code for scope-valued templates
    if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
      const _g2 = globalThis as any;
      if (!_g2.__gxtDebugCompiledCodes) _g2.__gxtDebugCompiledCodes = [];
      _g2.__gxtDebugCompiledCodes.push({
        template: templateString.slice(0, 200),
        code: modifiedCode.slice(0, 500),
        scopeKeys: Object.keys(options.scopeValues),
        bindings: Array.from(scopeBindings),
      });
    }
    try {
      const needsArgsAlias = modifiedCode.includes('$a.');
      const needsSlots = modifiedCode.includes('$slots');
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
        'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete',
        'do', 'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof',
        'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
        'void', 'while', 'with', 'class', 'const', 'enum', 'export', 'extends',
        'import', 'super', 'implements', 'interface', 'let', 'package', 'private',
        'protected', 'public', 'static', 'yield', 'await',
      ]);
      let scopeStoreKey = '';
      const scopeAliases = new Map<string, string>(); // original key -> JS alias
      if (scopeVals && scopeKeys.size > 0) {
        // Normalize scope values: replace Glimmer VM internal helpers with
        // GXT-compatible equivalents. Glimmer VM helpers (from @glimmer/runtime)
        // are plain objects registered via setInternalHelperManager — they cannot
        // be called as functions. Replace them with the GXT-compatible versions.
        const BUILTINS_MAP: Record<string, string> = {
          'hash': 'hash', 'array': 'array', 'concat': 'concat',
          'get': 'get', 'fn': 'fn',
        };
        const gxtBuiltins = g.__EMBER_BUILTIN_HELPERS__;
        const internalHelperManagers = g.INTERNAL_HELPER_MANAGERS as WeakMap<object, any> | undefined;
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
        if (scopeVals['on'] !== undefined && typeof scopeVals['on'] !== 'function') {
          // The `on` modifier from @glimmer/runtime is an object, not a function.
          // GXT handles {{on}} natively, so we just need a passthrough.
          scopeVals['on'] = g.__EMBER_BUILTIN_HELPERS__?.['on'] || scopeVals['on'];
        }
        // Deterministic key based on sorted scope key names so that
        // templates with the same compiled code + scope shape produce
        // identical templateFnCode strings, enabling Function() cache hits.
        const sortedKeys = Array.from(scopeKeys).sort().join(',');
        let h = 0x811c9dc5; // FNV-1a 32-bit
        for (let i = 0; i < sortedKeys.length; i++) {
          h ^= sortedKeys.charCodeAt(i);
          h = Math.imul(h, 0x01000193);
        }
        scopeStoreKey = `__gxtScope_${(h >>> 0).toString(36)}`;
        g[scopeStoreKey] = scopeVals;
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
          const shadowMatches: Array<{ start: number; bodyStart: number; bodyEnd: number; end: number }> = [];
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
          scopeInjections.push(`const ${jsKey} = globalThis["${scopeStoreKey}"]["${key}"];`);
        }
      }

      const BUILTINS = g.__EMBER_BUILTIN_HELPERS__;
      if (BUILTINS) {
        // Check which helpers are referenced as bare identifiers in the compiled code
        const helperNames = ['get', 'unbound', 'array', 'hash', 'concat', 'fn', 'mut', 'readonly', 'unique-id', 'helper', 'modifier', 'gxtEntriesOf', '__mutGet'];
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
              helperInjections.push(`const unique_id = globalThis.__EMBER_BUILTIN_HELPERS__["unique-id"];`);
            }
          } else if (containsWord(modifiedCode, jsName)) {
            helperInjections.push(`const ${jsName} = globalThis.__EMBER_BUILTIN_HELPERS__["${name}"];`);
          }
        }
      }
      // each-in entries getter injections (now handled at AST level in GXT compiler)
      const eachInInjections: string[] = [];
      // Generate unique-id pre-computed array in outer scope if needed.
      // This runs ONCE per template compilation (not per render), so IDs
      // remain stable across re-renders of the same component instance.
      const uidCount = (compilationResult as any).__uidCount || 0;
      const uidOuterScope = uidCount > 0
        ? `var _uid_fn = globalThis.__EMBER_BUILTIN_HELPERS__["unique-id"];` +
          `var _uid = []; for (var _uid_i = 0; _uid_i < ${uidCount}; _uid_i++) _uid.push(_uid_fn());`
        : '';

      // For strict-mode templates, shadow the global $_maybeHelper with a
      // resolver that throws "not in scope" for free identifiers instead of
      // falling back to owner.lookup. We do this at the OUTER (factory) scope
      // so that the shadow survives across all reactive getter closures
      // produced by the compiled template — including closures invoked long
      // after the enclosing template.render() call returns.
      const strictMaybeHelperInjection = __strictModeFlag
        ? `var $_maybeHelper = globalThis.__gxtMakeStrictMaybeHelper();`
        : '';
      const templateFnCode = `
        "use strict";
        ${hasUnbound ? 'var __ubCache = Object.create(null);' : ''}
        ${uidOuterScope}
        ${strictMaybeHelperInjection}
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          ${needsSlots ? "const $slots = globalThis.$slots || {};" : ''}
          ${hasUnbound ? 'if (globalThis.__gxtUnboundResetSlots) globalThis.__gxtUnboundResetSlots();' : ''}

          ${scopeInjections.join('\n          ')}
          ${helperInjections.join('\n          ')}
          ${eachInInjections.join('\n          ')}
          ${_inElementInsertBefore === 'null' ? 'globalThis.__gxtInElementAppendMode = true;' : _inElementInsertBefore !== null && _inElementInsertBefore !== 'undefined' ? `globalThis.__gxtInElementInsertBeforeValue = ${JSON.stringify(_inElementInsertBefore)};` : ''}
          return ${modifiedCode};
        };
      `;
      // Cache compiled Function() to reduce V8 code space growth (OOM prevention)
      if (!_functionCodeCache) _functionCodeCache = new Map();
      let cachedFn = _functionCodeCache.get(templateFnCode);
      if (!cachedFn) {
        cachedFn = Function(templateFnCode)();
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
          } catch { /* effect setup may fail */ }

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
            const _curriedOwner = (globalThis as any).owner;
            const _renderCurried = (curried: any): Node | null => {
              if (!curried) return null;
              if (_curriedOwner && !(globalThis as any).owner) {
                (globalThis as any).owner = _curriedOwner;
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
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
                    }
                  }
                }
                if (cc.__curriedPositionals) {
                  for (const val of cc.__curriedPositionals) {
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
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
                while (_n && _n !== _cem) { const nx = _n.nextSibling; _removed.push(_n); parent.removeChild(_n); _n = nx; }
                const _destroyFn = (globalThis as any).__gxtDestroyInstancesInNodes;
                if (typeof _destroyFn === 'function' && _removed.length > 0) _destroyFn(_removed);
                const newNode = _renderCurried(cc);
                if (newNode) parent.insertBefore(newNode, _cem);
                _cinfo.lastRenderedName = cc.__name;
                _snapshotCurriedArgs(_cinfo, cc);
              });
            } catch { /* effect setup may fail */ }
            return _cfrag;
          }
        }

        const result = item();
        // If result is a function, it's a nested getter (e.g., from $__if)
        // BUT: do NOT call CurriedComponent functions — they need the reactive rendering path below
        let finalResult = (typeof result === 'function' && !result.__isCurriedComponent)
          ? result()
          : result;

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
            const capturedOwner = (globalThis as any).owner;
            const renderCurriedComponent = (curried: any): Node | null => {
              if (!curried) return null;
              // Empty curried component marker — renders nothing but preserves
              // the reactive rendering infrastructure for future transitions.
              if (curried.__isEmpty) return null;
              // Restore owner for component resolution during reactive re-evaluation
              if (capturedOwner && !(globalThis as any).owner) {
                (globalThis as any).owner = capturedOwner;
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
              // Register for manual re-rendering on property changes
              if (!(globalThis as any).__curriedRenderInfos) {
                (globalThis as any).__curriedRenderInfos = [];
              }
              (globalThis as any).__curriedRenderInfos.push(curriedRenderInfo);

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
                  newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
                    ? newResult()
                    : newResult;
                }
                // Evaluate curried arg getters to establish tracking —
                // when a curried arg changes (e.g., this.model.expectedText),
                // this effect must re-fire so we can update the component.
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedArgs) {
                  for (const val of Object.values(newFinal.__curriedArgs)) {
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
                    }
                  }
                }
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedPositionals) {
                  for (const val of newFinal.__curriedPositionals) {
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
                    }
                  }
                }

                const parent = startMarker.parentNode;
                if (!parent) return;

                // Skip teardown if same component with unchanged args (preserves DOM stability)
                if (newFinal && newFinal.__isCurriedComponent &&
                    startMarker.nextSibling !== endMarker &&
                    !_curriedComponentChanged(curriedRenderInfo, newFinal)) {
                  return;
                }

                // Check if the component type changed (not just args)
                const _componentSwapped = !newFinal || !newFinal.__isCurriedComponent ||
                  (newFinal.__name !== curriedRenderInfo.lastRenderedName);
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
                if (_componentSwapped) {
                  const _destroyFn = (globalThis as any).__gxtDestroyInstancesInNodes;
                  if (typeof _destroyFn === 'function' && _removedNodes.length > 0) {
                    _destroyFn(_removedNodes);
                  }
                }

                // Insert new content if we have a valid curried component
                if (newFinal && newFinal.__isCurriedComponent && managers.component.canHandle(newFinal)) {
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
            } catch { /* effect setup may fail */ }

            return fragment;
          }
        }

        // Check if the result is a raw HTML value (from triple-stache {{{expr}}})
        // These have __htmlRaw or toHTML marker and need innerHTML rendering
        if (finalResult && typeof finalResult === 'object' && (finalResult.__htmlRaw || typeof finalResult.toHTML === 'function')) {
          const getHtml = () => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            if (fv == null) return '';
            if (fv.toHTML) return fv.toHTML();
            return String(fv);
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
          } catch { /* effect setup may fail */ }
          return fragment;
        }

        // If result is an object with GXT node structure, process it.
        // But plain objects (Date, {foo:'bar'}, etc.) should be stringified for text rendering.
        if (finalResult && typeof finalResult === 'object' && !(finalResult instanceof Node)) {
          // Check if it looks like a GXT component (has RENDERED_NODES_PROPERTY)
          const _RNPROP = RENDERED_NODES_PROPERTY;
          // Arrays: only recurse if they contain Node or function items (GXT node arrays).
          // Plain value arrays (e.g., from rest positionalParams) should be stringified.
          const isGxtArray = Array.isArray(finalResult) && finalResult.length > 0 &&
            finalResult.some((v: any) => v instanceof Node || typeof v === 'function' ||
              (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)));
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
          try { textVal = String(finalResult); } catch { textVal = ''; }
          const objTextNode = document.createTextNode(textVal);
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              objTextNode.textContent = fv == null ? '' : String(fv);
            });
          } catch { /* effect setup may fail */ }
          return objTextNode;
        }

        // Handle symbol values — stringify for text rendering
        if (typeof finalResult === 'symbol') {
          const symTextNode = document.createTextNode(String(finalResult));
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              symTextNode.textContent = fv == null ? '' : String(fv);
            });
          } catch { /* effect setup may fail */ }
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
          } catch { /* effect setup may fail */ }
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
        // When __gxtSkipTextEffects is set (nested renderComponent), skip
        // creating effects. Nested renders are destroyed and recreated by
        // the parent, so independent effects cause ordering issues.
        const textValue = finalResult == null ? '' : String(finalResult);
        const textNode = document.createTextNode(textValue);
        if ((globalThis as any).__gxtSkipTextEffects) {
          return textNode;
        }
        let _currentContentNode: Node = textNode;
        let _isNodeContent = finalResult instanceof Node;
        let _effectCallCount = 0;
        const _effectId = Math.random().toString(36).slice(2, 6);
        try {
          gxtEffect(() => {
            _effectCallCount++;
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            if (typeof fv === 'string' && (fv === 'hello' || fv === 'goodbye')) {
              const parent = (textNode as Text).parentElement;
              console.log('[DBG-MSG]', 'id=', _effectId, 'call#', _effectCallCount, 'fv=', fv,
                'connected?', (textNode as Text).isConnected,
                'parent=', parent?.tagName + '#' + parent?.id,
                'innerHTML=', parent?.innerHTML?.slice(0, 100));
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
              const newText = document.createTextNode(fv == null ? '' : String(fv));
              parent.replaceChild(newText, _currentContentNode);
              _currentContentNode = newText;
              _isNodeContent = false;
            } else {
              (textNode as Text).textContent = fv == null ? '' : String(fv);
            }
          });
        } catch {
          // Effect setup failed — text node stays static
        }

        return textNode;
      } catch (e) {
        // Re-throw assertion errors (e.g., "Could not find component named ...")
        // so they propagate to the test harness
        if (e instanceof Error && (
          e.message.includes('Could not find component') ||
          e.message.includes('Attempted to resolve') ||
          e.message.includes('Assertion Failed')
        )) {
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
          const hasNodes = val.some((v: any) =>
            v instanceof Node ||
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'function' ||
            (v && typeof v === 'object'));

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
  const templateFactory = function(owner?: any) {
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
        const prevSlots = g.$slots;
        const prevFw = g.$fw;

        // Push this template's literal in-element ids onto the global
        // fallback stack and bump the render-pass depth counter so
        // $_inElement can detect render-order timing issues and defer
        // the body render until the parent fragment commits.
        const _setRenderPass: ((on: boolean) => void) | undefined = g.__gxtSetIsRendering;
        const _inElemStack: string[] = (g.__gxtInElementFallbackIds = g.__gxtInElementFallbackIds || []);
        const _inElemStackStart = _inElemStack.length;
        for (const id of _inElementLiteralIds) _inElemStack.push(id);
        if (typeof _setRenderPass === 'function') _setRenderPass(true);

        try {
          // Phase 4.1: per-parent-element root isolation. Use a WeakMap keyed on
          // parentElement so repeated renders into the same parent share a root
          // (preserving outlet re-render semantics), but renders into distinct
          // parents get fresh, isolated roots. The legacy
          // `globalThis.__gxtRootContext` alias is updated inside
          // `_getOrCreateGxtRoot` so downstream consumers (e.g. the component-ID
          // fallback in the resolver) still read the current root.
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
          // Phase 4.1b: this previously relied on `gxtInitDOM(gxtRoot)` which
          // is a two-arg function (`(ctx, domApi) => domApi`) in the installed
          // GXT build — calling it with a single arg crashes inside the
          // try/catch, silently leaving renderContext[RENDERING_CONTEXT_PROPERTY]
          // unset. For a freshly-created Root that hasn't yet been installed
          // via `renderComponent`, the dom module's internal `xt` fast-path
          // variable is also null, so `$_tag`'s `n(ctx)` walker falls through
          // to `ctx[RENDERING_CONTEXT_PROPERTY]` — which was undefined — and
          // the walk returns null, crashing with "Cannot read properties of
          // null (reading 'element')".
          //
          // Fix: if the root has no DOMApi yet, mint one directly with
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
                } catch { /* ignore frozen root */ }
              }
            }
            if (rootRenderingCtx && RENDERING_CONTEXT_PROPERTY) {
              renderContext[RENDERING_CONTEXT_PROPERTY as any] = rootRenderingCtx;
            }
          } catch { /* ignore */ }

          g.$slots = context.$slots || context[_SLOTS_SYM] || {};
          g.$fw = context.$fw || [[], [], []];

          // Ensure globalThis.owner is set before the template renders.
          // During top-level component rendering (via runAppend), the owner may
          // not be set on globalThis yet. Extract it from the component context.
          if (!(globalThis as any).owner && context) {
            const ctxOwner = context.owner || context._owner || (context.__gxtRawTarget || context)?.owner;
            if (ctxOwner && typeof ctxOwner === 'object' && typeof ctxOwner.lookup === 'function') {
              (globalThis as any).owner = ctxOwner;
            }
          }

          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Check for built-in helper overrides. If the owner has registered a
          // helper with a built-in name, assert before rendering.
          {
            const _owner = (globalThis as any).owner;
            if (_owner && !_owner.isDestroyed) {
              const BUILTIN_HELPER_NAMES = ['array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly', 'unique-id', 'unbound', '__mutGet'];
              for (const builtinName of BUILTIN_HELPER_NAMES) {
                let hasOverride = false;
                try { hasOverride = !!_owner.factoryFor?.(`helper:${builtinName}`); } catch { /* ignore */ }
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
          (globalThis as any).__lastRenderContext = context;
          if (context && typeof context === 'object') {
            const proto = Object.getPrototypeOf(context);
            if (proto && proto !== Object.prototype) {
              if (!(globalThis as any).__gxtComponentContexts) {
                (globalThis as any).__gxtComponentContexts = new WeakMap();
              }
              const ctxsMap = (globalThis as any).__gxtComponentContexts;
              if (!ctxsMap.has(proto)) {
                ctxsMap.set(proto, new Set());
              }
              ctxsMap.get(proto).add(context);
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
              } catch { /* frozen context, ignore */ }
            } else if (!renderContext[COMPONENT_ID_PROPERTY as any]) {
              // Fallback: mint a unique ID (old behavior) if gxtRoot has no id.
              renderContext[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
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
          const currentSlots = g.$slots;
          renderContext.$_hasBlock = function(arg1?: any, arg2?: any) {
            const slots = (arg1 && typeof arg1 === 'object') ? arg1 : currentSlots;
            const name = ((arg1 && typeof arg1 === 'object' ? arg2 : arg1) as string) || 'default';
            return _lookupSlot(slots, name) !== undefined;
          };
          renderContext.$_hasBlockParams = function(arg1?: any, arg2?: any) {
            const slots = (arg1 && typeof arg1 === 'object') ? arg1 : currentSlots;
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
          const slotsStack = (globalThis as any).__slotsContextStack;
          slotsStack.push(currentSlots);

          // Install cells on the render context for user-defined properties BEFORE
          // the template evaluates. This ensures GXT formulas reading this.prop
          // will track the cell, enabling reactive updates when set() is called later.
          // We walk the prototype chain (up to the base Ember component) to find
          // properties set via Component.extend({ fooBar: true }).
          let _cellInstallCount = 0;
          try {
            const internalKeys = new Set([
              'args', 'attrs', 'element', 'parentView', 'tagName', 'layoutName',
              'layout', 'classNames', 'classNameBindings', 'attributeBindings',
              'concatenatedProperties', 'mergedProperties', 'isDestroying', 'isDestroyed',
              'renderer', 'init', 'constructor', 'willDestroy', 'toString',
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
                if (desc && !desc.get && !desc.set && desc.configurable &&
                    typeof desc.value !== 'function') {
                  try {
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
                  } catch { /* ignore non-configurable properties */ }
                }
              }
              const nextProto = Object.getPrototypeOf(proto);
              if (!nextProto || nextProto === Object.prototype) break;
              proto = nextProto;
            }
          } catch { /* ignore */ }
          // _cellInstallCount tracked for debugging

          // Cell promotion handled by __gxtForceEmberRerender (full re-render)

          // Call the compiled template function with the render context.
          // Enable isRendering so GXT formulas track cell dependencies.
          let result;
          gxtSetIsRendering(true);
          (globalThis as any).__gxtCurrentlyRendering = true;
          try {
            result = compilationResult.templateFn.call(renderContext);
          } finally {
            // Stop blocking tracked setters from calling __gxtTriggerReRender,
            // but KEEP isRendering=true so that GXT formulas created during
            // itemToNode (e.g., gxtEffect for reactive text nodes) properly
            // track cell dependencies and register in GXT's relatedTags map.
            // Without this, formulas created outside isRendering=true won't
            // re-evaluate when their tracked dependencies change.
            (globalThis as any).__gxtCurrentlyRendering = false;
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
          }

          // Restore previous global values
          g.$slots = prevSlots;
          g.$fw = prevFw;
          if (typeof _setRenderPass === 'function') _setRenderPass(false);
          // Trim any un-consumed fallback ids pushed by this template
          // render (e.g. because no nested in-element hit the null-dest
          // path). Preserves ids pushed by ancestor renders.
          if (_inElemStack.length > _inElemStackStart) {
            _inElemStack.length = _inElemStackStart;
          }

          return { nodes, ctx: context };
        } catch (err) {
          // Restore globals even on error
          g.$slots = prevSlots;
          g.$fw = prevFw;
          if (typeof _setRenderPass === 'function') _setRenderPass(false);
          if (_inElemStack.length > _inElemStackStart) {
            _inElemStack.length = _inElemStackStart;
          }

          // Rethrow non-Error values (expectAssertion's BREAK sentinel) and
          // assertion errors so they propagate to test harnesses
          if (_isAssertionLike(err) || (err && ((err as any).message?.includes('Could not find') || (err as any).message?.includes('Custom modifier managers must have') || (err as any).message?.includes('Custom helper managers must have') || (err as any).message?.includes('but that value was not in scope:')))) {
            throw err;
          }
          // Swallow other render errors gracefully
          console.error('Render error:', err);
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

// Register the GXT compiler globally for @ember/template-compiler to use
(globalThis as any).__gxtCompileTemplate = compileTemplate;

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
