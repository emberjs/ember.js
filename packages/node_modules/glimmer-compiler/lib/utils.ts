export function processOpcodes(compiler, opcodes) {
  for (let i=0, l=opcodes.length; i<l; i++) {
    let method = opcodes[i][0];
    let params = opcodes[i][1];
    if (params) {
      compiler[method].apply(compiler, params);
    } else {
      compiler[method].call(compiler);
    }
  }
}