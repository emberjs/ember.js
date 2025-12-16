export function syntaxErrorFor(
  message: string,
  code: string,
  moduleName: string,
  line: number,
  column: number
): Error {
  let quotedCode = code ? `\n\n|\n|  ${code.split('\n').join('\n|  ')}\n|\n\n` : '';

  let error = new Error(
    `${message}: ${quotedCode}(error occurred in '${moduleName}' @ line ${line} : column ${column})`
  );

  error.name = 'SyntaxError';

  return error;
}
