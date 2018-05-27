import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';

/**
  Transforms dot invocation of closure components to be wrapped
  with the component helper. This allows for a more static invocation
  of the component.

  ```handlebars
 {{#my-component as |comps|}}
  {{comp.dropdown isOpen=false}}
 {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{component comp.dropdown isOpen=false}}
  {{/my-component}}
  ```
  and

  ```handlebars
 {{#my-component as |comps|}}
  {{comp.dropdown isOpen}}
 {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{component comp.dropdown isOpen}}
  {{/my-component}}
  ```

  and

  ```handlebars
  {{#my-component as |comps|}}
    {{#comp.dropdown}}Open{{/comp.dropdown}}
  {{/my-component}}
  ```

  with

  ```handlebars
  {{#my-component as |comps|}}
    {{#component comp.dropdown}}Open{{/component}}
  {{/my-component}}
  ```

  @private
  @class TransFormDotComponentInvocation
*/
export default function transformDotComponentInvocation(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-dot-component-invocation',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (isInlineInvocation(node.path, node.params, node.hash)) {
          wrapInComponent(node, b);
        }
      },
      BlockStatement(node: AST.BlockStatement): AST.Node | void {
        if (isMultipartPath(node.path)) {
          wrapInComponent(node, b);
        }
      },
    },
  };
}

function isMultipartPath(path: AST.PathExpression | AST.Literal) {
  return (path as AST.PathExpression).parts && (path as AST.PathExpression).parts.length > 1;
}

function isInlineInvocation(
  path: AST.PathExpression | AST.Literal,
  params: AST.Node[],
  hash: AST.Hash
) {
  if (isMultipartPath(path)) {
    if (params.length > 0 || hash.pairs.length > 0) {
      return true;
    }
  }

  return false;
}

function wrapInComponent(node: AST.MustacheStatement | AST.BlockStatement, builder: Builders) {
  let component = node.path;
  let componentHelper = builder.path('component');
  node.path = componentHelper;
  node.params.unshift(component);
}
