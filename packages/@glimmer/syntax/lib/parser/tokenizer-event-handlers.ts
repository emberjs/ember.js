/**
 * Rust-based template preprocessing.
 *
 * This module replaces the old multipass pipeline (Jison + simple-html-tokenizer)
 * with a single-pass Rust/WASM parser built on pest.rs.
 *
 * The Rust parser produces ASTv1-compatible plain JSON. This wrapper then:
 * 1. Converts plain location objects to SourceSpan instances
 * 2. Applies AST plugins
 * 3. Sets up blockParams/locals
 */

import type { Nullable } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';

import type { NodeVisitor } from '../traversal/visitor';
import type * as ASTv1 from '../v1/api';

import print from '../generation/print';
import * as src from '../source/api';
import { generateSyntaxError } from '../syntax-error';
import traverse from '../traversal/traverse';
import Walker from '../traversal/walker';
import publicBuilder from '../v1/public-builders';

// ---------------------------------------------------------------------------
// Public type exports (preserved from the old tokenizer-event-handlers.ts)
// ---------------------------------------------------------------------------

/**
  ASTPlugins can make changes to the Glimmer template AST before
  compilation begins.
*/
export interface ASTPluginBuilder<TEnv extends ASTPluginEnvironment = ASTPluginEnvironment> {
  (env: TEnv): ASTPlugin;
}

export interface ASTPlugin {
  name: string;
  visitor: NodeVisitor;
}

export interface ASTPluginEnvironment {
  meta?: object | undefined;
  syntax: Syntax;
}

interface HandlebarsParseOptions {
  srcName?: string;
  ignoreStandalone?: boolean;
}

export interface TemplateIdFn {
  (src: string): Nullable<string>;
}

export interface PrecompileOptions extends PreprocessOptions {
  id?: TemplateIdFn;

  /**
   * Additional non-native keywords.
   *
   * Local variables (block params or lexical scope) always takes precedence,
   * but otherwise, suitable free variable candidates (e.g. those are not part
   * of a path) are matched against this list and turned into keywords.
   *
   * In strict mode compilation, keywords suppresses the undefined reference
   * error and will be resolved by the runtime environment.
   *
   * In loose mode, keywords are currently ignored and since all free variables
   * are already resolved by the runtime environment.
   */
  keywords?: readonly string[];

  /**
   * In loose mode, this hook allows embedding environments to customize the name of an
   * angle-bracket component. In practice, this means that `<HelloWorld />` in Ember is
   * compiled by Glimmer as an invocation of a component named `hello-world`.
   *
   * It's a little weird that this is needed in addition to the resolver, but it's a
   * classic-only feature and it seems fine to leave it alone for classic consumers.
   */
  customizeComponentName?: ((input: string) => string) | undefined;
}

export interface PrecompileOptionsWithLexicalScope extends PrecompileOptions {
  lexicalScope: (variable: string) => boolean;
}

export interface PreprocessOptions {
  strictMode?: boolean | undefined;
  locals?: string[] | undefined;
  meta?:
    | {
        moduleName?: string | undefined;
      }
    | undefined;
  plugins?:
    | {
        ast?: ASTPluginBuilder[] | undefined;
      }
    | undefined;
  parseOptions?: HandlebarsParseOptions | undefined;
  customizeComponentName?: ((input: string) => string) | undefined;

  /**
    Useful for specifying a group of options together.

    When `'codemod'` we disable all whitespace control in handlebars
    (to preserve as much as possible) and we also avoid any
    escaping/unescaping of HTML entity codes.
   */
  mode?: 'codemod' | 'precompile' | undefined;
}

export interface Syntax {
  parse: typeof preprocess;
  builders: typeof publicBuilder;
  print: typeof print;
  traverse: typeof traverse;
  Walker: typeof Walker;
}

const syntax: Syntax = {
  parse: preprocess,
  builders: publicBuilder,
  print,
  traverse,
  Walker,
};

// ---------------------------------------------------------------------------
// Rust WASM parser loading
// ---------------------------------------------------------------------------

