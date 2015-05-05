export default function TransformEachIntoCollection() {
  this.syntax = null;
}

TransformEachIntoCollection.prototype.transform = function TransformEachIntoCollection_transform(ast) {
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    let list = node.params.shift();
    node.path = b.path('collection');

    node.params.unshift(b.string('-legacy-each'));

    let pair = b.pair('content', list);
    pair.loc = list.loc;

    node.hash.pairs.push(pair);

    //pair = b.pair('dataSource', list);
    //node.hash.pairs.push(pair);
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
    node.path.original === 'each' &&
    any(node.hash.pairs, pair => {
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
