import type { Nullable } from '@glimmer/interfaces';
import { assign } from '@glimmer/util';
import { parseTemplate } from '../hbs-parser/index.js';
import HTML5NamedCharRefs from './html5-named-char-refs.js';

import type { NodeVisitor } from '../traversal/visitor';
import type * as ASTv1 from '../v1/api';

import print from '../generation/print';
import * as src from '../source/api';
import { generateSyntaxError } from '../syntax-error';
import traverse from '../traversal/traverse';
import Walker from '../traversal/walker';
import { buildLegacyPath } from '../v1/legacy-interop';
import publicBuilder from '../v1/public-builders';

// ============================================================================
// Entity decoding helper
// ============================================================================

// Full HTML5 entity decoding, covering ~2200 named entities plus numeric
// &#dd; and &#xHH; forms. The named-entity table is vendored from the HTML5
// spec (see ./html5-named-char-refs.js).
const ENTITY_RE = /&(#[xX]([0-9a-fA-F]+)|#([0-9]+)|([A-Za-z][A-Za-z0-9]*));/g;

function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (match, _body, hex, dec, name) => {
    if (hex !== undefined) return String.fromCodePoint(parseInt(hex, 16));
    if (dec !== undefined) return String.fromCodePoint(parseInt(dec, 10));
    return HTML5NamedCharRefs[name] ?? match;
  });
}

// ============================================================================
// Location adjustment helpers
// ============================================================================

function adjustTextNodeStart(node: ASTv1.TextNode, count: number): void {
  if (count <= 0) return;
  node.loc = node.loc.withStart(node.loc.getStart().move(count));
}

function adjustTextNodeEnd(node: ASTv1.TextNode, count: number): void {
  if (count <= 0) return;
  node.loc = node.loc.withEnd(node.loc.getEnd().move(-count));
}

// ============================================================================
// Standalone whitespace stripping (post-processing)
// ============================================================================

/**
 * Determines if a node is a "block-level" node that could be standalone
 * (i.e., alone on a line with only whitespace).
 */
function isStandaloneCandidate(
  node: ASTv1.Statement
): node is ASTv1.BlockStatement | ASTv1.MustacheCommentStatement {
  return node.type === 'BlockStatement' || node.type === 'MustacheCommentStatement';
}

/**
 * Perform standalone whitespace stripping on a body array.
 *
 * For block-level nodes (BlockStatement, MustacheCommentStatement) that appear
 * alone on a line (surrounded only by whitespace), strip the trailing newline
 * from the preceding TextNode and the leading whitespace+newline from the
 * following TextNode.
 */
