import { handlebarsGet } from "ember-handlebars/ext";

export default function resolvePaths(options) {
  var ret = [];
  var contexts = options.contexts;
  var roots = options.roots;
  var data = options.data;

  for (var i=0, l=contexts.length; i<l; i++) {
    ret.push(handlebarsGet(roots[i], contexts[i], { data: data }));
  }

  return ret;
}
