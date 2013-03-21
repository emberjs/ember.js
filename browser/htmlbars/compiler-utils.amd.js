define(
  ["htmlbars/compiler/quoting","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var quotedString = __dependency1__.quotedString;

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


    function pushElement(compiler) {
      return "element" + (++compiler.elementNumber);
    }


    function popElement(compiler) {
      return "element" + (compiler.elementNumber--);
    }


    function topElement(compiler) {
      return "element" + compiler.elementNumber;
    }


    function pushStack(compiler) {
      var stack = compiler.stack,
          stackNumber = "stack" + (++compiler.stackNumber);

      stack.push({ literal: false, value: stackNumber });
    }


    function pushStackLiteral(compiler, literal) {
      compiler.stack.push({ literal: true, value: literal });
    }


    function popStack(compiler) {
      var stack = compiler.stack,
          poppedValue = stack.pop();

      if (!poppedValue.literal) {
        stackNumber--;
      }
      return poppedValue.value;
    }


    function topStack(compiler) {
      var stack = compiler.stack;

      return stack[stack.length - 1].value;
    }


    function prepareHelper(compiler, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = popStack(compiler);

      for (i=0; i<hashSize; i++) {
        keyName = popStack(compiler);
        hashPairs.push(keyName + ':' + popStack(compiler));
        hashTypes.push(keyName + ':' + popStack(compiler));
      }

      for (var i=0; i<size; i++) {
        args.push(popStack(compiler));
        types.push(popStack(compiler));
      }

      var programId = popStack(compiler);

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
      var Compiler1 = require('htmlbars/compiler-pass1').Compiler1;
      var Compiler2 = require('htmlbars/compiler-pass2').Compiler2;

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
    __exports__.pushElement = pushElement;
    __exports__.popElement = popElement;
    __exports__.topElement = topElement;
    __exports__.pushStack = pushStack;
    __exports__.pushStackLiteral = pushStackLiteral;
    __exports__.popStack = popStack;
    __exports__.topStack = topStack;
    __exports__.prepareHelper = prepareHelper;
    __exports__.compileAST = compileAST;
  });
