export function pushElement(compiler) {
  return "element" + (++compiler.elementNumber);
}

export function popElement(compiler) {
  return "element" + (compiler.elementNumber--);
}

export function topElement(compiler) {
  return "element" + compiler.elementNumber;
}