function stripStandalone(body: ASTv1.Statement[], isRoot: boolean = true): void {
  // Analyze each candidate's standalone-ness up front — BEFORE any mutation —
  // so the later surrounding-text strip doesn't destroy the signals the
  // internal strip still needs. Handlebars' whitespace-control does the
  // analyze/strip in one pass per node; we just precompute the flags.
  type StandaloneFlags = { surrounding: boolean; internal: boolean };
  const flags: (StandaloneFlags | undefined)[] = body.map((node, i) => {
    if (!isStandaloneCandidate(node)) return undefined;
    const prev: ASTv1.Statement | undefined = body[i - 1];
    const next: ASTv1.Statement | undefined = body[i + 1];
    const prevHasSibling = i >= 2;
    const nextHasSibling = i + 2 < body.length;

    let prevIsWhitespace: boolean;
    if (!prev) prevIsWhitespace = isRoot;
    else if (prev.type === 'TextNode') {
      const re = prevHasSibling || !isRoot ? /\r?\n[ \t]*$/u : /(^|\r?\n)[ \t]*$/u;
      prevIsWhitespace = re.test(prev.chars);
    } else prevIsWhitespace = false;

    let nextIsWhitespace: boolean;
    if (!next) nextIsWhitespace = isRoot;
    else if (next.type === 'TextNode') {
      const re = nextHasSibling || !isRoot ? /^[ \t]*\r?\n/u : /^[ \t]*(\r?\n|$)/u;
      nextIsWhitespace = re.test(next.chars);
    } else nextIsWhitespace = false;

    // When prev is missing but the block sits mid-line (col > 0), it's not
    // standalone — there's non-whitespace content before it on this line.
    if (!prev && node.type === 'BlockStatement') {
      try {
        if (node.loc.startPosition.column > 0) prevIsWhitespace = false;
      } catch {
        /* loc unavailable — conservatively leave as-is */
      }
    }

    let surrounding = prevIsWhitespace && nextIsWhitespace;
    let internal = false;
    if (surrounding && node.type === 'BlockStatement') {
      const firstProg = node.program.body[0];
      internal =
        firstProg !== undefined &&
        firstProg.type === 'TextNode' &&
        /^[ \t]*\r?\n/u.test(firstProg.chars);
    }
    return { surrounding, internal };
  });

  // Recurse post-order so nested standalone decisions see unmutated text.
  for (const node of body) {
    if (node.type === 'BlockStatement') {
      stripStandalone(node.program.body, false);
      if (node.inverse) stripStandalone(node.inverse.body, false);
    } else if (node.type === 'ElementNode') {
      stripStandalone(node.children, false);
    }
  }

  // Apply surrounding-text strip for every standalone candidate.
  for (let i = 0; i < body.length; i++) {
    const f = flags[i];
    if (!f || !f.surrounding) continue;
    const prev: ASTv1.Statement | undefined = body[i - 1];
    const next: ASTv1.Statement | undefined = body[i + 1];
    if (prev && prev.type === 'TextNode') {
      const lastNewline = prev.chars.lastIndexOf('\n');
      const oldLen = prev.chars.length;
      prev.chars = lastNewline === -1 ? '' : prev.chars.slice(0, lastNewline + 1);
      adjustTextNodeEnd(prev, oldLen - prev.chars.length);
    }
    if (next && next.type === 'TextNode') {
      const oldLen = next.chars.length;
      next.chars = next.chars.replace(/^[ \t]*\r?\n?/u, '');
      adjustTextNodeStart(next, oldLen - next.chars.length);
    }
  }

  // Apply internal strip for standalone BlockStatements.
  for (let i = 0; i < body.length; i++) {
    const node = body[i];
    if (!node || node.type !== 'BlockStatement') continue;
    const f = flags[i];
    if (!f || !f.internal) continue;

    const prog = node.program.body;
    const firstProg = prog[0];
    if (firstProg && firstProg.type === 'TextNode') {
      const oldLen = firstProg.chars.length;
      firstProg.chars = firstProg.chars.replace(/^[ \t]*\r?\n/u, '');
      adjustTextNodeStart(firstProg, oldLen - firstProg.chars.length);
    }

    if (node.inverse) {
      const lastProg = prog[prog.length - 1];
      if (lastProg && lastProg.type === 'TextNode') {
        const text = lastProg.chars;
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline !== -1 && /^[ \t]*$/u.test(text.slice(lastNewline + 1))) {
          const oldLen = lastProg.chars.length;
          lastProg.chars = text.slice(0, lastNewline + 1);
          adjustTextNodeEnd(lastProg, oldLen - lastProg.chars.length);
        }
      }
      const firstInv = node.inverse.body[0];
      if (firstInv && firstInv.type === 'TextNode') {
        const oldLen = firstInv.chars.length;
        firstInv.chars = firstInv.chars.replace(/^[ \t]*\r?\n/u, '');
        adjustTextNodeStart(firstInv, oldLen - firstInv.chars.length);
      }
    }

    const lastBody = node.inverse ? node.inverse.body : node.program.body;
    const lastItem = lastBody[lastBody.length - 1];
    if (lastItem && lastItem.type === 'TextNode') {
      const text = lastItem.chars;
      const lastNewline = text.lastIndexOf('\n');
      if (lastNewline !== -1 && /^[ \t]*$/u.test(text.slice(lastNewline + 1))) {
        const oldLen = lastItem.chars.length;
        lastItem.chars = text.slice(0, lastNewline + 1);
        adjustTextNodeEnd(lastItem, oldLen - lastItem.chars.length);
      }
    }

    removeEmptyTextNodes(node.program.body);
    if (node.inverse) removeEmptyTextNodes(node.inverse.body);
  }

  removeEmptyTextNodes(body);
}

function removeEmptyTextNodes(body: ASTv1.Statement[]): void {
  for (let i = body.length - 1; i >= 0; i--) {
    let node = body[i];
    if (node && node.type === 'TextNode' && node.chars === '') {
      body.splice(i, 1);
    }
  }
}

// ============================================================================
// Strip flags processing (post-processing)
// ============================================================================

/**
 * Apply tilde-strip flags (~) from mustaches and blocks.
 * {{~ strips preceding whitespace, ~}} strips following whitespace.
 */
