import { formatSyntaxError } from '@glimmer/syntax';

/**
 * Build an expected error for parse errors thrown by the Peggy grammar.
 * Produces the Peggy-native diagnostic format:
 *
 *   {message}
 *    --> {module}:{line}:{col}
 *     |
 *   {line} | {full source line}
 *     |    ^^^^
 *
 * Parameters:
 *   source     – the full template source text (the same string passed to parse()).
 *   line       – 1-based line number.
 *   column     – 0-based column (SourceSpan.loc.start.column).
 *   spanLength – number of '^' carets. Defaults to 1.
 */
export function parseErrorFor(
  message: string,
  source: string,
  moduleName: string,
  line: number,
  column: number,
  spanLength = 1
): Error {
  const peggyCol = column + 1;
  const loc = `${moduleName}:${line}:${peggyCol}`;

  let formatted: string;
  if (source) {
    const srcLines = source.split(/\r\n|\n|\r/g);
    const sourceLine = srcLines[line - 1] ?? '';
    const filler = ''.padEnd(String(line).length, ' ');
    const hatLen = spanLength || 1;
    formatted =
      `${message}\n --> ${loc}\n` +
      `${filler} |\n` +
      `${line} | ${sourceLine}\n` +
      `${filler} | ${''.padEnd(column, ' ')}${''.padEnd(hatLen, '^')}`;
  } else {
    formatted = `${message}\n at ${loc}`;
  }

  const error = new Error(formatted);
  error.name = 'SyntaxError';
  return error;
}

/**
 * Build an expected error for semantic compiler errors thrown via generateSyntaxError.
 * Produces the formatSyntaxError format (used outside of Peggy parse errors).
 *
 *   {message}
 *
 *      {line} | {code snippet}
 *             | ^^^^^^^^^^^^^
 *
 *        at {module}:{line}:{col}
 */
export function syntaxErrorFor(
  message: string,
  code: string,
  moduleName: string,
  line: number,
  column: number
): Error {
  const error = new Error(formatSyntaxError(message, code, moduleName, line, column));
  error.name = 'SyntaxError';
  return error;
}
