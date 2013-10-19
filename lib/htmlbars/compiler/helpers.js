import { array, hash, string } from "htmlbars/compiler/quoting";
import { popStack } from "htmlbars/compiler/stack";

export function prepareHelper(stack, size) {
  var args = [],
      types = [],
      hashPairs = [],
      hashTypes = [],
      keyName,
      i;

  var hashSize = popStack(stack);

  for (i=0; i<hashSize; i++) {
    keyName = popStack(stack);
    hashPairs.unshift(keyName + ':' + popStack(stack));
    hashTypes.unshift(keyName + ':' + popStack(stack));
  }

  for (i=0; i<size; i++) {
    args.unshift(popStack(stack));
    types.unshift(popStack(stack));
  }

  var programId = popStack(stack);

  var options = ['types:' + array(types), 'hashTypes:' + hash(hashTypes), 'hash:' + hash(hashPairs)];

  if (programId !== null) {
    options.push('render:child' + programId + '(dom)');
  }

  return {
    options: options,
    args: array(args),
  };
}