function applyStripFlags(body: ASTv1.Statement[]): void {
  for (let i = 0; i < body.length; i++) {
    let node = body[i];
    if (!node) continue;

    let strip: { open: boolean; close: boolean } | undefined;

    if (node.type === 'MustacheStatement') {
      strip = node.strip;
    } else if (node.type === 'MustacheCommentStatement') {
      strip = (node as unknown as { strip: { open: boolean; close: boolean } }).strip;
    } else if (node.type === 'BlockStatement') {
      // For blocks: openStrip.open = leading ~, closeStrip.close = trailing ~
      if (node.openStrip.open) {
        stripPrecedingWhitespace(body, i);
      }
      if (node.closeStrip.close) {
        stripFollowingWhitespace(body, i);
      }

      // Inner block whitespace stripping:
      // openStrip.close ({{#foo~}}) -> strip leading whitespace in program
      if (node.openStrip.close) {
        stripLeadingWhitespace(node.program.body);
      }
      // inverseStrip.open ({{~else}}) -> strip trailing whitespace in program
      if (node.inverseStrip.open) {
        stripTrailingWhitespace(node.program.body);
      }
      // inverseStrip.close ({{else~}}) -> strip leading whitespace in inverse
      if (node.inverse && node.inverseStrip.close) {
        stripLeadingWhitespace(node.inverse.body);
      }
      // closeStrip.open ({{~/foo}}) -> strip trailing whitespace in inverse (or program)
      if (node.closeStrip.open) {
        if (node.inverse) {
          stripTrailingWhitespace(node.inverse.body);
        } else {
          stripTrailingWhitespace(node.program.body);
        }
      }

      // Recurse into block bodies
      applyStripFlags(node.program.body);
      if (node.inverse) applyStripFlags(node.inverse.body);
      continue;
    }

    if (node.type === 'ElementNode') {
      applyStripFlags(node.children);
      continue;
    }

    if (!strip) continue;

    if (strip.open) {
      stripPrecedingWhitespace(body, i);
    }
    if (strip.close) {
      stripFollowingWhitespace(body, i);
    }
  }

  // Remove empty TextNodes left after stripping
  for (let i = body.length - 1; i >= 0; i--) {
    let node = body[i];
    if (node && node.type === 'TextNode' && node.chars === '') {
      body.splice(i, 1);
    }
  }
}

function stripPrecedingWhitespace(body: ASTv1.Statement[], index: number): void {
  let prev = index > 0 ? body[index - 1] : null;
  if (prev && prev.type === 'TextNode') {
    let oldLen = prev.chars.length;
    prev.chars = prev.chars.replace(/[ \t\r\n]+$/u, '');
    adjustTextNodeEnd(prev, oldLen - prev.chars.length);
  }
}

function stripFollowingWhitespace(body: ASTv1.Statement[], index: number): void {
  let next = index < body.length - 1 ? body[index + 1] : null;
  if (next && next.type === 'TextNode') {
    let oldLen = next.chars.length;
    next.chars = next.chars.replace(/^[ \t\r\n]+/u, '');
    adjustTextNodeStart(next, oldLen - next.chars.length);
  }
}

function stripLeadingWhitespace(body: ASTv1.Statement[]): void {
  let first = body[0];
  if (first && first.type === 'TextNode') {
    let oldLen = first.chars.length;
    first.chars = first.chars.replace(/^[ \t\r\n]+/u, '');
    adjustTextNodeStart(first, oldLen - first.chars.length);
  }
}

function stripTrailingWhitespace(body: ASTv1.Statement[]): void {
  let last = body.length > 0 ? body[body.length - 1] : null;
  if (last && last.type === 'TextNode') {
    let oldLen = last.chars.length;
    last.chars = last.chars.replace(/[ \t\r\n]+$/u, '');
    adjustTextNodeEnd(last, oldLen - last.chars.length);
  }
}

// ============================================================================
// Comment strip cleanup (post-processing)
// ============================================================================

/**
 * Remove the internal `strip` property from MustacheCommentStatement nodes.
 * This property is used internally for whitespace stripping but should not
 * appear in the final AST (it's not part of the ASTv1 interface).
 */
function cleanupCommentStrip(body: ASTv1.Statement[]): void {
  for (let node of body) {
    if (node.type === 'MustacheCommentStatement') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (node as any).strip;
    } else if (node.type === 'BlockStatement') {
      cleanupCommentStrip(node.program.body);
      if (node.inverse) cleanupCommentStrip(node.inverse.body);
    } else if (node.type === 'ElementNode') {
      // Also clean up comments in element's comments array
      for (let comment of node.comments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (comment as any).strip;
      }
      cleanupCommentStrip(node.children);
    }
  }
}