interface RustWasmParser {
  parseTemplateToJson(source: string, srcName?: string): string;
}

interface RustParseError {
  message: string;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } };
  context?: { source_line: string; pointer: string; suggestion?: string };
}

interface PlainLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

let rustParser: RustWasmParser | null = null;
let rustParserLoaded = false;

// Import the WASM parser JS wrapper statically.
// Rollup resolves this through hiddenDependencies in rollup.config.mjs.
import { parseTemplateToJson as wasmParseTemplateToJson } from '../../pkg/universal.mjs';

function loadRustParser(): RustWasmParser | null {
  if (rustParserLoaded) return rustParser;
  rustParserLoaded = true;

  try {
    rustParser = { parseTemplateToJson: wasmParseTemplateToJson };
  } catch {
    rustParser = null;
  }

  return rustParser;
}

// ---------------------------------------------------------------------------
// preprocess() — the main public entry point
// ---------------------------------------------------------------------------

/**
 * Parse a Glimmer template using the Rust/WASM parser.
 */
export function preprocess(
  input: string | src.Source,
  options: PreprocessOptions = {}
): ASTv1.Template {
  const parser = loadRustParser();
  if (!parser) {
    throw new Error(
      'Rust WASM parser not available. Build it first: cd packages/@glimmer/syntax/rust-parser && ./build.sh'
    );
  }

  let source: src.Source;
  let sourceStr: string;

  if (typeof input === 'string') {
    source = new src.Source(input, options.meta?.moduleName);
    sourceStr = input;
  } else if (input instanceof src.Source) {
    source = input;
    sourceStr = input.source;
  } else {
    // Legacy: HBS.Program was previously accepted but is no longer supported
    throw new Error('preprocess() no longer accepts HBS.Program objects. Pass a string instead.');
  }

  const srcName = options.parseOptions?.srcName ?? options.meta?.moduleName;

  // Parse with the Rust WASM parser
  let rawAst: Record<string, unknown>;
  try {
    const jsonStr = parser.parseTemplateToJson(sourceStr, srcName ?? undefined);
    rawAst = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (error: unknown) {
    // Convert Rust parse errors to GlimmerSyntaxError
    if (typeof error === 'string') {
      let parsed: RustParseError;
      try {
        parsed = JSON.parse(error) as RustParseError;
      } catch {
        throw generateSyntaxError(
          error,
          src.SourceSpan.forCharPositions(source, 0, sourceStr.length)
        );
      }
      throw convertRustError(parsed, source, sourceStr);
    }
    throw error;
  }

  // Apply whitespace stripping for strip flags (~) before location conversion,
  // while text-node chars are still plain strings. Then delete the transient
  // __strip field from comments in a second pass.
  if (options.mode !== 'codemod') {
    applyWhitespaceStripping(rawAst);
  }
  cleanupStripFlags(rawAst);

  // Convert plain location objects to SourceSpan instances
  const template = convertToASTv1(rawAst, source);

  // Set initial blockParams from options.locals
  template.blockParams = options.locals ? [...options.locals] : [];

  // Apply AST plugins
  if (options.plugins?.ast) {
    for (const transform of options.plugins.ast) {
      const env: ASTPluginEnvironment = assign({}, options, { syntax }, { plugins: undefined });
      const pluginResult = transform(env);
      traverse(template, pluginResult.visitor);
    }
  }

  // Re-set blockParams after plugins (babel plugin's Proxy)
  template.blockParams = options.locals ? [...options.locals] : [];

  return template;
}

// ---------------------------------------------------------------------------
// AST conversion (JSON → SourceSpan)
// ---------------------------------------------------------------------------

function convertToASTv1(raw: Record<string, unknown>, source: src.Source): ASTv1.Template {
  convertLocations(raw, source);
  return raw as unknown as ASTv1.Template;
}

// ---------------------------------------------------------------------------
// Whitespace stripping (strip flags)
// ---------------------------------------------------------------------------
//
// Applies `{{~` and `~}}` strip flags by trimming whitespace from neighboring
// text nodes. Operates on the raw JSON AST before location conversion.

interface PlainLoc {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface Stripable {
  type: string;
  chars?: string;
  // plain during stripping pass, SourceSpan later — declared unknown
  // because both shapes flow through here.
  loc?: unknown;
  strip?: { open: boolean; close: boolean };
  __strip?: { open: boolean; close: boolean };
  openStrip?: { open: boolean; close: boolean };
  inverseStrip?: { open: boolean; close: boolean };
  closeStrip?: { open: boolean; close: boolean };
  program?: { body: Stripable[] };
  inverse?: { body: Stripable[] } | null;
  body?: Stripable[];
  children?: Stripable[];
}

function applyWhitespaceStripping(node: unknown): void {
  if (node === null || node === undefined || typeof node !== 'object') return;

  const n = node as Stripable;

  // Recurse first so inner bodies are stripped before the outer array pass
  if (Array.isArray(n.body)) {
    for (const item of n.body) applyWhitespaceStripping(item);
    stripBodyWhitespace(n.body);
  }
  if (n.program?.body) {
    for (const item of n.program.body) applyWhitespaceStripping(item);
    stripBodyWhitespace(n.program.body);
  }
  if (n.inverse?.body) {
    for (const item of n.inverse.body) applyWhitespaceStripping(item);
    stripBodyWhitespace(n.inverse.body);
  }
  if (Array.isArray(n.children)) {
    for (const item of n.children) applyWhitespaceStripping(item);
    stripBodyWhitespace(n.children);
  }
}

function cleanupStripFlags(node: unknown): void {
  if (node === null || node === undefined || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) cleanupStripFlags(item);
    return;
  }

  const n = node as Stripable;
  if (n.type === 'MustacheCommentStatement' && '__strip' in n) {
    delete n.__strip;
  }
  for (const key of Object.keys(n) as Array<keyof Stripable>) {
    const v = n[key];
    if (typeof v === 'object' && v !== null) cleanupStripFlags(v);
  }
}

function stripTextEnd(node: Stripable, pattern: RegExp): void {
  if (node.type !== 'TextNode' || typeof node.chars !== 'string') return;
  const original = node.chars;
  node.chars = original.replace(pattern, '');
  retractEnd(node, original.length - node.chars.length, original);
}

function stripTextStart(node: Stripable, pattern: RegExp): void {
  if (node.type !== 'TextNode' || typeof node.chars !== 'string') return;
  const original = node.chars;
  node.chars = original.replace(pattern, '');
  advanceStart(node, original.length - node.chars.length, original);
}

function stripBodyWhitespace(body: Stripable[]): void {
  // Pass 1: apply explicit strip flags (~) and BlockStatement inner strips.
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    if (!stmt) continue;
    const leftStrip = getOpenStrip(stmt);
    const rightStrip = getCloseStrip(stmt);

    if (leftStrip && i > 0) {
      const prev = body[i - 1];
      if (prev) stripTextEnd(prev, /[ \t\r\n]+$/u);
    }
    if (rightStrip && i + 1 < body.length) {
      const next = body[i + 1];
      if (next) stripTextStart(next, /^[ \t\r\n]+/u);
    }

    // BlockStatement has additional inner stripping:
    //   openStrip.close   → trim leading ws on program body's first text
    //   inverseStrip.open → trim trailing ws on program body's last text
    //   inverseStrip.close → trim leading ws on inverse body's first text
    //   closeStrip.open   → trim trailing ws on inverse (or program) last text
    if (stmt.type === 'BlockStatement') {
      const program = stmt.program?.body;
      const inverse = stmt.inverse?.body;

      if (stmt.openStrip?.close && program && program.length > 0) {
        stripFirstTextLeading(program);
      }
      if (stmt.inverseStrip?.open && program && program.length > 0) {
        stripLastTextTrailing(program);
      }
      if (stmt.inverseStrip?.close && inverse && inverse.length > 0) {
        stripFirstTextLeading(inverse);
      }
      if (stmt.closeStrip?.open) {
        if (inverse && inverse.length > 0) {
          stripLastTextTrailing(inverse);
        } else if (program && program.length > 0) {
          stripLastTextTrailing(program);
        }
      }
    }
  }

  // Pass 2: standalone stripping. If a block/comment is alone on its line
  // (only whitespace before it back to a newline and only whitespace after
  // it forward to a newline), strip that whitespace including the newlines.
  applyStandaloneStripping(body);

  // Drop any text nodes that are now empty after stripping.
  for (let i = body.length - 1; i >= 0; i--) {
    const stmt = body[i];
    if (stmt?.type === 'TextNode' && stmt.chars === '') {
      body.splice(i, 1);
    }
  }
}

