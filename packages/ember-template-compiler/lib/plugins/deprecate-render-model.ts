import { deprecate } from '@ember/debug';
import { RENDER_HELPER } from '@ember/deprecated-features';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

// Remove after 3.4 once _ENABLE_RENDER_SUPPORT flag is no longer needed.
export default function deprecateRenderModel(env: ASTPluginEnvironment): ASTPlugin | undefined {
  if (RENDER_HELPER) {
    let { moduleName } = env.meta;

    let deprecationMessage = (node: AST.MustacheStatement, param: AST.PathExpression) => {
      let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
      let componentName = (node.params[0] as AST.PathExpression).original;
      let modelName = param.original;
      let original = `{{render "${componentName}" ${modelName}}}`;
      let preferred = `{{${componentName} model=${modelName}}}`;

      return (
        `Please refactor \`${original}\` to a component and invoke via` +
        ` \`${preferred}\`. ${sourceInformation}`
      );
    };

    return {
      name: 'deprecate-render-model',

      visitor: {
        MustacheStatement(node: AST.MustacheStatement) {
          if (node.path.original === 'render' && node.params.length > 1) {
            node.params.forEach(param => {
              if (param.type !== 'PathExpression') {
                return;
              }

              deprecate(deprecationMessage(node, param), false, {
                id: 'ember-template-compiler.deprecate-render-model',
                until: '3.0.0',
                url:
                  'https://emberjs.com/deprecations/v2.x#toc_model-param-in-code-render-code-helper',
              });
            });
          }
        },
      },
    };
  }
  return undefined;
}
