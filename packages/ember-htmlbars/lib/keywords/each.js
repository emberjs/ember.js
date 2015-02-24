import { chain, read } from "ember-metal/streams/utils";

export default function eachKeyword(morph, env, scope, params, hash, template, inverse) {
  var list = params[0];
  var listChange = list.getKey('[]');

  var stream = chain(list, function() {
    read(listChange);
    return read(list);
  });

  stream.addDependency(listChange);
  params[0] = stream;

  return false;
}
