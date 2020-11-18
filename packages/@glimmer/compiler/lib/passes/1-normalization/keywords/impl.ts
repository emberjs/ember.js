import {
  ASTv2,
  generateSyntaxError,
  isKeyword,
  KEYWORDS_TYPES,
  KeywordType,
} from '@glimmer/syntax';
import { exhausted } from '@glimmer/util';

import { Err, Result } from '../../../shared/result';
import { NormalizationState } from '../context';

interface KeywordDelegate<Match extends KeywordMatch, V, Out> {
  assert(options: Match, state: NormalizationState): Result<V>;
  translate(options: { node: Match; state: NormalizationState }, param: V): Result<Out>;
}

export interface Keyword<K extends KeywordType = KeywordType, Out = unknown> {
  translate(node: KeywordCandidates[K], state: NormalizationState): Result<Out> | null;
}

export interface BlockKeyword<Out = unknown> {
  translate(node: ASTv2.InvokeBlock, state: NormalizationState): Result<Out> | null;
}

class KeywordImpl<
  K extends KeywordType,
  S extends string = string,
  Param = unknown,
  Out = unknown
> {
  protected types: Set<KeywordCandidates[K]['type']>;

  constructor(
    protected keyword: S,
    type: KeywordType,
    private delegate: KeywordDelegate<KeywordMatches[K], Param, Out>
  ) {
    let nodes = new Set<KeywordNode['type']>();
    for (let nodeType of KEYWORD_NODES[type]) {
      nodes.add(nodeType);
    }

    this.types = nodes;
  }

  protected match(node: KeywordCandidates[K]): node is KeywordMatches[K] {
    if (!this.types.has(node.type)) {
      return false;
    }

    let path = getPathExpression(node);

    if (path !== null && path.ref.type === 'Free') {
      return path.ref.name === this.keyword;
    } else {
      return false;
    }
  }

  translate(node: KeywordMatches[K], state: NormalizationState): Result<Out> | null {
    if (this.match(node)) {
      let param = this.delegate.assert(node, state);
      return param.andThen((param) => this.delegate.translate({ node, state }, param));
    } else {
      return null;
    }
  }
}

export type PossibleNode =
  | ASTv2.PathExpression
  | ASTv2.AppendContent
  | ASTv2.CallExpression
  | ASTv2.InvokeBlock;

export const KEYWORD_NODES = {
  Call: ['Call'],
  Block: ['InvokeBlock'],
  Append: ['AppendContent'],
  Modifier: ['ElementModifier'],
} as const;

export interface KeywordCandidates {
  Call: ASTv2.ExpressionNode;
  Block: ASTv2.InvokeBlock;
  Append: ASTv2.AppendContent;
  Modifier: ASTv2.ElementModifier;
}

export type KeywordCandidate = KeywordCandidates[keyof KeywordCandidates];

export interface KeywordMatches {
  Call: ASTv2.CallExpression;
  Block: ASTv2.InvokeBlock;
  Append: ASTv2.AppendContent;
  Modifier: ASTv2.ElementModifier;
}

export type KeywordMatch = KeywordMatches[keyof KeywordMatches];

export type ExprKeywordNode = ASTv2.CallExpression;

/**
 * A "generic" keyword is something like `has-block`, which makes sense in the context
 * of sub-expression or append
 */
export type GenericKeywordNode = ASTv2.AppendContent | ASTv2.CallExpression;

export type KeywordNode =
  | ExprKeywordNode
  | GenericKeywordNode
  | ASTv2.InvokeBlock
  | ASTv2.ElementModifier;

export function keyword<
  K extends KeywordType,
  D extends KeywordDelegate<KeywordMatches[K], unknown, Out>,
  Out = unknown
>(keyword: string, type: K, delegate: D): Keyword<K, Out> {
  return new KeywordImpl(keyword, type, delegate as KeywordDelegate<KeywordMatch, unknown, Out>);
}

export type PossibleKeyword = KeywordNode;
type OutFor<K extends Keyword | BlockKeyword> = K extends BlockKeyword<infer Out>
  ? Out
  : K extends Keyword<KeywordType, infer Out>
  ? Out
  : never;

function getPathExpression(node: KeywordNode | ASTv2.ExpressionNode): ASTv2.PathExpression | null {
  switch (node.type) {
    // This covers the inside of attributes and expressions, as well as the callee
    // of call nodes
    case 'Path':
      return node;
    case 'AppendContent':
      return getPathExpression(node.value);
    case 'Call':
    case 'InvokeBlock':
    case 'ElementModifier':
      return getPathExpression(node.callee);
    default:
      return null;
  }
}

