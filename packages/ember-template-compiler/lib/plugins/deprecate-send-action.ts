import { StaticTemplateMeta } from '@ember/-internals/views';
import { deprecate } from '@ember/debug';
import { SEND_ACTION } from '@ember/deprecated-features';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { isPath } from './utils';

const EVENTS = [
  'insert-newline',
  'enter',
  'escape-press',
  'focus-in',
  'focus-out',
  'key-press',
  'key-up',
  'key-down',
];

export default function deprecateSendAction(env: ASTPluginEnvironment): ASTPlugin | undefined {
  if (SEND_ACTION) {
    let { moduleName } = env.meta as StaticTemplateMeta;

    let deprecationMessage = (node: AST.Node, eventName: string, actionName: string) => {
      let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

      if (node.type === 'ElementNode') {
        return `Passing actions to components as strings (like \`<Input @${eventName}="${actionName}" />\`) is deprecated. Please use closure actions instead (\`<Input @${eventName}={{action "${actionName}"}} />\`). ${sourceInformation}`;
      } else {
        return `Passing actions to components as strings (like \`{{input ${eventName}="${actionName}"}}\`) is deprecated. Please use closure actions instead (\`{{input ${eventName}=(action "${actionName}")}}\`). ${sourceInformation}`;
      }
    };

    return {
      name: 'deprecate-send-action',

      visitor: {
        ElementNode(node: AST.ElementNode) {
          if (node.tag !== 'Input') {
            return;
          }

          node.attributes.forEach(({ name, value }) => {
            if (name.charAt(0) === '@') {
              let eventName = name.substring(1);

              if (EVENTS.indexOf(eventName) > -1) {
                if (value.type === 'TextNode') {
                  deprecate(deprecationMessage(node, eventName, value.chars), false, {
                    id: 'ember-component.send-action',
                    until: '4.0.0',
                    url: 'https://emberjs.com/deprecations/v3.x#toc_ember-component-send-action',
                  });
                } else if (
                  value.type === 'MustacheStatement' &&
                  value.path.type === 'StringLiteral'
                ) {
                  deprecate(deprecationMessage(node, eventName, value.path.original), false, {
                    id: 'ember-component.send-action',
                    until: '4.0.0',
                    url: 'https://emberjs.com/deprecations/v3.x#toc_ember-component-send-action',
                  });
                }
              }
            }
          });
        },

        MustacheStatement(node: AST.MustacheStatement) {
          if (!isPath(node.path) || node.path.original !== 'input') {
            return;
          }

          node.hash.pairs.forEach(pair => {
            if (EVENTS.indexOf(pair.key) > -1 && pair.value.type === 'StringLiteral') {
              deprecate(deprecationMessage(node, pair.key, pair.value.original), false, {
                id: 'ember-component.send-action',
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_ember-component-send-action',
              });
            }
          });
        },
      },
    };
  }
  return;
}
