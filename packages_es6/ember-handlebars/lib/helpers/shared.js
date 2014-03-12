import {handlebarsGet} from "ember-handlebars/ext";

function resolvePaths(options) {
  var ret = [],
      contexts = options.contexts,
      roots = options.roots,
      data = options.data;

  for (var i=0, l=contexts.length; i<l; i++) {
    ret.push( handlebarsGet(roots[i], contexts[i], { data: data }) );
  }

  return ret;
}

export default resolvePaths;
