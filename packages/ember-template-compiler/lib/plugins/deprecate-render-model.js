import { deprecate } from 'ember-debug';
import calculateLocationDisplay from
  '../system/calculate-location-display';

export default function deprecateRenderModel(env) {
  let { moduleName } = env.meta;

  return {
    name: 'deprecate-render-model',

    visitors: {
      MustacheStatement(node) {
        if (node.path.original === 'render' && node.params.length > 1) {
          node.params.forEach(param => {
            if (param.type !== 'PathExpression') { return; }

            deprecate(deprecationMessage(moduleName, node, param), false, {
              id: 'ember-template-compiler.deprecate-render-model',
              until: '3.0.0',
              url: 'https://emberjs.com/deprecations/v2.x#toc_model-param-in-code-render-code-helper'
            });
          });
        }
      }
    }
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
