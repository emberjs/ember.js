/**
 * @module rust-parser
 *
 * JavaScript wrapper around the Rust/WASM Glimmer template parser.
 *
 * The Rust parser (built with pest.rs) produces ASTv1-compatible JSON.
 * This wrapper handles:
 * - Loading the correct WASM binary (Node.js vs browser)
 * - Converting plain location objects to SourceSpan instances
 * - Entity decoding (in precompile mode)
 * - Whitespace control (strip flags, standalone stripping)
 * - Integration with AST plugins
 */

// Node.js target (CommonJS)
let wasmParser;
try {
  wasmParser = require('../../rust-parser/pkg/node/glimmer_template_parser.cjs');
} catch {
  // Fallback: try the non-renamed .js version
  try {
    wasmParser = require('../../rust-parser/pkg/node/glimmer_template_parser.js');
  } catch {
    wasmParser = null;
  }
}

/**
 * Parse a Glimmer template string using the Rust WASM parser.
 *
 * @param {string} source - The template source code
 * @param {string} [srcName] - Optional source file name for error messages
 * @returns {object} ASTv1 Template node (plain JSON, no SourceSpan instances)
 * @throws {object} ParseError with rich error context
 */
export function parseTemplateRust(source, srcName) {
  if (!wasmParser) {
    throw new Error(
      'Rust WASM parser not available. Run `./build.sh` in rust-parser/ first.'
    );
  }

  try {
    const jsonStr = wasmParser.parseTemplateToJson(source, srcName || undefined);
    return JSON.parse(jsonStr);
  } catch (errorJson) {
    // The Rust parser returns structured error objects
    let error;
    if (typeof errorJson === 'string') {
      try {
        error = JSON.parse(errorJson);
      } catch {
        throw new Error(errorJson);
      }
    } else {
      error = errorJson;
    }

    throw formatRustParseError(error, source, srcName);
  }
}

/**
 * Format a Rust parse error into a rich, human-readable error.
 *
 * Unlike the old Jison-format errors, Rust errors include:
 * - Source context (the line where the error occurred)
 * - A visual pointer showing the exact column
 * - Suggestions for common mistakes
 */
function formatRustParseError(error, source, srcName) {
  const { message, loc, context } = error;

  let fullMessage = message;

  if (context) {
    fullMessage += '\n\n';
    if (loc) {
      const lineNum = loc.start.line;
      fullMessage += `  ${lineNum} | ${context.source_line}\n`;
      fullMessage += `  ${' '.repeat(String(lineNum).length)} | ${context.pointer}\n`;
    }
    if (context.suggestion) {
      fullMessage += `\n  💡 ${context.suggestion}\n`;
    }
  }

  const err = new Error(fullMessage);
  err.name = 'GlimmerSyntaxError';
  err.location = loc;
  err.source = source;
  err.fileName = srcName;
  return err;
}

/**
 * Check if the Rust parser is available.
 */
export function isRustParserAvailable() {
  return wasmParser !== null;
}
