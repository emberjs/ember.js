define(
  ["htmlbars/compiler/quoting","htmlbars/compiler/stack","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var array = __dependency1__.array;
    var hash = __dependency1__.hash;
    var string = __dependency1__.string;
    var popStack = __dependency2__.popStack;

    function prepareHelper(stack, size) {
      var args = [],
          types = [],
          hashPairs = [],
          hashTypes = [],
          keyName,
          i;

      var hashSize = popStack(stack);

      for (i=0; i<hashSize; i++) {
        keyName = popStack(stack);
        hashPairs.push(keyName + ':' + popStack(stack));
        hashTypes.push(keyName + ':' + popStack(stack));
      }

      for (var i=0; i<size; i++) {
        args.push(popStack(stack));
        types.push(popStack(stack));
      }

      var programId = popStack(stack);

      var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

      if (programId !== null) {
        options.push('render:child' + programId);
      }

      return {
        options: options,
        args: array(args),
      };
    }

    __exports__.prepareHelper = prepareHelper;
  });
