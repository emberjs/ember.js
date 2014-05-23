export function processOpcodes(compiler, opcodes) {
  for (var i=0, l=opcodes.length; i<l; i++) {
    var method = opcodes[i][0];
    var params = opcodes[i][1];
    compiler[method].apply(compiler, params);
  }
}
