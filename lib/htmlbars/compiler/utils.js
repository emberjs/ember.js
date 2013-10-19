export function processOpcodes(compiler, opcodes) {
  opcodes.forEach(function(opcode) {
    compiler[opcode.type].apply(compiler, opcode.params);
  });
}

export function stream(string) {
  return "dom.stream(function(stream) { return " + string + " })";
}

export function compileAST(ast, options) {
  // circular dependency hack
  var Compiler1 = requireModule('htmlbars/compiler/pass1').Compiler1;
  var Compiler2 = requireModule('htmlbars/compiler/pass2').Compiler2;

  var compiler1 = new Compiler1(options),
      compiler2 = new Compiler2(options);

  var opcodes = compiler1.compile(ast);
  return compiler2.compile(opcodes, {
    children: compiler1.children
  });
}
