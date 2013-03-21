define(
  ["htmlbars/compiler/quoting","htmlbars/compiler/stack","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var quotedString = __dependency1__.quotedString;
    var popStack = __dependency2__.popStack;

    function processOpcodes(compiler, opcodes) {
      opcodes.forEach(function(opcode) {
        compiler[opcode.type].apply(compiler, opcode.params);
      });
    }


    function invokeMethod(receiver, method) {
      var params = [].slice.call(arguments, 2);
      return receiver + "." + method + "(" + params.join(", ") + ")";
    }


    function invokeFunction(func) {
      var params = [].slice.call(arguments, 1);
      return func + "(" + params.join(", ") + ")";
    }


    function helper() {
      var args = [].slice.call(arguments, 0);
      args.unshift('dom');
      return invokeMethod.apply(this, args);
    }


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
    __exports__.invokeMethod = invokeMethod;
    __exports__.invokeFunction = invokeFunction;
    __exports__.helper = helper;
    __exports__.prepareHelper = prepareHelper;
    __exports__.compileAST = compileAST;
  });
