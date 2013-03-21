import { array, hash, string } from "htmlbars/compiler/quoting";
import { popStack } from "htmlbars/compiler/stack";

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

export { prepareHelper };