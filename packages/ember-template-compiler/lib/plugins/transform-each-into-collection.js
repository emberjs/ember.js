import Ember from 'ember-metal/core';

export default function TransformEachIntoCollection(options) {
  this.options = options;
  this.syntax = null;
}

TransformEachIntoCollection.prototype.transform = function TransformEachIntoCollection_transform(ast) {
  var options = this.options;
  var b = this.syntax.builders;
  var walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    let legacyHashKey = validate(node);
    if (!legacyHashKey) { return; }

    let { column, line } = legacyHashKey.loc.start || {};
    let moduleInfo = '';
    if (options.moduleName) {
      moduleInfo +=  `'${options.moduleName}' `;
    }

    if (line && column) {
      moduleInfo += `@L${line}:C${column}`;
    }

    Ember.deprecate(
      `Using '${legacyHashKey.key}' with '{{each}}' ${moduleInfo} is deprecated.  Please refactor to a component.`
    );

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
  if ((node.type === 'BlockStatement' || node.type === 'MustacheStatement') &&
      node.path.original === 'each') {

    return any(node.hash.pairs, pair => {
      let key = pair.key;
      return key === 'itemController' ||
             key === 'itemView' ||
             key === 'itemViewClass' ||
             key === 'tagName' ||
             key === 'emptyView' ||
             key === 'emptyViewClass';
    });
  }

  return false;
}

function any(list, predicate) {
  for (var i=0, l=list.length; i<l; i++) {
    if (predicate(list[i])) { return list[i]; }
  }

  return false;
}