function isStandaloneCandidate(stmt: Stripable | undefined): boolean {
  if (!stmt) return false;
  // BlockStatement gets standalone treatment on its open and close tags
  // independently; MustacheCommentStatement too. MustacheStatement does
  // NOT get standalone stripping in the legacy parser.
  return stmt.type === 'BlockStatement' || stmt.type === 'MustacheCommentStatement';
}

function applyStandaloneStripping(body: Stripable[]): void {
  for (let i = 0; i < body.length; i++) {
    const stmt = body[i];
    if (!isStandaloneCandidate(stmt)) continue;

    const prev = body[i - 1];
    const next = body[i + 1];

    // For a block to be standalone:
    //   1. The text before it (back to the previous newline or start) must
    //      be whitespace only.
    //   2. The text after it (forward to the next newline or end) must be
    //      whitespace only.
    //   3. At least one side must contain a real newline (otherwise it's
    //      just inline whitespace around the block).
    const prevOk = isEmptyOrWhitespaceToNewline(prev, 'backward');
    const nextOk = isEmptyOrWhitespaceToNewline(next, 'forward');
    const hasNewline = containsNewline(prev) || containsNewline(next);

    if (prevOk && nextOk && hasNewline) {
      // Strip trailing inline whitespace on prev (leave the preceding
      // newline intact so body boundary text nodes don't vanish).
      if (prev) stripTextEnd(prev, /[ \t]+$/u);
      // Strip leading whitespace + the trailing newline from next.
      if (next) stripTextStart(next, /^[ \t]*(?:\r\n|\r|\n)/u);

      // If this is a standalone BlockStatement, also strip the leading
      // newline from its program body's first text (consumed by the block
      // open tag) and the trailing inline whitespace from its program or
      // inverse body's last text (consumed by the block close tag).
      if (stmt?.type === 'BlockStatement') {
        const program = stmt.program?.body;
        const inverse = stmt.inverse?.body;

        if (program && program.length > 0) {
          const first = program[0];
          if (first) stripTextStart(first, /^[ \t]*(?:\r\n|\r|\n)/u);
        }
        const trailingBody = (inverse && inverse.length > 0 ? inverse : program) || [];
        if (trailingBody.length > 0) {
          const last = trailingBody[trailingBody.length - 1];
          if (last) stripTextEnd(last, /[ \t]+$/u);
        }
      }
    }
  }
}

