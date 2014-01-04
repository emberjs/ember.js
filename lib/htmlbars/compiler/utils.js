export function processOpcodes(compiler, opcodes) {
  opcodes.forEach(function(opcode) {
    compiler[opcode.type].apply(compiler, opcode.params);
  });
}

export function stream(string) {
  return "dom.stream(function(stream) { return " + string + " })";
}