export class Keywords<K extends KeywordType, KeywordList extends Keyword<K> = never>
  implements Keyword<K, OutFor<KeywordList>> {
  #keywords: Keyword[] = [];
  #type: K;

  constructor(type: K) {
    this.#type = type;
  }

  kw<S extends string = string, Out = unknown>(
    name: S,
    delegate: KeywordDelegate<KeywordMatches[K], unknown, Out>
  ): Keywords<K, KeywordList | Keyword<K, Out>> {
    this.#keywords.push(keyword(name, this.#type, delegate));

    return this;
  }

  translate(
    node: KeywordCandidates[K],
    state: NormalizationState
  ): Result<OutFor<KeywordList>> | null {
    for (let keyword of this.#keywords) {
      let result = keyword.translate(node, state) as Result<OutFor<KeywordList>>;
      if (result !== null) {
        return result;
      }
    }

    let path = getPathExpression(node);

    if (path && path.ref.type === 'Free' && isKeyword(path.ref.name)) {
      let { name } = path.ref;

      let usedType = this.#type;
      let validTypes = KEYWORDS_TYPES[name];

      if (validTypes.indexOf(usedType) === -1) {
        return Err(
          generateSyntaxError(
            `The \`${name}\` keyword was used incorrectly. It was used as ${
              typesToReadableName[usedType]
            }, but its valid usages are:\n\n${generateTypesMessage(
              name,
              validTypes
            )}\n\nError caused by`,
            node.loc
          )
        );
      }
    }

    return null;
  }
}

const typesToReadableName = {
  Append: 'an append statement',
  Block: 'a block statement',
  Call: 'a call expression',
  Modifier: 'a modifier',
};

function generateTypesMessage(name: string, types: KeywordType[]): string {
  return types
    .map((type) => {
      switch (type) {
        case 'Append':
          return `- As an append statement, as in: {{${name}}}`;
        case 'Block':
          return `- As a block statement, as in: {{#${name}}}{{/${name}}}`;
        case 'Call':
          return `- As an expression, as in: (${name})`;
        case 'Modifier':
          return `- As a modifier, as in: <div {{${name}}}></div>`;
        default:
          return exhausted(type);
      }
    })
    .join('\n\n');
}

/**
 * This function builds keyword definitions for a particular type of AST node (`KeywordType`).
 *
 * You can build keyword definitions for:
 *
 * - `Expr`: A `SubExpression` or `PathExpression`
 * - `Block`: A `BlockStatement`
 *   - A `BlockStatement` is a keyword candidate if its head is a
 *     `PathExpression`
 * - `Append`: An `AppendStatement`
 *
 * A node is a keyword candidate if:
 *
 * - A `PathExpression` is a keyword candidate if it has no tail, and its
 *   head expression is a `LocalVarHead` or `FreeVarHead` whose name is
 *   the keyword's name.
 * - A `SubExpression`, `AppendStatement`, or `BlockStatement` is a keyword
 *   candidate if its head is a keyword candidate.
 *
 * The keyword infrastructure guarantees that:
 *
 * - If a node is not a keyword candidate, it is never passed to any keyword's
 *   `assert` method.
 * - If a node is not the `KeywordType` for a particular keyword, it will not
 *   be passed to the keyword's `assert` method.
 *
 * `Expr` keywords are used in expression positions and should return HIR
 * expressions. `Block` and `Append` keywords are used in statement
 * positions and should return HIR statements.
 *
 * A keyword definition has two parts:
 *
 * - `match`, which determines whether an AST node matches the keyword, and can
 *   optionally return some information extracted from the AST node.
 * - `translate`, which takes a matching AST node as well as the extracted
 *   information and returns an appropriate HIR instruction.
 *
 * # Example
 *
 * This keyword:
 *
 * - turns `(hello)` into `"hello"`
 *   - as long as `hello` is not in scope
 * - makes it an error to pass any arguments (such as `(hello world)`)
 *
 * ```ts
 * keywords('SubExpr').kw('hello', {
 *   assert(node: ExprKeywordNode): Result<void> | false {
 *     // we don't want to transform `hello` as a `PathExpression`
 *     if (node.type !== 'SubExpression') {
 *       return false;
 *     }
 *
 *     // node.head would be `LocalVarHead` if `hello` was in scope
 *     if (node.head.type !== 'FreeVarHead') {
 *       return false;
 *     }
 *
 *     if (node.params.length || node.hash) {
 *       return Err(generateSyntaxError(`(hello) does not take any arguments`), node.loc);
 *     } else {
 *       return Ok();
 *     }
 *   },
 *
 *   translate(node: ASTv2.SubExpression): hir.Expression {
 *     return ASTv2.builders.literal("hello", node.loc)
 *   }
 * })
 * ```
 *
 * The keyword infrastructure checks to make sure that the node is the right
 * type before calling `assert`, so you only need to consider `SubExpression`
 * and `PathExpression` here. It also checks to make sure that the node passed
 * to `assert` has the keyword name in the right place.
 *
 * Note the important difference between returning `false` from `assert`,
 * which just means that the node didn't match, and returning `Err`, which
 * means that the node matched, but there was a keyword-specific syntax
 * error.
 */
export function keywords<K extends KeywordType>(type: K): Keywords<K> {
  return new Keywords(type);
}
