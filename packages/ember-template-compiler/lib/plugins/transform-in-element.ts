import { StaticTemplateMeta } from '@ember/-internals/views';
import { EMBER_GLIMMER_IN_ELEMENT } from '@ember/canary-features';
import { assert, deprecate } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that handles the public `{{in-element}}` as per RFC287, and deprecates but still
  continues support for the private `{{-in-element}}`.

  Transforms:

  ```handlebars
  {{#-in-element someElement}}
    {{modal-display text=text}}
  {{/-in-element}}
  ```

  into:

  ```handlebars
  {{#in-element someElement}}
    {{modal-display text=text}}
  {{/in-element}}
  ```

  And issues a deprecation message.

  Issues a build time assertion for:

  ```handlebars
  {{#in-element someElement insertBefore="some-none-null-value"}}
    {{modal-display text=text}}
  {{/in-element}}
  ```

  @private
  @class TransformInElement
*/
export default function transformInElement(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta as StaticTemplateMeta;
  let { builders: b } = env.syntax;

  return {
    name: 'transform-in-element',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (!isPath(node.path)) return;

        if (node.path.original === 'in-element') {
          if (EMBER_GLIMMER_IN_ELEMENT) {
            node.hash.pairs.forEach(pair => {
              if (pair.key === 'insertBefore') {
                assert(
                  `Can only pass null to insertBefore in in-element, received: ${JSON.stringify(
                    pair.value
                  )}`,
                  pair.value.type === 'NullLiteral' || pair.value.type === 'UndefinedLiteral'
                );
              }
            });
          } else {
            assert(assertMessage(moduleName, node));
          }
        } else if (node.path.original === '-in-element') {
          if (EMBER_GLIMMER_IN_ELEMENT) {
            let sourceInformation = calculateLocationDisplay(moduleName, node.loc);
            deprecate(
              `The use of the private \`{{-in-element}}\` is deprecated, please refactor to the public \`{{in-element}}\`. ${sourceInformation}`,
              false,
              {
                id: 'glimmer.private-in-element',
                until: '3.25.0',
              }
            );
          }

          node.path.original = 'in-element';
          node.path.parts = ['in-element'];

          // replicate special hash arguments added here:
          // https://github.com/glimmerjs/glimmer-vm/blob/ba9b37d44b85fa1385eeeea71910ff5798198c8e/packages/%40glimmer/syntax/lib/parser/handlebars-node-visitors.ts#L340-L363
          let needsInsertBefore = true;
          let hash = node.hash;
          hash.pairs.forEach(pair => {
            if (pair.key === 'insertBefore') {
              assert(
                `Can only pass a null or undefined literals to insertBefore in -in-element, received: ${JSON.stringify(
                  pair.value
                )}`,
                pair.value.type === 'NullLiteral' || pair.value.type === 'UndefinedLiteral'
              );

              needsInsertBefore = false;
            }
          });

          // Maintain compatibility with previous -in-element behavior (defaults to append, not clear)
          if (needsInsertBefore) {
            let nullLiteral = b.literal('NullLiteral', null);
            let nextSibling = b.pair('insertBefore', nullLiteral);
            hash.pairs.push(nextSibling);
          }
        }
      },
    },
  };
}

function assertMessage(moduleName: string, node: AST.BlockStatement) {
  let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

  return `The {{in-element}} helper cannot be used. ${sourceInformation}`;
}
