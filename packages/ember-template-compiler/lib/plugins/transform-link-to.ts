import { StaticTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { Builders } from '../types';
import { isPath, isSubExpression } from './utils';

function isInlineLinkTo(node: AST.MustacheStatement): boolean {
  return isPath(node.path) && node.path.original === 'link-to';
}

function isBlockLinkTo(node: AST.BlockStatement): boolean {
  return isPath(node.path) && node.path.original === 'link-to';
}

function isQueryParams(node: AST.Expression): node is AST.SubExpression {
  return isSubExpression(node) && isPath(node.path) && node.path.original === 'query-params';
}

function transformInlineLinkToIntoBlockForm(
  env: ASTPluginEnvironment,
  node: AST.MustacheStatement
): AST.BlockStatement {
  let { builders: b } = env.syntax;

  return b.block(
    'link-to',
    node.params.slice(1),
    node.hash,
    buildProgram(b, node.params[0], node.escaped, node.loc),
    null,
    node.loc
  );
}

function transformPositionalLinkToIntoNamedArguments(
  env: ASTPluginEnvironment,
  node: AST.BlockStatement
): AST.BlockStatement {
  let { builders: b } = env.syntax;
  let { moduleName } = env.meta as StaticTemplateMeta;
  let {
    params,
    hash: { pairs },
  } = node;

  let keys = pairs.map(pair => pair.key);

  if (params.length === 0) {
    assert(
      `You must provide one or more parameters to the \`{{link-to}}\` component. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('params') !== -1 ||
        keys.indexOf('route') !== -1 ||
        keys.indexOf('model') !== -1 ||
        keys.indexOf('models') !== -1 ||
        keys.indexOf('query') !== -1
    );

    return node;
  } else {
    assert(
      `You cannot pass positional parameters and the \`params\` argument to the \`{{link-to}}\` component at the same time. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('params') === -1
    );

    assert(
      `You cannot pass positional parameters and the \`route\` argument to the \`{{link-to}}\` component at the same time. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('route') === -1
    );

    assert(
      `You cannot pass positional parameters and the \`model\` argument to the \`{{link-to}}\` component at the same time. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('model') === -1
    );

    assert(
      `You cannot pass positional parameters and the \`models\` argument to the \`{{link-to}}\` component at the same time. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('models') === -1
    );

    assert(
      `You cannot pass positional parameters and the \`query\` argument to the \`{{link-to}}\` component at the same time. ${calculateLocationDisplay(
        moduleName,
        node.loc
      )}`,
      keys.indexOf('query') === -1
    );
  }

  assert(
    `You must provide one or more parameters to the \`{{link-to}}\` component. ${calculateLocationDisplay(
      moduleName,
      node.loc
    )}`,
    params.length > 0
  );

  // 1. The last argument is possibly the `query` object.

  let query = params[params.length - 1];

  if (query && isQueryParams(query)) {
    params.pop();

    assert(
      `The \`(query-params ...)\` helper does not take positional arguments. ${calculateLocationDisplay(
        moduleName,
        query.loc
      )}`,
      query.params.length === 0
    );

    pairs.push(
      b.pair('query', b.sexpr(b.path('hash', query.path.loc), [], query.hash, query.loc), query.loc)
    );
  }

  // 2. If there is a `route`, it is now at index 0.

  let route = params.shift();

  if (route) {
    pairs.push(b.pair('route', route, route.loc));
  }

  // 3. Any remaining indices (if any) are `models`.

  if (params.length === 1) {
    pairs.push(b.pair('model', params[0], params[0].loc));
  } else if (params.length > 1) {
    pairs.push(
      b.pair('models', b.sexpr(b.path('array', node.loc), params, undefined, node.loc), node.loc)
    );
  }

  return b.block(
    node.path,
    null,
    b.hash(pairs, node.hash.loc),
    node.program,
    node.inverse,
    node.loc
  );
}

function buildProgram(b: Builders, content: AST.Node, escaped: boolean, loc: AST.SourceLocation) {
  return b.program([buildStatement(b, content, escaped, loc)], undefined, loc);
}

function buildStatement(b: Builders, content: AST.Node, escaped: boolean, loc: AST.SourceLocation) {
  switch (content.type) {
    case 'PathExpression':
      return b.mustache(content, undefined, undefined, !escaped, loc);

    case 'SubExpression':
      return b.mustache(content.path, content.params, content.hash, !escaped, loc);

    // The default case handles literals.
    default:
      return b.text(`${(content as AST.Literal).value}`, loc);
  }
}

export default function transformLinkTo(env: ASTPluginEnvironment): ASTPlugin {
  return {
    name: 'transform-link-to',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        if (isInlineLinkTo(node)) {
          let block = transformInlineLinkToIntoBlockForm(env, node);
          return transformPositionalLinkToIntoNamedArguments(env, block);
        }
      },

      BlockStatement(node: AST.BlockStatement): AST.Node | void {
        if (isBlockLinkTo(node)) {
          return transformPositionalLinkToIntoNamedArguments(env, node);
        }
      },
    },
  };
}
