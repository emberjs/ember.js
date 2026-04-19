import { formatSyntaxError } from '@glimmer/syntax';

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
