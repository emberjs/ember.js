import { deprecate } from '@ember/debug';
import { SEND_ACTION } from '@ember/deprecated-features';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';

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
    let { moduleName } = env.meta;

    let deprecationMessage = (node: AST.MustacheStatement, evName: string, action: string) => {
      let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
      return `Please refactor \`{{input ${evName}="${action}"}}\` to \`{{input ${evName}=(action "${action}")}}\. ${sourceInformation}`;
    };

    return {
      name: 'deprecate-send-action',

      visitor: {
        MustacheStatement(node: AST.MustacheStatement) {
          if (node.path.original !== 'input') {
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
