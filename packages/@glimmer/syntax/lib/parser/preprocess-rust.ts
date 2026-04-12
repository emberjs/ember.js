/**
 * Rust-based template preprocessing.
 *
 * This module provides `preprocessRust()`, a drop-in replacement for `preprocess()`
 * that uses the Rust/WASM parser instead of the Jison + simple-html-tokenizer pipeline.
 *
 * The Rust parser (pest.rs) produces ASTv1-compatible plain JSON in a single pass.
 * This wrapper then:
 * 1. Converts plain location objects to SourceSpan instances
 * 2. Handles entity decoding (precompile mode)
 * 3. Applies AST plugins
 * 4. Sets up blockParams/locals
 */

import { assign } from '@glimmer/util';

import type { NodeVisitor } from '../traversal/visitor';
import type * as ASTv1 from '../v1/api';

import print from '../generation/print';
import * as src from '../source/api';
import { generateSyntaxError } from '../syntax-error';
import traverse from '../traversal/traverse';
import Walker from '../traversal/walker';
import publicBuilder from '../v1/public-builders';

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

export interface Syntax {
  parse: typeof preprocessRust;
  builders: typeof publicBuilder;
  print: typeof print;
  traverse: typeof traverse;
  Walker: typeof Walker;
}

export interface PreprocessOptions {
  strictMode?: boolean | undefined;
  locals?: string[] | undefined;
  meta?: { moduleName?: string | undefined } | undefined;
  plugins?: { ast?: ASTPluginBuilder[] | undefined } | undefined;
  parseOptions?: { srcName?: string; ignoreStandalone?: boolean } | undefined;
  customizeComponentName?: ((input: string) => string) | undefined;
  mode?: 'codemod' | 'precompile' | undefined;
}

const syntax: Syntax = {
  parse: preprocessRust,
  builders: publicBuilder,
  print,
  traverse,
  Walker,
};

// Dynamic import of the Rust parser
let rustParser: any = null;
let rustParserLoaded = false;

function loadRustParser() {
  if (rustParserLoaded) return rustParser;
  rustParserLoaded = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    rustParser = require('../../rust-parser/pkg/node/glimmer_template_parser.js');
  } catch {
    rustParser = null;
  }

  return rustParser;
}

/**
 * Parse a Glimmer template using the Rust/WASM parser.
 *
 * Drop-in replacement for the existing `preprocess()` function.
 */
export function preprocessRust(
  input: string | src.Source,
  options: PreprocessOptions = {}
): ASTv1.Template {
  const parser = loadRustParser();
  if (!parser) {
    throw new Error(
      'Rust WASM parser not available. Build it first: cd rust-parser && ./build.sh'
    );
  }

  let source: src.Source;
  let sourceStr: string;

  if (typeof input === 'string') {
    source = new src.Source(input, options.meta?.moduleName);
    sourceStr = input;
  } else {
    source = input;
    sourceStr = input.source;
  }

  const srcName = options.parseOptions?.srcName ?? options.meta?.moduleName;

  // Parse with the Rust WASM parser
  let rawAst: any;
  try {
    const jsonStr = parser.parseTemplateToJson(sourceStr, srcName ?? undefined);
    rawAst = JSON.parse(jsonStr);
  } catch (error: any) {
    // Convert Rust parse errors to GlimmerSyntaxError
    if (typeof error === 'string') {
      let parsed;
      try {
        parsed = JSON.parse(error);
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
  // (Must be set BEFORE plugins for trackLocals, then re-set AFTER for babel Proxy)
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

/**
 * Convert the raw JSON AST from Rust into proper ASTv1 nodes with SourceSpan locations.
 */
function convertToASTv1(raw: any, source: src.Source): ASTv1.Template {
  convertLocations(raw, source);
  return raw as ASTv1.Template;
}

/**
 * Recursively convert plain {start, end} location objects to SourceSpan instances.
 */
function convertLocations(node: any, source: src.Source): void {
  if (node === null || node === undefined || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      convertLocations(item, source);
    }
    return;
  }

  // Convert 'loc' property
  if (node.loc && typeof node.loc === 'object' && 'start' in node.loc && 'end' in node.loc && !(node.loc instanceof src.SourceSpan)) {
    const { start, end } = node.loc;
    node.loc = src.SourceSpan.forCharPositions(
      source,
      charPosToOffset(source.source, start.line, start.column),
      charPosToOffset(source.source, end.line, end.column)
    );
  }

  // Convert 'openTag' and 'closeTag' properties
  for (const key of ['openTag', 'closeTag']) {
    if (node[key] && typeof node[key] === 'object' && 'start' in node[key] && 'end' in node[key] && !(node[key] instanceof src.SourceSpan)) {
      const { start, end } = node[key];
      node[key] = src.SourceSpan.forCharPositions(
        source,
        charPosToOffset(source.source, start.line, start.column),
        charPosToOffset(source.source, end.line, end.column)
      );
    }
  }

  // Recurse into all object properties
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'openTag' || key === 'closeTag') continue;
    const val = node[key];
    if (typeof val === 'object' && val !== null) {
      convertLocations(val, source);
    }
  }
}

/**
 * Convert line/column to a character offset.
 * Lines are 1-based, columns are 0-based.
 */
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

  // If we're at the very end
  if (currentLine === line && currentCol === column) {
    return source.length;
  }

  return source.length;
}

/**
 * Convert a Rust parse error into a GlimmerSyntaxError.
 */
function convertRustError(error: any, source: src.Source, sourceStr: string): Error {
  const { message, loc, context } = error;

  let fullMessage = message || 'Parse error';

  // Build rich error display
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
