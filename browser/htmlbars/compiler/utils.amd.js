define(
  ["exports"],
  function(__exports__) {
    "use strict";
    function processOpcodes(compiler, opcodes) {
      opcodes.forEach(function(opcode) {
        compiler[opcode.type].apply(compiler, opcode.params);
      });
    }


    function compileAST(ast, options) {
      // circular dependency hack
      var Compiler1 = require('htmlbars/compiler/pass1').Compiler1;
      var Compiler2 = require('htmlbars/compiler/pass2').Compiler2;

      var compiler1 = new Compiler1(options),
          compiler2 = new Compiler2(options);

      var opcodes = compiler1.compile(ast);
      return compiler2.compile(opcodes, {
        children: compiler1.children
      });
    }


    __exports__.processOpcodes = processOpcodes;
    __exports__.compileAST = compileAST;
  });
