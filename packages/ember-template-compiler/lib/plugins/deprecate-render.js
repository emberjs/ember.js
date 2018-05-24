import { deprecate } from '@ember/debug';
import { RENDER_HELPER } from '@ember/deprecated-features';
import calculateLocationDisplay from '../system/calculate-location-display';

// Remove after 3.4 once _ENABLE_RENDER_SUPPORT flag is no longer needed.
export default function deprecateRender(env) {
  if (RENDER_HELPER) {
    let { moduleName } = env.meta;

    let deprecationMessage = node => {
      let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
      let componentName = node.params[0].original;
      let original = `{{render "${componentName}"}}`;
      let preferred = `{{${componentName}}}`;

      return (
        `Please refactor \`${original}\` to a component and invoke via` +
        ` \`${preferred}\`. ${sourceInformation}`
      );
    };

    return {
      name: 'deprecate-render',

      visitor: {
        MustacheStatement(node) {
          if (node.path.original !== 'render') {
            return;
          }
          if (node.params.length !== 1) {
            return;
          }

          node.params.forEach(param => {
            if (param.type !== 'StringLiteral') {
              return;
            }

            deprecate(deprecationMessage(node), false, {
              id: 'ember-template-compiler.deprecate-render',
              until: '3.0.0',
              url: 'https://emberjs.com/deprecations/v2.x#toc_code-render-code-helper',
            });
          });
        },
      },
    };
  }
}