// ============================================================================
// Entity decoding pass (post-processing)
// ============================================================================

/**
 * Walk the AST and decode HTML entities in TextNode chars and text attribute values.
 */
function decodeEntitiesInAST(node: ASTv1.Template): void {
  walkNodes(node.body);
}

function walkNodes(body: ASTv1.Statement[]): void {
  for (let node of body) {
    switch (node.type) {
      case 'TextNode':
        node.chars = decodeEntities(node.chars);
        break;
      case 'ElementNode':
        for (let attr of node.attributes) {
          if (attr.value.type === 'TextNode') {
            attr.value.chars = decodeEntities(attr.value.chars);
          } else if (attr.value.type === 'ConcatStatement') {
            for (let part of attr.value.parts) {
              if (part.type === 'TextNode') {
                part.chars = decodeEntities(part.chars);
              }
            }
          }
        }
        walkNodes(node.children);
        break;
      case 'BlockStatement':
        walkNodes(node.program.body);
        if (node.inverse) walkNodes(node.inverse.body);
        break;
    }
  }
}

// ============================================================================
// Location conversion
// ============================================================================

// Peggy's location() returns `{ start: { offset, line, column }, end: {...} }`
// where offset is already the 0-based character offset into the source string —
// exactly what SourceSpan.forCharPositions needs. Use it directly instead of
// re-deriving the offset from line/column via source.offsetFor/charPosFor.
function peggySpanToSourceSpan(
  source: src.Source,
  span: { start: { offset: number }; end: { offset: number } }
): src.SourceSpan {
  return src.SourceSpan.forCharPositions(source, span.start.offset, span.end.offset);
}

function isPeggySpan(val: unknown): val is { start: { offset: number }; end: { offset: number } } {
  if (!val || typeof val !== 'object') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = val as any;
  return v.start && typeof v.start.offset === 'number' && v.end && typeof v.end.offset === 'number';
}

/**
 * Convert plain {start, end} location objects to SourceSpan instances in place.
 * PathExpression nodes are upgraded via buildLegacyPath so that setting
 * `node.original` propagates to `head`/`tail`.
 *
 * The Peggy grammar produces plain objects that are safe to mutate. Mutating
 * avoids allocating a fresh copy of the entire AST per parse — a dominant cost
 * on large templates where the AST has thousands of nodes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertLocations(node: any, source: src.Source): any {
  if (!node || typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      const converted = convertLocations(child, source);
      if (converted !== child) node[i] = converted;
    }
    return node;
  }

  // Convert the three known location-bearing fields in place.
  if (isPeggySpan(node.loc)) {
    node.loc = peggySpanToSourceSpan(source, node.loc);
  }
  if (isPeggySpan(node.openTag)) {
    node.openTag = peggySpanToSourceSpan(source, node.openTag);
  }
  if ('closeTag' in node) {
    if (node.closeTag === undefined) {
      node.closeTag = null;
    } else if (isPeggySpan(node.closeTag)) {
      node.closeTag = peggySpanToSourceSpan(source, node.closeTag);
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'openTag' || key === 'closeTag') continue;
    if (node.type === 'PathExpression' && key === 'original') continue;
    const val = node[key];
    if (val && typeof val === 'object') {
      const converted = convertLocations(val, source);
      if (converted !== val) node[key] = converted;
    }
  }

  if (node.type === 'PathExpression') {
    return buildLegacyPath({
      head: node.head,
      tail: node.tail,
      loc: node.loc,
    });
  }

  return node;
}

// ============================================================================
// Public types and interfaces
// ============================================================================

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

// ============================================================================
// Parse error conversion
// ============================================================================

/**
 * Convert a parse error from the Peggy grammar into a GlimmerSyntaxError
 * with the expected format (module name, line, column, code snippet).
 *
 * The Jison-compatible error path exists because Prettier's Handlebars
 * printer reads `err.hash.loc` and the `Parse error on line N:\n…\n^`
 * message shape — keep that format intact when touching this function.
 */