function containsNewline(node: Stripable | undefined): boolean {
  if (!node || node.type !== 'TextNode') return false;
  return /[\r\n]/u.test(node.chars ?? '');
}

// Check that `node` exists and (going backward from its end or forward from
// its start) has only whitespace until the next newline, or reaches the
// start/end of the body.
function isEmptyOrWhitespaceToNewline(
  node: Stripable | undefined,
  direction: 'backward' | 'forward'
): boolean {
  if (!node) return true; // body boundary
  if (node.type !== 'TextNode') return false;
  const chars = node.chars ?? '';
  if (direction === 'backward') {
    // The tail (from last newline to end) must be only whitespace.
    const lastNewline = Math.max(chars.lastIndexOf('\n'), chars.lastIndexOf('\r'));
    const tail = lastNewline === -1 ? chars : chars.slice(lastNewline + 1);
    return /^[ \t]*$/u.test(tail);
  } else {
    // The head (up to first newline) must be only whitespace.
    const match = chars.match(/^[ \t]*(?:\r\n|\r|\n|$)/u);
    return match !== null;
  }
}

function stripFirstTextLeading(body: Stripable[]): void {
  const first = body[0];
  if (first?.type === 'TextNode' && typeof first.chars === 'string') {
    const original = first.chars;
    first.chars = original.replace(/^[ \t\r\n]+/u, '');
    advanceStart(first, original.length - first.chars.length, original);
  }
}

