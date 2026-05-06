import type * as src from './source/api';

export interface GlimmerSyntaxError extends Error {
  location: src.SourceSpan | null;
  code: string | null;
}

export function generateSyntaxError(message: string, location: src.SourceSpan): GlimmerSyntaxError {
  const { module } = location;
  const { line, column } = location.loc.start;
  const code = location.asString();

  const error = new Error(
    formatSyntaxError(message, code, module, line, column)
  ) as GlimmerSyntaxError;
  error.name = 'SyntaxError';
  error.location = location;
  error.code = code;
  return error;
}

/**
 * Render a diagnostic-style error message:
 *
 *   {message}
 *
 *      {L} | {span text}
 *          | ^^^^^^^^^^^
 *
 *     at {module}:{line}:{column}
 *
 * Multi-line spans render each line with its line number and no caret.
 * When `code` is empty, the middle block is omitted.
 *
 * The column passed in is 0-based (Glimmer convention); we emit the
 * user-facing value as 1-based.
 */
export function formatSyntaxError(
  message: string,
  code: string,
  moduleName: string,
  line: number,
  column: number
): string {
  const loc = `at ${moduleName}:${line}:${column + 1}`;

  if (!code) {
    return `${message}\n\n  ${loc}`;
  }

  const lines = code.split('\n');
  const endLine = line + lines.length - 1;
  const gutter = String(endLine).length;
  const block: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const n = String(line + i).padStart(gutter);
    block.push(`  ${n} | ${lines[i]}`);
  }

  if (lines.length === 1) {
    const caret = '^'.repeat(Math.max(1, code.length));
    block.push(`  ${' '.repeat(gutter)} | ${caret}`);
  }

  return `${message}\n\n${block.join('\n')}\n\n  ${loc}`;
}
