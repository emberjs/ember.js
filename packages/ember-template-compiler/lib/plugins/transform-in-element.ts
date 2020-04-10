import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  glimmer-vm has made the `in-element` API public from its perspective (in
  https://github.com/glimmerjs/glimmer-vm/pull/619) so in glimmer-vm the
  correct keyword to use is `in-element`, however Ember is still working through
  its form of `in-element` (see https://github.com/emberjs/rfcs/pull/287).

  There are enough usages of the pre-existing private API (`{{-in-element`) in
  the wild that we need to transform `{{-in-element` into `{{in-element` during
  template transpilation, but since RFC#287 is not landed and enabled by default we _also_ need
  to prevent folks from starting to use `{{in-element` "for realz".

  Tranforms:

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

  And issues a build time assertion for:

  ```handlebars
  {{#in-element someElement}}
    {{modal-display text=text}}
  {{/in-element}}
  ```

  @private
  @class TransformInElement
*/
export default function transformInElement(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let cursorCount = 0;

  return {
    name: 'transform-in-element',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (!isPath(node.path)) return;

        if (node.path.original === 'in-element') {
          let insertBeforePair = node.hash.pairs.find(pair => pair.key === 'insertBefore');
          if (insertBeforePair) {
            assert(
              `Can only pass null to insertBefore in in-element, received: ${JSON.stringify(
                insertBeforePair.value
              )}`,
              insertBeforePair.value.type === 'NullLiteral' ||
                insertBeforePair.value.type === 'UndefinedLiteral'
            );
          }
        } else if (node.path.original === '-in-element') {
          node.path.original = 'in-element';
          node.path.parts = ['in-element'];

          // replicate special hash arguments added here:
          // https://github.com/glimmerjs/glimmer-vm/blob/ba9b37d44b85fa1385eeeea71910ff5798198c8e/packages/%40glimmer/syntax/lib/parser/handlebars-node-visitors.ts#L340-L363
          let needsInsertBefore = true;
          let { hash } = node;
          let insertBeforePair = hash.pairs.find(pair => pair.key === 'insertBefore');
          if (insertBeforePair) {
            assert(
              `Can only pass a null or undefined literals to insertBefore in -in-element, received: ${JSON.stringify(
                insertBeforePair.value
              )}`,
              insertBeforePair.value.type === 'NullLiteral' || insertBeforePair.value.type === 'UndefinedLiteral'
            );

            needsInsertBefore = false;
          }

          let guid = b.literal('StringLiteral', `%cursor:${cursorCount++}%`);
          let guidPair = b.pair('guid', guid);
          hash.pairs.unshift(guidPair);

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