function convertParseError(e: Error, source: src.Source): Error {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = e as any;

  if (err.name === 'SyntaxError' && err.location) {
    // Peggy reports 1-based columns in its printed message; Glimmer uses 0-based.
    const line = err.location.start.line;
    const column = err.location.start.column - 1;

    // For certain error messages, produce a zero-length span at the offending
    // character. Peggy's match spans whitespace, so we back up one char from
    // the end position.
    const zeroLengthErrors = [
      '" is not a valid character within attribute names',
      'attribute name cannot start with equals sign',
    ];
    if (zeroLengthErrors.includes(err.message)) {
      const errorOffset = err.location.end.offset - 1;
      const span = src.SourceSpan.forCharPositions(source, errorOffset, errorOffset);
      return generateSyntaxError(err.message, span);
    }

    // Prettier consumes a Jison-shaped error for "Expecting ...". Preserve it.
    if (err.message.startsWith("Expecting '")) {
      const inputLines = source.source.split('\n');
      const sourceLine = inputLines.slice(0, line).join('');
      const pointer =
        '-'.repeat(sourceLine.length - (inputLines[line - 1] || '').length + column) + '^';
      const fullMsg = `Parse error on line ${line}:\n${sourceLine}\n${pointer}\n${err.message}`;
      const jisonError = new Error(fullMsg);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jisonError as any).hash = {
        text: '',
        line: line - 1,
        loc: { first_line: line, last_line: line, first_column: column, last_column: column },
      };
      return jisonError;
    }

    const span = peggySpanToSourceSpan(source, err.location);
    return generateSyntaxError(err.message, span);
  }

  // Errors already reshaped to Jison form (see above) — unwrap the message.
  if (err.hash && err.hash.loc) {
    const startOffset =
      source.offsetFor(err.hash.loc.first_line, err.hash.loc.first_column).offset ?? 0;
    const span = src.SourceSpan.forCharPositions(source, startOffset, startOffset);

    // Extract the core message from "Parse error on line N:\nMESSAGE"
    const match = err.message.match(/^Parse error on line \d+:\n([\s\S]*)$/);
    const message = match ? match[1] : err.message;
    return generateSyntaxError(message, span);
  }

  return e;
}

// ============================================================================
// Main preprocess function (unified Peggy grammar pipeline)
// ============================================================================

export function preprocess(
  input: string | src.Source,
  options: PreprocessOptions = {}
): ASTv1.Template {
  let mode = options.mode || 'precompile';
  let source: src.Source;
  let inputStr: string;

  if (typeof input === 'string') {
    inputStr = input;
    source = new src.Source(input, options.meta?.moduleName);
  } else if (input instanceof src.Source) {
    inputStr = input.source;
    source = input;
  } else {
    // Legacy: input could be an HBS.Program object.
    // For backward compat, try to handle string coercion, but this path
    // should not be hit in normal usage with the new pipeline.
    throw new Error(
      'preprocess() no longer accepts a pre-parsed HBS AST. Pass a string or Source object.'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawTemplate: any;
  try {
    rawTemplate = parseTemplate(inputStr, { srcName: options.parseOptions?.srcName });
  } catch (e) {
    throw convertParseError(e as Error, source);
  }

  // Convert plain location objects to SourceSpan instances
  let template: ASTv1.Template = convertLocations(rawTemplate, source);

  // Post-processing: entity decoding (skip in codemod mode)
  if (mode !== 'codemod') {
    decodeEntitiesInAST(template);
  }

  // Post-processing: apply strip flags (~)
  if (mode !== 'codemod') {
    applyStripFlags(template.body);
  }

  // Clean up: remove internal strip property from MustacheCommentStatement nodes
  cleanupCommentStrip(template.body);

  // Post-processing: standalone whitespace stripping
  if (mode !== 'codemod' && !options.parseOptions?.ignoreStandalone) {
    stripStandalone(template.body);
  }

  // Point template.blockParams at options.locals BY REFERENCE, not by copy.
  //
  // babel-plugin-ember-template-compilation passes `options.locals` as a
  // readOnlyArray proxy over its internal ScopeLocals array. As plugins run
  // (notably `scope.crawl` from the babel plugin), they mutate that underlying
  // array via `scope.add(name)`. Because the proxy is live, template.blockParams
  // automatically reflects those mutations — so by the time later plugins like
  // auto-import-builtins read `template.blockParams` in their trackLocals pass,
  // they correctly see the lexical scope variables that were discovered by
  // earlier plugins. If we copy here (e.g. `[...options.locals]`), we freeze
  // the snapshot at preprocess-start time and auto-import-builtins ends up
  // rewriting names that should have been recognized as shadowed locals.
  if (options.locals) {
    template.blockParams = options.locals;
  }

  // Run AST plugins
  if (options.plugins?.ast) {
    for (const transform of options.plugins.ast) {
      let env: ASTPluginEnvironment = assign({}, options, { syntax }, { plugins: undefined });
      let pluginResult = transform(env);
      traverse(template, pluginResult.visitor);
    }
  }

  return template;
}
