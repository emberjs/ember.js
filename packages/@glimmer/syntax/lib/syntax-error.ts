import type * as src from './source/api';

export interface GlimmerSyntaxError extends Error {
  location: src.SourceSpan | null;
  code: string | null;
}

export function generateSyntaxError(message: string, location: src.SourceSpan): GlimmerSyntaxError {
  let { module, loc } = location;
  let { line, column } = loc.start;

  let code = location.asString();
  let quotedCode = code ? `\n\n|\n|  ${code.split('\n').join('\n|  ')}\n|\n\n` : '';

  let error = new Error(
    `${message}: ${quotedCode}(error occurred in '${module}' @ line ${line} : column ${column})`
  ) as GlimmerSyntaxError;

  error.name = 'SyntaxError';
  error.location = location;
  error.code = code;

  return error;
}