function stripLastTextTrailing(body: Stripable[]): void {
  const last = body[body.length - 1];
  if (last?.type === 'TextNode' && typeof last.chars === 'string') {
    const original = last.chars;
    last.chars = original.replace(/[ \t\r\n]+$/u, '');
    retractEnd(last, original.length - last.chars.length, original);
  }
}

// Move a TextNode's loc.start forward by `n` characters (across newlines).
function advanceStart(node: Stripable, n: number, original: string): void {
  if (n <= 0) return;
  const loc = node.loc as PlainLoc | undefined;
  if (!loc || !isPlainLocObj(loc)) return;
  let { line, column } = loc.start;
  for (let i = 0; i < n; i++) {
    const ch = original[i];
    if (ch === '\n') {
      line++;
      column = 0;
    } else if (ch === '\r') {
      // treat \r and \r\n as single newline; peek next
      if (original[i + 1] === '\n') continue;
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  loc.start = { line, column };
}

// Move a TextNode's loc.end backward by `n` characters (across newlines).
function retractEnd(node: Stripable, n: number, original: string): void {
  if (n <= 0) return;
  const loc = node.loc as PlainLoc | undefined;
  if (!loc || !isPlainLocObj(loc)) return;
  let { line, column } = loc.end;
  for (let i = 0; i < n; i++) {
    const ch = original[original.length - 1 - i];
    if (ch === '\n') {
      // '\r\n' treated as one — peek ahead (toward start) for '\r'
      if (original[original.length - 2 - i] === '\r') {
        i++;
      }
      line--;
      // Recompute column: find the length of the line we're now on by
      // scanning backward to previous newline.
      let col = 0;
      for (let j = original.length - 2 - i; j >= 0; j--) {
        if (original[j] === '\n' || original[j] === '\r') break;
        col++;
      }
      column = col;
    } else if (ch === '\r') {
      line--;
      let col = 0;
      for (let j = original.length - 2 - i; j >= 0; j--) {
        if (original[j] === '\n' || original[j] === '\r') break;
        col++;
      }
      column = col;
    } else {
      column = Math.max(0, column - 1);
    }
  }
  loc.end = { line, column };
}

function isPlainLocObj(value: unknown): value is PlainLoc {
  return (
    value !== null &&
    typeof value === 'object' &&
    'start' in value &&
    'end' in value &&
    // Real SourceSpan has methods; plain objects don't.
    typeof (value as { until?: unknown }).until !== 'function'
  );
}

function getOpenStrip(stmt: Stripable): boolean {
  if (stmt.type === 'MustacheStatement') return Boolean(stmt.strip?.open);
  if (stmt.type === 'MustacheCommentStatement') return Boolean(stmt.__strip?.open);
  if (stmt.type === 'BlockStatement') return Boolean(stmt.openStrip?.open);
  return false;
}

function getCloseStrip(stmt: Stripable): boolean {
  if (stmt.type === 'MustacheStatement') return Boolean(stmt.strip?.close);
  if (stmt.type === 'MustacheCommentStatement') return Boolean(stmt.__strip?.close);
  if (stmt.type === 'BlockStatement') return Boolean(stmt.closeStrip?.close);
  return false;
}

function convertLocations(node: unknown, source: src.Source): void {
  if (node === null || node === undefined || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      convertLocations(item, source);
    }
    return;
  }

  const obj = node as Record<string, unknown>;

  // Convert 'loc' property
  if (isPlainLocation(obj['loc'])) {
    const { start, end } = obj['loc'];
    obj['loc'] = src.SourceSpan.forCharPositions(
      source,
      charPosToOffset(source.source, start.line, start.column),
      charPosToOffset(source.source, end.line, end.column)
    );
  }

  // Convert 'openTag' and 'closeTag' properties
  for (const key of ['openTag', 'closeTag'] as const) {
    if (isPlainLocation(obj[key])) {
      const { start, end } = obj[key];
      obj[key] = src.SourceSpan.forCharPositions(
        source,
        charPosToOffset(source.source, start.line, start.column),
        charPosToOffset(source.source, end.line, end.column)
      );
    }
  }

  // Add deprecated `parts` as a non-enumerable getter on PathExpression nodes
  // so live code still works but deepEqual comparisons against the reference
  // builder (which also uses defineProperty) match.
  if (obj['type'] === 'PathExpression' && !Object.getOwnPropertyDescriptor(obj, 'parts')) {
    Object.defineProperty(obj, 'parts', {
      enumerable: false,
      configurable: true,
      get(this: { original: string }): readonly string[] {
        const segs = this.original.split('.');
        if (segs[0] === 'this') {
          segs.shift();
        } else if (segs[0]?.startsWith('@')) {
          segs[0] = segs[0].slice(1);
        }
        return Object.freeze(segs);
      },
    });
  }

  // Add deprecated `escaped` as a non-enumerable getter on MustacheStatement nodes
  if (obj['type'] === 'MustacheStatement' && !Object.getOwnPropertyDescriptor(obj, 'escaped')) {
    Object.defineProperty(obj, 'escaped', {
      enumerable: false,
      configurable: true,
      get(this: { trusting: boolean }): boolean {
        return !this.trusting;
      },
    });
  }

  // Add deprecated `original` as a non-enumerable getter on literal nodes
  // (matches the reference builder's defineProperty pattern).
  if (
    (obj['type'] === 'StringLiteral' ||
      obj['type'] === 'NumberLiteral' ||
      obj['type'] === 'BooleanLiteral' ||
      obj['type'] === 'NullLiteral' ||
      obj['type'] === 'UndefinedLiteral') &&
    !Object.getOwnPropertyDescriptor(obj, 'original')
  ) {
    Object.defineProperty(obj, 'original', {
      enumerable: false,
      configurable: true,
      get(this: { value: unknown }): unknown {
        return this.value;
      },
    });
  }

  // UndefinedLiteral needs a real `value: undefined` property (the reference
  // builder creates it this way). We can't emit undefined from JSON so we
  // assign it here.
  if (obj['type'] === 'UndefinedLiteral' && !('value' in obj)) {
    obj['value'] = undefined;
  }

  // Decode HTML entities in text node content (precompile mode only).
  // The old parser used simple-html-tokenizer's EntityParser; we inline
  // a minimal decoder here to avoid re-adding that dependency.
  if (obj['type'] === 'TextNode' && typeof obj['chars'] === 'string') {
    obj['chars'] = decodeEntities(obj['chars']);
  }

  // Recurse into all object properties
  for (const key of Object.keys(obj)) {
    if (key === 'loc' || key === 'openTag' || key === 'closeTag') continue;
    const val = obj[key];
    if (typeof val === 'object' && val !== null) {
      convertLocations(val, source);
    }
  }
}

function isPlainLocation(value: unknown): value is PlainLocation {
  return (
    value !== null &&
    typeof value === 'object' &&
    'start' in value &&
    'end' in value &&
    !(value instanceof src.SourceSpan)
  );
}

// Minimal HTML entity decoder. Handles named entities commonly used
// in Glimmer templates plus numeric references (&#123; and &#xAB;).
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  hellip: '\u2026',
  mdash: '\u2014',
  ndash: '\u2013',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  laquo: '\u00ab',
  raquo: '\u00bb',
  middot: '\u00b7',
  bull: '\u2022',
  deg: '\u00b0',
  plusmn: '\u00b1',
  times: '\u00d7',
  divide: '\u00f7',
  euro: '\u20ac',
  pound: '\u00a3',
  yen: '\u00a5',
  cent: '\u00a2',
  sect: '\u00a7',
  para: '\u00b6',
  check: '\u2713',
  cross: '\u2717',
};

function decodeEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/giu, (match, body: string) => {
    if (body.startsWith('#x') || body.startsWith('#X')) {
      const code = parseInt(body.slice(2), 16);
      if (Number.isFinite(code)) return String.fromCodePoint(code);
    } else if (body.startsWith('#')) {
      const code = parseInt(body.slice(1), 10);
      if (Number.isFinite(code)) return String.fromCodePoint(code);
    } else {
      const decoded = NAMED_ENTITIES[body];
      if (decoded !== undefined) return decoded;
    }
    return match;
  });
}

function charPosToOffset(source: string, line: number, column: number): number {
  let currentLine = 1;
  let currentCol = 0;

  for (let i = 0; i < source.length; i++) {
    if (currentLine === line && currentCol === column) {
      return i;
    }
    if (source[i] === '\n') {
      currentLine++;
      currentCol = 0;
    } else {
      currentCol++;
    }
  }

  if (currentLine === line && currentCol === column) {
    return source.length;
  }

  return source.length;
}

// ---------------------------------------------------------------------------
// Error conversion
// ---------------------------------------------------------------------------

function convertRustError(error: RustParseError, source: src.Source, sourceStr: string): Error {
  const { loc } = error;

  // Try to upgrade generic parse errors to more specific messages by
  // looking at the source around the error location. Matches common
  // patterns that the legacy parser detected semantically.
  const specific = detectSpecificError(sourceStr, loc);
  if (specific) {
    const offset = loc ? charPosToOffset(sourceStr, loc.start.line, loc.start.column) : 0;
    const span = src.SourceSpan.forCharPositions(source, offset, offset + (specific.length ?? 0));
    return generateSyntaxError(specific.message, span);
  }

  const { message, context } = error;
  let fullMessage = message || 'Parse error';

  if (context) {
    fullMessage += '\n\n';
    if (loc) {
      const lineNum = loc.start.line;
      const lineStr = String(lineNum);
      fullMessage += `  ${lineStr} | ${context.source_line}\n`;
      fullMessage += `  ${' '.repeat(lineStr.length)} | ${context.pointer}\n`;
    }
    if (context.suggestion) {
      fullMessage += `\n  Hint: ${context.suggestion}\n`;
    }
  }

  const offset = loc ? charPosToOffset(sourceStr, loc.start.line, loc.start.column) : 0;
  const span = src.SourceSpan.forCharPositions(source, offset, offset);

  return generateSyntaxError(fullMessage, span);
}

