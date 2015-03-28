export default function TransformEachIntoCollection() {
  this.syntax = null;
}

TransformEachIntoCollection.prototype.transform = function TransformEachIntoCollection_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    let sexpr = node.sexpr;
    let list = sexpr.params.shift();
    sexpr.path = b.path('collection');
    sexpr.hash.pairs.push(b.pair('content', list));
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.sexpr.path.original === 'each' &&
    any(node.sexpr.hash.pairs, pair => {
      let key = pair.key;
      return key === 'itemController' ||
             key === 'itemView' ||
             key === 'itemViewClass' ||
             key === 'tagName' ||
             key === 'emptyView' ||
             key === 'emptyViewClass';
    });
}

function any(list, predicate) {
  for (var i=0, l=list.length; i<l; i++) {
    if (predicate(list[i])) { return true; }
  }

  return false;
}
