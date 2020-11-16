# Pass 0: Normalization

The purpose of the precompiler's initial pass is normalizing the AST into a HIR (High-Level IR).

- Cleaning up aspects of the Handlebars AST that make it more difficult to work with in subsequent passes, such as the large number of different literal node types.
- Identifying and separating keywords (such as `(has-block)`, `{{#in-element}}` and `{{yield}}`) from user-space invocations.
- Classifying HTML tags into:
  - normal HTML elements (`<div>`)
  - HTML elements with component features (modifiers or splattributes)
  - component invocations (`<CapCase />`)
  - dynamic component invocations (`<f.input />`)
  - named blocks (`<:NamedBlock>`)

## Source Location Normalization

The input AST tags each node with a `SourceLocation` (a starting and ending position, each represented as a pair of `line` and `column`). Pass 0 normalizes the `SourceLocation`s into `SourceOffsets`, represented as simple byte offsets.

In some cases, the AST fragment that corresponds to a HIR node does not contain a source location. For example, the key in a `HashPair` is a simple string, and a list of positional parameters is not grouped into a parent node. Where possible, Pass 0 attempts to tag the HIR output with a `SourceOffsets`.

> The algorithms below elide `SourceOffsets` tagging for clarity.

## `Process-Expression`

(with a single `expr`)
(with optional `context: ExpressionContext`, defaulting to `ExpressionContext.Default`)

Match the `expr`'s `type`:

1. `AST.Literal` => normalize it into a `hir.Literal`
2. `AST.SubExpression` =>
   1. If the sexp is a keyword, check syntax and translate it into a `hir.Expr`
   2. (in loose mode) assert that the head of the sexp is a simple path (no dots)
   3. translate the head of the sexp and its args to `hir.Expr`s.
3. `AST.PathExpression` =>
   1. Match the head kind:
      1. if `this`, translate to `hir.GetThis`
      2. if `@arg`, translate to `hir.GetArg`
      3. if bare word:
         1. in loose mode, translate to `hir.GetVar(context: context)`
         2. in strict mode, translate to `hir.StrictGetVar`

## `Process-Statement`

(with a single `statement`)

Match the `statement`'s `type`:

1. `PartialStatement` => error (Handlebars `>` syntax is not supported)
2. `MustacheCommentStatement` => do nothing
3. `TextNode` => normalize to `hir.AppendTextNode(chars)`
4. `CommentStatement` => normalize to `hir.AppendComment(chars)`
5. `BlockStatement` =>
   1. if `statement` is a keyword, check syntax and translate it into a `hir.Statement`
   2. otherwise, construct a list of `hir.NamedBlock`s
      1. translate the default block into a `hir.Block`
      2. if there's an inverse block, translate it to `hir.Block`
   3. translate the block's head expression with `Processing-Expressions(context: BlockHead)`)

## Process Positional Arguments

(with list of `exprs`)

1. let `params` be the result of `map(exprs, Process-Expression)`
2. return `hir.Params(params)`

## Process Named Arguments

(with list of hash `pairs`)

1. let `hir-pairs` be the result of `map(pairs, Process-HashPair)`
2. return `hir.Hash(hir-pairs)`

## Process-HashPair

(with `name` and `value`)

1. let `expr` be the result of `Process Expression(value)`
2. return `hir.HashPair(name: name, value: expr)`