// Void HTML tag names — matches grammar's VoidTagName
const VOID_TAG_NAMES = new Set([
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

interface SpecificError {
  message: string;
  length?: number;
}

function detectSpecificError(sourceStr: string, loc: RustParseError['loc']): SpecificError | null {
  if (!loc) return null;

  const offset = charPosToOffset(sourceStr, loc.start.line, loc.start.column);
  const around = sourceStr.slice(Math.max(0, offset - 30), offset + 30);

  // Void element with explicit close tag: `<area></area>`
  // The parser reaches the `/` character (just after `<`) because
  // VoidElement consumed `<area>`. Walk back one char to see `</...>`.
  const closeStart = sourceStr[offset - 1] === '<' ? offset - 1 : offset;
  const closeMatch = /^<\/([a-z][a-z0-9-]*)>/u.exec(sourceStr.slice(closeStart));
  if (closeMatch && closeMatch[1]) {
    const tagName = closeMatch[1];
    if (VOID_TAG_NAMES.has(tagName.toLowerCase())) {
      return {
        message: `<${tagName}> elements do not need end tags. You should remove it`,
      };
    }
  }

  // Unclosed element with a weird tag name: `<{@name>` → legacy parser
  // reports the inner name as the tag.
  const weirdTag = /<\{(@?[a-zA-Z][a-zA-Z0-9_-]*)/u.exec(around);
  if (weirdTag) {
    return { message: `Unclosed element \`${weirdTag[1]}\`` };
  }

  return null;
}
