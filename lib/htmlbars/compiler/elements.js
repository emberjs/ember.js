function pushElement(compiler) {
  return "element" + (++compiler.elementNumber);
}

export { pushElement };

function popElement(compiler) {
  return "element" + (compiler.elementNumber--);
}

export { popElement };

function topElement(compiler) {
  return "element" + compiler.elementNumber;
}

export { topElement };
