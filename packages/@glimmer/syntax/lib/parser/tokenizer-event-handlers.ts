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
import * as wasmModule from '../../pkg/universal.mjs';

function loadRustParser(): RustWasmParser | null {
  if (rustParserLoaded) return rustParser;
  rustParserLoaded = true;

  try {
    rustParser = wasmModule as unknown as RustWasmParser;
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
  const { message, loc, context } = error;

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
