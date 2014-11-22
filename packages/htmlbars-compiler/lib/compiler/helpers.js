import { array, hash } from "./quoting";

export function prepareHelper(stack, size) {
  var params = [],
      paramTypes = [],
      hashPairs = [],
      hashTypes = [],
      keyName,
      name,
      type,
      i;

  var hashSize = stack.pop();

  for (i=0; i<hashSize; i++) {
    keyName = stack.pop();
    hashPairs.unshift('"' + keyName + '":' + stack.pop());
    hashTypes.unshift('"' + keyName + '":' + stack.pop());
  }

  for (i=0; i<size; i++) {
    params.unshift(stack.pop());
    paramTypes.unshift(stack.pop());
  }

  name = stack.pop();
  type = stack.pop();

  var programId = stack.pop();
  var inverseId = stack.pop();

  var options = [];
  if (name !== null) {
    options.push('type:' + type);
  }
  options.push('paramTypes:' + array(paramTypes));
  options.push('hashTypes:' + hash(hashTypes));

  if (programId !== null) {
    options.push('render:child' + programId);
  }

  if (inverseId !== null) {
    options.push('inverse:child' + inverseId);
  }

  return {
    name: name,
    params: array(params),
    hash: hash(hashPairs),
    options: options
  };
}
