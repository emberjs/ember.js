import { assert, deprecate } from '@ember/debug';
import { AST, ASTPlugin } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';
import { isPath } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that deprecates `{{#with}}` and replace it
  with `{{#let}}` and `{{#if}}` as per RFC 445.

  Transforms:

  ```handlebars
  {{#with this.foo as |bar|}}
    ...
  {{/with}}
  ```

  Into:

  ```handlebars
  {{#let this.foo as |bar|}}
    {{#if bar}}
      ...
    {{/if}}
  {{/let}}
  ```

  And:

  ```handlebars
  {{#with this.foo as |bar|}}
    ...
  {{else}}
    ...
  {{/with}}
  ```

  Into:

  ```handlebars
  {{#let this.foo as |bar|}}
    {{#if bar}}
      ...
    {{else}}
      ...
    {{/if}}
  {{/let}}
  ```

  And issues a deprecation message.

  @private
  @class DeprecateWith
*/
export default function deprecateWith(env: EmberASTPluginEnvironment): ASTPlugin {
  let moduleName = env.meta?.moduleName;
  let { builders: b } = env.syntax;

  return {
    name: 'deprecate-with',

    visitor: {
      BlockStatement(node: AST.BlockStatement) {
        if (!isPath(node.path) || node.path.original !== 'with') return;

        let { params, hash, program, inverse, loc, openStrip, inverseStrip, closeStrip } = node;

        let sourceInformation = calculateLocationDisplay(moduleName, node.loc);

        assert(
          `\`{{#with}}\` takes a single positional argument (the path to alias), received ${displayParams(
            params
          )}. ${sourceInformation}`,
          params.length === 1
        );

        assert(
          `\`{{#with}}\` does not take any named arguments, received ${displayHash(
            hash
          )}. ${sourceInformation}`,
          hash.pairs.length === 0
        );

        assert(
          `\`{{#with}}\` yields a single block param, received ${displayBlockParams(
            program.blockParams
          )}. ${sourceInformation}`,
          program.blockParams.length <= 1
        );

        let recommendation;

        if (program.blockParams.length === 0) {
          recommendation = 'Use `{{#if}}` instead.';
        } else if (inverse) {
          recommendation = 'Use `{{#let}}` together with `{{#if}} instead.';
        } else {
          recommendation =
            'If you always want the block to render, replace `{{#with}}` with `{{#let}}`. ' +
            'If you want to conditionally render the block, use `{{#let}}` together with `{{#if}} instead.';
        }

        deprecate(`\`{{#with}}\` is deprecated. ${recommendation} ${sourceInformation}`, false, {
          id: 'ember-glimmer.with-syntax',
          until: '4.0.0',
          for: 'ember-source',
          url: 'https://deprecations.emberjs.com/v3.x/#toc_ember-glimmer-with-syntax',
          since: {
            enabled: '3.26.0-beta.1',
          },
        });

        if (program.blockParams.length === 0) {
          return b.block(
            'if',
            params,
            null,
            program,
            inverse,
            loc,
            openStrip,
            inverseStrip,
            closeStrip
          );
        } else {
          return b.block(
            'let',
            params,
            null,
            b.blockItself(
              [
                b.block(
                  'if',
                  [b.path(program.blockParams[0])],
                  null,
                  b.blockItself(program.body, [], program.chained, program.loc),
                  inverse,
                  loc,
                  openStrip,
                  inverseStrip,
                  closeStrip
                ),
              ],
              program.blockParams,
              false,
              loc
            ),
            null,
            loc,
            openStrip,
            inverseStrip,
            closeStrip
          );
        }
      },
    },
  };
}

function displayParams(params: AST.Expression[]): string {
  if (params.length === 0) {
    return 'no positional arguments';
  } else {
    let display = params.map((param) => `\`${JSON.stringify(param)}\``).join(', ');
    return `${params.length} positional arguments: ${display}`;
  }
}

function displayHash({ pairs }: AST.Hash): string {
  if (pairs.length === 0) {
    return 'no named arguments';
  } else {
    let display = pairs.map((pair) => `\`${pair.key}\``).join(', ');
    return `${pairs.length} named arguments: ${display}`;
  }
}

function displayBlockParams(blockParams: string[]): string {
  if (blockParams.length === 0) {
    return 'no block params';
  } else {
    let display = blockParams.map((param) => `\`${param}\``).join(', ');
    return `${blockParams.length} block params: ${display}`;
  }
}
