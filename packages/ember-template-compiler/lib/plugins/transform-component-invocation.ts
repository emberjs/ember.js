import { DEBUG } from '@glimmer/env';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { Builders } from '../types';

/**
  Transforms unambigious invocations of closure components to be wrapped with
  the component helper. Once these syntaxes are fully supported by Glimmer VM
  natively, this transform can be removed.

  ```handlebars
  {{!-- this.foo is not a legal helper/component name --}}
  {{this.foo "with" some="args"}}
  ```

  with

  ```handlebars
  {{component this.foo "with" some="args"}}
  ```

  and

  ```handlebars
  {{!-- this.foo is not a legal helper/component name --}}
  {{#this.foo}}...{{/this.foo}}
  ```

  with

  ```handlebars
  {{#component this.foo}}...{{/component}}
  ```

  and

  ```handlebars
  {{!-- foo.bar is not a legal helper/component name --}}
  {{foo.bar "with" some="args"}}
  ```

  with

  ```handlebars
  {{component foo.bar "with" some="args"}}
  ```

  and

  ```handlebars
  {{!-- foo.bar is not a legal helper/component name --}}
  {{#foo.bar}}...{{/foo.bar}}
  ```

  with

  ```handlebars
  {{#component foo.bar}}...{{/component}}
  ```

  and

  ```handlebars
  {{!-- @foo is not a legal helper/component name --}}
  {{@foo "with" some="args"}}
  ```

  with

  ```handlebars
  {{component @foo "with" some="args"}}
  ```

  and

  ```handlebars
  {{!-- @foo is not a legal helper/component name --}}
  {{#@foo}}...{{/@foo}}
  ```

  with

  ```handlebars
  {{#component @foo}}...{{/component}}
  ```

  and

  ```handlebars
  {{#let ... as |foo|}}
    {{!-- foo is a local variable --}}
    {{foo "with" some="args"}}
  {{/let}}
  ```

  with

  ```handlebars
  {{#let ... as |foo|}}
    {{component foo "with" some="args"}}
  {{/let}}
  ```

  and

  ```handlebars
  {{#let ... as |foo|}}
    {{!-- foo is a local variable --}}
    {{#foo}}...{{/foo}}
  {{/let}}
  ```

  with

  ```handlebars
  {{#let ... as |foo|}}
    {{#component foo}}...{{/component}}
  {{/let}}
  ```

  @private
  @class TransFormComponentInvocation
*/
export default function transformComponentInvocation(env: ASTPluginEnvironment): ASTPlugin {
  let { moduleName } = env.meta;
  let { builders: b } = env.syntax;
  let locals: string[][] = [];

  return {
    name: 'transform-component-invocation',

    visitor: {
      ElementNode: {
        enter(node: AST.ElementNode) {
          locals.push(node.blockParams);
        },

        exit() {
          locals.pop();
        },
      },

      BlockStatement: {
        enter(node: AST.BlockStatement) {
          // check this before we push the new locals
          if (isBlockInvocation(node, locals)) {
            wrapInComponent(moduleName, node, b);
          }

          locals.push(node.program.blockParams);
        },

        exit() {
          locals.pop();
        },
      },

      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (isInlineInvocation(node, locals)) {
          wrapInComponent(moduleName, node, b);
        }
      },
    },
  };
}

function isInlineInvocation(node: AST.MustacheStatement, locals: string[][]): boolean {
  let { path } = node;
  return isPath(path) && isIllegalName(path, locals) && hasArguments(node);
}

function isPath(node: AST.PathExpression | AST.Literal): node is AST.PathExpression {
  return node.type === 'PathExpression';
}

function isIllegalName(node: AST.PathExpression, locals: string[][]): boolean {
  return isThisPath(node) || isDotPath(node) || isNamedArg(node) || isLocalVariable(node, locals);
}

function isThisPath(node: AST.PathExpression): boolean {
  return node.this === true;
}

function isDotPath(node: AST.PathExpression): boolean {
  return node.parts.length > 1;
}

function isNamedArg(node: AST.PathExpression): boolean {
  return node.data === true;
}

function isLocalVariable(node: AST.PathExpression, locals: string[][]): boolean {
  return !node.this && hasLocalVariable(node.parts[0], locals);
}

function hasLocalVariable(name: string, locals: string[][]): boolean {
  return locals.some(names => names.indexOf(name) !== -1);
}

function hasArguments(node: AST.MustacheStatement): boolean {
  return node.params.length > 0 || node.hash.pairs.length > 0;
}

function isBlockInvocation(node: AST.BlockStatement, locals: string[][]): boolean {
  return isIllegalName(node.path, locals);
}

let wrapInAssertion: (
  moduleName: string,
  node: AST.PathExpression,
  builder: Builders
) => AST.Expression;

if (DEBUG) {
  wrapInAssertion = (moduleName, node, b) => {
    let error = b.string(
      `expected \`${
        node.original
      }\` to be a contextual component but found a string. Did you mean \`(component ${
        node.original
      })\`? ${calculateLocationDisplay(moduleName, node.loc)}`
    );

    return b.sexpr(
      b.path('-assert-implicit-component-helper-argument'),
      [node, error],
      b.hash(),
      node.loc
    );
  };
} else {
  wrapInAssertion = (_, node) => node;
}

function wrapInComponent(
  moduleName: string,
  node: AST.MustacheStatement | AST.BlockStatement,
  b: Builders
) {
  let component = wrapInAssertion(moduleName, node.path as AST.PathExpression, b);
  node.path = b.path('component');
  node.params.unshift(component);
}
