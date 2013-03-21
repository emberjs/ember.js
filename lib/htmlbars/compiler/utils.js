import { array, hash, string } from "htmlbars/compiler/quoting";
import { popStack } from "htmlbars/compiler/stack";

function processOpcodes(compiler, opcodes) {
  opcodes.forEach(function(opcode) {
    compiler[opcode.type].apply(compiler, opcode.params);
  });
}

export { processOpcodes };

function prepareHelper(compiler, size) {
  var args = [],
      types = [],
      hashPairs = [],
      hashTypes = [],
      keyName,
      i;

  var hashSize = popStack(compiler.stack);

  for (i=0; i<hashSize; i++) {
    keyName = popStack(compiler.stack);
    hashPairs.push(keyName + ':' + popStack(compiler.stack));
    hashTypes.push(keyName + ':' + popStack(compiler.stack));
  }

  for (var i=0; i<size; i++) {
    args.push(popStack(compiler.stack));
    types.push(popStack(compiler.stack));
  }

  var programId = popStack(compiler.stack);

  var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

  if (programId !== null) {
    options.push('render:child' + programId);
  }

  return {
    options: options,
    args: array(args),
  };
}

export { prepareHelper };

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

export { compileAST };
