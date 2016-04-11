import Error from 'ember-metal/error';
import calculateLocationDisplay from
  'ember-template-compiler/system/calculate-location-display';

export default function PreventRenderBlock(options) {
  this.syntax = null;
  this.options = options;
}

PreventRenderBlock.prototype.transform =
  function PreventRenderBlock_transform(ast) {
  let moduleName = this.options.moduleName;
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    throw new Error(assertionMessage(moduleName, node));
  });

  return ast;
};

function validate(node) {
  return (node.type === 'BlockStatement') &&
    (node.path.original === 'render');
}

function assertionMessage(moduleName, node) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `Usage of \`render\` in block form is unsupported ${sourceInformation}.`;
}
