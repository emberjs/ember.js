import { SourceSpan } from './source/span';

export interface GlimmerSyntaxError extends Error {
  location: SourceSpan | null;
  code: string | null;
}

export function generateSyntaxError(message: string, location: SourceSpan): GlimmerSyntaxError {
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
