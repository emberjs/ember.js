import { isKeyword } from './keywords';
import { preprocess } from './parser/tokenizer-event-handlers';
import traverse from './traversal/traverse';
import * as ASTv1 from './v1/api';

/**
 * Gets the correct Token from the Node based on it's type
 */
function tokensFromType(node: ASTv1.Node, scopedTokens: string[]): string | void {
  if (node.type === 'PathExpression') {
    if (node.head.type === 'AtHead' || node.head.type === 'ThisHead') {
      return;
    }

    const possbleToken = node.head.name;

    if (scopedTokens.indexOf(possbleToken) === -1) {
      return possbleToken;
    }
  } else if (node.type === 'ElementNode') {
    const { tag } = node;

    const char = tag.charAt(0);

    if (char === ':' || char === '@') {
      return;
    }

    if (tag.substr(0, 5) === 'this.') {
      return;
    }

    if (scopedTokens.indexOf(tag) !== -1) {
      return;
    }

    return tag;
  }
}

/**
 * Adds tokens to the tokensSet based on their node.type
 */
function addTokens(tokensSet: Set<string>, node: ASTv1.Node, scopedTokens: string[]) {
  const maybeTokens = tokensFromType(node, scopedTokens);

  (Array.isArray(maybeTokens) ? maybeTokens : [maybeTokens]).forEach((maybeToken) => {
    if (maybeToken !== undefined && maybeToken[0] !== '@') {
      tokensSet.add(maybeToken.split('.')[0]);
    }
  });
}

/**
 * Parses and traverses a given handlebars html template to extract all template locals
 * referenced that could possible come from the praent scope. Can exclude known keywords
 * optionally.
 */
export function getTemplateLocals(html: string, options?: { includeKeywords: boolean }): string[] {
  const ast = preprocess(html);
  const tokensSet = new Set<string>();
  const scopedTokens: string[] = [];

  traverse(ast, {
    Block: {
      enter({ blockParams }) {
        blockParams.forEach((param) => {
          scopedTokens.push(param);
        });
      },

      exit({ blockParams }) {
        blockParams.forEach(() => {
          scopedTokens.pop();
        });
      },
    },

    ElementNode: {
      enter(node) {
        node.blockParams.forEach((param) => {
          scopedTokens.push(param);
        });
        addTokens(tokensSet, node, scopedTokens);
      },

      exit({ blockParams }) {
        blockParams.forEach(() => {
          scopedTokens.pop();
        });
      },
    },

    PathExpression(node) {
      addTokens(tokensSet, node, scopedTokens);
    },
  });

  let tokens: string[] = [];

  tokensSet.forEach((s) => tokens.push(s));

  if (!options?.includeKeywords) {
    tokens = tokens.filter((token) => !isKeyword(token));
  }

  return tokens;
}
