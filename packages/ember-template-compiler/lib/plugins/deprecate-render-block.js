import { deprecate } from 'ember-metal/debug';
import calculateLocationDisplay from
  'ember-template-compiler/system/calculate-location-display';

export default function DeprecateRenderBlock(options) {
  this.syntax = null;
  this.options = options;
}

DeprecateRenderBlock.prototype.transform =
  function DeprecateRenderBlock_transform(ast) {
  let moduleName = this.options.moduleName;
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    deprecate(
      deprecationMessage(moduleName, node),
      false,
      {
        id: 'ember-template-compiler.deprecate-render-block',
        until: '2.4.0',
        url: 'http://emberjs.com/deprecations/v2.x#toc_render-helper-with-block'
      }
    );
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement') &&
    (node.path.original === 'render');
}

function deprecationMessage(moduleName, node) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `Usage of \`render\` in block form is deprecated ${sourceInformation}.`;
}
