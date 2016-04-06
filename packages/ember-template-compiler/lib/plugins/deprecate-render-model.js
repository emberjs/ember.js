import { deprecate } from 'ember-metal/debug';
import calculateLocationDisplay from
  'ember-template-compiler/system/calculate-location-display';

export default function DeprecateRenderModel(options) {
  this.syntax = null;
  this.options = options;
}

DeprecateRenderModel.prototype.transform =
  function DeprecateRenderModel_transform(ast) {
  let moduleName = this.options.moduleName;
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.params, (param) => {
      if (param.type !== 'PathExpression') { return; }

      deprecate(deprecationMessage(moduleName, node, param), false, {
        id: 'ember-template-compiler.deprecate-render-model',
        until: '3.0.0'
      });
    });
  });

  return ast;
};

function validate(node) {
  return (node.type === 'MustacheStatement') &&
    (node.path.original === 'render') &&
    (node.params.length > 1);
}

function each(list, callback) {
  for (let i = 0, l = list.length; i < l; i++) {
    callback(list[i]);
  }
}

function deprecationMessage(moduleName, node, param) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
  let componentName = node.params[0].original;
  let modelName = param.original;
  let original = `{{render "${componentName}" ${modelName}}}`;
  let preferred = `{{${componentName} model=${modelName}}}`;

  return `Please refactor \`${original}\` to a component and invoke via` +
    ` \`${preferred}\`. ${sourceInformation}`;
}
