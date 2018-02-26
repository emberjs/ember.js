import { deprecate } from 'ember-debug';
import calculateLocationDisplay from '../system/calculate-location-display';

export default function deprecateRender(env) {
  let { moduleName } = env.meta;

  return {
    name: 'deprecate-render',

    visitors: {
      MustacheStatement(node) {
        if (node.path.original !== 'render') { return; }
        if (node.params.length !== 1) { return; }

        each(node.params, (param) => {
          if (param.type !== 'StringLiteral') { return; }

          deprecate(deprecationMessage(moduleName, node), false, {
            id: 'ember-template-compiler.deprecate-render',
            until: '3.0.0',
            url: 'https://emberjs.com/deprecations/v2.x#toc_code-render-code-helper'
          });
        });
      }
    }
  };
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
