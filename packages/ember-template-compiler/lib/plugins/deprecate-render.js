import { deprecate } from 'ember-metal';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function DeprecateRender(options) {
  this.syntax = null;
  this.options = options;
}

DeprecateRender.prototype.transform =
  function DeprecateRender_transform(ast) {
  let moduleName = this.options.meta.moduleName;
  let walker = new this.syntax.Walker();

  walker.visit(ast, function(node) {
    if (!validate(node)) { return; }

    each(node.params, (param) => {
      if (param.type !== 'StringLiteral') { return; }

      deprecate(deprecationMessage(moduleName, node), false, {
        id: 'ember-template-compiler.deprecate-render',
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x#toc_code-render-code-helper'
      });
    });
  });

  return ast;
};

function validate(node) {
  return (node.type === 'MustacheStatement') &&
    (node.path.original === 'render') &&
    (node.params.length === 1);
}

function each(list, callback) {
  for (let i = 0, l = list.length; i < l; i++) {
    callback(list[i]);
  }
}

function deprecationMessage(moduleName, node) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
  let componentName = node.params[0].original;
  let original = `{{render "${componentName}"}}`;
  let preferred = `{{${componentName}}}`;

  return `Please refactor \`${original}\` to a component and invoke via` +
    ` \`${preferred}\`. ${sourceInformation}`;
}
